import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- Types ----------

type DayPlan = {
  day: number;
  date: string;
  island: string;
  wake_time: string;
  morning: string;
  afternoon: string;
  evening: string;
  ferry?: string;
  travel_notes?: string;
  weather_backup: string;
  insider_tip: string;
  energy_level: "easy" | "moderate" | "active";
  estimated_spend_inr: number;
  marketplace_hint?: string;
};

type BudgetLine = { label: string; amount_inr: number; category?: string };

type Itinerary = {
  cover: { title: string; subtitle: string; dates: string; days: number; budget: string; traveller: string };
  overview: string;
  season_note: string;
  days: DayPlan[];
  ferry_plan: string[];
  ferry_logistics: string[];
  budget: {
    items: BudgetLine[];
    total_inr: number;
    per_person_inr: number;
    govt_vs_private_note?: string;
    savings_tip?: string;
  };
  food_guide: Array<{ island: string; picks: string[] }>;
  recommendations: { food: string[]; hidden: string[]; marketplace: string[] };
  packing: string[];
  emergency: string[];
  closing: string;
  conflicts_fixed: string[];
};

const ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    cover: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        dates: { type: "string" },
        days: { type: "number" },
        budget: { type: "string" },
        traveller: { type: "string" },
      },
      required: ["title", "subtitle", "dates", "days", "budget", "traveller"],
      additionalProperties: false,
    },
    overview: { type: "string" },
    season_note: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number" },
          date: { type: "string" },
          island: { type: "string" },
          wake_time: { type: "string" },
          morning: { type: "string" },
          afternoon: { type: "string" },
          evening: { type: "string" },
          ferry: { type: "string" },
          travel_notes: { type: "string" },
          weather_backup: { type: "string" },
          insider_tip: { type: "string" },
          energy_level: { type: "string", enum: ["easy", "moderate", "active"] },
          estimated_spend_inr: { type: "number" },
          marketplace_hint: { type: "string" },
        },
        required: ["day", "date", "island", "wake_time", "morning", "afternoon", "evening", "weather_backup", "insider_tip", "energy_level", "estimated_spend_inr"],
        additionalProperties: false,
      },
    },
    ferry_plan: { type: "array", items: { type: "string" }, description: "Visual ferry timeline lines, e.g. 'Day 2 · Port Blair → Havelock · Makruzz 06:30 (~2h, ₹1500)'" },
    ferry_logistics: { type: "array", items: { type: "string" } },
    budget: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              amount_inr: { type: "number" },
              category: { type: "string" },
            },
            required: ["label", "amount_inr"],
            additionalProperties: false,
          },
        },
        total_inr: { type: "number" },
        per_person_inr: { type: "number" },
        govt_vs_private_note: { type: "string" },
        savings_tip: { type: "string" },
      },
      required: ["items", "total_inr", "per_person_inr"],
      additionalProperties: false,
    },
    food_guide: {
      type: "array",
      items: {
        type: "object",
        properties: {
          island: { type: "string" },
          picks: { type: "array", items: { type: "string" } },
        },
        required: ["island", "picks"],
        additionalProperties: false,
      },
    },
    recommendations: {
      type: "object",
      properties: {
        food: { type: "array", items: { type: "string" } },
        hidden: { type: "array", items: { type: "string" } },
        marketplace: { type: "array", items: { type: "string" } },
      },
      required: ["food", "hidden", "marketplace"],
      additionalProperties: false,
    },
    packing: { type: "array", items: { type: "string" } },
    emergency: { type: "array", items: { type: "string" } },
    closing: { type: "string" },
    conflicts_fixed: { type: "array", items: { type: "string" } },
  },
  required: ["cover", "overview", "season_note", "days", "ferry_plan", "ferry_logistics", "budget", "food_guide", "recommendations", "packing", "emergency", "closing", "conflicts_fixed"],
  additionalProperties: false,
};

// ---------- Knowledge loader ----------

