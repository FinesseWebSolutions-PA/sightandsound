# Sets become the spine of the production

Right now the schedule is a list of work items grouped by milestone, and the documents page only knows about typed-in folder names. This change makes the set the thing you plan and file against.

## 1. The schedule is grouped by set

- The timeline shows one band per set, in running order. Each band has its own bar: the set's committed dates behind, its current estimate in front, plus its status colour.
- Inside a band sit that set's work items (and their sub-items), as today.
- Milestone grouping goes away. Milestone markers stay on the date line so you still see Design Freeze, load-in and opening night.
- Arrows between sets show the chain ("this set follows that one"), alongside the existing arrows between work items. Hovering a set highlights the sets and work downstream of it.
- Dragging still works exactly as now, with the same "Move it?" preview before anything commits.
- Set Readiness and Department Work Queue stay as they are.

## 2. Every work item belongs to a set

- The work item form requires a set; you can create a new set right there, as today.
- Existing work items with no set: four productions have three such items between them. Two are on productions with no sets at all, so those productions get a first set created from the production's name and the items filed into it; the other production's items go into its nearest-dated set. This is a one-time tidy-up, listed for you before it runs.
- After this, "not tied to a set" is no longer a state the app can get into.

## 3. Every set is a folder on the Documents page

- The production Documents page lists one folder per set, always — even before anything is filed there. Set folders come first, then any other folders people made.
- A document tied to a set shows in that set's folder automatically. Rename the set and the folder name follows.
- Inside a set folder you can make your own sub-folders (Drawings, Approvals, Photos…) and file documents into them.
- Uploading or saving a document while inside a set folder ties it to that set, so it stays findable from the set too.
- Documents not tied to any set keep working the way they do now.

## 4. Each set gets its own timeline and documents

On the Sets tab, a set now shows three sections under its details:

- **Schedule** — the same chart, narrowed to that set's work items, with the same add/drag behaviour.
- **Documents** — the exact same Drive-style browser as the production page, showing that set's folder contents.
- **Conversation** — as built today.

## Technical notes

- `MasterTimeline.tsx`: replace milestone grouping with set bands built from `scenes` (order, status, committed and forecast dates); add set-level bars, set-chain arrows via `depends_on_scene_id`, and chain highlighting across sets. Drop the `global`/`set` mode toggle in favour of set bands plus the existing scene focus selector, and accept an optional `sceneId` prop so the Sets tab can render a single-set chart from the same component. Float, criticality and forecast dates keep coming from the central Postgres functions — no per-view maths.
- Extract the Drive-style browser from `projects.$projectId.documents.tsx` into `src/components/DocumentBrowser.tsx`, with props for project, optional pinned set, and folder scope. Both the production Documents tab and the Sets tab render it.
- Folder model: set folders are derived from `scenes` and backed by `documents.scene_id`; sub-folders reuse the existing free-text `documents.folder` column, scoped by `scene_id`. Filing into a set folder writes `scene_id`; filing into a sub-folder writes `folder`. No schema change needed beyond making `tasks.scene_id` required.
- Migration: backfill `tasks.scene_id` (creating a first set where a production has none), then `ALTER TABLE public.tasks ALTER COLUMN scene_id SET NOT NULL`. `WorkItemEditor` validates the set client-side too.
- Verification: typecheck, then browser checks on The Prodigal's Return and one thin production at 1280px and 390px — set bands and chain arrows, drag preview, required-set validation, set folders appearing empty, sub-folder creation, upload inside a set folder landing in both places, and the per-set schedule/documents sections.
