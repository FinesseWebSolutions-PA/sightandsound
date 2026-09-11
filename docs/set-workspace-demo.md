# Set workspace walkthrough

Use one sample show, two sets, and engineering plus shop/lighting. Use synthetic content in an isolated demo environment. Existing production data should not be reseeded.

1. Open a set. The default Overview shows work completion, blockers, planned/forecast dates, responsible contributors, department oversight, pending document reviews, and recent decisions.
2. Assign an engineer and a shop contributor in Team. As each demo person, accept responsibility in Overview. Department contacts are oversight, not an assumed set assignment. Changed assignments require acceptance again.
3. As a department head, follow the set. Assigned set members, set leads, and assigned work owners follow automatically. Preview all recipients when posting an important update. Ordinary chat remains informal.
4. Discuss a synthetic drawing using replies and emoji. Edit a recent message, then view its history. The editing window ends exactly two hours after its original send time; later corrections are replies. Reactions never approve documents.
5. Upload the drawing in Documents, choose a reviewer, request changes, upload a revised version, and approve that exact version. Filter for current approved files. Older versions are marked superseded and remain accessible.
6. Record the agreed outcome from its conversation. Select the set, responsible person, exact file version, and a follow-up work item. The original message is snapshotted. Ask for acknowledgement only when needed; inspect the saved recipient list and acknowledgement state.
7. In Planning, assign the timeline owner. A contributor proposes new task dates and a reason. As the timeline owner, preview downstream effects and accept or decline. Acceptance recomputes the schedule and notifies affected set followers. Stale dates or impact require a refreshed request/preview. Requesters can withdraw pending requests.
8. Allocate work from two sets to the same named crew or build space. The department queue flags overlaps. Allocate another item to an outside builder with an accountable person and dates. Capacity planning does not silently create dependencies or move the schedule.
9. Open a completed set's handover record. Review unresolved required approvals/acknowledgements, search decisions, and open an exact historical file version. Closing the production makes its workspace read-only.

## Review with the team

Have the engineer, timeline manager, and IT team review this walkthrough together. Validate who is authorized to change the master schedule, which documents need more than one departmental approval, and which changes require acknowledgement. Record their answers before expanding beyond the pilot.

## Current limits

The app retains shared demo identities, not verified login or project authorization. Administrator timeline editors remain available; the request workflow is the contributor path and records its own approvals. This release does not replace every legacy direct date editor with an approval gate. Each capacity lane assumes one crew/space allocation at a time; it is not a resource-optimization engine. Workspace updates refresh after writes and every 30 seconds/on focus. Historic message edits from before this release cannot be recovered. Cross-device read markers/drafts, multi-reviewer approval chains, and resumable uploads remain separate work.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`. Run `supabase/tests/workspace_regression.sql` only against an isolated database with migrations applied. It rolls back synthetic fixtures. The development harness exercises the SQL workflow against PGlite with a deterministic schedule preview/calculation test double; deployment also checks the actual function signatures and read-only live metadata. No live messages, decisions, acknowledgements, or schedule requests are created by these checks.
