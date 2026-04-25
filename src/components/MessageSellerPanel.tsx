import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateChat } from "@/lib/chats";
import { computeTrust } from "@/lib/trust";
import { formatPrice } from "@/lib/listings";
import { cn } from "@/lib/utils";

type SellerProfile = {
  id: string;
  name: string | null;
  photo_url: string | null;
  is_location_verified: boolean;
  total_listings: number;
  successful_sales: number;
};

type Props = {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  seller: SellerProfile;
  className?: string;
};

const TEMPLATES: { key: string; label: string; build: (title: string, price: number) => string }[] = [
  {
    key: "available",
    label: "Is this still available?",
    build: (title) => `Hi! Is "${title}" still available?`,
  },
  {
    key: "see-today",
    label: "Can I see it today?",
    build: (title) => `Hi! I'm interested in "${title}" — can I come see it today?`,
  },
  {
    key: "negotiable",
    label: "Is the price negotiable?",
    build: (title, price) =>
      `Hi! Is the price for "${title}" (${formatPrice(price)}) negotiable?`,
  },
  {
    key: "pickup",
    label: "Where can I pick it up?",
    build: (title) => `Hi! If I take "${title}", where would I pick it up from?`,
  },
];

export function MessageSellerPanel({
  listingId,
  listingTitle,
  listingPrice,
  seller,
  className,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const trust = computeTrust(seller);
  const isVerified = !!seller.is_location_verified;

  const sendTemplate = async (templateKey: string) => {
    if (sendingKey) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.id === seller.id) {
      toast({ title: "That's your own listing", variant: "destructive" });
      return;
    }
    const tpl = TEMPLATES.find((t) => t.key === templateKey);
    if (!tpl) return;
    setSendingKey(templateKey);
    try {
      const chatId = await getOrCreateChat({
        listingId,
        buyerId: user.id,
        sellerId: seller.id,
      });
      const body = tpl.build(listingTitle, listingPrice);
      const { error } = await supabase
        .from("messages")
        .insert({ chat_id: chatId, sender_id: user.id, body });
      if (error) throw error;
      navigate(`/chats/${chatId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send message";
      toast({ title: "Could not send", description: msg, variant: "destructive" });
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]",
        className,
      )}
      aria-label="Contact seller"
    >
      {/* Seller summary */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={seller.photo_url ?? undefined} alt="" />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {(seller.name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold">{seller.name ?? "Seller"}</p>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/30">
                <ShieldCheck className="h-3 w-3" /> Verified local
              </span>
            ) : (
              <span
                title="Seller's island location has not been verified"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border"
              >
                <UserPlus className="h-3 w-3" /> Not verified
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {seller.total_listings} listing{seller.total_listings === 1 ? "" : "s"} ·{" "}
            {seller.successful_sales} sold
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {trust.label} — {trust.description}
          </p>
        </div>
      </div>

      {!isVerified && (
        <p className="mt-3 rounded-lg bg-warning/10 p-2 text-[11px] leading-snug text-warning-foreground ring-1 ring-warning/30">
          Tip: this seller is not yet a verified local. Meet in a public place and check the item before paying.
        </p>
      )}

      {/* Templates */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quick message
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const isSending = sendingKey === t.key;
            const disabled = !!sendingKey;
            return (
              <Button
                key={t.key}
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => sendTemplate(t.key)}
                className="h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs"
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="leading-snug">{t.label}</span>
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sends the message and opens the chat. You can keep typing from there.
        </p>
      </div>
    </section>
  );
}