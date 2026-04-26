// Launch promo configuration — single source of truth.
// Strategy: list prices are doubled across the app; the promo code
// "ANDAMANJINDABAD" gives 50% off, bringing the charge back to the
// original base. Valid for the first 2 months after LAUNCH_DATE.

export const PROMO_CODE = "ANDAMANJINDABAD";
export const PROMO_DISCOUNT_PCT = 50;
export const PROMO_DURATION_MONTHS = 2;

// Set this to the actual launch date when shipping.
export const LAUNCH_DATE = new Date("2026-04-25T00:00:00+05:30");

export function promoEndDate(): Date {
  const d = new Date(LAUNCH_DATE);
  d.setMonth(d.getMonth() + PROMO_DURATION_MONTHS);
  return d;
}

export function isPromoActive(now: Date = new Date()): boolean {
  return now >= LAUNCH_DATE && now < promoEndDate();
}

// Doubled list price (what we display as the "MRP" / struck-through).
export function listPrice(basePrice: number): number {
  return basePrice * 2;
}

// Final price after promo code, when active. Otherwise the doubled list price.
export function effectivePrice(basePrice: number, now: Date = new Date()): number {
  return isPromoActive(now) ? basePrice : listPrice(basePrice);
}

export function daysLeftInPromo(now: Date = new Date()): number {
  const ms = promoEndDate().getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Compact text label for inline CTAs / copy lines.
// Promo active → "₹99 (was ₹198)". Otherwise → "₹198".
export function formatPriceLabel(basePrice: number, now: Date = new Date()): string {
  const list = listPrice(basePrice).toLocaleString("en-IN");
  if (!isPromoActive(now)) return `₹${list}`;
  const eff = effectivePrice(basePrice, now).toLocaleString("en-IN");
  return `₹${eff} (was ₹${list})`;
}
