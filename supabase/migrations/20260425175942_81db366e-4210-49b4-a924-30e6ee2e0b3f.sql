-- 1. Add phone_verified_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 2. OTP storage table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  phone        TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  consumed_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_user_recent
  ON public.phone_otps (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone_recent
  ON public.phone_otps (phone, created_at DESC);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own OTP rows"
  ON public.phone_otps
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts and updates are done by the edge function via service role; no client policy needed.

-- 3. Trigger to enforce phone verification on listing creation
CREATE OR REPLACE FUNCTION public.require_phone_verified_for_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified TIMESTAMPTZ;
BEGIN
  SELECT phone_verified_at INTO v_verified
  FROM public.profiles
  WHERE id = NEW.seller_id;

  IF v_verified IS NULL THEN
    RAISE EXCEPTION 'phone_not_verified'
      USING HINT = 'You must verify your phone number before posting a listing.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_phone_verified ON public.listings;

CREATE TRIGGER trg_require_phone_verified
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.require_phone_verified_for_listing();