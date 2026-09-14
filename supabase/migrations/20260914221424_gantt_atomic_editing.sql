-- Atomic Gantt commands use the existing prototype's selected administrator model.
-- A semantic revision protects previews, edits and undo against concurrent changes.
create function public.gantt_snapshot(p_project uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$
 with data as (select jsonb_build_object(
  'tasks',coalesce((select jsonb_agg(to_jsonb(t)-'updated_at' order by t.sort_order,t.created_at,t.id) from public.tasks t where project_id=p_project),'[]'::jsonb),
  'dependencies',coalesce((select jsonb_agg(to_jsonb(d) order by d.id) from public.task_dependencies d join public.tasks t on t.id=d.task_id where t.project_id=p_project),'[]'::jsonb),
  'milestones',coalesce((select jsonb_agg(to_jsonb(m)-'updated_at' order by m.id) from public.milestones m where project_id=p_project),'[]'::jsonb),
  'sets',coalesce((select jsonb_agg(to_jsonb(s)-'updated_at' order by s.id) from public.scenes s where project_id=p_project),'[]'::jsonb),
  'project',(select to_jsonb(p)-'updated_at' from public.projects p where id=p_project)
 ) as body) select body || jsonb_build_object('revision',md5(body::text)) from data;
$$;
revoke all on function public.gantt_snapshot(uuid) from public;
grant execute on function public.gantt_snapshot(uuid) to anon,authenticated;

create function public.gantt_edit(p_project uuid,p_actor uuid,p_expected text,p_operations jsonb,p_preview boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 before_state jsonb; after_state jsonb; result jsonb; inverse jsonb:='[]'; op jsonb; patch jsonb; oldrow jsonb; newrow jsonb; k text; inverse_patch jsonb;
 tid uuid; depid uuid; pred uuid; item public.tasks; touched boolean:=false;
begin
 if not exists(select 1 from public.people where id=p_actor and role='admin' and deactivated_at is null) then raise exception 'Only an active administrator can plan work.'; end if;
 perform 1 from public.projects where id=p_project and status<>'closed' for update;
 if not found then raise exception 'This production is unavailable or closed.'; end if;
 -- Lock consistently before reading the revision. Existing task editors share these row locks.
 perform 1 from public.tasks where project_id=p_project order by id for update;
 before_state:=public.gantt_snapshot(p_project);
 if p_expected is null or p_expected is distinct from before_state->>'revision' then raise exception 'The schedule changed since you opened it. Refresh and review your change again.' using errcode='40001'; end if;
 if p_operations is null or jsonb_typeof(p_operations)<>'array' or jsonb_array_length(p_operations) not between 1 and 100 then raise exception 'Use between 1 and 100 changes.'; end if;
 begin
 for op in select value from jsonb_array_elements(p_operations) loop
  tid:=nullif(op->>'task_id','')::uuid;
  select * into item from public.tasks where id=tid and project_id=p_project;
  if not found then raise exception 'The task is unavailable in this production.'; end if;
  if op->>'action'='task' then
   patch:=op->'patch'; inverse_patch:='{}'; oldrow:=to_jsonb(item);
   if jsonb_typeof(patch)<>'object' or patch='{}'::jsonb then raise exception 'No task changes supplied.'; end if;
   for k in select jsonb_object_keys(patch) loop
    if k not in ('title','owner_id','status','start_date','due_date','stage_id') then raise exception 'Unsupported task field: %',k; end if;
    inverse_patch:=inverse_patch||jsonb_build_object(k,oldrow->k);
   end loop;
   if patch ?| array['start_date','due_date','status'] and exists(select 1 from public.tasks where parent_task_id=tid) then raise exception 'This task summarizes its subtasks. Edit the subtasks instead.'; end if;
   if patch ?| array['start_date','due_date'] and (item.status='done' or item.actual_start is not null or item.actual_finish is not null) then raise exception 'Work already started or completed keeps its recorded dates. Use task details to review it.'; end if;
   if patch ? 'stage_id' and item.parent_task_id is not null then raise exception 'Subtasks use their parent’s stage.'; end if;
   newrow:=oldrow||patch;
   if newrow->>'owner_id' is not null and not exists(select 1 from public.people where id=(newrow->>'owner_id')::uuid and deactivated_at is null) then raise exception 'Choose an active team member.'; end if;
   if nullif(btrim(newrow->>'title'),'') is null or length(newrow->>'title')>500 then raise exception 'Enter a task name of up to 500 characters.'; end if;
   if (newrow->>'start_date')::date > (newrow->>'due_date')::date then raise exception 'Finish must be on or after start.'; end if;
   if newrow->>'status'='done' and exists(select 1 from public.documents where task_id=tid and coalesce(requires_approval,true) and approval_state<>'approved' and deleted_at is null) then raise exception 'Approve the linked files before completing this task.'; end if;
   update public.tasks set title=btrim(newrow->>'title'),owner_id=(newrow->>'owner_id')::uuid,status=newrow->>'status',start_date=(newrow->>'start_date')::date,due_date=(newrow->>'due_date')::date,stage_id=(newrow->>'stage_id')::uuid,updated_at=clock_timestamp() where id=tid;
   inverse:=jsonb_build_array(jsonb_build_object('action','task','task_id',tid,'patch',inverse_patch))||inverse;
  elsif op->>'action' in ('link','unlink') then
   pred:=nullif(op->>'predecessor_id','')::uuid;
   if pred=tid or not exists(select 1 from public.tasks where id=pred and project_id=p_project) then raise exception 'Choose a different prerequisite in this production.'; end if;
   select to_jsonb(d) into oldrow from public.task_dependencies d where task_id=tid and depends_on_task_id=pred;
   if op->>'action'='unlink' then
    if oldrow is null then raise exception 'This dependency no longer exists.'; end if;
    delete from public.task_dependencies where id=(oldrow->>'id')::uuid;
   else
    if exists(with recursive chain(id) as (select pred union select d.depends_on_task_id from public.task_dependencies d join chain c on d.task_id=c.id) select 1 from chain where id=tid) then raise exception 'This dependency would create a circular schedule.'; end if;
    if exists(select 1 from public.tasks where parent_task_id in (tid,pred)) then raise exception 'Connect individual tasks, rather than summary tasks.'; end if;
    if coalesce((op->>'lag_hours')::numeric,0)<0 or coalesce((op->>'lag_hours')::numeric,0)>87600 then raise exception 'Use a buffer between 0 and 87,600 hours.'; end if;
    insert into public.task_dependencies(id,task_id,depends_on_task_id,type,lag_hours,hard_constraint)
    values(coalesce((oldrow->>'id')::uuid,nullif(op->>'id','')::uuid,gen_random_uuid()),tid,pred,op->>'type',coalesce((op->>'lag_hours')::numeric,0),coalesce((op->>'hard_constraint')::boolean,true))
    on conflict(task_id,depends_on_task_id) do update set type=excluded.type,lag_hours=excluded.lag_hours,hard_constraint=excluded.hard_constraint;
   end if;
   inverse:=jsonb_build_array(case when oldrow is null then jsonb_build_object('action','unlink','task_id',tid,'predecessor_id',pred) else jsonb_build_object('action','link','task_id',tid,'predecessor_id',pred,'id',oldrow->'id','type',oldrow->'type','lag_hours',oldrow->'lag_hours','hard_constraint',oldrow->'hard_constraint') end)||inverse;
  else raise exception 'Unknown Gantt change.';
  end if;
  touched:=true;
 end loop;
 if touched then perform public.compute_project_schedule(p_project); end if;
 after_state:=public.gantt_snapshot(p_project);
 result:=after_state||jsonb_build_object('inverse',inverse,'previous_revision',before_state->>'revision');
 if p_preview then raise exception using errcode='PZ001',message='preview rollback'; end if;
 insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('project',p_project,p_actor,'gantt_edit',jsonb_build_object('operations',p_operations));
 exception when sqlstate 'PZ001' then return result;
 end;
 return result;
end; $$;
revoke all on function public.gantt_edit(uuid,uuid,text,jsonb,boolean) from public;
grant execute on function public.gantt_edit(uuid,uuid,text,jsonb,boolean) to anon,authenticated;

create table public.gantt_baselines (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),tasks jsonb not null,created_by uuid not null references public.people(id),created_at timestamptz not null default now()
);
create index gantt_baselines_project_idx on public.gantt_baselines(project_id,created_at desc);
alter table public.gantt_baselines enable row level security;
grant select,insert on public.gantt_baselines to anon,authenticated;
create policy baseline_read on public.gantt_baselines for select to anon,authenticated using(true);
create policy baseline_capture on public.gantt_baselines for insert to anon,authenticated with check(
 exists(select 1 from public.people p where p.id=nullif(current_setting('app.stage_actor',true),'')::uuid and p.role='admin' and p.deactivated_at is null)
 and exists(select 1 from public.projects p where p.id=project_id and p.status<>'closed')
);
create function public.gantt_capture_baseline(p_project uuid,p_actor uuid,p_name text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if not exists(select 1 from public.people where id=p_actor and role='admin' and deactivated_at is null) then raise exception 'Only an active administrator can capture a baseline.'; end if;
 perform 1 from public.projects where id=p_project and status<>'closed' for update;
 if not found then raise exception 'This production is closed or unavailable.'; end if;
 perform set_config('app.stage_actor',p_actor::text,true);
 insert into public.gantt_baselines(project_id,name,tasks,created_by) values(p_project,btrim(p_name),public.gantt_snapshot(p_project)->'tasks',p_actor) returning id into result;
 insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('project',p_project,p_actor,'baseline_captured',jsonb_build_object('baseline_id',result,'name',p_name));
 perform set_config('app.stage_actor','',true);
 return result;
end; $$;
revoke all on function public.gantt_capture_baseline(uuid,uuid,text) from public;
grant execute on function public.gantt_capture_baseline(uuid,uuid,text) to anon,authenticated;

-- Align task rollups with stored status and pin recorded work in scheduling.
create or replace function public.recompute_parent_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_done int;
  v_start date; v_due date; v_fs date; v_ff date;
  v_float numeric;
  v_status text;
  v_crit text;
begin
  if p_task_id is null then return; end if;

  select count(*), count(*) filter (where status = 'done'),
         min(coalesce(start_date, due_date)), max(coalesce(due_date, start_date)),
         min(coalesce(forecast_start, start_date, due_date)),
         max(coalesce(forecast_finish, due_date, start_date)),
         min(total_float_hours)
    into v_total, v_done, v_start, v_due, v_fs, v_ff, v_float
  from tasks where parent_task_id = p_task_id;

  if v_total = 0 then return; end if;

  if v_done = v_total then
    v_status := 'done';
  elsif exists (select 1 from tasks where parent_task_id = p_task_id and status = 'blocked') then
    v_status := 'blocked';
  elsif exists (select 1 from tasks where parent_task_id = p_task_id and status <> 'not_started') then
    v_status := 'in_progress';
  else
    v_status := 'not_started';
  end if;

  v_crit := case
    when v_float is null then 'normal'
    when v_float <= 0.0001 then 'critical'
    when v_float <= 48 then 'near_critical'
    else 'normal'
  end;

  update tasks t
     set start_date = v_start,
         due_date = v_due,
         forecast_start = v_fs,
         forecast_finish = v_ff,
         total_float_hours = v_float,
         criticality = v_crit,
         status = v_status
   where t.id = p_task_id
     and (t.start_date is distinct from v_start
       or t.due_date is distinct from v_due
       or t.forecast_start is distinct from v_fs
       or t.forecast_finish is distinct from v_ff
       or t.total_float_hours is distinct from v_float
       or t.criticality is distinct from v_crit
       or t.status is distinct from v_status);
end;
$$;
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

  select count(*), count(*) filter (where status = 'done'),
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
             else coalesce(t.actual_finish, t.due_date, t.start_date, v_epoch) end)
       - (case when t.id = p_override_task and p_override_start is not null then p_override_start
               else coalesce(t.actual_start, t.start_date, t.due_date, v_epoch) end) + 1) * 24.0
    ),
    ((case when t.id = p_override_task and p_override_start is not null then p_override_start
           else coalesce(t.actual_start, t.start_date, t.due_date, v_epoch) end) - v_epoch) * 24.0,
    0, 0, 0,
    (coalesce(t.id = p_override_task, false) or t.status='done' or t.actual_start is not null or t.actual_finish is not null),
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
         where not c.pinned and d.hard_constraint
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
    if v_iter=200 then raise exception 'The schedule did not converge. Check for circular or conflicting dependencies.'; end if;
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
         where d.hard_constraint
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
    if v_iter=200 then raise exception 'The schedule did not converge. Check for circular or conflicting dependencies.'; end if;
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
