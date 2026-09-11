-- Additive coordination tools for the existing shared demo identity model.
create table public.comment_edit_history (
 id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.comments(id),
 author_id uuid not null references public.people(id), old_body text not null, new_body text not null,
 edited_at timestamptz not null default clock_timestamp()
);
create index on public.comment_edit_history(comment_id,edited_at);
create function public.guard_message_edit() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.created_at is distinct from old.created_at or new.author_id is distinct from old.author_id or new.thread_id is distinct from old.thread_id then raise exception 'Message author, conversation and send time cannot be changed.'; end if;
 if new.body is distinct from old.body then
  if old.deleted_at is not null or clock_timestamp() >= old.created_at + interval '2 hours' then raise exception 'The two-hour editing window has ended. Post a reply to correct this message.'; end if;
  if nullif(btrim(new.body),'') is null then raise exception 'Write a message before saving.'; end if;
  if exists(select 1 from public.discussion_threads t join public.projects p on p.id=t.project_id where t.id=old.thread_id and p.status='closed') then raise exception 'This production is archived.'; end if;
  new.edited_at=clock_timestamp();
  insert into public.comment_edit_history(comment_id,author_id,old_body,new_body,edited_at) values(old.id,old.author_id,old.body,new.body,new.edited_at);
 else new.edited_at=old.edited_at;
 end if;
 return new;
end $$;
create trigger guard_message_edit before update on public.comments for each row execute function public.guard_message_edit();
alter table public.project_assignments add column accepted_at timestamptz;
create table public.set_followers(scene_id uuid not null references public.scenes(id),person_id uuid not null references public.people(id),primary key(scene_id,person_id));
create table public.project_workflow_settings(project_id uuid primary key references public.projects(id),timeline_owner_id uuid not null references public.people(id));
create table public.set_updates(
 id uuid primary key default gen_random_uuid(),scene_id uuid not null references public.scenes(id),
 kind text not null check(kind in ('update','decision')),body text not null check(length(btrim(body))>0),
 owner_id uuid not null references public.people(id),created_by uuid not null references public.people(id),
 source_comment_id uuid references public.comments(id),source_snapshot text,
 document_version_id uuid references public.document_versions(id),task_id uuid references public.tasks(id),
 needs_ack boolean not null default false,created_at timestamptz not null default clock_timestamp()
);
create index on public.set_updates(scene_id,created_at);
create table public.set_update_recipients(update_id uuid not null references public.set_updates(id),person_id uuid not null references public.people(id),acknowledged_at timestamptz,primary key(update_id,person_id));
create index on public.set_update_recipients(person_id);
create table public.schedule_change_requests(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),task_id uuid not null references public.tasks(id),
 requested_by uuid not null references public.people(id),old_start date,old_finish date,new_start date not null,new_finish date not null check(new_finish>=new_start),
 reason text not null check(length(btrim(reason))>0),status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 reviewed_by uuid references public.people(id),review_note text,created_at timestamptz not null default clock_timestamp(),reviewed_at timestamptz
);
create unique index one_pending_schedule_request on public.schedule_change_requests(task_id) where status='pending';
create index on public.schedule_change_requests(project_id,created_at);
create table public.capacity_allocations(
 task_id uuid primary key references public.tasks(id),project_id uuid not null references public.projects(id),
 lane text not null check(length(btrim(lane))>0),mode text not null check(mode in ('in_house','outsourced')),
 vendor text,owner_id uuid not null references public.people(id),start_date date not null,finish_date date not null check(finish_date>=start_date),
 updated_at timestamptz not null default clock_timestamp(),check(mode='in_house' or nullif(btrim(vendor),'') is not null)
);
create index on public.capacity_allocations(project_id);

