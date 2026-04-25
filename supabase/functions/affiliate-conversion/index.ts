import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-affiliate-signature",
};

/**
 * Server-side affiliate conversion ingestion.
 *
 * Auth: HMAC-SHA256 signature over the raw request body using
 * `AFFILIATE_CONVERSION_SECRET`. Header: `x-affiliate-signature: <hex>`.
 *
 * Request body:
 * {
 *   recommendation_id?: string,
 *   click_id?: string,
 *   user_id?: string,
 *   external_order_id?: string,
 *   amount_inr?: number,
 *   commission_inr?: number,
 *   status?: "pending" | "confirmed" | "rejected" | "paid",
 *   raw_payload?: object
 * }
 */

async function verifySignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const secret = Deno.env.get("AFFILIATE_CONVERSION_SECRET");
    if (!secret) throw new Error("AFFILIATE_CONVERSION_SECRET not configured");

    const rawBody = await req.text();
    const sig = req.headers.get("x-affiliate-signature");
    const ok = await verifySignature(rawBody, sig, secret);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recommendationId =
      typeof body.recommendation_id === "string" ? body.recommendation_id : null;
    const clickId = typeof body.click_id === "string" ? body.click_id : null;
    const userId = typeof body.user_id === "string" ? body.user_id : null;
    const externalOrderId =
      typeof body.external_order_id === "string" ? body.external_order_id : null;
    const amountInr = Number.isFinite(body.amount_inr) ? Math.round(body.amount_inr) : null;
    const commissionInr = Number.isFinite(body.commission_inr)
      ? Math.round(body.commission_inr)
      : null;
    const status = ["pending", "confirmed", "rejected", "paid"].includes(body.status)
      ? body.status
      : "pending";
    const rawPayload = body.raw_payload && typeof body.raw_payload === "object" ? body.raw_payload : {};

    if (!recommendationId && !clickId && !externalOrderId) {
      return new Response(
        JSON.stringify({ error: "Need recommendation_id, click_id or external_order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("record_affiliate_conversion", {
      _recommendation_id: recommendationId,
      _click_id: clickId,
      _user_id: userId,
      _external_order_id: externalOrderId,
      _amount_inr: amountInr,
      _commission_inr: commissionInr,
      _status: status,
      _raw_payload: rawPayload,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, conversion_id: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("affiliate-conversion error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});