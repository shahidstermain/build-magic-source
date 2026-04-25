-- Drop the blocking trigger so posting is not gated on phone verification.
-- Keep profiles.phone_verified_at, phone_otps table, and the
-- require_phone_verified_for_listing() function in place so we can
-- re-enable enforcement later by re-creating the trigger.

DROP TRIGGER IF EXISTS trg_require_phone_verified ON public.listings;