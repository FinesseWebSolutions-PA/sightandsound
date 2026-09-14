-- Stages describe work within one set. Their order never implies a dependency.
alter table public.scenes add constraint scenes_id_project_unique unique(id,project_id);
alter table public.tasks alter column scene_id set not null;
alter table public.tasks add constraint tasks_set_project_fk foreign key(scene_id,project_id) references public.scenes(id,project_id);
create table public.set_stages (
 id uuid primary key default gen_random_uuid(),
 scene_id uuid not null,
 project_id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 100),
 sort_order integer not null default 0,
 created_by uuid references public.people(id),
 created_at timestamptz not null default now(),
 unique(id,scene_id,project_id),
 foreign key(scene_id,project_id) references public.scenes(id,project_id) on delete cascade
);
create unique index set_stages_name_unique on public.set_stages(scene_id,lower(btrim(name)));
create index set_stages_project_idx on public.set_stages(project_id);
alter table public.tasks add column stage_id uuid;
alter table public.tasks add constraint tasks_stage_scope_fk foreign key(stage_id,scene_id,project_id) references public.set_stages(id,scene_id,project_id);
create index tasks_stage_scope_idx on public.tasks(stage_id,scene_id,project_id);
create index if not exists tasks_scene_project_idx on public.tasks(scene_id,project_id);

-- Stage writes follow the prototype's selected-person model, through one checked RPC.
alter table public.set_stages enable row level security;
grant select,insert,update,delete on public.set_stages to anon,authenticated;
create policy stage_read on public.set_stages for select to anon,authenticated using(true);
create policy stage_write on public.set_stages for all to anon,authenticated
using (
 exists(select 1 from public.people p where p.id=nullif(current_setting('app.stage_actor',true),'')::uuid and p.role='admin' and p.deactivated_at is null)
 and exists(select 1 from public.projects p where p.id=project_id and p.status<>'closed')
) with check (
 exists(select 1 from public.people p where p.id=nullif(current_setting('app.stage_actor',true),'')::uuid and p.role='admin' and p.deactivated_at is null)
 and exists(select 1 from public.projects p where p.id=project_id and p.status<>'closed')
);

create function public.manage_set_stage(p_scene uuid,p_actor uuid,p_name text default null,p_id uuid default null,p_action text default 'save') returns uuid
language plpgsql security invoker set search_path='' as $$
declare pid uuid; result uuid; item public.set_stages; neighbor public.set_stages; position integer;
begin
 if not exists(select 1 from public.people where id=p_actor and role='admin' and deactivated_at is null) then raise exception 'Only an active administrator can organize stages.'; end if;
 select project_id into pid from public.scenes where id=p_scene for update;
 if pid is null or not exists(select 1 from public.projects where id=pid and status<>'closed') then raise exception 'This set is unavailable or its production is closed.'; end if;
 perform set_config('app.stage_actor',p_actor::text,true);
 if p_id is not null then
  select * into item from public.set_stages where id=p_id and scene_id=p_scene for update;
  if not found then raise exception 'This stage does not belong to this set.'; end if;
 end if;
 if p_action='save' then
  if p_name is null or length(btrim(p_name)) not between 1 and 100 then raise exception 'Use a stage name between 1 and 100 characters.'; end if;
  if p_id is null then
   select coalesce(max(sort_order),0)+1 into position from public.set_stages where scene_id=p_scene;
   insert into public.set_stages(scene_id,project_id,name,sort_order,created_by) values(p_scene,pid,btrim(p_name),position,p_actor) returning id into result;
  else
   update public.set_stages set name=btrim(p_name) where id=p_id returning id into result;
  end if;
 elsif p_action='delete' and p_id is not null then
  if exists(select 1 from public.tasks where stage_id=p_id) then raise exception 'Move this stage’s tasks before removing it.'; end if;
  delete from public.set_stages where id=p_id; result=p_id;
 elsif p_action in ('up','down') and p_id is not null then
  if p_action='up' then
   select * into neighbor from public.set_stages where scene_id=p_scene and sort_order<item.sort_order order by sort_order desc limit 1;
  else
   select * into neighbor from public.set_stages where scene_id=p_scene and sort_order>item.sort_order order by sort_order limit 1;
  end if;
  if neighbor.id is not null then
   update public.set_stages set sort_order=item.sort_order where id=neighbor.id;
   update public.set_stages set sort_order=neighbor.sort_order where id=p_id;
  end if;
  result=p_id;
 else raise exception 'Unknown stage action.';
 end if;
 insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('scene',p_scene,p_actor,'stage_'||p_action,jsonb_build_object('stage_id',result,'name',p_name));
 perform set_config('app.stage_actor','',true);
 return result;
end; $$;
revoke all on function public.manage_set_stage(uuid,uuid,text,uuid,text) from public;
grant execute on function public.manage_set_stage(uuid,uuid,text,uuid,text) to anon,authenticated;

-- Protect structure on all write paths, including older clients.
create function public.tasks_validate_scope() returns trigger language plpgsql security invoker set search_path='' as $$
declare parent public.tasks;
begin
 if new.scene_id is null then raise exception 'Every task must belong to a set.'; end if;
 if tg_op='UPDATE' and (new.scene_id is distinct from old.scene_id or new.project_id is distinct from old.project_id)
 and exists(select 1 from public.tasks where parent_task_id=new.id) then
  raise exception 'Move or detach the subtasks before moving their parent to another set.';
 end if;
 if new.parent_task_id is not null then
  select * into parent from public.tasks where id=new.parent_task_id for update;
  if not found or parent.scene_id<>new.scene_id or parent.project_id<>new.project_id then raise exception 'A subtask must belong to the same set as its parent.'; end if;
  new.stage_id=parent.stage_id;
 end if;
 return new;
end; $$;
create trigger tasks_validate_scope before insert or update of scene_id,project_id,parent_task_id,stage_id on public.tasks for each row execute function public.tasks_validate_scope();
create function public.tasks_sync_stage() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.stage_id is distinct from old.stage_id then
  update public.tasks set stage_id=new.stage_id where parent_task_id=new.id and stage_id is distinct from new.stage_id;
 end if;
 return null;
end; $$;
create trigger tasks_sync_stage after update of stage_id on public.tasks for each row execute function public.tasks_sync_stage();
revoke all on function public.tasks_validate_scope(),public.tasks_sync_stage() from public,anon,authenticated;
-- A parent cannot be moved away from its children, even in concurrent transactions.
alter table public.tasks add constraint tasks_id_set_project_unique unique(id,scene_id,project_id);
alter table public.tasks add constraint tasks_parent_scope_fk foreign key(parent_task_id,scene_id,project_id) references public.tasks(id,scene_id,project_id) deferrable initially immediate;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.set_stages;
 end if;
end $$;
