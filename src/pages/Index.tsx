import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Smartphone,
  Sofa,
  Car,
  Wrench,
  Anchor,
  Shirt,
  BookOpen,
  Briefcase,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wand2,
  MessageCircle,
  HeartHandshake,
  Compass,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/listings";
import { slangOfTheDay } from "@/lib/slang";

// Kept in sync with CATEGORIES in src/lib/listings.ts
const categories = [
  { id: "electronics", label: "Electronics", icon: Smartphone },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "home", label: "Home & Garden", icon: Sofa },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "fishing", label: "Fishing & Boats", icon: Anchor },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "books", label: "Books & Hobbies", icon: BookOpen },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "other", label: "Other", icon: HelpCircle },
];

type FeaturedItem = {
  id: string;
  title: string;
  price: number;
  area: string | null;
  city: string;
  listing_images: { image_url: string; display_order: number }[];
};

const Index = () => {
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Featured first; fall back to most-viewed active listings if none flagged
      const { data: flagged } = await supabase
        .from("listings")
        .select("id, title, price, area, city, listing_images(image_url, display_order)")
        .eq("status", "active")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);

      let rows = (flagged ?? []) as FeaturedItem[];
      if (rows.length === 0) {
        const { data: top } = await supabase
          .from("listings")
          .select("id, title, price, area, city, listing_images(image_url, display_order)")
          .eq("status", "active")
          .order("views_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8);
        rows = (top ?? []) as FeaturedItem[];
      }
      if (!cancelled) {
        setFeatured(rows);
        setLoadingFeatured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10 py-2">
    {/* Hero */}
    <section className="relative overflow-hidden rounded-2xl bg-[image:var(--gradient-hero)] p-6 text-primary-foreground shadow-[var(--shadow-elevated)] sm:p-10">
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <MapPin className="h-3.5 w-3.5" />
          Andaman & Nicobar Islands
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Buy, sell, and discover — across the islands.
        </h1>
        <p className="mt-3 text-base text-primary-foreground/85 sm:text-lg">
          The hyperlocal marketplace for Port Blair, Havelock, Diglipur and beyond.
        </p>
        <p className="mt-2 text-sm text-primary-foreground/75 sm:text-base">
          {slangOfTheDay("homeTagline")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-background/90"
          >
            <Search className="h-4 w-4" />
            Browse listings
          </Link>
          <Link
            to="/sell"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90"
          >
            Post something for sale
          </Link>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
    </section>

    {/* Featured rail */}
    {(loadingFeatured || featured.length > 0) && (
      <section>
        <Link
          to="/trip-planner"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-4 transition-shadow hover:shadow-[var(--shadow-elevated)]"
        >
          <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-primary/15 text-primary">
            <Wand2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Plan your Andaman trip with AI · ₹49</p>
            <p className="text-xs text-muted-foreground">
              Ferry-aware, weather-backed, day-by-day PDF. Built like a local insider.
            </p>
          </div>
          <span className="hidden rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground sm:inline-flex">
            Try it
          </span>
        </Link>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-accent" />
            Featured on the bazaar
          </h2>
          <Link to="/listings" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
        {loadingFeatured ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-56 w-44 flex-none animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
            {featured.map((item) => {
              const cover = [...item.listing_images].sort(
                (a, b) => a.display_order - b.display_order,
              )[0]?.image_url;
              return (
                <li key={item.id} className="w-44 flex-none snap-start sm:w-52">
                  <Link
                    to={`/listings/${item.id}`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {cover ? (
                        <img
                          src={cover}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-foreground">
                        {formatPrice(item.price)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.title}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {item.area || item.city}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    )}

    {/* Categories */}
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Browse categories</h2>
        <Link to="/listings" className="text-sm font-medium text-primary hover:underline">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {categories.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            to={`/listings?category=${id}`}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary group-hover:bg-primary/10">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </section>

    {/* Trust strip */}
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <ShieldCheck className="h-5 w-5 text-success" />
        <h3 className="mt-2 text-sm font-semibold">Island Verified sellers</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sellers verified by GPS get a trust badge so you know you're dealing locally.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="mt-2 text-sm font-semibold">Hyperlocal to A&N</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Filter by area — Port Blair, Havelock, Neil, Diglipur, and more.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <Search className="h-5 w-5 text-accent" />
        <h3 className="mt-2 text-sm font-semibold">Easy posting</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Snap a photo, set a price, and your listing is live in under a minute.
        </p>
      </div>
    </section>

    {/* About */}
    <section
      id="about"
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
        {/* Story side */}
        <div className="space-y-5 p-6 sm:p-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Anchor className="h-3.5 w-3.5" />
            About AndamanBazaar
          </div>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Built on the islands, for the islands.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            AndamanBazaar is the hyperlocal marketplace for the Andaman & Nicobar archipelago —
            a place where Port Blair, Havelock, Neil, Diglipur and the smaller islands trade
            in the same room. No mainland middlemen, no shipping surprises, no week-long waits.
            Just neighbours, fair prices, and conversations that happen at island pace.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            We started this because finding a fridge in Havelock or selling a scooter in Port
            Blair shouldn't mean shouting in WhatsApp groups. Every listing here is local. Every
            seller is reachable. And every trade runs on the one thing that actually moves
            things across the Bay — <span className="italic">boat pe bharosa</span>.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              <Compass className="h-4 w-4" />
              Explore the bazaar
            </Link>
            <Link
              to="/brand"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Our story & brand
            </Link>
          </div>
        </div>

        {/* Pillars side */}
        <div className="grid gap-4 border-t border-border bg-muted/40 p-6 sm:p-8 md:border-l md:border-t-0">
          <AboutPillar
            icon={MapPin}
            title="Hyperlocal by design"
            body="Every listing is tagged to an island and an area, so what you see is actually nearby — not three ferries away."
          />
          <AboutPillar
            icon={ShieldCheck}
            title="Island Verified trust"
            body="GPS-checked sellers earn a verified badge. You always know you're dealing with a real local, not a passing tourist."
          />
          <AboutPillar
            icon={MessageCircle}
            title="Chat first, ferry later"
            body="Built-in chat lets you ask the practical questions — pickup, condition, ferry timings — before anyone leaves the harbour."
          />
          <AboutPillar
            icon={HeartHandshake}
            title="Built with islanders"
            body="Designed in A&N, shaped by feedback from sellers in Port Blair and Havelock. We ship updates the way you'd expect: often, and with care."
          />
        </div>
      </div>
    </section>
    </div>
  );
};

function AboutPillar({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)]">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export default Index;
