import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-version",
};

// Cashfree webhook signature: base64(HMAC-SHA256(secret, timestamp + rawBody))
async function computeSignature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  // base64
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const secret = Deno.env.get("CASHFREE_WEBHOOK_SECRET");

  if (!secret) {
    console.error("CASHFREE_WEBHOOK_SECRET not configured");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }
  if (!signature || !timestamp) {
    return new Response("Missing signature", { status: 400, headers: corsHeaders });
  }

  const expected = await computeSignature(secret, timestamp + rawBody);
  if (!timingSafeEqual(expected, signature)) {
    console.error("Invalid Cashfree webhook signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const type: string = event?.type ?? "";
    const order = event?.data?.order ?? {};
    const payment = event?.data?.payment ?? {};
    const orderId: string | undefined = order?.order_id;

    if (!orderId) {
      console.warn("Webhook with no order_id", event);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const { data: paymentRow, error: fetchErr } = await admin
      .from("payments")
      .select("id, user_id, listing_id, status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!paymentRow) {
      console.warn(`No payment row for order ${orderId}`);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const isSuccess =
      type === "PAYMENT_SUCCESS_WEBHOOK" ||
      payment?.payment_status === "SUCCESS";
    const isFailure =
      type === "PAYMENT_FAILED_WEBHOOK" ||
      payment?.payment_status === "FAILED";

    if (isSuccess && paymentRow.status !== "paid") {
      await admin
        .from("payments")
        .update({
          status: "paid",
          razorpay_payment_id: String(payment?.cf_payment_id ?? ""),
          razorpay_signature: signature.slice(0, 500),
          notes: { provider: "cashfree", source: "webhook", event },
        })
        .eq("id", paymentRow.id);

      if (paymentRow.listing_id) {
        await admin
          .from("listings")
          .update({ is_featured: true })
          .eq("id", paymentRow.listing_id);
      }
    } else if (isFailure && paymentRow.status === "created") {
      await admin
        .from("payments")
        .update({
          status: "failed",
          notes: { provider: "cashfree", source: "webhook", event },
        })
        .eq("id", paymentRow.id);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("cashfree-webhook handler error", err);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});