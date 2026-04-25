-- =========================================================
-- Affiliate vendors (merchant master)
-- =========================================================
CREATE TABLE public.affiliate_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'hotel' | 'ferry' | 'activity' | 'package' | 'transport' | 'addon'
  description TEXT,
  homepage_url TEXT,
  affiliate_url_template TEXT NOT NULL, -- supports {{query}}, {{from}}, {{to}}, {{date}}
  commission_type TEXT, -- 'cps' | 'cpc' | 'flat' | NULL
  commission_value TEXT, -- free-form e.g. '5%'
  disclosure_text TEXT NOT NULL DEFAULT 'This is an affiliate link. We may earn a commission if you buy through it.',
  trusted BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0, -- higher = preferred
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_vendors_category ON public.affiliate_vendors(category) WHERE active;
ALTER TABLE public.affiliate_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendors"
  ON public.affiliate_vendors FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage vendors insert"
  ON public.affiliate_vendors FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage vendors update"
  ON public.affiliate_vendors FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage vendors delete"
  ON public.affiliate_vendors FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_vendors_updated_at
  BEFORE UPDATE ON public.affiliate_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Trip recommendations (per-trip AI picks)
-- =========================================================
CREATE TABLE public.trip_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trip_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.affiliate_vendors(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL, -- 'hotel' | 'ferry' | 'activity' | 'package' | 'transport' | 'addon'
  item_name TEXT NOT NULL,
  short_description TEXT,
  merchant_name TEXT NOT NULL,
  price_inr INTEGER, -- nullable, nullable for "from ₹X"
  price_label TEXT, -- 'per night', 'per seat', 'per person', etc.
  affiliate_url TEXT NOT NULL,
  disclosure_text TEXT NOT NULL DEFAULT 'This is an affiliate link. We may earn a commission if you buy through it.',
  cta_label TEXT NOT NULL DEFAULT 'Book now',
  is_affiliate BOOLEAN NOT NULL DEFAULT true,
  rank INTEGER NOT NULL DEFAULT 0, -- lower = more relevant, used for ordering
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trip_recommendations_trip ON public.trip_recommendations(trip_id);
CREATE INDEX idx_trip_recommendations_user ON public.trip_recommendations(user_id);
ALTER TABLE public.trip_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their trip recommendations"
  ON public.trip_recommendations FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- inserts go through edge function (service role); no client INSERT policy needed
-- but allow admins to manage manually
CREATE POLICY "Admins insert recommendations"
  ON public.trip_recommendations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update recommendations"
  ON public.trip_recommendations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete recommendations"
  ON public.trip_recommendations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Affiliate clicks (analytics)
-- =========================================================
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES public.trip_recommendations(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.affiliate_vendors(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trip_requests(id) ON DELETE SET NULL,
  user_id UUID,
  affiliate_url TEXT NOT NULL,
  referer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_clicks_rec ON public.affiliate_clicks(recommendation_id);
CREATE INDEX idx_affiliate_clicks_vendor ON public.affiliate_clicks(vendor_id);
CREATE INDEX idx_affiliate_clicks_user ON public.affiliate_clicks(user_id);
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Inserts handled server-side (service role) for accurate redirect tracking
CREATE POLICY "Admins view clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (auth.uid() = user_id);

-- =========================================================
-- Affiliate conversions (schema only)
-- =========================================================
CREATE TABLE public.affiliate_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID REFERENCES public.trip_recommendations(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.affiliate_vendors(id) ON DELETE SET NULL,
  click_id UUID REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  user_id UUID,
  external_order_id TEXT,
  amount_inr INTEGER,
  commission_inr INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected' | 'paid'
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_conversions_rec ON public.affiliate_conversions(recommendation_id);
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage conversions insert"
  ON public.affiliate_conversions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage conversions update"
  ON public.affiliate_conversions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_affiliate_conversions_updated_at
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed common Andaman vendors (placeholder affiliate URLs;
-- admin can update later from DB / admin panel)
-- =========================================================
INSERT INTO public.affiliate_vendors
  (slug, name, category, description, homepage_url, affiliate_url_template, trusted, priority)
VALUES
  ('makruzz', 'Makruzz Ferries', 'ferry',
    'Premium high-speed ferry between Port Blair, Havelock and Neil.',
    'https://www.makruzz.com',
    'https://www.makruzz.com/?utm_source=andamanbazaar&utm_medium=trip_planner',
    true, 90),
  ('nautika', 'Nautika by Makruzz', 'ferry',
    'Luxury catamaran ferry across the Andamans.',
    'https://www.gonautika.com',
    'https://www.gonautika.com/?utm_source=andamanbazaar',
    true, 85),
  ('green-ocean', 'Green Ocean Ferries', 'ferry',
    'Reliable inter-island ferry service.',
    'https://greenoceanseaways.com',
    'https://greenoceanseaways.com/?utm_source=andamanbazaar',
    true, 70),
  ('booking-com', 'Booking.com', 'hotel',
    'Hotels, resorts and homestays across the Andamans.',
    'https://www.booking.com',
    'https://www.booking.com/searchresults.html?ss={{query}}&aid=andamanbazaar',
    true, 95),
  ('makemytrip', 'MakeMyTrip', 'package',
    'Flights, hotels and packages to the Andamans.',
    'https://www.makemytrip.com',
    'https://www.makemytrip.com/holidays-india/andaman_holiday_packages.html?utm_source=andamanbazaar',
    true, 90),
  ('agoda', 'Agoda', 'hotel',
    'Asia-focused hotel deals, strong on Andaman resorts.',
    'https://www.agoda.com',
    'https://www.agoda.com/search?city=andaman&utm_source=andamanbazaar',
    true, 75),
  ('getyourguide', 'GetYourGuide', 'activity',
    'Guided tours, snorkeling, scuba and day trips.',
    'https://www.getyourguide.com',
    'https://www.getyourguide.com/-l3093/?q={{query}}&partner_id=andamanbazaar',
    true, 80),
  ('viator', 'Viator', 'activity',
    'Day tours and experiences in the Andamans.',
    'https://www.viator.com',
    'https://www.viator.com/searchResults/all?text={{query}}&pid=andamanbazaar',
    true, 70),
  ('thrillophilia', 'Thrillophilia', 'activity',
    'Adventure activities, scuba and watersports.',
    'https://www.thrillophilia.com',
    'https://www.thrillophilia.com/cities/port-blair?utm_source=andamanbazaar',
    true, 65),
  ('andamanbazaar', 'AndamanBazaar Marketplace', 'addon',
    'Rent gear locally — bikes, snorkels, surf gear from verified sellers.',
    'https://andamanbazaar.in',
    '/listings?category={{query}}',
    true, 100);
