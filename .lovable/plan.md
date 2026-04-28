## Fix: Stories agent skipping on metaDescription / coverAlt length

The stories agent (`supabase/functions/andaman-stories-agent/index.ts`) currently validates the model output as-is. The news agent already has a `normalizePost` step that auto-clamps lengths and injects an Andaman location reference into `coverAlt` — the stories agent doesn't, so it fails on:

- `metaDescription 90-165 chars`
- `coverAlt 50-125 chars`

### Change

In `supabase/functions/andaman-stories-agent/index.ts`:

1. Add helpers (mirroring the news agent):
   - `smartTruncate(text, max)` — word-boundary truncate with "…".
   - `normalizePost(post)`:
     - Trim/collapse whitespace on `metaDescription`; if `> META_DESC_MAX` (165), `smartTruncate` it.
     - Trim/collapse `coverAlt`; if `> ALT_MAX` (125), `smartTruncate`.
     - If `coverAlt` doesn't already include an Andaman keyword, append `" in the Andaman Islands"` (or a truncated body + suffix) so it stays ≤ 125 chars.

2. Wrap both `generateStory` calls in the handler with `normalizePost(...)` so attempt 1 and the retry both pass through the normalizer before `validate()`.

### Notes

- Keeps current `META_DESC_MIN` (90) / `ALT_MIN` (50) lower bounds untouched — those still rely on the model producing enough content; only over-length and missing-place cases are auto-fixed (which match the failures we're seeing).
- No DB or schema changes. Only the stories agent edge function is modified, then redeployed.
