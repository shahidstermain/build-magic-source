import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, Clock, ChevronLeft, Loader2 } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { AuthorByline, AUTHOR_SHAHID } from "@/components/AuthorByline";
import {
  fetchPostBySlug,
  fetchRelatedPosts,
  incrementPostViews,
  CATEGORY_LABEL,
  readingTime,
  type Post,
} from "@/lib/posts";

type Related = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "cover_image_url" | "category" | "published_at"
>;

export default function BlogPost() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setPost(null);
    setRelated([]);
    fetchPostBySlug(slug).then(async ({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data as Post);
      setLoading(false);
      void incrementPostViews(slug);
      const { data: rel } = await fetchRelatedPosts(data as Post);
      if (!cancelled) setRelated((rel ?? []) as Related[]);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
        <p className="text-sm text-muted-foreground">
          This story may have been moved or unpublished.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to all posts
        </Link>
      </div>
    );
  }

  const url = typeof window !== "undefined" ? window.location.href : undefined;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? "",
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    keywords: post.tags.join(", "),
    mainEntityOfPage: url,
    publisher: {
      "@type": "Organization",
      name: "AndamanBazaar",
    },
  };

  return (
    <article className="mx-auto max-w-3xl space-y-6 py-2">
      <SeoHead
        title={`${post.title} | Andaman AndamanBazaar`}
        description={post.excerpt ?? post.content.slice(0, 160)}
        image={post.cover_image_url}
        type="article"
        jsonLd={jsonLd}
      />

      <Link
        to="/blog"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3 w-3" /> All posts
      </Link>

      <header className="space-y-3">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {CATEGORY_LABEL[post.category]}
        </span>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-base text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {post.published_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime(post.content)} min read
          </span>
        </div>
        <AuthorByline author={AUTHOR_SHAHID} variant="compact" />
        {post.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <li
                key={t}
                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                #{t}
              </li>
            ))}
          </ul>
        )}
      </header>

      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="aspect-[16/9] w-full rounded-2xl object-cover shadow-[var(--shadow-card)]"
          loading="eager"
        />
      )}

      <div className="prose prose-sm max-w-none sm:prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      <AuthorByline author={AUTHOR_SHAHID} variant="card" />

      {related.length > 0 && (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold tracking-tight">Related reads</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/blog/${r.slug}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="aspect-[16/10] w-full bg-muted">
                    {r.cover_image_url && (
                      <img
                        src={r.cover_image_url}
                        alt={r.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {CATEGORY_LABEL[r.category]}
                    </span>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">
                      {r.title}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}