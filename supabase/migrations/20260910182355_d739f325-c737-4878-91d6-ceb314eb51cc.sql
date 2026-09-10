ALTER TABLE public.documents
  ADD COLUMN requires_approval boolean NOT NULL DEFAULT true;