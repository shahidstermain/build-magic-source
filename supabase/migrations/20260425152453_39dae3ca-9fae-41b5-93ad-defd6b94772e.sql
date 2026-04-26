-- ── 1. Schema additions ───────────────────────────────────────────────────────

ALTER TABLE listings ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE TABLE IF NOT EXISTS listing_reviews (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id    UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL,
  ratings       JSONB       NOT NULL,
  comment       TEXT        NOT NULL,
  helpful_count INTEGER     DEFAULT 0,
  is_verified   BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_helpfulness (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id  UUID        NOT NULL REFERENCES listing_reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  is_helpful BOOLEAN     NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

CREATE TABLE IF NOT EXISTS collaborative_trips (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id      UUID        NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  shared_notes TEXT,
  created_by   UUID        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborative_trip_id UUID        NOT NULL REFERENCES collaborative_trips(id) ON DELETE CASCADE,
  email                 TEXT        NOT NULL,
  user_id               UUID,
  role                  TEXT        DEFAULT 'collaborator',
  invited_at            TIMESTAMPTZ DEFAULT NOW(),
  joined_at             TIMESTAMPTZ,
  UNIQUE(collaborative_trip_id, email)
);

CREATE TABLE IF NOT EXISTS whatsapp_shares (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID,
  listing_id       UUID        REFERENCES listings(id) ON DELETE SET NULL,
  trip_id          UUID        REFERENCES trip_requests(id) ON DELETE SET NULL,
  share_type       TEXT        NOT NULL,
  message_template TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Constraints ────────────────────────────────────────────────────────────

ALTER TABLE listing_reviews DROP CONSTRAINT IF EXISTS check_comment_length;
ALTER TABLE listing_reviews ADD CONSTRAINT check_comment_length
  CHECK (char_length(comment) >= 10 AND char_length(comment) <= 1000);

ALTER TABLE trip_collaborators DROP CONSTRAINT IF EXISTS check_email_format;
ALTER TABLE trip_collaborators ADD CONSTRAINT check_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing_id    ON listing_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reviews_user_id       ON listing_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_reviews_created_at    ON listing_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category_subcategory ON listings(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_listings_price                ON listings(price);
CREATE INDEX IF NOT EXISTS idx_collab_trips_created_by       ON collaborative_trips(created_by);
CREATE INDEX IF NOT EXISTS idx_collab_trips_trip_id          ON collaborative_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collabs_email            ON trip_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_whatsapp_shares_user          ON whatsapp_shares(user_id, created_at DESC);

-- ── 4. Functions (with secure search_path) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_listing_rating(listing_uuid UUID)
RETURNS TABLE(average_rating NUMERIC, total_reviews INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG((r.ratings->>'overall')::NUMERIC), 0)::NUMERIC(3,2),
    COUNT(*)::INTEGER
  FROM listing_reviews r
  WHERE r.listing_id = listing_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_review_helpfulness_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listing_reviews
      SET helpful_count = helpful_count + (CASE WHEN NEW.is_helpful THEN 1 ELSE 0 END)
      WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE listing_reviews
      SET helpful_count = helpful_count
        + (CASE WHEN NEW.is_helpful THEN 1 ELSE 0 END)
        - (CASE WHEN OLD.is_helpful THEN 1 ELSE 0 END)
      WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listing_reviews
      SET helpful_count = helpful_count - (CASE WHEN OLD.is_helpful THEN 1 ELSE 0 END)
      WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_review_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM listing_reviews
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Review rate limit exceeded. Maximum 5 reviews per day.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_review_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE k TEXT; v NUMERIC;
BEGIN
  FOR k, v IN SELECT key, value::text::numeric FROM jsonb_each_text(NEW.ratings) LOOP
    IF v < 1 OR v > 5 THEN
      RAISE EXCEPTION 'Rating for % must be 1–5, got %', k, v;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── 5. Triggers ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_listing_reviews_updated_at ON listing_reviews;
CREATE TRIGGER trg_listing_reviews_updated_at
  BEFORE UPDATE ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_collab_trips_updated_at ON collaborative_trips;
CREATE TRIGGER trg_collab_trips_updated_at
  BEFORE UPDATE ON collaborative_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_review_helpfulness_count ON review_helpfulness;
CREATE TRIGGER trg_review_helpfulness_count
  AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpfulness_count();

DROP TRIGGER IF EXISTS trg_review_rate_limit ON listing_reviews;
CREATE TRIGGER trg_review_rate_limit
  BEFORE INSERT ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_review_rate_limit();

DROP TRIGGER IF EXISTS trg_validate_review_ratings ON listing_reviews;
CREATE TRIGGER trg_validate_review_ratings
  BEFORE INSERT OR UPDATE ON listing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_ratings();

-- ── 6. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE listing_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness  ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_shares     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON listing_reviews;
DROP POLICY IF EXISTS "reviews_insert" ON listing_reviews;
DROP POLICY IF EXISTS "reviews_update" ON listing_reviews;
DROP POLICY IF EXISTS "reviews_delete" ON listing_reviews;
CREATE POLICY "reviews_select" ON listing_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON listing_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update" ON listing_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete" ON listing_reviews FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "helpfulness_select" ON review_helpfulness;
DROP POLICY IF EXISTS "helpfulness_insert" ON review_helpfulness;
DROP POLICY IF EXISTS "helpfulness_update" ON review_helpfulness;
DROP POLICY IF EXISTS "helpfulness_delete" ON review_helpfulness;
CREATE POLICY "helpfulness_select" ON review_helpfulness FOR SELECT USING (true);
CREATE POLICY "helpfulness_insert" ON review_helpfulness FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "helpfulness_update" ON review_helpfulness FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "helpfulness_delete" ON review_helpfulness FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "collab_trips_select" ON collaborative_trips;
DROP POLICY IF EXISTS "collab_trips_insert" ON collaborative_trips;
DROP POLICY IF EXISTS "collab_trips_update" ON collaborative_trips;
DROP POLICY IF EXISTS "collab_trips_delete" ON collaborative_trips;
CREATE POLICY "collab_trips_select" ON collaborative_trips FOR SELECT USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM trip_collaborators WHERE collaborative_trip_id = collaborative_trips.id AND user_id = auth.uid())
);
CREATE POLICY "collab_trips_insert" ON collaborative_trips FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "collab_trips_update" ON collaborative_trips FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "collab_trips_delete" ON collaborative_trips FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "trip_collabs_select" ON trip_collaborators;
DROP POLICY IF EXISTS "trip_collabs_all"    ON trip_collaborators;
CREATE POLICY "trip_collabs_select" ON trip_collaborators FOR SELECT USING (
  EXISTS (SELECT 1 FROM collaborative_trips WHERE id = collaborative_trip_id AND created_by = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "trip_collabs_all" ON trip_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM collaborative_trips WHERE id = collaborative_trip_id AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "wa_shares_select" ON whatsapp_shares;
DROP POLICY IF EXISTS "wa_shares_insert" ON whatsapp_shares;
CREATE POLICY "wa_shares_select" ON whatsapp_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wa_shares_insert" ON whatsapp_shares FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ── 7. Seed experience listings (only if none exist) ──────────────────────────

DO $$
DECLARE
  seed_seller UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM listings WHERE category = 'experiences' LIMIT 1) THEN
    RAISE NOTICE 'Experience listings already seeded — skipping.';
    RETURN;
  END IF;

  SELECT user_id INTO seed_seller FROM user_roles WHERE role = 'admin' LIMIT 1;

  IF seed_seller IS NULL THEN
    RAISE NOTICE 'No admin user found. Seed skipped. Run again after creating an admin account.';
    RETURN;
  END IF;

  INSERT INTO listings (seller_id, title, description, price, category, subcategory, condition, area, city, status) VALUES
  (seed_seller, 'Scuba Diving at North Bay Island – Shore Dive', 'Shore scuba diving at North Bay Island, Port Blair. Vibrant coral reefs and diverse marine life steps from the beach. Beginners welcome (age 12+). Full training, equipment, and underwater photos included. Duration: ~2 hrs.', 3500, 'experiences', 'scuba_diving', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Sea Walk at North Bay Island', 'Walk on the ocean floor with a special helmet — no swimming required. Feed fish, touch corals. Guide accompanies you throughout. Age 14–50. Photos included. Duration: 30–45 min.', 3500, 'experiences', 'sea_walk', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Parasailing at North Bay Island', 'Soar above North Bay''s turquoise waters. Bird''s-eye view of the Andaman coastline. Certified operators. Age 16–55. Duration: ~15 min flight. Life jacket and harness provided.', 3200, 'experiences', 'parasailing', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Dolphin Glass Bottom Boat – North Bay', 'India''s first dolphin glass-bottom boat. Lower deck made entirely of glass — view coral reefs with 20–30 passengers. Guide explains marine life throughout. All ages. Duration: ~1 hr.', 3500, 'experiences', 'glass_bottom_boat', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Coral Safari Semi-Submarine – North Bay', 'Upper deck + submerged glass-bottom section. Complete view of coral ecosystem without diving. All ages. Duration: ~1 hr.', 3500, 'experiences', 'semi_submarine', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Jet Ski – Corbyn''s Cove Beach, Port Blair', 'High-speed jet ski at Corbyn''s Cove and Rajiv Gandhi Water Sports Complex. Solo or tandem. Duration: 10–15 min. Life jacket provided. Age 12+.', 700, 'experiences', 'jet_ski', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Snorkeling at North Bay Island', 'Guided snorkeling with life ring and mask. Colourful fish and coral just below the surface. Age 5–60. Duration: 30–45 min.', 800, 'experiences', 'snorkeling', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Dinner Cruise – Port Blair Harbour', 'Evening harbour cruise with live music, DJ, and buffet dinner. Departs 7 PM, returns 9:30 PM. All ages. Smart casual dress.', 3500, 'experiences', 'sunset_cruise', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Sea Kart Speed Boat – Corbyn''s Cove', 'Drive your own high-speed Sea Kart — first of its kind in India. Solo ₹5,400 / couple ₹7,400. Age 6–60. Duration: ~15 min. Safety briefing included.', 5400, 'experiences', 'sea_kart', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Cellular Jail Guided Tour – Port Blair', 'Expert-guided tour of the historic Cellular Jail (Kala Pani). Learn about India''s freedom fighters. Evening Light & Sound show available separately. Duration: ~2 hrs.', 500, 'experiences', 'cellular_jail_tour', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Ross Island & North Bay Day Tour', 'Full-day tour: Ross Island (British ruins, deer) + North Bay Island (water sports). Ferry transfers included. Water sports at North Bay optional (extra cost).', 1500, 'experiences', 'ross_island_tour', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Light & Sound Show – Cellular Jail', 'Evening show at Cellular Jail narrating India''s independence story. Hindi and English shows. Duration: ~45 min. Book in advance — fills quickly in peak season.', 150, 'experiences', 'light_sound_show', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, '3-Island Hopping – Port Blair, Havelock, Neil', 'Classic 3-island package. Port Blair → Havelock (Radhanagar Beach, Elephant Beach) → Neil (Bharatpur Beach, Natural Bridge) → Port Blair. Ferry tickets, accommodation, and guide included. 4N/5D.', 8500, 'experiences', 'island_hopping', 'new', 'Port Blair', 'Port Blair', 'active'),
  (seed_seller, 'Scuba Diving at Havelock – Boat Dive (Beginner)', 'Discover Scuba from a boat at Havelock. Sites: Aquarium, Mac Point, Turtle Bay. Training, equipment, photos and video included. Age 12–50. Duration: 2–3 hrs.', 3500, 'experiences', 'scuba_diving', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'PADI Open Water Diver Course – Havelock', 'Get PADI certified at Havelock Island. 3–4 days. Theory, pool sessions, and 4 open-water dives at Aquarium and Mac Point. Worldwide certification. Age 15+.', 18000, 'experiences', 'padi_course', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Snorkeling at Elephant Beach – Havelock', 'Snorkeling at Havelock''s premier water sports hub. Reach by boat (15 min) or trek (45 min). Vibrant coral reefs, diverse marine life. Guide, mask, fins, life jacket. Age 6+. Duration: 1–2 hrs.', 1000, 'experiences', 'snorkeling', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Sea Walk at Elephant Beach – Havelock', 'Walk on the ocean floor at Elephant Beach. Helmet-based, no swimming needed. Guide accompanies you, complimentary photos included. Age 14–50. Duration: 30–45 min.', 3500, 'experiences', 'sea_walk', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Parasailing at Elephant Beach – Havelock', 'Parasailing above the Andaman Sea at Elephant Beach. Reach by boat or trek. Age 16–55. Duration: ~15 min flight. Safety harness and life jacket provided.', 3200, 'experiences', 'parasailing', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Kayaking – Mangrove & Coastline, Havelock', 'Paddle through mangrove forests and crystal-clear waters along Havelock''s coastline. Daytime (sunrise to sunset) and night kayaking available. Single and double kayaks. Age 10+.', 1500, 'experiences', 'kayaking', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Night Kayaking – Bioluminescent Waters, Havelock', 'Paddle through glowing bioluminescent waters at night. Starts 3 AM. Max 8 persons. Guide included. Age 16+. Duration: ~2 hrs.', 2500, 'experiences', 'night_kayaking', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Jet Ski – Elephant Beach, Havelock', 'Jet ski rides at Elephant Beach. Solo or tandem. Clear Andaman waters. Duration: 10–15 min. Life jacket provided. Age 12+.', 800, 'experiences', 'jet_ski', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Game Fishing Charter – Havelock to Barren Island', 'Private fishing boat charter from Havelock. Fish around Havelock or venture to Barren Island (active volcano) for fishing, snorkeling, and diving. Full-day. Rods, bait, safety gear. Max 6 persons.', 12000, 'experiences', 'game_fishing', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Elephant Beach Trek – Havelock', 'Trek through dense tropical forest to pristine Elephant Beach. ~45 min one-way. Guide optional. Combine with snorkeling or sea walk. Wear sturdy footwear. Age 8+.', 300, 'experiences', 'elephant_beach_trek', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Barren Island Volcano Day Trip – from Havelock', 'Boat charter to South Asia''s only active volcano. Snorkeling around volcanic reef, photography, close-up view of lava fields. Full-day. Max 8 persons. Snorkeling gear, lunch, safety equipment included.', 10000, 'experiences', 'barren_island_trip', 'new', 'Havelock (Swaraj Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Boat Scuba Diving at Neil Island', 'Boat diving at Neil Island — high chance of spotting turtles and dugongs. Sites: Junction, Bus Stop. Photos, video, training, and boat ride included. Age 12–50. Duration: 2–3 hrs.', 4000, 'experiences', 'scuba_diving', 'new', 'Neil (Shaheed Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Snorkeling at Bharatpur Beach – Neil Island', 'Snorkeling at Neil''s main water sports hub. Calm, shallow waters ideal for beginners. Colourful fish and coral. Guide, mask, life jacket. Age 6+. Duration: 1 hr.', 700, 'experiences', 'snorkeling', 'new', 'Neil (Shaheed Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Glass Bottom Boat – Neil Island', 'Glass-bottom boat at Bharatpur Beach. View coral reefs without getting wet. All ages including non-swimmers. Duration: 30–45 min.', 1200, 'experiences', 'glass_bottom_boat', 'new', 'Neil (Shaheed Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Jet Ski – Bharatpur Beach, Neil Island', 'Jet ski at Bharatpur Beach. Calm waters, ideal for first-timers. Solo or tandem. Duration: 10–15 min. Life jacket provided. Age 12+.', 700, 'experiences', 'jet_ski', 'new', 'Neil (Shaheed Dweep)', 'Port Blair', 'active'),
  (seed_seller, 'Limestone Caves Day Trip – Baratang Island', 'Full-day trip to Baratang''s famous limestone caves. Convoy through Jarawa reserve, dinghy through mangrove creeks, trek to caves with dramatic stalactites and stalagmites. Guide, boat, and convoy included. Departs Port Blair 5 AM.', 2500, 'experiences', 'limestone_caves', 'new', 'Baratang', 'Port Blair', 'active'),
  (seed_seller, 'Mangrove Creek Boat Tour – Baratang', 'Glide through dense mangrove creeks by traditional dinghy. Spot kingfishers, herons, and wildlife. Combine with limestone caves visit. Duration: ~1 hr on water.', 1200, 'experiences', 'mangrove_creek_tour', 'new', 'Baratang', 'Port Blair', 'active'),
  (seed_seller, 'Mud Volcano Visit – Baratang Island', 'Visit one of India''s rare mud volcanoes — bubbling grey mud in an otherworldly landscape. Usually combined with the limestone caves day trip. Guide included.', 800, 'experiences', 'mud_volcano', 'new', 'Baratang', 'Port Blair', 'active');

  RAISE NOTICE 'Seeded 31 experience listings successfully.';
END $$;