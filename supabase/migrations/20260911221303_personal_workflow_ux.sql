-- Personal workflow state for the existing shared-demo person model.
create table public.conversation_reads(person_id uuid references public.people(id) on delete cascade,thread_id uuid references public.discussion_threads(id) on delete cascade,last_read_at timestamptz not null,primary key(person_id,thread_id));
create index on public.conversation_reads(thread_id);
create table public.conversation_preferences(person_id uuid references public.people(id) on delete cascade,thread_id uuid references public.discussion_threads(id) on delete cascade,mode text not null check(mode in ('following','muted')),primary key(person_id,thread_id));
create index on public.conversation_preferences(thread_id);
create table public.notification_preferences(person_id uuid primary key references public.people(id) on delete cascade,desktop boolean not null default false,mode text not null default 'mentions' check(mode in ('mentions','following')),quiet_start integer not null default 22 check(quiet_start between 0 and 23),quiet_end integer not null default 7 check(quiet_end between 0 and 23));
create table public.personal_notification_state(person_id uuid references public.people(id) on delete cascade,notification_id uuid references public.notifications(id) on delete cascade,dismissed boolean not null default false,snoozed_until timestamptz,primary key(person_id,notification_id));
create index on public.personal_notification_state(notification_id);
do $$ declare t text; begin foreach t in array array['conversation_reads','conversation_preferences','notification_preferences','personal_notification_state'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy demo_access on public.%I for all to anon,authenticated using(true) with check(true)',t);
end loop; end $$;

create function public.personal_workflow(p_actor uuid,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare tid uuid=nullif(p_payload->>'thread_id','')::uuid; nid uuid=nullif(p_payload->>'notification_id','')::uuid;
begin
 if not exists(select 1 from public.people where id=p_actor and deactivated_at is null) then raise exception 'Choose an active person.'; end if;
 if p_action='read' then
  if not exists(select 1 from public.discussion_threads where id=tid) then raise exception 'Conversation unavailable.'; end if;
  insert into public.conversation_reads values(p_actor,tid,least((p_payload->>'at')::timestamptz,clock_timestamp()))
   on conflict(person_id,thread_id) do update set last_read_at=greatest(conversation_reads.last_read_at,excluded.last_read_at);
 elsif p_action='follow' then
  insert into public.conversation_preferences values(p_actor,tid,p_payload->>'mode') on conflict(person_id,thread_id) do update set mode=excluded.mode;
 elsif p_action='preferences' then
  insert into public.notification_preferences values(p_actor,(p_payload->>'desktop')::boolean,p_payload->>'mode',(p_payload->>'quiet_start')::integer,(p_payload->>'quiet_end')::integer)
   on conflict(person_id) do update set desktop=excluded.desktop,mode=excluded.mode,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end;
 elsif p_action='notification' then
  if not exists(select 1 from public.notifications where id=nid and person_id=p_actor) then raise exception 'This notification belongs to another person.'; end if;
  insert into public.personal_notification_state values(p_actor,nid,coalesce((p_payload->>'dismissed')::boolean,false),nullif(p_payload->>'snoozed_until','')::timestamptz)
   on conflict(person_id,notification_id) do update set dismissed=excluded.dismissed,snoozed_until=excluded.snoozed_until;
 elsif p_action<>'get' then raise exception 'Unknown personal workflow action.';
 end if;
 return jsonb_build_object(
  'reads',coalesce((select jsonb_agg(to_jsonb(r)) from public.conversation_reads r where r.person_id=p_actor),'[]'),
  'threads',coalesce((select jsonb_agg(to_jsonb(r)) from public.conversation_preferences r where r.person_id=p_actor),'[]'),
  'notifications',coalesce((select jsonb_agg(to_jsonb(r)) from public.personal_notification_state r where r.person_id=p_actor),'[]'),
  'preferences',(select to_jsonb(r) from public.notification_preferences r where r.person_id=p_actor));
end $$;
revoke all on function public.personal_workflow(uuid,text,jsonb) from public;
grant execute on function public.personal_workflow(uuid,text,jsonb) to anon,authenticated,service_role;
create function public.conversation_followers(p_thread uuid) returns table(person_id uuid) language sql stable security invoker set search_path='' as $$
 select c.person_id from public.conversation_preferences c join public.people p on p.id=c.person_id where c.thread_id=p_thread and c.mode='following' and p.deactivated_at is null;
$$;
revoke all on function public.conversation_followers(uuid) from public;
grant execute on function public.conversation_followers(uuid) to anon,authenticated,service_role;
create function public.filter_muted_conversation_notice() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.type='new_message' and exists(select 1 from public.conversation_preferences p join public.comments c on c.thread_id=p.thread_id where p.person_id=new.person_id and c.id=new.source_comment_id and p.mode='muted') then return null; end if;
 return new;
end $$;
create trigger filter_muted_conversation_notice before insert on public.notifications for each row execute function public.filter_muted_conversation_notice();

-- The main set chat is created atomically on its first message, not by opening a page.
alter table public.discussion_threads add column is_general boolean not null default false;
create unique index one_main_chat_per_set on public.discussion_threads(scene_id) where is_general;
alter table public.discussion_threads add constraint general_chat_is_set check(not is_general or (context_type='scene' and scene_id is not null and task_id is null and document_id is null));
create function public.ensure_set_chat(p_scene uuid,p_actor uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; pid uuid;
begin
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) then raise exception 'An active contributor is required.'; end if;
 select s.project_id into pid from public.scenes s join public.projects p on p.id=s.project_id where s.id=p_scene and p.status<>'closed';
 if pid is null then raise exception 'Set unavailable or archived.'; end if;
 insert into public.discussion_threads(project_id,context_type,scene_id,created_by,is_general) values(pid,'scene',p_scene,p_actor,true)
  on conflict(scene_id) where is_general do nothing returning id into result;
 if result is null then select id into result from public.discussion_threads where scene_id=p_scene and is_general; end if;
 return result;
end $$;
revoke all on function public.ensure_set_chat(uuid,uuid) from public;
grant execute on function public.ensure_set_chat(uuid,uuid) to anon,authenticated,service_role;

alter table public.approvals add column due_date date;
create function public.request_document_review(p_document uuid,p_version uuid,p_note text,p_actor uuid,p_reviewer uuid,p_due_date date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if p_due_date<current_date then raise exception 'Choose today or a future review date.'; end if;
 result=public.review_document(p_document,p_version,'requested',p_note,p_actor,p_reviewer);
 update public.approvals set due_date=p_due_date where id=result;
 return result;
end $$;
revoke all on function public.request_document_review(uuid,uuid,text,uuid,uuid,date) from public;
grant execute on function public.request_document_review(uuid,uuid,text,uuid,uuid,date) to anon,authenticated,service_role;

create function public.department_audience(p_project uuid,p_scene uuid default null) returns table(department_id uuid,person_id uuid)
language sql stable security invoker set search_path='' as $$
 with context as (
  select p.id as project_id,p_scene as scene_id from public.projects p where p.id=p_project
  and (p_scene is null or exists(select 1 from public.scenes s where s.id=p_scene and s.project_id=p.id))
 ), oversight as (
  select a.department_id,a.person_id from public.project_assignments a join context c on c.project_id=a.project_id
   join public.people p on p.id=a.person_id and p.deactivated_at is null
   where a.is_head and a.scene_id is null
  union select pd.department_id,pd.default_owner_id from public.project_departments pd join context c on c.project_id=pd.project_id
   join public.people p on p.id=pd.default_owner_id and p.deactivated_at is null
 ), recipients as (
  select a.department_id,a.person_id from public.project_assignments a join context c on c.project_id=a.project_id
   where (c.scene_id is not null and a.scene_id=c.scene_id) or (c.scene_id is null and a.scene_id is null)
  union select * from oversight
  -- Global leads are a fallback only when the production has no active oversight.
  union select d.id,d.default_owner_id from public.departments d cross join context
   where not exists(select 1 from oversight o where o.department_id=d.id)
  union select m.department_id,m.person_id from public.department_memberships m cross join context
   where m.is_lead and not exists(select 1 from oversight o where o.department_id=m.department_id)
 ) select distinct r.department_id,r.person_id from recipients r join public.people p on p.id=r.person_id where p.deactivated_at is null;
$$;
revoke all on function public.department_audience(uuid,uuid) from public;
grant execute on function public.department_audience(uuid,uuid) to anon,authenticated,service_role;
