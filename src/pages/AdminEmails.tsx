import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, RefreshCw, Send, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageSeo } from "@/hooks/usePageSeo";
import { Label } from "@/components/ui/label";
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

type EmailLog = {
  id: string;
  recipient: string;
  template: string;
  subject: string | null;
  status: string;
  provider: string;
  provider_message_id: string | null;
  attempt: number;
  error: string | null;
  created_at: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  delivered: "default",
  opened: "secondary",
  clicked: "secondary",
  delayed: "outline",
  suppressed: "outline",
  failed: "destructive",
  bounced: "destructive",
  complained: "destructive",
  unsubscribed: "outline",
};

const AdminEmails = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  usePageSeo({ title: "Admin — Email Logs", description: "Admin email log management.", noIndex: true });
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [checkingWebhook, setCheckingWebhook] = useState(false);
  const [webhookCheck, setWebhookCheck] = useState<
    | { ok: true; status: number; checkedAt: string }
    | { ok: false; status: number | null; message: string; checkedAt: string }
    | null
  >(null);
  const [lastWebhookAt, setLastWebhookAt] = useState<string | null>(null);
  const [lastWebhookEvent, setLastWebhookEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    setEmail((prev) => prev || user.email || "");
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(!!data);
      });
  }, [user]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("email_logs")
      .select("id, recipient, template, subject, status, provider, provider_message_id, attempt, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingLogs(false);
    if (error) {
      toast({ title: "Couldn't load email logs", description: error.message, variant: "destructive" });
      return;
    }
    setLogs((data ?? []) as EmailLog[]);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadLogs();
  }, [isAdmin, loadLogs]);

  const loadLastWebhook = useCallback(async () => {
    // Webhook handler is the only writer that sets metadata.event.
    const { data, error } = await supabase
      .from("email_logs")
      .select("created_at, metadata")
      .not("metadata->>event", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      setLastWebhookAt(data.created_at);
      const meta = data.metadata as { event?: string } | null;
      setLastWebhookEvent(meta?.event ?? null);
    } else {
      setLastWebhookAt(null);
      setLastWebhookEvent(null);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadLastWebhook();
  }, [isAdmin, loadLastWebhook]);

  const checkWebhook = async () => {
    setCheckingWebhook(true);
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!projectId && !supabaseUrl) {
      toast({ title: "Configuration missing", description: "Neither VITE_SUPABASE_PROJECT_ID nor VITE_SUPABASE_URL is set.", variant: "destructive" });
      setCheckingWebhook(false);
      return;
    }
    const url = projectId
      ? `https://${projectId}.functions.supabase.co/resend-webhook`
      : `${supabaseUrl}/functions/v1/resend-webhook`;
    const checkedAt = new Date().toISOString();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probe: true }),
      });
      // 401 = endpoint is up and signature verification is enforced (expected without a real Svix signature).
      // 200 = endpoint accepted (only happens if signature verification is misconfigured).
      if (res.status === 401 || res.status === 200) {
        setWebhookCheck({ ok: true, status: res.status, checkedAt });
        toast({
          title: "Webhook reachable",
          description:
            res.status === 401
              ? "Endpoint responded 401 (signature verification active) — healthy."
              : "Endpoint responded 200 — reachable, but signature check may be off.",
        });
      } else {
        const text = await res.text().catch(() => "");
        setWebhookCheck({ ok: false, status: res.status, message: text || `HTTP ${res.status}`, checkedAt });
        toast({
          title: "Webhook check failed",
          description: `HTTP ${res.status}`,
          variant: "destructive",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setWebhookCheck({ ok: false, status: null, message, checkedAt });
      toast({ title: "Webhook unreachable", description: message, variant: "destructive" });
    } finally {
      setCheckingWebhook(false);
      loadLastWebhook();
    }
  };

  const sendSample = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Enter an email address", variant: "destructive" });
      return;
    }
    setSending(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Sample auth email triggered",
      description: `Password recovery email sent to ${trimmed}. Refreshing logs in 2s…`,
    });
    setTimeout(loadLogs, 2000);
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
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Cloud Emails
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send a sample auth email and verify the resulting rows logged from Resend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send sample auth email</CardTitle>
          <CardDescription>
            Triggers a password recovery email through Supabase Auth → send-auth-email → Resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sample-email">Recipient</Label>
            <Input
              id="sample-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={sending}
            />
          </div>
          <Button onClick={sendSample} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send sample email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Resend webhook
          </CardTitle>
          <CardDescription>
            Pings the resend-webhook endpoint and shows when Supabase last received a real event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Last received event</div>
              <div className="mt-1 text-sm font-medium">
                {lastWebhookAt ? new Date(lastWebhookAt).toLocaleString() : "No webhook events yet"}
              </div>
              {lastWebhookEvent && (
                <Badge variant="secondary" className="mt-2">
                  {lastWebhookEvent}
                </Badge>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Connectivity check</div>
              {webhookCheck ? (
                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                  {webhookCheck.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {webhookCheck.ok
                    ? `Reachable (HTTP ${webhookCheck.status})`
                    : `Failed${webhookCheck.status ? ` (HTTP ${webhookCheck.status})` : ""}`}
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">Not checked yet</div>
              )}
              {webhookCheck && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(webhookCheck.checkedAt).toLocaleString()}
                </div>
              )}
              {webhookCheck && webhookCheck.ok === false && (
                <div className="mt-1 text-xs text-destructive truncate">{webhookCheck.message}</div>
              )}
            </div>
          </div>
          <Button onClick={checkWebhook} disabled={checkingWebhook} variant="outline">
            {checkingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Check webhook
          </Button>
          <p className="text-xs text-muted-foreground">
            A healthy endpoint returns <code>401 invalid signature</code> for this unsigned probe — that means
            the function is up and signature verification is active.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent email_logs</CardTitle>
            <CardDescription>Latest 50 rows. Webhook events append additional rows per message_id.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
            {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Provider message ID / Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loadingLogs && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No email logs yet.
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{log.recipient}</TableCell>
                    <TableCell className="text-sm">{log.template}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[log.status] ?? "outline"}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.attempt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {log.error ?? log.provider_message_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmails;