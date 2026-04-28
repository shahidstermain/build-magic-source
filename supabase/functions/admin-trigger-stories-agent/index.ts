// Admin-only proxy that triggers andaman-stories-agent.
// Verifies the caller is an authenticated admin, then proxies to the stories
// agent with NEWS_AGENT_SECRET (reused). Always returns 200 to the client with
// a structured payload so the admin UI can show the real error reason.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const NEWS_AGENT_SECRET = Deno.env.get("NEWS_AGENT_SECRET");

    if (!NEWS_AGENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "NEWS_AGENT_SECRET not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("[trigger-stories] getUser failed:", userErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      console.error("[trigger-stories] role check failed:", roleErr?.message);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let res: Response;
    try {
      res = await fetch(
        `${SUPABASE_URL}/functions/v1/andaman-stories-agent`,
        {
          method: "POST",
          headers: {
            "x-cron-secret": NEWS_AGENT_SECRET,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[trigger-stories] upstream fetch threw:", msg);
      return new Response(
        JSON.stringify({ status: "error", error: `upstream_unreachable: ${msg}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = await res.text();
    console.log(
      `[trigger-stories] upstream status=${res.status} body=`,
      text.slice(0, 500),
    );
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      payload = {
        status: "error",
        upstream_status: res.status,
        error:
          (payload as { error?: string }).error ??
          (payload as { reason?: string }).reason ??
          (payload as { raw?: string }).raw ??
          `upstream returned ${res.status}`,
        ...payload,
      };
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[trigger-stories] handler error:", msg);
    return new Response(JSON.stringify({ status: "error", error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});