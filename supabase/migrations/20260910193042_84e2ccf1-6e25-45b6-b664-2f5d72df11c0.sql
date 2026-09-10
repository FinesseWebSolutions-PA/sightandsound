ALTER TABLE public.documents ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NULL;