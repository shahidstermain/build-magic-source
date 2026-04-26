import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const SITE = "https://andamanbazaar.in";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: posts } = await admin
    .from("posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);

  const staticUrls = ["/", "/listings", "/trip-planner", "/blog", "/contact", "/privacy", "/terms"];
  const today = new Date().toISOString().slice(0, 10);

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    staticUrls
      .map(
        (u) =>
          `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq></url>`,
      )
      .join("\n") +
    "\n" +
    (posts ?? [])
      .map((p) => {
        const lm = (p.updated_at ?? p.published_at ?? today).slice(0, 10);
        return `  <url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq></url>`;
      })
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
});