import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  session_id: string;
  path: string;
  referer: string;
  user_agent: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<Payload>;
    const session_id = String(body.session_id ?? "").slice(0, 100);
    const path = String(body.path ?? "/").slice(0, 200);
    const referer = String(body.referer ?? "").slice(0, 300);
    const user_agent = String(body.user_agent ?? "").slice(0, 300);

    if (!session_id || session_id.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: "bad_session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Read settings
    const { data: settings } = await admin
      .from("site_settings")
      .select(
        "visitor_alerts_enabled, visitor_alerts_email_enabled, visitor_alert_email, visitor_alerts_webhook_enabled, visitor_alert_webhook_url",
      )
      .eq("id", true)
      .maybeSingle();

    if (!settings || settings.visitor_alerts_enabled === false) {
      return new Response(JSON.stringify({ ok: true, dispatched: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dispatched: string[] = [];
    const payload = {
      event: "new_visitor",
      session_id,
      path,
      referer,
      user_agent,
      occurred_at: new Date().toISOString(),
    };

    // Webhook
    if (
      settings.visitor_alerts_webhook_enabled &&
      settings.visitor_alert_webhook_url
    ) {
      try {
        const url = new URL(settings.visitor_alert_webhook_url);
        if (url.protocol === "https:" || url.protocol === "http:") {
          await fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          dispatched.push("webhook");
        }
      } catch (e) {
        console.error("webhook failed", e);
      }
    }

    // Email via Resend
    if (
      settings.visitor_alerts_email_enabled &&
      settings.visitor_alert_email
    ) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          const subject = `New visitor on AndamanBazaar — ${path}`;
          const html = `
            <h2>New visitor</h2>
            <p>A new visitor just landed on your site.</p>
            <ul>
              <li><strong>Path:</strong> ${escapeHtml(path)}</li>
              <li><strong>Referer:</strong> ${escapeHtml(referer || "(direct)")}</li>
              <li><strong>User agent:</strong> ${escapeHtml(user_agent)}</li>
              <li><strong>Session:</strong> ${escapeHtml(session_id)}</li>
              <li><strong>Time:</strong> ${payload.occurred_at}</li>
            </ul>
          `;
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AndamanBazaar <noreply@andamanbazaar.in>",
              to: [settings.visitor_alert_email],
              subject,
              html,
            }),
          });
          if (r.ok) dispatched.push("email");
          else console.error("resend failed", r.status, await r.text());
        } catch (e) {
          console.error("email failed", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}