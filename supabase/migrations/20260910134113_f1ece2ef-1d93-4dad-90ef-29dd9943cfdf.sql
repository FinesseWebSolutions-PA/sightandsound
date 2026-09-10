CREATE TABLE public.comment_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  byte_size bigint,
  uploaded_by uuid REFERENCES public.people(id),
  saved_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_attachments TO anon;
GRANT ALL ON public.comment_attachments TO service_role;

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY prototype_all_select ON public.comment_attachments FOR SELECT USING (true);
CREATE POLICY prototype_all_write ON public.comment_attachments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX comment_attachments_comment_idx ON public.comment_attachments(comment_id);

ALTER TABLE public.documents ADD COLUMN folder text;
CREATE INDEX documents_project_folder_idx ON public.documents(project_id, folder);

CREATE POLICY chat_attachments_read ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY chat_attachments_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');
CREATE POLICY chat_attachments_update ON storage.objects FOR UPDATE USING (bucket_id = 'chat-attachments');
CREATE POLICY chat_attachments_delete ON storage.objects FOR DELETE USING (bucket_id = 'chat-attachments');