import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, Heart, Loader2, Pause, Play, Receipt, Rocket, Sparkles, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatPrice, publicImageUrl } from "@/lib/listings";
import { slang } from "@/lib/slang";
import { BoostListingDialog } from "@/components/BoostListingDialog";
import { PaymentHistory } from "@/components/PaymentHistory";
import { SiteSettingsCard } from "@/components/SiteSettingsCard";
import { VerifiedLocalBadge } from "@/components/VerifiedLocalBadge";

type ListingRow = {
  id: string;
  title: string;
  price: number;
  status: "active" | "sold" | "paused" | "removed";
  views_count: number;
  is_featured: boolean;
  created_at: string;
  listing_images: { image_url: string; display_order: number }[];
};

type FavoriteRow = {
  listing_id: string;
  listing: {
    id: string;
    title: string;
    price: number;
    status: string;
    area: string | null;
    city: string;
    listing_images: { image_url: string; display_order: number }[];
    seller: { is_location_verified: boolean | null } | null;
  } | null;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [myListings, setMyListings] = useState<ListingRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [boostTarget, setBoostTarget] = useState<ListingRow | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: mine, error: mineErr }, { data: favs, error: favErr }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, price, status, views_count, is_featured, created_at, listing_images(image_url, display_order)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("favorites")
        .select(
          "listing_id, listing:listings(id, title, price, status, area, city, listing_images(image_url, display_order), seller:public_profiles!listings_seller_profile_fkey(is_location_verified))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (mineErr) {
      toast({ title: "Could not load listings", description: mineErr.message, variant: "destructive" });
    }
    if (favErr) {
      toast({ title: "Could not load favorites", description: favErr.message, variant: "destructive" });
    }
    setMyListings((mine ?? []) as ListingRow[]);
    setFavorites((favs ?? []) as unknown as FavoriteRow[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const updateStatus = async (id: string, status: ListingRow["status"]) => {
    const prev = myListings;
    setMyListings((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) {
      setMyListings(prev);
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked as ${status.replace("_", " ")}` });
  };

  const deleteListing = async (id: string) => {
    const prev = myListings;
    setMyListings((rows) => rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      setMyListings(prev);
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Listing deleted" });
  };

  const removeFavorite = async (listingId: string) => {
    const prev = favorites;
    setFavorites((rows) => rows.filter((f) => f.listing_id !== listingId));
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) {
      setFavorites(prev);
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    }
  };

  const totalViews = myListings.reduce((sum, l) => sum + (l.views_count ?? 0), 0);
  const activeCount = myListings.filter((l) => l.status === "active").length;
  const soldCount = myListings.filter((l) => l.status === "sold").length;

  return (
    <section className="py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seller dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your listings and saved items.
          </p>
        </div>
        <Button asChild>
          <Link to="/sell">+ New listing</Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard icon={<Play className="h-4 w-4" />} label="Active" value={activeCount} />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Total views" value={totalViews} />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Sold" value={soldCount} />
      </div>

      <Tabs defaultValue="listings" className="mt-6">
        <TabsList>
          <TabsTrigger value="listings">My listings</TabsTrigger>
          <TabsTrigger value="favorites">Saved</TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="mr-1 h-3.5 w-3.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {loading ? (
            <Loader />
          ) : myListings.length === 0 ? (
            <Empty
              title={slang("dashboardEmpty", user.id)}
              cta={<Link to="/sell" className="text-primary hover:underline">Post your first item</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {myListings.map((l) => {
                const cover = l.listing_images
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <Link to={`/listings/${l.id}`} className="flex-none">
                      {cover ? (
                        <img
                          src={publicImageUrl(cover)}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/listings/${l.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {l.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(l.price)} · {l.views_count} views
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={l.status} />
                        {l.is_featured && (
                          <Badge className="ml-2 bg-accent text-accent-foreground">
                            <Sparkles className="mr-1 h-3 w-3" /> Boosted
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-none flex-col gap-1 sm:flex-row">
                      {l.status === "active" && (
                        <>
                          {!l.is_featured && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBoostTarget(l)}
                              className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
                            >
                              <Rocket className="mr-1 h-3 w-3" /> Boost
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(l.id, "paused")}
                          >
                            <Pause className="mr-1 h-3 w-3" /> Pause
                          </Button>
                          <Button size="sm" onClick={() => updateStatus(l.id, "sold")}>
                            Mark sold
                          </Button>
                        </>
                      )}
                      {l.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(l.id, "active")}
                        >
                          <Play className="mr-1 h-3 w-3" /> Resume
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" aria-label="Delete listing">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes “{l.title}” and all its photos. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteListing(l.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          {loading ? (
            <Loader />
          ) : favorites.length === 0 ? (
            <Empty
              title={slang("favoritesEmpty", user.id)}
              cta={<Link to="/listings" className="text-primary hover:underline">Browse listings</Link>}
            />
          ) : (
            <ul className="space-y-3">
              {favorites.map((f) => {
                if (!f.listing) {
                  return (
                    <li
                      key={f.listing_id}
                      className="flex items-center justify-between rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground"
                    >
                      Listing no longer available
                      <Button size="sm" variant="ghost" onClick={() => removeFavorite(f.listing_id)}>
                        Remove
                      </Button>
                    </li>
                  );
                }
                const cover = f.listing.listing_images
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
                return (
                  <li
                    key={f.listing_id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <Link to={`/listings/${f.listing.id}`} className="flex-none">
                      {cover ? (
                        <img
                          src={publicImageUrl(cover)}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/listings/${f.listing.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {f.listing.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(f.listing.price)} · {f.listing.area || f.listing.city}
                      </p>
                      {f.listing.seller?.is_location_verified && (
                        <div className="mt-1">
                          <VerifiedLocalBadge />
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFavorite(f.listing_id)}
                      aria-label="Remove from saved"
                    >
                      <Heart className="h-4 w-4 fill-accent text-accent" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentHistory userId={user.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SiteSettingsCard />
        </TabsContent>
      </Tabs>

      <BoostListingDialog
        listingId={boostTarget?.id ?? null}
        listingTitle={boostTarget?.title}
        open={!!boostTarget}
        onOpenChange={(o) => !o && setBoostTarget(null)}
        onBoosted={() =>
          setMyListings((rows) =>
            rows.map((r) => (r.id === boostTarget?.id ? { ...r, is_featured: true } : r)),
          )
        }
      />
    </section>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ListingRow["status"] }) {
  const map: Record<ListingRow["status"], { label: string; className: string }> = {
    active: { label: "Active", className: "bg-success text-success-foreground" },
    sold: { label: "Sold", className: "bg-muted text-foreground" },
    paused: { label: "Paused", className: "bg-secondary text-secondary-foreground" },
    removed: { label: "Removed", className: "bg-destructive text-destructive-foreground" },
  };
  const m = map[status];
  return <Badge className={m.className}>{m.label}</Badge>;
}

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Empty({ title, cta }: { title: string; cta: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm">{cta}</p>
    </div>
  );
}

export default Dashboard;