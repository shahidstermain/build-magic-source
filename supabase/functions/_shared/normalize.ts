// Shared deterministic normalizers used by the news + stories agents.
// Pure functions with no I/O so they can be unit-tested.

export const ANDAMAN_KEYWORDS = [
  "andaman",
  "nicobar",
  "port blair",
  "havelock",
  "neil island",
  "swaraj dweep",
  "shaheed dweep",
  "great nicobar",
  "radhanagar",
  "baratang",
];

export function includesAndamanKeyword(text: string): boolean {
  const hay = (text || "").toLowerCase();
  return ANDAMAN_KEYWORDS.some((k) => hay.includes(k));
}

export function slugify(input: string, max = 90): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max);
}

export function smartTruncate(text: string, max: number): string {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.!?\-]+$/, "") + "…";
}

export function clampHeadlineForSlug(
  headline: string,
  maxSlug: number,
  slugFn: (s: string) => string = (s) => slugify(s, maxSlug + 50),
): string {
  const h = (headline ?? "").trim().replace(/\s+/g, " ");
  if (slugFn(h).length <= maxSlug) return h;
  const words = h.split(" ");
  while (words.length > 1) {
    words.pop();
    const candidate = words.join(" ");
    if (slugFn(candidate).length <= maxSlug) return candidate;
  }
  return h.slice(0, Math.max(10, maxSlug));
}

export type AndamanField = "metaDescription" | "coverAlt" | "seoTitle";

/**
 * Ensures `text` references an Andaman keyword by appending
 * " in the Andaman Islands" (within `max` chars). Returns the original
 * text if it already references a keyword.
 */
export function ensureAndamanReference(text: string, max: number): string {
  const t = (text ?? "").trim();
  if (!t || includesAndamanKeyword(t)) return t;
  const suffix = " in the Andaman Islands";
  const stripped = t.replace(/[\s.…]+$/u, "");
  const candidate = `${stripped}${suffix}`;
  if (candidate.length <= max) return candidate;
  const room = max - suffix.length;
  if (room <= 10) return t;
  return `${smartTruncate(stripped, room).replace(/[\s.…]+$/u, "")}${suffix}`;
}

/**
 * Pads `text` with neutral filler clauses until it reaches at least `min` chars,
 * never exceeding `max`. Used to satisfy min-length validation when the model
 * underwrites metaDescription/coverAlt. Filler clauses are appended in order
 * and only if they fit within `max`.
 */
export function padToMin(
  text: string,
  min: number,
  max: number,
  fillers: string[],
): string {
  let out = (text ?? "").trim().replace(/\s+/g, " ");
  if (out.length >= min) return out;
  for (const filler of fillers) {
    const sep = /[.!?…]$/.test(out) ? " " : ". ";
    const candidate = out ? `${out}${sep}${filler}` : filler;
    if (candidate.length > max) continue;
    out = candidate;
    if (out.length >= min) break;
  }
  return out;
}

