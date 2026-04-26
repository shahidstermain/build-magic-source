// Send a notification email to support@andamanbazaar.in when a trip planning
// callback request is submitted. Resend handles delivery.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "AndamanBazaar <hello@andamanbazaar.in>";
const SUPPORT_INBOX = "support@andamanbazaar.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadPayload {
  name?: unknown;
  whatsapp?: unknown;
  travel_from?: unknown;
  travel_to?: unknown;
  travelers?: unknown;
  budget_range?: unknown;
  query?: unknown;
  preferred_call_time?: unknown;
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;width:180px;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#1e293b;">${escapeHtml(value)}</td>
  </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return bad(405, "method_not_allowed");

  let payload: LeadPayload;
  try {
    payload = await req.json();
  } catch {
    return bad(400, "invalid_json");
  }

  const name = String(payload.name ?? "").trim().slice(0, 100);
  const whatsapp = String(payload.whatsapp ?? "").trim().slice(0, 30);
  const travelFrom = String(payload.travel_from ?? "").trim().slice(0, 20);
  const travelTo = String(payload.travel_to ?? "").trim().slice(0, 20);
  const travelers = String(payload.travelers ?? "").trim().slice(0, 5);
  const budget = String(payload.budget_range ?? "").trim().slice(0, 80);
  const query = String(payload.query ?? "").trim().slice(0, 500);
  const callTime = String(payload.preferred_call_time ?? "").trim().slice(0, 80);

  if (!name || !whatsapp || !travelFrom || !travelTo || !travelers || !budget) {
    return bad(400, "missing_required_fields");
  }

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:600px;">
  <h2 style="color:#0ea5e9;margin:0 0 8px;">🌊 New Trip Planning Lead</h2>
  <p style="color:#475569;margin:0 0 16px;">A traveler has requested a callback from an Andaman expert.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px;">
    ${row("Full name", name)}
    ${row("WhatsApp", whatsapp)}
    ${row("Travel dates", `${travelFrom} → ${travelTo}`)}
    ${row("Travelers", travelers)}
    ${row("Budget", budget)}
    ${row("Preferred call time", callTime || "—")}
    ${row("Custom query", query || "—")}
  </table>
  <p style="margin:16px 0 0;color:#64748b;font-size:12px;">Submitted via AndamanBazaar Trip Planner.</p>
</div>`.trim();

  const text = `New Trip Planning Lead\n\nName: ${name}\nWhatsApp: ${whatsapp}\nDates: ${travelFrom} → ${travelTo}\nTravelers: ${travelers}\nBudget: ${budget}\nCall time: ${callTime || "—"}\nQuery: ${query || "—"}\n`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [SUPPORT_INBOX],
        subject: `New trip lead — ${name} (${travelFrom} → ${travelTo})`,
        html,
        text,
        reply_to: undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend error", res.status, body);
      return bad(502, "email_send_failed");
    }
  } catch (err) {
    console.error("send-trip-lead error", err);
    return bad(502, "email_send_failed");
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});