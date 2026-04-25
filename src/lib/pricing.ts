// Single source of truth for base SKU prices (in INR).
// All UI components and helpers should import from here.
// Promo / display logic lives in src/lib/promo.ts and reads these values.
//
// Edge functions (Deno) cannot import from `src/`, so they keep their own
// copies — keep those numbers in sync with the constants below.

export const BOOST_PRICE_INR = 99;
export const TRIP_PRICE_INR = 49;
