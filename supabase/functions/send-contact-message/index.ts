// Contact form handler — sends a message to support@andamanbazaar.in via Resend
// and a confirmation email back to the submitter.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "AndamanBazaar <hello@andamanbazaar.in>";
const SUPPORT_INBOX = "support@andamanbazaar.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
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

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function sendViaResend(body: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return bad(405, "method_not_allowed");
  }

  let payload: ContactPayload;
  try {
    payload = await req.json();
  } catch {
    return bad(400, "invalid_json");
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const subject = String(payload.subject ?? "").trim();
  const message = String(payload.message ?? "").trim();

  if (!name || name.length > 100) return bad(400, "invalid_name");
  if (!email || !isEmail(email) || email.length > 255) return bad(400, "invalid_email");
  if (!subject || subject.length > 150) return bad(400, "invalid_subject");
  if (!message || message.length < 10 || message.length > 4000) {
    return bad(400, "invalid_message");
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  // 1. Notify support inbox
  const adminHtml = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px">
      <h2 style="margin:0 0 12px">New contact message</h2>
      <p style="margin:0 0 4px"><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <p style="margin:0 0 4px"><strong>Subject:</strong> ${safeSubject}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
      <div style="font-size:14px;line-height:1.6">${safeMessage}</div>
    </div>`;
  const adminText =
    `New contact message\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;

  const adminRes = await sendViaResend({
    from: FROM,
    to: [SUPPORT_INBOX],
    reply_to: email,
    subject: `[Contact] ${subject}`,
    html: adminHtml,
    text: adminText,
  });

  if (!adminRes.ok) {
    console.error("contact admin send failed", adminRes.status, adminRes.data);
    return bad(502, "send_failed");
  }

  // 2. Confirmation back to submitter (best-effort; don't fail request if this errors)
  const userHtml = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px">
      <h2 style="margin:0 0 12px">Thanks for reaching out, ${safeName}!</h2>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
        We've received your message and the AndamanBazaar team will get back to you
        within 1–2 working days (Mon–Sat, 9 AM – 6 PM IST).
      </p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569"><strong>Your subject:</strong> ${safeSubject}</p>
      <div style="margin-top:8px;padding:12px;border-left:3px solid #0ea5e9;background:#f0f9ff;font-size:13px;line-height:1.6;color:#0f172a">${safeMessage}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#64748b">
        — Team AndamanBazaar · Port Blair, A&amp;N Islands
      </p>
    </div>`;
  const userText =
    `Thanks for reaching out, ${name}!\n\nWe've received your message and will get back to you within 1–2 working days.\n\nYour subject: ${subject}\n\n${message}\n\n— Team AndamanBazaar`;

  const userRes = await sendViaResend({
    from: FROM,
    to: [email],
    reply_to: SUPPORT_INBOX,
    subject: "We've received your message — AndamanBazaar",
    html: userHtml,
    text: userText,
  });
  if (!userRes.ok) {
    console.error("contact confirmation send failed", userRes.status, userRes.data);
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});