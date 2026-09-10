# Attach files in chat, then save them to project docs

## What you'll be able to do

1. In any conversation (production update, work item, or drawing), tap a paperclip to attach files or photos — including straight from a phone camera roll.
2. Attachments appear inside the message: images show as thumbnails you can tap to view full size, other files show as a named file row you can open or download.
3. Anyone with edit rights who can see the message gets a **Save to project docs** action on the attachment.
4. Saving opens a small picker: choose an existing folder for that production, or type a name to create a new one. Confirm, and the file becomes a real project document (revision 1) inside that folder, with the sender credited as the uploader and a note saying it came from the conversation.
5. The Documents page groups documents by folder, with an "Unfiled" group for everything that has no folder yet. Folder editing is available on a document itself, so anything can be moved later.

Viewers can see and open attachments but cannot attach or save. Closed productions stay read-only: no attaching, no saving.

## Behavior details

- Multiple files per message; per-file size limit enforced with a clear message if a file is too big.
- If a file is already saved to docs, the attachment shows "Saved to <folder>" with a link to the document instead of offering to save it again.
- Saving is one shared action, not per-person: once someone saves it, everyone sees it as saved.
- Upload progress and failures are surfaced in the composer; a failed upload never posts a half-broken message.

## Technical outline

Backend (Supabase, additive only — no existing table or column changes):
- New private storage bucket `chat-attachments`, ~25MB per file, plus policies on `storage.objects` allowing read/insert for the app's roles. Files keyed `<project_id>/<thread_id>/<uuid>-<filename>`; the UI reads them via signed URLs.
- New table `comment_attachments`: `id`, `comment_id` (FK comments, cascade), `storage_key`, `file_name`, `mime_type`, `byte_size`, `uploaded_by`, `created_at`, `saved_document_id` (nullable FK documents). Includes the required `GRANT`s, RLS enabled, and open read/write policies matching the current prototype phase.
- New nullable `folder` text column on `documents`, plus an index on `(project_id, folder)`. Distinct existing values become the folder list per production — no separate folders table, so folders stay flat and self-cleaning.

Frontend:
- `src/lib/production-data.ts`: attachment type on comments; `uploadChatAttachment`, `fetchAttachmentUrls`, `saveAttachmentToDocs` (creates `documents` row + `document_versions` rev 1 pointing at the same storage key, sets `saved_document_id`, writes an audit row), `listProjectFolders`, `setDocumentFolder`. Attachments load with the existing comments read.
- `src/lib/store.tsx`: expose the new mutations through the existing snapshot-refresh pattern and the `can` permission map (attach/save gated on `can.upload`, blocked when `isClosed`).
- `src/components/Discussion.tsx`: paperclip + hidden file input in the composer, staged-file chips with remove, upload before the comment insert, and an attachment block inside each message bubble. Tap targets stay 44px+.
- New `src/components/AttachmentList.tsx` (render + save action) and `src/components/SaveToDocsDialog.tsx` (folder combobox with "Create new folder", as a centered dialog on desktop and a bottom sheet on mobile).
- `src/routes/projects.$projectId.documents.tsx`: folder grouping in the document list, folder shown and editable on the selected document.

Existing brand tokens, terminology, permissions, mobile patterns, and sample data stay as they are. No ERP, no AI, no new schedule views.

## Verification

Typecheck, then browser checks at 1280px and 390px: attach an image and a PDF to a work-item conversation, confirm they render and open; save one into a new folder and one into an existing folder; confirm the Documents page shows both under the right folders with revision 1; confirm a viewer and a closed production offer no attach/save controls; check for console errors and horizontal overflow. Test files created during the check get removed afterward.
