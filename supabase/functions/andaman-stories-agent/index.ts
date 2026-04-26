// Andaman Stories & Blog Agent
// Generates evergreen, SEO-friendly travel/lifestyle stories & blog posts about
// the Andaman Islands designed to attract organic traffic. Uses Lovable AI to
// brainstorm fresh angles, write the article, moderate it, and produce a cover
// image. Publishes to the `posts` table with category = "story" or "blog".
//
// Triggered by: pg_cron OR manual curl with x-cron-secret header
// (re-uses NEWS_AGENT_SECRET so admins manage one secret for both agents).

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
  "baratang",
  "diglipur",
  "ross island",
  "north bay",
];

// Words/phrases we never want in a published article. Keep lowercase.
const BANNED_TERMS = [
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

// Themes the brainstorm step should rotate through to keep content diverse.
const STORY_THEMES = [
  "best beaches and snorkelling spots",
  "scuba diving guides for beginners",
  "ferry & travel logistics between islands",
  "budget travel and backpacker tips",
  "honeymoon and couples itineraries",
  "family-friendly activities and resorts",
  "local food, seafood and Andamanese cuisine",
  "off-beat islands and hidden gems",
  "monsoon and seasonal travel guides",
  "wildlife, marine life and eco-tourism",
  "history, ross island and cellular jail",
  "indigenous culture and responsible tourism",
  "photography spots and sunset points",
  "adventure sports — kayaking, trekking, sea-walking",
  "weekend itineraries from Port Blair",
  "shopping, souvenirs and local markets",
];

const MIN_WORDS = 500;
const MAX_WORDS = 1100;
const MIN_H2 = 3;
const SEO_TITLE_MAX = 60;
const META_DESC_MIN = 90;
const META_DESC_MAX = 160;
const SLUG_MAX = 75;
const SIMILARITY_THRESHOLD = 0.5;

const ALT_MIN = 50;
const ALT_MAX = 125;
const ALT_TOPIC_OVERLAP_MIN = 2;
const ALT_BAD_PREFIXES = [
  "image of",
  "picture of",
  "photo of",
  "photograph of",
  "an image",
  "a picture",
  "a photo",
];

type StoryIdea = {
  category: "story" | "blog";
  theme: string;
  workingTitle: string;
  angle: string;
  searchIntent: string;
};

type GeneratedPost = {
  seoTitle: string;
  metaDescription: string;
  headline: string;
  excerpt: string;
  bodyMarkdown: string;
  tags: string[];
  coverAlt: string;
  category: "story" | "blog";
};

type ModerationResult = {
  safe: boolean;
  reasons: string[];
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

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

// ---------- LLM (Lovable AI) ----------

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function aiCall(body: Record<string, unknown>) {
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("ai_rate_limited");
  if (res.status === 402) throw new Error("ai_credits_exhausted");
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  return await res.json();
}

function parseToolArgs(json: unknown): Record<string, unknown> {
  // deno-lint-ignore no-explicit-any
  const j = json as any;
  const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  return JSON.parse(args);
}

// ---- 1) Brainstorm fresh story ideas ----
async function brainstormIdeas(
  recentTitles: string[],
  themeHints: string[],
): Promise<StoryIdea[]> {
  const system =
    `You are an SEO content strategist for AndamanBazaar.in (a travel + ` +
    `marketplace for the Andaman Islands). Brainstorm evergreen story/blog ` +
    `ideas that will rank for high-intent travel queries (e.g. "best time ` +
    `to visit Havelock", "is scuba diving safe in Port Blair", "Andaman ` +
    `honeymoon itinerary"). Avoid news. Avoid topics already covered.`;

  const user = `Generate 5 fresh story ideas focused on these themes:
- ${themeHints.join("\n- ")}

Already covered (do NOT repeat angles):
- ${recentTitles.slice(0, 25).join("\n- ") || "(nothing yet)"}

Rules:
- Each idea must be Andaman-specific, evergreen, and useful.
- Mix "story" (narrative/experience-led) and "blog" (how-to/guide) categories.
- Working title should read like a real article (not a topic tag).
- searchIntent: a likely Google query the article would target.`;

  const json = await aiCall({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_ideas",
          description: "Return a list of fresh story ideas.",
          parameters: {
            type: "object",
            properties: {
              ideas: {
                type: "array",
                minItems: 3,
                maxItems: 6,
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string", enum: ["story", "blog"] },
                    theme: { type: "string" },
                    workingTitle: { type: "string" },
                    angle: { type: "string" },
                    searchIntent: { type: "string" },
                  },
                  required: [
                    "category",
                    "theme",
                    "workingTitle",
                    "angle",
                    "searchIntent",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["ideas"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "submit_ideas" } },
  });
  const args = parseToolArgs(json);
  const ideas = (args.ideas as StoryIdea[]) ?? [];
  return ideas.filter(
    (i) =>
      i.workingTitle &&
      i.angle &&
      (i.category === "story" || i.category === "blog"),
  );
}

// ---- 2) Write the article ----
async function generateArticle(idea: StoryIdea): Promise<GeneratedPost> {
  const system = `You are a senior travel writer for AndamanBazaar.in.
- Write factual, helpful, original articles in clean Markdown.
- ${MIN_WORDS}–${MAX_WORDS} words. Use ${MIN_H2}–5 H2 subheadings (## ...).
- Voice: warm, practical, locally-grounded. Indian English.
- No clickbait. No fabricated quotes/numbers. If unsure, omit.
- Include a short FAQ section near the end (## FAQs) with 2–3 Q&As — great for SEO.
- Tags: 3–6 short lowercase keywords (include geo terms when relevant).
- coverAlt: ${ALT_MIN}–${ALT_MAX} chars, describes the cover scene AND article subject (location/activity). No "image of"/"photo of" prefix.`;

  const user = `Write a publishable ${idea.category} for AndamanBazaar.in.

Working title: ${idea.workingTitle}
Angle: ${idea.angle}
Target search intent: ${idea.searchIntent}

Make it genuinely useful for someone planning a trip to the Andamans.
Mention specific places, costs (in INR, ranges only), seasons, and practical tips.`;

  const json = await aiCall({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "publish_article",
          description: "Return the structured article",
          parameters: {
            type: "object",
            properties: {
              seoTitle: { type: "string" },
              metaDescription: { type: "string" },
              headline: { type: "string" },
              excerpt: { type: "string" },
              bodyMarkdown: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              coverAlt: { type: "string" },
              category: { type: "string", enum: ["story", "blog"] },
            },
            required: [
              "seoTitle",
              "metaDescription",
              "headline",
              "excerpt",
              "bodyMarkdown",
              "tags",
              "coverAlt",
              "category",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "publish_article" } },
  });
  const post = parseToolArgs(json) as unknown as GeneratedPost;
  if (post.category !== "story" && post.category !== "blog") {
    post.category = idea.category;
  }
  return post;
}

// ---- 3) AI moderation pass ----
async function moderateArticle(post: GeneratedPost): Promise<ModerationResult> {
  const system =
    `You are a strict content moderator for a public travel site. Flag any ` +
    `article that contains: hate/harassment, sexual content, graphic violence, ` +
    `unsafe travel advice (e.g. visiting protected tribal reserves like North ` +
    `Sentinel), defamation, fabricated facts, copyright lifts, or spam/SEO ` +
    `keyword stuffing. Be conservative — when unsure, flag.`;

  const user = `Moderate this draft:

Title: ${post.headline}
Excerpt: ${post.excerpt}

Body:
"""
${post.bodyMarkdown}
"""`;

  const json = await aiCall({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "moderation_verdict",
          description: "Return moderation result.",
          parameters: {
            type: "object",
            properties: {
              safe: { type: "boolean" },
              reasons: {
                type: "array",
                items: { type: "string" },
                description: "If unsafe, list specific issues. Else empty.",
              },
            },
            required: ["safe", "reasons"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "moderation_verdict" },
    },
  });
  return parseToolArgs(json) as unknown as ModerationResult;
}

// ---- 4) Cover image ----
async function generateCoverImage(
  headline: string,
  altText: string,
): Promise<string | null> {
  try {
    const json = await aiCall({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: `Cinematic, photo-realistic editorial cover image for an Andaman Islands travel article titled: "${headline}".
Visual brief (must be reflected in the image): ${altText}.
Tropical, scenic, true-to-place, no text overlays, no watermarks.`,
        },
      ],
      modalities: ["image", "text"],
    });
    // deno-lint-ignore no-explicit-any
    const dataUrl: string | undefined = (json as any)?.choices?.[0]?.message
      ?.images?.[0]?.image_url?.url;
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
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[cover] failed:", (e as Error).message);
    return null;
  }
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

function topicKeywords(post: GeneratedPost): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "from", "that", "this", "into", "over",
    "after", "amid", "andaman", "andamans", "nicobar", "islands", "island",
    "guide", "tips", "best",
  ]);
  const fromTitle = tokenize(`${post.headline} ${post.seoTitle}`).filter(
    (w) => !stop.has(w),
  );
  const fromTags = (post.tags ?? [])
    .flatMap((t) => tokenize(t))
    .filter((w) => !stop.has(w));
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
  if (!includesAndamanKeyword(alt)) {
    reasons.push("cover alt must reference an Andaman location/place");
  }
  const altWords = new Set(tokenize(alt));
  const topic = topicKeywords(post);
  const overlap = topic.filter((w) => altWords.has(w));
  if (overlap.length < ALT_TOPIC_OVERLAP_MIN) {
    reasons.push(
      `cover alt must reflect article topic (matched ${overlap.length}/${ALT_TOPIC_OVERLAP_MIN} keywords)`,
    );
  }
  if (alt.toLowerCase() === post.headline.trim().toLowerCase()) {
    reasons.push("cover alt must not be identical to the headline");
  }
  return reasons;
}

