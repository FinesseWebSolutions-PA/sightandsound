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
