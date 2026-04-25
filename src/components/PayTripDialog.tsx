import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  TRIP_PRICE_INR,
  createTripOrder,
  loadCashfreeSdk,
  verifyTripPayment,
} from "@/lib/tripPlanner";

type Props = {
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (result: { storage_path?: string | null; generation_error?: string }) => void;
};

export function PayTripDialog({ tripId, open, onOpenChange, onPaid }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    stage: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onConfirm = async () => {
    if (!tripId) return;
    setSubmitting(true);
    setErrorInfo(null);
    setAttempt((n) => n + 1);
    let stage = "create-order";
    try {
      const order = await createTripOrder(tripId);

      stage = "checkout";
      await loadCashfreeSdk();
      if (!window.Cashfree) throw new Error("Cashfree SDK unavailable");
      const cf = window.Cashfree({
        mode: order.env === "production" ? "production" : "sandbox",
      });
      const result = await cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
      });
      if (result?.error) throw new Error(result.error.message ?? "Payment cancelled");

      stage = "verify-payment";
      const verify = await verifyTripPayment(order.order_id);
      if (verify.status !== "paid") {
        throw new Error("Payment not confirmed. If money was deducted, contact support.");
      }

      toast({
        title: "Payment received",
        description: "Generating your Andaman trip plan…",
      });
      onPaid({
        storage_path: verify.storage_path,
        generation_error: verify.generation_error,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      console.error("[PayTripDialog]", { stage, message, err });
      setErrorInfo({ message, stage });
      toast({ title: "Payment failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setErrorInfo(null);
      setAttempt(0);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-2xl">Unlock your full plan</DialogTitle>
          <DialogDescription className="text-center">
            Day-by-day, ferry-aware, weather-backed Andaman itinerary as a downloadable PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">One-time</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            ₹{TRIP_PRICE_INR.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Includes PDF · saved to your account · share anytime
          </p>
        </div>

        {errorInfo && (
          <div
            role="alert"
            className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-destructive" />
              <div className="flex-1 space-y-1">
                <p className="font-medium text-destructive">Payment failed</p>
                <p className="text-foreground/90 break-words">{errorInfo.message}</p>
                <p className="text-xs text-muted-foreground">
                  Stage: <span className="font-mono">{errorInfo.stage}</span> · Attempt #{attempt}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onConfirm} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : errorInfo ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {errorInfo ? `Retry (₹${TRIP_PRICE_INR})` : `Pay ₹${TRIP_PRICE_INR} & generate`}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
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