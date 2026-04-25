import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Vendor = {
  id: string;
  slug: string;
  name: string;
  category: string;
  affiliate_url_template: string;
  trusted: boolean;
  priority: number;
  disclosure_text: string;
};

const REC_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          vendor_slug: {
            type: "string",
            description: "Slug of one of the provided vendors. Required.",
          },
          item_type: {
            type: "string",
            enum: ["hotel", "ferry", "activity", "package", "transport", "addon"],
          },
          item_name: { type: "string", description: "Specific listing name." },
          short_description: {
            type: "string",
            description: "1 sentence, max 140 chars.",
          },
          price_inr: { type: "number", description: "Approximate INR price; 0 if unknown." },
          price_label: { type: "string", description: "e.g. 'per night', 'per seat'." },
          query: {
            type: "string",
            description:
              "URL-safe search query to inject into the vendor template (e.g. 'havelock', 'bikes').",
          },
          cta_label: { type: "string" },
          rank: { type: "number", description: "0 = best fit, higher = lower priority." },
        },
        required: [
          "vendor_slug",
          "item_type",
          "item_name",
          "short_description",
          "query",
          "rank",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
};

function buildSystemPrompt(vendors: Vendor[]): string {
  const vendorList = vendors
    .map(
      (v) =>
        `- ${v.slug} | ${v.name} | category=${v.category} | trusted=${v.trusted} | priority=${v.priority}`,
    )
    .join("\n");
  return `You are an Andaman Islands trip planner curating affiliate-backed recommendations.
Pick 4-7 specific, useful items that fit the trip itinerary. Rules:
- ONLY use vendor_slug values from this list (do not invent vendors):
${vendorList}
- Prefer vendors with trusted=true and higher priority.
- Match item_type to the vendor category (hotels for stays, ferries for inter-island, etc.).
- Surface the BEST single option per need; do not duplicate.
- For inter-island ferry days, recommend Makruzz / Nautika / Green Ocean ferries.
- For stays, mix one mid-range and one premium when budget=high; only one budget stay when budget=low.
- For activities, pick 1-2 that match interests (snorkeling, scuba, history, etc.).
- Always include 1 AndamanBazaar marketplace add-on when the trip needs gear (scooter, snorkel, surf).
- Keep short_description concrete and local.
- query must be a short URL-safe search term (e.g. "havelock", "scuba+havelock", "bikes").
- Output ONLY via the provided tool.`;
}

async function generateRecs(
  inputs: any,
  itinerary: any,
  vendors: Vendor[],
): Promise<any[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const summary = itinerary
    ? {
        days: itinerary.cover?.days,
        islands: Array.from(
          new Set((itinerary.days ?? []).map((d: any) => d.island).filter(Boolean)),
        ),
        budget: itinerary.cover?.budget,
      }
    : null;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildSystemPrompt(vendors) },
        {
          role: "user",
          content: `Trip inputs:\n${JSON.stringify(inputs)}\n\nItinerary summary:\n${JSON.stringify(summary)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "emit_recommendations",
            description: "Emit ranked affiliate recommendations.",
            parameters: REC_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "emit_recommendations" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    console.error("AI gateway error", res.status, text);
    throw new Error("AI gateway error");
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no recommendations");
  return JSON.parse(args).recommendations ?? [];
}

function buildAffiliateUrl(template: string, query: string): string {
  return template.replace(/\{\{\s*query\s*\}\}/g, encodeURIComponent(query || ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const tripId: string | undefined = body?.trip_id;
    const teaserOnly: boolean = !!body?.teaser_only;
    if (!tripId) throw new Error("trip_id is required");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trip, error: tripErr } = await admin
      .from("trip_requests")
      .select("id, user_id, inputs, itinerary, status")
      .eq("id", tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");
    if (trip.user_id !== user.id) throw new Error("Forbidden");

    // If recommendations already exist, return them (idempotent)
    const { data: existing } = await admin
      .from("trip_recommendations")
      .select("*")
      .eq("trip_id", tripId)
      .order("rank", { ascending: true });

    if (existing && existing.length > 0 && !body?.force) {
      return new Response(
        JSON.stringify({ recommendations: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const { data: vendors } = await admin
      .from("affiliate_vendors")
      .select("id, slug, name, category, affiliate_url_template, trusted, priority, disclosure_text")
      .eq("active", true)
      .order("priority", { ascending: false });
    if (!vendors || vendors.length === 0) {
      throw new Error("No active vendors configured");
    }

    const aiRecs = await generateRecs(trip.inputs, trip.itinerary, vendors as Vendor[]);

    const vendorBySlug = new Map((vendors as Vendor[]).map((v) => [v.slug, v]));
    const limit = teaserOnly ? 2 : 7;
    const rows = aiRecs
      .slice(0, limit)
      .map((r: any) => {
        const vendor = vendorBySlug.get(r.vendor_slug);
        if (!vendor) return null;
        const affUrl = buildAffiliateUrl(vendor.affiliate_url_template, r.query ?? "");
        return {
          trip_id: tripId,
          user_id: user.id,
          vendor_id: vendor.id,
          item_type: r.item_type,
          item_name: String(r.item_name).slice(0, 200),
          short_description: String(r.short_description ?? "").slice(0, 240),
          merchant_name: vendor.name,
          price_inr: r.price_inr && r.price_inr > 0 ? Math.round(r.price_inr) : null,
          price_label: r.price_label ?? null,
          affiliate_url: affUrl,
          disclosure_text: vendor.disclosure_text,
          cta_label: r.cta_label ?? "Book now",
          is_affiliate: true,
          rank: Number.isFinite(r.rank) ? r.rank : 99,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Replace existing on force-regenerate
    if (body?.force) {
      await admin.from("trip_recommendations").delete().eq("trip_id", tripId);
    }

    const { data: inserted, error: insErr } = await admin
      .from("trip_recommendations")
      .insert(rows)
      .select("*");
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ recommendations: inserted ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("trip-recommendations error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});