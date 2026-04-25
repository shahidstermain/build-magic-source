import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, publicImageUrl } from "@/lib/listings";

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ChatMeta = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing: {
    id: string;
    title: string;
    price: number;
    listing_images: { image_url: string; display_order: number }[];
  } | null;
  other: { id: string; name: string | null; photo_url: string | null } | null;
};

const ChatRoom = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: chat, error } = await supabase
        .from("chats")
        .select(
          `id, buyer_id, seller_id,
           listing:listings(id, title, price, listing_images(image_url, display_order))`,
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not open chat", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!chat) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const otherId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, photo_url")
        .eq("id", otherId)
        .maybeSingle();

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, body, created_at")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      setMeta({
        id: chat.id,
        buyer_id: chat.buyer_id,
        seller_id: chat.seller_id,
        listing: (chat.listing as ChatMeta["listing"]) ?? null,
        other: profile ?? null,
      });
      setMessages((msgs ?? []) as Message[]);
      setLoading(false);

      // Mark unread incoming messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("chat_id", id)
        .neq("sender_id", user.id)
        .is("read_at", null);
    };

    load();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
          if (msg.sender_id !== user.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id)
              .then(() => undefined);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user, toast]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const cover = useMemo(() => {
    const img = meta?.listing?.listing_images
      ?.slice()
      .sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
    return img ? publicImageUrl(img) : null;
  }, [meta]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: id, sender_id: user.id, body })
      .select("id, chat_id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message],
    );
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (notFound) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted-foreground">Chat not found.</p>
        <Link to="/chats" className="mt-3 inline-block text-primary hover:underline">
          Back to chats
        </Link>
      </section>
    );
  }

  const otherName = meta?.other?.name ?? "User";

  return (
    <section className="flex h-[calc(100vh-8rem)] flex-col py-2">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Link
          to="/chats"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar className="h-10 w-10">
          <AvatarImage src={meta?.other?.photo_url ?? undefined} alt="" />
          <AvatarFallback>{otherName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{otherName}</p>
          {meta?.listing && (
            <Link
              to={`/listings/${meta.listing.id}`}
              className="block truncate text-xs text-muted-foreground hover:underline"
            >
              {meta.listing.title} · {formatPrice(meta.listing.price)}
            </Link>
          )}
        </div>
        {cover && meta?.listing && (
          <Link to={`/listings/${meta.listing.id}`} className="flex-none">
            <img src={cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
          </Link>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                  <div
                    className={`mt-1 text-[10px] ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={onSend}
        className="flex items-center gap-2 border-t border-border pt-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          autoComplete="off"
          maxLength={2000}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
};

export default ChatRoom;