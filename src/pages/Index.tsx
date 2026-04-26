import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Search, Smartphone, Sofa, Car, Wrench, Anchor, Shirt,
  BookOpen, Briefcase, MapPin, ShieldCheck, Sparkles, Wand2,
  MessageCircle, HeartHandshake, Compass, ArrowRight, Waves,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/listings";
import { slangOfTheDay } from "@/lib/slang";
import { TRIP_PRICE_INR } from "@/lib/pricing";
import { formatPriceLabel } from "@/lib/promo";
import { HomeLatestPosts } from "@/components/HomeLatestPosts";
import { Hero195 } from "@/components/ui/hero-195";

const categories = [
  { id: "experiences", label: "Experiences", icon: Compass,   accent: true },
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
    <div className="space-y-8 py-2">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Hero195 />

      {/* ── AI Trip Planner banner ────────────────────────────────────────── */}
      <Link
        to="/trip-planner"
        className="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-4 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] active:scale-[0.99]"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary/20">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            AI Trip Planner · {formatPriceLabel(TRIP_PRICE_INR)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ferry-aware, weather-backed, day-by-day PDF — built like a local insider.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Browse categories" href="/listings" />
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {categories.map(({ id, label, icon: Icon, accent }) => (
            <Link
              key={id}
              to={`/listings?category=${id}`}
              className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all active:scale-95 hover:-translate-y-0.5 ${
                accent
                  ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                  : "border-border bg-card hover:border-primary/30 shadow-[var(--shadow-card)]"
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                accent ? "bg-primary/15 text-primary" : "bg-secondary text-primary group-hover:bg-primary/10"
              }`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured rail ─────────────────────────────────────────────────── */}
      {(loadingFeatured || featured.length > 0) && (
        <section>
          <SectionHeader
            title={<><Sparkles className="h-4 w-4 text-accent" /> Featured</>}
            href="/listings"
          />
          <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0">
            {loadingFeatured ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-52 w-40 shrink-0 animate-pulse rounded-2xl bg-muted sm:w-48" />
                ))}
              </div>
            ) : (
              <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
                {featured.map((item) => {
                  const cover = [...item.listing_images]
                    .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
                  return (
                    <li key={item.id} className="w-40 shrink-0 snap-start sm:w-48">
                      <Link
                        to={`/listings/${item.id}`}
                        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-muted">
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
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              No photo
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold text-foreground">{formatPrice(item.price)}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.title}</p>
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

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <TrustCard icon={ShieldCheck} color="text-success" title="Island Verified sellers">
          GPS-checked locals earn a trust badge. You always know you're dealing with a real islander.
        </TrustCard>
        <TrustCard icon={MapPin} color="text-primary" title="Hyperlocal to A&N">
          Filter by island — Port Blair, Havelock, Neil, Diglipur, and more.
        </TrustCard>
        <TrustCard icon={Search} color="text-accent" title="Live in under a minute">
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
              <Anchor className="h-3 w-3" />
              About AndamanBazaar
            </div>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Built on the islands,<br />for the islands.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No mainland middlemen, no shipping surprises, no week-long waits. Just neighbours,
              fair prices, and conversations that happen at island pace.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every listing is local. Every seller is reachable. Every trade runs on the one
              thing that moves things across the Bay —{" "}
              <span className="italic text-foreground">boat pe bharosa</span>.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-95"
              >
                <Compass className="h-4 w-4" /> Explore the bazaar
              </Link>
              <Link
                to="/brand"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-95"
              >
                Our story
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border bg-muted/30 p-5 sm:p-6 md:border-l md:border-t-0">
            {[
              { icon: MapPin,        title: "Hyperlocal by design",   body: "Every listing is tagged to an island and area — not three ferries away." },
              { icon: ShieldCheck,   title: "Island Verified trust",  body: "GPS-checked sellers earn a badge. Real locals, not passing tourists." },
              { icon: MessageCircle, title: "Chat first, ferry later", body: "Ask about pickup, condition, ferry timings before anyone leaves the harbour." },
              { icon: HeartHandshake,title: "Built with islanders",   body: "Designed in A&N, shaped by feedback from Port Blair and Havelock." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-border bg-background p-3.5 shadow-[var(--shadow-card)]">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
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

function SectionHeader({
  title,
  href,
}: {
  title: React.ReactNode;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
        {title}
      </h2>
      <Link to={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        See all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function TrustCard({
  icon: Icon, color, title, children,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`inline-grid h-9 w-9 place-items-center rounded-xl bg-muted ${color}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
