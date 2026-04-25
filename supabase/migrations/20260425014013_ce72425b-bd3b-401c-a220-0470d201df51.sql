-- Enums
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'paused', 'removed');
CREATE TYPE public.listing_condition AS ENUM ('new', 'like_new', 'good', 'fair');

-- Listings
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  subcategory TEXT,
  condition public.listing_condition NOT NULL DEFAULT 'good',
  city TEXT NOT NULL DEFAULT 'Port Blair',
  area TEXT,
  status public.listing_status NOT NULL DEFAULT 'active',
  views_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listings_status_created ON public.listings (status, created_at DESC);
CREATE INDEX idx_listings_seller ON public.listings (seller_id);
CREATE INDEX idx_listings_category ON public.listings (category);
CREATE INDEX idx_listings_area ON public.listings (city, area);

CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Listing images
CREATE TABLE public.listing_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_listing_images_listing ON public.listing_images (listing_id, display_order);

-- Favorites
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_favorites_user ON public.favorites (user_id);

-- Atomic view increment
CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = _listing_id AND status = 'active';
END;
$$;

-- Maintain profiles.total_listings
CREATE OR REPLACE FUNCTION public.bump_total_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_listings = total_listings + 1
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.drop_total_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_listings = GREATEST(total_listings - 1, 0)
  WHERE id = OLD.seller_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_listing_created
AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.bump_total_listings();

CREATE TRIGGER on_listing_deleted
AFTER DELETE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.drop_total_listings();

-- RLS: listings
CREATE POLICY "Anyone can view active listings"
ON public.listings FOR SELECT
USING (status = 'active' OR auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create listings"
ON public.listings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own listings"
ON public.listings FOR DELETE
USING (auth.uid() = seller_id);

-- RLS: listing_images
CREATE POLICY "Anyone can view listing images"
ON public.listing_images FOR SELECT
USING (true);

CREATE POLICY "Owner can add images"
ON public.listing_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.seller_id = auth.uid()
  )
);

CREATE POLICY "Owner can update images"
ON public.listing_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.seller_id = auth.uid()
  )
);

CREATE POLICY "Owner can delete images"
ON public.listing_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.seller_id = auth.uid()
  )
);

-- RLS: favorites
CREATE POLICY "Users can view their favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Storage bucket for listing images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true);

CREATE POLICY "Listing images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Users can upload listing images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their listing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);