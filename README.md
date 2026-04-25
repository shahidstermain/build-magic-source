# AndamanBazaar

Hyperlocal marketplace + AI Trip Planner for the Andaman Islands. Buy & sell
with trusted local sellers, chat in real time, and plan your trip with an
AI-generated itinerary.

Built on **React + Vite + Tailwind + TypeScript** with **Lovable Cloud**
(Supabase) for auth, database, storage, and edge functions.

## Live

- **Production**: https://andamanbazaar.in
- **Staging**: https://andamanbazaarapp.lovable.app

## Features

- 🏝️ Local listings with images, search, favorites, and chat
- ✅ Verified seller badges (location + phone OTP)
- 🤖 AI Trip Planner with itinerary generation, PDF download, and affiliate-aware recommendations
- 📞 Trip planning lead capture with admin dashboard at `/admin/trip-leads`
- 🔔 Realtime in-app notifications (chats, system events, **new visitors**)
- 🆕 In-app **"What's new"** page at `/whats-new`, managed by admins at `/admin/release-notes`
- 💳 Cashfree payment flows for boosts and trips
- 📧 Branded transactional + auth emails
- 📊 Admin dashboards for affiliates, revenue, knowledge base, emails, leads, and release notes

## Local development

```bash
bun install
bun run dev
```

Type-check, lint, and tests:

```bash
bunx tsc --noEmit
bun run lint
bunx vitest run
```

## Project structure

- `src/pages` — route components
- `src/components` — shared UI
- `src/lib` — domain helpers (listings, trip planner, notifications, visitor tracking, etc.)
- `src/hooks` — auth, site meta, toast, etc.
- `supabase/functions` — edge functions (payments, emails, trip generation, affiliate links)
- `supabase/migrations` — database schema (auto-managed by Lovable Cloud)

## Admin routes

- `/admin/trip-leads` — callback requests from the AI Trip Planner
- `/admin/release-notes` — write & publish entries shown on `/whats-new`
- `/admin/affiliates`, `/admin/affiliate-revenue`, `/admin/knowledge`, `/admin/emails`

## How visitor notifications work

On first load per browser session, the app calls a SECURITY DEFINER RPC
(`record_visitor`) that inserts a row in `visitor_events` and creates a
notification for every admin. Admins see them light up in the existing bell
icon. Tracking is deduped by `session_id` (one notification per session).

## Editing

Changes pushed to GitHub sync to Lovable automatically and vice versa.
