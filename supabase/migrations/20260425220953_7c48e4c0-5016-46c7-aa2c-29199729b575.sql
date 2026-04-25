
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS visitor_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visitor_alerts_in_app BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visitor_alerts_email_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visitor_alert_email TEXT,
  ADD COLUMN IF NOT EXISTS visitor_alerts_webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visitor_alert_webhook_url TEXT;

CREATE OR REPLACE FUNCTION public.record_visitor(_session_id text, _path text, _referer text, _user_agent text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted BOOLEAN := false;
  v_admin_id UUID;
  v_path TEXT := COALESCE(NULLIF(_path, ''), '/');
  v_alerts_on BOOLEAN := true;
  v_in_app_on BOOLEAN := true;
BEGIN
  IF _session_id IS NULL OR length(_session_id) < 8 OR length(_session_id) > 100 THEN
    RETURN false;
  END IF;

  INSERT INTO public.visitor_events (session_id, user_id, path, referer, user_agent)
  VALUES (
    _session_id,
    auth.uid(),
    left(v_path, 200),
    left(COALESCE(_referer, ''), 300),
    left(COALESCE(_user_agent, ''), 300)
  )
  ON CONFLICT (session_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF NOT v_inserted THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(visitor_alerts_enabled, true),
    COALESCE(visitor_alerts_in_app, true)
  INTO v_alerts_on, v_in_app_on
  FROM public.site_settings
  WHERE id = true;

  IF v_alerts_on AND v_in_app_on THEN
    FOR v_admin_id IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_admin_id,
        'system',
        'New visitor on AndamanBazaar',
        'Path: ' || v_path,
        v_path
      );
    END LOOP;
  END IF;

  RETURN true;
END;
$function$;
