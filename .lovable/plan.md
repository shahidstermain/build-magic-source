
# AndamanBazaar → Lovable Migration Plan

Porting the [shahidstermain/AndamanBazaarApp](https://github.com/shahidstermain/AndamanBazaarApp) hyperlocal marketplace (Andaman & Nicobar Islands) into this Lovable project. Same React + Vite + Tailwind foundation, swapping Supabase-direct → Lovable Cloud, Gemini SDK → Lovable AI Gateway, and refreshing the visual style from the dark "VoltAgent" terminal look to a clean, friendly marketplace UI.

---

## What's being built

A mobile-first classifieds marketplace where islanders can:
- Sign up / sign in (email + Google), with auto-created profile and trust level (newbie / verified / legend)
- Browse listings by category, search, and filter by area within Port Blair and other islands
- View a listing detail page with photo gallery, seller card, favorite, and report actions
- Post a new listing with photos, category, condition, price, and area; AI-assisted description writer
- Chat 1:1 with sellers in realtime, with unread badges and last-message previews
- Manage their own profile, photo, and "Island Verified" geolocation badge
- See a seller dashboard with views, active/sold listings, conversion, and a small chart
- Read Privacy Policy and Terms of Service

---

## Visual design

A clean marketplace look — light surface, friendly typography, island-flavored accents (no monospace/terminal vibe).

- **Palette**: warm off-white background, deep ink text, **teal/aqua primary** (#0EA5A5-range, evokes lagoon water), coral accent for CTAs/badges, soft slate borders. All defined as HSL design tokens in `index.css`; dark mode supported via the existing `.dark` block.
- **Typography**: Inter for UI, slightly larger headings, generous line-height. No monospace except for prices and IDs if helpful.
- **Components**: shadcn/ui (Button, Card, Input, Tabs, Sheet, Dialog, Drawer for mobile filters, Avatar, Badge, Toast). lucide-react icons. Card-based listing grid (2-col mobile, 3–4 col desktop).
- **Mobile-first**: bottom tab nav on small screens (Home / Browse / Post / Chat / Profile), top app-bar with search.

---

## Pages & routes

| Route | View | Purpose |
|---|---|---|
| `/` | Home | Hero + categories + featured + nearby listings |
| `/listings` | Listings | Browse, search, filter (category, area, price, condition) |
| `/listings/:id` | ListingDetail | Photo gallery, description, seller card, fav/report/contact |
| `/sell` | CreateListing | New listing form with photo upload + AI description helper |
| `/chats` | ChatList | Inbox with unread counts |
| `/chats/:id` | ChatRoom | Realtime 1:1 messaging |
| `/profile` | Profile | Edit profile, photo, location verify |
| `/dashboard` | Dashboard | Seller insights (views, active, sold, chart) |
| `/auth` | AuthView | Sign up / sign in / forgot password |
| `/reset-password` | ResetPassword | New password form (required for reset flow) |
| `/privacy` | PrivacyPolicy | Static |
| `/terms` | TermsOfService | Static |
| `*` | NotFound | Existing |

A `Layout` component wraps authenticated routes with the top app-bar + bottom tab nav.

---

## Backend (Lovable Cloud)

Lovable Cloud is enabled, the original Supabase schema ports over near-1:1.

### Tables (with RLS)
- **profiles** — id (FK auth.users), name, email, phone, photo_url, city, area, is_location_verified, total_listings, successful_sales. Auto-created on signup via trigger.
- **user_roles** — id, user_id, role (`admin` | `moderator` | `user`). Roles live in their own table (never on profiles) with a `has_role()` security-definer function. Trust level (`newbie` / `verified` / `legend`) stays on profiles since it's a derived stat, not a privilege.
- **listings** — title, description, price, category_id, subcategory_id, condition, city, area, status, views_count, is_featured.
- **listing_images** — listing_id, image_url, display_order.
- **favorites** — user_id + listing_id (unique).
- **chats** — listing_id, buyer_id, seller_id, last_message, last_message_at, buyer/seller_unread_count.
- **messages** — chat_id, sender_id, message_text, image_url, is_read.
- **reports** — reporter_id, listing_id, reason, details, status.

### RLS policies
Public read on profiles/listings/listing_images. Owners-only insert/update/delete on their own listings, images, favorites. Chat participants only on chats/messages. Reports: anyone authenticated can create.

### Functions & triggers
- `handle_new_user()` — auto-insert profile on signup.
- `increment_listing_views(listing_id)` — atomic view counter (called from ListingDetail).
- `handle_new_message()` — update chat's last_message + bump recipient's unread_count.
- Realtime publication on `messages` and `chats` for live chat.

### Storage
Two buckets:
- `listing-images` (public read, owner write)
- `avatars` (public read, owner write)

### Edge functions (Lovable AI Gateway)
- `generate-listing-description` — given title + category + condition, returns a polished 2-sentence description. Uses default `google/gemini-3-flash-preview`. CTA in CreateListing: "Help me write".
- `moderate-listing` — quick safety check on title/description/images for prohibited items. Runs server-side on submit; flags get queued in `reports` for moderators.

Both functions are JWT-verified, validate input with Zod, and surface 429/402 errors to the client as toasts.

---

## Migration mapping

| Original | Replacement |
|---|---|
| `@supabase/supabase-js` direct from client | Same client, but pointed at Lovable Cloud (auto-wired) |
| `@google/genai` / `@google/generative-ai` | Edge functions calling Lovable AI Gateway |
| Firebase Hosting | Lovable Publish |
| Capacitor (Android APK) | **Dropped**. Keep `manifest.json` + service-worker-friendly setup so it installs as a PWA on Android home screen |
| `HashRouter` | `BrowserRouter` (already wired in `App.tsx`) |
| Inline VoltAgent styles, `btn-premium`, `shadow-glow`, monospace | shadcn/ui components + new design tokens |
| `lucide-react`, `recharts` | Same — already supported |
| Custom `ConfigRequiredView` for missing env | Removed — Lovable Cloud handles env automatically |

---

## Build phases

1. **Foundation**
   - Connect this project to GitHub (one-time, via Connectors).
   - Define the new design tokens (palette, radii, typography) in `index.css` and `tailwind.config.ts`.
   - Build `Layout` with top app-bar + bottom tab nav.
   - Set up routes and stub each view.

2. **Auth + profiles**
   - Email/password + Google sign-in via Lovable Cloud.
   - `AuthView`, `/reset-password` page, profile auto-creation trigger.
   - `user_roles` table, `has_role()` function, admin role wired but unused in UI yet.

3. **Listings core (browse + detail + post)**
   - Schema for listings, listing_images, favorites; storage bucket; RLS.
   - `Home` (hero, categories, featured rail).
   - `Listings` (grid, search, filter drawer).
   - `ListingDetail` (gallery, seller card, fav button, report dialog, view-count RPC).
   - `CreateListing` (multi-step form, photo upload, "Help me write" AI button).

4. **Chat**
   - `chats` + `messages` schema, RLS, realtime publication, `handle_new_message` trigger.
   - `ChatList` inbox with unread badges.
   - `ChatRoom` realtime stream, optimistic send, image messages.

5. **Profile + dashboard + static pages**
   - `Profile` edit + avatar upload + geolocation "Island Verified" badge (browser geolocation, marks `is_location_verified` if within Andaman bounds).
   - `Dashboard` recharts area/bar of views over time, KPI cards, top-performing listings.
   - `PrivacyPolicy`, `TermsOfService` ported as static MDX-style content.

6. **AI features + moderation**
   - `generate-listing-description` edge function.
   - `moderate-listing` edge function called on submit.
   - Hook AI helper into CreateListing UX.

7. **Polish + PWA**
   - Empty/loading/error states across all data views.
   - Toast notifications on success/failure.
   - PWA manifest + install prompt.
   - Mobile QA on the 384px viewport.

---

## Out of scope (can be added later)

- Capacitor/native Android build (Lovable doesn't host native builds).
- Push notifications (would need Firebase Cloud Messaging or OneSignal as a separate integration).
- Payments / paid promotions.
- Admin moderation console UI (the `user_roles` + `reports` tables are ready; a `/admin` view can be added in a follow-up).
- Multi-language (English-only for v1).

---

After you approve, I'll start with phase 1 (design tokens + layout + routes) so you see the new look in the preview quickly, then move through the phases.
