-- Atomically record a conversion and bump the recommendation's conversion_count
CREATE OR REPLACE FUNCTION public.record_affiliate_conversion(
  _recommendation_id UUID,
  _click_id UUID,
  _user_id UUID,
  _external_order_id TEXT,
  _amount_inr INTEGER,
  _commission_inr INTEGER,
  _status TEXT,
  _raw_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor UUID;
  v_user UUID;
  v_id UUID;
BEGIN
  IF _recommendation_id IS NOT NULL THEN
    SELECT vendor_id, user_id INTO v_vendor, v_user
    FROM public.trip_recommendations
    WHERE id = _recommendation_id;
  END IF;

  INSERT INTO public.affiliate_conversions
    (recommendation_id, vendor_id, click_id, user_id, external_order_id,
     amount_inr, commission_inr, status, raw_payload)
  VALUES
    (_recommendation_id, v_vendor, _click_id, COALESCE(_user_id, v_user),
     _external_order_id, _amount_inr, _commission_inr,
     COALESCE(_status, 'pending'), COALESCE(_raw_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  IF _recommendation_id IS NOT NULL AND COALESCE(_status, 'pending') IN ('confirmed', 'paid') THEN
    UPDATE public.trip_recommendations
    SET conversion_count = conversion_count + 1
    WHERE id = _recommendation_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_conversion(
  UUID, UUID, UUID, TEXT, INTEGER, INTEGER, TEXT, JSONB
) FROM PUBLIC;

-- =========================================================
-- Analytics RPCs (admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.affiliate_daily_stats(
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ,
  _vendor_id UUID DEFAULT NULL,
  _trip_id UUID DEFAULT NULL
)
RETURNS TABLE (
  day DATE,
  clicks BIGINT,
  conversions BIGINT,
  revenue_inr BIGINT,
  commission_inr BIGINT
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
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from), date_trunc('day', _to), interval '1 day')::date AS day
  ),
  click_agg AS (
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS clicks
    FROM public.affiliate_clicks
    WHERE created_at >= _from AND created_at < _to + interval '1 day'
      AND (_vendor_id IS NULL OR vendor_id = _vendor_id)
      AND (_trip_id IS NULL OR trip_id = _trip_id)
    GROUP BY 1
  ),
  conv_agg AS (
    SELECT date_trunc('day', created_at)::date AS day,
           COUNT(*) AS conversions,
           COALESCE(SUM(amount_inr), 0) AS revenue_inr,
           COALESCE(SUM(commission_inr), 0) AS commission_inr
    FROM public.affiliate_conversions
    WHERE created_at >= _from AND created_at < _to + interval '1 day'
      AND status IN ('confirmed', 'paid')
      AND (_vendor_id IS NULL OR vendor_id = _vendor_id)
      AND (_trip_id IS NULL OR recommendation_id IN (
            SELECT id FROM public.trip_recommendations WHERE trip_id = _trip_id
          ))
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(c.clicks, 0)::BIGINT,
         COALESCE(v.conversions, 0)::BIGINT,
         COALESCE(v.revenue_inr, 0)::BIGINT,
         COALESCE(v.commission_inr, 0)::BIGINT
  FROM days d
  LEFT JOIN click_agg c ON c.day = d.day
  LEFT JOIN conv_agg v ON v.day = d.day
  ORDER BY d.day;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_vendor_stats(
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  clicks BIGINT,
  conversions BIGINT,
  revenue_inr BIGINT,
  commission_inr BIGINT
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
  WITH click_agg AS (
    SELECT vendor_id, COUNT(*) AS clicks
    FROM public.affiliate_clicks
    WHERE created_at >= _from AND created_at < _to + interval '1 day'
      AND vendor_id IS NOT NULL
    GROUP BY vendor_id
  ),
  conv_agg AS (
    SELECT vendor_id,
           COUNT(*) AS conversions,
           COALESCE(SUM(amount_inr), 0) AS revenue_inr,
           COALESCE(SUM(commission_inr), 0) AS commission_inr
    FROM public.affiliate_conversions
    WHERE created_at >= _from AND created_at < _to + interval '1 day'
      AND status IN ('confirmed', 'paid')
      AND vendor_id IS NOT NULL
    GROUP BY vendor_id
  )
  SELECT v.id,
         v.name,
         COALESCE(c.clicks, 0)::BIGINT,
         COALESCE(cv.conversions, 0)::BIGINT,
         COALESCE(cv.revenue_inr, 0)::BIGINT,
         COALESCE(cv.commission_inr, 0)::BIGINT
  FROM public.affiliate_vendors v
  LEFT JOIN click_agg c ON c.vendor_id = v.id
  LEFT JOIN conv_agg cv ON cv.vendor_id = v.id
  WHERE COALESCE(c.clicks, 0) + COALESCE(cv.conversions, 0) > 0
  ORDER BY clicks DESC, conversions DESC;
END;
$$;
