import { useEffect, useState } from "react";
import { Bell, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { updateSiteSettings } from "@/lib/siteSettings";

export function SiteSettingsCard() {
  const { user } = useAuth();
  const { settings, refresh } = useSiteMeta();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [title, setTitle] = useState(settings.site_title);
  const [description, setDescription] = useState(settings.site_description);
  const [saving, setSaving] = useState(false);

  // Visitor alerts state
  const [alertsEnabled, setAlertsEnabled] = useState(settings.visitor_alerts_enabled);
  const [inAppEnabled, setInAppEnabled] = useState(settings.visitor_alerts_in_app);
  const [emailEnabled, setEmailEnabled] = useState(settings.visitor_alerts_email_enabled);
  const [alertEmail, setAlertEmail] = useState(settings.visitor_alert_email ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(settings.visitor_alerts_webhook_enabled);
  const [webhookUrl, setWebhookUrl] = useState(settings.visitor_alert_webhook_url ?? "");
  const [savingAlerts, setSavingAlerts] = useState(false);

  useEffect(() => {
    setTitle(settings.site_title);
    setDescription(settings.site_description);
    setAlertsEnabled(settings.visitor_alerts_enabled);
    setInAppEnabled(settings.visitor_alerts_in_app);
    setEmailEnabled(settings.visitor_alerts_email_enabled);
    setAlertEmail(settings.visitor_alert_email ?? "");
    setWebhookEnabled(settings.visitor_alerts_webhook_enabled);
    setWebhookUrl(settings.visitor_alert_webhook_url ?? "");
  }, [settings]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (isAdmin === null) return null;
  if (!isAdmin) return null;

  const onSave = async () => {
    const t = title.trim();
    const d = description.trim();
    if (t.length < 3) {
      toast({ title: "Title too short", variant: "destructive" });
      return;
    }
    if (d.length < 10) {
      toast({ title: "Description too short", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateSiteSettings({ site_title: t, site_description: d }, user?.id);
      await refresh();
      toast({ title: "Site settings saved" });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSaveAlerts = async () => {
    const email = alertEmail.trim();
    const hook = webhookUrl.trim();
    if (emailEnabled && !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid alert email", variant: "destructive" });
      return;
    }
    if (webhookEnabled) {
      try {
        const u = new URL(hook);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
      } catch {
        toast({ title: "Enter a valid webhook URL", variant: "destructive" });
        return;
      }
    }
    setSavingAlerts(true);
    try {
      await updateSiteSettings(
        {
          visitor_alerts_enabled: alertsEnabled,
          visitor_alerts_in_app: inAppEnabled,
          visitor_alerts_email_enabled: emailEnabled,
          visitor_alert_email: email || null,
          visitor_alerts_webhook_enabled: webhookEnabled,
          visitor_alert_webhook_url: hook || null,
        },
        user?.id,
      );
      await refresh();
      toast({ title: "Visitor alerts saved" });
    } catch (e) {
      toast({
        title: "Could not save alerts",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingAlerts(false);
    }
  };

  return (
    <>
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold">Site title & description</h2>
        <p className="text-sm text-muted-foreground">
          Used for the browser tab, search results, and social previews. Updates everywhere instantly.
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="site-title">Site title</Label>
          <Input
            id="site-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{title.length}/120 · keep under ~60 for SEO</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-description">Site description</Label>
          <Textarea
            id="site-description"
            value={description}
            maxLength={300}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {description.length}/300 · keep under ~160 for SEO
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </section>

    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Visitor alerts</h2>
          <p className="text-sm text-muted-foreground">
            Get notified when a new visitor session starts. Choose any combination of channels.
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
          <div>
            <Label className="text-sm font-medium">Enable visitor alerts</Label>
            <p className="text-xs text-muted-foreground">Master switch for all channels below.</p>
          </div>
          <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
        </div>

        <div className={alertsEnabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">In-app notification</Label>
              <p className="text-xs text-muted-foreground">Show in admin notification bell.</p>
            </div>
            <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email alerts</Label>
                <p className="text-xs text-muted-foreground">Send to a single recipient.</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            <Input
              type="email"
              placeholder="alerts@yourdomain.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              disabled={!emailEnabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Webhook</Label>
                <p className="text-xs text-muted-foreground">POST JSON to a URL (Slack, Discord, Zapier…).</p>
              </div>
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
            </div>
            <Input
              type="url"
              placeholder="https://hooks.example.com/visitor"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={!webhookEnabled}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSaveAlerts} disabled={savingAlerts}>
            {savingAlerts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save alerts
          </Button>
        </div>
      </div>
    </section>
    </>
  );
}
