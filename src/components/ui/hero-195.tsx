import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  MapPin,
  Sparkles,
  Ship,
  Wand2,
  Search,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BorderBeam } from "@/components/ui/border-beam";
import { SmartImage } from "@/components/ui/smart-image";

const previewTabs = [
  {
    id: "trip",
    label: "AI Trip Plan",
    icon: Wand2,
    headline: "Day 3 · Havelock → Neil Island",
    sub: "Ferry: Makruzz 11:30 AM (₹1,500) · 1h 15m",
    bullets: [
      "Sunrise scuba @ Elephant Beach (₹3,500)",
      "Lunch: Full Moon Café · 12:45 PM",
      "Sunset @ Laxmanpur Beach · 5:30 PM",
    ],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Compass,
    headline: "Royal Enfield Classic 350",
    sub: "Port Blair · 12,400 km · ₹1,45,000",
    bullets: [
      "Verified local seller · 4.9 ★",
      "Replied in 12 minutes",
      "Ships within Andaman Islands",
    ],
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "experiences",
    label: "Experiences",
    icon: Ship,
    headline: "Scuba @ Elephant Beach",
    sub: "Havelock · 45 min · ₹3,500/person",
    bullets: [
      "PADI-certified instructors",
      "Free GoPro footage included",
      "Pickup from Havelock jetty",
    ],
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=70",
  },
];

export interface Hero195Props {
  className?: string;
}

export function Hero195({ className }: Hero195Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border bg-background px-5 py-12 sm:px-10 sm:py-16",
        className,
      )}
    >
      {/* decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.18),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left: copy + CTAs ─────────────────────────────────────── */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <MapPin className="h-3 w-3 text-primary" />
            Andaman & Nicobar · Built by locals
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Buy, sell &amp; explore the{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Andamans
            </span>{" "}
            like a local.
          </h1>

          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            One island app for hyperlocal classifieds, verified experiences, and
            ferry-aware AI trip plans — from Port Blair to Diglipur.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/trip-planner">
                <Wand2 className="h-4 w-4" />
                Plan my trip
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/listings">
                <Search className="h-4 w-4" />
                Browse listings
              </Link>
            </Button>
          </div>

          {/* Trust strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </span>
              <span className="font-medium text-foreground">4.9</span>
              <span>from 1,200+ travellers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ferry timings verified daily
            </div>
          </div>
        </div>

        {/* ── Right: tabbed preview card with BorderBeam ────────────── */}
        <div className="relative">
          <Tabs defaultValue="trip" className="w-full">
            <TabsList className="mx-auto grid w-fit grid-cols-3 rounded-full bg-muted p-1">
              {previewTabs.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="rounded-full px-3 text-xs sm:text-sm"
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {previewTabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-4">
                <Card className="relative overflow-hidden rounded-2xl border-border/70 shadow-xl">
                  <BorderBeam size={250} duration={12} />
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <SmartImage
                      src={t.image}
                      alt={t.headline}
                      sizes="(max-width: 1024px) 100vw, 600px"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Live preview
                    </span>
                  </div>
                  <CardContent className="space-y-3 p-5">
                    <div>
                      <p className="text-base font-semibold">{t.headline}</p>
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {t.bullets.map((b, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}

export default Hero195;