// Resend webhook → updates email_logs and suppression list.
// Verifies the Svix signature using RESEND_WEBHOOK_SECRET.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = (Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "").replace(
  /^whsec_/,
  "",
);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const SUPPRESS_REASONS: Record<string, string> = {
  "email.bounced": "bounce",
  "email.complained": "complaint",
  "email.unsubscribed": "unsubscribe",
};

const STATUS_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.unsubscribed": "unsubscribed",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: any;
  try {
    if (!SECRET) throw new Error("RESEND_WEBHOOK_SECRET not set");
    const wh = new Webhook(SECRET);
    event = wh.verify(raw, headers);
  } catch (err) {
    console.error("Resend webhook signature failed", err);
    return new Response("invalid signature", { status: 401 });
  }

  const type: string = event?.type ?? "unknown";
  const data = event?.data ?? {};
  const messageId: string | undefined = data?.email_id ?? data?.id;
  const to: string | undefined = Array.isArray(data?.to) ? data.to[0] : data?.to;
  const status = STATUS_MAP[type] ?? type;

  // Append a log row for this event
  if (messageId || to) {
    const { error } = await admin.from("email_logs").insert({
      recipient: (to ?? "unknown").toLowerCase(),
      template: data?.tags?.find?.((t: any) => t?.name === "category")?.value ?? "auth",
      status,
      provider: "resend",
      provider_message_id: messageId ?? null,
      metadata: { event: type, payload: data },
    });
    if (error) console.error("log insert failed", error);
  }

  // Suppress on bounce / complaint / unsubscribe
  const reason = SUPPRESS_REASONS[type];
  if (reason && to) {
    const { error } = await admin
      .from("email_suppressions")
      .upsert(
        {
          email: to.toLowerCase(),
          reason,
          source: "resend",
          metadata: { event: type, message_id: messageId ?? null },
        },
        { onConflict: "email" },
      );
    if (error) console.error("suppression upsert failed", error);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});