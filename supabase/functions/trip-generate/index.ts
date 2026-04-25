import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Itinerary = {
  cover: { title: string; subtitle: string; dates: string; days: number; budget: string; traveller: string };
  overview: string;
  days: Array<{
    day: number;
    date: string;
    island: string;
    morning: string;
    afternoon: string;
    evening: string;
    ferry?: string;
    weather_backup: string;
    insider_tip: string;
  }>;
  ferry_logistics: string[];
  budget: { items: Array<{ label: string; amount_inr: number }>; total_inr: number };
  recommendations: { food: string[]; hidden: string[]; marketplace: string[] };
  packing: string[];
  emergency: string[];
  closing: string;
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
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number" },
          date: { type: "string" },
          island: { type: "string" },
          morning: { type: "string" },
          afternoon: { type: "string" },
          evening: { type: "string" },
          ferry: { type: "string" },
          weather_backup: { type: "string" },
          insider_tip: { type: "string" },
        },
        required: ["day", "date", "island", "morning", "afternoon", "evening", "weather_backup", "insider_tip"],
        additionalProperties: false,
      },
    },
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
            },
            required: ["label", "amount_inr"],
            additionalProperties: false,
          },
        },
        total_inr: { type: "number" },
      },
      required: ["items", "total_inr"],
      additionalProperties: false,
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
  },
  required: ["cover", "overview", "days", "ferry_logistics", "budget", "recommendations", "packing", "emergency", "closing"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an Andaman Islands local insider, ferry logistics expert, and budget optimiser.
Produce a realistic, conservative day-by-day itinerary grounded in real Andaman geography
(Port Blair, Havelock/Swaraj Dweep, Neil/Shaheed Dweep, Baratang, Long Island, Diglipur).

Hard rules:
- NEVER schedule impossible ferry sequences. Inter-island days require an explicit ferry slot
  (Makruzz / Green Ocean / Nautika typical morning 06:30–08:30 or afternoon 11:30–14:30 windows)
  with a 90-minute buffer before departure.
- Max ONE inter-island transfer per day.
- Day 1 = Port Blair arrival logistics only (no Havelock same-day unless flight lands before 10:00).
- Last day = back to Port Blair before 18:00 (allow weather buffer).
- Always include a weather_backup activity for each day.
- Budget tier maps to ₹/day: low ≈ ₹1.5–2.5k, medium ≈ ₹3–5k, high ≈ ₹6k+ (excluding flights).
- Marketplace cross-sell: when itinerary needs a scooter, snorkel gear, surfing gear, etc., add a
  recommendations.marketplace line like "Rent a scooter — check AndamanBazaar /listings?category=bikes".
- No generic tourist fluff. Be specific, concise, practical. Mention real spots
  (Radhanagar Beach, Elephant Beach, Bharatpur, Laxmanpur, Cellular Jail, Ross Island, Kalapathar, etc.).
- Respect the user's interests and preferred islands when given.

Output ONLY via the provided tool. Do not write prose outside the tool call.`;

async function generateItinerary(inputs: any): Promise<Itinerary> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Build the itinerary for these inputs:\n${JSON.stringify(inputs, null, 2)}` },
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
  return JSON.parse(args) as Itinerary;
}

// ---------- PDF rendering ----------

const PRIMARY = rgb(0.04, 0.45, 0.51);   // teal accent (matches sea palette)
const ACCENT = rgb(0.95, 0.55, 0.10);    // marigold orange
const INK = rgb(0.10, 0.13, 0.16);
const MUTED = rgb(0.38, 0.42, 0.46);
const RULE = rgb(0.85, 0.87, 0.89);
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

