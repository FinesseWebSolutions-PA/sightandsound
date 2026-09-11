-- Removing an empty set leaves its documents in a normal folder.
alter table public.document_folders drop constraint document_folders_scene_id_fkey;
alter table public.document_folders add constraint document_folders_scene_id_fkey foreign key(scene_id) references public.scenes(id) on delete set null;
