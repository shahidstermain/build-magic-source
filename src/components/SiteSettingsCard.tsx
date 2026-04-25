import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    setTitle(settings.site_title);
    setDescription(settings.site_description);
  }, [settings.site_title, settings.site_description]);

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

  return (
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
  );
}
