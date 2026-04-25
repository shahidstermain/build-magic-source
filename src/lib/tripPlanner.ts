import { supabase } from "@/integrations/supabase/client";
// Re-exported for backwards-compatibility. Canonical source: src/lib/pricing.ts
export { TRIP_PRICE_INR } from "@/lib/pricing";

export const BUDGET_OPTIONS = [
  { id: "low", label: "Low", hint: "Hostels, local food, ferry" },
  { id: "medium", label: "Medium", hint: "Boutique stays, mix of activities" },
  { id: "high", label: "High", hint: "Resorts, private transfers, premium" },
] as const;

export const INTEREST_OPTIONS = [
  "adventure",
  "relaxation",
  "couple",
  "solo",
  "family",
  "snorkeling",
  "history",
  "food",
] as const;

export const ISLAND_OPTIONS = [
  "Port Blair",
  "Havelock (Swaraj Dweep)",
  "Neil (Shaheed Dweep)",
  "Baratang",
  "Long Island",
  "Diglipur",
] as const;

export const FITNESS_OPTIONS = [
  { id: "low", label: "Low", hint: "Beach & city only, no treks" },
  { id: "medium", label: "Medium", hint: "Light trek + snorkel ok" },
  { id: "high", label: "High", hint: "Treks, scuba, full days" },
] as const;

export const GROUP_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "couple", label: "Couple" },
  { id: "family", label: "Family" },
  { id: "group", label: "Group" },
] as const;

export const ACCOMMODATION_OPTIONS = [
  { id: "budget", label: "Budget guesthouse" },
  { id: "midrange", label: "Mid-range hotel" },
  { id: "resort", label: "Beach resort" },
  { id: "luxury", label: "Luxury" },
] as const;

export const DIET_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "non-vegetarian", label: "Non-vegetarian" },
  { id: "seafood-only", label: "Seafood-only" },
  { id: "vegan", label: "Vegan" },
] as const;

export const EXPANDED_INTEREST_OPTIONS = [
  "adventure",
  "scuba",
  "snorkeling",
  "beaches",
  "history",
  "photography",
  "food",
  "wildlife",
  "offbeat",
  "relaxation",
  "nightlife",
] as const;

export type TripInputs = {
  days: number;
  budget: "low" | "medium" | "high";
  start_date: string;
  end_date: string;
  interests: string[];
  islands: string[];
  travelers?: number;
  group_type?: "solo" | "couple" | "family" | "group";
  ages?: string;
  fitness?: "low" | "medium" | "high";
  accommodation?: "budget" | "midrange" | "resort" | "luxury";
  diet?: "vegetarian" | "non-vegetarian" | "seafood-only" | "vegan";
  avoid?: string[];
  permits_arranged?: boolean;
  returning_visitor?: boolean;
  is_foreign_national?: boolean;
  notes?: string;
};

export type TripPreview = {
  trip_title: string;
  summary: string;
  day1_morning: string;
  highlights: string[];
  estimated_total_inr: number;
  season_warning?: string;
};

export type TripStatus = "pending" | "paid" | "generating" | "generated" | "failed";

export async function createTripPreview(inputs: TripInputs) {
  const { data, error } = await supabase.functions.invoke("trip-preview", {
    body: { inputs },
  });
  if (error) throw new Error(error.message ?? "Preview failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { trip_id: string; preview: TripPreview };
}

// ============= Day feedback =============
export async function submitTripDayFeedback(args: {
  trip_id: string;
  day_number: number;
  is_helpful: boolean;
  comment?: string;
}) {
  const { data, error } = await supabase.functions.invoke("trip-feedback", {
    body: args,
  });
  if (error) throw new Error(error.message ?? "Feedback failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true };
}

export async function createTripOrder(tripId: string) {
  const { data, error } = await supabase.functions.invoke(
    "cashfree-create-trip-order",
    { body: { trip_id: tripId } },
  );
  if (error) throw new Error(error.message ?? "Order failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    order_id: string;
    payment_session_id: string;
    cf_order_id: string;
    env: "sandbox" | "production";
  };
}

export async function verifyTripPayment(orderId: string) {
  const { data, error } = await supabase.functions.invoke(
    "cashfree-verify-trip-payment",
    { body: { order_id: orderId } },
  );
  if (error) throw new Error(error.message ?? "Verification failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    status: "paid" | "failed";
    trip_id?: string;
    storage_path?: string | null;
    generation_error?: string;
  };
}

export async function regenerateTrip(tripId: string) {
  const { data, error } = await supabase.functions.invoke("trip-generate", {
    body: { trip_id: tripId },
  });
  if (error) throw new Error(error.message ?? "Generation failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { status: string; storage_path: string };
}

export async function getTripDownloadUrl(tripId: string) {
  const { data, error } = await supabase.functions.invoke("trip-download-url", {
    body: { trip_id: tripId },
  });
  if (error) throw new Error(error.message ?? "Download URL failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as { url: string }).url;
}

// ============= Recommendations / affiliate =============

export type TripRecommendation = {
  id: string;
  trip_id: string;
  vendor_id: string | null;
  item_type: "hotel" | "ferry" | "activity" | "package" | "transport" | "addon";
  item_name: string;
  short_description: string | null;
  merchant_name: string;
  price_inr: number | null;
  price_label: string | null;
  affiliate_url: string;
  disclosure_text: string;
  cta_label: string;
  is_affiliate: boolean;
  rank: number;
  click_count: number;
};

export async function fetchTripRecommendations(
  tripId: string,
  opts: { teaserOnly?: boolean; force?: boolean } = {},
) {
  const { data, error } = await supabase.functions.invoke("trip-recommendations", {
    body: {
      trip_id: tripId,
      teaser_only: opts.teaserOnly ?? false,
      force: opts.force ?? false,
    },
  });
  if (error) throw new Error(error.message ?? "Recommendations failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as { recommendations: TripRecommendation[] }).recommendations ?? [];
}

/**
 * Build the server-side tracking redirect URL for a recommendation.
 * The edge function logs the click then 302-redirects to the merchant URL.
 */
export function affiliateTrackingUrl(recommendationId: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) {
    // Fallback: use the Supabase URL from the client env var which is always set
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (supabaseUrl) {
      return `${supabaseUrl}/functions/v1/affiliate-click?rec=${encodeURIComponent(recommendationId)}`;
    }
    console.warn("affiliateTrackingUrl: VITE_SUPABASE_PROJECT_ID not set");
    return "#";
  }
  return `https://${projectId}.supabase.co/functions/v1/affiliate-click?rec=${encodeURIComponent(recommendationId)}`;
}

const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

export function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Cashfree) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CASHFREE_SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = CASHFREE_SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Cashfree SDK load failed"));
    document.head.appendChild(s);
  });
}