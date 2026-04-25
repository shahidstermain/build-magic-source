/**
 * Curated AndamanBazaar voice — Hinglish island slang dataset.
 *
 * Rules of use (per product guidelines):
 *  - Sprinkle, don't flood. Aim for ~10–20% of copy max.
 *  - NEVER use slang in payments, errors, auth, or destructive flows.
 *  - Rotate phrases per surface to avoid repetition.
 */

export type SlangSurface =
  | "homeHero"
  | "homeTagline"
  | "browseEmpty"
  | "dashboardEmpty"
  | "favoritesEmpty"
  | "chatsEmpty"
  | "chatRoomEmpty"
  | "listingTrust"
  | "deliveryHumor"
  | "notifOrderShipped"
  | "notifNewMessage"
  | "notifFavoriteUpdated"
  | "notifTrending";

const PHRASES: Record<SlangSurface, string[]> = {
  homeHero: [
    "Aaj ka maal full set hai 🐟",
    "Idhar sab mast milta hai",
    "Aaj ka catch dekh lo",
  ],
  homeTagline: [
    "Buy, sell, aur sab kuch — bas thoda island time pe.",
    "Hyperlocal hai. Boat pe bharosa rakho.",
    "Sab milega, bas rukna padta hai sometimes 😄",
  ],
  browseEmpty: [
    "Abhi yahan kuch nahi… kal boat se aa sakta hai 🚢",
    "Idhar sab slow hi aata hai 😄 thoda ruk jao.",
    "Khali hai filhal — filter thoda dheela karo?",
  ],
  dashboardEmpty: [
    "Khali mat baitho boss — ek listing toh dalo 😏",
    "Pehla item daal do, scene set ho jayega.",
  ],
  favoritesEmpty: [
    "Kuch save nahi kiya abhi tak. Browse karo na.",
    "Pasand aaye toh dil ka button daba dena ❤️",
  ],
  chatsEmpty: [
    "Koi baat-cheet nahi abhi. Listing pe ‘Message seller’ dabao.",
    "Chai pe baithne se pehle, kisi se hi toh baat karo 😄",
  ],
  chatRoomEmpty: [
    "Hi bolo na 👋",
    "Rate puchho, available hai ya nahi.",
    "Bhai chai pe baithte, baat karte 😄",
  ],
  listingTrust: [
    "Idhar sab trusted hai",
    "Seller pakka hai",
    "Local pakda hua hai",
  ],
  deliveryHumor: [
    "Sab boat pe depend hai 🚢",
    "Weather clear toh fast aa jayega.",
    "Island timing — patience rakho.",
  ],
  notifOrderShipped: [
    "Dispatch ho gaya boss! Ab raaste me hai 🚢",
    "Boat pakad liya — thoda ruk jao.",
  ],
  notifNewMessage: [
    "Naya message aaya hai 👀",
    "Koi baat karna chahta hai tumse.",
  ],
  notifFavoriteUpdated: [
    "Tumhara saved item update hua hai 👇",
    "Pasandida cheez ka rate badla — dekh lo.",
  ],
  notifTrending: [
    "Ye item fast khatam ho raha hai 👀",
    "Demand me hai — jaldi dekh lo.",
  ],
};

/**
 * Pick a phrase deterministically based on a seed (e.g. user id, listing id,
 * date). Same seed = same phrase, so users don't see flicker on re-renders.
 */
export function slang(surface: SlangSurface, seed?: string | number): string {
  const list = PHRASES[surface];
  if (!list?.length) return "";
  if (seed == null) {
    return list[Math.floor(Math.random() * list.length)];
  }
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return list[Math.abs(hash) % list.length];
}

/** Daily-rotating phrase — same for everyone on a given UTC day. */
export function slangOfTheDay(surface: SlangSurface): string {
  const today = new Date().toISOString().slice(0, 10);
  return slang(surface, today);
}