import { supabase } from "@/integrations/supabase/client";

export type PostCategory = "blog" | "story" | "news";
export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: PostCategory;
  tags: string[];
  status: PostStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  views: number;
};

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  blog: "Blog",
  story: "Story",
  news: "News",
};

export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function fetchPublishedPosts(opts: {
  category?: PostCategory;
  limit?: number;
  offset?: number;
}) {
  let q = supabase
    .from("posts")
    .select(
      "id, title, slug, excerpt, cover_image_url, category, tags, published_at, views",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.limit) q = q.range(opts.offset ?? 0, (opts.offset ?? 0) + opts.limit - 1);
  return await q;
}

export async function fetchPostBySlug(slug: string) {
  return await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
}

export async function fetchRelatedPosts(post: Pick<Post, "id" | "category" | "tags">) {
  let q = supabase
    .from("posts")
    .select("id, title, slug, excerpt, cover_image_url, category, published_at")
    .eq("status", "published")
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);
  if (post.tags.length > 0) {
    q = q.overlaps("tags", post.tags);
  } else {
    q = q.eq("category", post.category);
  }
  return await q;
}

export async function incrementPostViews(slug: string) {
  await supabase.rpc("increment_post_views", { _slug: slug });
}