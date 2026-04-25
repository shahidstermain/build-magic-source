import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Receipt,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ListingLite = {
  id: string;
  title: string;
  is_featured: boolean;
  status: string;
};

type PaymentLite = {
  id: string;
  status: "created" | "paid" | "failed";
  amount: number;
  razorpay_order_id: string;
  listing_id: string | null;
  created_at: string;
};

const SANDBOX_CARD = {
  number: "4111 1111 1111 1111",
  expiry: "03 / 28",
  cvv: "123",
  otp: "111000",
};

const PaymentTestChecklist = () => {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<ListingLite[]>([]);
  const [payments, setPayments] = useState<PaymentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, is_featured, status")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id, status, amount, razorpay_order_id, listing_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setListings((l ?? []) as ListingLite[]);
    setPayments((p ?? []) as PaymentLite[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const latestPayment = payments[0] ?? null;
  const boostedListing = useMemo(
    () =>
      latestPayment?.listing_id
        ? listings.find((l) => l.id === latestPayment.listing_id) ?? null
        : null,
    [latestPayment, listings],
  );

  const hasActiveListing = listings.some((l) => l.status === "active");
  const hasPendingPayment = payments.some((p) => p.status === "created");
  const hasPaidPayment = payments.some((p) => p.status === "paid");
  const latestIsPaid = latestPayment?.status === "paid";
  const latestListingBoosted = !!boostedListing?.is_featured;

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <section className="py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment test checklist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk through a sandbox ₹99 Boost end-to-end. Refresh after each step.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh status
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <Step
          done={hasActiveListing}
          n={1}
          title="You have at least one active listing"
          body={
            hasActiveListing ? (
              <p className="text-sm text-muted-foreground">
                Found {listings.filter((l) => l.status === "active").length} active listing(s). Pick one to boost.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create a listing first — Boost is only available on active listings.
              </p>
            )
          }
          action={
            hasActiveListing ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/sell">+ Create listing</Link>
              </Button>
            )
          }
        />

        <Step
          done={hasPendingPayment || hasPaidPayment}
          n={2}
          title="Open a Boost on the dashboard"
          body={
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                On <Link to="/dashboard" className="underline">Dashboard → My listings</Link>, click{" "}
                <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
                  <Rocket className="h-3 w-3" /> Boost
                </span>{" "}
                on any active listing, then confirm the ₹99 dialog.
              </p>
              <p>
                A Cashfree checkout modal opens. Use these <strong>sandbox</strong> credentials:
              </p>
              <ul className="ml-4 list-disc space-y-0.5 font-mono text-xs">
                <li>Card: {SANDBOX_CARD.number}</li>
                <li>Expiry: {SANDBOX_CARD.expiry}</li>
                <li>CVV: {SANDBOX_CARD.cvv}</li>
                <li>OTP: {SANDBOX_CARD.otp}</li>
              </ul>
              <a
                href="https://www.cashfree.com/docs/payments/online/web/integrations/web-checkout/test-environment"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                More test cards <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          }
        />

        <Step
          done={latestIsPaid}
          n={3}
          title="Payment marked Paid in Dashboard → Payments"
          body={
            latestPayment ? (
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Latest order:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {latestPayment.razorpay_order_id}
                  </code>
                  <StatusBadge status={latestPayment.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{latestPayment.amount} ·{" "}
                  {new Date(latestPayment.created_at).toLocaleString("en-IN")}
                </p>
                {!latestIsPaid && (
                  <p className="text-xs text-muted-foreground">
                    Still pending? The webhook (or verify call) updates this within a few seconds. Hit Refresh.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payments yet. Complete step 2 to see one here.
              </p>
            )
          }
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">
                <Receipt className="mr-1 h-3.5 w-3.5" /> Open Payments tab
              </Link>
            </Button>
          }
        />

        <Step
          done={latestListingBoosted}
          n={4}
          title="Listing shows the Boosted badge"
          body={
            boostedListing ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="truncate font-medium">{boostedListing.title}</span>
                {boostedListing.is_featured ? (
                  <Badge className="bg-accent text-accent-foreground">
                    <Sparkles className="mr-1 h-3 w-3" /> Boosted
                  </Badge>
                ) : (
                  <Badge variant="outline">Not boosted yet</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Will show up here once your latest payment is linked to a listing.
              </p>
            )
          }
          action={
            boostedListing ? (
              <Button asChild size="sm" variant="outline">
                <Link to={`/listings/${boostedListing.id}`}>
                  View listing <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null
          }
        />
      </div>

      {latestIsPaid && latestListingBoosted && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success-foreground">
          ✅ End-to-end Cashfree flow working. Boat pe bharosa rakho.
        </div>
      )}
    </section>
  );
};

function Step({
  n,
  title,
  body,
  done,
  action,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
  done: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-none">
          {done ? (
            <CheckCircle2 className="h-6 w-6 text-success" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Step {n}
            </span>
            {done && (
              <Badge className="bg-success text-success-foreground">Done</Badge>
            )}
          </div>
          <h2 className="mt-0.5 font-semibold">{title}</h2>
          <div className="mt-2">{body}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentLite["status"] }) {
  if (status === "paid") {
    return (
      <Badge className="bg-success text-success-foreground">Paid</Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-destructive text-destructive-foreground">Failed</Badge>
    );
  }
  return (
    <Badge className="bg-secondary text-secondary-foreground">Pending</Badge>
  );
}

export default PaymentTestChecklist;