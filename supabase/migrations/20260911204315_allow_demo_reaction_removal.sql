-- Match the existing shared demo write model. The previous ALL policy only
-- supplied WITH CHECK, leaving DELETE without a qualifying USING policy.
create policy demo_reaction_remove on public.comment_reactions for delete to anon,authenticated using (true);
