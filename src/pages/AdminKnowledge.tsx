import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/**
 * Singleton row in `andaman_knowledge` (id = true).
 * Admin-only JSON editor for ferry timings, food spots, weather notes,
 * emergency numbers etc. — injected into the trip-generate system prompt.
 */
const STARTER_TEMPLATE = {
  ferry_routes: [
    { from: "Port Blair", to: "Havelock", operators: ["Makruzz", "Green Ocean", "Nautika"], duration_min: 90, fare_inr: [1000, 2500] },
  ],
  weather: { peak: "Oct–Apr", monsoon: "May–Sep" },
  food_spots: { "Port Blair": ["Aberdeen Bazaar", "New Lighthouse"] },
  emergency: { hospital_pb: "+91-XXX", coast_guard: "1554" },
};

export default function AdminKnowledge() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("andaman_knowledge")
      .select("data, updated_at")
      .eq("id", true)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't load knowledge", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setText(JSON.stringify(data.data ?? {}, null, 2));
      setUpdatedAt(data.updated_at);
    } else {
      setText(JSON.stringify(STARTER_TEMPLATE, null, 2));
      setUpdatedAt(null);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const onTextChange = (val: string) => {
    setText(val);
    if (!val.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(val);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const onSave = async () => {
    if (parseError) {
      toast({ title: "Fix JSON before saving", description: parseError, variant: "destructive" });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      toast({
        title: "Invalid JSON",
        description: err instanceof Error ? err.message : "Parse failed",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("andaman_knowledge")
      .upsert({ id: true, data: parsed as any, updated_by: user!.id }, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Knowledge updated", description: "Future trip generations will use this data." });
    load();
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth?next=/admin/knowledge" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Andaman knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          Hyper-local data injected into the AI Trip Planner system prompt. Edit ferry timings,
          food spots, weather rules and emergency contacts here — no redeploy needed.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Knowledge JSON</CardTitle>
              <CardDescription>
                Free-form JSON. The trip generator reads <code>ferry_routes</code>, <code>weather</code>,{" "}
                <code>food_spots</code> and <code>emergency</code> by convention.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={24}
            className="font-mono text-xs"
            spellCheck={false}
          />
          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-mono text-xs">{parseError}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : "Not yet saved"}
            </p>
            <Button onClick={onSave} disabled={saving || !!parseError}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save knowledge
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}