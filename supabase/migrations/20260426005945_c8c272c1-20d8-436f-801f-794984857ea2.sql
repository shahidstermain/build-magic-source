CREATE TABLE IF NOT EXISTS public.source_url_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_url_hashes_hash ON public.source_url_hashes(url_hash);
CREATE INDEX IF NOT EXISTS idx_source_url_hashes_created_at ON public.source_url_hashes(created_at DESC);

ALTER TABLE public.source_url_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view source url hashes"
  ON public.source_url_hashes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert source url hashes"
  ON public.source_url_hashes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete source url hashes"
  ON public.source_url_hashes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;