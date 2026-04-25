import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/listings";
import { Button } from "@/components/ui/button";
import { VerifiedLocalBadge } from "@/components/VerifiedLocalBadge";

type FavRow = {
  id: string;
  listing_id: string;
  listings: {
    id: string;
    title: string;
    price: number;
    city: string;
    area: string | null;
    status: string;
    listing_images: { image_url: string; display_order: number }[];
    seller: { is_location_verified: boolean | null } | null;
  } | null;
};

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FavRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?next=/favorites", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select(
          "id, listing_id, listings:listing_id(id, title, price, city, area, status, listing_images(image_url, display_order), seller:public_profiles!listings_seller_profile_fkey(is_location_verified))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load favorites", description: error.message, variant: "destructive" });
      }
      setRows((data as unknown as FavRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const onRemove = async (favId: string) => {
    if (!user) return;
    const prev = rows;
    setRows((cur) => cur.filter((r) => r.id !== favId));
    const { error } = await supabase.from("favorites").delete().eq("id", favId);
    if (error) {
      setRows(prev);
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="py-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your shortlist — boat pe bharosa, decision aaram se.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{rows.length} saved</span>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing saved yet. Tap the heart on any listing to keep it here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/listings">Browse listings</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const l = r.listings;
            if (!l) {
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground"
                >
                  Listing no longer available
                  <Button variant="ghost" size="sm" onClick={() => onRemove(r.id)}>
                    Remove
                  </Button>
                </li>
              );
            }
            const cover = [...l.listing_images].sort(
              (a, b) => a.display_order - b.display_order,
            )[0];
            return (
              <li
                key={r.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:shadow-md"
              >
                <Link to={`/listings/${l.id}`} className="block">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {cover ? (
                      <img
                        src={cover.image_url}
                        alt={l.title}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-base font-semibold">{formatPrice(l.price)}</p>
                    <p className="line-clamp-1 text-sm text-foreground">{l.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {l.area || l.city}
                      </span>
                      {l.seller?.is_location_verified && <VerifiedLocalBadge />}
                    </div>
                    {l.status !== "active" && (
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {l.status}
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => onRemove(r.id)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-accent shadow-sm hover:bg-background"
                  aria-label="Remove from favorites"
                >
                  <Heart className="h-4 w-4 fill-accent" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default Favorites;
