alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks(id) on delete set null;

create index if not exists tasks_parent_task_id_idx on public.tasks(parent_task_id);

-- Keeps nesting exactly one level deep and rejects self-parenting.
create or replace function public.tasks_validate_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_task_id is null then
    return new;
  end if;
  if new.parent_task_id = new.id then
    raise exception 'A work item cannot be part of itself.';
  end if;
  if exists (select 1 from tasks where id = new.parent_task_id and parent_task_id is not null) then
    raise exception 'Work items can only be nested one level deep.';
  end if;
  if exists (select 1 from tasks where parent_task_id = new.id) then
    raise exception 'This work item already has sub-items, so it cannot be placed under another work item.';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_validate_parent on public.tasks;
create trigger tasks_validate_parent
before insert or update of parent_task_id, id on public.tasks
for each row execute function public.tasks_validate_parent();

-- A parent summarises its sub-items: span of dates, tightest slack, derived status.
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

  select count(*), count(*) filter (where status = 'complete'),
         min(coalesce(start_date, due_date)), max(coalesce(due_date, start_date)),
         min(coalesce(forecast_start, start_date, due_date)),
         max(coalesce(forecast_finish, due_date, start_date)),
         min(total_float_hours)
    into v_total, v_done, v_start, v_due, v_fs, v_ff, v_float
  from tasks where parent_task_id = p_task_id;

  if v_total = 0 then return; end if;

  if v_done = v_total then
    v_status := 'complete';
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

create or replace function public.tasks_sync_parent_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recompute_parent_task(old.parent_task_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.recompute_parent_task(new.parent_task_id);
  end if;
  return null;
end;
$$;

drop trigger if exists tasks_sync_parent_rollup on public.tasks;
create trigger tasks_sync_parent_rollup
after insert or update or delete on public.tasks
for each row execute function public.tasks_sync_parent_rollup();

revoke all on function public.recompute_parent_task(uuid) from public, anon, authenticated;
revoke all on function public.tasks_sync_parent_rollup() from public, anon, authenticated;
revoke all on function public.tasks_validate_parent() from public, anon, authenticated;