-- Extend the existing shared demo access model. These invoker functions respect
-- table permissions/RLS; actor IDs are demo identities, not authentication.
create table public.document_folders (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id),
 parent_id uuid references public.document_folders(id),
 scene_id uuid references public.scenes(id),
 name text not null check (length(btrim(name)) between 1 and 120),
 created_by uuid references public.people(id),
 created_at timestamptz not null default now(),
 deleted_at timestamptz
);
create unique index document_folders_name_idx on public.document_folders(project_id, coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name)) where deleted_at is null;
create unique index document_folders_set_idx on public.document_folders(scene_id) where scene_id is not null;
create index document_folders_parent_idx on public.document_folders(parent_id);
alter table public.document_folders enable row level security;
create policy demo_library on public.document_folders for all to anon,authenticated using(true) with check(true);
grant select,insert,update on public.document_folders to anon,authenticated;
alter table public.documents add column folder_id uuid references public.document_folders(id);
create index documents_folder_idx on public.documents(folder_id);
insert into public.document_folders(project_id,scene_id,name) select project_id,id,name from public.scenes;
insert into public.document_folders(project_id,name) select distinct project_id,folder from public.documents where scene_id is null and nullif(btrim(folder),'') is not null on conflict do nothing;
update public.documents d set folder_id=f.id from public.document_folders f where f.project_id=d.project_id and ((d.scene_id is not null and f.scene_id=d.scene_id) or (d.scene_id is null and f.scene_id is null and f.parent_id is null and lower(f.name)=lower(d.folder)));
-- Ordinary files are reference material unless explicitly sent for approval.
alter table public.documents alter column requires_approval set default false;
alter table public.approvals add column reviewer_id uuid references public.people(id);
create index approvals_reviewer_idx on public.approvals(reviewer_id,status);
alter table public.comments add column reply_to_id uuid references public.comments(id);
create index comments_reply_idx on public.comments(reply_to_id);
create table public.document_stars (
 document_id uuid not null references public.documents(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete cascade,
 primary key(document_id,person_id)
);
create index document_stars_person_idx on public.document_stars(person_id);
alter table public.document_stars enable row level security;
create policy demo_stars on public.document_stars for all to anon,authenticated using(true) with check(true);
grant select,insert,delete on public.document_stars to anon,authenticated;

create function public.library_folder_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.document_folders; begin
 perform 1 from public.projects where id=new.project_id for update;
 if tg_op='UPDATE' and new.project_id<>old.project_id then raise exception 'Folders cannot move between productions.'; end if;
 new.name=btrim(new.name);
 if new.parent_id is not null then
  select * into p from public.document_folders where id=new.parent_id;
  if not found or p.project_id<>new.project_id or p.deleted_at is not null then raise exception 'Choose an active folder in this production.'; end if;
  if exists(with recursive tree as(select id,parent_id from public.document_folders where id=new.parent_id union select f.id,f.parent_id from public.document_folders f join tree t on f.id=t.parent_id) select 1 from tree where id=new.id) then raise exception 'A folder cannot contain itself.'; end if;
 end if;
 return new;
end $$;
create trigger library_folder_guard before insert or update of parent_id,project_id,name on public.document_folders for each row execute function public.library_folder_guard();

create function public.library_document_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare f public.document_folders; begin
 -- Older upload paths still identify a set rather than a folder ID.
 if new.folder_id is null and new.scene_id is not null then
  select id into new.folder_id from public.document_folders where scene_id=new.scene_id;
 end if;
 if new.folder_id is not null then
  select * into f from public.document_folders where id=new.folder_id;
  if not found or f.project_id<>new.project_id or (f.deleted_at is not null and new.deleted_at is null) then raise exception 'Choose an active folder in this production.'; end if;
  new.folder=f.name;
  with recursive ancestors as(select id,parent_id,scene_id from public.document_folders where id=f.id union select a.id,a.parent_id,a.scene_id from public.document_folders a join ancestors b on a.id=b.parent_id) select scene_id into new.scene_id from ancestors where scene_id is not null limit 1;
 end if;
 return new;
end $$;
create trigger library_document_guard before insert or update of folder_id,project_id,deleted_at on public.documents for each row execute function public.library_document_guard();

create function public.comment_reply_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.reply_to_id is not null and (new.reply_to_id=new.id or not exists(select 1 from public.comments where id=new.reply_to_id and thread_id=new.thread_id and deleted_at is null)) then raise exception 'Reply to a message in this conversation.'; end if;
 return new;
end $$;
create trigger comment_reply_guard before insert or update of reply_to_id,thread_id on public.comments for each row execute function public.comment_reply_guard();

create function public.review_document(p_document uuid,p_version uuid,p_decision text,p_note text,p_actor uuid,p_reviewer uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare d public.documents; v public.document_versions; a public.approvals; result_id uuid; target uuid; begin
 select * into d from public.documents where id=p_document and deleted_at is null for update;
 if not found then raise exception 'Document unavailable.'; end if;
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) or exists(select 1 from public.projects where id=d.project_id and status='closed') then raise exception 'This review is read-only.'; end if;
 select * into v from public.document_versions where document_id=d.id order by version_number desc limit 1;
 if v.id is distinct from p_version then raise exception 'A newer version is available. Open it before reviewing.'; end if;
 if p_decision not in ('requested','approved','changes_requested') then raise exception 'Invalid review decision.'; end if;
 select * into a from public.approvals where document_version_id=v.id and status='pending' order by requested_at desc limit 1 for update;
 if p_decision='requested' then
  if a.id is not null then raise exception 'This version is already awaiting review.'; end if;
  if not exists(select 1 from public.people where id=p_reviewer and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose a reviewer who can approve documents.'; end if;
  insert into public.approvals(document_version_id,requested_by,reviewer_id,status,decision_note) values(v.id,p_actor,p_reviewer,'pending',nullif(btrim(p_note),'')) returning id into result_id;
  target=p_reviewer;
 else
  if a.id is null then raise exception 'This version has no pending review.'; end if;
  if a.reviewer_id is not null and a.reviewer_id<>p_actor then raise exception 'Only the assigned reviewer can make this decision.'; end if;
  if p_decision='changes_requested' and nullif(btrim(p_note),'') is null then raise exception 'Explain what needs to change.'; end if;
  update public.approvals set status=p_decision,decided_by=p_actor,decided_at=now(),decision_note=nullif(btrim(p_note),'') where id=a.id returning id into result_id;
  target=a.requested_by;
 end if;
 update public.documents set requires_approval=true,status=case p_decision when 'requested' then 'in_review' when 'changes_requested' then 'draft' else 'approved' end where id=d.id;
 if target is not null and target<>p_actor then
  insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id) values(target,case when p_decision='requested' then 'review_requested' else 'approval_'||p_decision end,d.project_id,'document',d.id);
 end if;
 insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('document',d.id,p_actor,'approval_'||p_decision,jsonb_build_object('version',v.version_number,'note',p_note,'reviewer_id',p_reviewer));
 return result_id;
end $$;

-- Serializes new versions with approvals so concurrent uploads cannot approve
-- unseen content or allocate the same version number.
create function public.library_version_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.documents where id=new.document_id for update;
 select coalesce(max(version_number),0)+1 into new.version_number from public.document_versions where document_id=new.document_id;
 update public.documents set status='draft' where id=new.document_id;
 return new;
end $$;
create trigger library_version_guard before insert on public.document_versions for each row execute function public.library_version_guard();

create function public.library_folder_action(p_folder uuid,p_action text,p_actor uuid,p_name text default null,p_parent uuid default null) returns void language plpgsql security invoker set search_path='' as $$
declare f public.document_folders; stamp timestamptz=clock_timestamp(); ids uuid[]; begin
 select * into f from public.document_folders where id=p_folder for update;
 if not found then raise exception 'Folder unavailable.'; end if;
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) or exists(select 1 from public.projects where id=f.project_id and status='closed') then raise exception 'This folder is read-only.'; end if;
 if p_action='rename' then
  update public.document_folders set name=p_name where id=f.id;
  update public.documents set folder=p_name where folder_id=f.id;
 elsif p_action='move' then
  if f.scene_id is not null then raise exception 'Set folders stay at the top level.'; end if;
  update public.document_folders set parent_id=p_parent where id=f.id;
  with recursive tree as(select id from public.document_folders where id=f.id union select c.id from public.document_folders c join tree t on c.parent_id=t.id) update public.documents set folder_id=folder_id where folder_id in (select id from tree) and deleted_at is null;
 elsif p_action in ('trash','restore') then
  if f.scene_id is not null then raise exception 'Set folders stay with their set. Move files individually.'; end if;
  with recursive tree as(select id from public.document_folders where id=f.id union select c.id from public.document_folders c join tree t on c.parent_id=t.id) select array_agg(id) into ids from tree;
  if p_action='trash' then
   update public.documents set deleted_at=stamp where folder_id=any(ids) and deleted_at is null;
   update public.document_folders set deleted_at=stamp where id=any(ids) and deleted_at is null;
  else
   if f.parent_id is not null and exists(select 1 from public.document_folders where id=f.parent_id and deleted_at is not null) then raise exception 'Restore the parent folder first.'; end if;
   update public.document_folders set deleted_at=null where id=any(ids) and deleted_at=f.deleted_at;
   update public.documents set deleted_at=null where folder_id=any(ids) and deleted_at=f.deleted_at;
  end if;
 else raise exception 'Invalid folder action.'; end if;