function validateContent(post: GeneratedPost): ValidationResult {
  const reasons: string[] = [];
  const words = wordCount(post.bodyMarkdown);
  if (words < MIN_WORDS) reasons.push(`too short (${words} words, min ${MIN_WORDS})`);
  if (words > MAX_WORDS) reasons.push(`too long (${words} words, max ${MAX_WORDS})`);

  const h2 = countH2(post.bodyMarkdown);
  if (h2 < MIN_H2) reasons.push(`needs at least ${MIN_H2} H2 subheadings (found ${h2})`);

  if (!post.seoTitle || post.seoTitle.length > SEO_TITLE_MAX)
    reasons.push(`seoTitle must be 1-${SEO_TITLE_MAX} chars (got ${post.seoTitle?.length ?? 0})`);
  if (
    !post.metaDescription ||
    post.metaDescription.length < META_DESC_MIN ||
    post.metaDescription.length > META_DESC_MAX
  )
    reasons.push(`metaDescription must be ${META_DESC_MIN}-${META_DESC_MAX} chars (got ${post.metaDescription?.length ?? 0})`);
  if (!post.headline || post.headline.length < 10) reasons.push("headline too short");
  if (!post.excerpt || post.excerpt.length < 40) reasons.push("excerpt too short");
  if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 6)
    reasons.push(`tags must be 3-6 items (got ${post.tags?.length ?? 0})`);
  const slugLen = slugify(post.headline).length;
  if (slugLen === 0 || slugLen > SLUG_MAX)
    reasons.push(`slug length must be 1-${SLUG_MAX} chars (got ${slugLen})`);

  if (!includesAndamanKeyword(`${post.headline} ${post.bodyMarkdown}`))
    reasons.push("article must reference an Andaman location");

  const banned = findBannedTerms(`${post.headline} ${post.bodyMarkdown} ${post.excerpt}`);
  if (banned.length > 0) reasons.push(`banned terms detected: ${banned.join(", ")}`);

  reasons.push(...validateCoverAlt(post));

  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
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

