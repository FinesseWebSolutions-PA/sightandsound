# Set conversations that work like the production ones

Right now a set's page shows a single plain chat box, while the production Updates page has a proper conversation list with sections. And on the production page, anything said about a set lands in the generic "Production-wide" pile, so you can't see the build set by set.

## What changes

### 1. A set's conversation area becomes a real conversation space

The set workspace gets the same layout as the production Updates page:

- A list of that set's conversations on the left, the chosen one open on the right.
- A "New conversation" button so a set can carry several named topics ("Rigging clearance", "Paint finish sign-off") instead of one endless thread.
- Sections in that list: the set's own topics, conversations on that set's work items, and conversations on that set's documents — so everything about the set is in one place.
- Same message experience as everywhere else: mentions, file attachments, save-to-documents, Files tab, read-only when the role is Viewer or the production is closed.

### 2. The production Updates page becomes set by set

The conversation list is regrouped so sets are the organizing sections:

```text
Production-wide
  Weekly build review
  Opening night readiness

Act I, Scene 1
  Rigging clearance            (about the set)
  Build platform frame         (work item)
  Platform — Structural Detail (document)

Act I, Scene 2
  ...

Not tied to a set
  ...
```

Each set section shows its conversation count, collapses so a long production stays scannable, and links through to the set itself. Conversations on a work item or document are filed under the set that work item or document belongs to — that's the granular part, while nothing disappears from the page.

### 3. Labels stop saying the wrong thing

A conversation about a set currently reads "Whole production." It will read the set's name, and work-item / document conversations will show their set alongside the item they're about.

## Notes on the build

- No schema change. `discussion_threads` already carries `context_type = 'scene'` plus `scene_id`; set membership for work-item and document conversations is derived from `tasks.scene_id` / `documents.scene_id`, which are already populated.
- `Discussion.tsx` gains a rail-style mode (list + open conversation) that the set page uses, reusing the existing `ConversationView`, `NewProjectConversation`, `ChatPanel` and composer pieces so all chat still looks and behaves identically.
- The grouping logic used by both pages moves into `src/lib/threads.ts` so the set page and the Updates page can never disagree.
- Deep links from Inbox, My Work, notifications and Search keep opening the exact message: the grouping only changes which section a conversation sits in, not its identity.
- Verify at desktop and phone widths: sections render, a new set conversation persists across reload, a work-item conversation appears under the right set, deep links still land on the right message, no overflow, no console errors.
