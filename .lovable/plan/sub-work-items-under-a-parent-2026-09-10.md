# Sub-work items under a parent

Today every work item is flat: "Fabricate rotating platform base" is one row, even though it's really five days of cutting, welding, and fitting. This adds real parent/child structure so a lead can break a piece of build work into its actual steps from the work item itself.

## Adding them where you already are

- On a work item's detail panel, a **Sub-items** section lists what's under it, with a quick-add row: type a title, press Enter, repeat. Each new sub-item inherits the parent's department, scene, milestone, and default owner.
- Each sub-item opens the same full editor as any other work item — dates, dependencies, person, scene, rehearsal/performance flags. Nothing is a second-class checklist entry.
- The editor gains a "Part of" field, so an existing work item can be moved under a parent (or pulled back out) without recreating it.

## How a parent behaves

A work item with children becomes a summary of them:

- Its start is the earliest child start, its finish the latest child finish. Those dates are shown as read-only with a short note explaining they follow the sub-items — you change the children, and the parent moves.
- Its status is derived: all children complete reads complete, any blocked child reads blocked, any started child reads in progress, otherwise not started.
- Its slack and criticality come from the tightest child, using the same central calculation everything else reads, so no view disagrees.
- A work item with no children keeps its own dates and status exactly as today.

## How they show up

- **Master Timeline** — a parent row gets an expand arrow with a child count. Collapsed, it shows one summary bar spanning its children. Expanded, each child is its own indented bar with its own criticality colour and dependency labels.
- **Department Work Queue** — children appear indented under their parent; a child assigned to a different department also shows in that department's queue with a "part of ..." line, so nothing hides.
- **Scene Readiness Matrix** — a readiness cell keeps pointing at the real blocking item, which may now be a sub-item rather than its parent.
- **My Work, Search, conversations** — a sub-item is an ordinary work item: it has its own conversation, its own attachments, and its own deep link.

## Rules kept as they are

- Creating, re-parenting, and deleting: admins on open productions. Contributors update status and dates on work assigned to them. Viewers and closed productions read-only.
- Date changes still run the downstream-impact preview before committing, and every change is written to the change log.
- Nesting is one level deep — a sub-item can't have its own sub-items. Build steps don't need more, and deeper trees make the timeline unreadable.
- A parent can't be deleted while it has children; you remove or detach them first.

## Technical notes

- Migration: add nullable `tasks.parent_task_id` referencing `tasks(id)`, an index on it, and a trigger rejecting a parent that itself has a parent (enforces single-level nesting) plus self-reference. No existing column changes.
- Rollup: extend the existing central schedule function so a parent's forecast/planned span and float derive from its children, keeping the single source of truth. Derive parent status with a trigger in the same style as the milestone-status trigger already in place.
- `src/lib/production-data.ts` — read `parent_task_id`, expose it on the `Task` type, and add re-parenting to `writeTask`.
- `src/lib/store.tsx` — permission-guarded child create/detach actions plus snapshot refresh.
- `src/components/TaskDetailPanel.tsx` — Sub-items list and quick-add row.
- `src/components/WorkItemEditor.tsx` — "Part of" selector; hide direct date editing when the item has children.
- `src/components/schedule/MasterTimeline.tsx`, `DepartmentWorkQueue.tsx`, `SceneReadinessMatrix.tsx` — nesting, expand/collapse, indented rows.
- Mobile: sub-items collapse by default, 44px controls, full-width sheet for the editor.
