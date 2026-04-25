## AI Andaman Trip Planner — Implementation Plan

Adapted to the existing AndamanBazaar stack: **React + Vite + Tailwind + shadcn/ui + Supabase + Cashfree** (not React Native/Razorpay). AI via **Lovable AI Gateway** (`google/gemini-2.5-pro`). Price **₹49**. Preview = teaser (Day 1 morning + summary, rest locked).

---

### 1. Database (migration)

**Table `trip_requests`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (auth.users.id, no FK per project rules)
- `inputs jsonb not null` — `{ days, budget: 'low'|'medium'|'high', start_date, end_date, interests: text[], islands: text[] }`
- `status text not null default 'pending'` — `pending | paid | generating | generated | failed`
- `preview jsonb` — small teaser blob generated pre-payment
- `itinerary jsonb` — full structured output (post-payment)
- `error text`
- `created_at`, `updated_at` timestamptz

**Table `trip_pdfs`**
- `id uuid pk`
- `trip_id uuid not null`
- `user_id uuid not null`
- `storage_path text not null` (e.g. `trip-pdfs/<user>/<trip>.pdf`)
- `created_at` timestamptz

**Reuse `payments` table** with new `purpose = 'trip_plan'`. Add `trip_id uuid` nullable column (the `listing_id` column stays unused for this purpose).

**RLS**
- `trip_requests`: SELECT/UPDATE/INSERT only where `auth.uid() = user_id`.
- `trip_pdfs`: SELECT only where `auth.uid() = user_id`. INSERT only via service role (edge function).
- Storage bucket **`trip-pdfs`** — **private**. Policy: users can SELECT objects whose first folder segment equals their `auth.uid()::text`.

---

### 2. Edge functions (Deno, follow existing Cashfree pattern)

1. **`trip-preview`** — auth required. Inserts `trip_requests` row (status `pending`), calls Lovable AI for a short teaser (summary + Day 1 morning only), stores in `preview`, returns `{ trip_id, preview }`. No PDF, no payment yet.

2. **`cashfree-create-trip-order`** — mirrors `cashfree-create-order` but for a `trip_id`. Amount ₹49. Stores `payments` row with `purpose='trip_plan'`, `trip_id` in `notes`. Returns `payment_session_id`.

3. **`cashfree-verify-trip-payment`** — mirrors existing verify. On `paid`: marks payment paid, sets `trip_requests.status='paid'`, then **inline triggers** `trip-generate` (await). Returns `{ status, trip_id, pdf_path? }`.

4. **`trip-generate`** — auth required (or service-role internal call). Loads paid `trip_requests` row, calls Lovable AI Gateway with a strict tool-calling JSON schema for the full itinerary (cover, overview, days[], ferry_logistics, budget, recommendations, packing, emergency). Renders PDF server-side (see §3), uploads to `trip-pdfs/<user_id>/<trip_id>.pdf`, inserts `trip_pdfs` row, sets `status='generated'`. Returns `{ storage_path }`.

5. **`trip-download-url`** — auth required. Verifies caller owns the trip; returns a short-lived signed URL (`createSignedUrl`, 10 min) for the PDF.

All functions: CORS headers, Zod-style input validation, structured error logging, surface 402/429 from Lovable AI as friendly toasts on the client. `verify_jwt` left at default (in-code auth check via `getUser()`).

---

### 3. PDF generation (server-side, Deno)

Use **`pdf-lib`** (`https://esm.sh/pdf-lib@1.17.1`) inside `trip-generate`. Pure JS, no native deps, works in Deno. Layout:

- Cover: AndamanBazaar logo block, trip title, dates, days, traveller type, budget tier.
- Overview page: 2–3 sentence trip thesis + at-a-glance day summaries.
- Per-day pages: heading, morning / afternoon / evening blocks, ferry hops (with timing notes), travel-time buffers, weather backup, "local insider" tip.
- Ferry & logistics page (consolidated table).
- Budget breakdown (table + total).
- Local recommendations (food, hidden spots, marketplace cross-links to relevant categories like bike rentals).
- Packing checklist.
- Emergency & practical tips.
- Closing summary + share line.

Design: clean sans, generous spacing, primary color accent strip, page numbers, footer with `andamanbazaar.in`.

The AI returns structured JSON (tool-calling) so layout is deterministic and not parsed from prose.

---

### 4. AI prompt strategy (`trip-generate`)

