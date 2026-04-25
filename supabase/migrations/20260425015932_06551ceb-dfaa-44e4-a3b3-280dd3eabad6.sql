CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_area TEXT NOT NULL,
  id_document_url TEXT,
  note TEXT,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewer_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_requests_user ON public.verification_requests(user_id, created_at DESC);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);

-- Only one pending request per user at a time
CREATE UNIQUE INDEX idx_verification_requests_one_pending
  ON public.verification_requests(user_id)
  WHERE status = 'pending';

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification requests"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own pending requests"
  ON public.verification_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

CREATE POLICY "Admins update any verification request"
  ON public.verification_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete verification requests"
  ON public.verification_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When approved, mark the profile verified and set the area
CREATE OR REPLACE FUNCTION public.apply_verification_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles
    SET is_location_verified = true,
        area = NEW.requested_area
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verification_apply_approval
AFTER UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.apply_verification_approval();