async function loadKnowledge(admin: any): Promise<any> {
  const { data } = await admin.from("andaman_knowledge").select("data").eq("id", true).maybeSingle();
  return data?.data ?? {};
}

function seasonContext(startDate: string, knowledge: any): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return "";
  const m = d.getMonth() + 1;
  const monsoon = (knowledge?.weather?.monsoon_months ?? [5, 6, 7, 8, 9]).includes(m);
  const peak = m === 12 || m === 1;
  const scubaClosed = (knowledge?.weather?.scuba_closed_months ?? [6, 7, 8, 9]).includes(m);
  const jelly = (knowledge?.weather?.jellyfish_caution_months ?? [3, 4, 5]).includes(m);
  const parts: string[] = [];
  if (monsoon) parts.push(knowledge?.weather?.monsoon_warning ?? "Monsoon season — many activities limited.");
  if (peak) parts.push(knowledge?.weather?.peak_pricing_warning ?? "Peak season — book ferries 2–3 months ahead.");
  if (scubaClosed) parts.push("Scuba is generally closed this month — substitute with snorkel-only or beach days where safer.");
  if (jelly) parts.push("Jellyfish caution this month at some Havelock/Neil spots — wear rashguard.");
  return parts.join(" ");
}

// ---------- AI generation ----------

function buildSystemPrompt(knowledge: any): string {
  return `You are an Andaman Islands local insider, ferry logistics expert, and budget optimiser who has lived there for years.
Generate a realistic, hyper-local day-by-day itinerary. Never tourist fluff. Every detail must be grounded in Andaman geography.

LOCAL KNOWLEDGE (authoritative — use these facts):
${JSON.stringify(knowledge, null, 2)}

HARD RULES (violation = invalid output):
- Inter-island days require an explicit ferry slot from the routes above with a 90–120 min buffer before departure.
- Max ONE inter-island transfer per day. Never schedule "morning Havelock → afternoon Neil → activity" — impossible.
- Day 1 = Port Blair arrival logistics + light afternoon (Cellular Jail, Corbyn Cove). No same-day Havelock unless flight lands before 10:00.
- Last day = back in Port Blair before 18:00 (weather buffer).
- Always include weather_backup for each day.
- If month falls in monsoon (May–Sept), prefer Port Blair-based plans; warn explicitly in season_note.
- If month is scuba-closed, do NOT recommend scuba; substitute snorkel or beach.
- Tribal reserves: NEVER recommend.
- For foreign nationals: skip restricted islands and mention RAP permit on arrival.
- For families with children: avoid difficult treks, prefer Neil over Havelock for calm water, shorter days.
- For seniors: no strenuous treks, road-accessible beaches, early plans, more rest.
- For low fitness: easy trails only, no Saddle Peak / long swims.
- For returning visitors: skip Cellular Jail / Radhanagar / standard Havelock loop unless requested; introduce Mayabunder, Diglipur, Baratang, Long Island.
- For vegetarians/vegans: surface backup snack note, prefer islands with veg restaurants.

PER-DAY OUTPUT must include:
- wake_time (e.g. "06:00 — ferry day"), morning, afternoon, evening (each with location + cost in ₹)
- ferry (only if travelling between islands)
- travel_notes (how to get there, time, cost)
- weather_backup (concrete alternative)
- insider_tip (one specific local tip)
- energy_level (easy/moderate/active)
- estimated_spend_inr (realistic ₹ for the day for the WHOLE GROUP)
- marketplace_hint (optional, only if scooter/snorkel/dive guide/camera makes sense)

BUDGET BREAKDOWN must include line items per category:
- Ferries (inter-island)
- Accommodation (per night × nights)
- Food (estimated per day × days)
- Activities (per person × travelers)
- Local transport (auto, bike rental)
- Permits and entry fees
- Contingency (10%)
And totals: total_inr (group) and per_person_inr.
Add govt_vs_private_note (₹ difference) and a savings_tip.

CONFLICT CHECKER (run before emitting):
- Re-read each day. If you find an impossible ferry+activity combo, fix it and add the fix to conflicts_fixed.
- If a day has zero meals or 8+ hour gap, fix it.
- If accommodation is on an island with no stay options in the knowledge, fix it.
- If activity needs advance booking but isn't mentioned, add a note in insider_tip.

Output ONLY via the tool. No prose outside the tool call.`;
}

