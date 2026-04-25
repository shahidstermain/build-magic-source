import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, Rocket, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { BOOST_PRICE_INR } from "@/lib/pricing";
import { formatPriceLabel } from "@/lib/promo";

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  purpose: string;
  razorpay_order_id: string;
  created_at: string;
  listing_id: string | null;
  listing: { id: string; title: string } | null;
};

const STATUS_META: Record<
  PaymentRow["status"],
  { label: string; className: string; icon: typeof Clock }
> = {
  created: {
    label: "Pending",
    className: "bg-secondary text-secondary-foreground",
    icon: Clock,
  },
  paid: {
    label: "Paid",
    className: "bg-success text-success-foreground",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive text-destructive-foreground",
    icon: XCircle,
  },
};

function formatINR(amount: number, currency: string) {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentHistory({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, amount, currency, status, purpose, razorpay_order_id, created_at, listing_id, listing:listings(id, title)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast({
          title: "Could not load payments",
          description: error.message,
          variant: "destructive",
        });
      }
      setRows((data ?? []) as unknown as PaymentRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No payments yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Boost a listing for {formatPriceLabel(BOOST_PRICE_INR)} to give it priority placement.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((p) => {
        const meta = STATUS_META[p.status];
        const Icon = meta.icon;
        return (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent/10 text-accent">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">
                  Boost · {formatINR(p.amount, p.currency)}
                </p>
                <Badge className={meta.className}>
                  <Icon className="mr-1 h-3 w-3" />
                  {meta.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {p.listing ? (
                  <Link
                    to={`/listings/${p.listing.id}`}
                    className="hover:underline"
                  >
                    {p.listing.title}
                  </Link>
                ) : (
                  <span className="italic">Listing removed</span>
                )}
                {" · "}
                {formatDate(p.created_at)}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                Order {p.razorpay_order_id}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}