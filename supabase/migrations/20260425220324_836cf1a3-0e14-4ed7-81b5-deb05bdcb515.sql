-- =====================
-- Release notes (What's New)
-- =====================
CREATE TABLE public.release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published release notes"
  ON public.release_notes FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert release notes"
  ON public.release_notes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update release notes"
  ON public.release_notes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete release notes"
  ON public.release_notes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER release_notes_set_updated_at
  BEFORE UPDATE ON public.release_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX release_notes_published_idx
  ON public.release_notes (published_at DESC)
  WHERE is_published = true;

-- =====================
-- Visitor events
-- =====================
CREATE TABLE public.visitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  path TEXT,
  referer TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX visitor_events_session_unique ON public.visitor_events (session_id);
CREATE INDEX visitor_events_created_at_idx ON public.visitor_events (created_at DESC);

ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view visitor events"
  ON public.visitor_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- No direct INSERT policy; clients call the SECURITY DEFINER function below.

-- =====================
-- record_visitor: insert visit + notify admins
-- =====================
CREATE OR REPLACE FUNCTION public.record_visitor(
  _session_id TEXT,
  _path TEXT,
  _referer TEXT,
  _user_agent TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted BOOLEAN := false;
  v_admin_id UUID;
  v_path TEXT := COALESCE(NULLIF(_path, ''), '/');
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

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_visitor(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;