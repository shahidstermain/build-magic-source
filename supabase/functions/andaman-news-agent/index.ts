// Andaman News & Stories Agent
// Daily cron: scrapes Andaman news sources, picks the freshest unused story,
// rewrites it with Lovable AI into an SEO-friendly post, generates a cover
// image, and publishes it to the `posts` table.
//
// Triggered by: pg_cron (daily) OR manual curl with x-cron-secret header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// Words/phrases we never want in a published article. Keep lowercase.
const BANNED_TERMS = [
  // clickbait / tabloid
  "shocking",
  "you won't believe",
  "you wont believe",
  "mind-blowing",
  "mind blowing",
  "jaw-dropping",
  "click here",
  "must read",
  "must-read",
  "breaking:",
  "exclusive!!",
  // unsafe / off-brand
  "lorem ipsum",
  "as an ai",
  "as a language model",
  "i cannot",
  "i'm sorry, but",
  // profanity / slurs (small starter list)
  "fuck",
  "shit",
  "bastard",
  "bitch",
];

const MIN_WORDS = 400;
const MAX_WORDS = 900;
const MIN_H2 = 2;
const SEO_TITLE_MAX = 60;
const META_DESC_MIN = 90;
const META_DESC_MAX = 160;
const SLUG_MAX = 75;
const SIMILARITY_THRESHOLD = 0.55; // jaccard on word shingles

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
  coverAlt: string;
};

type ValidationResult = { ok: true } | { ok: false; reasons: string[] };

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

// deno-lint-ignore no-explicit-any
async function filterAlreadyUsed(supabase: any, stories: RawStory[]): Promise<RawStory[]> {
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
  const used = new Set((data ?? []).map((r: any) => r.url_hash as string));
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
                coverAlt: {
                  type: "string",
                  description:
                    "Descriptive alt text for the cover image (50-125 chars). Must describe the visual scene AND mention the article topic. No 'image of' / 'photo of' prefix.",
                },
              },
              required: [
                "seoTitle",
                "metaDescription",
                "headline",
                "excerpt",
                "bodyMarkdown",
                "tags",
                "coverAlt",
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
- Tags: 3–6 short lowercase keywords.
- coverAlt: 50–125 chars, describes the cover image's scene AND the article subject (location, activity, or event). No "image of" / "photo of" prefix.`;

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

// ---------- targeted patching (single retry) ----------

type PatchBucket = "body" | "seo" | "alt";

function classifyReasons(reasons: string[]): Set<PatchBucket> {
  const buckets = new Set<PatchBucket>();
  for (const r of reasons) {
    const s = r.toLowerCase();
    if (
      s.includes("words") ||
      s.includes("h2") ||
      s.includes("source' section") ||
      s.includes("banned terms")
    ) {
      buckets.add("body");
    }
    if (
      s.includes("seotitle") ||
      s.includes("metadescription") ||
      s.includes("headline") ||
      s.includes("excerpt") ||
      s.includes("tags") ||
      s.includes("slug")
    ) {
      buckets.add("seo");
    }
    if (s.includes("cover alt") || s.includes("alt text")) {
      buckets.add("alt");
    }
  }
  return buckets;
}

async function callLovablePatch(
  messages: Array<{ role: string; content: string }>,
  fields: string[],
): Promise<Record<string, unknown>> {
  const properties: Record<string, unknown> = {
    seoTitle: { type: "string" },
    metaDescription: { type: "string" },
    headline: { type: "string" },
    excerpt: { type: "string" },
    bodyMarkdown: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    coverAlt: { type: "string" },
  };
  const filtered: Record<string, unknown> = {};
  for (const f of fields) if (properties[f]) filtered[f] = properties[f];

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
            name: "patch_article",
            description: "Return ONLY the corrected fields for the article",
            parameters: {
              type: "object",
              properties: filtered,
              required: fields,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "patch_article" } },
    }),
  });
  if (res.status === 429) throw new Error("ai_rate_limited");
  if (res.status === 402) throw new Error("ai_credits_exhausted");
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  return JSON.parse(args) as Record<string, unknown>;
}

