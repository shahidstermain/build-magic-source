import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, Loader2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Vendor = { id: string; name: string };
type LinkRow = {
  recommendation_id: string;
  item_name: string;
  item_type: string;
  merchant_name: string;
  vendor_id: string | null;
  affiliate_url: string;
  link_created_at: string;
  clicks: number;
  conversions: number;
  verified_conversions: number;
  pending_conversions: number;
  verified_revenue_inr: number;
  pending_revenue_inr: number;
  verified_commission_inr: number;
  conversion_rate: number;
  zero_revenue_30d: boolean;
};

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function performanceColor(row: LinkRow): "green" | "yellow" | "red" | "neutral" {
  if (row.verified_revenue_inr > 0) return "green";
  if (row.zero_revenue_30d) return "red";
  if (row.clicks > 0 && row.verified_conversions === 0) return "yellow";
  return "neutral";
}

const colorClasses: Record<string, string> = {
  green: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/30",
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
  neutral: "bg-muted text-muted-foreground border-border",
};

export default function AdminAffiliateRevenue() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vendorId, setVendorId] = useState<string>("all");
  const [itemType, setItemType] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("affiliate_vendors")
      .select("id,name")
      .order("name")
      .then(({ data }) => setVendors(data ?? []));
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("affiliate_link_revenue_stats", {
      _from: new Date(from).toISOString(),
      _to: new Date(to).toISOString(),
      _vendor_id: vendorId === "all" ? null : vendorId,
      _item_type: itemType === "all" ? null : itemType,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as LinkRow[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const itemTypes = useMemo(() => {
    const s = new Set(rows.map((r) => r.item_type).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.clicks += r.clicks;
        acc.conv += r.conversions;
        acc.verifiedConv += r.verified_conversions;
        acc.verifiedRev += r.verified_revenue_inr;
        acc.pendingRev += r.pending_revenue_inr;
        acc.commission += r.verified_commission_inr;
        if (r.zero_revenue_30d) acc.flagged += 1;
        return acc;
      },
      { clicks: 0, conv: 0, verifiedConv: 0, verifiedRev: 0, pendingRev: 0, commission: 0, flagged: 0 },
    );
  }, [rows]);

  const overallCR = totals.clicks > 0 ? (totals.verifiedConv / totals.clicks) * 100 : 0;

  const exportCSV = () => {
    const header = [
      "item_name", "item_type", "merchant", "clicks", "conversions",
      "verified_conversions", "pending_conversions", "conversion_rate_%",
      "verified_revenue_inr", "pending_revenue_inr", "commission_inr",
      "zero_revenue_30d", "affiliate_url",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          JSON.stringify(r.item_name ?? ""),
          r.item_type,
          JSON.stringify(r.merchant_name ?? ""),
          r.clicks,
          r.conversions,
          r.verified_conversions,
          r.pending_conversions,
          (r.conversion_rate * 100).toFixed(2),
          r.verified_revenue_inr,
          r.pending_revenue_inr,
          r.verified_commission_inr,
          r.zero_revenue_30d,
          JSON.stringify(r.affiliate_url ?? ""),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affiliate-revenue-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Revenue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Per-link analytics with verified vs pending revenue split
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Merchant</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All merchants</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Item type</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {itemTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={load} disabled={loading}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total clicks</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{totals.clicks.toLocaleString("en-IN")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Conversion rate</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{overallCR.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground">{totals.verifiedConv} verified / {totals.clicks} clicks</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardHeader className="pb-2"><CardDescription>Verified revenue</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-700 dark:text-green-400">{inr(totals.verifiedRev)}</div>
            <div className="text-xs text-muted-foreground">Commission earned: {inr(totals.commission)}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-2"><CardDescription>Pending revenue</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-300">{inr(totals.pendingRev)}</div>
            <div className="text-xs text-muted-foreground">Awaiting confirmation</div>
          </CardContent>
        </Card>
      </div>

      {totals.flagged > 0 && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <div className="font-medium">{totals.flagged} link{totals.flagged === 1 ? "" : "s"} flagged</div>
              <div className="text-sm text-muted-foreground">
                Clicks recorded but zero verified revenue in the past 30 days. Check merchant tracking or replace these links.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-link performance</CardTitle>
          <CardDescription>
            Sorted by verified revenue. Color-coded: <span className="text-green-700 dark:text-green-400">green = earning</span>,{" "}
            <span className="text-yellow-700 dark:text-yellow-300">yellow = clicks but no conversions</span>,{" "}
            <span className="text-red-700 dark:text-red-400">red = zero revenue 30d</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">
              No affiliate links match the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">CR</TableHead>
                  <TableHead className="text-right">Verified ₹</TableHead>
                  <TableHead className="text-right">Pending ₹</TableHead>
                  <TableHead className="text-right">Commission ₹</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const color = performanceColor(r);
                  return (
                    <TableRow key={r.recommendation_id} className={color === "red" ? "bg-red-500/5" : undefined}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-1">
                          {r.item_name}
                          <a href={r.affiliate_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="text-xs text-muted-foreground">{r.item_type}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.merchant_name}</TableCell>
                      <TableCell className="text-right">{r.clicks}</TableCell>
                      <TableCell className="text-right">
                        {r.verified_conversions}
                        {r.pending_conversions > 0 && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400"> +{r.pending_conversions}p</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{(r.conversion_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium text-green-700 dark:text-green-400">
                        {r.verified_revenue_inr > 0 ? inr(r.verified_revenue_inr) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-yellow-700 dark:text-yellow-300">
                        {r.pending_revenue_inr > 0 ? inr(r.pending_revenue_inr) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.verified_commission_inr > 0 ? inr(r.verified_commission_inr) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={colorClasses[color]}>
                          {color === "green" && "Earning"}
                          {color === "yellow" && "Low"}
                          {color === "red" && "Zero 30d"}
                          {color === "neutral" && "No traffic"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
