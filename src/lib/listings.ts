import { supabase } from "@/integrations/supabase/client";

export const ANDAMAN_AREAS = [
  "Port Blair",
  "Havelock (Swaraj Dweep)",
  "Neil (Shaheed Dweep)",
  "Diglipur",
  "Rangat",
  "Mayabunder",
  "Hut Bay",
  "Car Nicobar",
] as const;

export const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "vehicles", label: "Vehicles" },
  { value: "home", label: "Home & Garden" },
  { value: "fashion", label: "Fashion" },
  { value: "fishing", label: "Fishing & Boats" },
  { value: "tools", label: "Tools" },
  { value: "books", label: "Books & Hobbies" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
] as const;

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
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