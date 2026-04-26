
-- 1. Andaman local knowledge (singleton, admin-editable)
CREATE TABLE public.andaman_knowledge (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT andaman_knowledge_singleton CHECK (id = TRUE)
);

ALTER TABLE public.andaman_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge"
  ON public.andaman_knowledge FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert knowledge"
  ON public.andaman_knowledge FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update knowledge"
  ON public.andaman_knowledge FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER andaman_knowledge_set_updated_at
  BEFORE UPDATE ON public.andaman_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default knowledge so the planner works before any admin edit.
INSERT INTO public.andaman_knowledge (id, data) VALUES (TRUE, '{
  "ferries": {
    "private_operators": ["Makruzz", "Green Ocean", "Nautika"],
    "routes": [
      {"from": "Port Blair", "to": "Havelock", "duration_min": 120, "private_inr": [1000, 2500], "govt_inr": [50, 500], "typical_departures": ["06:30", "08:30", "11:00", "14:00"]},
      {"from": "Havelock", "to": "Neil", "duration_min": 45, "private_inr": [800, 1500], "govt_inr": [50, 300], "typical_departures": ["09:30", "13:30"]},
      {"from": "Neil", "to": "Port Blair", "duration_min": 90, "private_inr": [900, 2000], "govt_inr": [50, 500], "typical_departures": ["10:00", "15:00"]},
      {"from": "Havelock", "to": "Port Blair", "duration_min": 120, "private_inr": [1000, 2500], "govt_inr": [50, 500], "typical_departures": ["10:00", "13:30", "16:00"]}
    ],
    "rules": [
      "Buffer 90–120 min before ferry departure",
      "Never combine inter-island transfer with a full-day activity on the same day for budget travellers",
      "Max one inter-island transfer per day",
      "Book private ferries (Makruzz/Green Ocean/Nautika) at least 2 weeks ahead in peak season",
      "Government ferries are cheapest but frequently delayed or cancelled"
    ]
  },
  "weather": {
    "peak_months": [10, 11, 12, 1, 2, 3, 4],
    "monsoon_months": [5, 6, 7, 8, 9],
    "shoulder_months": [10, 11],
    "scuba_closed_months": [6, 7, 8, 9],
    "jellyfish_caution_months": [3, 4, 5],
    "monsoon_warning": "May–September: rough seas, frequent ferry cancellations, scuba closed. Stick to Port Blair (Cellular Jail, museums, Chidiya Tapu) and short Ross Island/North Bay trips on calm days.",
    "peak_pricing_warning": "December–January: peak prices, book ferries and hotels 2–3 months ahead."
  },
  "permits": {
    "indian_nationals": "No permit needed for most beaches and Havelock/Neil. Carry govt photo ID always.",
    "foreigners": "RAP (Restricted Area Permit) issued on arrival at Port Blair airport. Several islands off-limits.",
    "restricted_islands": ["Barren Island (special permit)", "Narcondam Island (special permit)", "All tribal reserves (strictly off-limits)"]
  },
  "islands": [
    {"name": "Port Blair", "highlights": ["Cellular Jail", "Light & Sound Show", "Corbyn Cove", "Chidiya Tapu sunset", "Aberdeen Bazaar"], "best_for": ["history", "arrival/departure", "monsoon"], "stay_options": "wide range"},
    {"name": "Havelock (Swaraj Dweep)", "highlights": ["Radhanagar Beach (Beach 7) — best sunset, no snorkeling", "Elephant Beach — best snorkeling, boat+trek", "Kalapathar Beach — sunrise", "scuba diving hub"], "best_for": ["beaches", "scuba", "snorkeling", "couple"], "stay_options": "budget to luxury"},
    {"name": "Neil (Shaheed Dweep)", "highlights": ["Bharatpur Beach — calm, family-friendly", "Laxmanpur — sunset", "Natural bridge", "bicycle rides"], "best_for": ["family", "relaxation", "couple", "calm water"], "stay_options": "budget to mid-range"},
    {"name": "Baratang", "highlights": ["Limestone caves", "Mangrove creek tour", "Mud volcano"], "best_for": ["adventure", "offbeat"], "notes": "Long road journey from Port Blair via convoy; needs full day; not for elderly or infants"},
    {"name": "Ross Island", "highlights": ["British ruins", "Deer", "Peacocks"], "best_for": ["history", "photography", "half-day"], "stay_options": "no stay"},
    {"name": "North Bay", "highlights": ["Glass-bottom boat", "Sea walk", "Snorkeling"], "best_for": ["day 1 from Port Blair", "non-swimmers"], "stay_options": "no stay"},
    {"name": "Diglipur", "highlights": ["Ross & Smith twin islands", "Saddle Peak trek", "Turtle nesting"], "best_for": ["offbeat", "adventure", "returning visitors"], "notes": "Long drive (10–12 hrs) from Port Blair"},
    {"name": "Long Island", "highlights": ["Lalaji Bay beach", "Kayaking", "quiet"], "best_for": ["offbeat", "returning visitors"]}
  ],
  "food_spots": [
    {"island": "Port Blair", "picks": [
      {"name": "New Lighthouse Restaurant", "for": "seafood", "price_inr": "300–800"},
      {"name": "Aberdeen Bazaar street food", "for": "budget eats", "price_inr": "80–150"},
      {"name": "Annapurna Restaurant", "for": "vegetarian South Indian", "price_inr": "150–300"}
    ]},
    {"island": "Havelock", "picks": [
      {"name": "Anju Coco Resto", "for": "coconut prawn curry", "price_inr": "350–700"},
      {"name": "Emerald Gecko", "for": "café vibes, breakfast", "price_inr": "250–500"},
      {"name": "Full Moon Café", "for": "beachside dinner", "price_inr": "400–800"}
    ]},
    {"island": "Neil", "picks": [
      {"name": "Golden Spoon", "for": "fresh fish", "price_inr": "300–600"},
      {"name": "Garden View Restaurant", "for": "vegetarian thali", "price_inr": "150–300"}
    ]}
  ],
  "must_try": ["Grilled lobster", "Coconut prawn curry", "Fish tikka", "Banana chips", "Fresh coconut water"],
  "veg_warning": "Vegetarian options are limited on smaller islands (Neil, Long Island). Carry backup snacks.",
  "budget_per_day_inr": {
    "low": [1000, 2000],
    "medium": [2000, 5000],
    "high": [5000, 12000]
  },
  "connectivity": {
    "best_network": "BSNL works across most islands",
    "limited": "Jio/Airtel weak outside Port Blair",
    "atms": "Unreliable on Neil and Havelock — carry cash from Port Blair",
    "upi": "Widely accepted in Port Blair, limited on smaller islands"
  },
  "emergency": [
    "GB Pant Hospital, Port Blair: +91-3192-233473",
    "Coast Guard Andaman: 1554",
    "Police control room: 100",
    "Tourist helpline: 1363",
    "Fire: 101",
    "Ambulance: 102"
  ],
  "marketplace_hooks": {
    "scooter": "Rent a scooter via AndamanBazaar — ₹300–500/day",
    "snorkel": "Snorkel gear available on the marketplace — save on rental",
    "scuba_guide": "Find certified local dive guides on AndamanBazaar",
    "camera": "Underwater camera rental available on AndamanBazaar"
  }
}'::jsonb);

-- 2. Trip generation logs (for quality improvement)
CREATE TABLE public.trip_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  inputs JSONB NOT NULL,
  output JSONB,
  conflicts_fixed JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trip_generation_logs_trip_id_idx ON public.trip_generation_logs(trip_id);
CREATE INDEX trip_generation_logs_user_id_idx ON public.trip_generation_logs(user_id);
CREATE INDEX trip_generation_logs_created_at_idx ON public.trip_generation_logs(created_at DESC);

ALTER TABLE public.trip_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all generation logs"
  ON public.trip_generation_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own generation logs"
  ON public.trip_generation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Per-day feedback ("this was wrong")
CREATE TABLE public.trip_day_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  is_helpful BOOLEAN NOT NULL DEFAULT FALSE,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id, day_number)
);

CREATE INDEX trip_day_feedback_trip_id_idx ON public.trip_day_feedback(trip_id);

ALTER TABLE public.trip_day_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON public.trip_day_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own feedback"
  ON public.trip_day_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own feedback"
  ON public.trip_day_feedback FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
  ON public.trip_day_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
  ON public.trip_day_feedback FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trip_day_feedback_set_updated_at
  BEFORE UPDATE ON public.trip_day_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
