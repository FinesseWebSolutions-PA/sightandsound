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
- Portfolio filters (status / venue / department) verified against live data.
- Document review verified end to end: Rev B approved and the status updated on screen without a reload.
- Discussions verified at production, work-item and document level, with mentions creating notices.
- Fixed: one discussion per work item / document (matches the database rule), all seven departments on the Team tab, editable Portal link there, closed productions fully read-only with an archive banner, work items with no milestone now listed, and failed saves now show a message instead of silently sticking.

## Mobile pass (tested at 375px and 430px)
- Header: brand + bell + hamburger menu (portfolio link + role switcher inside).
- Portfolio: scrollable status chips, collapsible venue/department filters, stacked cards.
- Workspace: scrollable tabs, two-column meta, tappable Portal link.
- Dashboard: single-column summary, stacked open-work list.
- Timeline: stacked milestone/task cards with "Waits on:" / "Blocks:" text (no Gantt).
- Documents: tappable document list, full-width review actions.
- Discussions: stacked mention pickers, composer scrolls into view on focus, full-width Post.
- Team: stacked Portal form, wrapped department cards, mobile access list.
- Verified: no page horizontal scroll, no console errors, all primary controls >= 44px.
- Note: all three seeded productions are at Lancaster, so the Branson venue filter shows an empty state by design.
