import { MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppShareProps {
  title: string;
  price?: number;
  url: string;
  type?: "listing" | "trip" | "experience";
  variant?: "button" | "icon";
  listingId?: string;
  tripId?: string;
}

export function WhatsAppShare({ 
  title, 
  price, 
  url, 
  type = "listing", 
  variant = "button",
  listingId,
  tripId,
}: WhatsAppShareProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const formatMessage = () => {
    let message = "";
    
    switch (type) {
      case "trip":
        message = `🏝️ Check out this amazing Andaman trip plan: *${title}*\n\nGenerated with AI Trip Planner on AndamanBazaar\n${url}`;
        break;
      case "experience":
        message = `🌊 Found this awesome experience in Andaman: *${title}*\n${price ? `💰 Price: ₹${price.toLocaleString("en-IN")}` : ""}\n\nBook on AndamanBazaar\n${url}`;
        break;
      default:
        message = `🛍️ Check out this item on AndamanBazaar: *${title}*\n${price ? `💰 Price: ₹${price.toLocaleString("en-IN")}` : ""}\n\n${url}`;
    }
    
    return encodeURIComponent(message);
  };

  const handleShare = async () => {
    const message = formatMessage();
    const whatsappUrl = `https://wa.me/?text=${message}`;
    
    // Track the share (best-effort — doesn't block the share action)
    if (user) {
      (supabase as any).from("whatsapp_shares").insert({
        user_id: user.id,
        listing_id: type === "listing" || type === "experience" ? listingId : null,
        trip_id: type === "trip" ? tripId : null,
        share_type: type,
        message_template: decodeURIComponent(message),
      }).then(({ error }: { error: any }) => {
        if (error && error.code !== "42P01") {
          console.warn("Failed to track share:", error.message);
        }
      });
    }
    
    // Try to open WhatsApp, fallback to copying link
    try {
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(decodeURIComponent(message));
      toast({ 
        title: "Message copied to clipboard", 
        description: "Paste it in WhatsApp to share" 
      });
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleShare}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="text-green-600 hover:text-green-700 hover:bg-green-50"
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Share on WhatsApp
    </Button>
  );
}

// Quick share for experiences with predefined templates
export function QuickWhatsAppShare({ 
  experienceType, 
  location, 
  url 
}: { 
  experienceType: string; 
  location: string; 
  url: string; 
}) {
  const templates = {
    snorkeling: `🤿 Amazing snorkeling spots in ${location}! Crystal clear waters and vibrant marine life await.`,
    scuba_diving: `🐠 Incredible scuba diving experience in ${location}! Explore the underwater paradise.`,
    island_hopping: `🏝️ Perfect island hopping adventure in ${location}! Multiple islands, one amazing day.`,
    sunset_cruise: `🌅 Magical sunset cruise in ${location}! Romance and beauty on the waters.`,
    cultural_tours: `🏛️ Fascinating cultural tour in ${location}! Learn about local history and traditions.`,
  };

  const message = templates[experienceType as keyof typeof templates] || 
    `🌊 Amazing experience in ${location}! Don't miss this opportunity.`;

  const handleQuickShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${message}\n\nBook now: ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickShare}
      className="text-green-600 hover:text-green-700"
    >
      <Share2 className="h-3 w-3 mr-1" />
      Quick Share
    </Button>
  );
}

// ============================================================
// Booking confirmation – rich, structured WhatsApp message
// ============================================================

export interface BookingConfirmationDetails {
  /** What the booking is for, e.g. "Andaman Trip" or "Scuba Diving · Havelock" */
  title: string;
  /** ISO date string for the start of travel (optional) */
  startDate?: string;
  /** ISO date string for the end of travel (optional) */
  endDate?: string;
  /** Number of travellers (optional) */
  travelers?: number;
  /** Islands or location summary (optional) */
  islands?: string[];
  /** Highlight bullets (optional, max 5 shown) */
  highlights?: string[];
  /** Estimated total in INR (optional) */
  totalInr?: number;
  /** Public URL to the trip / listing / PDF (optional but recommended) */
  url?: string;
  /** Phone number in international format (no `+`), e.g. "919876543210". Empty → user picks contact in WhatsApp. */
  toPhone?: string;
}

function formatDateShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Build the structured confirmation message. Exported for tests + reuse. */
export function buildBookingConfirmationMessage(d: BookingConfirmationDetails): string {
  const lines: string[] = [];
  lines.push(`🏝️ *Andaman Booking Confirmation*`);
  lines.push(`📌 ${d.title}`);

  if (d.startDate || d.endDate) {
    const from = formatDateShort(d.startDate);
    const to = formatDateShort(d.endDate);
    lines.push(`📅 ${[from, to].filter(Boolean).join(" → ")}`);
  }
  if (d.travelers && d.travelers > 0) {
    lines.push(`👥 ${d.travelers} traveller${d.travelers > 1 ? "s" : ""}`);
  }
  if (d.islands && d.islands.length > 0) {
    lines.push(`📍 ${d.islands.join(" · ")}`);
  }
  if (d.highlights && d.highlights.length > 0) {
    lines.push("");
    lines.push("*Highlights:*");
    for (const h of d.highlights.slice(0, 5)) lines.push(`• ${h}`);
  }
  if (typeof d.totalInr === "number" && d.totalInr > 0) {
    lines.push("");
    lines.push(`💰 Estimated total: ₹${d.totalInr.toLocaleString("en-IN")}`);
  }
  if (d.url) {
    lines.push("");
    lines.push(`🔗 ${d.url}`);
  }
  lines.push("");
  lines.push("— Sent via AndamanBazaar");
  return lines.join("\n");
}

interface WhatsAppBookingConfirmProps extends BookingConfirmationDetails {
  size?: "default" | "sm" | "lg";
  className?: string;
  tripId?: string;
}

export function WhatsAppBookingConfirm({
  size = "default",
  className,
  tripId,
  ...details
}: WhatsAppBookingConfirmProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSend = async () => {
    const text = buildBookingConfirmationMessage(details);
    const base = details.toPhone
      ? `https://wa.me/${details.toPhone}`
      : `https://wa.me/`;
    const url = `${base}?text=${encodeURIComponent(text)}`;

    if (user) {
      (supabase as any)
        .from("whatsapp_shares")
        .insert({
          user_id: user.id,
          trip_id: tripId ?? null,
          share_type: "booking_confirmation",
          message_template: text,
        })
        .then(({ error }: { error: any }) => {
          if (error && error.code !== "42P01") {
            console.warn("Failed to track booking confirmation share:", error.message);
          }
        });
    }

    try {
      window.open(url, "_blank");
    } catch {
      navigator.clipboard.writeText(text);
      toast({
        title: "Confirmation copied",
        description: "Paste it in WhatsApp to share.",
      });
    }
  };

  return (
    <Button
      onClick={handleSend}
      size={size}
      className={`bg-green-600 text-white hover:bg-green-700 ${className ?? ""}`}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      Send booking confirmation
    </Button>
  );
}