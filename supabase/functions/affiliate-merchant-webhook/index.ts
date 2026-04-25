import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-vendor-signature",
};

/**
 * Per-vendor merchant webhook for affiliate conversions.
 *
 * URL: /functions/v1/affiliate-merchant-webhook?vendor=<slug>
 * Auth: HMAC-SHA256 hex over the raw body using the vendor's `webhook_secret`.
 *       Header: `x-vendor-signature: <hex>`.
 *
 * Body (JSON):
 * {
 *   click_id?: string,
 *   recommendation_id?: string,
 *   external_order_id: string,
 *   amount_inr?: number,
 *   commission_inr?: number,
 *   status?: "pending"|"confirmed"|"rejected"|"paid",
 *   raw_payload?: object
 * }
 */

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const vendorSlug = url.searchParams.get("vendor");
    if (!vendorSlug) return jsonResponse({ error: "Missing vendor slug" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: vendor, error: vErr } = await admin
      .from("affiliate_vendors")
      .select("id, slug, webhook_secret, active")
      .eq("slug", vendorSlug)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!vendor) return jsonResponse({ error: "Vendor not found" }, 404);
    if (!vendor.active) return jsonResponse({ error: "Vendor inactive" }, 403);
    if (!vendor.webhook_secret)
      return jsonResponse({ error: "Vendor has no webhook secret configured" }, 403);

    const rawBody = await req.text();
    const sig = req.headers.get("x-vendor-signature") ?? "";
    const expected = await hmacHex(vendor.webhook_secret, rawBody);
    if (!sig || !safeEqual(expected, sig.toLowerCase())) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const recommendationId = typeof body.recommendation_id === "string" ? body.recommendation_id : null;
    const clickId = typeof body.click_id === "string" ? body.click_id : null;
    const externalOrderId = typeof body.external_order_id === "string" ? body.external_order_id : null;
    const amount = Number(body.amount_inr);
    const commission = Number(body.commission_inr);
    const amountInr = Number.isFinite(amount) ? Math.round(amount) : null;
    const commissionInr = Number.isFinite(commission) ? Math.round(commission) : null;
    const statusInput = typeof body.status === "string" ? body.status : "pending";
    const status = ["pending", "confirmed", "rejected", "paid"].includes(statusInput)
      ? statusInput
      : "pending";
    const rawPayload = body.raw_payload && typeof body.raw_payload === "object" ? body.raw_payload : body;

    if (!externalOrderId && !clickId && !recommendationId) {
      return jsonResponse(
        { error: "Need external_order_id, click_id or recommendation_id" },
        400,
      );
    }

    const { data: convId, error } = await admin.rpc("record_affiliate_conversion", {
      _recommendation_id: recommendationId,
      _click_id: clickId,
      _user_id: null,
      _external_order_id: externalOrderId,
      _amount_inr: amountInr,
      _commission_inr: commissionInr,
      _status: status,
      _raw_payload: { ...rawPayload, _vendor_slug: vendor.slug },
    });
    if (error) throw error;

    // Tag the conversion as 'webhook' (default) and set vendor_id explicitly.
    if (convId) {
      await admin
        .from("affiliate_conversions")
        .update({ vendor_id: vendor.id, source: "webhook" })
        .eq("id", convId);
    }

    return jsonResponse({ ok: true, conversion_id: convId });
  } catch (err) {
    console.error("affiliate-merchant-webhook error", err);
    return jsonResponse({ error: (err as Error).message ?? "Unknown error" }, 400);
  }
});