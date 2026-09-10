create or replace function public.recompute_milestone_status(p_milestone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_done int;
  v_new text;
  v_due date;
  v_forecast date;
begin
  if p_milestone_id is null then return; end if;

  select count(*), count(*) filter (where status = 'complete')
    into v_total, v_done
  from tasks where milestone_id = p_milestone_id;

  if v_total = 0 then return; end if;

  select due_date, coalesce(forecast_date, due_date) into v_due, v_forecast
  from milestones where id = p_milestone_id;

  if v_done = v_total then
    v_new := 'complete';
  elsif exists (select 1 from tasks where milestone_id = p_milestone_id and status = 'blocked')
     or (v_due is not null and v_forecast is not null and v_forecast > v_due)
     or exists (
       select 1 from tasks
        where milestone_id = p_milestone_id
          and status <> 'complete'
          and due_date is not null
          and due_date < current_date
     )
  then
    v_new := 'at_risk';
  elsif exists (select 1 from tasks where milestone_id = p_milestone_id and status <> 'not_started') then
    v_new := 'in_progress';
  else
    v_new := 'not_started';
  end if;

  update milestones set status = v_new
   where id = p_milestone_id and status is distinct from v_new;
end;
$$;

create or replace function public.tasks_sync_milestone_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recompute_milestone_status(old.milestone_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.recompute_milestone_status(new.milestone_id);
  end if;
  return null;
end;
$$;

drop trigger if exists tasks_sync_milestone_status on public.tasks;
create trigger tasks_sync_milestone_status
after insert or update or delete on public.tasks
for each row execute function public.tasks_sync_milestone_status();

update public.milestones m
   set status = sub.new_status
  from (
    select t.milestone_id,
           case
             when count(*) filter (where t.status = 'complete') = count(*) then 'complete'
             when bool_or(t.status = 'blocked')
               or (mi.due_date is not null and coalesce(mi.forecast_date, mi.due_date) > mi.due_date)
               or bool_or(t.status <> 'complete' and t.due_date is not null and t.due_date < current_date)
               then 'at_risk'
             when bool_or(t.status <> 'not_started') then 'in_progress'
             else 'not_started'
           end as new_status
      from tasks t
      join milestones mi on mi.id = t.milestone_id
     group by t.milestone_id, mi.due_date, mi.forecast_date
  ) sub
 where m.id = sub.milestone_id
   and m.status is distinct from sub.new_status;