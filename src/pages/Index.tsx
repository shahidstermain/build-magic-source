import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Search, Smartphone, Sofa, Car, Wrench, Anchor, Shirt,
  BookOpen, Briefcase, MapPin, ShieldCheck, Sparkles, Wand2,
  MessageCircle, HeartHandshake, Compass, ArrowRight, Waves,
  Star, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/listings";
import { slangOfTheDay } from "@/lib/slang";
import { TRIP_PRICE_INR } from "@/lib/pricing";
import { formatPriceLabel } from "@/lib/promo";
import { HomeLatestPosts } from "@/components/HomeLatestPosts";
import { Hero195 } from "@/components/ui/hero-195";
import InteractiveSelector from "@/components/ui/interactive-selector";
import { usePageSeo } from "@/hooks/usePageSeo";

const categories = [
  { id: "experiences", label: "Experiences", icon: Compass,   featured: true },
  { id: "electronics", label: "Electronics", icon: Smartphone },
  { id: "vehicles",    label: "Vehicles",    icon: Car },
  { id: "home",        label: "Home",        icon: Sofa },
  { id: "fashion",     label: "Fashion",     icon: Shirt },
  { id: "fishing",     label: "Fishing",     icon: Anchor },
  { id: "tools",       label: "Tools",       icon: Wrench },
  { id: "books",       label: "Books",       icon: BookOpen },
  { id: "services",    label: "Services",    icon: Briefcase },
];

type FeaturedItem = {
  id: string;
  title: string;
  price: number;
  area: string | null;
  city: string;
  listing_images: { image_url: string; display_order: number }[];
};

