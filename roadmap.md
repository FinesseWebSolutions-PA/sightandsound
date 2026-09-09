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

## Open (blocked)
- Swap stand-in data for live queries against Supabase project `zqrotlehxgeztrukddck`
  — blocked on the user authorizing the Supabase connector in Project Settings.
  Data access is isolated in `src/lib/production-data.ts` so only that module changes.
