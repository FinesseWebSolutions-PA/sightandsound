CREATE TABLE public.comment_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_comment_reactions_unique ON public.comment_reactions (comment_id, person_id, emoji);
CREATE INDEX idx_comment_reactions_comment ON public.comment_reactions (comment_id);

GRANT SELECT, INSERT, DELETE ON public.comment_reactions TO authenticated;
GRANT ALL ON public.comment_reactions TO service_role;

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all comment reactions" 
  ON public.comment_reactions 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can add their own reactions" 
  ON public.comment_reactions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (person_id = auth.uid());

CREATE POLICY "Authenticated users can remove their own reactions" 
  ON public.comment_reactions 
  FOR DELETE 
  TO authenticated 
  USING (person_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;