async function patchArticle(
  post: GeneratedPost,
  story: RawStory,
  reasons: string[],
): Promise<GeneratedPost> {
  const buckets = classifyReasons(reasons);
  if (buckets.size === 0) return post;

  const fields: string[] = [];
  const instructions: string[] = [];

  if (buckets.has("body")) {
    fields.push("bodyMarkdown");
    instructions.push(
      `Rewrite ONLY \`bodyMarkdown\`. Keep facts, headline, tags and SEO unchanged. ` +
        `Constraints: ${MIN_WORDS}-${MAX_WORDS} words, at least ${MIN_H2} \`## H2\` subheadings, ` +
        `must end with a \`## Source\` section linking ${story.url}. No banned/clickbait terms.`,
    );
  }
  if (buckets.has("seo")) {
    fields.push("seoTitle", "metaDescription", "headline", "excerpt", "tags");
    instructions.push(
      `Regenerate ONLY the SEO/meta fields (seoTitle ≤${SEO_TITLE_MAX} chars, ` +
        `metaDescription ${META_DESC_MIN}-${META_DESC_MAX} chars, headline ≥10 chars, ` +
        `excerpt ≥40 chars, tags 3-6 lowercase keywords). Do NOT change \`bodyMarkdown\`.`,
    );
  }
  if (buckets.has("alt")) {
    fields.push("coverAlt");
    instructions.push(
      `Regenerate ONLY \`coverAlt\` (${ALT_MIN}-${ALT_MAX} chars). Must describe a concrete visual ` +
        `scene, mention an Andaman place/location, reflect the article topic (reuse ≥2 keywords ` +
        `from headline/tags), and must NOT start with "image of"/"photo of" or duplicate the headline.`,
    );
  }

  const system =
    `You are editing a draft article for AndamanBazaar.in. Return ONLY the requested fields ` +
    `via the \`patch_article\` tool. Do NOT include any other fields.`;

  const user = `Original story: ${story.title} (${story.source})
Source URL: ${story.url}

Current draft (for context only):
- headline: ${post.headline}
- seoTitle: ${post.seoTitle}
- metaDescription: ${post.metaDescription}
- excerpt: ${post.excerpt}
- tags: ${(post.tags ?? []).join(", ")}
- coverAlt: ${post.coverAlt}
- bodyMarkdown:
"""
${post.bodyMarkdown}
"""

Validation issues to fix:
- ${reasons.join("\n- ")}

Patch instructions:
- ${instructions.join("\n- ")}

Return only: ${fields.join(", ")}.`;

  const patch = await callLovablePatch(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    fields,
  );

  return { ...post, ...(patch as Partial<GeneratedPost>) };
}

// ---------- cover image ----------

