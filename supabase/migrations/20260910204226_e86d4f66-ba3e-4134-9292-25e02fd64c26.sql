DROP POLICY IF EXISTS "Authenticated users can view all comment reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Authenticated users can add their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Authenticated users can remove their own reactions" ON public.comment_reactions;

CREATE POLICY "prototype_all_select" ON public.comment_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "prototype_all_write" ON public.comment_reactions FOR ALL TO authenticated WITH CHECK (true);