async function callGateway(model: string, sys: string, userMsg: string): Promise<{ raw: any; parsed: Itinerary }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "emit_itinerary",
            description: "Emit the full Andaman trip itinerary.",
            parameters: ITINERARY_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "emit_itinerary" } },
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
  if (!args) throw new Error("AI returned no itinerary");
  return { raw: data, parsed: JSON.parse(args) as Itinerary };
}

// ---------- Server-side conflict checker (defensive) ----------

function runConflictChecker(it: Itinerary): string[] {
  const fixes: string[] = [...(it.conflicts_fixed ?? [])];
  if (!Array.isArray(it.days)) return fixes;

  for (let i = 0; i < it.days.length; i++) {
    const d = it.days[i];
    // Two ferry mentions on the same day?
    const ferryHits = (d.ferry ?? "").split(/→|->/).length - 1;
    if (ferryHits > 1) {
      fixes.push(`Day ${d.day}: detected multiple ferries — flagging as risky.`);
    }
    // Ferry + active energy on same day for budget tier?
    if (d.ferry && d.energy_level === "active") {
      fixes.push(`Day ${d.day}: ferry day combined with active activities — added rest buffer note.`);
      d.insider_tip = (d.insider_tip ? d.insider_tip + " " : "") +
        "Ferry days are tiring — keep afternoon light.";
    }
    // Missing backup?
    if (!d.weather_backup || d.weather_backup.length < 5) {
      d.weather_backup = "Spend the day at a covered café or visit local museum/market.";
      fixes.push(`Day ${d.day}: added a generic weather backup.`);
    }
    if (!d.wake_time) d.wake_time = "07:30";
  }
  return fixes;
}

// ---------- PDF rendering ----------

const PRIMARY = rgb(0.04, 0.45, 0.51);
const ACCENT = rgb(0.95, 0.55, 0.10);
const INK = rgb(0.10, 0.13, 0.16);
const MUTED = rgb(0.38, 0.42, 0.46);
const RULE = rgb(0.85, 0.87, 0.89);
const SOFT_BG = rgb(0.96, 0.97, 0.98);
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

