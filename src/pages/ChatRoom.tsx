import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, publicImageUrl } from "@/lib/listings";
import { slang } from "@/lib/slang";

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
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
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [signedImages, setSignedImages] = useState<Record<string, string>>({});

  // Resolve storage paths in messages to short-lived signed URLs
  useEffect(() => {
    const paths = messages
      .map((m) => m.image_url)
      .filter((u): u is string => !!u && !/^https?:\/\//.test(u) && !signedImages[u]);
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("chat-images")
        .createSignedUrls(paths, 60 * 60);
      if (cancelled || !data) return;
      setSignedImages((prev) => {
        const next = { ...prev };
        data.forEach((d) => {
          if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, signedImages]);

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
        .from("public_profiles" as never)
        .select("id, name, photo_url")
        .eq("id", otherId)
        .maybeSingle();

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, body, image_url, created_at")
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

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Sirf image bhej sakte ho", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image bahut badi hai (max 5 MB)", variant: "destructive" });
      return;
    }
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    const body = draft.trim();
    if ((!body && !pendingImage) || sending) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (pendingImage) {
      const ext = pendingImage.name.split(".").pop()?.toLowerCase() || "jpg";
      // Folder must start with chat id so storage RLS can validate participation
      const path = `${id}/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, pendingImage, { contentType: pendingImage.type, upsert: false, cacheControl: "31536000" });
      if (upErr) {
        setSending(false);
        toast({ title: "Image upload fail", description: upErr.message, variant: "destructive" });
        return;
      }
      // Store the storage path; we generate short-lived signed URLs at render time
      imageUrl = path;
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: id, sender_id: user.id, body: body || "", image_url: imageUrl })
      .select("id, chat_id, sender_id, body, image_url, created_at")
      .single();
    setSending(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    clearPending();
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
            {slang("chatRoomEmpty", id)}
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
                  {(() => {
                    if (!m.image_url) return null;
                    const src = /^https?:\/\//.test(m.image_url)
                      ? m.image_url
                      : signedImages[m.image_url];
                    if (!src) return null;
                    return (
                      <a
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-1 block overflow-hidden rounded-lg"
                      >
                        <img
                          src={src}
                          alt="Shared photo"
                          className="max-h-64 w-auto object-cover"
                        />
                      </a>
                    );
                  })()}
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
      <form onSubmit={onSend} className="border-t border-border pt-3">
        {pendingPreview && (
          <div className="relative mb-2 inline-block">
            <img
              src={pendingPreview}
              alt="Preview"
              className="h-20 w-20 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={clearPending}
              className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Attach photo"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message"
            autoComplete="off"
            maxLength={2000}
            className="flex-1"
          />
          <span className="flex-none text-[10px] text-muted-foreground">{draft.length}/2000</span>
          <Button
            type="submit"
            size="icon"
            disabled={(!draft.trim() && !pendingImage) || sending}
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default ChatRoom;