/**
 * Curated photo library mapped to trip activity tags.
 * Source: Unsplash (free, no API key) — keyed to interests + islands.
 * Used by the trip preview to show Thrillophilia-style photo day cards.
 */

const UNSPLASH = (id: string, w = 1200, h = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

// Andaman / activity-themed photos (Unsplash IDs).
export const ACTIVITY_IMAGES: Record<string, string> = {
  beach: UNSPLASH("1507525428034-b723cf961d3e"),
  beaches: UNSPLASH("1507525428034-b723cf961d3e"),
  scuba: UNSPLASH("1544551763-46a013bb70d5"),
  snorkeling: UNSPLASH("1559827260-dc66d52bef19"),
  trekking: UNSPLASH("1551632811-561732d1e306"),
  adventure: UNSPLASH("1502082553048-f009c37129b9"),
  history: UNSPLASH("1568797629192-908a2d4c5a1a"),
  food: UNSPLASH("1504674900247-0877df9cc836"),
  wildlife: UNSPLASH("1474511320723-9a56873867b5"),
  photography: UNSPLASH("1502920917128-1aa500764cbd"),
  offbeat: UNSPLASH("1500530855697-b586d89ba3ee"),
  relaxation: UNSPLASH("1540202404-1b927e27fa8b"),
  nightlife: UNSPLASH("1514525253161-7a46d19cd819"),
  sunset: UNSPLASH("1495954484750-af469f2f9be5"),
  sightseeing: UNSPLASH("1502602898657-3e91760cbb34"),
  // Island fallbacks
  havelock: UNSPLASH("1559128010-7c1ad6e1b6a5"),
  neil: UNSPLASH("1505228395891-9a51e7e86bf6"),
  "port blair": UNSPLASH("1568797629192-908a2d4c5a1a"),
  baratang: UNSPLASH("1500382017468-9049fed747ef"),
  diglipur: UNSPLASH("1551632811-561732d1e306"),
  default: UNSPLASH("1507525428034-b723cf961d3e"),
};

/**
 * Resolve a hero image for a list of tags (interests + islands).
 * Returns the first match in priority order, falling back to a beach default.
 */
export function pickActivityImage(tags: string[]): string {
  for (const raw of tags) {
    const key = raw.toLowerCase().trim();
    if (ACTIVITY_IMAGES[key]) return ACTIVITY_IMAGES[key];
  }
  return ACTIVITY_IMAGES.default;
}

/**
 * Pick a different image per day, rotating across the user's tags
 * so consecutive days don't share the same hero.
 */
export function pickDayImage(tags: string[], dayIndex: number): string {
  if (tags.length === 0) return ACTIVITY_IMAGES.default;
  const rotated = tags[dayIndex % tags.length];
  return pickActivityImage([rotated, ...tags]);
}