-- 1) Site settings: GitHub repo URL (admin-editable)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

-- 2) Affiliate vendors: per-vendor webhook secret (HMAC)
ALTER TABLE public.affiliate_vendors
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- 3) Affiliate conversions: source + recorded_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'affiliate_conversions' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.affiliate_conversions
      ADD COLUMN source TEXT NOT NULL DEFAULT 'webhook';
    ALTER TABLE public.affiliate_conversions
      ADD CONSTRAINT affiliate_conversions_source_check
      CHECK (source IN ('webhook','manual','utm_return'));
  END IF;
END$$;

ALTER TABLE public.affiliate_conversions
  ADD COLUMN IF NOT EXISTS recorded_by UUID;

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_created_at
  ON public.affiliate_conversions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_vendor
  ON public.affiliate_conversions (vendor_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at
  ON public.affiliate_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_vendor
  ON public.affiliate_clicks (vendor_id);

-- 4) RLS policies for admin oversight (idempotent)
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_vendors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Admins can SELECT everything
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='affiliate_clicks' AND policyname='affiliate_clicks_admin_select'
  ) THEN
    CREATE POLICY affiliate_clicks_admin_select ON public.affiliate_clicks
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='affiliate_conversions' AND policyname='affiliate_conversions_admin_select'
  ) THEN
    CREATE POLICY affiliate_conversions_admin_select ON public.affiliate_conversions
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='affiliate_vendors' AND policyname='affiliate_vendors_admin_all'
  ) THEN
    CREATE POLICY affiliate_vendors_admin_all ON public.affiliate_vendors
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Admins can INSERT manual conversions (recorded_by must be themselves, source must be 'manual')
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='affiliate_conversions' AND policyname='affiliate_conversions_admin_manual_insert'
  ) THEN
    CREATE POLICY affiliate_conversions_admin_manual_insert ON public.affiliate_conversions
      FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        AND source = 'manual'
        AND recorded_by = auth.uid()
      );
  END IF;
END$$;

-- 5) Helper view: per-link (recommendation) performance with high-traffic-no-revenue flag
CREATE OR REPLACE VIEW public.affiliate_link_performance
WITH (security_invoker = true) AS
SELECT
  r.id                          AS recommendation_id,
  r.trip_id,
  r.vendor_id,
  r.merchant_name,
  r.item_name,
  r.affiliate_url,
  r.created_at                  AS link_created_at,
  COALESCE(c.clicks, 0)         AS clicks,
  COALESCE(v.conversions, 0)    AS conversions,
  COALESCE(v.revenue_inr, 0)    AS revenue_inr,
  COALESCE(v.commission_inr, 0) AS commission_inr,
  CASE
    WHEN COALESCE(c.clicks,0) > 50 AND COALESCE(v.conversions,0) = 0
      THEN true
    ELSE false
  END AS is_high_traffic_no_revenue
FROM public.trip_recommendations r
LEFT JOIN (
  SELECT recommendation_id, COUNT(*)::int AS clicks
  FROM public.affiliate_clicks
  WHERE recommendation_id IS NOT NULL
  GROUP BY recommendation_id
) c ON c.recommendation_id = r.id
LEFT JOIN (
  SELECT recommendation_id,
         COUNT(*) FILTER (WHERE status IN ('confirmed','paid'))::int AS conversions,
         COALESCE(SUM(amount_inr) FILTER (WHERE status IN ('confirmed','paid')), 0)::numeric AS revenue_inr,
         COALESCE(SUM(commission_inr) FILTER (WHERE status IN ('confirmed','paid')), 0)::numeric AS commission_inr
  FROM public.affiliate_conversions
  WHERE recommendation_id IS NOT NULL
  GROUP BY recommendation_id
) v ON v.recommendation_id = r.id;

GRANT SELECT ON public.affiliate_link_performance TO authenticated;
