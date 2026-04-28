// Andaman Stories & Blog Agent
// Generates evergreen, organic-traffic SEO blog posts for AndamanBazaar.in.
// Triggered by pg_cron daily OR by admin-trigger-stories-agent (with x-cron-secret).

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
  "radhanagar",
  "baratang",
];

const BANNED_TERMS = [
  "shocking",
  "you won't believe",
  "you wont believe",
  "mind-blowing",
  "mind blowing",
  "click here",
  "must read",
  "must-read",
  "lorem ipsum",
  "as an ai",
  "as a language model",
  "i cannot",
  "i'm sorry, but",
  "fuck",
  "shit",
  "bastard",
  "bitch",
];

// Evergreen organic-traffic topic pool. The AI picks ONE that hasn't been
// recently covered (we pass it the last 40 published blog titles).
const TOPIC_POOL = [
  "best beaches in havelock for first-time visitors",
  "scuba diving in andaman: beginner guide and costs",
  "snorkeling spots in neil island",
  "port blair to havelock ferry: timings, prices, tips",
  "what to pack for a 5-day andaman trip",
  "best time to visit andaman: month-by-month guide",
  "andaman on a budget: trip cost breakdown",
  "honeymoon itinerary for andaman (5 days)",
  "family trip to andaman with kids",
  "solo travel guide to andaman",
  "where to eat seafood in port blair",
  "local food in andaman you must try",
  "monsoon travel in andaman: what to expect",
  "best sunset points in havelock and neil",
  "kayaking and mangrove trips in andaman",
  "bioluminescent beaches in andaman",
  "andaman vs lakshadweep: which to pick",
  "how to get from port blair to neil island",
  "cellular jail port blair: visitor guide",
  "ross island and north bay: half-day guide",
  "baratang limestone caves day trip",
  "responsible tourism tips for andaman",
  "internet, sim and connectivity in andaman",
  "best resorts in havelock for couples",
  "diving certifications (PADI/SSI) in havelock",
  "andaman water sports price list",
  "monsoon vs winter andaman: which is better",
  "andaman flight tips: cheapest months and routes",
];

const MIN_WORDS = 500;
const MAX_WORDS = 1100;
const MIN_H2 = 3;
const SEO_TITLE_MAX = 65;
const META_DESC_MIN = 90;
const META_DESC_MAX = 165;
const SLUG_MAX = 80;
const SIMILARITY_THRESHOLD = 0.5;

const ALT_MIN = 50;
const ALT_MAX = 125;

type GeneratedPost = {
  seoTitle: string;
  metaDescription: string;
  headline: string;
  excerpt: string;
  bodyMarkdown: string;
  tags: string[];
  coverAlt: string;
  topic: string;
};

type ValidationResult = { ok: true } | { ok: false; reasons: string[] };

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ---------- utils ----------

function includesAndamanKeyword(text: string): boolean {
  const hay = (text || "").toLowerCase();
  return ANDAMAN_KEYWORDS.some((k) => hay.includes(k));
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
    .slice(0, SLUG_MAX);
}

function wordCount(t: string) {
  return (t.trim().match(/\S+/g) ?? []).length;
}
function countH2(md: string) {
  return (md.match(/^##\s+\S/gm) ?? []).length;
}
function findBannedTerms(t: string) {
  const hay = t.toLowerCase();
  return BANNED_TERMS.filter((b) => hay.includes(b));
}
function tokenize(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
}
function shingles(words: string[], n = 3) {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ---------- LLM ----------

async function callLovableJSON(messages: Array<{ role: string; content: string }>) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "publish_story",
            description: "Return the structured evergreen Andaman blog post.",
            parameters: {
              type: "object",
              properties: {
                topic: { type: "string", description: "The chosen topic from the pool." },
                seoTitle: {
                  type: "string",
                  description: `SEO title, max ${SEO_TITLE_MAX} characters, includes "Andaman".`,
                },
                metaDescription: {
                  type: "string",
                  description: `Meta description, ${META_DESC_MIN}-${META_DESC_MAX} characters.`,
                },
                headline: { type: "string", description: "Article H1 headline (10-90 chars)." },
                excerpt: {
                  type: "string",
                  description: "Short article summary, 60-180 characters.",
                },
                bodyMarkdown: {
                  type: "string",
                  description:
                    `Full article body in GitHub-flavoured Markdown. MUST be ${MIN_WORDS}-${MAX_WORDS} words. ` +
                    `MUST contain at least ${MIN_H2} second-level headings written as lines that start with "## " (two hash characters then a space then the heading text). ` +
                    `One of those headings MUST be exactly "## FAQs" with 3-5 Q&A pairs using **Q:** and **A:** prefixes. ` +
                    `Do NOT use HTML tags, do NOT use # for the title, do NOT escape the # characters. Plain Markdown only.`,
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-6 short lowercase keyword tags.",
                },
                coverAlt: {
                  type: "string",
                  description:
                    `Alt text for the cover image. MUST be ${ALT_MIN}-${ALT_MAX} characters (so write a full descriptive sentence). ` +
                    `Describes the visual scene AND mentions a specific Andaman place. Do not start with "image of" or "photo of".`,
                },
              },
              required: [
                "topic",
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
      tool_choice: { type: "function", function: { name: "publish_story" } },
    }),
  });
  if (res.status === 429) throw new Error("ai_rate_limited");
  if (res.status === 402) throw new Error("ai_credits_exhausted");
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  return JSON.parse(args) as GeneratedPost;
}

