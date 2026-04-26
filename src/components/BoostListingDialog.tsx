import { useState } from "react";
import { AlertCircle, Eye, Loader2, RefreshCw, Rocket, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROMO_CODE,
  PROMO_DISCOUNT_PCT,
  effectivePrice,
  isPromoActive,
  listPrice,
} from "@/lib/promo";
import { BOOST_PRICE_INR } from "@/lib/pricing";

// Re-exported for backwards-compatibility. Canonical source: src/lib/pricing.ts
export { BOOST_PRICE_INR };

const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

type Cashfree = {
  checkout: (opts: {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }) => Promise<{ error?: { message?: string }; redirect?: boolean; paymentDetails?: unknown }>;
};

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => Cashfree;
  }
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Cashfree) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CASHFREE_SDK_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cashfree SDK load failed"));
    document.head.appendChild(script);
  });
}

type Props = {
  listingId: string | null;
  listingTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoosted?: () => void;
};

export function BoostListingDialog({
  listingId,
  listingTitle,
  open,
  onOpenChange,
  onBoosted,
}: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    stage: string;
    detail?: string;
  } | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const onConfirm = async () => {
    if (!listingId) return;
    setSubmitting(true);
    setErrorInfo(null);
    setAttemptCount((n) => n + 1);
    let stage: string = "create-order";
    try {
      // 1. Create Cashfree order via edge function
      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        "cashfree-create-order",
        { body: { listing_id: listingId } }
      );
      if (orderErr) {
        const ctx = (orderErr as { context?: Response }).context;
        let serverDetail: string | undefined;
        if (ctx && typeof ctx.text === "function") {
          try {
            serverDetail = await ctx.clone().text();
          } catch {
            /* ignore */
          }
        }
        const err = new Error(orderErr.message ?? "Order creation failed");
        (err as Error & { detail?: string }).detail = serverDetail;
        throw err;
      }
      if (!orderData?.payment_session_id) {
        throw new Error(orderData?.error ?? "Order creation failed");
      }

      // 2. Load SDK and open checkout modal
      stage = "checkout";
      await loadCashfreeSdk();
      if (!window.Cashfree) throw new Error("Cashfree SDK unavailable");
      const cashfree = window.Cashfree({
        mode: orderData.env === "production" ? "production" : "sandbox",
      });
      const result = await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_modal",
      });
      if (result?.error) {
        throw new Error(result.error.message ?? "Payment cancelled");
      }

      // 3. Verify on backend
      stage = "verify-payment";
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
        "cashfree-verify-payment",
        { body: { order_id: orderData.order_id } }
      );
      if (verifyErr) throw verifyErr;
      if (verifyData?.status !== "paid") {
        throw new Error("Payment not confirmed. Agar paise kat gaye hain, support se baat karo.");
      }

      toast({
        title: "Boost active!",
        description: "Listing ab Featured rail mein dikh rahi hai. Boat pe bharosa rakho.",
      });
      onBoosted?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Boost failed";
      const detail = (err as Error & { detail?: string })?.detail;
      console.error("[BoostListingDialog] failed", { stage, message, detail, err });
      setErrorInfo({ message, stage, detail });
      toast({ title: "Boost failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setErrorInfo(null);
      setAttemptCount(0);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Rocket className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-2xl">Boost this listing</DialogTitle>
          <DialogDescription className="text-center">
            {listingTitle ? (
              <>
                Make <span className="font-medium text-foreground">{listingTitle}</span> stand out
                across the bazaar.
              </>
            ) : (
              "Make your listing stand out across the bazaar."
            )}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2 text-sm">
          <li className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>
              Featured rail par show — homepage pe top spot.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>~3× zyada views ka estimate.</span>
          </li>
          <li className="flex items-start gap-3">
            <Eye className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>Priority placement until your listing sells.</span>
          </li>
        </ul>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
          {isPromoActive() ? (
            <>
              <p className="mt-1 flex items-baseline justify-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  ₹{listPrice(BOOST_PRICE_INR).toLocaleString("en-IN")}
                </span>
                <span className="text-3xl font-semibold tracking-tight">
                  ₹{effectivePrice(BOOST_PRICE_INR).toLocaleString("en-IN")}
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-accent">
                {PROMO_DISCOUNT_PCT}% off auto-applied with{" "}
                <span className="font-mono">{PROMO_CODE}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">per listing · no recurring charge</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                ₹{listPrice(BOOST_PRICE_INR).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">per listing · no recurring charge</p>
            </>
          )}
        </div>

        {errorInfo && (
          <div
            role="alert"
            className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-destructive" />
              <div className="flex-1 space-y-1">
                <p className="font-medium text-destructive">Boost failed</p>
                <p className="text-foreground/90 break-words">{errorInfo.message}</p>
              </div>
            </div>
            <details className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none font-medium text-foreground/80">
                Technical details
              </summary>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-2">
                  <dt className="font-medium">Stage:</dt>
                  <dd className="font-mono">{errorInfo.stage}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Attempt:</dt>
                  <dd className="font-mono">#{attemptCount}</dd>
                </div>
                {errorInfo.detail && (
                  <div>
                    <dt className="font-medium">Server response:</dt>
                    <dd className="mt-1 max-h-32 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] leading-snug break-all">
                      {errorInfo.detail}
                    </dd>
                  </div>
                )}
              </dl>
            </details>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onConfirm} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : errorInfo ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {errorInfo ? `Retry boost (₹${BOOST_PRICE_INR})` : `Boost for ₹${BOOST_PRICE_INR}`}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="w-full"
          >
            {errorInfo ? "Close" : "Maybe later"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}