# Unified Gantt release

The production and set timelines now share one Gantt editor. The previous Set dates tab is folded into Gantt; old links fall back to Gantt. Set commitments and explicit set dependencies remain editable in set details.

## Everyday planning

- Expand a set, stage or parent task. Filter by set or department, search task names, or group by department across sets. Matching subtasks retain their context.
- Edit owner, status, start, finish and duration in table cells. Enter or leaving a valid date cell saves it; Escape cancels. Select a task and choose Rename, or press F2 on its name. Double-click a bar to open its details in place.
- Drag an unstarted leaf task to move it; drag either edge to resize it. Alt + left/right on a focused bar moves it one calendar day. Cancelled drags save nothing. Dates of started/completed work and summary tasks are protected in this editor.
- Open Dependencies from a task row or click a connector to review relationships. Add/change/remove all four start/finish relationship types and nonnegative buffers. Links are task-based, so stages can overlap and independent tasks remain independent. Summary tasks cannot be newly linked; use the actual tasks.
- Review affected dates before saving a cascade or dependency change. Protected milestone warnings remain visible. Preview uses a transaction rollback and writes no changes or audit entries.
- Undo/redo the last 30 Gantt changes while the chart remains open. An intervening change to the production prevents undo from overwriting newer work. Reloading or leaving the chart clears the undo history.
- Use Today, Fit, zoom, Fields, the adjustable table divider or full screen. Grouping, filters, columns, expansion and scroll positions are saved per production/set in the current browser.
- Show the current schedule using forecast dates, falling back to task dates. Date-mode and baseline controls have been removed to simplify the chart; previously captured baseline records remain stored.
- Administrators can add stages and tasks in context. Existing task/set editors remain available for full details. Viewers retain read-only access.

## Data and scheduling

The chart reads a project-scoped snapshot. Gantt edits use one checked database transaction rather than the previous multi-request edit path. Semantic revisions cover the project's schedule snapshot, including dependencies, sets and milestones. Commands serialize on the production, lock relevant rows and reject stale revisions. Metadata-only edits avoid CPM recalculation. Schedule-affecting edits recompute forecasts, retain actual dates and pin started/completed work. The existing legacy parent/set rollups now recognize stored task status `done` correctly.

New baseline data has RLS and checked administrator capture; snapshots have no direct update/delete grant. Functions are SECURITY INVOKER. The application's existing selected-person prototype model is retained; this release does not introduce individual Google sign-in or certify production-grade identity enforcement. Existing security-advisor warnings for the older schedule compute/preview SECURITY DEFINER functions remain unchanged. See [Supabase's function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Verification and measured limits

- 67 unit tests pass, including hierarchy retention, independent work, daylight-saving date moves and bounded rendering.
- Isolated PostgreSQL-compatible tests exercise preview rollback, downstream movement, completed-date protection, administrator/closed-production guards, stale edits, undo, cycles, dependency reversal, approval gating, baseline RLS and atomic batch rollback.
- Browser tests use isolated PGlite data behind intercepted requests. They exercise real UI edits, previews, commit/cancel, undo/redo, cancelled drag, saved grouping, failed saves, a colleague's intervening edit, viewer controls and mobile width. No live data is mutated by those tests.
- The large fixture contains 5,000 tasks and 2,001 links. The visible area rendered 23 rows. Two local production-bundle runs reached usable rows in approximately 4.3–5.7 seconds; sampled scrolling p95 frame intervals ranged from 12–32.6 ms. These are local headless-browser measurements with an in-process test database, not a network-controlled or 100-user benchmark. The stress case does not establish all proposed performance targets.
- A preview against the live 111-task Prodigal production succeeded and left the semantic snapshot unchanged. The migrations were applied before publishing the UI.
- Type checking, targeted lint and the production build pass.

Run database tests with:

```sh
node tests/db/gantt-editing.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
```

With a local application server running, run the isolated browser check with:

```sh
GANTT_BASE=http://127.0.0.1:4173 node tests/browser/gantt.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js /absolute/path/to/playwright/index.mjs
```

The fixture uses the local demo's default access code and intercepts all application database writes. Override the local server's demo password accordingly before testing; never aim this write-intercepting fixture at a live production origin.

## Boundaries of this release

This delivers the core unified editor. It does not claim complete Wrike parity. Scheduling remains date-based with calendar-day durations; custom work calendars, hourly planning, effort-based capacity, reusable stage/task blueprints, CSV/PDF export, bulk group dragging and drag-to-connect gestures remain future work. Links are currently created through the dependency editor. The existing CPM convergence limit is retained with an explicit error rather than silently accepting an unconverged schedule. Enterprise rollout still needs individual identity, realistic concurrent-user load tests and agreement with the line producer on calendar and cascade rules.
