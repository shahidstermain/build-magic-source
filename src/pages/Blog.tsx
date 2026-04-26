import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import {
  fetchPublishedPosts,
  CATEGORY_LABEL,
  readingTime,
  type Post,
  type PostCategory,
} from "@/lib/posts";

const TABS: { id: "all" | PostCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "news", label: "News" },
  { id: "story", label: "Stories" },
  { id: "blog", label: "Blog" },
];

const PAGE_SIZE = 9;

type Card = Pick<
  Post,
  "id" | "title" | "slug" | "excerpt" | "cover_image_url" | "category" | "tags" | "published_at" | "views"
>;

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const cat = (params.get("cat") as "all" | PostCategory) || "all";
  const page = Math.max(1, Number(params.get("page") ?? 1));

  const [items, setItems] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublishedPosts({
      category: cat === "all" ? undefined : cat,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }).then(({ data, count }) => {
      if (cancelled) return;
      setItems((data ?? []) as Card[]);
      setTotal(count ?? 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cat, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const setTab = (id: "all" | PostCategory) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("cat");
    else next.set("cat", id);
    next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 py-2">
      <SeoHead
        title="Andaman Stories, News & Travel Blog | AndamanBazaar"
        description="Daily stories, ferry updates, scuba tips, and island news from the Andamans — written by locals at AndamanBazaar."
        type="website"
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Latest from the Andamans
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Stories, ferry updates, hidden beaches, and island news — published by AndamanBazaar.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-px">
        {TABS.map((t) => {
          const active = cat === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          <p className="text-sm">No posts here yet. Check back soon.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const parent = img.parentElement;
                        if (parent) {
                          parent.classList.add(
                            "bg-gradient-to-br",
                            "from-primary/20",
                            "to-primary/5",
                          );
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {CATEGORY_LABEL[p.category]}
                  </span>
                  <h2 className="line-clamp-2 text-base font-semibold leading-snug">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {p.excerpt}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                    {p.published_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.published_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {readingTime(p.excerpt ?? "")} min read
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("page", String(n));
                  setParams(next);
                }}
                className={`h-8 w-8 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {n}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}