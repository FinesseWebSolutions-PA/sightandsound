# Make sets the real unit of work

Today a "set" is only a label you can attach to a work item. This makes each set a
real unit inside a production: its own dates, its own team, its own documents and
conversation, and its own place in the linear chain of sets.

## 1. Sets become first-class

Each set gains: an owner (the person accountable for it), a status, committed start
and finish dates, a live forecast, and a position in the production order.

- New "Sets" tab in a production, listing every set with owner, dates, status, and
  how many work items are open, late, or blocked.
- Clicking a set opens a set workspace: its work items (grouped by department), its
  documents, and one conversation for that set.
- Work items still live on the production timeline, so nothing is hidden — a set is a
  lens over the same schedule, not a separate silo.
- Creating a work item from inside a set pre-fills the set, and the timeline's
  "One set" view stays as the Gantt for a single set.

## 2. Staffing per set, not per production

Assignments get an optional set. That gives two levels:

- Production level (no set chosen) = the default team for the whole show.
- Set level = "on this set, Engineering is Jamie, Lighting is Casey."

In the set workspace, each department shows one named designer as the responsible
person plus the department head, who is looped in automatically. Where a set has no
one named for a department, it falls back to the production default and shows that
it is inherited rather than chosen.

Department mentions in a set conversation notify the named designer for that set and
the department head — not the whole roster.

## 3. Set-to-set chaining

Sets can depend on other sets, matching the linear build order.

- On a set, pick which set must finish before it starts, with optional lead/lag.
- The schedule engine treats that as a floor on every work item in the later set, so
  if set 3 slips, sets 4, 5 and 6 move with it — same central calculation, same
  float and critical-path numbers everywhere.
- Dragging a bar or changing a set's dates still shows the full knock-on effect
  (which sets and milestones move, and whether a rehearsal or opening date is
  threatened) before you commit.
- The Sets tab shows the chain in order with each set's slip against its committed
  dates.

## Naming

The word "set" replaces "scene" everywhere in the interface. The Scene Readiness
grid becomes Set Readiness (sets down the side, departments across the top).

## Technical notes

Database (additive, no data loss):
- `scenes` gains `owner_id`, `status`, `start_date`, `due_date`, `forecast_start`,
  `forecast_finish`, `depends_on_scene_id`, `lag_days`, plus a guard against a set
  depending on itself or forming a cycle.
- `project_assignments` gains nullable `scene_id`; uniqueness moves to
  (project, set, department, person, job title) so both levels can coexist.
- `discussion_threads.context_type` accepts `'scene'` with a new nullable `scene_id`,
  reusing the existing unified thread model.
- `cpm_task_schedule` gains a pass that applies set-chain constraints as an earliest
  start floor per set before the forward pass, and a `recompute_scene_rollup`
  trigger that rolls child work items up into each set's status and forecast dates —
  mirroring the existing milestone and parent-task rollups. All float, criticality
  and critical-path values stay database-owned.
- Every new table/column keeps grants and the existing prototype RLS approach.

Frontend:
- `production-data.ts`: extend `Scene`, load set assignments and dependencies, add
  set write helpers.
- `store.tsx`: set CRUD, set dependency and set-staffing mutations, admin-only on
  open productions; viewers and closed productions stay read-only.
- New `routes/projects.$projectId.sets.tsx` (list) and `...sets.$sceneId.tsx`
  (workspace); update `MasterTimeline`, `SceneReadinessMatrix`,
  `DepartmentWorkQueue`, `WorkItemEditor`, `TaskDetailPanel`, and the Team tab.

Items 4-7 from the review (outsourced-set state, estimate approval flow, trimming to
two or three departments for the demo, department overlap on the Gantt) come after
this and get much simpler once sets are real.
