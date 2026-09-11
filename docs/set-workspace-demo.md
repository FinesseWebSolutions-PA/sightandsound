# Set workspace walkthrough

Use one sample show, two sets, and engineering plus shop/lighting. Use synthetic content in an isolated demo environment. Existing production data should not be reseeded.

1. Open a set. The default Overview shows work completion, blockers, planned/forecast dates, responsible contributors, department oversight, pending document reviews, and recent decisions.
2. Assign an engineer and a shop contributor in Team. As each demo person, accept responsibility in Overview. Department contacts are oversight, not an assumed set assignment. Changed assignments require acceptance again.
3. As a department head, follow the set. Assigned set members, set leads, and assigned work owners follow automatically. Preview all recipients when posting an important update. Ordinary chat remains informal.
4. Discuss a synthetic drawing using replies and emoji. Edit a recent message, then view its history. The editing window ends exactly two hours after its original send time; later corrections are replies. Reactions never approve documents.
5. Upload the drawing in Files, choose a reviewer, request changes, upload a revised version, and approve that exact version. Filter for current approved files. Older versions are marked superseded and remain accessible.
6. Record the agreed outcome from its conversation. Select the set, responsible person, exact file version, and a follow-up work item. The original message is snapshotted. Ask for acknowledgement only when needed; inspect the saved recipient list and acknowledgement state.
7. In Planning, assign the timeline owner. A contributor proposes new task dates and a reason. As the timeline owner, preview downstream effects and accept or decline. Acceptance recomputes the schedule and notifies affected set followers. Stale dates or impact require a refreshed request/preview. Requesters can withdraw pending requests.
8. Allocate work from two sets to the same named crew or build space. The department queue flags overlaps. Allocate another item to an outside builder with an accountable person and dates. Capacity planning does not silently create dependencies or move the schedule.
9. Open a completed set's handover record. Review unresolved required approvals/acknowledgements, search decisions, and open an exact historical file version. Closing the production makes its workspace read-only.

## Review with the team

Have the engineer, timeline manager, and IT team review this walkthrough together. Validate who is authorized to change the master schedule, which documents need more than one departmental approval, and which changes require acknowledgement. Record their answers before expanding beyond the pilot.

## Current limits

The app retains shared demo identities, not verified login or project authorization. Administrator timeline editors remain available; the request workflow is the contributor path and records its own approvals. This release does not replace every legacy direct date editor with an approval gate. Each capacity lane assumes one crew/space allocation at a time; it is not a resource-optimization engine. Workspace updates refresh after writes, on focus, through supported realtime table events, and with a full reconciliation every 60 seconds. Historic message edits from before this release cannot be recovered. Drafts remain device-local. Multi-reviewer approval chains and resumable uploads remain separate work.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`. Run `supabase/tests/workspace_regression.sql` only against an isolated database with migrations applied. It rolls back synthetic fixtures. The development harness exercises the SQL workflow against PGlite with a deterministic schedule preview/calculation test double; deployment also checks the actual function signatures and read-only live metadata. No live messages, decisions, acknowledgements, or schedule requests are created by these checks.

## September 9 meeting follow-up

This pass uses the first meeting as context and preserves the more specific workflow agreed in the September 10 meeting.

- Set navigation puts **Overview, Tasks, Conversations and Files** first. **More** retains updates and decisions, planning and capacity, schedule, and team. Existing section URLs still work. Set metadata and administrative controls are under **Set details & settings**.
- A department mention resolves the conversation's actual set, including conversations attached to a task or document. It reaches that department's assigned set members and the production's active department head/default owner. Production-level conversations reach production-level assignments and oversight. Global owners/leads are fallback oversight only when none is named for that production. Deactivated people are excluded. A direct mention takes precedence, each person receives one mention notice, and the sender is excluded. Existing conversation participants still receive ordinary reply notices.
- **Set instructions** appears on Overview and Files. Contributors can link existing files under operating manuals, assembly/load-in, or shipping/packing. Several files can fill each category. Files stay in the document library with their folders, versions and approvals.
- Only an approved latest version is labelled current, and links open that exact version. If a new revision awaits approval, an older approved revision is clearly labelled older. Trashed or moved files are shown as unavailable. Unpinning removes the shortcut, not the file. No operational documents are invented or automatically designated.
- Instructions refresh after edits, on window focus, and every 30 seconds while visible. The existing shared demo persona/permissions model still applies; this pass does not introduce individual sign-in, push notifications, ERP integration, or automated exports.

Validation includes JavaScript tests, type checking, a production build, targeted lint, and isolated PostgreSQL checks for mention routing and instruction scope/permissions. To rerun the database checks, install `@electric-sql/pglite@0.3.7` in a scratch directory and run `node tests/db/set-instruction-hub.mjs /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js`. The fixture is in-memory and never connects to Supabase.

## Personal workflow UX pass

- My Work is the home page, with task, approval, mention, and followed-conversation filters, production/search filters, and shortcuts to assigned sets. Dismissing or snoozing an update never completes its task. The productions portfolio remains at `/productions`; `/inbox` remains compatible.
- Every set opens a ready-to-type main conversation, created atomically on the first message. Named topics remain optional. Emoji, replies, the two-hour edit window, file attachments, pasted screenshots, and a preview of mentioned recipients support everyday conversation.
- Explicit conversation Follow/Mute, personal notification settings, and read markers persist in Supabase under the current demo person. Muting ordinary replies preserves direct mentions. Desktop alerts require browser permission and the app to remain open; quiet hours use the device timezone. These are not email or background mobile push.
- Files offers a New menu, folder uploads, department/set/type/status filters, exact-version links, and Undo after trash. Reviewers are searchable with relevant people suggested; review requests accept an optional due date. Decision confirmation returns the reviewer to the file list.
- Set Tasks is a visible tab, instructions collapse on Overview, and editable set names/Portal links have explicit Save controls. Global search includes sets, with result-type and production filters.
- Collection loading pages through 500 rows at a time, avoiding the API's default row cap. Realtime updates reuse unchanged collections. Initial loading and periodic reconciliation still read full collections; project-scoped history loading and a concurrent-user load test remain necessary before claiming readiness for a large rollout.

Validation: 48 JavaScript tests, type checking, production build, targeted lint, desktop/phone UI checks, and isolated PostgreSQL assertions for personal workflow, main-chat uniqueness, muted notices, and atomic review due dates. Run the latter with `node tests/db/personal-workflow.mjs /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js`. The test installs no live data.

Google is selected for individual sign-in, but provider configuration and account-bound authorization are still pending. See [Google sign-in rollout](google-sign-in-rollout.md). Security advisors continue to report the two existing schedule functions callable as SECURITY DEFINER; address their privileges during authorization rollout ([Supabase remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)).
