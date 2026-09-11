-- Preserve historical requests while treating the most recent review as authoritative.
create or replace function public.review_document(p_document uuid,p_version uuid,p_decision text,p_note text,p_actor uuid,p_reviewer uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare d public.documents; v public.document_versions; a public.approvals; result_id uuid; target uuid; begin
 select * into d from public.documents where id=p_document and deleted_at is null for update;
 if not found then raise exception 'Document unavailable.'; end if;
 if not exists(select 1 from public.people where id=p_actor and role in ('admin','contributor') and deactivated_at is null) or exists(select 1 from public.projects where id=d.project_id and status='closed') then raise exception 'This review is read-only.'; end if;
 select * into v from public.document_versions where document_id=d.id order by version_number desc limit 1;
 if v.id is distinct from p_version then raise exception 'A newer version is available. Open it before reviewing.'; end if;
 if p_decision not in ('requested','approved','changes_requested') then raise exception 'Invalid review decision.'; end if;
 select * into a from public.approvals where document_version_id=v.id order by coalesce(decided_at,requested_at) desc,requested_at desc,id desc limit 1 for update;
 -- Older data can contain duplicate pending requests. Only the newest review counts.
 if a.status is distinct from 'pending' then a.id=null; end if;
 if p_decision='requested' then
  if a.id is not null then raise exception 'This version is already awaiting review.'; end if;
  if not exists(select 1 from public.people where id=p_reviewer and role in ('admin','contributor') and deactivated_at is null) then raise exception 'Choose a reviewer who can approve documents.'; end if;
  insert into public.approvals(document_version_id,requested_by,reviewer_id,status,decision_note,requested_at) values(v.id,p_actor,p_reviewer,'pending',nullif(btrim(p_note),''),clock_timestamp()) returning id into result_id;
  target=p_reviewer;
 else
  if a.id is null then raise exception 'This version has no pending review.'; end if;
  if a.reviewer_id is not null and a.reviewer_id<>p_actor then raise exception 'Only the assigned reviewer can make this decision.'; end if;
  if p_decision='changes_requested' and nullif(btrim(p_note),'') is null then raise exception 'Explain what needs to change.'; end if;
  update public.approvals set status=p_decision,decided_by=p_actor,decided_at=clock_timestamp(),decision_note=nullif(btrim(p_note),'') where id=a.id returning id into result_id;
  target=a.requested_by;
 end if;
 update public.documents set requires_approval=true,status=case p_decision when 'requested' then 'in_review' when 'changes_requested' then 'draft' else 'approved' end where id=d.id;
 if target is not null and target<>p_actor then
  insert into public.notifications(person_id,type,project_id,source_entity_type,source_entity_id) values(target,case when p_decision='requested' then 'review_requested' else 'approval_'||p_decision end,d.project_id,'document',d.id);
 end if;
 insert into public.audit_log(entity_type,entity_id,actor_id,action,changes) values('document',d.id,p_actor,'approval_'||p_decision,jsonb_build_object('version',v.version_number,'note',p_note,'reviewer_id',p_reviewer));
 return result_id;
end $$;

