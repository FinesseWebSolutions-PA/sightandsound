-- Run against an isolated database with all collaboration migrations applied.
-- All fixtures are rolled back. No storage files are created.
begin;
do $$
declare p uuid=gen_random_uuid(); a uuid=gen_random_uuid(); r uuid=gen_random_uuid(); f uuid; child uuid; d uuid; v uuid; v2 uuid; t uuid; c uuid; c2 uuid; att uuid; filed uuid; again uuid;
begin
 insert into public.projects(id,name,slug,venue,status) values(p,'Collaboration regression','collaboration-regression-'||p,'Test','active');
 insert into public.people(id,full_name,role) values(a,'Regression author','admin'),(r,'Regression reviewer','contributor');
 insert into public.document_folders(project_id,name) values(p,'Design') returning id into f;
 insert into public.document_folders(project_id,parent_id,name) values(p,f,'Plans') returning id into child;
 begin
  update public.document_folders set parent_id=child where id=f;
  raise exception 'FAIL: folder cycle accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 insert into public.documents(project_id,folder_id,title,created_by) values(p,child,'Regression.pdf',a) returning id into d;
 insert into public.document_versions(document_id,version_number) values(d,1) returning id into v;
 perform public.review_document(d,v,'requested','Please review',a,r);
 begin
  perform public.review_document(d,v,'approved','',a);
  raise exception 'FAIL: wrong reviewer accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin
  perform public.review_document(d,v,'changes_requested','',r);
  raise exception 'FAIL: missing explanation accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 perform public.review_document(d,v,'approved','',r);
 assert (select status='approved' from public.documents where id=d),'Approval not saved';
 -- A leftover historical request must not reopen a completed review.
 insert into public.approvals(document_version_id,requested_by,status,requested_at) values(v,a,'pending',now()-interval '1 day');
 begin
  perform public.review_document(d,v,'approved','',r);
  raise exception 'FAIL: historical pending request reopened';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 perform public.review_document(d,v,'requested','Second review',a,r);
 perform public.review_document(d,v,'approved','',r);
 insert into public.document_versions(document_id,version_number) values(d,1) returning id into v2;
 assert (select version_number=2 from public.document_versions where id=v2),'Version number not serialized';
 begin
  perform public.review_document(d,v,'approved','',r);
  raise exception 'FAIL: stale version accepted';
 exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
 assert (select status='draft' from public.documents where id=d),'New version kept old approval';
 perform public.library_folder_action(f,'trash',a);
 assert (select deleted_at is not null from public.documents where id=d),'Folder trash missed file';
 perform public.library_folder_action(f,'restore',a);
 assert (select deleted_at is null from public.documents where id=d),'Folder restore missed file';
 insert into public.discussion_threads(project_id,context_type,created_by) values(p,'project',a) returning id into t;
 insert into public.comments(thread_id,author_id,body) values(t,a,'Hello 🎉') returning id into c;
 insert into public.comments(thread_id,author_id,body,reply_to_id) values(t,r,'Reply 👍',c) returning id into c2;
 assert (select reply_to_id=c from public.comments where id=c2),'Reply link missing';
 insert into public.comment_attachments(comment_id,storage_key,file_name) values(c,'regression/not-a-real-file.pdf','Regression.pdf') returning id into att;
 filed=public.file_conversation_attachment(att,child,'Regression.pdf',a);
 again=public.file_conversation_attachment(att,child,'Regression.pdf',a);
 assert filed=again,'Attachment filing duplicated the document';
 assert (select count(*)=1 from public.document_versions where document_id=filed),'Attachment filing duplicated the version';
end $$;
select 'collaboration regression passed' as result;
rollback;