function sanitize(text: string): string {
  if (text == null) return "";
  return String(text)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u20B9/g, "Rs ")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const trial = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPdf(itinerary: Itinerary): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const usableW = PAGE_W - MARGIN * 2;
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
  function ensure(space: number) { if (y - space < MARGIN + 30) newPage(); }

  function drawText(text: string, opts: { font?: any; size?: number; color?: any; gap?: number; indent?: number } = {}) {
    const f = opts.font ?? font;
    const size = opts.size ?? 10.5;
    const color = opts.color ?? INK;
    const indent = opts.indent ?? 0;
    const lines = wrap(text, f, size, usableW - indent);
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, { x: MARGIN + indent, y, size, font: f, color });
      y -= size + 4;
    }
    y -= opts.gap ?? 0;
  }

  function heading(text: string, level: 1 | 2 = 1) {
    const size = level === 1 ? 18 : 13;
    ensure(size + 14);
    if (level === 1) {
      page.drawRectangle({ x: MARGIN, y: y - 2, width: 4, height: size + 2, color: ACCENT });
      page.drawText(sanitize(text), { x: MARGIN + 12, y, size, font: bold, color: PRIMARY });
    } else {
      page.drawText(sanitize(text), { x: MARGIN, y, size, font: bold, color: INK });
    }
    y -= size + 8;
  }

  function rule() {
    ensure(14);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: PAGE_W - MARGIN, y: y + 4 },
      thickness: 0.5, color: RULE,
    });
    y -= 10;
  }

  function bullets(items: string[]) {
    for (const item of items ?? []) {
      const lines = wrap(item, font, 10.5, usableW - 14);
      ensure(lines.length * 14 + 2);
      page.drawText("•", { x: MARGIN, y, size: 11, font: bold, color: ACCENT });
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x: MARGIN + 12, y, size: 10.5, font, color: INK });
        y -= 14;
      }
    }
    y -= 4;
  }

  function labelRow(label: string, value: string) {
    ensure(16);
    page.drawText(sanitize(label), { x: MARGIN, y, size: 9.5, font: bold, color: MUTED });
    const lines = wrap(value, font, 10.5, usableW - 90);
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], { x: MARGIN + 90, y, size: 10.5, font, color: INK });
      y -= 14;
    }
    y -= 2;
  }

  function chip(text: string, x: number, color = PRIMARY) {
    const t = sanitize(text);
    const w = bold.widthOfTextAtSize(t, 8.5) + 12;
    page.drawRectangle({ x, y: y - 2, width: w, height: 14, color, opacity: 0.12 });
    page.drawText(t, { x: x + 6, y, size: 8.5, font: bold, color });
    return w + 6;
  }

  // ---------- COVER ----------
  page.drawRectangle({ x: 0, y: PAGE_H - 280, width: PAGE_W, height: 280, color: PRIMARY });
  page.drawText("ANDAMANBAZAAR", { x: MARGIN, y: PAGE_H - 90, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText("AI Trip Planner · Hyper-local Andaman expert", { x: MARGIN, y: PAGE_H - 108, size: 11, font, color: rgb(0.85, 0.95, 0.97) });

  const titleLines = wrap(itinerary.cover.title, bold, 26, usableW);
  let ty = PAGE_H - 150;
  for (const t of titleLines.slice(0, 2)) {
    page.drawText(t, { x: MARGIN, y: ty, size: 26, font: bold, color: rgb(1, 1, 1) });
    ty -= 32;
  }
  page.drawText(sanitize(itinerary.cover.subtitle), {
    x: MARGIN, y: ty - 4, size: 12, font, color: rgb(0.9, 0.97, 0.98),
  });

  y = PAGE_H - 320;
  labelRow("Dates", itinerary.cover.dates);
  labelRow("Days", String(itinerary.cover.days));
  labelRow("Traveller", itinerary.cover.traveller);
  labelRow("Budget", itinerary.cover.budget);

  y -= 12;
  rule();
  heading("Trip overview", 2);
  drawText(itinerary.overview, { gap: 6 });

  if (itinerary.season_note) {
    ensure(40);
    page.drawRectangle({ x: MARGIN, y: y - 30, width: usableW, height: 36, color: ACCENT, opacity: 0.10 });
    page.drawText("SEASON NOTE", { x: MARGIN + 10, y: y - 8, size: 8.5, font: bold, color: ACCENT });
    const lines = wrap(itinerary.season_note, font, 10, usableW - 20);
    let yy = y - 22;
    for (const l of lines) {
      page.drawText(l, { x: MARGIN + 10, y: yy, size: 10, font, color: INK });
      yy -= 12;
    }
    y = yy - 6;
  }

  // ---------- DAYS ----------
  for (const d of itinerary.days ?? []) {
    newPage();
    heading(`Day ${d.day} · ${d.date} · ${d.island}`, 1);

    // Chips: energy level + spend
    let cx = MARGIN;
    cx += chip(`Energy: ${d.energy_level}`, cx, PRIMARY);
    cx += chip(`Wake ${d.wake_time}`, cx, MUTED);
    cx += chip(`Day spend Rs ${(d.estimated_spend_inr ?? 0).toLocaleString("en-IN")}`, cx, ACCENT);
    y -= 22;

    if (d.ferry) labelRow("Ferry", d.ferry);
    if (d.travel_notes) labelRow("Travel", d.travel_notes);
    labelRow("Morning", d.morning);
    labelRow("Afternoon", d.afternoon);
    labelRow("Evening", d.evening);
    labelRow("Bad weather", d.weather_backup);
    labelRow("Local tip", d.insider_tip);
    if (d.marketplace_hint) {
      ensure(20);
      page.drawRectangle({ x: MARGIN, y: y - 4, width: usableW, height: 20, color: SOFT_BG });
      page.drawText("MARKETPLACE", { x: MARGIN + 8, y, size: 8.5, font: bold, color: PRIMARY });
      page.drawText(sanitize(d.marketplace_hint), { x: MARGIN + 78, y, size: 9.5, font, color: INK });
      y -= 24;
    }
  }

  // ---------- FERRY PLAN ----------
  newPage();
  heading("Ferry plan", 1);
  bullets(itinerary.ferry_plan ?? []);
  heading("Ferry & travel logistics", 2);
  bullets(itinerary.ferry_logistics ?? []);

  // ---------- BUDGET ----------
  newPage();
  heading("Honest budget breakdown", 1);
  for (const item of itinerary.budget?.items ?? []) {
    ensure(16);
    page.drawText(sanitize(item.label), { x: MARGIN, y, size: 10.5, font, color: INK });
    const amt = `Rs ${(item.amount_inr ?? 0).toLocaleString("en-IN")}`;
    const w = font.widthOfTextAtSize(amt, 10.5);
    page.drawText(amt, { x: PAGE_W - MARGIN - w, y, size: 10.5, font, color: INK });
    y -= 14;
  }
  rule();
  ensure(40);
  page.drawText("Group total", { x: MARGIN, y, size: 12, font: bold, color: PRIMARY });
  const total = `Rs ${(itinerary.budget?.total_inr ?? 0).toLocaleString("en-IN")}`;
  const tw = bold.widthOfTextAtSize(total, 12);
  page.drawText(total, { x: PAGE_W - MARGIN - tw, y, size: 12, font: bold, color: PRIMARY });
  y -= 18;
  page.drawText("Per person", { x: MARGIN, y, size: 11, font: bold, color: INK });
  const pp = `Rs ${(itinerary.budget?.per_person_inr ?? 0).toLocaleString("en-IN")}`;
  const ppw = bold.widthOfTextAtSize(pp, 11);
  page.drawText(pp, { x: PAGE_W - MARGIN - ppw, y, size: 11, font: bold, color: INK });
  y -= 18;

  if (itinerary.budget?.govt_vs_private_note) {
    drawText("Govt vs private ferry: " + itinerary.budget.govt_vs_private_note, { font: italic, size: 10, color: MUTED });
  }
  if (itinerary.budget?.savings_tip) {
    drawText("Savings tip: " + itinerary.budget.savings_tip, { font: italic, size: 10, color: MUTED });
  }

  // ---------- FOOD GUIDE ----------
  if ((itinerary.food_guide ?? []).length > 0) {
    newPage();
    heading("Local food guide", 1);
    for (const fg of itinerary.food_guide) {
      heading(fg.island, 2);
      bullets(fg.picks ?? []);
    }
  }

  // ---------- RECOMMENDATIONS ----------
  newPage();
  heading("Local recommendations", 1);
  if (itinerary.recommendations?.food?.length) {
    heading("Don't miss eating", 2);
    bullets(itinerary.recommendations.food);
  }
  if (itinerary.recommendations?.hidden?.length) {
    heading("Hidden / offbeat spots", 2);
    bullets(itinerary.recommendations.hidden);
  }
  if (itinerary.recommendations?.marketplace?.length) {
    heading("From AndamanBazaar marketplace", 2);
    bullets(itinerary.recommendations.marketplace);
  }

  // ---------- PACKING ----------
  newPage();
  heading("Personalised packing checklist", 1);
  bullets(itinerary.packing ?? []);

  // ---------- EMERGENCY ----------
  ensure(40);
  heading("Emergency & practical numbers", 1);
  bullets(itinerary.emergency ?? []);

  // ---------- CONFLICTS FIXED (transparency) ----------
  if ((itinerary.conflicts_fixed ?? []).length > 0) {
    ensure(40);
    heading("Auto-corrections we applied", 2);
    drawText("We adjusted the plan to keep it realistic:", { font: italic, size: 10, color: MUTED });
    bullets(itinerary.conflicts_fixed);
  }

  // ---------- CLOSING ----------
  ensure(60);
  rule();
  heading("Boat pe bharosa", 2);
  drawText(itinerary.closing);
  drawText("Generated by AndamanBazaar — Your local Andaman expert · andamanbazaar.in", {
    size: 9, color: MUTED,
  });

  // ---------- footers ----------
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return;
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 8.5),
      y: 24, size: 8.5, font, color: MUTED,
    });
    p.drawText("AndamanBazaar AI Trip Planner", {
      x: MARGIN, y: 24, size: 8.5, font, color: MUTED,
    });
  });

  return await pdf.save();
}

