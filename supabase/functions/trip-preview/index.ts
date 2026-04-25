import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_BUDGETS = ["low", "medium", "high"] as const;
const VALID_INTERESTS = [
  "adventure",
  "relaxation",
  "couple",
  "solo",
  "family",
  "snorkeling",
  "history",
  "food",
] as const;

type Inputs = {
  days: number;
  budget: typeof VALID_BUDGETS[number];
  start_date: string;
  end_date: string;
  interests: string[];
  islands: string[];
};

function validateInputs(raw: any): Inputs {
  if (!raw || typeof raw !== "object") throw new Error("Invalid inputs");
  const days = Number(raw.days);
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    throw new Error("days must be 1–14");
  }
  if (!VALID_BUDGETS.includes(raw.budget)) throw new Error("Invalid budget");
  if (typeof raw.start_date !== "string" || typeof raw.end_date !== "string") {
    throw new Error("Invalid dates");
  }
  const interests = Array.isArray(raw.interests)
    ? raw.interests.filter((i: any) => typeof i === "string").slice(0, 8)
    : [];
  const islands = Array.isArray(raw.islands)
    ? raw.islands.filter((i: any) => typeof i === "string").slice(0, 6)
    : [];
  return {
    days,
    budget: raw.budget,
    start_date: raw.start_date,
    end_date: raw.end_date,
    interests,
    islands,
  };
}

async function generateTeaser(inputs: Inputs): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const sys = `You are an Andaman Islands local insider. Produce a SHORT teaser (no more than 120 words) for a trip planner.
You only output structured JSON via the provided tool. Do not include the full itinerary — only summary + Day 1 morning.
Be specific to Andaman geography (Port Blair, Havelock/Swaraj Dweep, Neil/Shaheed Dweep). No fluff.`;

  const user = `Trip inputs: ${JSON.stringify(inputs)}.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "trip_teaser",
            description: "Return short teaser for the trip.",
            parameters: {
              type: "object",
              properties: {
                trip_title: { type: "string" },
                summary: { type: "string", description: "1–2 sentence pitch" },
                day1_morning: { type: "string" },
                highlights: {
                  type: "array",
                  items: { type: "string" },
                  description: "3 short bullet highlights",
                },
                estimated_total_inr: { type: "number" },
              },
              required: [
                "trip_title",
                "summary",
                "day1_morning",
                "highlights",
                "estimated_total_inr",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "trip_teaser" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
    console.error("AI gateway error", res.status, text);
    throw new Error("AI gateway error");
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no teaser");
  return JSON.parse(args);
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
    const inputs = validateInputs(body?.inputs);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trip, error: insertErr } = await admin
      .from("trip_requests")
      .insert({ user_id: user.id, inputs, status: "pending" })
      .select("id")
      .single();
    if (insertErr || !trip) throw insertErr ?? new Error("Insert failed");

    const preview = await generateTeaser(inputs);

    await admin
      .from("trip_requests")
      .update({ preview })
      .eq("id", trip.id);

    return new Response(JSON.stringify({ trip_id: trip.id, preview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("trip-preview error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});