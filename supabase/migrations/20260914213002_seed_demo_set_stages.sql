-- User-requested demo seed, scoped to known sample shows and exact template signatures.
-- Names before Metal are provisional demo labels; the four shop stages are from the meeting outline.
select pg_advisory_xact_lock(hashtext('sightandsound:demo:set-stages:v1'));
do $$
declare
 s record; spec record; task_row record; a uuid; st uuid; mapped uuid; seed_id uuid;
 draft_names text[] := array['Art & design','Engineering & drafting','Metal','Foam / plywood','Paint','Décor'];
 original_tasks jsonb; after_tasks jsonb; original_ids uuid[]; inserted integer:=0; assigned integer:=0;
 shop public.tasks; paint public.tasks; dt_start date; dt_finish date; demo_status text;
begin
 select id into a from public.people where full_name='Alex Rivera' and role='admin' and deactivated_at is null;
 if a is null then raise exception 'Expected demo administrator is unavailable.'; end if;
 select array_agg(id),jsonb_agg(to_jsonb(t)-'stage_id'-'updated_at' order by id) into original_ids,original_tasks from public.tasks t;
 for s in
  select sc.* from public.scenes sc join public.projects p on p.id=sc.project_id
  where p.status<>'closed' and p.name in ('The Prodigal''s Return','Daniel','Kings & Kingdoms','Ruth: A Harvest Story')
  and exists(select 1 from public.tasks t where t.scene_id=sc.id and t.title='Concept sketches and design intent' and t.description='Concept sketches and design intent for '||sc.name||'.')
  order by sc.project_id,sc.sort_order
 loop
  -- Lock the set, as ordinary stage edits do, and reuse stages by name on reruns.
  perform 1 from public.scenes where id=s.id for update;
  for spec in select name,ordinality from unnest(draft_names) with ordinality as v(name,ordinality) loop
   select id into st from public.set_stages where scene_id=s.id and lower(btrim(name))=lower(spec.name);
   if st is null then perform public.manage_set_stage(s.id,a,spec.name); end if;
  end loop;
  for task_row in select x.* from public.tasks x where x.scene_id=s.id and x.parent_task_id is null and x.stage_id is null loop
   mapped:=null;
   select ss.id into mapped from public.set_stages ss where ss.scene_id=s.id and ss.name=case
    when task_row.title in ('Concept sketches and design intent','Set drawings and elevations') then draft_names[1]
    when task_row.title in ('Structural engineering package','Automation and rigging review','Practical lighting layout and circuits','Effects and control programming') then draft_names[2]
    when task_row.title='Shop build — framing and decking' then 'Metal'
    when task_row.title='Scenic paint and finish treatment' then 'Paint'
   end and task_row.description=task_row.title||' for '||s.name||'.';
   if mapped is not null then
    update public.tasks set stage_id=mapped where id=task_row.id and stage_id is null;
    insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('task',task_row.id,a,'demo_stage_assigned',jsonb_build_object('seed','set-stages-v1','stage_id',mapped));
    assigned:=assigned+1;
   end if;
  end loop;
  select * into shop from public.tasks where scene_id=s.id and title='Shop build — framing and decking' order by id limit 1;
  select * into paint from public.tasks where scene_id=s.id and title='Scenic paint and finish treatment' order by id limit 1;
  for spec in select * from (values
   ('Foam / plywood','Foam carving and plywood skins',1),
   ('Décor','Scenic décor and final dressing',2)
  ) as v(stage_name,title,kind) loop
   if not exists(select 1 from public.tasks where scene_id=s.id and description like '[Demo seed: set-stages-v1] '||spec.title||'%') then
    select id into st from public.set_stages where scene_id=s.id and name=spec.stage_name;
    if spec.kind=1 then dt_start:=coalesce(shop.start_date,s.start_date)+5;dt_finish:=coalesce(shop.due_date,s.due_date)+2;
    else dt_start:=coalesce(paint.start_date,s.start_date)+4;dt_finish:=coalesce(paint.due_date,s.due_date)+3; end if;
    dt_finish:=greatest(dt_start,dt_finish);
    demo_status:=case when dt_finish<current_date then 'done' when dt_start<=current_date then 'in_progress' else 'not_started' end;
    insert into public.tasks(project_id,scene_id,stage_id,title,description,department_id,owner_id,start_date,due_date,forecast_start,forecast_finish,status,actual_start,actual_finish,sort_order,created_by)
    values(s.project_id,s.id,st,spec.title,'[Demo seed: set-stages-v1] '||spec.title||' for '||s.name||'. Illustrative shop work; dates overlap adjacent stages and do not establish a mandatory stage sequence.',
     case when spec.kind=1 then shop.department_id else paint.department_id end,
     case when spec.kind=1 then shop.owner_id else paint.owner_id end,
     dt_start,dt_finish,dt_start,dt_finish,demo_status,
     case when demo_status in ('in_progress','done') then dt_start else null end,
     case when demo_status='done' then dt_finish else null end,
     (select coalesce(max(sort_order),0)+1 from public.tasks where project_id=s.project_id),a)
    returning id into seed_id;
    insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('task',seed_id,a,'demo_task_seeded',jsonb_build_object('seed','set-stages-v1','stage_id',st));
    inserted:=inserted+1;
   end if;
  end loop;
 end loop;
 select jsonb_agg(to_jsonb(t)-'stage_id'-'updated_at' order by id) into after_tasks from public.tasks t where id=any(original_ids);
 if original_tasks is distinct from after_tasks then raise exception 'Seed changed an existing task beyond its stage; rolling back.'; end if;
 if exists(select 1 from public.tasks c join public.tasks p on p.id=c.parent_task_id where c.scene_id<>p.scene_id or c.stage_id is distinct from p.stage_id) then raise exception 'Parent stage consistency check failed.'; end if;
end $$;
select count(*) as total_tasks,count(*) filter(where stage_id is not null) as staged_tasks,count(*) filter(where stage_id is null) as independent_tasks,(select count(*) from public.set_stages) as stages from public.tasks;
