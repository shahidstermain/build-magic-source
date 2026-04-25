// Supabase "Send Email" Auth Hook → Resend
// Verifies the standard webhook signature and sends a branded email.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  renderAuthEmail,
  type AuthAction,
} from "../_shared/emails/templates.tsx";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace(
  /^v1,whsec_/,
  "",
);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM = "AndamanBazaar <hello@andamanbazaar.in>";
const REPLY_TO = "support@andamanbazaar.in";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

interface HookPayload {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: AuthAction;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildConfirmationUrl(p: HookPayload): string {
  const { token_hash, email_action_type, redirect_to, site_url } = p.email_data;
  const base = (site_url || SUPABASE_URL).replace(/\/$/, "");
  const params = new URLSearchParams({
    token: token_hash,
    type: email_action_type,
    redirect_to: redirect_to ?? "",
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

async function logAttempt(row: Record<string, unknown>) {
  try {
    await admin.from("email_logs").insert(row);
  } catch (err) {
    console.error("email_logs insert failed", err);
  }
}

async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await admin
    .from("email_suppressions")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [payload.to],
      reply_to: REPLY_TO,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      tags: [{ name: "category", value: "auth" }],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: json?.message ?? `HTTP ${res.status}` };
  }
  return { id: json?.id };
}

async function sendWithRetry(args: Parameters<typeof sendViaResend>[0]) {
  let lastErr = "unknown";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await sendViaResend(args);
    if (r.id) return { ...r, attempt };
    lastErr = r.error ?? "unknown";
    // backoff 250ms, 750ms
    await new Promise((res) => setTimeout(res, 250 * attempt * attempt));
  }
  return { error: lastErr, attempt: 3 };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: HookPayload;
  try {
    if (!HOOK_SECRET) throw new Error("SEND_EMAIL_HOOK_SECRET not set");
    const wh = new Webhook(HOOK_SECRET);
    payload = wh.verify(raw, headers) as HookPayload;
  } catch (err) {
    console.error("Webhook verification failed", err);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: "invalid signature" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const recipient = payload.user.email;
  const action = payload.email_data.email_action_type;

  // Suppression check
  if (await isSuppressed(recipient)) {
    await logAttempt({
      recipient,
      template: action,
      status: "suppressed",
      provider: "resend",
      error: "recipient on suppression list",
    });
    return new Response(JSON.stringify({ skipped: "suppressed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = buildConfirmationUrl(payload);
  const { subject, html, text, template } = await renderAuthEmail({
    action,
    url,
    token: payload.email_data.token,
    email: payload.user.email,
    newEmail: payload.user.new_email,
  });

  const result = await sendWithRetry({ to: recipient, subject, html, text });

  if (result.id) {
    await logAttempt({
      recipient,
      template,
      subject,
      status: "sent",
      provider: "resend",
      provider_message_id: result.id,
      attempt: result.attempt,
    });
    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  await logAttempt({
    recipient,
    template,
    subject,
    status: "failed",
    provider: "resend",
    error: result.error,
    attempt: result.attempt,
  });
  return new Response(
    JSON.stringify({
      error: { http_code: 502, message: result.error ?? "send failed" },
    }),
    { status: 502, headers: { "Content-Type": "application/json" } },
  );
});