async function generateCoverImage(
  headline: string,
  altText: string,
): Promise<string | null> {
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
            content: `Cinematic, photo-realistic editorial cover image for an Andaman Islands news article titled: "${headline}".
Visual brief (must be reflected in the image): ${altText}.
Tropical, scenic, true-to-place, no text overlays, no watermarks.`,
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

// deno-lint-ignore no-explicit-any
async function ensureUniqueSlug(supabase: any, base: string): Promise<string> {
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

// deno-lint-ignore no-explicit-any
async function resolveAuthorId(supabase: any): Promise<string> {
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

// ---------- validation ----------

function wordCount(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}

function countH2(markdown: string): number {
  return (markdown.match(/^##\s+\S/gm) ?? []).length;
}

function findBannedTerms(text: string): string[] {
  const hay = text.toLowerCase();
  return BANNED_TERMS.filter((t) => hay.includes(t));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function shingles(words: string[], n = 3): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function validateContent(post: GeneratedPost): ValidationResult {
  const reasons: string[] = [];

  // length
  const words = wordCount(post.bodyMarkdown);
  if (words < MIN_WORDS) reasons.push(`too short (${words} words, min ${MIN_WORDS})`);
  if (words > MAX_WORDS) reasons.push(`too long (${words} words, max ${MAX_WORDS})`);

  // structure
  const h2 = countH2(post.bodyMarkdown);
  if (h2 < MIN_H2) reasons.push(`needs at least ${MIN_H2} H2 subheadings (found ${h2})`);
  if (!/##\s*Source/i.test(post.bodyMarkdown)) reasons.push("missing '## Source' section");

  // SEO
  if (!post.seoTitle || post.seoTitle.length > SEO_TITLE_MAX)
    reasons.push(`seoTitle must be 1-${SEO_TITLE_MAX} chars (got ${post.seoTitle?.length ?? 0})`);
  if (!post.metaDescription || post.metaDescription.length < META_DESC_MIN || post.metaDescription.length > META_DESC_MAX)
    reasons.push(`metaDescription must be ${META_DESC_MIN}-${META_DESC_MAX} chars (got ${post.metaDescription?.length ?? 0})`);
  if (!post.headline || post.headline.length < 10) reasons.push("headline too short");
  if (!post.excerpt || post.excerpt.length < 40) reasons.push("excerpt too short");
  if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 6)
    reasons.push(`tags must be 3-6 items (got ${post.tags?.length ?? 0})`);
  const slugLen = slugify(post.headline).length;
  if (slugLen === 0 || slugLen > SLUG_MAX) reasons.push(`slug length must be 1-${SLUG_MAX} chars (got ${slugLen})`);

  // banned terms
  const banned = findBannedTerms(`${post.headline} ${post.bodyMarkdown} ${post.excerpt}`);
  if (banned.length > 0) reasons.push(`banned terms detected: ${banned.join(", ")}`);

  // image SEO: alt text quality and topical relevance
  const altReasons = validateCoverAlt(post);
  reasons.push(...altReasons);

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

const ALT_MIN = 50;
const ALT_MAX = 125;
const ALT_TOPIC_OVERLAP_MIN = 2; // # of topic words that must appear in alt
const ALT_BAD_PREFIXES = [
  "image of",
  "picture of",
  "photo of",
  "photograph of",
  "an image",
  "a picture",
  "a photo",
];

function topicKeywords(post: GeneratedPost): string[] {
  const stop = new Set([
    "the","and","for","with","from","that","this","into","over","after","amid",
    "andaman","andamans","nicobar","islands","island","news","story","update",
  ]);
  const fromTitle = tokenize(`${post.headline} ${post.seoTitle}`).filter(
    (w) => !stop.has(w),
  );
  const fromTags = (post.tags ?? [])
    .flatMap((t) => tokenize(t))
    .filter((w) => !stop.has(w));
  // dedupe, keep order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...fromTitle, ...fromTags]) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

function validateCoverAlt(post: GeneratedPost): string[] {
  const reasons: string[] = [];
  const alt = (post.coverAlt ?? "").trim();

  if (!alt) {
    reasons.push("cover alt text is missing");
    return reasons;
  }
  if (alt.length < ALT_MIN || alt.length > ALT_MAX) {
    reasons.push(`cover alt must be ${ALT_MIN}-${ALT_MAX} chars (got ${alt.length})`);
  }
  const lower = alt.toLowerCase();
  const badPrefix = ALT_BAD_PREFIXES.find((p) => lower.startsWith(p));
  if (badPrefix) reasons.push(`cover alt should not start with "${badPrefix}"`);

  // Must mention an Andaman/place keyword (locality grounding)
  if (!includesAndamanKeyword(alt)) {
    reasons.push("cover alt must reference an Andaman location/place");
  }

  // Topic overlap: at least N significant words from the article appear in alt
  const altWords = new Set(tokenize(alt));
  const topic = topicKeywords(post);
  const overlap = topic.filter((w) => altWords.has(w));
  if (overlap.length < ALT_TOPIC_OVERLAP_MIN) {
    reasons.push(
      `cover alt must reflect article topic (matched ${overlap.length}/${ALT_TOPIC_OVERLAP_MIN} keywords)`,
    );
  }

  // Avoid duplicating the headline verbatim
  if (alt.toLowerCase() === post.headline.trim().toLowerCase()) {
    reasons.push("cover alt must not be identical to the headline");
  }

  return reasons;
}

// deno-lint-ignore no-explicit-any
async function checkDuplicateSimilarity(
  supabase: any,
  post: GeneratedPost,
): Promise<{ similar: boolean; score: number; against?: string }> {
  const { data } = await supabase
    .from("posts")
    .select("title, content")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);
  if (!data?.length) return { similar: false, score: 0 };

  const newSet = shingles(tokenize(`${post.headline} ${post.bodyMarkdown}`));
  let best = 0;
  let bestTitle: string | undefined;
  for (const row of data as Array<{ title: string; content: string }>) {
    const s = jaccard(newSet, shingles(tokenize(`${row.title} ${row.content}`)));
    if (s > best) {
      best = s;
      bestTitle = row.title;
    }
  }
  return { similar: best >= SIMILARITY_THRESHOLD, score: best, against: bestTitle };
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

    // Generate, validate, and retry once — patching ONLY the failing sections.
    let post = await generateArticle(story);
    let validation = validateContent(post);
    if (!validation.ok) {
      console.warn("[validate] first attempt failed:", validation.reasons);
      try {
        post = await patchArticle(post, story, validation.reasons);
      } catch (e) {
        console.error("[validate] targeted patch failed:", e);
      }
      validation = validateContent(post);
      if (validation.ok) {
        console.log("[validate] targeted patch succeeded");
      }
    }
    if (!validation.ok) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "validation_failed",
          issues: validation.reasons,
          source: story.source,
          source_url: story.url,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Duplicate / similarity check against last 20 published posts.
    const dup = await checkDuplicateSimilarity(supabase, post);
    if (dup.similar) {
      // Mark this source as used so we don't keep retrying it.
      const usedHash = await sha256Hex(story.url);
      await supabase.from("source_url_hashes").insert({
        source: story.source,
        url: story.url,
        url_hash: usedHash,
      });
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "duplicate_content",
          similarity: Number(dup.score.toFixed(3)),
          similar_to: dup.against,
          source: story.source,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authorId = await resolveAuthorId(supabase);
    const slug = await ensureUniqueSlug(supabase, slugify(post.headline));
    const coverUrl = await generateCoverImage(post.headline, post.coverAlt);

    // Embed the cover image with proper alt text at the top of the markdown
    // so it renders in the post body with SEO-friendly alt attribute.
    const contentWithCover = coverUrl
      ? `![${post.coverAlt.replace(/[\[\]]/g, "")}](${coverUrl})\n\n${post.bodyMarkdown}`
      : post.bodyMarkdown;

    const { error: insertErr } = await supabase.from("posts").insert({
      title: post.headline,
      slug,
      excerpt: post.excerpt,
      content: contentWithCover,
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