async function generateStory(
  recentTitles: string[],
  retryFeedback?: string[],
): Promise<GeneratedPost> {
  const system = `You are a local Andaman travel writer for AndamanBazaar.in.
Write SEO-optimised, helpful, evergreen blog posts that bring organic traffic.
Style:
- Friendly, factual, first-person-plural ("we", "us"), local-expert tone.
- ${MIN_WORDS}–${MAX_WORDS} words in clean Markdown.
- At least ${MIN_H2} \`## H2\` subheadings, including one "## FAQs" section with 3–5 Q&A pairs (use **Q:** / **A:** prefixes).
- Mention specific Andaman places (Port Blair, Havelock/Swaraj Dweep, Neil/Shaheed Dweep, Radhanagar, etc.) where natural.
- No fabricated numbers, no fake quotes, no clickbait, no "as an AI".
- Tags: 3–6 short lowercase keywords (e.g. "havelock", "diving", "andaman", "2026").
- coverAlt: ${ALT_MIN}–${ALT_MAX} chars, describes the visual scene AND the topic, mentions an Andaman place. Don't start with "image of" / "photo of".
- seoTitle ≤ ${SEO_TITLE_MAX} chars; metaDescription ${META_DESC_MIN}–${META_DESC_MAX} chars.`;

  const user = `Pick ONE evergreen topic from this pool that is NOT already covered by the recent posts listed below. Set the \`topic\` field to your chosen topic.

Topic pool:
${TOPIC_POOL.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Recently published post titles (avoid overlap):
${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join("\n") : "- (none)"}

Now write the full blog post via the \`publish_story\` tool.${
    retryFeedback && retryFeedback.length
      ? `\n\nIMPORTANT — your previous attempt FAILED these checks. Fix every one of them this time:\n- ${
        retryFeedback.join("\n- ")
      }`
      : ""
  }`;

  return await callLovableJSON([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

// ---------- moderation ----------

async function moderate(post: GeneratedPost): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a content moderator for a family-friendly travel site. Reject only if the text contains hate, sexual content, violence, illegal activity, or unsafe travel advice. Otherwise approve.",
          },
          {
            role: "user",
            content: `Title: ${post.headline}\n\n${post.bodyMarkdown.slice(0, 4000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderate",
              description: "Approve or reject the article.",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean" },
                  reason: { type: "string" },
                },
                required: ["approved", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "moderate" } },
      }),
    });
    if (!res.ok) return { ok: true }; // fail-open on moderation outage
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { ok: true };
    const parsed = JSON.parse(args) as { approved: boolean; reason: string };
    return parsed.approved ? { ok: true } : { ok: false, reason: parsed.reason || "rejected" };
  } catch {
    return { ok: true };
  }
}

// ---------- validation ----------

function validate(post: GeneratedPost): ValidationResult {
  const reasons: string[] = [];
  const words = wordCount(post.bodyMarkdown);
  if (words < MIN_WORDS) reasons.push(`too short (${words}/${MIN_WORDS})`);
  if (words > MAX_WORDS) reasons.push(`too long (${words}/${MAX_WORDS})`);
  const h2 = countH2(post.bodyMarkdown);
  if (h2 < MIN_H2) reasons.push(`needs ≥${MIN_H2} H2 (got ${h2})`);
  if (!/##\s*FAQ/i.test(post.bodyMarkdown)) reasons.push("missing FAQ section");
  if (!post.seoTitle || post.seoTitle.length > SEO_TITLE_MAX)
    reasons.push(`seoTitle 1-${SEO_TITLE_MAX} chars`);
  if (
    !post.metaDescription ||
    post.metaDescription.length < META_DESC_MIN ||
    post.metaDescription.length > META_DESC_MAX
  )
    reasons.push(`metaDescription ${META_DESC_MIN}-${META_DESC_MAX} chars`);
  if (!post.headline || post.headline.length < 10) reasons.push("headline too short");
  if (!post.excerpt || post.excerpt.length < 40) reasons.push("excerpt too short");
  if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 6)
    reasons.push("tags must be 3-6 items");
  if (!includesAndamanKeyword(`${post.headline} ${post.bodyMarkdown}`))
    reasons.push("must mention an Andaman place");
  const banned = findBannedTerms(`${post.headline} ${post.bodyMarkdown}`);
  if (banned.length) reasons.push(`banned terms: ${banned.join(", ")}`);
  const alt = (post.coverAlt ?? "").trim();
  if (alt.length < ALT_MIN || alt.length > ALT_MAX)
    reasons.push(`coverAlt ${ALT_MIN}-${ALT_MAX} chars`);
  if (!includesAndamanKeyword(alt)) reasons.push("coverAlt must mention an Andaman place");
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

// deno-lint-ignore no-explicit-any
async function checkDuplicate(supabase: any, post: GeneratedPost) {
  const { data } = await supabase
    .from("posts")
    .select("title, content")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(40);
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

// ---------- cover image ----------

async function generateCover(headline: string, alt: string): Promise<string | null> {
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
            content: `Cinematic, photo-realistic editorial cover image for an Andaman Islands travel blog post titled: "${headline}".
Visual brief: ${alt}.
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const [meta, b64] = dataUrl.split(",");
    const ext = meta.includes("png") ? "png" : "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `stories-agent/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("post-images")
      .upload(path, bytes, { contentType: `image/${ext}`, upsert: false });
    if (up.error) {
      console.warn("[cover] upload failed:", up.error.message);
      return null;
    }
    return supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn("[cover] failed:", (e as Error).message);
    return null;
  }
}

// ---------- save helpers ----------

// deno-lint-ignore no-explicit-any
async function ensureUniqueSlug(supabase: any, base: string): Promise<string> {
  let slug = base || `story-${Date.now()}`;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase.from("posts").select("id").eq("slug", slug).limit(1);
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
  throw new Error("no admin user found; set AGENT_AUTHOR_ID secret");
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Recent post titles (last 40 published) to discourage topic overlap.
    const { data: recent } = await supabase
      .from("posts")
      .select("title")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(40);
    const recentTitles = (recent ?? []).map((r: { title: string }) => r.title);

    const post = await generateStory(recentTitles);
    console.log("[stories-agent] picked topic:", post.topic, "→", post.headline);

    const validation = validate(post);
    if (!validation.ok) {
      console.warn("[validate] failed:", validation.reasons);
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "validation_failed",
          issues: validation.reasons,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mod = await moderate(post);
    if (!mod.ok) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: `moderation_rejected: ${mod.reason}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dup = await checkDuplicate(supabase, post);
    if (dup.similar) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "duplicate_content",
          similarity: Number(dup.score.toFixed(3)),
          similar_to: dup.against,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authorId = await resolveAuthorId(supabase);
    const slug = await ensureUniqueSlug(supabase, slugify(post.headline));
    const coverUrl = await generateCover(post.headline, post.coverAlt);

    const contentWithCover = coverUrl
      ? `![${post.coverAlt.replace(/[\[\]]/g, "")}](${coverUrl})\n\n${post.bodyMarkdown}`
      : post.bodyMarkdown;

    const { error: insertErr } = await supabase.from("posts").insert({
      title: post.headline,
      slug,
      excerpt: post.excerpt,
      content: contentWithCover,
      category: "blog",
      tags: post.tags ?? [],
      status: "published",
      cover_image_url: coverUrl,
      author_id: authorId,
      published_at: new Date().toISOString(),
    });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        status: "created",
        slug,
        title: post.headline,
        source: "stories-agent",
        cover_image_url: coverUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[stories-agent] error:", msg);
    const status =
      msg === "ai_rate_limited" ? 429 : msg === "ai_credits_exhausted" ? 402 : 500;
    return new Response(JSON.stringify({ status: "error", error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});