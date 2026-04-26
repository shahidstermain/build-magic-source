import { Megaphone, Sparkles, MapPin, Zap, Camera, BadgeCheck } from "lucide-react";
import PricingSection, { type PricingPlan } from "@/components/ui/pricing-section";
import { SeoHead } from "@/components/SeoHead";
import { BOOST_PRICE_INR, TRIP_PRICE_INR } from "@/lib/pricing";
import { effectivePrice, listPrice, isPromoActive, PROMO_CODE, daysLeftInPromo } from "@/lib/promo";

export default function Pricing() {
  const promoOn = isPromoActive();
  const daysLeft = daysLeftInPromo();

  const plans: PricingPlan[] = [
    {
      name: "Free",
      description: "Buy, sell and chat across the Andamans — no fees, ever.",
      price: 0,
      priceSuffix: "",
      ctaLabel: "Browse listings",
      ctaHref: "/listings",
      icon: BadgeCheck,
      features: [
        { text: "Unlimited listings & messages" },
        { text: "Local-only verified buyers" },
        { text: "WhatsApp share built in" },
      ],
      includes: [
        "Always free:",
        "Listing reviews & ratings",
        "Favorites & saved searches",
        "Trip planner preview",
      ],
    },
    {
      name: "Boost a Listing",
      description: "Pin your listing to the top for 7 days and get more eyes on it.",
      price: effectivePrice(BOOST_PRICE_INR),
      oldPrice: promoOn ? listPrice(BOOST_PRICE_INR) : undefined,
      priceSuffix: "/listing",
      ctaLabel: "Boost a listing",
      ctaHref: "/dashboard",
      popular: true,
      icon: Megaphone,
      features: [
        { text: "Featured slot for 7 days", icon: Zap },
        { text: "Top of category & search" },
        { text: "Boosted in homepage carousel", icon: Camera },
      ],
      includes: [
        "Includes everything in Free, plus:",
        "“Featured” badge on card",
        "Higher chat conversion",
        "One-time payment, no subscription",
      ],
    },
    {
      name: "AI Trip Plan",
      description: "Ferry-aware, day-by-day Andaman itinerary delivered as a PDF.",
      price: effectivePrice(TRIP_PRICE_INR),
      oldPrice: promoOn ? listPrice(TRIP_PRICE_INR) : undefined,
      priceSuffix: "/plan",
      ctaLabel: "Plan my trip",
      ctaHref: "/trip-planner",
      icon: Sparkles,
      features: [
        { text: "Personalised day-by-day plan", icon: MapPin },
        { text: "Ferry timings & buffers built-in" },
        { text: "Curated booking links" },
      ],
      includes: [
        "Plan includes:",
        "Downloadable PDF itinerary",
        "Local tips & hidden spots",
        "Edit & regenerate anytime",
      ],
    },
  ];

  return (
    <>
      <SeoHead
        title="Pricing — Andaman Bazaar"
        description="Buying & selling on Andaman Bazaar is free. Pay only for optional Listing Boosts and AI Trip Plans. Transparent one-time pricing in INR."
        canonical="https://andamanbazaar.in/pricing"
      />
      <PricingSection
        title={
          <>
            Simple, one-time pricing for the{" "}
            <span className="text-primary">Andamans</span>
          </>
        }
        subtitle={
          promoOn
            ? `Launch offer live — use code ${PROMO_CODE} for 50% off (${daysLeft} days left).`
            : "Free to use. Pay only for the boost or trip plan you actually need."
        }
        plans={plans}
      />
    </>
  );
}