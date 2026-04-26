// Andaman News & Stories Agent
// Daily cron: scrapes Andaman news sources, picks the freshest unused story,
// rewrites it with Lovable AI into an SEO-friendly post, generates a cover
// image, and publishes it to the `posts` table.
//
// Triggered by: pg_cron (daily) OR manual curl with x-cron-secret header.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ANDAMAN_KEYWORDS = [
  "andaman",
  "nicobar",
  "port blair",
  "havelock",
  "neil island",
  "swaraj dweep",
  "shaheed dweep",
  "great nicobar",
];

type RawStory = {
  source: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
};

type GeneratedPost = {
  seoTitle: string;
  metaDescription: string;
  headline: string;
  excerpt: string;
  bodyMarkdown: string;
  tags: string[];
};

// ---------- utils ----------

function includesAndamanKeyword(text: string): boolean {
  const hay = (text || "").toLowerCase();
  return ANDAMAN_KEYWORDS.some((k) => hay.includes(k));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function userAgent() {
  return "Mozilla/5.0 (compatible; AndamanBazaarBot/1.0; +https://andamanbazaar.in/)";
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": userAgent(), "accept-language": "en-IN,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch ${url} -> ${res.status}`);
  return await res.text();
}

// ---------- scrapers (regex-based, edge-runtime safe) ----------

function extractArticles(html: string, baseUrl: string, source: string): RawStory[] {
  // Find all <a href="..."> with text inside <h1|h2|h3> (typical WP themes)
  const stories: RawStory[] = [];
  const re =
    /<h[1-3][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    let href = m[1].trim();
    const title = stripHtml(m[2]).trim();
    if (!title || !href) continue;
    if (href.startsWith("/")) {
      try {
        href = new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
    if (seen.has(href)) continue;
    seen.add(href);
    stories.push({ source, title, url: href });
  }
  return stories.filter((s) => includesAndamanKeyword(`${s.title} ${s.summary ?? ""}`));
}

async function fetchSourceSafe(
  url: string,
  source: string,
): Promise<RawStory[]> {
  try {
    const html = await fetchHtml(url);
    return extractArticles(html, url, source).slice(0, 25);
  } catch (e) {
    console.warn(`[scrape] ${source} failed:`, (e as Error).message);
    return [];
  }
}

async function gatherStories(): Promise<RawStory[]> {
  const [a, b, c] = await Promise.all([
    fetchSourceSafe(
      "https://nicobartimes.com/category/local-news/andaman-and-nicobar-islands/",
      "nicobartimes",
    ),
    fetchSourceSafe("https://thewaveandaman.com", "waveandaman"),
    fetchSourceSafe("https://www.andaman.gov.in/news", "anadmin"),
  ]);
  return [...a, ...b, ...c];
}

// ---------- selection ----------

function dedupeByUrl(stories: RawStory[]): RawStory[] {
  const seen = new Set<string>();
  return stories.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

async function filterAlreadyUsed(
  supabase: ReturnType<typeof createClient>,
  stories: RawStory[],
): Promise<RawStory[]> {
  if (!stories.length) return stories;
  const hashes = await Promise.all(stories.map((s) => sha256Hex(s.url)));
  const { data, error } = await supabase
    .from("source_url_hashes")
    .select("url_hash")
    .in("url_hash", hashes);
  if (error) {
    console.warn("[selector] hash lookup error:", error.message);
    return stories;
  }
  const used = new Set((data ?? []).map((r: { url_hash: string }) => r.url_hash));
  return stories.filter((_, i) => !used.has(hashes[i]));
}

function pickTopStory(stories: RawStory[]): RawStory | null {
  if (!stories.length) return null;
  const score = (s: RawStory) => {
    const text = `${s.title} ${s.summary ?? ""}`.toLowerCase();
    let n = 0;
    if (s.source === "anadmin") n += 8;
    if (/festival|tourism|flight|ferry|cruise|policy|circular/.test(text)) n += 5;
    return n;
  };
  return [...stories].sort((a, b) => score(b) - score(a))[0];
}

// ---------- LLM (Lovable AI) ----------

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function callLovableJSON(messages: Array<{ role: string; content: string }>) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "publish_article",
            description: "Return the structured news article",
            parameters: {
              type: "object",
              properties: {
                seoTitle: { type: "string" },
                metaDescription: { type: "string" },
                headline: { type: "string" },
                excerpt: { type: "string" },
                bodyMarkdown: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: [
                "seoTitle",
                "metaDescription",
                "headline",
                "excerpt",
                "bodyMarkdown",
                "tags",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "publish_article" } },
    }),
  });
  if (res.status === 429) throw new Error("ai_rate_limited");
  if (res.status === 402) throw new Error("ai_credits_exhausted");
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  return JSON.parse(args) as GeneratedPost;
}

async function generateArticle(story: RawStory): Promise<GeneratedPost> {
  let sourceText = "";
  try {
    const html = await fetchHtml(story.url);
    sourceText = stripHtml(html).slice(0, 6000);
  } catch {
    sourceText = story.summary ?? story.title;
  }

  const system = `You are a local Andaman journalist writing for AndamanBazaar.in (a travel + local news platform).
- Write factual, neutral, helpful articles in clean Markdown.
- 450–700 words. Use 2–4 H2 subheadings (## ...).
- Include a final "## Source" section linking to the original URL.
- No clickbait. No fabricated quotes or numbers. If unsure, omit.
- Tags: 3–6 short lowercase keywords.`;

  const user = `Original headline: ${story.title}
Source URL: ${story.url}
Source: ${story.source}

Source extract:
"""
${sourceText}
"""

Write a publishable article for AndamanBazaar.in.`;

  return await callLovableJSON([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

// ---------- cover image ----------

async function generateCoverImage(headline: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Cinematic, photo-realistic editorial cover image for an Andaman Islands news article titled: "${headline}". Tropical, scenic, no text overlays.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const dataUrl: string | undefined =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) return null;

    // Upload to post-images bucket
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const [meta, b64] = dataUrl.split(",");
    const ext = meta.includes("png") ? "png" : "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `news-agent/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("post-images")
      .upload(path, bytes, { contentType: `image/${ext}`, upsert: false });
    if (up.error) {
      console.warn("[cover] upload failed:", up.error.message);
      return null;
    }
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[cover] failed:", (e as Error).message);
    return null;
  }
}

// ---------- save ----------

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  base: string,
): Promise<string> {
  let slug = base || `news-${Date.now()}`;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

async function resolveAuthorId(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const env = Deno.env.get("AGENT_AUTHOR_ID");
  if (env) return env;
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (data?.user_id) return data.user_id as string;
  throw new Error(
    "No author found: set AGENT_AUTHOR_ID secret or create an admin user",
  );
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require either x-cron-secret OR ?secret= matching NEWS_AGENT_SECRET
  const expected = Deno.env.get("NEWS_AGENT_SECRET");
  const provided =
    req.headers.get("x-cron-secret") ||
    new URL(req.url).searchParams.get("secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const all = await gatherStories();
    const deduped = dedupeByUrl(all);
    const fresh = await filterAlreadyUsed(supabase, deduped);
    const story = pickTopStory(fresh);

    if (!story) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "no fresh stories",
          gathered: all.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[agent] picked:", story.source, story.title);

    const post = await generateArticle(story);
    const authorId = await resolveAuthorId(supabase);
    const slug = await ensureUniqueSlug(supabase, slugify(post.headline));
    const coverUrl = await generateCoverImage(post.headline);

    const { error: insertErr } = await supabase.from("posts").insert({
      title: post.headline,
      slug,
      excerpt: post.excerpt,
      content: post.bodyMarkdown,
      category: "news",
      tags: post.tags ?? [],
      status: "published",
      cover_image_url: coverUrl,
      author_id: authorId,
      published_at: new Date().toISOString(),
    });
    if (insertErr) throw insertErr;

    const urlHash = await sha256Hex(story.url);
    await supabase.from("source_url_hashes").insert({
      source: story.source,
      url: story.url,
      url_hash: urlHash,
    });

    return new Response(
      JSON.stringify({
        status: "created",
        slug,
        title: post.headline,
        source: story.source,
        cover_image_url: coverUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[agent] error:", msg);
    const status =
      msg === "ai_rate_limited" ? 429 : msg === "ai_credits_exhausted" ? 402 : 500;
    return new Response(JSON.stringify({ status: "error", error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});