// Sends a weekly affiliate revenue summary email to all admins via Resend.
// Triggered by pg_cron (Mondays 09:00 IST = 03:30 UTC).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FROM = Deno.env.get("AFFILIATE_SUMMARY_FROM") ?? "AndamanBazaar <noreply@andamanbazaar.in>";
const SUMMARY_TO_OVERRIDE = Deno.env.get("AFFILIATE_SUMMARY_TO"); // optional comma-separated list

const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function buildHtml(opts: {
  fromDate: string;
  toDate: string;
  totals: { clicks: number; conversions: number; verifiedRev: number; pendingRev: number; commission: number };
  topLinks: Array<{ item_name: string; merchant_name: string; clicks: number; verified_revenue_inr: number }>;
  flagged: Array<{ item_name: string; merchant_name: string; clicks: number }>;
}) {
  const { fromDate, toDate, totals, topLinks, flagged } = opts;
  const row = (cells: string[]) =>
    `<tr>${cells.map((c) => `<td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:14px">${c}</td>`).join("")}</tr>`;
  const topHtml = topLinks.length
    ? topLinks.map((l) => row([l.item_name, l.merchant_name, String(l.clicks), inr(l.verified_revenue_inr)])).join("")
    : `<tr><td colspan="4" style="padding:12px;color:#777;font-size:14px">No earning links this week.</td></tr>`;
  const flaggedHtml = flagged.length
    ? flagged.map((l) => row([l.item_name, l.merchant_name, String(l.clicks)])).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#777;font-size:14px">No flagged links 🎉</td></tr>`;

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f7f7f8;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #ececf1">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111">AndamanBazaar weekly affiliate summary</h1>
    <p style="margin:0 0 20px;color:#666;font-size:13px">${fromDate} → ${toDate}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="padding:12px;background:#f4f6f8;border-radius:8px;width:50%"><div style="font-size:12px;color:#666">Clicks</div><div style="font-size:22px;font-weight:600">${totals.clicks.toLocaleString("en-IN")}</div></td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#f4f6f8;border-radius:8px;width:50%"><div style="font-size:12px;color:#666">Conversions</div><div style="font-size:22px;font-weight:600">${totals.conversions.toLocaleString("en-IN")}</div></td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="padding:12px;background:#ecfdf5;border-radius:8px"><div style="font-size:12px;color:#047857">Verified revenue</div><div style="font-size:22px;font-weight:600;color:#047857">${inr(totals.verifiedRev)}</div></td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#fefce8;border-radius:8px"><div style="font-size:12px;color:#a16207">Pending revenue</div><div style="font-size:22px;font-weight:600;color:#a16207">${inr(totals.pendingRev)}</div></td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#444">Commission earned: <strong>${inr(totals.commission)}</strong></p>

    <h2 style="margin:24px 0 8px;font-size:16px;color:#111">Top earning links</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#fafafa"><th style="text-align:left;padding:8px 10px;font-size:12px;color:#555">Item</th><th style="text-align:left;padding:8px 10px;font-size:12px;color:#555">Merchant</th><th style="text-align:left;padding:8px 10px;font-size:12px;color:#555">Clicks</th><th style="text-align:left;padding:8px 10px;font-size:12px;color:#555">Revenue</th></tr></thead>
      <tbody>${topHtml}</tbody>
    </table>

    <h2 style="margin:24px 0 8px;font-size:16px;color:#b91c1c">⚠️ Flagged: high traffic, no revenue</h2>
    <p style="margin:0 0 8px;font-size:13px;color:#666">Links with >50 clicks and 0 verified conversions in the past 30 days. Check merchant tracking or replace these links.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:8px;overflow:hidden">
      <thead><tr style="background:#fef2f2"><th style="text-align:left;padding:8px 10px;font-size:12px;color:#7f1d1d">Item</th><th style="text-align:left;padding:8px 10px;font-size:12px;color:#7f1d1d">Merchant</th><th style="text-align:left;padding:8px 10px;font-size:12px;color:#7f1d1d">Clicks</th></tr></thead>
      <tbody>${flaggedHtml}</tbody>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#888">View full dashboard: <a href="https://andamanbazaar.in/admin/affiliate-revenue" style="color:#2563eb">/admin/affiliate-revenue</a></p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    // Per-link stats for the past 7 days
    const { data: linkRows, error: linkErr } = await admin.rpc("affiliate_link_revenue_stats", {
      _from: fromIso,
      _to: toIso,
      _vendor_id: null,
      _item_type: null,
    });
    if (linkErr) throw linkErr;
    const rows = (linkRows ?? []) as Array<{
      item_name: string; merchant_name: string; clicks: number;
      conversions: number; verified_conversions: number;
      verified_revenue_inr: number; pending_revenue_inr: number;
      verified_commission_inr: number; zero_revenue_30d: boolean;
    }>;

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += Number(r.clicks) || 0;
        acc.conversions += Number(r.conversions) || 0;
        acc.verifiedRev += Number(r.verified_revenue_inr) || 0;
        acc.pendingRev += Number(r.pending_revenue_inr) || 0;
        acc.commission += Number(r.verified_commission_inr) || 0;
        return acc;
      },
      { clicks: 0, conversions: 0, verifiedRev: 0, pendingRev: 0, commission: 0 },
    );

    const topLinks = [...rows]
      .filter((r) => r.verified_revenue_inr > 0)
      .sort((a, b) => b.verified_revenue_inr - a.verified_revenue_inr)
      .slice(0, 5);

    // Flagged uses the 30d window (computed by the RPC). Filter further: >50 clicks.
    const flagged = rows
      .filter((r) => r.zero_revenue_30d && r.clicks > 50)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Recipients: all admins, or override
    let recipients: string[] = [];
    if (SUMMARY_TO_OVERRIDE) {
      recipients = SUMMARY_TO_OVERRIDE.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const { data: admins, error: aErr } = await admin
        .from("user_roles")
        .select("user_id, profiles:profiles!inner(email)")
        .eq("role", "admin");
      if (aErr) throw aErr;
      recipients = (admins ?? [])
        .map((a: any) => a?.profiles?.email)
        .filter((e: string | null | undefined): e is string => !!e);
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, note: "No admin recipients" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromDate = from.toISOString().slice(0, 10);
    const toDate = to.toISOString().slice(0, 10);
    const html = buildHtml({ fromDate, toDate, totals, topLinks, flagged });
    const subject = `Affiliate weekly: ${inr(totals.verifiedRev)} verified · ${totals.clicks} clicks`;

    // Send via Resend through the Lovable connector gateway
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: recipients,
        subject,
        html,
        tags: [{ name: "category", value: "affiliate-weekly-summary" }],
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend send failed", res.status, payload);
      throw new Error(`Resend ${res.status}: ${JSON.stringify(payload)}`);
    }

    // Log
    await admin.from("email_logs").insert(
      recipients.map((r) => ({
        recipient: r.toLowerCase(),
        template: "affiliate-weekly-summary",
        status: "sent",
        provider: "resend",
        provider_message_id: payload?.id ?? null,
        subject,
        metadata: { totals, recipients_count: recipients.length },
      })),
    );

    return new Response(JSON.stringify({ ok: true, sent: recipients.length, message_id: payload?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("affiliate-weekly-summary error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
