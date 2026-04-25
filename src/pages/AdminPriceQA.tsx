import { Link } from "react-router-dom";
import { Check, ExternalLink, Rocket, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOST_PRICE_INR } from "@/components/BoostListingDialog";
import { TRIP_PRICE_INR } from "@/lib/tripPlanner";
import {
  LAUNCH_DATE,
  PROMO_CODE,
  PROMO_DISCOUNT_PCT,
  PROMO_DURATION_MONTHS,
  daysLeftInPromo,
  effectivePrice,
  isPromoActive,
  listPrice,
  promoEndDate,
} from "@/lib/promo";

// ---------------------------------------------------------------------------
// Surface registry — every place AI Trip Planner / Boost prices appear.
// To add a new surface: append an entry here. The page renders both states.
// ---------------------------------------------------------------------------
type Surface = {
  id: string;
  product: "trip" | "boost";
  area: string;
  location: string;
  route?: string;
  file: string;
  copy: (mode: "promo" | "default") => React.ReactNode;
};

function priceLabel(base: number, mode: "promo" | "default") {
  const list = listPrice(base).toLocaleString("en-IN");
  if (mode === "default") return `₹${list}`;
  return `₹${effectivePrice(base, LAUNCH_DATE).toLocaleString("en-IN")} (was ₹${list})`;
}

