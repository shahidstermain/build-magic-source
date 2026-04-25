import { supabase } from "@/integrations/supabase/client";

export const ANDAMAN_AREAS = [
  "Port Blair",
  "Havelock (Swaraj Dweep)",
  "Neil (Shaheed Dweep)",
  "Baratang",
  "Diglipur",
  "Rangat",
  "Mayabunder",
  "Long Island",
  "Hut Bay (Little Andaman)",
  "Car Nicobar",
] as const;

export const CATEGORIES = [
  { value: "experiences", label: "Experiences & Tours" },
  { value: "electronics", label: "Electronics" },
  { value: "vehicles", label: "Vehicles" },
  { value: "home", label: "Home & Garden" },
  { value: "fashion", label: "Fashion" },
  { value: "fishing", label: "Fishing & Boats" },
  { value: "tools", label: "Tools" },
  { value: "books", label: "Books & Hobbies" },
  { value: "services", label: "Services" },
  { value: "accommodation", label: "Accommodation" },
  { value: "transport", label: "Transport & Ferries" },
  { value: "other", label: "Other" },
] as const;

/**
 * Subcategories for the "experiences" category.
 * Grounded in what operators actually offer across Port Blair, Havelock & Neil.
 * Prices reflect 2024–25 market rates from local operators.
 */
export const EXPERIENCE_SUBCATEGORIES = [
  // ── Water sports ──────────────────────────────────────────────────────────
  { value: "scuba_diving",        label: "Scuba Diving",           priceHint: "₹3,500 – ₹5,000 / person" },
  { value: "snorkeling",          label: "Snorkeling",             priceHint: "₹600 – ₹1,500 / person" },
  { value: "sea_walk",            label: "Sea Walk",               priceHint: "₹3,500 – ₹4,000 / person" },
  { value: "parasailing",         label: "Parasailing",            priceHint: "₹3,200 – ₹3,500 / person" },
  { value: "jet_ski",             label: "Jet Ski",                priceHint: "₹600 – ₹1,000 / person" },
  { value: "kayaking",            label: "Kayaking",               priceHint: "₹1,500 – ₹2,500 / person" },
  { value: "glass_bottom_boat",   label: "Glass Bottom Boat",      priceHint: "₹1,200 – ₹3,500 / person" },
  { value: "semi_submarine",      label: "Semi-Submarine Ride",    priceHint: "₹3,500 / person" },
  { value: "banana_boat",         label: "Banana Boat Ride",       priceHint: "₹500 – ₹800 / person" },
  { value: "sea_kart",            label: "Sea Kart",               priceHint: "₹5,400 / person" },
  { value: "game_fishing",        label: "Game Fishing / Charter", priceHint: "₹5,000 – ₹15,000 / boat" },
  { value: "night_kayaking",      label: "Night Kayaking",         priceHint: "₹2,000 – ₹3,000 / person" },
  // ── Island & nature tours ─────────────────────────────────────────────────
  { value: "island_hopping",      label: "Island Hopping",         priceHint: "₹1,500 – ₹4,000 / person" },
  { value: "sunset_cruise",       label: "Sunset / Dinner Cruise", priceHint: "₹3,500 / person (incl. dinner)" },
  { value: "mangrove_creek_tour", label: "Mangrove Creek Tour",    priceHint: "₹800 – ₹2,000 / person" },
  { value: "limestone_caves",     label: "Limestone Caves (Baratang)", priceHint: "₹1,500 – ₹3,000 / person" },
  { value: "barren_island_trip",  label: "Barren Island Volcano Trip", priceHint: "₹8,000 – ₹15,000 / boat" },
  { value: "mud_volcano",         label: "Mud Volcano Visit",      priceHint: "₹500 – ₹1,500 / person" },
  // ── Cultural & heritage ───────────────────────────────────────────────────
  { value: "cellular_jail_tour",  label: "Cellular Jail Tour",     priceHint: "₹30 – ₹200 entry + guide" },
  { value: "ross_island_tour",    label: "Ross Island Tour",       priceHint: "₹500 – ₹1,500 / person" },
  { value: "cultural_village",    label: "Cultural Village Tour",  priceHint: "₹500 – ₹2,000 / person" },
  { value: "light_sound_show",    label: "Light & Sound Show",     priceHint: "₹100 – ₹250 / person" },
  // ── Trekking & wildlife ───────────────────────────────────────────────────
  { value: "trekking",            label: "Trekking",               priceHint: "₹500 – ₹3,000 / person" },
  { value: "birdwatching",        label: "Bird Watching",          priceHint: "₹500 – ₹2,000 / person" },
  { value: "elephant_beach_trek", label: "Elephant Beach Trek",    priceHint: "₹200 – ₹500 / person" },
  // ── Photography & leisure ─────────────────────────────────────────────────
  { value: "photography_tour",    label: "Photography Tour",       priceHint: "₹1,000 – ₹5,000 / person" },
  { value: "beach_camping",       label: "Beach Camping",          priceHint: "₹1,500 – ₹4,000 / person" },
  { value: "padi_course",         label: "PADI Dive Course",       priceHint: "₹18,000 – ₹30,000 / person" },
] as const;

