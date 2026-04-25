import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, Flag, Heart, Loader2, MapPin, MessageCircle, Pencil, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CONDITIONS, formatPrice } from "@/lib/listings";
import { getOrCreateChat } from "@/lib/chats";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { ReportListingDialog } from "@/components/ReportListingDialog";
import { TrustBadge } from "@/components/TrustBadge";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  city: string;
  area: string | null;
  views_count: number;
  created_at: string;
  seller_id: string;
  status: string;
  listing_images: { image_url: string; display_order: number }[];
  profiles: {
    id: string;
    name: string | null;
    photo_url: string | null;
    is_location_verified: boolean;
    total_listings: number;
    successful_sales: number;
  } | null;
};

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, description, price, category, condition, city, area, views_count, created_at, seller_id, status, listing_images(image_url, display_order), profiles!listings_seller_profile_fkey(id, name, photo_url, is_location_verified, total_listings, successful_sales)",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load listing", description: error.message, variant: "destructive" });
      }
      setListing((data as unknown as Listing) ?? null);
      setLoading(false);
      if (data) {
        supabase.rpc("increment_listing_views", { _listing_id: id });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  useEffect(() => {
    if (!user || !id) {
      setIsFav(false);
      return;
    }
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, id]);

  const onToggleFavorite = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!listing) return;
    if (isFav) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listing.id);
      if (error) {
        toast({ title: "Could not remove", description: error.message, variant: "destructive" });
        return;
      }
      setIsFav(false);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, listing_id: listing.id });
      if (error) {
        toast({ title: "Could not save", description: error.message, variant: "destructive" });
        return;
      }
      setIsFav(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!listing) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted-foreground">This listing isn't available.</p>
        <Link to="/listings" className="mt-3 inline-block text-primary hover:underline">
          Back to browse
        </Link>
      </section>
    );
  }

  const photos = [...listing.listing_images].sort((a, b) => a.display_order - b.display_order);
  const conditionLabel = CONDITIONS.find((c) => c.value === listing.condition)?.label ?? listing.condition;
  const isOwner = user?.id === listing.seller_id;
  const isSold = listing.status === "sold";

  const onMarkSold = async () => {
    if (!listing) return;
    setMarking(true);
    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listing.id);
    setMarking(false);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    setListing({ ...listing, status: "sold" });
    toast({ title: "Marked as sold", description: "Mubarak ho! Boat pe bharosa rakho." });
  };

  const onShare = async () => {
    if (!listing) return;
    const url = window.location.href;
    const text = `${listing.title} — ${formatPrice(listing.price)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Share kar do dost ke saath." });
      }
    } catch (e) {
      // user cancelled — silent
    }
  };

  const onMessageSeller = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!listing) return;
    setStartingChat(true);
    try {
      const chatId = await getOrCreateChat({
        listingId: listing.id,
        buyerId: user.id,
        sellerId: listing.seller_id,
      });
      navigate(`/chats/${chatId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start chat";
      toast({ title: "Could not start chat", description: message, variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <article className="py-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
            {photos[activePhoto] ? (
              <img
                src={photos[activePhoto].image_url}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No photo
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={p.image_url}
                  onClick={() => setActivePhoto(i)}
                  className={`h-16 w-16 flex-none overflow-hidden rounded-lg border-2 ${
                    i === activePhoto ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-3xl font-semibold tracking-tight">{formatPrice(listing.price)}</p>
          <h1 className="mt-1 text-xl font-medium text-foreground">{listing.title}</h1>
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {listing.area || listing.city}
            <span className="mx-2">•</span>
            <Eye className="h-4 w-4" /> {listing.views_count} views
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{listing.category}</Badge>
            <Badge variant="outline">{conditionLabel}</Badge>
            {isSold && <Badge className="bg-success text-success-foreground">Sold</Badge>}
          </div>

          <div className="mt-5 flex gap-2">
            {!isOwner && !isSold && (
              <Button
                size="lg"
                className="flex-1"
                onClick={onMessageSeller}
                disabled={startingChat}
              >
                {startingChat ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                Message seller
              </Button>
            )}
            {isOwner && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/sell?edit=${listing.id}`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {!isSold && (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={onMarkSold}
                    disabled={marking}
                  >
                    {marking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Mark as sold
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={onToggleFavorite}
              aria-label={isFav ? "Remove favorite" : "Save"}
            >
              <Heart className={`h-5 w-5 ${isFav ? "fill-accent text-accent" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onShare}
              aria-label="Share listing"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {listing.profiles && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <Avatar className="h-12 w-12">
                <AvatarImage src={listing.profiles.photo_url ?? undefined} alt="" />
                <AvatarFallback>
                  {(listing.profiles.name ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{listing.profiles.name ?? "Seller"}</p>
                <p className="text-xs text-muted-foreground">
                  {listing.profiles.total_listings} listings · {listing.profiles.successful_sales} sold
                </p>
              </div>
              <TrustBadge profile={listing.profiles} />
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {listing.description || "No description provided."}
            </p>
          </div>

          <div className="mt-6">
            <DeliveryEstimator fromArea={listing.area || listing.city} />
          </div>

          {!isOwner && (
            <button
              onClick={() => (user ? setReportOpen(true) : navigate("/auth"))}
              className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" /> Report this listing
            </button>
          )}
        </div>
      </div>

      <ReportListingDialog
        listingId={listing.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  );
};

export default ListingDetail;