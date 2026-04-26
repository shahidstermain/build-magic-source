-- Per-link revenue analytics RPC for /admin/affiliate-revenue dashboard.
-- Returns verified vs pending revenue, 30-day zero-revenue flag, plus filters.
CREATE OR REPLACE FUNCTION public.affiliate_link_revenue_stats(
  _from timestamptz,
  _to timestamptz,
  _vendor_id uuid DEFAULT NULL,
  _item_type text DEFAULT NULL
)
RETURNS TABLE (
  recommendation_id uuid,
  item_name text,
  item_type text,
  merchant_name text,
  vendor_id uuid,
  affiliate_url text,
  link_created_at timestamptz,
  clicks bigint,
  conversions bigint,
  verified_conversions bigint,
  pending_conversions bigint,
  verified_revenue_inr bigint,
  pending_revenue_inr bigint,
  verified_commission_inr bigint,
  conversion_rate numeric,
  zero_revenue_30d boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT r.id, r.item_name, r.item_type, r.merchant_name, r.vendor_id,
           r.affiliate_url, r.created_at AS link_created_at
    FROM public.trip_recommendations r
    WHERE (_vendor_id IS NULL OR r.vendor_id = _vendor_id)
      AND (_item_type IS NULL OR r.item_type = _item_type)
  ),
  click_agg AS (
    SELECT c.recommendation_id, COUNT(*) AS clicks,
           COUNT(*) FILTER (WHERE c.created_at >= now() - interval '30 days') AS clicks_30d
    FROM public.affiliate_clicks c
    WHERE c.created_at >= _from AND c.created_at < _to + interval '1 day'
      AND c.recommendation_id IS NOT NULL
    GROUP BY c.recommendation_id
  ),
  conv_agg AS (
    SELECT cv.recommendation_id,
           COUNT(*) AS conversions,
           COUNT(*) FILTER (
             WHERE cv.status IN ('confirmed','paid') AND COALESCE(cv.amount_inr,0) > 0
           ) AS verified_conversions,
           COUNT(*) FILTER (WHERE cv.status = 'pending') AS pending_conversions,
           COALESCE(SUM(cv.amount_inr) FILTER (
             WHERE cv.status IN ('confirmed','paid') AND COALESCE(cv.amount_inr,0) > 0
           ), 0) AS verified_revenue_inr,
           COALESCE(SUM(cv.amount_inr) FILTER (WHERE cv.status = 'pending'), 0) AS pending_revenue_inr,
           COALESCE(SUM(cv.commission_inr) FILTER (
             WHERE cv.status IN ('confirmed','paid') AND COALESCE(cv.amount_inr,0) > 0
           ), 0) AS verified_commission_inr,
           COALESCE(SUM(cv.amount_inr) FILTER (
             WHERE cv.created_at >= now() - interval '30 days'
               AND cv.status IN ('confirmed','paid') AND COALESCE(cv.amount_inr,0) > 0
           ), 0) AS verified_revenue_30d
    FROM public.affiliate_conversions cv
    WHERE cv.created_at >= _from AND cv.created_at < _to + interval '1 day'
      AND cv.recommendation_id IS NOT NULL
    GROUP BY cv.recommendation_id
  )
  SELECT b.id,
         b.item_name,
         b.item_type,
         b.merchant_name,
         b.vendor_id,
         b.affiliate_url,
         b.link_created_at,
         COALESCE(ca.clicks, 0)::BIGINT,
         COALESCE(va.conversions, 0)::BIGINT,
         COALESCE(va.verified_conversions, 0)::BIGINT,
         COALESCE(va.pending_conversions, 0)::BIGINT,
         COALESCE(va.verified_revenue_inr, 0)::BIGINT,
         COALESCE(va.pending_revenue_inr, 0)::BIGINT,
         COALESCE(va.verified_commission_inr, 0)::BIGINT,
         CASE WHEN COALESCE(ca.clicks, 0) > 0
              THEN ROUND(COALESCE(va.verified_conversions,0)::numeric / ca.clicks::numeric, 4)
              ELSE 0 END,
         (COALESCE(ca.clicks_30d, 0) > 0 AND COALESCE(va.verified_revenue_30d, 0) = 0)
  FROM base b
  LEFT JOIN click_agg ca ON ca.recommendation_id = b.id
  LEFT JOIN conv_agg va ON va.recommendation_id = b.id
  ORDER BY COALESCE(va.verified_revenue_inr,0) DESC, COALESCE(ca.clicks,0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_link_revenue_stats(timestamptz, timestamptz, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_link_revenue_stats(timestamptz, timestamptz, uuid, text) TO authenticated;