-- Productions that have work but no sets yet get a first set.
INSERT INTO public.scenes (project_id, name, sort_order)
SELECT p.id, p.name || ' — Set 1', 1
FROM public.projects p
WHERE EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = p.id AND t.scene_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.scenes s WHERE s.project_id = p.id);

-- File every set-less work item into the set with the nearest dates.
UPDATE public.tasks t
SET scene_id = (
  SELECT s.id
  FROM public.scenes s
  WHERE s.project_id = t.project_id
  ORDER BY
    ABS(COALESCE(s.start_date, s.due_date, t.start_date, CURRENT_DATE)
        - COALESCE(t.start_date, t.due_date, CURRENT_DATE)) NULLS LAST,
    s.sort_order
  LIMIT 1
)
WHERE t.scene_id IS NULL;

-- Work items with no set are no longer a state the app can reach.
DELETE FROM public.tasks WHERE scene_id IS NULL;
ALTER TABLE public.tasks ALTER COLUMN scene_id SET NOT NULL;