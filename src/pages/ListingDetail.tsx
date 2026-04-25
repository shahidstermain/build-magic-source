import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, Flag, Heart, Loader2, MapPin, MessageCircle, Pencil, Rocket, Share2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CONDITIONS, formatPrice } from "@/lib/listings";
import { getOrCreateChat } from "@/lib/chats";
import { ReportListingDialog } from "@/components/ReportListingDialog";
import { TrustBadge } from "@/components/TrustBadge";
import { BoostListingDialog, BOOST_PRICE_INR } from "@/components/BoostListingDialog";
import { formatPriceLabel } from "@/lib/promo";
import { ReviewSystem } from "@/components/ReviewSystem";
import { MessageSellerPanel } from "@/components/MessageSellerPanel";

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
  is_featured: boolean;
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
  const [boostOpen, setBoostOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, description, price, category, condition, city, area, views_count, created_at, seller_id, status, is_featured, listing_images(image_url, display_order)",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load listing", description: error.message, variant: "destructive" });
      }
      let withSeller: Listing | null = (data as unknown as Listing) ?? null;
      if (withSeller?.seller_id) {
        const { data: seller } = await supabase
          .from("public_profiles" as never)
          .select("id, name, photo_url, is_location_verified, total_listings, successful_sales")
          .eq("id", withSeller.seller_id)
          .maybeSingle();
        withSeller = { ...withSeller, profiles: (seller as never) ?? null };
      }
      setListing(withSeller);
      setLoading(false);
      // Only increment views for non-owners with an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (data && session && session.user.id !== data.seller_id) {
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
    <article className="pb-28 md:pb-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {/* ── Photos ─────────────────────────────────────────────────────── */}
        <div>
          {/* Main image — full bleed on mobile */}
          <div className="-mx-4 overflow-hidden bg-muted md:mx-0 md:rounded-2xl">
            <div className="aspect-square w-full">
              {photos[activePhoto] ? (
                <img
                  src={photos[activePhoto].image_url}
                  alt={listing.title}
                  width={800}
                  height={800}
                  sizes="(min-width: 768px) 60vw, 100vw"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}
            </div>
          </div>
          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 px-4 md:px-0">
              {photos.map((p, i) => (
                <button
                  key={p.image_url}
                  onClick={() => setActivePhoto(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    i === activePhoto ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={p.image_url}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Price + title */}
          <div>
            <p className="text-3xl font-bold tracking-tight">{formatPrice(listing.price)}</p>
            <h1 className="mt-1 text-lg font-medium leading-snug">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {listing.area || listing.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {listing.views_count} views
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize rounded-full">{listing.category}</Badge>
            <Badge variant="outline" className="rounded-full">{conditionLabel}</Badge>
            {isSold && <Badge className="rounded-full bg-success text-success-foreground">Sold</Badge>}
            {listing.is_featured && (
              <Badge className="rounded-full bg-accent text-accent-foreground">
                <Sparkles className="mr-1 h-3 w-3" /> Boosted
              </Badge>
            )}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden gap-2 md:flex">
            <CTAButtons
              isOwner={isOwner} isSold={isSold} isFav={isFav}
              startingChat={startingChat} marking={marking}
              listing={listing}
              onMessageSeller={onMessageSeller}
              onToggleFavorite={onToggleFavorite}
              onShare={onShare}
              onMarkSold={onMarkSold}
              navigate={navigate}
              setBoostOpen={setBoostOpen}
            />
          </div>

          {/* Seller card */}
          {listing.profiles && (
            !isOwner && !isSold ? (
              <MessageSellerPanel
                listingId={listing.id}
                listingTitle={listing.title}
                listingPrice={listing.price}
                seller={listing.profiles}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={listing.profiles.photo_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
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
            )
          )}

          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
              {listing.description || "No description provided."}
            </p>
          </div>

          {/* Report */}
          {!isOwner && (
            <button
              onClick={() => (user ? setReportOpen(true) : navigate("/auth"))}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <Flag className="h-3.5 w-3.5" /> Report this listing
            </button>
          )}
        </div>
      </div>

      {/* Reviews */}
      {(listing.category === "experiences" || listing.category === "accommodation") && (
        <div className="mt-8">
          <ReviewSystem listingId={listing.id} category={listing.category} />
        </div>
      )}

      {/* Boost banner */}
      {isOwner && !isSold && !listing.is_featured && (
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Boost this listing</p>
              <p className="text-xs text-muted-foreground">
                Featured rail · ~3× views · {formatPriceLabel(BOOST_PRICE_INR)} one-time
              </p>
            </div>
          </div>
          <Button onClick={() => setBoostOpen(true)} className="w-full rounded-xl sm:w-auto">
            <Rocket className="mr-2 h-4 w-4" /> Boost for {formatPriceLabel(BOOST_PRICE_INR)}
          </Button>
        </div>
      )}

      {/* ── Mobile sticky CTA bar ───────────────────────────────────────── */}
      {!isOwner && !isSold && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-lg md:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            <Button
              size="lg"
              className="flex-1 rounded-xl"
              onClick={onMessageSeller}
              disabled={startingChat}
            >
              {startingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
              Message seller
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={onToggleFavorite}
              aria-label={isFav ? "Remove favorite" : "Save"}
            >
              <Heart className={`h-5 w-5 ${isFav ? "fill-accent text-accent" : ""}`} />
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl" onClick={onShare} aria-label="Share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      {isOwner && !isSold && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-lg md:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={() => navigate(`/sell?edit=${listing.id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button size="lg" className="flex-1 rounded-xl" onClick={onMarkSold} disabled={marking}>
              {marking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Mark sold
            </Button>
          </div>
        </div>
      )}

      <ReportListingDialog listingId={listing.id} open={reportOpen} onOpenChange={setReportOpen} />
      <BoostListingDialog
        listingId={listing.id} listingTitle={listing.title}
        open={boostOpen} onOpenChange={setBoostOpen}
        onBoosted={() => setListing({ ...listing, is_featured: true })}
      />
    </article>
  );
};

export default ListingDetail;

// ── Desktop CTA buttons (reused in detail panel) ──────────────────────────────
function CTAButtons({
  isOwner, isSold, isFav, startingChat, marking, listing,
  onMessageSeller, onToggleFavorite, onShare, onMarkSold, navigate, setBoostOpen,
}: {
  isOwner: boolean; isSold: boolean; isFav: boolean;
  startingChat: boolean; marking: boolean;
  listing: { id: string };
  onMessageSeller: () => void; onToggleFavorite: () => void;
  onShare: () => void; onMarkSold: () => void;
  navigate: (to: string) => void;
  setBoostOpen: (v: boolean) => void;
}) {
  return (
    <>
      {!isOwner && !isSold && (
        <Button size="lg" className="flex-1 rounded-xl" onClick={onMessageSeller} disabled={startingChat}>
          {startingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          Message seller
        </Button>
      )}
      {isOwner && (
        <>
          <Button size="lg" variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/sell?edit=${listing.id}`)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          {!isSold && (
            <Button size="lg" className="flex-1 rounded-xl" onClick={onMarkSold} disabled={marking}>
              {marking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Mark sold
            </Button>
          )}
        </>
      )}
      <Button variant="outline" size="lg" className="rounded-xl" onClick={onToggleFavorite} aria-label={isFav ? "Remove" : "Save"}>
        <Heart className={`h-5 w-5 ${isFav ? "fill-accent text-accent" : ""}`} />
      </Button>
      <Button variant="outline" size="lg" className="rounded-xl" onClick={onShare} aria-label="Share">
        <Share2 className="h-5 w-5" />
      </Button>
    </>
  );
}