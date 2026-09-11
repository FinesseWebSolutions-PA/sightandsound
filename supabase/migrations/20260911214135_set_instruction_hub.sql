-- Resolve the actual conversation anchor so task/document mentions follow their set.
create function public.department_mention_recipients(p_thread uuid)
returns table(department_id uuid, person_id uuid)
language sql stable security invoker set search_path='' as $$
 with context as (
  select th.project_id, case th.context_type::text
   when 'scene' then th.scene_id when 'task' then t.scene_id when 'document' then d.scene_id
   else null end as scene_id
  from public.discussion_threads th
  left join public.tasks t on t.id=th.task_id and t.project_id=th.project_id
  left join public.documents d on d.id=th.document_id and d.project_id=th.project_id
  where th.id=p_thread
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
revoke all on function public.department_mention_recipients(uuid) from public;
grant execute on function public.department_mention_recipients(uuid) to anon,authenticated,service_role;

-- A document can fill more than one purpose; files and version history stay in the library.
create table public.set_instruction_documents (
 scene_id uuid not null references public.scenes(id) on delete cascade,
 category text not null check(category in ('manual','assembly','shipping')),
 document_id uuid not null references public.documents(id) on delete cascade,
 updated_by uuid not null references public.people(id),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(scene_id,category,document_id)
);
create index on public.set_instruction_documents(document_id);
create index on public.set_instruction_documents(updated_by);
alter table public.set_instruction_documents enable row level security;
-- Preserve the existing shared demo access model. Real user authentication remains separate work.
grant select,insert,update,delete on public.set_instruction_documents to anon,authenticated;
grant all on public.set_instruction_documents to service_role;
create policy demo_read on public.set_instruction_documents for select to anon,authenticated using(true);
create policy demo_write on public.set_instruction_documents for all to anon,authenticated using(true) with check(true);
create function public.guard_set_instruction() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.people where id=new.updated_by and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose an active contributor.'; end if;
 if not exists(select 1 from public.scenes s join public.projects p on p.id=s.project_id join public.documents d on d.scene_id=s.id and d.project_id=s.project_id
  where s.id=new.scene_id and d.id=new.document_id and d.deleted_at is null and p.status<>'closed') then raise exception 'Choose an available document from this set in an active production.'; end if;
 new.updated_at=clock_timestamp(); return new;
end $$;
create trigger guard_set_instruction before insert or update on public.set_instruction_documents for each row execute function public.guard_set_instruction();
create function public.set_instruction_action(p_scene uuid,p_category text,p_document uuid,p_actor uuid,p_remove boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) then raise exception 'This action needs an active contributor.'; end if;
 if not exists(select 1 from public.scenes s join public.projects p on p.id=s.project_id where s.id=p_scene and p.status<>'closed') then raise exception 'This production is unavailable or archived.'; end if;
 if p_remove then
  delete from public.set_instruction_documents where scene_id=p_scene and category=p_category and document_id=p_document;
 else
  insert into public.set_instruction_documents(scene_id,category,document_id,updated_by) values(p_scene,p_category,p_document,p_actor)
   on conflict(scene_id,category,document_id) do update set updated_by=excluded.updated_by;
 end if;
end $$;
revoke all on function public.set_instruction_action(uuid,text,uuid,uuid,boolean) from public;
grant execute on function public.set_instruction_action(uuid,text,uuid,uuid,boolean) to anon,authenticated,service_role;
