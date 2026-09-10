# Gantt view and calendar view, both drillable

Today the Schedule area has one chart (the set-by-set bar chart), plus the department queue, set readiness, and a work list. There is no calendar. This adds a proper two-way switch — **Gantt** and **Calendar** — and makes both drill down cleanly into the thing you clicked.

## What changes

### 1. Named views
The schedule tabs become: **Gantt**, **Calendar**, Department Work Queue, Set Readiness, Work & conversations. The current chart is simply renamed Gantt (no behavior lost — zoom, endless scroll, dragging, dependency lines all stay).

### 2. New Calendar view
A month grid of the production with:
- Month header with previous / next / Today, and a Month / Week switch.
- Each day cell shows what happens that day: a set starting, a set finishing, and work items due. Set events read as bars spanning their days across the weeks; work items read as small entries inside the day.
- Colour and a text label carry status (on track, blocked, late, complete) — never colour alone.
- A "show" filter: sets only, work items only, or both; plus a department filter for work items.
- Overflow days collapse to "+3 more", which opens that day's full list.

### 3. Drill-in from both views
Consistent behavior in Gantt and Calendar:
- Clicking a **set** (bar or calendar entry) opens the shared set popup — overview, lead, status, committed dates, current estimate, what it follows — with a link through to the full set workspace and its Schedule / Documents / Conversation / Team tabs.
- Clicking a **work item** opens the work-item panel — description, owner, dates, status, what it waits on, documents, and conversation.
- Both keep you where you were; closing returns to the same month or scroll position.

### 4. Inside a set
The set workspace's Schedule tab gets the same Gantt / Calendar switch, scoped to that set's work items, so a designer can see their own set as a month at a glance.

## Technical notes

- New `src/components/schedule/ProductionCalendar.tsx`, built on the existing date helpers in `src/lib/schedule.ts` (UTC-noon math, no new date library) and reading sets/tasks from the store, so its dates and statuses match the Gantt exactly.
- Reuses `SetDialog` and `TaskDetailPanel` for drill-in rather than new detail UI.
- View selection stays in the existing `view` search param so calendar links are shareable; the calendar's month is also kept in the URL.
- `MasterTimeline` is only renamed in labels and given an optional calendar sibling; its drag, cascade, and CPM reads are untouched.
- No schema changes.
