import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const SITE = process.env.SITE_URL || "https://andamanbazaar.in";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DIST = resolve(process.cwd(), "dist");

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectMeta(template: string, opts: {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
}): string {
  const { title, description, url, image, type = "website", jsonLd } = opts;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : "",
    jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
      : "",
  ].filter(Boolean).join("\n    ");

  // Strip existing title/meta description/og/twitter tags from the template head
  let head = template;
  head = head.replace(/<title>[\s\S]*?<\/title>/i, "");
  head = head.replace(/<meta\s+name="description"[^>]*>/gi, "");
  head = head.replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, "");
  head = head.replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, "");
  head = head.replace(/<link\s+rel="canonical"[^>]*>/gi, "");

  return head.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

function writeHtml(routePath: string, html: string) {
  const dir = join(DIST, routePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html, "utf8");
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.warn("[prerender] dist/index.html not found — skipping");
    return;
  }
  const template = readFileSync(join(DIST, "index.html"), "utf8");

  // Blog index
  writeHtml(
    "blog",
    injectMeta(template, {
      title: "Andaman Blog, Stories & News | AndamanBazaar",
      description:
        "Travel guides, local stories, and the latest news from the Andaman Islands — Havelock, Neil, Port Blair and beyond.",
      url: `${SITE}/blog`,
      type: "website",
    }),
  );

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender] missing supabase env — only /blog index prerendered");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from("posts")
    .select("slug, title, excerpt, content, cover_image_url, category, tags, published_at, updated_at")
    .eq("status", "published")
    .limit(5000);

  if (error) {
    console.warn("[prerender] supabase error:", error.message);
    return;
  }

  let count = 0;
  for (const p of data ?? []) {
    const url = `${SITE}/blog/${p.slug}`;
    const desc = (p.excerpt ?? p.content ?? "").slice(0, 160).replace(/\s+/g, " ").trim();
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: desc,
      image: p.cover_image_url ? [p.cover_image_url] : undefined,
      datePublished: p.published_at,
      dateModified: p.updated_at,
      keywords: (p.tags ?? []).join(", "),
      mainEntityOfPage: url,
      publisher: { "@type": "Organization", name: "AndamanBazaar" },
    };
    const html = injectMeta(template, {
      title: `${p.title} | Andaman AndamanBazaar`,
      description: desc,
      url,
      image: p.cover_image_url,
      type: "article",
      jsonLd,
    });
    writeHtml(`blog/${p.slug}`, html);
    count++;
  }
  console.log(`[prerender] wrote ${count} blog post HTML snapshots into dist/blog/<slug>/index.html`);
}

main().catch((e) => {
  console.error("[prerender] failed:", e);
  process.exit(0);
});