DO $$
DECLARE
  v_rec_id uuid;
  v_conv_id uuid;
  v_count int;
BEGIN
  -- Pick any existing recommendation to attach the test conversion to
  SELECT id INTO v_rec_id FROM public.trip_recommendations
  WHERE merchant_name ILIKE '%Makruzz%' LIMIT 1;

  -- Call the RPC the webhooks use
  v_conv_id := public.record_affiliate_conversion(
    v_rec_id,
    NULL,
    NULL,
    'qa-selftest-' || extract(epoch from now())::text,
    12500,
    625,
    'confirmed',
    '{"qa_selftest": true}'::jsonb
  );

  -- Verify it landed
  SELECT count(*) INTO v_count FROM public.affiliate_conversions WHERE id = v_conv_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA FAIL: conversion not written (id=%)', v_conv_id;
  END IF;

  -- Verify the recommendation counter incremented
  PERFORM 1 FROM public.trip_recommendations WHERE id = v_rec_id AND conversion_count >= 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QA FAIL: trip_recommendations.conversion_count not bumped';
  END IF;

  -- Clean up: remove conversion and decrement counter
  DELETE FROM public.affiliate_conversions WHERE id = v_conv_id;
  UPDATE public.trip_recommendations
    SET conversion_count = GREATEST(conversion_count - 1, 0)
    WHERE id = v_rec_id;

  RAISE NOTICE 'QA PASS: record_affiliate_conversion OK, conv_id=%', v_conv_id;
END $$;