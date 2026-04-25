import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOOST_AMOUNT_INR = 99;

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
    const listingId: string | undefined = body?.listing_id;
    if (!listingId || typeof listingId !== "string") {
      throw new Error("listing_id is required");
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirm caller owns the listing
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id, seller_id, title")
      .eq("id", listingId)
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) throw new Error("Listing not found");
    if (listing.seller_id !== user.id) {
      throw new Error("Only the listing owner can boost it");
    }

    const orderId = `boost_${listingId.slice(0, 8)}_${Date.now()}`;

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
        order_amount: BOOST_AMOUNT_INR,
        order_currency: "INR",
        customer_details: {
          customer_id: user.id,
          customer_email: user.email ?? "buyer@andamanbazaar.app",
          customer_phone: (user.user_metadata as any)?.phone ?? "9999999999",
          customer_name:
            (user.user_metadata as any)?.name ?? "Andaman Bazaar User",
        },
        order_meta: { listing_id: listingId, purpose: "boost" },
        order_note: `Boost listing ${listing.title}`,
      }),
    });

    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson?.payment_session_id) {
      console.error("Cashfree create order failed", cfJson);
      throw new Error(
        cfJson?.message ?? "Failed to create Cashfree order",
      );
    }

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: user.id,
      listing_id: listingId,
      purpose: "boost",
      amount: BOOST_AMOUNT_INR,
      currency: "INR",
      status: "created",
      razorpay_order_id: orderId, // reused column for Cashfree order_id
      notes: { provider: "cashfree", cf_order_id: cfJson.cf_order_id ?? null },
    });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        order_id: orderId,
        payment_session_id: cfJson.payment_session_id,
        cf_order_id: cfJson.cf_order_id,
        env: (Deno.env.get("CASHFREE_ENV") ?? "sandbox").toLowerCase(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("cashfree-create-order error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});