// ---------- Entry ----------

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
    if (!tripId) throw new Error("trip_id is required");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trip, error: tripErr } = await admin
      .from("trip_requests")
      .select("id, user_id, inputs, status")
      .eq("id", tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");
    if (trip.user_id !== user.id) throw new Error("Forbidden");

    if (trip.status === "generated") {
      const { data: existing } = await admin
        .from("trip_pdfs")
        .select("storage_path")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ status: "generated", storage_path: existing.storage_path }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    if (trip.status !== "paid" && trip.status !== "failed") {
      throw new Error(`Trip not eligible for generation (status=${trip.status})`);
    }

    await admin.from("trip_requests").update({ status: "generating", error: null }).eq("id", tripId);

    const knowledge = await loadKnowledge(admin);
    const sys = buildSystemPrompt(knowledge);
    const seasonCtx = seasonContext((trip.inputs as any)?.start_date ?? "", knowledge);
    const userMsg = `Build the itinerary for these inputs:\n${JSON.stringify(trip.inputs, null, 2)}\n\nSeason context (must reflect in season_note + planning):\n${seasonCtx || "Standard season — no special warnings."}`;

    const model = "google/gemini-2.5-pro";
    const t0 = Date.now();
    let itinerary: Itinerary;
    let conflicts: string[] = [];
    try {
      const out = await callGateway(model, sys, userMsg);
      itinerary = out.parsed;
      conflicts = runConflictChecker(itinerary);
      itinerary.conflicts_fixed = conflicts;
    } catch (e) {
      const errMsg = (e as Error).message;
      await admin.from("trip_requests").update({ status: "failed", error: errMsg }).eq("id", tripId);
      await admin.from("trip_generation_logs").insert({
        trip_id: tripId, user_id: user.id, inputs: trip.inputs,
        status: "error", error: errMsg, model, duration_ms: Date.now() - t0,
      });
      throw e;
    }

    const pdfBytes = await buildPdf(itinerary);
    const path = `${user.id}/${tripId}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from("trip-pdfs")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw uploadErr;

    await admin.from("trip_pdfs").insert({
      trip_id: tripId, user_id: user.id, storage_path: path,
    });

    await admin.from("trip_requests").update({
      status: "generated", itinerary,
    }).eq("id", tripId);

    await admin.from("trip_generation_logs").insert({
      trip_id: tripId, user_id: user.id, inputs: trip.inputs,
      output: itinerary, conflicts_fixed: conflicts,
      status: "success", model, duration_ms: Date.now() - t0,
    });

    return new Response(JSON.stringify({ status: "generated", storage_path: path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    console.error("trip-generate error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
