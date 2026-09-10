# Real version uploads + emoji reactions

Two changes: make "Upload new version" actually pick a real file, and add emoji reactions to chat messages.

## 1. Upload new version opens the file picker

Today the version action only asks for a note and records a placeholder file — no real file is stored, so the new version can't be opened or previewed.

New behavior:
- Choosing "Upload new version" from a document's ellipsis menu opens your computer's file browser right away.
- After picking a file, a short confirm step shows the file name and an optional "what changed" note (mentions still work), then Upload version.
- The new version is stored for real, becomes the current version, and is viewable/downloadable in the preview and in version history.
- The document returns to draft so it can be reviewed again, and the note is still posted into the document's conversation.
- Viewers and closed productions still can't upload.

## 2. Emoji reactions on messages

- Hovering (or tapping) a message shows a small smiley button; it opens a compact picker with a fixed set (👍 ❤️ ✅ 🎉 👀 😂).
- Reactions show as small pills under the message with a count; your own is highlighted and clicking it removes it.
- Hovering a pill shows who reacted.
- Same behavior in every conversation: production, set, work item, subtask, and document.
- Reactions don't create notifications or unread counts, and they persist across reload.
- Viewers and closed productions can see reactions but not add them.

## Technical notes

Version upload:
- Add `writeDocumentVersionFile` in `src/lib/production-data.ts`: upload the picked file through the existing attachment/storage helper, insert a `document_versions` row with the real `storage_key`, set the document back to `draft`, and audit it.
- Replace the store's `addDocumentVersion(documentId, note)` with an async `addDocumentVersion(documentId, file, note)` guarded by the existing contribute permission check, then refresh.
- In `src/components/DocumentBrowser.tsx`, the version menu action triggers a hidden `<input type="file">` (single file) and only renders the note + confirm step once a file is chosen; keep an in-flight guard against double submits.

Emoji reactions:
- New table `public.comment_reactions` (id, comment_id → comments on delete cascade, person_id → people, emoji, created_at) with unique (comment_id, person_id, emoji), an index on comment_id, GRANTs for `authenticated`/`service_role`, RLS enabled with prototype-consistent policies.
- Load reactions in the batch fetch in `production-data.ts` alongside `comment_attachments`; add write/remove helpers.
- Store exposes `commentReactions` and `toggleReaction(commentId, emoji)` behind the existing posting guard, optimistic with refresh on failure.
- New `src/components/chat/MessageReactions.tsx` used from the `Message` component in `src/components/Discussion.tsx`, so all chat surfaces inherit it.

## 3. Keep Gantt dependency arrows inside the chart

The dependency arrow SVG currently draws lines between any two bars whose DOM rectangles are found. That lets lines run outside the visible scroll/port area or produce "stray" connector strokes when bars are off-screen, collapsed, or only partially visible.

Fix:
- Skip drawing an arrow when either the source or target bar's full rectangle lies outside the visible scroll viewport (use the container's `getBoundingClientRect()` and the bar rect to cull).
- Clip the SVG to the scrollable area or hide arrows whose coordinates fall outside the current chart bounds.
- Keep the existing chain-highlight behavior.

Verification: typecheck, then browser checks at 1280px and 390px — confirm dependency arrows never float outside the Gantt area, collapsed sets don't show broken arrows, upload a real version and open it, add/remove a reaction and reload for persistence, and remove temporary QA rows/files.
