import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { data: pdf, error: pdfErr } = await admin
      .from("trip_pdfs")
      .select("storage_path, user_id")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pdfErr) throw pdfErr;
    if (!pdf) throw new Error("PDF not generated yet");
    if (pdf.user_id !== user.id) throw new Error("Forbidden");

    const { data: signed, error: signErr } = await admin.storage
      .from("trip-pdfs")
      .createSignedUrl(pdf.storage_path, 60 * 10); // 10 minutes
    if (signErr || !signed) throw signErr ?? new Error("Failed to sign URL");

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err) {
    console.error("trip-download-url error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});