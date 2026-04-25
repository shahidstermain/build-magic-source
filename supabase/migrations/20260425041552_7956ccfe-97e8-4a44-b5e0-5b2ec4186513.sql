-- Site-wide settings (single row, key/value)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  site_title TEXT NOT NULL DEFAULT 'AndamanBazaar — Island marketplace, boat pe bharosa',
  site_description TEXT NOT NULL DEFAULT 'AndamanBazaar is the hyperlocal marketplace for the Andaman Islands — buy, sell, and chat with trusted local sellers across Port Blair, Havelock, and Neil.',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT site_settings_singleton CHECK (id = true)
);

INSERT INTO public.site_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();