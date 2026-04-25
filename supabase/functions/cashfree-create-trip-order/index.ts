import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRIP_PRICE_INR = 49;

function cashfreeBaseUrl() {
  const env = (Deno.env.get("CASHFREE_ENV") ?? "sandbox").toLowerCase();
  return env === "production" || env === "live"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const appId = Deno.env.get("CASHFREE_APP_ID");
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    if (!appId || !secretKey) throw new Error("Cashfree credentials not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const tripId: string | undefined = body?.trip_id;
    if (!tripId) throw new Error("trip_id is required");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trip, error: tripErr } = await admin
      .from("trip_requests")
      .select("id, user_id, status")
      .eq("id", tripId)
      .maybeSingle();
    if (tripErr) throw tripErr;
    if (!trip) throw new Error("Trip not found");
    if (trip.user_id !== user.id) throw new Error("Forbidden");
    if (["paid", "generating", "generated"].includes(trip.status)) {
      throw new Error("Trip already paid or generated");
    }

    const orderId = `trip_${tripId.slice(0, 8)}_${Date.now()}`;

    const cfRes = await fetch(`${cashfreeBaseUrl()}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: TRIP_PRICE_INR,
        order_currency: "INR",
        customer_details: {
          customer_id: user.id,
          customer_email: user.email ?? "trip@andamanbazaar.app",
          customer_phone: (user.user_metadata as any)?.phone ?? "9999999999",
          customer_name:
            (user.user_metadata as any)?.name ?? "Andaman Bazaar User",
        },
        order_meta: { trip_id: tripId, purpose: "trip_plan" },
        order_note: `AI Andaman Trip Plan ${tripId.slice(0, 8)}`,
      }),
    });

    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson?.payment_session_id) {
      console.error("Cashfree create trip order failed", cfJson);
      throw new Error(cfJson?.message ?? "Failed to create Cashfree order");
    }

    const { error: insErr } = await admin.from("payments").insert({
      user_id: user.id,
      trip_id: tripId,
      purpose: "trip_plan",
      amount: TRIP_PRICE_INR,
      currency: "INR",
      status: "created",
      razorpay_order_id: orderId,
      notes: { provider: "cashfree", cf_order_id: cfJson.cf_order_id ?? null, trip_id: tripId },
    });
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        order_id: orderId,
        payment_session_id: cfJson.payment_session_id,
        cf_order_id: cfJson.cf_order_id,
        env: (Deno.env.get("CASHFREE_ENV") ?? "sandbox").toLowerCase(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("cashfree-create-trip-order error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});