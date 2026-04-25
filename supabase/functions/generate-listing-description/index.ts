import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You write short, honest, friendly classifieds listings for AndamanBazaar — a hyperlocal marketplace in the Andaman & Nicobar Islands. Voice: warm Hinglish-friendly English, "boat pe bharosa" tone — trustworthy, unpretentious, island-flavored. Output ONLY the description text (2-3 short sentences, max ~280 chars). No emojis, no markdown, no quotes, no prefixes like "Description:". Mention condition naturally if useful. Never invent specs that weren't given.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim().slice(0, 200);
    const category = String(body?.category ?? "").trim().slice(0, 60);
    const condition = String(body?.condition ?? "").trim().slice(0, 30);
    const area = String(body?.area ?? "").trim().slice(0, 60);
    const price = body?.price != null ? String(body.price).slice(0, 20) : "";

    if (title.length < 3) {
      return new Response(JSON.stringify({ error: "Add a title first" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Title: ${title}
Category: ${category || "n/a"}
Condition: ${condition || "n/a"}
Area: ${area || "n/a"}
Price: ${price || "n/a"}

Write the description.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Too many requests, try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI helper unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "")
      .replace(/^["']+|["']+$/g, "")
      .trim();

    return new Response(JSON.stringify({ description: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing-description error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
