-- Run after guard_task_dependencies. All fixtures and rollup effects are rolled back.
-- Run through the management SQL connection; browser-role grants are checked separately.
begin;

do $test$
declare
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  ab uuid := gen_random_uuid();
  rejected boolean;
begin
  insert into public.projects(id, name, slug, venue) values
    (p1, 'Dependency regression fixture', 'dependency-test-' || p1, 'Lancaster, PA'),
    (p2, 'Dependency regression fixture', 'dependency-test-' || p2, 'Lancaster, PA');
  insert into public.scenes(id, project_id, name) values
    (s1, p1, 'Regression set'), (s2, p2, 'Regression set');
  insert into public.tasks(id, project_id, scene_id, title) values
    (a, p1, s1, 'Regression A'), (b, p1, s1, 'Regression B'),
    (c, p1, s1, 'Regression C'), (outsider, p2, s2, 'Regression outside');

  insert into public.task_dependencies(id, task_id, depends_on_task_id) values (ab, b, a);
  insert into public.task_dependencies(task_id, depends_on_task_id) values (c, b);

  rejected := false;
  begin
    insert into public.task_dependencies(task_id, depends_on_task_id) values (a, a);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Self dependency was accepted'; end if;

  rejected := false;
  begin
    insert into public.task_dependencies(task_id, depends_on_task_id) values (a, outsider);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Cross-production dependency was accepted'; end if;

  rejected := false;
  begin
    insert into public.task_dependencies(task_id, depends_on_task_id) values (a, c);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Three-task cycle was accepted'; end if;

  rejected := false;
  begin
    update public.task_dependencies set depends_on_task_id = c where id = ab;
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Cyclic endpoint update was accepted'; end if;

  rejected := false;
  begin
    update public.task_dependencies set depends_on_task_id = outsider where id = ab;
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Cross-production endpoint update was accepted'; end if;

  rejected := false;
  begin
    insert into public.task_dependencies(task_id, depends_on_task_id) values (a, gen_random_uuid());
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'Missing prerequisite was accepted'; end if;

  update public.task_dependencies set type = 'start_to_start', lag_hours = -24 where id = ab;
  if not exists (select 1 from public.task_dependencies where id = ab and type = 'start_to_start' and lag_hours = -24) then
    raise exception 'Valid relationship/lag update failed';
  end if;
  update public.task_dependencies set task_id = b, depends_on_task_id = a where id = ab;
  if (select count(*) from public.task_dependencies where task_id in (a,b,c,outsider)) <> 2 then
    raise exception 'Rejected changes leaked into the dependency graph';
  end if;
end;
$test$;

select 'task dependency regression passed' as result;
rollback;