function sanitize(text: string): string {
  // pdf-lib's WinAnsi can't encode many unicode chars (em dash, smart quotes, ₹).
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u20B9/g, "Rs ")
    .replace(/\u00A0/g, " ")
    // Strip any remaining non-WinAnsi chars
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

  const usableW = PAGE_W - MARGIN * 2;

  // ---------- helpers ----------
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function ensure(space: number) {
    if (y - space < MARGIN + 30) newPage();
  }

  function drawText(text: string, opts: { font?: any; size?: number; color?: any; gap?: number } = {}) {
    const f = opts.font ?? font;
    const size = opts.size ?? 10.5;
    const color = opts.color ?? INK;
    const lines = wrap(text, f, size, usableW);
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
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
      thickness: 0.5,
      color: RULE,
    });
    y -= 10;
  }

  function bullets(items: string[]) {
    for (const item of items) {
      const lines = wrap(item, font, 10.5, usableW - 14);
      ensure((lines.length) * 14 + 2);
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

  // ---------- COVER ----------
  page.drawRectangle({ x: 0, y: PAGE_H - 240, width: PAGE_W, height: 240, color: PRIMARY });
  page.drawText("ANDAMANBAZAAR", { x: MARGIN, y: PAGE_H - 90, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText("AI Trip Planner", { x: MARGIN, y: PAGE_H - 108, size: 11, font, color: rgb(0.85, 0.95, 0.97) });

  const title = sanitize(itinerary.cover.title);
  const titleLines = wrap(title, bold, 28, usableW);
  let ty = PAGE_H - 150;
  for (const t of titleLines.slice(0, 2)) {
    page.drawText(t, { x: MARGIN, y: ty, size: 28, font: bold, color: rgb(1, 1, 1) });
    ty -= 32;
  }
  page.drawText(sanitize(itinerary.cover.subtitle), {
    x: MARGIN, y: ty - 4, size: 12, font, color: rgb(0.9, 0.97, 0.98),
  });

  // Cover meta
  y = PAGE_H - 290;
  labelRow("Dates", itinerary.cover.dates);
  labelRow("Days", String(itinerary.cover.days));
  labelRow("Traveller", itinerary.cover.traveller);
  labelRow("Budget", itinerary.cover.budget);

  y -= 12;
  rule();
  heading("Trip overview", 2);
  drawText(itinerary.overview, { gap: 6 });

  // ---------- DAYS ----------
  newPage();
  heading("Day-by-day itinerary", 1);

  for (const d of itinerary.days) {
    ensure(120);
    heading(`Day ${d.day} · ${d.date} · ${d.island}`, 2);
    if (d.ferry) labelRow("Ferry", d.ferry);
    labelRow("Morning", d.morning);
    labelRow("Afternoon", d.afternoon);
    labelRow("Evening", d.evening);
    labelRow("Bad weather", d.weather_backup);
    labelRow("Local tip", d.insider_tip);
    rule();
  }

  // ---------- FERRY ----------
  newPage();
  heading("Ferry & travel logistics", 1);
  bullets(itinerary.ferry_logistics);

  // ---------- BUDGET ----------
  ensure(40);
  heading("Budget estimate", 1);
  for (const item of itinerary.budget.items) {
    ensure(16);
    page.drawText(sanitize(item.label), { x: MARGIN, y, size: 10.5, font, color: INK });
    const amt = `Rs ${item.amount_inr.toLocaleString("en-IN")}`;
    const w = font.widthOfTextAtSize(amt, 10.5);
    page.drawText(amt, { x: PAGE_W - MARGIN - w, y, size: 10.5, font, color: INK });
    y -= 14;
  }
  rule();
  ensure(20);
  page.drawText("Total estimate", { x: MARGIN, y, size: 12, font: bold, color: PRIMARY });
  const total = `Rs ${itinerary.budget.total_inr.toLocaleString("en-IN")}`;
  const tw = bold.widthOfTextAtSize(total, 12);
  page.drawText(total, { x: PAGE_W - MARGIN - tw, y, size: 12, font: bold, color: PRIMARY });
  y -= 24;

  // ---------- RECOMMENDATIONS ----------
  newPage();
  heading("Local recommendations", 1);
  heading("Where to eat", 2);
  bullets(itinerary.recommendations.food);
  heading("Hidden spots", 2);
  bullets(itinerary.recommendations.hidden);
  heading("From AndamanBazaar marketplace", 2);
  bullets(itinerary.recommendations.marketplace);

  // ---------- PACKING ----------
  newPage();
  heading("Packing checklist", 1);
  bullets(itinerary.packing);

  // ---------- EMERGENCY ----------
  ensure(40);
  heading("Emergency & practical tips", 1);
  bullets(itinerary.emergency);

  // ---------- CLOSING ----------
  ensure(60);
  rule();
  heading("Boat pe bharosa", 2);
  drawText(itinerary.closing);
  drawText("Built with AndamanBazaar AI Trip Planner · andamanbazaar.in", {
    size: 9, color: MUTED,
  });

  // ---------- footers / page numbers ----------
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return; // skip cover
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

// ---------- entry ----------

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

    let itinerary: Itinerary;
    try {
      itinerary = await generateItinerary(trip.inputs);
    } catch (e) {
      await admin.from("trip_requests").update({
        status: "failed", error: (e as Error).message,
      }).eq("id", tripId);
      throw e;
    }

    const pdfBytes = await buildPdf(itinerary);
    const path = `${user.id}/${tripId}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from("trip-pdfs")
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    await admin.from("trip_pdfs").insert({
      trip_id: tripId,
      user_id: user.id,
      storage_path: path,
    });

    await admin.from("trip_requests").update({
      status: "generated",
      itinerary,
    }).eq("id", tripId);

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