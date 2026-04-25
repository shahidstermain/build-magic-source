import { useState } from "react";
import { Loader2, Rocket, TrendingUp, Sparkles, Eye } from "lucide-react";
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

export const BOOST_PRICE_INR = 99;

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

  const onConfirm = async () => {
    if (!listingId) return;
    setSubmitting(true);
    try {
      // 1. Create Cashfree order via edge function
      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        "cashfree-create-order",
        { body: { listing_id: listingId } }
      );
      if (orderErr) throw orderErr;
      if (!orderData?.payment_session_id) {
        throw new Error(orderData?.error ?? "Order creation failed");
      }

      // 2. Load SDK and open checkout modal
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
      toast({ title: "Boost failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            ₹{BOOST_PRICE_INR.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">per listing · no recurring charge</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onConfirm} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Boost for ₹{BOOST_PRICE_INR}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}