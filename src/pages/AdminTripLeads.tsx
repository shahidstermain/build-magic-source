import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type Lead = {
  id: string;
  name: string;
  whatsapp: string;
  travel_from: string;
  travel_to: string;
  travelers: number;
  budget_range: string;
  query: string | null;
  preferred_call_time: string | null;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = ["new", "called", "converted", "not_interested"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  called: "Called",
  converted: "Converted",
  not_interested: "Not interested",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  called: "secondary",
  converted: "outline",
  not_interested: "destructive",
};

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminTripLeads() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Primary: use the SECURITY DEFINER RPC.
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!cancelled && !error) {
        setIsAdmin(Boolean(data));
        return;
      }
      // Fallback: query user_roles directly (RLS allows users to read their own).
      const { data: rows, error: rowsError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (cancelled) return;
      if (rowsError) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin((rows ?? []).length > 0);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trip_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadLeads();
  }, [isAdmin, loadLeads]);

  async function updateStatus(id: string, status: string) {
    const prev = leads;
    setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase.from("trip_leads").update({ status }).eq("id", id);
    if (error) {
      setLeads(prev);
      toast({ title: "Couldn't update status", description: error.message, variant: "destructive" });
    }
  }

  const filtered = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter],
  );

  function exportCsv() {
    const headers = [
      "Name", "WhatsApp", "Travel from", "Travel to", "Travelers",
      "Budget", "Query", "Call time", "Status", "Submitted at",
    ];
    const rows = filtered.map((l) => [
      l.name, l.whatsapp, l.travel_from, l.travel_to, l.travelers,
      l.budget_range, l.query ?? "", l.preferred_call_time ?? "",
      STATUS_LABEL[l.status] ?? l.status, l.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Trip planning leads</CardTitle>
            <CardDescription>
              Callback requests from the AI Trip Planner. Newest first.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadLeads} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "No leads yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Travelers</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Call time</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{l.whatsapp}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {l.travel_from} → {l.travel_to}
                      </TableCell>
                      <TableCell>{l.travelers}</TableCell>
                      <TableCell className="text-xs">{l.budget_range}</TableCell>
                      <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                        {l.query || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {l.preferred_call_time || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                            {STATUS_LABEL[l.status] ?? l.status}
                          </Badge>
                          <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}