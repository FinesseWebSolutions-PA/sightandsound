# Roadmap — Sight & Sound Production Portfolio (leadership demo)

## Done
- Design system: warm palette, Inter / Cormorant Garamond / IBM Plex Mono, status tokens
- Stand-in data module shaped like the seeded tables
- Role switcher (Admin / Contributor / Viewer)
- Production Portfolio list with filters
- Project workspace: Dashboard, Timeline, Documents, Discussions, Team & Departments
- Portal (set simulation) link field
- Document approval flow (request review / approve / reject / request changes)
- Threaded discussions at project / task / document level with @mentions of people and departments
- Live Supabase data layer: all screens read the existing tables; comments, task status, milestone dates, Portal link, document versions and approval decisions write back
  - Task statuses map to the table's values (in review is not stored separately; complete is stored as done)
  - Document "changes requested" is carried on the approval record, since the documents table has no such state
  - Thread subjects come from the opening message, as discussion_threads has no subject column
  - Replies post into the thread (comments has no parent column)

## Open
- None.

## QA pass (browser-driven)
- Portfolio filters (status / department) verified against live data.
- Document review verified end to end: Rev B approved and the status updated on screen without a reload.
- Discussions verified at production, work-item and document level, with mentions creating notices.
- Fixed: one discussion per work item / document (matches the database rule), all seven departments on the Team tab, editable Portal link there, closed productions fully read-only with an archive banner, work items with no milestone now listed, and failed saves now show a message instead of silently sticking.

## Mobile pass (tested at 375px and 430px)
- Header: brand + bell + hamburger menu (portfolio link + role switcher inside).
- Portfolio: scrollable status chips, collapsible department filter, stacked cards.
- Workspace: scrollable tabs, two-column meta, tappable Portal link.
- Dashboard: single-column summary, stacked open-work list.
- Timeline: stacked milestone/task cards with "Waits on:" / "Blocks:" text (no Gantt).
- Documents: tappable document list, full-width review actions.
- Discussions: stacked mention pickers, composer scrolls into view on focus, full-width Post.
- Team: stacked Portal form, wrapped department cards, mobile access list.
- Verified: no page horizontal scroll, no console errors, all primary controls >= 44px.
- Note: single-location build — location/venue is never displayed in the UI (schema field retained).

## Contextual discussions, Inbox, premium mentions (done)
- [x] Inline task conversations on Timeline (counts, latest snippet, expand in place, deep links)
- [x] Document-attached conversation with counts and inline thread
- [x] Dashboard recent activity includes real comments with author/context/snippet + deep links
- [x] Personal cross-production Inbox at /inbox (mentions, dept mentions, assigned tasks, approvals) with read state
- [x] Live @mention picker with keyboard nav, people vs departments, styled mention pills
- [x] Verified at 375 / 430 / 1280px: no page overflow, no console errors; QA test rows cleaned up

## Single-location pass (done)
- [x] Venue filter, venue fields, and location copy removed from Portfolio, workspace header, project subtitles/summaries, and Inbox
- [x] Verified at 375 and 1280px: no location text on any screen, no console errors

## Richer scheduling model (done)
- [x] Spare time, forecast dates and critical path computed centrally in the database (all four dependency relationships plus wait time); every view reads the same numbers
- [x] Schedule tab now has four views: Master Timeline, Department Work Queue, Scene Readiness, Work & conversations (the old milestone list, still where comments live)
- [x] Master Timeline: milestone diamonds, committed plan vs live forecast bars, dependency lines labelled by relationship, critical-path bars labelled in words as well as colour, collapsible milestone groups, and nudge controls that always show the knock-on effect before committing
- [x] Impact preview names every work item and milestone that would move, by how much, and flags anything crossing a rehearsal or performance date
- [x] Department Work Queue: per-department open work, blockers linked to the blocking item, due-soon and overdue counts
- [x] Scene Readiness: scenes x departments, each cell derived from real work and linking to the blocking work item or document
- [x] "Coming soon" list (Capacity Heat Map, Load-in/Load-out Gantt, Show-Day Command Dashboard, role-based presets) shown but not clickable
- [x] Verified at 390 and 1280px: no page overflow, no console errors; closed productions show no date controls

## Batch 2 (done)
- Global search route (/search) over productions, work items, documents and message text, with breadcrumbs and deep links; reachable from desktop nav and mobile tab bar.
- Notice count now scoped to the person being viewed, matching My Work.
- My Work rows read as "Person mentioned you on X"; the sentence itself is the link.
- Updates tab = production updates plus "Said elsewhere on this production" history.
- Task titles open the work item everywhere they are listed.
- Ask Department prefills once, then clears from the address.
- Documents show the current revision beside the conversation.
