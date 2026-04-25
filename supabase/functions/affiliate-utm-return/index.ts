import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Records a "soft" affiliate conversion when a shopper returns to the site
 * with `?ab_click=<click_id>&ab_amount=<inr>&ab_order=<external_id>`.
 *
 * Status is forced to `pending` since merchant has not yet confirmed.
 * Idempotent on (click_id, external_order_id).
 */

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
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const clickId = typeof body.click_id === "string" ? body.click_id : null;
    const externalOrderId =
      typeof body.external_order_id === "string" ? body.external_order_id : null;
    const amountRaw = Number(body.amount_inr);
    const amountInr =
      Number.isFinite(amountRaw) && amountRaw >= 0 && amountRaw < 10_000_000
        ? Math.round(amountRaw)
        : null;

    if (!clickId) return jsonResponse({ error: "Missing click_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up click for vendor + recommendation context
    const { data: click, error: cErr } = await admin
      .from("affiliate_clicks")
      .select("id, vendor_id, recommendation_id, user_id")
      .eq("id", clickId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!click) return jsonResponse({ error: "Unknown click" }, 404);

    const { data: convId, error } = await admin.rpc("record_affiliate_conversion", {
      _recommendation_id: click.recommendation_id,
      _click_id: click.id,
      _user_id: click.user_id,
      _external_order_id: externalOrderId,
      _amount_inr: amountInr,
      _commission_inr: null,
      _status: "pending",
      _raw_payload: { source: "utm_return" },
    });
    if (error) throw error;

    if (convId) {
      await admin
        .from("affiliate_conversions")
        .update({ vendor_id: click.vendor_id, source: "utm_return" })
        .eq("id", convId);
    }

    return jsonResponse({ ok: true, conversion_id: convId });
  } catch (err) {
    console.error("affiliate-utm-return error", err);
    return jsonResponse({ error: (err as Error).message ?? "Unknown error" }, 400);
  }
});