-- Assigned set members and set/work owners follow automatically; others opt in.
create function public.set_recipients(p_scene uuid) returns table(person_id uuid,full_name text) language sql stable security invoker set search_path='' as $$
 select distinct p.id,p.full_name from public.people p join (
 select person_id from public.set_followers where scene_id=p_scene
 union select person_id from public.project_assignments where scene_id=p_scene
 union select owner_id from public.scenes where id=p_scene
 union select owner_id from public.tasks where scene_id=p_scene
 ) x on x.person_id=p.id where p.deactivated_at is null;
$$;

create function public.workspace_action(p_action text,p_payload jsonb,p_actor uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid=nullif(p_payload->>'scene_id','')::uuid; pid uuid; tid uuid=nullif(p_payload->>'task_id','')::uuid;
 s public.scenes; t public.tasks; req public.schedule_change_requests; u public.set_updates; cid uuid; vid uuid; oid uuid; result uuid; manager uuid; snapshot text; affected uuid[]; actual uuid[]; expected uuid[];
begin
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) then raise exception 'This action needs an active contributor.'; end if;
 if p_action in ('review_schedule','withdraw_schedule') then select * into req from public.schedule_change_requests where id=(p_payload->>'id')::uuid for update; tid=req.task_id; end if;
 if tid is not null then select * into t from public.tasks where id=tid for update; if not found then raise exception 'Work item unavailable.'; end if; if p_payload->>'project_id' is not null and t.project_id<>(p_payload->>'project_id')::uuid then raise exception 'Choose work in this production.'; end if;
 if p_action='post_update' and t.scene_id is distinct from sid then raise exception 'Choose follow-up work in this set.'; end if;
 sid=t.scene_id; pid=t.project_id; end if;
 if p_action='acknowledge' then select * into u from public.set_updates where id=(p_payload->>'id')::uuid; sid=u.scene_id; end if;
 if p_action='accept_responsibility' then select scene_id into sid from public.project_assignments where id=(p_payload->>'id')::uuid and person_id=p_actor; end if;
 if sid is not null then select * into s from public.scenes where id=sid; if not found then raise exception 'Set unavailable.'; end if; pid=s.project_id; end if;
 pid=coalesce(pid,nullif(p_payload->>'project_id','')::uuid);
 if pid is null or not exists(select 1 from public.projects where id=pid and status<>'closed') then raise exception 'This production is unavailable or archived.'; end if;
 select coalesce(w.timeline_owner_id,p.owner_id) into manager from public.projects p left join public.project_workflow_settings w on w.project_id=p.id where p.id=pid;
 if p_action='follow' then
  insert into public.set_followers values(sid,p_actor) on conflict do nothing; return sid;
 elsif p_action='unfollow' then delete from public.set_followers where scene_id=sid and person_id=p_actor; return sid;
 elsif p_action='accept_responsibility' then
  update public.project_assignments set accepted_at=coalesce(accepted_at,clock_timestamp()) where id=(p_payload->>'id')::uuid and person_id=p_actor; return sid;
 elsif p_action='set_manager' then
  if not exists(select 1 from public.people where id=p_actor and role='admin') then raise exception 'An administrator assigns the timeline owner.'; end if;
  oid=(p_payload->>'owner_id')::uuid;
  if not exists(select 1 from public.people where id=oid and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose an active timeline owner.'; end if;
  insert into public.project_workflow_settings values(pid,oid) on conflict(project_id) do update set timeline_owner_id=excluded.timeline_owner_id; return pid;
 elsif p_action='post_update' then
  oid=(p_payload->>'owner_id')::uuid; cid=nullif(p_payload->>'source_comment_id','')::uuid; vid=nullif(p_payload->>'document_version_id','')::uuid;
  if not exists(select 1 from public.people where id=oid and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose a responsible contributor.'; end if;
  if cid is not null then
   select c.body into snapshot from public.comments c join public.discussion_threads th on th.id=c.thread_id
   left join public.tasks ct on ct.id=th.task_id left join public.documents cd on cd.id=th.document_id
   where c.id=cid and c.deleted_at is null and th.project_id=pid and coalesce(th.scene_id,ct.scene_id,cd.scene_id,sid)=sid;
   if not found then raise exception 'Choose a message from this set or its production conversation.'; end if;
  end if;
  if vid is not null and not exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=vid and d.project_id=pid and d.scene_id=sid and d.deleted_at is null) then raise exception 'Choose a document version from this set.'; end if;
  select coalesce(array_agg(person_id order by person_id),'{}'::uuid[]) into actual from public.set_recipients(sid) where person_id<>p_actor;
  select coalesce(array_agg(distinct value::uuid order by value::uuid),'{}'::uuid[]) into expected from jsonb_array_elements_text(coalesce(p_payload->'recipients','[]'));
  if coalesce((p_payload->>'needs_ack')::boolean,false) and cardinality(actual)=0 then raise exception 'Assign or follow set members before requesting acknowledgement.'; end if;
  if actual<>expected then raise exception 'The recipients changed. Refresh the recipient list before posting.'; end if;
  insert into public.set_updates(scene_id,kind,body,owner_id,created_by,source_comment_id,source_snapshot,document_version_id,task_id,needs_ack)
  values(sid,p_payload->>'kind',btrim(p_payload->>'body'),oid,p_actor,cid,snapshot,vid,tid,coalesce((p_payload->>'needs_ack')::boolean,false)) returning id into result;
  insert into public.set_update_recipients(update_id,person_id) select result,unnest(actual);
  insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id)
   select unnest(actual),case when (p_payload->>'kind')='decision' then 'set_decision_recorded' else 'set_important_update' end,pid,'scene',sid;
  return result;
 elsif p_action='acknowledge' then
  if not u.needs_ack then raise exception 'This update does not require acknowledgement.'; end if;
  update public.set_update_recipients set acknowledged_at=coalesce(acknowledged_at,clock_timestamp()) where update_id=u.id and person_id=p_actor;
  if not found then raise exception 'Only a notified recipient can acknowledge this update.'; end if; return u.id;
 elsif p_action='request_schedule' then
  if manager is null or not exists(select 1 from public.people where id=manager and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Assign a timeline owner first.'; end if;
  if t.status='complete' then raise exception 'Completed work cannot be rescheduled.'; end if;
  insert into public.schedule_change_requests(project_id,task_id,requested_by,old_start,old_finish,new_start,new_finish,reason)
  values(pid,tid,p_actor,t.start_date,t.due_date,(p_payload->>'start_date')::date,(p_payload->>'finish_date')::date,btrim(p_payload->>'reason')) returning id into result;
  if manager<>p_actor then insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id) values(manager,'schedule_change_requested',pid,'scene',sid); end if;
  return result;
 elsif p_action='withdraw_schedule' then
  if req.status<>'pending' or req.requested_by<>p_actor then raise exception 'Only the requester can withdraw a pending request.'; end if;
  update public.schedule_change_requests set status='withdrawn',reviewed_at=clock_timestamp() where id=req.id; return req.id;
 elsif p_action='review_schedule' then
  if p_actor is distinct from manager then raise exception 'Only the timeline owner can decide this request.'; end if;
  if req.status<>'pending' then raise exception 'This request has already been decided.'; end if;
  if p_payload->>'decision' not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
  if p_payload->>'decision'='declined' and nullif(btrim(p_payload->>'note'),'') is null then raise exception 'Explain why the request was declined.'; end if;
  if p_payload->>'decision'='accepted' then
   if t.start_date is distinct from req.old_start or t.due_date is distinct from req.old_finish then raise exception 'The work dates changed since this request. Withdraw it and submit a new request.'; end if;
   if t.status='complete' then raise exception 'Completed work cannot be rescheduled.'; end if;
   -- Recheck the exact impact the reviewer saw; concurrent schedule changes require a fresh preview.
   if p_payload->'impact' is distinct from (select coalesce(jsonb_agg(to_jsonb(x) order by x.entity_id),'[]') from public.preview_task_reschedule(tid,req.new_start,req.new_finish) x) then raise exception 'The schedule impact changed. Preview it again before accepting.'; end if;
   select array_agg(distinct scene_id) into affected from public.tasks where project_id=pid and (id=tid or id in (select entity_id from public.preview_task_reschedule(tid,req.new_start,req.new_finish) where entity_type='task'));
   update public.tasks set start_date=req.new_start,due_date=req.new_finish,updated_at=clock_timestamp() where id=tid;
   perform public.compute_project_schedule(pid);
   insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id)
   select distinct r.person_id,'schedule_change_accepted',pid,'scene',sid from unnest(affected) a cross join lateral public.set_recipients(a) r where r.person_id<>p_actor and r.person_id<>req.requested_by;
  end if;
  update public.schedule_change_requests set status=p_payload->>'decision',reviewed_by=p_actor,reviewed_at=clock_timestamp(),review_note=nullif(btrim(p_payload->>'note'),'') where id=req.id;
  if req.requested_by<>p_actor then insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id) values(req.requested_by,'schedule_change_'||(p_payload->>'decision'),pid,'scene',sid); end if;
  insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('task',tid,p_actor,'schedule_request_'||(p_payload->>'decision'),jsonb_build_object('request_id',req.id,'start',req.new_start,'finish',req.new_finish));
  return req.id;
 elsif p_action='capacity' then
  oid=(p_payload->>'owner_id')::uuid;
  if not exists(select 1 from public.people where id=oid and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose an active capacity owner.'; end if;
  insert into public.capacity_allocations(task_id,project_id,lane,mode,vendor,owner_id,start_date,finish_date)
  values(tid,pid,btrim(p_payload->>'lane'),p_payload->>'mode',nullif(btrim(p_payload->>'vendor'),''),oid,(p_payload->>'start_date')::date,(p_payload->>'finish_date')::date)
  on conflict(task_id) do update set lane=excluded.lane,mode=excluded.mode,vendor=excluded.vendor,owner_id=excluded.owner_id,start_date=excluded.start_date,finish_date=excluded.finish_date,updated_at=clock_timestamp(); return tid;
 elsif p_action='remove_capacity' then delete from public.capacity_allocations where task_id=tid; return tid;
 end if;
 raise exception 'Unknown workspace action.';
end $$;

-- These tables inherit the shared demo access model. No SECURITY DEFINER functions are added.
do $$ declare tab text; begin
 foreach tab in array array['comment_edit_history','set_followers','project_workflow_settings','set_updates','set_update_recipients','schedule_change_requests','capacity_allocations'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('create policy demo_workspace_read on public.%I for select to anon,authenticated using(true)',tab);
 execute format('create policy demo_workspace_insert on public.%I for insert to anon,authenticated with check(true)',tab);
 execute format('grant select,insert on public.%I to anon,authenticated',tab);
 end loop;
 foreach tab in array array['project_workflow_settings','set_update_recipients','schedule_change_requests','capacity_allocations'] loop
 execute format('create policy demo_workspace_update on public.%I for update to anon,authenticated using(true) with check(true)',tab);
 execute format('grant update on public.%I to anon,authenticated',tab);
 end loop;
 foreach tab in array array['set_followers','capacity_allocations'] loop
 execute format('create policy demo_workspace_delete on public.%I for delete to anon,authenticated using(true)',tab);
 execute format('grant delete on public.%I to anon,authenticated',tab);
 end loop;
end $$;
grant execute on function public.workspace_action(text,jsonb,uuid),public.set_recipients(uuid) to anon,authenticated;

create function public.reset_responsibility_acceptance() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.person_id is distinct from old.person_id or new.scene_id is distinct from old.scene_id or new.department_id is distinct from old.department_id or new.job_title is distinct from old.job_title then new.accepted_at=null; end if;
 return new;
end $$;
create trigger reset_responsibility_acceptance before update on public.project_assignments for each row execute function public.reset_responsibility_acceptance();
