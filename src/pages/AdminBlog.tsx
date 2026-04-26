import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/components/AdminGuard";
import { CATEGORY_LABEL, type Post } from "@/lib/posts";

type Row = Pick<
  Post,
  "id" | "title" | "slug" | "category" | "status" | "published_at" | "views" | "updated_at"
>;

function AdminBlogInner() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, slug, category, status, published_at, views, updated_at")
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't load posts", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (row: Row) => {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("posts").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Post deleted" });
    void load();
  };

  return (
    <div className="space-y-6 py-2">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog posts</h1>
          <p className="text-sm text-muted-foreground">
            Stories, news and blog articles for andamanbazaar.in
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/blog/new">
            <Plus className="mr-1 h-4 w-4" /> New post
          </Link>
        </Button>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No posts yet. Click <span className="font-medium">New post</span> to write your first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">/{r.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{CATEGORY_LABEL[r.category]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        r.status === "published"
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-warning-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.published_at
                      ? new Date(r.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.views}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "published" && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/blog/${r.slug}`} target="_blank" rel="noopener">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/admin/blog/edit/${r.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(r)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminBlog() {
  return (
    <AdminGuard>
      <AdminBlogInner />
    </AdminGuard>
  );
}