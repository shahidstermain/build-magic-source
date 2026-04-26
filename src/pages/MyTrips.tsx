import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronDown, Download, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePageSeo } from "@/hooks/usePageSeo";
import {
  fetchTripRecommendations,
  getTripDownloadUrl,
  type TripRecommendation,
} from "@/lib/tripPlanner";
import { RecommendationsSection } from "@/components/RecommendationCard";
import { TripDayFeedback } from "@/components/TripDayFeedback";
import { TripDetailsCard, type TripAction } from "@/components/ui/trip-details-card";

type TripRow = {
  id: string;
  status: string;
  inputs: any;
  preview: any;
  itinerary: any;
  created_at: string;
};

export default function MyTrips() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  usePageSeo({ title: "My Trips — AndamanBazaar", description: "Your saved AI-generated Andaman trip plans.", path: "/my-trips", noIndex: true });
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recsByTrip, setRecsByTrip] = useState<Record<string, TripRecommendation[]>>({});
  const [recsLoading, setRecsLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("trip_requests")
        .select("id, status, inputs, preview, itinerary, created_at")
        .order("created_at", { ascending: false });
      setTrips((data ?? []) as TripRow[]);
    })();
  }, [user]);

  const onDownload = async (id: string) => {
    setBusy(id);
    try {
      const url = await getTripDownloadUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Couldn't open PDF",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const toggleRecs = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!recsByTrip[id]) {
      setRecsLoading(id);
      try {
        const recs = await fetchTripRecommendations(id);
        setRecsByTrip((prev) => ({ ...prev, [id]: recs }));
      } catch (err) {
        toast({
          title: "Couldn't load recommendations",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setRecsLoading(null);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth?next=/my-trips" replace />;

  if (trips === null) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
          <p className="text-sm text-muted-foreground">Past AI-generated Andaman plans.</p>
        </div>
        <Button asChild>
          <Link to="/trip-planner">
            <Sparkles className="mr-2 h-4 w-4" /> New plan
          </Link>
        </Button>
      </header>

      {trips.length === 0 ? (
        <Card className="p-10 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No trips yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your first ferry-aware Andaman plan in 60 seconds.
          </p>
          <Button asChild className="mt-4">
            <Link to="/trip-planner">Start planning</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => {
            const title = t.preview?.trip_title ?? `Trip · ${t.inputs?.days} days`;
            const isOpen = openId === t.id;
            const recs = recsByTrip[t.id] ?? [];
            const startDate = t.inputs?.start_date ? new Date(t.inputs.start_date) : new Date(t.created_at);
            const origin = t.inputs?.origin ?? "Home";
            const destination = t.preview?.trip_title ?? title;
            const travelerName = t.inputs?.traveler_name ?? `${t.inputs?.travelers ?? 1} traveller${(t.inputs?.travelers ?? 1) > 1 ? "s" : ""}`;
            const status: "upcoming" | "completed" | "cancelled" =
              t.status === "generated" ? "upcoming" : t.status === "failed" ? "cancelled" : "upcoming";

            const actions: TripAction[] = [];
            if (t.status === "generated") {
              actions.push({
                label: busy === t.id ? "Opening…" : "Download PDF",
                icon: busy === t.id ? Loader2 : Download,
                onClick: () => onDownload(t.id),
                disabled: busy === t.id,
              });
              actions.push({
                label: isOpen ? "Hide bookings" : "View bookings",
                icon: isOpen ? ChevronDown : Sparkles,
                onClick: () => toggleRecs(t.id),
              });
            }

            return (
              <div key={t.id} className="space-y-0">
                <TripDetailsCard
                  origin={origin}
                  destination={destination}
                  travelerName={travelerName}
                  tripId={t.id.slice(0, 8).toUpperCase()}
                  travelDate={startDate}
                  status={status}
                  actions={actions}
                  className={isOpen ? "rounded-b-none" : undefined}
                />
                {isOpen && (
                  <div className="rounded-b-xl border border-t-0 border-border bg-muted/20 p-4">
                    {Array.isArray(t.itinerary?.days) && t.itinerary.days.length > 0 && (
                      <div className="mb-4">
                        <TripDayFeedback tripId={t.id} days={t.itinerary.days} />
                      </div>
                    )}
                    {recsLoading === t.id ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : recs.length > 0 ? (
                      <RecommendationsSection
                        recommendations={recs}
                        title="Book your trip"
                        subtitle="One-click partner bookings for this itinerary."
                      />
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No recommendations yet. They generate after the PDF is ready.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}