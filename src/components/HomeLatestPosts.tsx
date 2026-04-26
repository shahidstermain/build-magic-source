import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Newspaper } from "lucide-react";
import { fetchPublishedPosts, CATEGORY_LABEL, type Post } from "@/lib/posts";

type Card = Pick<Post, "id" | "title" | "slug" | "excerpt" | "cover_image_url" | "category" | "published_at">;

export function HomeLatestPosts() {
  const [items, setItems] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPosts({ limit: 3 }).then(({ data }) => {
      if (cancelled) return;
      setItems((data ?? []) as Card[]);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  if (loaded && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          <Newspaper className="h-4 w-4 text-primary" /> Latest from Andaman
        </h2>
        <Link to="/blog" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {(loaded ? items : Array.from({ length: 3 })).map((p, i) => {
          if (!p) {
            return <li key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-muted" />;
          }
          const post = p as Card;
          return (
            <li key={post.id}>
              <Link
                to={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="aspect-[16/10] w-full bg-muted">
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {CATEGORY_LABEL[post.category]}
                  </span>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</p>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{post.excerpt}</p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-primary">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}