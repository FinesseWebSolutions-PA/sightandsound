-- 1. Sets become first-class -------------------------------------------------
alter table public.scenes
  add column if not exists owner_id uuid references public.people(id) on delete set null,
  add column if not exists status text not null default 'not_started',
  add column if not exists start_date date,
  add column if not exists due_date date,
  add column if not exists forecast_start date,
  add column if not exists forecast_finish date,
  add column if not exists depends_on_scene_id uuid references public.scenes(id) on delete set null,
  add column if not exists lag_days integer not null default 0;

create index if not exists scenes_depends_on_idx on public.scenes(depends_on_scene_id);
create index if not exists scenes_owner_idx on public.scenes(owner_id);

-- guard: no self-reference, no cycles, same production only
create or replace function public.scenes_validate_chain()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cursor uuid;
  v_steps int := 0;
  v_project uuid;
begin
  if new.depends_on_scene_id is null then
    return new;
  end if;
  if new.depends_on_scene_id = new.id then
    raise exception 'A set cannot follow itself.';
  end if;
  select project_id into v_project from public.scenes where id = new.depends_on_scene_id;
  if v_project is distinct from new.project_id then
    raise exception 'A set can only follow another set in the same production.';
  end if;
  v_cursor := new.depends_on_scene_id;
  while v_cursor is not null and v_steps < 200 loop
    if v_cursor = new.id then
      raise exception 'That would make the sets depend on each other in a loop.';
    end if;
    select depends_on_scene_id into v_cursor from public.scenes where id = v_cursor;
    v_steps := v_steps + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists scenes_validate_chain on public.scenes;
create trigger scenes_validate_chain
before insert or update on public.scenes
for each row execute function public.scenes_validate_chain();

revoke all on function public.scenes_validate_chain() from anon, authenticated;

