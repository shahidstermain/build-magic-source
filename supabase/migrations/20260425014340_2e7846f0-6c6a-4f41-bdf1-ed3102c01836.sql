ALTER TABLE public.listings
  ADD CONSTRAINT listings_seller_profile_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;