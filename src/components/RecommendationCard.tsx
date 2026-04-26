import { useState } from "react";
import {
  Anchor,
  Backpack,
  BedDouble,
  Compass,
  ExternalLink,
  Info,
  Package,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  affiliateTrackingUrl,
  type TripRecommendation,
} from "@/lib/tripPlanner";
import { TRIP_PRICE_INR } from "@/lib/pricing";
import { formatPriceLabel } from "@/lib/promo";
import { cn } from "@/lib/utils";
import { BookingLeadDialog } from "@/components/BookingLeadDialog";

const TYPE_META: Record<
  TripRecommendation["item_type"],
  { label: string; icon: typeof BedDouble }
> = {
  hotel: { label: "Stay", icon: BedDouble },
  ferry: { label: "Ferry", icon: Anchor },
  activity: { label: "Activity", icon: Compass },
  package: { label: "Package", icon: Package },
  transport: { label: "Transport", icon: Compass },
  addon: { label: "Add-on", icon: Backpack },
};

export function RecommendationCard({
  rec,
  className,
}: {
  rec: TripRecommendation;
  className?: string;
}) {
  const meta = TYPE_META[rec.item_type] ?? TYPE_META.activity;
  const Icon = meta.icon;
  const trackingHref = affiliateTrackingUrl(rec.id);
  const [leadOpen, setLeadOpen] = useState(false);

  const openProvider = () => {
    window.open(trackingHref, "_blank", "noopener,noreferrer");
  };

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              by {rec.merchant_name}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 font-medium leading-snug">
            {rec.item_name}
          </p>
          {rec.short_description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {rec.short_description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="min-w-0">
          {rec.price_inr ? (
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                from
              </span>
              <span className="text-base font-semibold">
                ₹{rec.price_inr.toLocaleString("en-IN")}
              </span>
              {rec.price_label && (
                <span className="text-xs text-muted-foreground">
                  {rec.price_label}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Live pricing on partner site
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setLeadOpen(true)}>
          {rec.cta_label}
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>

      {rec.is_affiliate && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3" />
                <span className="underline decoration-dotted underline-offset-2">
                  Affiliate link
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {rec.disclosure_text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <BookingLeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        context="provider_booking"
        defaults={{ bookingTitle: `${rec.item_name} (${rec.merchant_name})` }}
        onConfirmed={() => openProvider()}
      />
    </Card>
  );
}

export function RecommendationsSection({
  recommendations,
  title = "Recommended for your trip",
  subtitle,
  locked = false,
}: {
  recommendations: TripRecommendation[];
  title?: string;
  subtitle?: string;
  locked?: boolean;
}) {
  if (!recommendations.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Some links above are affiliate links. We may earn a small commission if
        you book through them — at no extra cost to you. This helps keep
        AndamanBazaar free.
        {locked && ` Pay ${formatPriceLabel(TRIP_PRICE_INR)} to unlock the full curated list.`}
      </p>
    </section>
  );
}