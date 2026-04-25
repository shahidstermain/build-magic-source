import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_BUDGETS = ["low", "medium", "high"] as const;
const VALID_FITNESS = ["low", "medium", "high"] as const;
const VALID_GROUP = ["solo", "couple", "family", "group"] as const;
const VALID_ACCOM = ["budget", "midrange", "resort", "luxury"] as const;
const VALID_DIET = ["vegetarian", "non-vegetarian", "seafood-only", "vegan"] as const;

type Inputs = {
  days: number;
  budget: typeof VALID_BUDGETS[number];
  start_date: string;
  end_date: string;
  interests: string[];
  islands: string[];
  travelers?: number;
  group_type?: typeof VALID_GROUP[number];
  ages?: string;
  fitness?: typeof VALID_FITNESS[number];
  accommodation?: typeof VALID_ACCOM[number];
  diet?: typeof VALID_DIET[number];
  avoid?: string[];
  permits_arranged?: boolean;
  returning_visitor?: boolean;
  is_foreign_national?: boolean;
  notes?: string;
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
    ? raw.interests.filter((i: any) => typeof i === "string").slice(0, 12)
    : [];
  const islands = Array.isArray(raw.islands)
    ? raw.islands.filter((i: any) => typeof i === "string").slice(0, 6)
    : [];
  const avoid = Array.isArray(raw.avoid)
    ? raw.avoid.filter((i: any) => typeof i === "string").slice(0, 10)
    : [];
  const travelers = raw.travelers != null ? Number(raw.travelers) : undefined;
  if (travelers != null && (!Number.isInteger(travelers) || travelers < 1 || travelers > 30)) {
    throw new Error("travelers must be 1–30");
  }
  return {
    days,
    budget: raw.budget,
    start_date: raw.start_date,
    end_date: raw.end_date,
    interests,
    islands,
    travelers,
    group_type: VALID_GROUP.includes(raw.group_type) ? raw.group_type : undefined,
    ages: typeof raw.ages === "string" ? raw.ages.slice(0, 200) : undefined,
    fitness: VALID_FITNESS.includes(raw.fitness) ? raw.fitness : undefined,
    accommodation: VALID_ACCOM.includes(raw.accommodation) ? raw.accommodation : undefined,
    diet: VALID_DIET.includes(raw.diet) ? raw.diet : undefined,
    avoid,
    permits_arranged: typeof raw.permits_arranged === "boolean" ? raw.permits_arranged : undefined,
    returning_visitor: typeof raw.returning_visitor === "boolean" ? raw.returning_visitor : undefined,
    is_foreign_national: typeof raw.is_foreign_national === "boolean" ? raw.is_foreign_national : undefined,
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 500) : undefined,
  };
}

function seasonWarning(startDate: string): string | null {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  if ([5, 6, 7, 8, 9].includes(m)) {
    return "Heads up: your dates fall in monsoon (May–Sept). Expect rough seas, ferry cancellations, and limited scuba/snorkel.";
  }
  if (m === 12 || m === 1) {
    return "Heads up: peak season (Dec–Jan) — ferries and hotels book out 2–3 months ahead.";
  }
  return null;
}

async function generateTeaser(inputs: Inputs): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const sys = `You are an Andaman Islands local insider who has lived there for years. Produce a SHORT teaser (no more than 140 words).
Output structured JSON via the provided tool only. Be specific to Andaman geography (Port Blair, Havelock/Swaraj Dweep, Neil/Shaheed Dweep, Baratang, Diglipur). No tourist fluff.

Tailor to the user profile:
- Group type / ages: family with kids → calmer beaches (Neil over Havelock); seniors → road-accessible spots; solo → social hostels; couple → sunset spots.
- Fitness: low → no treks; high → adventure/scuba.
- Diet: surface relevant food note if vegetarian/vegan (limited on smaller islands).
- Returning visitor: skip Cellular Jail/Radhanagar, lean offbeat (Diglipur, Baratang, Long Island).
- If foreign national: mention RAP permit on arrival.

The summary line should feel hand-crafted — mention 2–3 real spots that fit this exact profile.`;

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
  const parsed = JSON.parse(args);
  const warn = seasonWarning(inputs.start_date);
  if (warn) parsed.season_warning = warn;
  return parsed;
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