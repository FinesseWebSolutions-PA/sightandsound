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

## Files in conversations (done)
- Attach files and photos to any message (production, work item, or document conversation); private `chat-attachments` storage, 25 MB per file, multiple files per message.
- Images show as previews; every file has Open (signed link) and, for contributors/admins on open productions, "Save to project docs".
- Saving asks for a name and a folder (existing folder or a new one), creates the document at revision 1 pointing at the same file, and the message then shows "Saved to <folder>" linking to it.
- Documents list shows folders, and a document can be moved into an existing or new folder.

## Staffing (done)
- Company-wide Team & Roles page: department, lead flag, access level per person; default department head; reusable job titles per department.
- Per-production Team & Departments tab: turn departments on/off, name the production's department head, assign people with a preset or custom job for that show, change or remove assignments.
- Admin-only on open productions; viewers and closed productions stay read-only. Every change is recorded in history.

## Adding and editing work (done)
- One editor panel for creating and editing a work item: title, notes, department, scene, assigned person (from that production's staffing), status, planned start/finish, build milestone, and rehearsal/performance risk flags.
- Openable from "Add work item" on Schedule, "Add work" per department in the Department Work Queue, an empty cell in Scene Readiness, and Edit on any open work item.
- Dependencies edited in place: choose what it waits on, the relationship type, and lag in days (negative for overlap); remove one at any time. Every change re-runs the central schedule calculation.
- Removing is guarded: work with a conversation, attached documents, or other work waiting on it must be completed instead.
- Admin-only on open productions; contributors keep status/date updates; viewers and closed productions read-only. All changes recorded in history.
