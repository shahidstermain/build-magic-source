import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Save, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminGuard } from "@/components/AdminGuard";
import { slugify, type PostCategory, type PostStatus } from "@/lib/posts";

// Markdown editor is heavy — lazy-load
const MdEditor = lazy(() => import("@uiw/react-md-editor"));
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: PostCategory;
  tags: string;
  status: PostStatus;
  published_at: string;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category: "blog",
  tags: "",
  status: "draft",
  published_at: "",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function AdminBlogEditorInner() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugDirty, setSlugDirty] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supabase
      .from("posts")
      .select("*")
      .eq("id", id!)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          toast({ title: "Couldn't load post", description: error?.message ?? "Not found", variant: "destructive" });
          return;
        }
        setForm({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? "",
          content: data.content ?? "",
          cover_image_url: data.cover_image_url ?? "",
          category: data.category as PostCategory,
          tags: (data.tags ?? []).join(", "),
          status: data.status as PostStatus,
          published_at: toLocalInput(data.published_at),
        });
        setSlugDirty(true);
      });
  }, [id, isEdit, toast]);

  const previewSlug = useMemo(
    () => (slugDirty && form.slug ? slugify(form.slug) : slugify(form.title)),
    [form.title, form.slug, slugDirty],
  );

  const onTitle = (v: string) => {
    setForm((f) => ({ ...f, title: v, slug: slugDirty ? f.slug : "" }));
  };

  const onUploadCover = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("post-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    setUploading(false);
  };

  const onSubmit = async (override?: Partial<FormState>) => {
    if (!user) return;
    const merged = { ...form, ...override };
    if (!merged.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: merged.title.trim(),
      slug: merged.slug ? slugify(merged.slug) : "",
      excerpt: merged.excerpt.trim() || null,
      content: merged.content,
      cover_image_url: merged.cover_image_url || null,
      category: merged.category,
      tags: merged.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      status: merged.status,
      author_id: user.id,
      published_at: merged.published_at
        ? new Date(merged.published_at).toISOString()
        : null,
    };

    const result = isEdit
      ? await supabase.from("posts").update(payload).eq("id", id!).select().single()
      : await supabase.from("posts").insert(payload).select().single();

    setSaving(false);
    if (result.error) {
      toast({ title: "Save failed", description: result.error.message, variant: "destructive" });
      return;
    }
    toast({
      title: merged.status === "published" ? "Post published" : "Draft saved",
    });
    if (!isEdit) navigate(`/admin/blog/edit/${result.data.id}`, { replace: true });
    else {
      // refresh slug field if server changed it
      setForm((f) => ({ ...f, slug: result.data.slug }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const excerptCount = form.excerpt.length;

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> All posts
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onSubmit({ status: "draft" })}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save draft
          </Button>
          <Button
            disabled={saving}
            onClick={() => onSubmit({ status: "published" })}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {form.status === "published" ? "Update" : "Publish now"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="e.g. The hidden beach behind Radhanagar"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              URL preview: <code className="rounded bg-muted px-1">/blog/{previewSlug || "auto"}</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Custom slug (optional)</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setSlugDirty(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              placeholder="auto-generated from title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="excerpt">
              Excerpt
              <span
                className={`ml-2 text-xs ${
                  excerptCount > 160 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {excerptCount}/160
              </span>
            </Label>
            <Textarea
              id="excerpt"
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="Short summary used for SEO meta description and post cards"
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Body (markdown)</Label>
            <div data-color-mode="light" className="overflow-hidden rounded-xl border border-border">
              <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted" />}>
                <MdEditor
                  value={form.content}
                  onChange={(v) => setForm((f) => ({ ...f, content: v ?? "" }))}
                  height={500}
                  preview="live"
                />
              </Suspense>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: v as PostCategory }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="havelock, scuba, ferry"
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="space-y-1.5">
            <Label>Cover image</Label>
            {form.cover_image_url ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={form.cover_image_url}
                  alt="cover"
                  className="aspect-[16/10] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload image
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadCover(f);
                  }}
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="published_at">Publish date</Label>
            <Input
              id="published_at"
              type="datetime-local"
              value={form.published_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, published_at: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the moment you click Publish.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as PostStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AdminBlogEditor() {
  return (
    <AdminGuard>
      <AdminBlogEditorInner />
    </AdminGuard>
  );
}