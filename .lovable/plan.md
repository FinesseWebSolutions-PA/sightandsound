# Making the Gantt chart the real planning tool

The chart today shows one bar per work item, grouped under milestones, across the whole production at a fixed scale. It reads as a picture. The goal is a chart people actually work in: spot slippage, reschedule with confidence, coordinate departments, and present it in a leadership meeting without cleanup.

## Two levels: global and per set

A view control at the top switches between:

- **Global** — the whole production. Rows are milestone bands (as today) with work items nested beneath, so leadership sees the arc of the build.
- **Per set** — pick a set/scene, and the chart shows only that set's work, banded by department. This is how the build is actually run: one set at a time, across Art, Shop, Lighting, and the rest. Sets come from the scenes already in the production; a set with no work shows an empty band rather than disappearing.

Both levels use the same bars, the same computed float and criticality, and the same detail card. Switching sets keeps your zoom and scroll position.

## Zoom and time

Three zoom levels — week, month, whole production — plus a "Today" button that scrolls the view back to now. Trackpad pinch and scroll-wheel zoom work over the chart, anchored on the date under the cursor. Month headers stay pinned above the bars while you scroll sideways.

## Reading slippage at a glance

- Each work item shows the **committed plan as a faint ghost bar** behind the live bar. When the live bar sits to the right of the ghost, that item has slipped, and by how much is visible without opening anything.
- Bars stay colored by criticality (critical / tight / slack) as they are now, always with a text label, never color alone.
- A late or blocked item carries its status edge, so "slipping" and "why" arrive together.

## Dependencies

Arrows connect linked work items, drawn from the correct edge for the relationship (finish-to-start, start-to-start, finish-to-finish, start-to-finish) and labeled with the relationship and any lag. Hovering a bar dims everything unrelated and lights up that item's chain, upstream and downstream — the fastest way to answer "what is this waiting on, and what waits on it."

## Detail on demand

Clicking a bar opens a compact card anchored to it: title, department, owner, committed vs. current dates, float, what it is blocked by, and a link into the full work item. Nothing on the bar itself needs to carry that text, so the chart stays clean enough to present.

## Reschedule with impact preview

Dragging a bar (or its edge, to resize) previews the move before it commits: the shifted downstream work is outlined in place, and if the move pushes anything flagged as affecting a rehearsal or performance past that date, a clear warning names the item and the date. Confirm to save, cancel to snap back. Dragging is available to admins on open productions only; everyone else sees the same chart, read-only, with the existing lock note.

## Presenting

A "clean view" toggle hides the legend chrome and locks editing for the duration of a meeting, leaving bars, milestones, arrows, and dates. No separate export.

## Technical notes

- All float, criticality, and downstream-shift numbers keep coming from the existing Postgres scheduling functions (`cpm_task_schedule`, `compute_project_schedule`, `preview_task_reschedule`) — no client-side duplication of the critical path, so every view agrees.
- `MasterTimeline.tsx` splits into a shared time-axis/zoom layer, a row-grouping layer (milestone bands vs. department bands within a set), a dependency-arrow overlay drawn in SVG over the bar area, and the detail popover. Grouping mode and set selection are local component state.
- Zoom and pan use a non-passive native wheel listener with delta-normalized exponential scaling anchored at the cursor date; pinch (`ctrlKey` wheel) is handled by the same path.
- Drag-to-reschedule calls `preview_task_reschedule` on drop and only writes task dates after confirmation, with the existing audit logging and CPM refresh.
- Mobile keeps the existing card list rather than a drag surface; the set switcher and zoom controls stay usable at phone widths.

Out of scope here: capacity/heat-map views, load-in Gantt, and role-based presets stay listed as "Coming soon".
