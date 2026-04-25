-- Document type enum
CREATE TYPE public.legal_document_type AS ENUM ('terms', 'privacy');

-- Acceptance log table
CREATE TABLE public.legal_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type public.legal_document_type NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  context TEXT
);

CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances (user_id, document_type, accepted_at DESC);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own legal acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all legal acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own legal acceptances"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
