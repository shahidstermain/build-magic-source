import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SITE = process.env.SITE_URL || "https://andamanbazaar.in";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STATIC_URLS = [
  "/",
  "/listings",
  "/trip-planner",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
];

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  let posts: Array<{ slug: string; updated_at: string | null; published_at: string | null }> = [];

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await supabase
        .from("posts")
        .select("slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5000);
      if (error) {
        console.warn("[sitemap] supabase error:", error.message);
      } else {
        posts = data ?? [];
      }
    } catch (e) {
      console.warn("[sitemap] fetch failed:", e);
    }
  } else {
    console.warn("[sitemap] missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — generating static-only sitemap");
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    STATIC_URLS.map(
      (u) =>
        `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq></url>`,
    ).join("\n") +
    "\n" +
    posts
      .map((p) => {
        const lm = (p.updated_at ?? p.published_at ?? today).slice(0, 10);
        return `  <url><loc>${SITE}/blog/${escapeXml(p.slug)}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq></url>`;
      })
      .join("\n") +
    `\n</urlset>\n`;

  const outPath = resolve(process.cwd(), "public/sitemap.xml");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, xml, "utf8");
  console.log(`[sitemap] wrote ${posts.length} posts + ${STATIC_URLS.length} static urls → public/sitemap.xml`);
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exit(0); // never block the build
});