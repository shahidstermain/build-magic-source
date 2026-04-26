import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Note = {
  id: string;
  version: string | null;
  title: string;
  summary: string | null;
  highlights: string[];
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
};

type DraftState = {
  version: string;
  title: string;
  summary: string;
  highlightsText: string;
  is_published: boolean;
};

function toDraft(n: Note): DraftState {
  return {
    version: n.version ?? "",
    title: n.title,
    summary: n.summary ?? "",
    highlightsText: (n.highlights ?? []).join("\n"),
    is_published: n.is_published,
  };
}

function parseHighlights(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

export default function AdminReleaseNotes() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!cancelled && !error) {
        setIsAdmin(Boolean(data));
        return;
      }
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (!cancelled) setIsAdmin((rows ?? []).length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("release_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    const list = (data ?? []).map((n) => ({
      ...n,
      highlights: Array.isArray(n.highlights) ? (n.highlights as string[]) : [],
    })) as Note[];
    setNotes(list);
    setDrafts(Object.fromEntries(list.map((n) => [n.id, toDraft(n)])));
  }, [toast]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateDraft = (id: string, patch: Partial<DraftState>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const onCreate = async () => {
    setCreating(true);
    const { error } = await supabase.from("release_notes").insert({
      title: "Untitled release",
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Couldn't create", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  const onSave = async (id: string) => {
    const d = drafts[id];
    if (!d || !d.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const previously = notes.find((n) => n.id === id);
    const wasPublished = previously?.is_published ?? false;
    const wasPublishedAt = previously?.published_at ?? null;

    setSavingId(id);
    const { error } = await supabase
      .from("release_notes")
      .update({
        version: d.version.trim() || null,
        title: d.title.trim(),
        summary: d.summary.trim() || null,
        highlights: parseHighlights(d.highlightsText),
        is_published: d.is_published,
        // Stamp publish time the first time it goes public.
        published_at: d.is_published
          ? wasPublished && wasPublishedAt
            ? wasPublishedAt
            : new Date().toISOString()
          : null,
      })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    await load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this release note?")) return;
    const { error } = await supabase.from("release_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Release notes</CardTitle>
            <CardDescription>
              Publish entries for the public <code>/whats-new</code> page.
            </CardDescription>
          </div>
          <Button onClick={onCreate} disabled={creating} size="sm">
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New entry
          </Button>
        </CardHeader>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No release notes yet. Create your first entry above.
          </CardContent>
        </Card>
      ) : (
        notes.map((n) => {
          const d = drafts[n.id];
          if (!d) return null;
          return (
            <Card key={n.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={n.is_published ? "default" : "secondary"}>
                    {n.is_published ? "Published" : "Draft"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(n.updated_at).toLocaleString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(n.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`t-${n.id}`}>Title</Label>
                    <Input
                      id={`t-${n.id}`}
                      value={d.title}
                      maxLength={120}
                      onChange={(e) => updateDraft(n.id, { title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`v-${n.id}`}>Version (optional)</Label>
                    <Input
                      id={`v-${n.id}`}
                      value={d.version}
                      placeholder="e.g. 1.4.0"
                      maxLength={20}
                      onChange={(e) => updateDraft(n.id, { version: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`s-${n.id}`}>Summary</Label>
                  <Textarea
                    id={`s-${n.id}`}
                    value={d.summary}
                    rows={2}
                    maxLength={500}
                    placeholder="A short paragraph users will see at the top."
                    onChange={(e) => updateDraft(n.id, { summary: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`h-${n.id}`}>Highlights (one per line)</Label>
                  <Textarea
                    id={`h-${n.id}`}
                    value={d.highlightsText}
                    rows={5}
                    placeholder={"Faster trip planner\nNew admin dashboard for leads\nBug fixes"}
                    onChange={(e) => updateDraft(n.id, { highlightsText: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={d.is_published}
                      onCheckedChange={(v) => updateDraft(n.id, { is_published: v })}
                    />
                    Published
                  </label>
                  <Button onClick={() => onSave(n.id)} disabled={savingId === n.id} size="sm">
                    {savingId === n.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}