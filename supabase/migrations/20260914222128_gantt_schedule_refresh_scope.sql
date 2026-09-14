-- Serialize existing links and protected dates; metadata edits do not recalculate schedules.
-- Resolve approvals using the newest file version and latest review.
create or replace function public.gantt_edit(p_project uuid,p_actor uuid,p_expected text,p_operations jsonb,p_preview boolean default false) returns jsonb
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
 perform d.id from public.task_dependencies d join public.tasks t on t.id=d.task_id where t.project_id=p_project order by d.id for update of d;
 perform 1 from public.milestones where project_id=p_project order by id for update;
 perform 1 from public.scenes where project_id=p_project order by id for update;
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
   if patch ? 'status' and newrow->>'status'='done' and exists(select 1 from public.documents d where d.task_id=tid and coalesce(d.requires_approval,true) and d.deleted_at is null and coalesce((
    select a.status from public.approvals a join public.document_versions v on v.id=a.document_version_id
    where v.document_id=d.id and v.version_number=(select max(v2.version_number) from public.document_versions v2 where v2.document_id=d.id)
    order by a.requested_at desc,a.id desc limit 1
   ),d.status,'draft')<>'approved') then raise exception 'Approve the linked files before completing this task.'; end if;
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
  touched:=touched or op->>'action'<>'task' or coalesce((op->'patch') ?| array['start_date','due_date','status'],false);
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
