import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isSafeHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get("SUPABASE_JWKS") ?? ""));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const recId = url.searchParams.get("rec");
  const fallback = url.searchParams.get("u"); // optional vendor-direct fallback

  if (!recId && !fallback) {
    return new Response(JSON.stringify({ error: "Missing rec or u" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Best-effort: attribute click to logged-in user if Authorization header present
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      /* ignore */
    }
  }

  let target: string | null = null;
  let vendorId: string | null = null;
  let tripId: string | null = null;

  if (recId) {
    const { data: rec } = await admin
      .from("trip_recommendations")
      .select("id, affiliate_url, vendor_id, trip_id, user_id, click_count")
      .eq("id", recId)
      .maybeSingle();
    if (rec) {
      target = rec.affiliate_url;
      vendorId = rec.vendor_id;
      tripId = rec.trip_id;
      if (!userId) userId = rec.user_id;
      // increment click_count (best-effort; ignore race conditions)
      await admin
        .from("trip_recommendations")
        .update({ click_count: (rec.click_count ?? 0) + 1 })
        .eq("id", rec.id);
    }
  }

  if (!target && fallback) target = fallback;

  if (!target || !isSafeHttpUrl(target)) {
    return new Response(JSON.stringify({ error: "Invalid target" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log click
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  const ipHash = ip ? await hashIp(ip) : null;

  await admin.from("affiliate_clicks").insert({
    recommendation_id: recId,
    vendor_id: vendorId,
    trip_id: tripId,
    user_id: userId,
    affiliate_url: target,
    referer: req.headers.get("referer"),
    user_agent: req.headers.get("user-agent"),
    ip_hash: ipHash,
  });

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: target },
  });
});