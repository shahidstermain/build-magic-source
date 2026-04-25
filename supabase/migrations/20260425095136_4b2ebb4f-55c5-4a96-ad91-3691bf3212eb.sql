
-- 1. trip_requests
CREATE TABLE public.trip_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inputs JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  preview JSONB,
  itinerary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trip_requests_status_check
    CHECK (status IN ('pending','paid','generating','generated','failed'))
);

CREATE INDEX idx_trip_requests_user ON public.trip_requests(user_id, created_at DESC);

ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trip requests"
ON public.trip_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create own trip requests"
ON public.trip_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own trip requests"
ON public.trip_requests FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_trip_requests_updated_at
BEFORE UPDATE ON public.trip_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. trip_pdfs
CREATE TABLE public.trip_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_pdfs_trip ON public.trip_pdfs(trip_id);
CREATE INDEX idx_trip_pdfs_user ON public.trip_pdfs(user_id, created_at DESC);

ALTER TABLE public.trip_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trip pdfs"
ON public.trip_pdfs FOR SELECT
USING (auth.uid() = user_id);
-- inserts done by service role only

-- 3. payments: link to trip
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS trip_id UUID;

-- 4. storage bucket trip-pdfs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-pdfs', 'trip-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own trip pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
