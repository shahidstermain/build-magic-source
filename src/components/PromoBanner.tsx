import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import {
  PROMO_CODE,
  PROMO_DISCOUNT_PCT,
  daysLeftInPromo,
  isPromoActive,
} from "@/lib/promo";

const DISMISS_KEY = "ab_promo_banner_dismissed_v1";

export function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isPromoActive()) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const days = daysLeftInPromo();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const onDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="relative bg-gradient-to-r from-accent via-primary to-accent text-accent-foreground">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <Sparkles className="h-4 w-4 flex-none" />
        <p className="flex-1 leading-tight">
          <span className="font-semibold">Launch offer:</span>{" "}
          {PROMO_DISCOUNT_PCT}% off all Ad Boost packs &amp; AI Trip Planner.
          Use code{" "}
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md bg-background/15 px-1.5 py-0.5 font-mono font-semibold tracking-wide hover:bg-background/25"
            aria-label={`Copy promo code ${PROMO_CODE}`}
          >
            {copied ? "Copied!" : PROMO_CODE}
          </button>{" "}
          <span className="hidden sm:inline">· {days} day{days === 1 ? "" : "s"} left</span>
        </p>
        <Link
          to="/trip-planner"
          className="hidden rounded-full bg-background/20 px-3 py-1 font-medium hover:bg-background/30 sm:inline-block"
        >
          Plan a trip
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-6 w-6 flex-none place-items-center rounded-full hover:bg-background/20"
          aria-label="Dismiss promo banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
