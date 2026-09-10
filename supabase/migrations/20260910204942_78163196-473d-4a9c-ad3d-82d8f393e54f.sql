DROP POLICY IF EXISTS "prototype_all_select" ON public.comment_reactions;
DROP POLICY IF EXISTS "prototype_all_write" ON public.comment_reactions;
CREATE POLICY "prototype_all_select" ON public.comment_reactions FOR SELECT TO public USING (true);
CREATE POLICY "prototype_all_write" ON public.comment_reactions FOR ALL TO public WITH CHECK (true);
