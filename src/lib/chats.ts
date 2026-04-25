import { supabase } from "@/integrations/supabase/client";

/**
 * Find an existing chat between buyer and seller for a listing,
 * or create a new one. Returns the chat id.
 */
export async function getOrCreateChat(params: {
  listingId: string;
  buyerId: string;
  sellerId: string;
}): Promise<string> {
  const { listingId, buyerId, sellerId } = params;
  if (buyerId === sellerId) {
    throw new Error("You cannot start a chat with yourself.");
  }

  const { data: existing, error: findErr } = await supabase
    .from("chats")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing?.id) return existing.id;

  const { data: created, error: insertErr } = await supabase
    .from("chats")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  return created.id;
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}