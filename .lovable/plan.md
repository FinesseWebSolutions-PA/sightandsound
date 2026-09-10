# Emoji reactions on messages

Add lightweight emoji reactions to every chat message, so people can acknowledge without adding noise.

## What you'll see

- Hovering (or tapping) a message shows a small smiley button.
- Clicking it opens a compact picker with a fixed set: 👍 ❤️ ✅ 🎉 👀 😂 (plus a few, no free-form search).
- Reactions appear as small pills under the message: emoji + count. Your own reaction is highlighted; clicking the pill toggles it off.
- Hovering a pill shows who reacted ("Alex Rivera, Dana Kim").
- Works identically everywhere chat appears: production, set, work item, subtask, and document conversations.
- Read-only cases stay read-only: viewers and closed productions can see reactions but not add them.

## Behavior rules

- One reaction per person per emoji per message; clicking again removes it.
- Reactions do not create notifications or inbox unread counts (kept as quiet acknowledgement).
- Reactions persist across reload and load with the rest of the conversation history.
- Reactions are attributed to the currently selected demo person, same as messages.

## Technical notes

- New table `public.comment_reactions` (id, comment_id → comments on delete cascade, person_id → people, emoji text, created_at) with a unique constraint on (comment_id, person_id, emoji), an index on comment_id, GRANTs for `authenticated`/`service_role`, RLS enabled with prototype-consistent policies.
- Loader: add a `comment_reactions` select to the batch fetch in `src/lib/production-data.ts` (alongside `comment_attachments`), plus `writeCommentReaction` / `removeCommentReaction` helpers.
- Store (`src/lib/store.tsx`): expose `commentReactions` and a `toggleReaction(commentId, emoji)` action gated by the existing posting permission check (viewer / closed-production guard), with optimistic update and refresh on failure.
- UI: new `src/components/chat/MessageReactions.tsx` rendering the pills + picker; used from the `Message` component in `src/components/Discussion.tsx` so every chat surface inherits it automatically.
- Verification: typecheck, then browser check at 1280px and 390px — add a reaction, toggle it off, reload to confirm persistence, and confirm no console errors. Temporary QA rows removed afterwards.