export type ExperienceSubcategory = (typeof EXPERIENCE_SUBCATEGORIES)[number]["value"];

/**
 * Activity filters shown on the Listings browse page.
 * Mapped to real subcategory values so filtering is accurate.
 */
export const ACTIVITY_FILTERS = [
  { value: "scuba_diving",        label: "Scuba Diving" },
  { value: "snorkeling",          label: "Snorkeling" },
  { value: "sea_walk",            label: "Sea Walk" },
  { value: "parasailing",         label: "Parasailing" },
  { value: "kayaking",            label: "Kayaking" },
  { value: "jet_ski",             label: "Jet Ski" },
  { value: "glass_bottom_boat",   label: "Glass Bottom Boat" },
  { value: "island_hopping",      label: "Island Hopping" },
  { value: "sunset_cruise",       label: "Sunset Cruise" },
  { value: "game_fishing",        label: "Game Fishing" },
  { value: "trekking",            label: "Trekking" },
  { value: "cultural_village",    label: "Cultural Tours" },
  { value: "limestone_caves",     label: "Limestone Caves" },
  { value: "mangrove_creek_tour", label: "Mangrove Tour" },
  { value: "beach_camping",       label: "Beach Camping" },
  { value: "padi_course",         label: "PADI Course" },
] as const;

/**
 * Season availability note shown when posting an experience.
 * Water sports are generally suspended Jun–Sep (monsoon).
 */
export const EXPERIENCE_SEASON_NOTE =
  "Most water sports operate Oct – May only. Monsoon (Jun – Sep): rough seas, many operators suspend services.";

/**
 * Key dive / snorkel sites per island — used as hints in the listing form.
 */
export const DIVE_SITES: Record<string, string[]> = {
  "Havelock (Swaraj Dweep)": [
    "Elephant Beach", "Aquarium", "Mac Point", "Turtle Bay",
    "Lighthouse", "Seduction Point", "Barracuda City", "Pilot Reef",
  ],
  "Neil (Shaheed Dweep)": [
    "Bharatpur Beach", "Laxmanpur Beach", "Junction", "Bus Stop",
  ],
  "Port Blair": [
    "North Bay Island", "Corbyn's Cove", "Rajiv Gandhi Water Sports Complex",
  ],
  "Baratang": [
    "Limestone Caves", "Mangrove Creek", "Mud Volcano",
  ],
};

export const PRICE_RANGES = [
  { value: "under_500",    label: "Under ₹500",          min: 0,     max: 500 },
  { value: "500_2000",     label: "₹500 – ₹2,000",       min: 500,   max: 2000 },
  { value: "2000_5000",    label: "₹2,000 – ₹5,000",     min: 2000,  max: 5000 },
  { value: "5000_10000",   label: "₹5,000 – ₹10,000",    min: 5000,  max: 10000 },
  { value: "above_10000",  label: "Above ₹10,000",        min: 10000, max: null },
] as const;

export const CONDITIONS = [
  { value: "new",      label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
] as const;

export type ListingCondition = (typeof CONDITIONS)[number]["value"];

export function formatPrice(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function publicImageUrl(path: string): string {
  return supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
}