// ---------- save ----------

// deno-lint-ignore no-explicit-any
async function ensureUniqueSlug(supabase: any, base: string): Promise<string> {
  let slug = base || `story-${Date.now()}`;
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

// deno-lint-ignore no-explicit-any
async function fetchRecentTitles(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from("posts")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r: { title: string }) => r.title);
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: re-use NEWS_AGENT_SECRET so admins manage one ops secret.
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

    const recentTitles = await fetchRecentTitles(supabase);
    const themeHints = pickRandom(STORY_THEMES, 4);
    const ideas = await brainstormIdeas(recentTitles, themeHints);

    if (!ideas.length) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "no_ideas_generated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pick the first idea whose working title isn't too close to an existing post.
    const recentLower = new Set(recentTitles.map((t) => t.toLowerCase().trim()));
    const idea =
      ideas.find((i) => !recentLower.has(i.workingTitle.toLowerCase().trim())) ??
      ideas[0];

    console.log("[stories-agent] picked:", idea.category, idea.workingTitle);

    const post = await generateArticle(idea);

    const validation = validateContent(post);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "validation_failed",
          issues: validation.reasons,
          working_title: idea.workingTitle,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const moderation = await moderateArticle(post);
    if (!moderation.safe) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "moderation_failed",
          issues: moderation.reasons,
          working_title: idea.workingTitle,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dup = await checkDuplicateSimilarity(supabase, post);
    if (dup.similar) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "duplicate_content",
          similarity: Number(dup.score.toFixed(3)),
          similar_to: dup.against,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authorId = await resolveAuthorId(supabase);
    const slug = await ensureUniqueSlug(supabase, slugify(post.headline));
    const coverUrl = await generateCoverImage(post.headline, post.coverAlt);

    const contentWithCover = coverUrl
      ? `![${post.coverAlt.replace(/[\[\]]/g, "")}](${coverUrl})\n\n${post.bodyMarkdown}`
      : post.bodyMarkdown;

    const { error: insertErr } = await supabase.from("posts").insert({
      title: post.headline,
      slug,
      excerpt: post.excerpt,
      content: contentWithCover,
      category: post.category,
      tags: post.tags ?? [],
      status: "published",
      cover_image_url: coverUrl,
      author_id: authorId,
      published_at: new Date().toISOString(),
    });
    if (insertErr) throw insertErr;

    // Record the working-title hash so we don't repeat the same brief.
    const ideaHash = await sha256Hex(`stories::${idea.workingTitle.toLowerCase()}`);
    await supabase.from("source_url_hashes").insert({
      source: "stories-agent",
      url: `internal://stories/${slug}`,
      url_hash: ideaHash,
    });

    return new Response(
      JSON.stringify({
        status: "created",
        slug,
        title: post.headline,
        category: post.category,
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