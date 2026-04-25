import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Mail, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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