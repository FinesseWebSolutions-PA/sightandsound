-- Reject invalid work-item links before they can corrupt schedule forecasts.
-- Serialize dependency changes within a production. Under READ COMMITTED,
-- the subsequent statement in this VOLATILE function sees committed changes
-- from the transaction that previously held this lock. Callers needing a
-- stronger isolation level must use SERIALIZABLE and retry serialization failures.
-- This validates task-only paths; mixed task/set cycles are a separate concern.
create or replace function public.task_dependencies_validate_graph()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  v_project_id uuid;
begin
  if tg_op = 'UPDATE'
     and new.task_id is not distinct from old.task_id
     and new.depends_on_task_id is not distinct from old.depends_on_task_id then
    return new;
  end if;

  if new.task_id = new.depends_on_task_id then
    raise exception using
      errcode = '23514',
      message = 'A work item cannot depend on itself.';
  end if;

  select t.project_id into v_project_id
    from public.tasks as t
   where t.id = new.task_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The dependent work item no longer exists.';
  end if;

  perform 1
    from public.projects as p
   where p.id = v_project_id
   for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The production for this work item no longer exists.';
  end if;

  if not exists (
    select 1 from public.tasks as t where t.id = new.depends_on_task_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'The prerequisite work item no longer exists.';
  end if;

  if not exists (
    select 1
      from public.tasks as t
     where t.id = new.depends_on_task_id
       and t.project_id = v_project_id
  ) or not exists (
    select 1
      from public.tasks as t
     where t.id = new.task_id
       and t.project_id = v_project_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Work items can only depend on other work items in the same production.';
  end if;

  if exists (
    with recursive prerequisites(task_id) as (
      select new.depends_on_task_id
      union
      select d.depends_on_task_id
        from public.task_dependencies as d
        join prerequisites as p on p.task_id = d.task_id
       where d.id is distinct from new.id
    )
    select 1 from prerequisites as p where p.task_id = new.task_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'That dependency would make work items depend on each other in a loop.';
  end if;

  return new;
end;
$function$;

revoke all on function public.task_dependencies_validate_graph() from public, anon, authenticated;

drop trigger if exists task_dependencies_validate_graph on public.task_dependencies;
create trigger task_dependencies_validate_graph
before insert or update of task_id, depends_on_task_id on public.task_dependencies
for each row execute function public.task_dependencies_validate_graph();