System prompt establishes the persona: *"You are an Andaman local insider, ferry logistics expert, and budget optimizer. Produce realistic, conservative itineraries grounded in real Andaman geography (Port Blair, Havelock/Swaraj Dweep, Neil/Shaheed Dweep, Baratang, Long Island, Diglipur). Never schedule impossible ferry sequences. Always include weather backups. Avoid generic tourist fluff."*

Hard rules embedded:
- Inter-island days require an explicit ferry slot (Makruzz/Green Ocean/Nautika typical morning/afternoon windows) and a 90-minute buffer.
- Max one inter-island transfer per day.
- Day 1 = Port Blair arrival logistics (no Havelock same-day unless flight lands before 10:00).
- Last day = back to Port Blair before 18:00.
- Budget tier maps to ₹/day ranges: low ≈ ₹1.5–2.5k, medium ≈ ₹3–5k, high ≈ ₹6k+ (excluding flights).
- Marketplace cross-sell: when the itinerary needs a scooter, snorkel gear, etc., include a suggestion line linking to `/listings?category=...`.

Tool schema enforces `{ cover, overview, days[{ date, island, morning, afternoon, evening, ferry, weather_backup, insider_tip }], ferry_logistics[], budget{items[],total}, recommendations{food[],hidden[],marketplace[]}, packing[], emergency[] }`.

Model: `google/gemini-2.5-pro`, `reasoning.effort='medium'`.

---

### 5. Frontend

**New route `/trip-planner`** added to `App.tsx`, plus a top-level entry point on `Index.tsx` (hero CTA "Plan your Andaman trip with AI — ₹49") and a `Sparkles` icon item in the header/dropdown.

**Pages / components**
- `src/pages/TripPlanner.tsx` — multi-step wizard:
  1. Form (days, dates with shadcn DatePicker, budget tier, interests checkboxes, optional islands).
  2. Loading → preview screen with teaser + locked sections (blurred cards with lock icon + "Unlock full plan ₹49").
  3. `PayTripDialog` (mirrors `BoostListingDialog`: Cashfree SDK modal, error UI with stage/attempt, retry button).
  4. Generating spinner (calls `trip-download-url` once `status='generated'`; polls every 2s up to 60s).
  5. Success: download button + share (Web Share API with fallback to copying signed URL) + "Plan another".
- `src/pages/MyTrips.tsx` — list of past trips for the user (status badges, redownload button that re-signs URL).
- `src/components/TripPreviewCard.tsx`, `src/components/LockedSection.tsx`, `src/components/PayTripDialog.tsx`.
- `src/lib/tripPlanner.ts` — typed wrappers around the 5 edge functions; clean separation from UI.

Add **My Trips** link to user dropdown in `Layout.tsx`.

All states covered: loading, empty (no past trips), error (with retry), rate-limit (`429` → friendly toast), credits (`402` → friendly toast), payment-cancelled, generation-failed (refundable note + retry generate without re-paying).

---

### 6. Validation, security, hygiene

- Zod schema for form inputs both client- and server-side.
- Server enforces: caller owns trip, payment status = `paid` before generation, generation idempotent (skip if `status='generated'`).
- Signed URLs only — never expose public storage paths.
- Secrets stay server-side (`LOVABLE_API_KEY`, `CASHFREE_*`).
- Strict CORS headers matching existing functions.
- All edge functions log structured errors; client-side `PayTripDialog` shows stage + attempt details like `BoostListingDialog`.

---

### 7. Files to add / edit

**New**
- `supabase/migrations/<ts>_trip_planner.sql`
- `supabase/functions/trip-preview/index.ts`
- `supabase/functions/cashfree-create-trip-order/index.ts`
- `supabase/functions/cashfree-verify-trip-payment/index.ts`
- `supabase/functions/trip-generate/index.ts`
- `supabase/functions/trip-download-url/index.ts`
- `src/pages/TripPlanner.tsx`
- `src/pages/MyTrips.tsx`
- `src/components/PayTripDialog.tsx`
- `src/components/TripPreviewCard.tsx`
- `src/components/LockedSection.tsx`
- `src/lib/tripPlanner.ts`

**Edit**
- `src/App.tsx` — add `/trip-planner` and `/my-trips` routes.
- `src/pages/Index.tsx` — add hero CTA card.
- `src/components/Layout.tsx` — add "My Trips" dropdown item.

No changes to existing payment/Cashfree code — new functions live alongside, sharing the same secrets.

---

### 8. Out of scope (called out)

- React Native app (project is web).
- Razorpay (project standardised on Cashfree).
- Refund automation (manual support note in failure UI).
- Multi-language PDFs (English only v1).

Approve and I'll implement end-to-end in default mode.