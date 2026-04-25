import { useEffect, useState } from "react";
import { ExternalLink, Github, Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { updateSiteSettings } from "@/lib/siteSettings";

function normalizeRepoUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      if (u.hostname !== "github.com") return null;
      return `https://github.com${u.pathname.replace(/\/+$/, "")}`;
    } catch {
      return null;
    }
  }
  // owner/repo shorthand
  if (/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(value)) {
    return `https://github.com/${value}`;
  }
  return null;
}

export function GitHubSyncCard() {
  const { user } = useAuth();
  const { settings, refresh } = useSiteMeta();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [repoInput, setRepoInput] = useState(settings.github_repo_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRepoInput(settings.github_repo_url ?? "");
  }, [settings.github_repo_url]);

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
    const trimmed = repoInput.trim();
    if (trimmed.length > 0) {
      const normalized = normalizeRepoUrl(trimmed);
      if (!normalized) {
        toast({
          title: "Invalid GitHub URL",
          description: "Use owner/repo or a full https://github.com/... URL.",
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      try {
        await updateSiteSettings({ github_repo_url: normalized }, user?.id);
        await refresh();
        toast({ title: "GitHub repo saved" });
      } catch (e) {
        toast({
          title: "Could not save",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }
    // empty -> clear
    setSaving(true);
    try {
      await updateSiteSettings({ github_repo_url: null }, user?.id);
      await refresh();
      toast({ title: "GitHub repo cleared" });
    } catch (e) {
      toast({
        title: "Could not clear",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const repoUrl = settings.github_repo_url;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
          <Github className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">GitHub &amp; sync</h2>
          <p className="text-sm text-muted-foreground">
            Lovable keeps this project and your GitHub repo in sync automatically — changes made
            here push to GitHub, and commits pushed to GitHub appear here.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="gh-repo">Repository URL</Label>
          <Input
            id="gh-repo"
            value={repoInput}
            placeholder="owner/repo or https://github.com/owner/repo"
            maxLength={200}
            onChange={(e) => setRepoInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional — shown to admins on this page only.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> How sync works
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Two-way sync: edits in Lovable push to GitHub; pushes to your default branch sync back.</li>
            <li>There is no &quot;ahead/behind&quot; indicator inside the running app — sync state lives in your Lovable project, not the deployed site.</li>
            <li>To verify, check the latest commit on GitHub or the connector status in <strong>Connectors → GitHub</strong>.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {repoUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open repo
              </a>
            </Button>
          )}
          <Button onClick={onSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}