const SURFACES: Surface[] = [
  // ── AI Trip Planner ──────────────────────────────────────────────────────
  {
    id: "home-banner",
    product: "trip",
    area: "Home",
    location: "AI Trip Planner promo card",
    route: "/",
    file: "src/pages/Index.tsx",
    copy: (m) => (
      <p className="text-sm font-semibold">
        AI Trip Planner · {priceLabel(TRIP_PRICE_INR, m)}
      </p>
    ),
  },
  {
    id: "tp-header",
    product: "trip",
    area: "Trip Planner",
    location: "Header tagline",
    route: "/trip-planner",
    file: "src/pages/TripPlanner.tsx",
    copy: (m) => (
      <p className="text-sm text-muted-foreground">
        Premium PDF for {priceLabel(TRIP_PRICE_INR, m)}.
      </p>
    ),
  },
  {
    id: "tp-form-hint",
    product: "trip",
    area: "Trip Planner",
    location: "Form hint under \"Build my preview\"",
    route: "/trip-planner",
    file: "src/pages/TripPlanner.tsx",
    copy: (m) => (
      <p className="text-xs text-muted-foreground">
        You'll see a free teaser. Pay {priceLabel(TRIP_PRICE_INR, m)} only when you want the full plan.
      </p>
    ),
  },
  {
    id: "tp-pay-cta",
    product: "trip",
    area: "Trip Planner",
    location: "Preview unlock CTA button",
    route: "/trip-planner",
    file: "src/pages/TripPlanner.tsx",
    copy: (m) => (
      <Button size="sm" disabled>
        <Sparkles className="mr-2 h-4 w-4" />
        Pay {priceLabel(TRIP_PRICE_INR, m)} & generate PDF
      </Button>
    ),
  },
  {
    id: "tp-pay-dialog",
    product: "trip",
    area: "Pay dialog",
    location: "PayTripDialog price block",
    file: "src/components/PayTripDialog.tsx",
    copy: (m) => (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
        {m === "promo" ? (
          <>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                ₹{listPrice(TRIP_PRICE_INR).toLocaleString("en-IN")}
              </span>
              <span className="text-3xl font-semibold tracking-tight">
                ₹{TRIP_PRICE_INR.toLocaleString("en-IN")}
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-primary">
              {PROMO_DISCOUNT_PCT}% off auto-applied with{" "}
              <span className="font-mono">{PROMO_CODE}</span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            ₹{listPrice(TRIP_PRICE_INR).toLocaleString("en-IN")}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "rec-locked",
    product: "trip",
    area: "Recommendations",
    location: "Locked recommendation upsell line",
    file: "src/components/RecommendationCard.tsx",
    copy: (m) => (
      <p className="text-[11px] text-muted-foreground">
        Pay {priceLabel(TRIP_PRICE_INR, m)} to unlock the full curated list.
      </p>
    ),
  },

  // ── Ad Boost ─────────────────────────────────────────────────────────────
  {
    id: "ld-boost-banner",
    product: "boost",
    area: "Listing detail",
    location: "Boost banner copy",
    file: "src/pages/ListingDetail.tsx",
    copy: (m) => (
      <p className="text-xs text-muted-foreground">
        Featured rail · ~3× views · {priceLabel(BOOST_PRICE_INR, m)} one-time
      </p>
    ),
  },
  {
    id: "ld-boost-button",
    product: "boost",
    area: "Listing detail",
    location: "Boost CTA button",
    file: "src/pages/ListingDetail.tsx",
    copy: (m) => (
      <Button size="sm" disabled>
        <Rocket className="mr-2 h-4 w-4" />
        Boost for {priceLabel(BOOST_PRICE_INR, m)}
      </Button>
    ),
  },
  {
    id: "boost-dialog",
    product: "boost",
    area: "Boost dialog",
    location: "BoostListingDialog price block",
    file: "src/components/BoostListingDialog.tsx",
    copy: (m) => (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
        {m === "promo" ? (
          <>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                ₹{listPrice(BOOST_PRICE_INR).toLocaleString("en-IN")}
              </span>
              <span className="text-3xl font-semibold tracking-tight">
                ₹{BOOST_PRICE_INR.toLocaleString("en-IN")}
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-accent">
              {PROMO_DISCOUNT_PCT}% off auto-applied with{" "}
              <span className="font-mono">{PROMO_CODE}</span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            ₹{listPrice(BOOST_PRICE_INR).toLocaleString("en-IN")}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "payment-history-empty",
    product: "boost",
    area: "Payment history",
    location: "Empty state line",
    route: "/dashboard",
    file: "src/components/PaymentHistory.tsx",
    copy: (m) => (
      <p className="text-sm text-muted-foreground">
        Boost a listing for {priceLabel(BOOST_PRICE_INR, m)} to give it priority placement.
      </p>
    ),
  },
];

function fmt(d: Date) {
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function StatusRow() {
  const active = isPromoActive();
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={active ? "default" : "secondary"}>
          {active ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
          Promo {active ? "ACTIVE" : "inactive"}
        </Badge>
        <Badge variant="outline">Code: {PROMO_CODE}</Badge>
        <Badge variant="outline">{PROMO_DISCOUNT_PCT}% off</Badge>
        <Badge variant="outline">{PROMO_DURATION_MONTHS}-month window</Badge>
        {active && <Badge variant="outline">{daysLeftInPromo()} days left</Badge>}
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Launch</dt>
          <dd className="font-mono">{fmt(LAUNCH_DATE)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Promo ends</dt>
          <dd className="font-mono">{fmt(promoEndDate())}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">AI Trip Planner — base ₹{TRIP_PRICE_INR}</dt>
          <dd>
            <span className="line-through text-muted-foreground">
              ₹{listPrice(TRIP_PRICE_INR)}
            </span>{" "}
            → <strong>₹{effectivePrice(TRIP_PRICE_INR)}</strong>{" "}
            {active && <span className="text-primary">(promo on)</span>}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ad Boost — base ₹{BOOST_PRICE_INR}</dt>
          <dd>
            <span className="line-through text-muted-foreground">
              ₹{listPrice(BOOST_PRICE_INR)}
            </span>{" "}
            → <strong>₹{effectivePrice(BOOST_PRICE_INR)}</strong>{" "}
            {active && <span className="text-accent">(promo on)</span>}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] text-muted-foreground">
        To re-test: edit <code className="font-mono">LAUNCH_DATE</code> in{" "}
        <code className="font-mono">src/lib/promo.ts</code>.
      </p>
    </Card>
  );
}

function SurfaceCard({ surface }: { surface: Surface }) {
  return (
    <Card className="overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/40 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={surface.product === "trip" ? "default" : "secondary"}>
              {surface.product === "trip" ? "Trip Planner" : "Ad Boost"}
            </Badge>
            <span className="text-xs text-muted-foreground">{surface.area}</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium">{surface.location}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{surface.file}</p>
        </div>
        {surface.route && (
          <Button asChild variant="ghost" size="sm">
            <Link to={surface.route} target="_blank" rel="noreferrer">
              Open <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </header>
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="space-y-2 border-b border-border/60 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Before — promo OFF
          </p>
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-3">
            {surface.copy("default")}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            After — promo ON
          </p>
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
            {surface.copy("promo")}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AdminPriceQA() {
  const tripSurfaces = SURFACES.filter((s) => s.product === "trip");
  const boostSurfaces = SURFACES.filter((s) => s.product === "boost");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">QA · Pricing</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Promo price QA — Trip Planner &amp; Ad Boost
        </h1>
        <p className="text-sm text-muted-foreground">
          Every surface that displays an AI Trip Planner or Ad Boost price, rendered in both
          states (promo OFF vs promo ON) for visual verification of the launch window.
        </p>
      </header>

      <StatusRow />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          AI Trip Planner ({tripSurfaces.length})
        </h2>
        <div className="space-y-3">
          {tripSurfaces.map((s) => (
            <SurfaceCard key={s.id} surface={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ad Boost ({boostSurfaces.length})
        </h2>
        <div className="space-y-3">
          {boostSurfaces.map((s) => (
            <SurfaceCard key={s.id} surface={s} />
          ))}
        </div>
      </section>

      <Card className="p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Also visible app-wide:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            <strong>Promo banner</strong> — gradient strip above the header on every page while
            the launch window is active (<code className="font-mono">PromoBanner.tsx</code>).
          </li>
        </ul>
      </Card>
    </div>
  );
}
