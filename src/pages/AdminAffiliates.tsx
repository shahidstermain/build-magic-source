import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RangeOption = "7" | "30" | "90";

type DailyStat = {
  day: string;
  clicks: number;
  conversions: number;
  revenue_inr: number;
  commission_inr: number;
};

type VendorStat = {
  vendor_id: string;
  vendor_name: string;
  clicks: number;
  conversions: number;
  revenue_inr: number;
  commission_inr: number;
};

type LinkPerf = {
  recommendation_id: string;
  vendor_id: string | null;
  merchant_name: string;
  item_name: string;
  affiliate_url: string;
  clicks: number;
  conversions: number;
  revenue_inr: number;
  commission_inr: number;
  is_high_traffic_no_revenue: boolean;
};

type Vendor = { id: string; name: string; slug: string };

function inr(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const AdminAffiliates = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [range, setRange] = useState<RangeOption>("30");
  const [loading, setLoading] = useState(false);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [vendors, setVendors] = useState<VendorStat[]>([]);
  const [links, setLinks] = useState<LinkPerf[]>([]);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);

  // Manual conversion form state
  const [manualOpen, setManualOpen] = useState(false);
  const [mVendorId, setMVendorId] = useState<string>("");
  const [mAmount, setMAmount] = useState("");
  const [mCommission, setMCommission] = useState("");
  const [mExternalId, setMExternalId] = useState("");
  const [mClickId, setMClickId] = useState("");
  const [mRecId, setMRecId] = useState("");
  const [mStatus, setMStatus] = useState<"pending" | "confirmed" | "paid">("confirmed");
  const [submittingManual, setSubmittingManual] = useState(false);

  // ── Admin gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const range_from = useMemo(
    () => format(subDays(new Date(), Number(range)), "yyyy-MM-dd"),
    [range],
  );
  const range_to = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [dailyRes, vendorRes, linkRes, vendorListRes] = await Promise.all([
        supabase.rpc("affiliate_daily_stats", { _from: range_from, _to: range_to }),
        supabase.rpc("affiliate_vendor_stats", { _from: range_from, _to: range_to }),
        supabase
          .from("affiliate_link_performance")
          .select("*")
          .order("clicks", { ascending: false })
          .limit(200),
        supabase
          .from("affiliate_vendors")
          .select("id, name, slug")
          .eq("active", true)
          .order("name"),
      ]);
      if (dailyRes.error) throw dailyRes.error;
      if (vendorRes.error) throw vendorRes.error;
      if (linkRes.error) throw linkRes.error;
      if (vendorListRes.error) throw vendorListRes.error;

      setDaily(((dailyRes.data ?? []) as DailyStat[]).map((r) => ({
        ...r,
        clicks: Number(r.clicks),
        conversions: Number(r.conversions),
        revenue_inr: Number(r.revenue_inr),
        commission_inr: Number(r.commission_inr),
      })));
      setVendors((vendorRes.data ?? []) as VendorStat[]);
      setLinks((linkRes.data ?? []) as LinkPerf[]);
      setVendorList((vendorListRes.data ?? []) as Vendor[]);
    } catch (err) {
      toast({
        title: "Could not load affiliate stats",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, range_from, range_to, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totals = useMemo(() => {
    return daily.reduce(
      (acc, d) => ({
        clicks: acc.clicks + d.clicks,
        conversions: acc.conversions + d.conversions,
        revenue_inr: acc.revenue_inr + d.revenue_inr,
        commission_inr: acc.commission_inr + d.commission_inr,
      }),
      { clicks: 0, conversions: 0, revenue_inr: 0, commission_inr: 0 },
    );
  }, [daily]);

  const conversionRate =
    totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  const topLinks = useMemo(
    () =>
      [...links]
        .filter((l) => l.conversions > 0)
        .sort((a, b) => b.commission_inr - a.commission_inr)
        .slice(0, 10),
    [links],
  );
  const flaggedLinks = useMemo(
    () => links.filter((l) => l.is_high_traffic_no_revenue),
    [links],
  );
  const zeroPerformers = useMemo(
    () =>
      [...links]
        .filter((l) => l.conversions === 0)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 20),
    [links],
  );

  const submitManual = async () => {
    if (!user) return;
    const amount = Number(mAmount);
    const commission = mCommission ? Number(mCommission) : 0;
    if (!mVendorId) {
      toast({ title: "Select a vendor", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSubmittingManual(true);
    try {
      const { error } = await supabase.from("affiliate_conversions").insert({
        vendor_id: mVendorId,
        amount_inr: Math.round(amount),
        commission_inr: Math.round(commission),
        external_order_id: mExternalId.trim() || null,
        click_id: mClickId.trim() || null,
        recommendation_id: mRecId.trim() || null,
        status: mStatus,
        source: "manual",
        recorded_by: user.id,
        raw_payload: { entered_via: "admin_dashboard" },
      });
      if (error) throw error;
      toast({ title: "Conversion recorded" });
      setManualOpen(false);
      setMAmount("");
      setMCommission("");
      setMExternalId("");
      setMClickId("");
      setMRecId("");
      loadAll();
    } catch (err) {
      toast({
        title: "Could not record",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmittingManual(false);
    }
  };

  const exportCsv = () => {
    const rows = links.map((l) => ({
      recommendation_id: l.recommendation_id,
      merchant: l.merchant_name,
      item: l.item_name,
      vendor_id: l.vendor_id,
      clicks: l.clicks,
      conversions: l.conversions,
      revenue_inr: l.revenue_inr,
      commission_inr: l.commission_inr,
      flagged_no_revenue: l.is_high_traffic_no_revenue,
      affiliate_url: l.affiliate_url,
    }));
    downloadCsv(`affiliate-links-${range_from}-to-${range_to}.csv`, rows);
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingUp className="h-6 w-6" /> Affiliate revenue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clicks, conversions, and estimated commissions across vendors and links.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAll} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={links.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Record conversion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record manual conversion</DialogTitle>
                <DialogDescription>
                  Use this when a vendor confirms a sale outside their webhook (call, email, dashboard).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="m-vendor">Vendor</Label>
                  <Select value={mVendorId} onValueChange={setMVendorId}>
                    <SelectTrigger id="m-vendor">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorList.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-amount">Amount (₹)</Label>
                    <Input
                      id="m-amount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={mAmount}
                      onChange={(e) => setMAmount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-commission">Commission (₹)</Label>
                    <Input
                      id="m-commission"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={mCommission}
                      onChange={(e) => setMCommission(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="m-ext">External order ID</Label>
                  <Input
                    id="m-ext"
                    value={mExternalId}
                    onChange={(e) => setMExternalId(e.target.value)}
                    placeholder="ORD-12345"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-click">Click ID (optional)</Label>
                    <Input
                      id="m-click"
                      value={mClickId}
                      onChange={(e) => setMClickId(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="m-rec">Recommendation ID (optional)</Label>
                    <Input
                      id="m-rec"
                      value={mRecId}
                      onChange={(e) => setMRecId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="m-status">Status</Label>
                  <Select value={mStatus} onValueChange={(v) => setMStatus(v as typeof mStatus)}>
                    <SelectTrigger id="m-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setManualOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitManual} disabled={submittingManual}>
                  {submittingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save conversion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Clicks" value={totals.clicks.toLocaleString("en-IN")} />
        <Kpi
          label="Conversions"
          value={totals.conversions.toLocaleString("en-IN")}
          sub={`${conversionRate.toFixed(2)}% rate`}
        />
        <Kpi label="Revenue" value={inr(totals.revenue_inr)} />
        <Kpi label="Commission" value={inr(totals.commission_inr)} accent />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription>
            Daily clicks (left axis) vs commission ₹ (right axis) for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelFormatter={(v) => format(new Date(v as string), "PP")}
                  formatter={(value, name) => {
                    if (name === "Commission ₹") return inr(Number(value));
                    return Number(value).toLocaleString("en-IN");
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="commission_inr"
                  name="Commission ₹"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Flagged links */}
      {flaggedLinks.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {flaggedLinks.length} link{flaggedLinks.length === 1 ? "" : "s"} flagged
            </CardTitle>
            <CardDescription className="text-destructive/90">
              High traffic, no revenue — check merchant tracking or replace this link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FlaggedTable rows={flaggedLinks} />
          </CardContent>
        </Card>
      )}

      {/* Vendor performance */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor performance</CardTitle>
          <CardDescription>Aggregated across all links in the selected range.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Conv. rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No vendor activity in this range.
                    </TableCell>
                  </TableRow>
                )}
                {vendors.map((v) => {
                  const rate = v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0;
                  return (
                    <TableRow key={v.vendor_id}>
                      <TableCell className="font-medium">{v.vendor_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.clicks.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.conversions.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(v.revenue_inr)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(v.commission_inr)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rate.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top + zero performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top earners</CardTitle>
            <CardDescription>Top 10 links by commission.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompactLinkTable rows={topLinks} showRevenue />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Zero conversions</CardTitle>
            <CardDescription>Links with clicks but no recorded conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompactLinkTable rows={zeroPerformers} highlightFlag />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-border p-4 " +
        (accent ? "bg-accent/10" : "bg-card")
      }
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function FlaggedTable({ rows }: { rows: LinkPerf[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Merchant / item</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead>Affiliate URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.recommendation_id} className="bg-destructive/10">
              <TableCell>
                <div className="font-medium">{r.merchant_name}</div>
                <div className="text-xs text-muted-foreground">{r.item_name}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium text-destructive">
                {r.clicks}
              </TableCell>
              <TableCell className="max-w-[320px] truncate">
                <a
                  href={r.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  {r.affiliate_url}
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CompactLinkTable({
  rows,
  showRevenue,
  highlightFlag,
}: {
  rows: LinkPerf[];
  showRevenue?: boolean;
  highlightFlag?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Link</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Conv.</TableHead>
            {showRevenue ? (
              <TableHead className="text-right">Commission</TableHead>
            ) : (
              <TableHead />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.recommendation_id}
              className={highlightFlag && r.is_high_traffic_no_revenue ? "bg-destructive/10" : ""}
            >
              <TableCell>
                <div className="font-medium">{r.merchant_name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{r.item_name}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.clicks}</TableCell>
              <TableCell className="text-right tabular-nums">{r.conversions}</TableCell>
              {showRevenue ? (
                <TableCell className="text-right tabular-nums">{inr(r.commission_inr)}</TableCell>
              ) : (
                <TableCell className="text-right">
                  {highlightFlag && r.is_high_traffic_no_revenue && (
                    <Badge variant="destructive" className="whitespace-nowrap">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Flagged
                    </Badge>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default AdminAffiliates;