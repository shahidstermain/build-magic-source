import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cashfreeBaseUrl() {
  const env = (Deno.env.get("CASHFREE_ENV") ?? "sandbox").toLowerCase();
  return env === "production" || env === "live"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    if (!appId || !secretKey) {
      throw new Error("Cashfree credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.order_id;
    if (!orderId) throw new Error("order_id is required");

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch payment row (and ensure caller owns it)
    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("id, user_id, listing_id, status, amount")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    if (payErr) throw payErr;
    if (!payment) throw new Error("Payment record not found");
    if (payment.user_id !== user.id) throw new Error("Forbidden");

    // Verify with Cashfree
    const cfRes = await fetch(
      `${cashfreeBaseUrl()}/orders/${orderId}/payments`,
      {
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": appId,
          "x-client-secret": secretKey,
        },
      },
    );
    const cfJson = await cfRes.json();
    if (!cfRes.ok) {
      console.error("Cashfree verify failed", cfJson);
      throw new Error(cfJson?.message ?? "Verification call failed");
    }

    const successPayment = Array.isArray(cfJson)
      ? cfJson.find((p: any) => p.payment_status === "SUCCESS")
      : null;

    if (!successPayment) {
      await admin
        .from("payments")
        .update({
          status: "failed",
          notes: { provider: "cashfree", attempts: cfJson },
        })
        .eq("id", payment.id);
      return new Response(
        JSON.stringify({ status: "failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Mark paid + boost listing
    const { error: updateErr } = await admin
      .from("payments")
      .update({
        status: "paid",
        razorpay_payment_id: String(successPayment.cf_payment_id ?? ""),
        razorpay_signature: successPayment.payment_method
          ? JSON.stringify(successPayment.payment_method).slice(0, 500)
          : null,
        notes: { provider: "cashfree", payment: successPayment },
      })
      .eq("id", payment.id);
    if (updateErr) throw updateErr;

    if (payment.listing_id) {
      await admin
        .from("listings")
        .update({ is_featured: true })
        .eq("id", payment.listing_id)
        .eq("seller_id", user.id);
    }

    return new Response(
      JSON.stringify({ status: "paid" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("cashfree-verify-payment error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});