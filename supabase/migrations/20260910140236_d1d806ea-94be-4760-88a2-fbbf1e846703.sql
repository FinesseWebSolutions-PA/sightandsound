CREATE TABLE public.department_job_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (department_id, title)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_job_titles TO anon, authenticated;
GRANT ALL ON public.department_job_titles TO service_role;
ALTER TABLE public.department_job_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY prototype_all_select ON public.department_job_titles FOR SELECT USING (true);
CREATE POLICY prototype_all_write ON public.department_job_titles FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.project_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  job_title text NOT NULL DEFAULT '',
  is_head boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (project_id, person_id, department_id)
);

CREATE INDEX project_assignments_project_dept_idx
  ON public.project_assignments (project_id, department_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assignments TO anon, authenticated;
GRANT ALL ON public.project_assignments TO service_role;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY prototype_all_select ON public.project_assignments FOR SELECT USING (true);
CREATE POLICY prototype_all_write ON public.project_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_project_assignments_updated_at
BEFORE UPDATE ON public.project_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.department_job_titles (department_id, title, sort_order)
SELECT d.id, t.title, t.sort_order
FROM public.departments d
JOIN (VALUES
  ('Art', 'Head Scenic Artist', 1), ('Art', 'Scenic Artist', 2), ('Art', 'Sculptor', 3), ('Art', 'Set Designer', 4),
  ('Engineering', 'Head Engineer', 1), ('Engineering', 'Structural Engineer', 2), ('Engineering', 'Draftsperson', 3), ('Engineering', 'Automation Engineer', 4),
  ('Costumes', 'Costume Supervisor', 1), ('Costumes', 'Cutter/Draper', 2), ('Costumes', 'Stitcher', 3), ('Costumes', 'Wardrobe Lead', 4),
  ('Lighting', 'Lighting Designer', 1), ('Lighting', 'Head Electrician', 2), ('Lighting', 'Programmer', 3), ('Lighting', 'Electrician', 4),
  ('Animals', 'Head Animal Trainer', 1), ('Animals', 'Trainer', 2), ('Animals', 'Animal Care Technician', 3),
  ('Shop', 'Shop Foreman', 1), ('Shop', 'Lead Carpenter', 2), ('Shop', 'Carpenter', 3), ('Shop', 'Welder', 4),
  ('Electronics & Effects', 'Effects Supervisor', 1), ('Electronics & Effects', 'Electronics Technician', 2), ('Electronics & Effects', 'Pyro/Effects Operator', 3)
) AS t(dept, title, sort_order) ON t.dept = d.name
ON CONFLICT (department_id, title) DO NOTHING;