CREATE TABLE public.trip_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  travel_from DATE NOT NULL,
  travel_to DATE NOT NULL,
  travelers INTEGER NOT NULL CHECK (travelers >= 1),
  budget_range TEXT NOT NULL,
  query TEXT,
  preferred_call_time TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit a lead
CREATE POLICY "Anyone can insert trip leads"
ON public.trip_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view leads
CREATE POLICY "Admins can view trip leads"
ON public.trip_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update lead status
CREATE POLICY "Admins can update trip leads"
ON public.trip_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete leads
CREATE POLICY "Admins can delete trip leads"
ON public.trip_leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_trip_leads_updated_at
BEFORE UPDATE ON public.trip_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trip_leads_created_at ON public.trip_leads(created_at DESC);
CREATE INDEX idx_trip_leads_status ON public.trip_leads(status);