-- rollup: set status + forecast derived from its work items
create or replace function public.recompute_scene_rollup(p_scene_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_done int;
  v_start date; v_due date; v_fs date; v_ff date;
  v_status text;
begin
  if p_scene_id is null then return; end if;

  select count(*), count(*) filter (where status = 'complete'),
         min(coalesce(start_date, due_date)), max(coalesce(due_date, start_date)),
         min(coalesce(forecast_start, start_date, due_date)),
         max(coalesce(forecast_finish, due_date, start_date))
    into v_total, v_done, v_start, v_due, v_fs, v_ff
  from public.tasks where scene_id = p_scene_id;

  if v_total = 0 then
    update public.scenes
       set status = 'not_started', forecast_start = null, forecast_finish = null
     where id = p_scene_id
       and (status is distinct from 'not_started'
         or forecast_start is not null or forecast_finish is not null);
    return;
  end if;

  if v_done = v_total then
    v_status := 'complete';
  elsif exists (select 1 from public.tasks where scene_id = p_scene_id and status = 'blocked') then
    v_status := 'blocked';
  elsif exists (select 1 from public.tasks where scene_id = p_scene_id and status <> 'not_started') then
    v_status := 'in_progress';
  else
    v_status := 'not_started';
  end if;

  update public.scenes s
     set status = v_status,
         forecast_start = v_fs,
         forecast_finish = v_ff,
         start_date = coalesce(s.start_date, v_start),
         due_date = coalesce(s.due_date, v_due)
   where s.id = p_scene_id
     and (s.status is distinct from v_status
       or s.forecast_start is distinct from v_fs
       or s.forecast_finish is distinct from v_ff
       or s.start_date is distinct from coalesce(s.start_date, v_start)
       or s.due_date is distinct from coalesce(s.due_date, v_due));
end;
$$;

revoke all on function public.recompute_scene_rollup(uuid) from anon, authenticated;

create or replace function public.tasks_sync_scene_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recompute_scene_rollup(old.scene_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.recompute_scene_rollup(new.scene_id);
  end if;
  return null;
end;
$$;

drop trigger if exists tasks_sync_scene_rollup on public.tasks;
create trigger tasks_sync_scene_rollup
after insert or update or delete on public.tasks
for each row execute function public.tasks_sync_scene_rollup();

revoke all on function public.tasks_sync_scene_rollup() from anon, authenticated;

-- 2. Staffing per set --------------------------------------------------------
alter table public.project_assignments
  add column if not exists scene_id uuid references public.scenes(id) on delete cascade;

alter table public.project_assignments
  drop constraint if exists project_assignments_project_id_person_id_department_id_key;

create unique index if not exists project_assignments_unique_prod
  on public.project_assignments(project_id, person_id, department_id)
  where scene_id is null;

create unique index if not exists project_assignments_unique_set
  on public.project_assignments(project_id, scene_id, person_id, department_id)
  where scene_id is not null;

create index if not exists project_assignments_scene_idx
  on public.project_assignments(scene_id);

-- 3. Set conversations -------------------------------------------------------
alter table public.discussion_threads
  add column if not exists scene_id uuid references public.scenes(id) on delete cascade;

alter table public.discussion_threads
  drop constraint if exists discussion_threads_context_type_check;
alter table public.discussion_threads
  add constraint discussion_threads_context_type_check
  check (context_type = any (array['project','task','document','scene']));

alter table public.discussion_threads
  drop constraint if exists discussion_context_match;
alter table public.discussion_threads
  add constraint discussion_context_match check (
    (context_type = 'project'  and task_id is null and document_id is null and scene_id is null)
    or (context_type = 'task'     and task_id is not null and document_id is null and scene_id is null)
    or (context_type = 'document' and document_id is not null and task_id is null and scene_id is null)
    or (context_type = 'scene'    and scene_id is not null and task_id is null and document_id is null)
  );

create index if not exists discussion_threads_scene_idx
  on public.discussion_threads(scene_id);

-- 4. Set chaining inside the central CPM ------------------------------------
create or replace function public.cpm_task_schedule(
  p_project_id uuid,
  p_override_task uuid default null::uuid,
  p_override_start date default null::date,
  p_override_finish date default null::date
)
returns table(task_id uuid, early_start date, early_finish date, late_start date, late_finish date, total_float_hours numeric, criticality text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_epoch date;
  v_iter int;
  v_project_finish numeric;
  v_changed boolean;
begin
  select coalesce(min(least(coalesce(t.start_date, t.due_date), coalesce(t.due_date, t.start_date))), current_date)
    into v_epoch
  from tasks t
  where t.project_id = p_project_id;

  create temp table if not exists _cpm (
    id uuid primary key,
    dur numeric not null,
    es numeric not null,
    ef numeric not null,
    ls numeric not null,
    lf numeric not null,
    pinned boolean not null default false,
    scene uuid
  ) on commit drop;
  begin
    alter table _cpm add column if not exists scene uuid;
  exception when others then null;
  end;
  delete from _cpm where true;

  insert into _cpm (id, dur, es, ef, ls, lf, pinned, scene)
  select
    t.id,
    greatest(
      24,
      ((case when t.id = p_override_task and p_override_finish is not null then p_override_finish
             else coalesce(t.due_date, t.start_date, v_epoch) end)
       - (case when t.id = p_override_task and p_override_start is not null then p_override_start
               else coalesce(t.start_date, t.due_date, v_epoch) end) + 1) * 24.0
    ),
    ((case when t.id = p_override_task and p_override_start is not null then p_override_start
           else coalesce(t.start_date, t.due_date, v_epoch) end) - v_epoch) * 24.0,
    0, 0, 0,
    coalesce(t.id = p_override_task, false),
    t.scene_id
  from tasks t
  where t.project_id = p_project_id;

  update _cpm set ef = es + dur where true;

  create temp table if not exists _cpm_chain (
    scene uuid primary key,
    pred uuid not null,
    lag numeric not null
  ) on commit drop;
  delete from _cpm_chain where true;
  insert into _cpm_chain (scene, pred, lag)
  select s.id, s.depends_on_scene_id, coalesce(s.lag_days, 0) * 24.0
    from scenes s
   where s.project_id = p_project_id
     and s.depends_on_scene_id is not null;

  for v_iter in 1..200 loop
    v_changed := false;

    -- work-item dependencies
    update _cpm s
       set es = r.need, ef = r.need + s.dur
      from (
        select d.task_id as succ,
               max(case d.type
                     when 'start_to_start'   then p.es + d.lag_hours
                     when 'finish_to_finish' then p.ef + d.lag_hours - c.dur
                     when 'start_to_finish'  then p.es + d.lag_hours - c.dur
                     else p.ef + d.lag_hours
                   end) as need
          from task_dependencies d
          join _cpm p on p.id = d.depends_on_task_id
          join _cpm c on c.id = d.task_id
         where not c.pinned
         group by d.task_id
      ) r
     where s.id = r.succ and r.need > s.es + 0.0001;
    if found then v_changed := true; end if;

    -- set-to-set chain: every work item in a set starts no earlier than the
    -- finish of the set it follows, plus lag
    update _cpm c
       set es = r.need, ef = r.need + c.dur
      from (
        select ch.scene, max(p.ef) + ch.lag as need
          from _cpm_chain ch
          join _cpm p on p.scene = ch.pred
         group by ch.scene, ch.lag
      ) r
     where c.scene = r.scene and not c.pinned and r.need > c.es + 0.0001;
    if found then v_changed := true; end if;

    exit when not v_changed;
  end loop;

  select max(ef) into v_project_finish from _cpm;
  if v_project_finish is null then
    return;
  end if;

  update _cpm set lf = v_project_finish, ls = v_project_finish - dur where true;

  for v_iter in 1..200 loop
    v_changed := false;
    update _cpm p
       set lf = r.need, ls = r.need - p.dur
      from (
        select d.depends_on_task_id as pred,
               min(case d.type
                     when 'start_to_start'   then s.ls - d.lag_hours + c.dur
                     when 'finish_to_finish' then s.lf - d.lag_hours
                     when 'start_to_finish'  then s.lf - d.lag_hours + c.dur
                     else s.ls - d.lag_hours
                   end) as need
          from task_dependencies d
          join _cpm s on s.id = d.task_id
          join _cpm c on c.id = d.depends_on_task_id
         group by d.depends_on_task_id
      ) r
     where p.id = r.pred and r.need < p.lf - 0.0001;
    if found then v_changed := true; end if;

    -- backward pass across the set chain
    update _cpm p
       set lf = r.need, ls = r.need - p.dur
      from (
        select ch.pred, min(s.ls) - ch.lag as need
          from _cpm_chain ch
          join _cpm s on s.scene = ch.scene
         group by ch.pred, ch.lag
      ) r
     where p.scene = r.pred and r.need < p.lf - 0.0001;
    if found then v_changed := true; end if;

    exit when not v_changed;
  end loop;

  return query
  select
    c.id,
    (v_epoch + (floor(c.es / 24))::int)::date,
    (v_epoch + (ceil(c.ef / 24) - 1)::int)::date,
    (v_epoch + (floor(c.ls / 24))::int)::date,
    (v_epoch + (ceil(c.lf / 24) - 1)::int)::date,
    round(c.lf - c.ef, 2),
    case
      when c.lf - c.ef <= 0.0001 then 'critical'
      when c.lf - c.ef <= 48 then 'near_critical'
      else 'normal'
    end
  from _cpm c;
end;
$function$;

-- set forecast rollup also refreshed when the central schedule runs
create or replace function public.compute_project_schedule(p_project_id uuid)
returns table(entity_type text, entity_id uuid, forecast_start date, forecast_finish date, late_start date, late_finish date, total_float_hours numeric, criticality text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_scene uuid;
begin
  create temp table if not exists _cpm_out (
    id uuid primary key,
    es date, ef date, ls date, lf date, float_hours numeric, crit text
  ) on commit drop;
  delete from _cpm_out where true;

  insert into _cpm_out
  select * from public.cpm_task_schedule(p_project_id);

  update tasks t
     set forecast_start = o.es,
         forecast_finish = o.ef,
         total_float_hours = o.float_hours,
         criticality = o.crit
    from _cpm_out o
   where t.id = o.id
     and (t.forecast_start is distinct from o.es
       or t.forecast_finish is distinct from o.ef
       or t.total_float_hours is distinct from o.float_hours
       or t.criticality is distinct from o.crit);

  update milestones m
     set forecast_date = g.forecast_date,
         criticality = g.crit
    from (
      select t.milestone_id,
             greatest(max(o.ef), max(mm.due_date)) as forecast_date,
             min(o.float_hours) as float_hours,
             case
               when min(o.float_hours) <= 0.0001 then 'critical'
               when min(o.float_hours) <= 48 then 'near_critical'
               else 'normal'
             end as crit
        from tasks t
        join _cpm_out o on o.id = t.id
        join milestones mm on mm.id = t.milestone_id
       where t.project_id = p_project_id and t.milestone_id is not null
       group by t.milestone_id
    ) g
   where m.id = g.milestone_id;

  for v_scene in select id from scenes where project_id = p_project_id loop
    perform public.recompute_scene_rollup(v_scene);
  end loop;

  return query
    select 'task'::text, o.id, o.es, o.ef, o.ls, o.lf, o.float_hours, o.crit from _cpm_out o
  union all
    select 'milestone'::text, m.id, m.forecast_date, m.forecast_date, null::date, null::date,
           g.float_hours, m.criticality
    from milestones m
    left join (
      select t.milestone_id, min(o.float_hours) as float_hours
        from tasks t join _cpm_out o on o.id = t.id
       where t.milestone_id is not null
       group by t.milestone_id
    ) g on g.milestone_id = m.id
    where m.project_id = p_project_id
  union all
    select 'scene'::text, s.id, s.forecast_start, s.forecast_finish, null::date, null::date,
           null::numeric, s.status
    from scenes s
    where s.project_id = p_project_id;
end;
$function$;
