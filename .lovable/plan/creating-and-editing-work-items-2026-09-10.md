# Creating and editing work items

Today work items only arrive pre-loaded from the database. In the app you can change a status and nudge dates — you cannot add a work item, retitle one, reassign it, move it to a scene, or record what it waits on. This adds that, shaped the way a scene shop actually plans a build rather than as a generic task tracker.

## How production teams think about it

A piece of build work is always "this department, doing this thing, for this scene, so that this build milestone lands on time." So every work item is created from that frame: department, scene, phase (milestone), person, window of dates, and what it can't start until.

## One editor, three doors in

A single side panel handles both new and existing work items, so there is one thing to learn:

- **What / who** — title, short notes, department, scene (optional — some work is production-wide), person assigned (chosen from the people actually staffed to that department on this production).
- **When** — planned start and finish, and the build milestone it belongs to. The panel keeps showing the live forecast dates and slack the schedule already calculates, so planned vs. reality stays visible.
- **Waits on** — add or remove what must happen first, with the relationship (finish-to-start etc.) and any lead/lag, plus the two flags for "slipping this threatens a rehearsal / a performance."
- **Status** — the existing dropdown, unchanged.

Doors in:
1. **Department Work Queue** — "Add work item" creates it already scoped to that department, and each row opens the editor.
2. **Scene Readiness Matrix** — an empty scene/department cell offers "Add work for this scene," pre-scoping scene + department.
3. **Master Timeline / task panel** — the existing panel gains Edit, so the person looking at the bar can fix it there.

## Fast entry for a real planning session

Departments plan a lot of similar work at once, so the Department Work Queue also gets a compact quick-add row: type a title, pick a scene, press Enter, repeat. It inherits the department, the head as default owner, and the last-used milestone, and the full editor is one click away for anything that needs dependencies or exact dates.

## Guardrails kept as they are

- Adding, retitling, reassigning, re-scoping, and dependency changes: admins on open productions.
- Contributors keep what they have now — status, and dates on work assigned to them.
- Viewers and closed productions stay read-only.
- Changing dates still runs the same downstream-impact preview before committing, and every change is written to the change log.
- Deleting is deliberately narrow: a work item can be removed only while nothing depends on it and no conversation or document is attached; otherwise it is marked cancelled.

## Technical notes

No schema changes. `tasks` already has `description`, `scene_id`, `milestone_id`, `department_id`, `owner_id`, `start_date`, `due_date`, `sort_order`, `created_by`; `task_dependencies` already carries `type`, `lag_hours`, `hard_constraint`.

- `src/lib/production-data.ts` — add `writeTask` (insert/update), `removeTask`, `writeTaskDependency`, `removeTaskDependency`, each auditing to `audit_log` and calling the existing `refreshSchedule` so CPM float/criticality stays central.
- `src/lib/store.tsx` — expose permission-guarded actions and refresh the live snapshot after each write.
- New `src/components/WorkItemEditor.tsx` — the side panel used for create and edit; owner options come from the existing `project_assignments` staffing for the chosen department.
- `TaskDetailPanel.tsx`, `DepartmentWorkQueue.tsx`, `SceneReadinessMatrix.tsx`, `MasterTimeline.tsx` / timeline route — entry points and quick-add.
- Cancelled state maps onto the existing status values rather than adding one.
- Mobile: full-width sheet, 44px controls, native date inputs.
