## Problem

Both "Run news agent" and "Run stories agent" buttons in `/admin/blog` fail with:

> Edge Function returned a non-2xx status code

Investigation shows:

1. **`andaman-stories-agent` and `admin-trigger-stories-agent` source files are missing** from `supabase/functions/` locally. Although the deployed remote versions still exist (we see HTTP 500s from `admin-trigger-stories-agent` in edge logs), there is no source to fix or redeploy. The "Run stories agent" button in `AdminBlog.tsx` doesn't even exist yet in the current code — it only has the news agent button.
2. **`admin-trigger-news-agent` returned 500** in recent runs (`execution_time_ms: 1508`) with no captured `console.error` — meaning either the auth `getClaims` flow threw, or the proxied `andaman-news-agent` fetch returned a non-2xx body that bubbled up as a 500 status to the client. The proxy currently swallows error context.
3. The proxies do not log the upstream status/body, so we cannot tell from logs whether it's an auth failure, a missing secret, an LLM error, or a moderation/duplicate skip being misclassified.

## Goal

- Restore the stories agent end-to-end (edge function + admin proxy + admin button + cron schedule + `verify_jwt=false` config).
- Make both proxies log the upstream response and return a structured error so the admin UI shows the real reason instead of "non-2xx".
- Verify both agents run successfully from the admin dashboard.

## Plan

### 1. Recreate `supabase/functions/andaman-stories-agent/index.ts`

Mirror the architecture of `andaman-news-agent` but for evergreen organic-traffic content:

- Triggered by `x-cron-secret` header (reuse `NEWS_AGENT_SECRET`) or by the admin proxy.
- Brainstorm an evergreen Andaman topic via Lovable AI (`google/gemini-2.5-flash`) from a rotating pool: beaches, ferries, diving, food, budget guides, itineraries, festivals, packing, monsoon tips, etc.
- Pull the last 40 published `posts` (category `blog`) to:
  - Avoid duplicate topics (Jaccard similarity on title+tags ≥ 0.55 → skip).
  - Encourage topical diversity.
- Generate 500–1100 word Markdown with H2s, FAQ section, and SEO meta via Lovable AI.
- Run AI moderation pass (banned terms list, geo-keyword requirement, structural checks reusing helpers from the news agent).
- Generate cover image via `google/gemini-3.1-flash-image-preview`, upload to `post-images` bucket under `stories-agent/`.
- Insert into `posts` with `category='blog'`, `status='published'`, `author_id` = a designated admin user (look up by `has_role`).
- Return `{ status: 'created' | 'skipped' | 'error', slug?, title?, reason?, cover_image_url? }`.

### 2. Recreate `supabase/functions/admin-trigger-stories-agent/index.ts`

Same shape as `admin-trigger-news-agent`: verify Bearer token → check `has_role('admin')` → proxy to `andaman-stories-agent` with `x-cron-secret`.

### 3. Harden both admin proxies

In `admin-trigger-news-agent` and the new stories proxy:

- Wrap each step (`getClaims`, `has_role`, upstream `fetch`) in a try/catch with `console.error` so failures appear in logs.
- When the upstream returns non-2xx, **return HTTP 200** to the client with a structured body: `{ status: 'error', upstream_status, error: <parsed message or raw body snippet> }`. This way the admin UI can render the real reason instead of throwing on `error` from `supabase.functions.invoke`.
- Log `upstream_status` and a 500-char snippet of the body before returning.

### 4. Add the stories button + result card to `AdminBlog.tsx`

- Add "Run stories agent" button next to "Run news agent" using the same loading state pattern.
- Reuse the existing `agentResult` card for both (or split into two). Keep it minimal — one card that shows the most recent result with a label of which agent ran.

### 5. Update `supabase/config.toml`

Add:

```toml
[functions.andaman-stories-agent]
verify_jwt = false
```

(`admin-trigger-stories-agent` keeps default — it validates the JWT in code.)

### 6. Re-add the daily pg_cron schedule for stories

```sql
select cron.schedule(
  'andaman-stories-agent-daily',
  '30 6 * * *',
  $$ select net.http_post(
       url := 'https://tsduibmoqntxqdaswbef.supabase.co/functions/v1/andaman-stories-agent',
       headers := jsonb_build_object(
         'Content-Type','application/json',
         'x-cron-secret', current_setting('app.news_agent_secret', true)
       )
     ); $$
);
```

(Match whatever pattern the existing news cron uses — will inspect `cron.job` first and reuse the same secret-passing approach.)

### 7. Verify

- Deploy `andaman-stories-agent`, `admin-trigger-stories-agent`, and the patched `admin-trigger-news-agent`.
- Call both via `supabase--curl_edge_functions` while logged in as admin.
- Read edge logs to confirm the upstream status/body is now logged.
- Confirm the admin UI surfaces meaningful errors (e.g. "moderation rejected: …", "no fresh story found", "LOVABLE_API_KEY missing") instead of "non-2xx".

## Files touched

- `supabase/functions/andaman-stories-agent/index.ts` (new)
- `supabase/functions/admin-trigger-stories-agent/index.ts` (new)
- `supabase/functions/admin-trigger-news-agent/index.ts` (harden error reporting)
- `supabase/config.toml` (add stories agent block)
- `src/pages/AdminBlog.tsx` (add stories button + result card)
- One SQL migration to (re)create the pg_cron schedule

## Notes / risks

- Lovable AI may rate-limit (429) or return 402 — both proxies will surface that text now instead of opaque 500.
- If the news agent itself is currently broken on the deployed side, hardening the proxy will reveal the real cause in the next run; we may then need a follow-up patch to the news agent. I'll capture the upstream body on the first verification run and patch if needed before declaring done.