end $$;

-- Additive publication changes only.
do $$ declare t text; begin
 foreach t in array array['comments','discussion_threads','comment_attachments','documents','document_versions','approvals','document_folders','document_stars','notifications'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
revoke all on function public.library_folder_guard(),public.library_document_guard(),public.comment_reply_guard(),public.library_version_guard() from public,anon,authenticated;
revoke all on function public.review_document(uuid,uuid,text,text,uuid,uuid), public.library_folder_action(uuid,text,uuid,text,uuid) from public;
grant execute on function public.review_document(uuid,uuid,text,text,uuid,uuid),public.library_folder_action(uuid,text,uuid,text,uuid) to anon,authenticated;

create function public.file_conversation_attachment(p_attachment uuid,p_folder uuid,p_title text,p_actor uuid,p_requires_approval boolean default false) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.comment_attachments; t public.discussion_threads; doc_id uuid; begin
 select * into a from public.comment_attachments where id=p_attachment for update;
 if not found then raise exception 'Attachment unavailable.'; end if;
 if a.saved_document_id is not null then
  if exists(select 1 from public.documents where id=a.saved_document_id and deleted_at is not null) then raise exception 'This file is in Trash. Restore it first.'; end if;
  return a.saved_document_id;
 end if;
 select dt.* into t from public.discussion_threads dt join public.comments c on c.thread_id=dt.id where c.id=a.comment_id;
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) or exists(select 1 from public.projects where id=t.project_id and status='closed') then raise exception 'This file is read-only.'; end if;
 insert into public.documents(project_id,task_id,folder_id,title,requires_approval,status,created_by) values(t.project_id,t.task_id,p_folder,coalesce(nullif(btrim(p_title),''),a.file_name),p_requires_approval,'draft',p_actor) returning id into doc_id;
 insert into public.document_versions(document_id,version_number,storage_key,uploaded_by,change_note) values(doc_id,1,a.storage_key,p_actor,'Filed from a conversation');
 update public.comment_attachments set saved_document_id=doc_id where id=a.id;
 return doc_id;
end $$;
revoke all on function public.file_conversation_attachment(uuid,uuid,text,uuid,boolean) from public;
grant execute on function public.file_conversation_attachment(uuid,uuid,text,uuid,boolean) to anon,authenticated;

create function public.library_scene_folder() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.document_folders(project_id,scene_id,name) values(new.project_id,new.id,new.name) on conflict(scene_id) where scene_id is not null do update set name=excluded.name;
 return new;
end $$;
create trigger library_scene_folder after insert or update of name on public.scenes for each row execute function public.library_scene_folder();
revoke all on function public.library_scene_folder() from public,anon,authenticated;