export default function Index() {
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  usePageSeo({
    title: "AndamanBazaar — Buy, Sell & Discover Across the Islands",
    description: "The hyperlocal marketplace for the Andaman & Nicobar Islands. Buy, sell, and discover local experiences across Port Blair, Havelock, Neil, Diglipur and beyond. Boat pe bharosa.",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "AndamanBazaar — Island Marketplace",
      "description": "Hyperlocal buy-sell marketplace and experience booking for the Andaman & Nicobar Islands",
      "url": "https://andamanbazaar.in/",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://andamanbazaar.in/" }]
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: flagged } = await supabase
        .from("listings")
        .select("id, title, price, area, city, listing_images(image_url, display_order)")
        .eq("status", "active").eq("is_featured", true)
        .order("created_at", { ascending: false }).limit(8);

      let rows = (flagged ?? []) as FeaturedItem[];
      if (rows.length === 0) {
        const { data: top } = await supabase
          .from("listings")
          .select("id, title, price, area, city, listing_images(image_url, display_order)")
          .eq("status", "active")
          .order("views_count", { ascending: false })
          .order("created_at", { ascending: false }).limit(8);
        rows = (top ?? []) as FeaturedItem[];
      }
      if (!cancelled) { setFeatured(rows); setLoadingFeatured(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-10 py-2">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Hero195 />

      {/* ── Explore the islands ──────────────────────────────────────────── */}
      <InteractiveSelector />

      {/* ── AI TRIP PLANNER BANNER ────────────────────────────────────────── */}
      <Link
        to="/trip-planner"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-[hsl(185_72%_34%/0.06)] to-transparent p-5 transition-all hover:border-primary/35 hover:shadow-[var(--shadow-elevated)] active:scale-[0.99]"
      >
        {/* Glow blob */}
        <div className="pointer-events-none absolute -left-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl" />

        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15)] transition-all group-hover:bg-primary/20 group-hover:scale-105">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">AI Trip Planner</p>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">{formatPriceLabel(TRIP_PRICE_INR)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ferry-aware · weather-backed · day-by-day PDF — built like a local insider.
          </p>
        </div>
        <ArrowRight className="relative h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Browse categories" href="/listings" />
        <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {categories.map(({ id, label, icon: Icon, featured: isFeatured }) => (
            <Link
              key={id}
              to={`/listings?category=${id}`}
              className={`group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] active:scale-95 ${
                isFeatured
                  ? "border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 hover:border-primary/40"
                  : "border-border bg-[image:var(--gradient-card)] hover:border-primary/25 shadow-[var(--shadow-card)]"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl transition-all duration-200 ${
                isFeatured
                  ? "bg-primary/20 text-primary group-hover:bg-primary/30 group-hover:scale-110"
                  : "bg-secondary text-primary group-hover:bg-primary/12 group-hover:scale-110"
              }`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED RAIL ────────────────────────────────────────────────── */}
      {(loadingFeatured || featured.length > 0) && (
        <section>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Featured on the bazaar
              </span>
            }
            href="/listings"
          />
          <div className="-mx-4 mt-4 px-4 sm:mx-0 sm:px-0">
            {loadingFeatured ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-56 w-40 shrink-0 rounded-2xl shimmer sm:w-48" />
                ))}
              </div>
            ) : (
              <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scrollbar-none">
                {featured.map((item) => {
                  const cover = [...item.listing_images]
                    .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
                  return (
                    <li key={item.id} className="w-40 shrink-0 snap-start sm:w-48">
                      <Link
                        to={`/listings/${item.id}`}
                        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] active:scale-[0.97]"
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          {cover ? (
                            <img
                              src={cover}
                              alt={item.title}
                              width={192}
                              height={192}
                              sizes="(min-width: 640px) 192px, 160px"
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              src={cover} alt={item.title} loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl">🏝️</div>
                          )}
                          {/* Price badge */}
                          <div className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-bold backdrop-blur-sm shadow-sm">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-2 text-xs font-medium text-foreground">{item.title}</p>
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {item.area || item.city}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <TrustCard
          icon={ShieldCheck}
          gradient="from-[hsl(155_58%_36%/0.12)] to-[hsl(155_58%_36%/0.04)]"
          iconBg="bg-[hsl(155_58%_36%/0.15)] text-[hsl(155_58%_36%)]"
          title="Island Verified sellers"
        >
          GPS-checked locals earn a trust badge. You always know you're dealing with a real islander.
        </TrustCard>
        <TrustCard
          icon={MapPin}
          gradient="from-primary/12 to-primary/4"
          iconBg="bg-primary/15 text-primary"
          title="Hyperlocal to A&N"
        >
          Filter by island — Port Blair, Havelock, Neil, Diglipur, and more.
        </TrustCard>
        <TrustCard
          icon={TrendingUp}
          gradient="from-[hsl(var(--accent)/0.12)] to-[hsl(var(--accent)/0.04)]"
          iconBg="bg-[hsl(var(--accent)/0.15)] text-accent"
          title="Live in under a minute"
        >
          Snap a photo, set a price, and your listing is live instantly.
        </TrustCard>
      </section>

      {/* ── Latest from Andaman ──────────────────────────────────────────── */}
      <HomeLatestPosts />

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          {/* Story */}
          <div className="space-y-5 p-7 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-[11px] font-semibold text-primary">
              <Anchor className="h-3 w-3" />
              About AndamanBazaar
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Built on the islands,<br />
              <span className="text-primary">for the islands.</span>
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No mainland middlemen, no shipping surprises, no week-long waits. Just neighbours,
              fair prices, and conversations that happen at island pace.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every listing is local. Every seller is reachable. Every trade runs on the one
              thing that moves things across the Bay —{" "}
              <em className="font-semibold not-italic text-foreground">boat pe bharosa</em>.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.35)] transition-all hover:opacity-90 hover:shadow-[0_6px_20px_hsl(var(--primary)/0.4)] active:scale-95"
              >
                <Compass className="h-4 w-4" /> Explore the bazaar
              </Link>
              <Link
                to="/brand"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95"
              >
                Our story
              </Link>
            </div>
          </div>

          {/* Pillars */}
          <div className="grid gap-3 border-t border-border bg-muted/25 p-5 sm:p-7 md:border-l md:border-t-0">
            {[
              { icon: MapPin,         title: "Hyperlocal by design",    body: "Every listing is tagged to an island and area — not three ferries away." },
              { icon: ShieldCheck,    title: "Island Verified trust",   body: "GPS-checked sellers earn a badge. Real locals, not passing tourists." },
              { icon: MessageCircle,  title: "Chat first, ferry later", body: "Ask about pickup, condition, ferry timings before anyone leaves the harbour." },
              { icon: HeartHandshake, title: "Built with islanders",    body: "Designed in A&N, shaped by feedback from Port Blair and Havelock." },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-3 rounded-2xl border border-border bg-background p-4 shadow-[var(--shadow-xs)] transition-all hover:border-primary/20 hover:shadow-[var(--shadow-card)]"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionHeader({ title, href }: { title: React.ReactNode; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
        {title}
      </h2>
      <Link
        to={href}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all hover:gap-1.5"
      >
        See all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function TrustCard({
  icon: Icon, gradient, iconBg, title, children,
}: {
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${gradient} p-5 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5`}>
      <div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
