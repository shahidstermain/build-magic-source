import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatChatTime } from "@/lib/chats";
import { formatPrice, publicImageUrl } from "@/lib/listings";
import { slang } from "@/lib/slang";

type ChatRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listing: {
    id: string;
    title: string;
    price: number;
    listing_images: { image_url: string; display_order: number }[];
  } | null;
  buyer: { id: string; name: string | null; photo_url: string | null } | null;
  seller: { id: string; name: string | null; photo_url: string | null } | null;
  last_message: { body: string; sender_id: string; created_at: string } | null;
};

const ChatList = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chats")
        .select(
          `id, buyer_id, seller_id, last_message_at,
           listing:listings(id, title, price, listing_images(image_url, display_order)),
           buyer:profiles!chats_buyer_id_fkey(id, name, photo_url),
           seller:profiles!chats_seller_id_fkey(id, name, photo_url)`,
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        // Fallback without explicit FK aliases (no FK to profiles defined for chats yet)
        const fallback = await supabase
          .from("chats")
          .select(
            `id, buyer_id, seller_id, last_message_at,
             listing:listings(id, title, price, listing_images(image_url, display_order))`,
          )
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("last_message_at", { ascending: false });
        if (fallback.error) {
          toast({ title: "Could not load chats", description: fallback.error.message, variant: "destructive" });
          setChats([]);
          setLoading(false);
          return;
        }
        const rows = (fallback.data ?? []) as unknown as ChatRow[];
        await hydrateProfilesAndLastMessages(rows);
        if (!cancelled) {
          setChats(rows);
          setLoading(false);
        }
        return;
      }

      const rows = (data ?? []) as unknown as ChatRow[];
      await hydrateLastMessages(rows);
      if (!cancelled) {
        setChats(rows);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`chats-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  async function hydrateLastMessages(rows: ChatRow[]) {
    if (!rows.length) return;
    const ids = rows.map((r) => r.id);
    // Fetch only a bounded set of recent messages to avoid loading entire history
    const { data } = await supabase
      .from("messages")
      .select("chat_id, body, sender_id, created_at")
      .in("chat_id", ids)
      .order("created_at", { ascending: false })
      .limit(ids.length * 3);
    const seen = new Set<string>();
    const lastByChat = new Map<string, { body: string; sender_id: string; created_at: string }>();
    for (const m of data ?? []) {
      if (seen.has(m.chat_id)) continue;
      seen.add(m.chat_id);
      lastByChat.set(m.chat_id, { body: m.body, sender_id: m.sender_id, created_at: m.created_at });
    }
    rows.forEach((r) => {
      r.last_message = lastByChat.get(r.id) ?? null;
    });
  }

  async function hydrateProfilesAndLastMessages(rows: ChatRow[]) {
    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id])),
    );
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("public_profiles" as never)
        .select("id, name, photo_url")
        .in("id", userIds);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      rows.forEach((r) => {
        r.buyer = map.get(r.buyer_id) ?? null;
        r.seller = map.get(r.seller_id) ?? null;
      });
    }
    await hydrateLastMessages(rows);
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <section className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your buyer and seller conversations.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : chats.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No chats yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {slang("chatsEmpty", user.id)}
          </p>
          <Link to="/listings" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {chats.map((chat) => {
            const otherId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
            const other = chat.buyer_id === user.id ? chat.seller : chat.buyer;
            const otherName = other?.name ?? "User";
            const cover = chat.listing?.listing_images?.sort(
              (a, b) => a.display_order - b.display_order,
            )[0]?.image_url;
            const preview = chat.last_message?.body ?? "Say hi 👋";
            return (
              <li key={chat.id}>
                <Link
                  to={`/chats/${chat.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40"
                >
                  <Avatar className="h-12 w-12 flex-none">
                    <AvatarImage src={other?.photo_url ?? undefined} alt="" />
                    <AvatarFallback>{otherName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium">{otherName}</p>
                      <span className="flex-none text-xs text-muted-foreground">
                        {formatChatTime(chat.last_message?.created_at ?? chat.last_message_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {chat.listing ? (
                        <span className="text-foreground/70">{chat.listing.title}</span>
                      ) : (
                        <span className="italic">Listing removed</span>
                      )}
                      {chat.listing && (
                        <span className="mx-1 text-muted-foreground">·</span>
                      )}
                      {preview}
                    </p>
                  </div>
                  {cover && (
                    <img
                      src={publicImageUrl(cover)}
                      alt=""
                      className="h-12 w-12 flex-none rounded-lg object-cover"
                    />
                  )}
                  {chat.listing && !cover && (
                    <span className="flex-none text-xs font-medium">
                      {formatPrice(chat.listing.price)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ChatList;