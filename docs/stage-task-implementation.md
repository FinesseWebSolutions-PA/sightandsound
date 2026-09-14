# Stages and set task planning

## Agreed structure

Production → Set → optional Stage → Task → Subtask. Every task requires a set. A department is the team responsible, not a stage. Multiple stages can run together. Stage order is for display and creates no scheduling dependency. Late return work may use a separate stage such as Metal — final assembly. Independent work stays on its set without a stage.

## Implementation plan

1. Add per-set configurable stages and enforce task/set/project/parent consistency in Postgres. Preserve existing task assignments; do not guess stages or rewrite dates.
2. Extend the shared task editor so stages follow the selected set, subtasks inherit their parent's set/stage, and all creation paths require a set.
3. Make Set Tasks the complete inventory, grouped by stage with independent work, owner/department/date/status and searchable filters. Derive stage progress and date spans from tasks.
4. Add a stage timeline for production, individual set and department grouping. Expose concurrent tasks, undated work, task detail, and the existing date-editing tools. Keep committed schedule edits explicit.
5. Share prerequisite evaluation across task inventory, My Work, department queue and stage timeline. Distinguish waiting to start from a finish constraint; honor dependency type and buffers.
6. Test constraints, inheritance, stage lifecycle, concurrent grouping and prerequisite semantics in isolation; run UI checks for admin/viewer, empty stages, mobile, and existing data. Apply migration, publish and verify the live deployment.

## Boundaries

Stage templates, actual shop capacity units, business-day calendars and automatic escalations require line producer input. This change does not assume a universal stage sequence or introduce automatic stage-to-stage date cascades. The existing demo identity model remains; stage mutations verify the selected active administrator, and closed productions are read-only.

Actual handoff dates are editable in the task's When section for checking buffers. Old completion records without actual dates are not silently backdated from forecasts. Positive buffers use whole calendar days rounded up in the date-based interface; business calendars remain a separate decision.

## Delivered and verified

- Per-set stages can be added, renamed, reordered and removed when empty. Task and subtask assignments remain stable across all views.
- Set Tasks lists all work with stage/department/status/search filters, owner/date/status details, and explicit empty states. Matching subtasks remain visible when their parents are filtered out.
- The set overview lists all active stages. Production and set schedules show stage lanes with expandable task bars and a department grouping. Set dates retains whole-set commitments.
- Dependency readiness distinguishes start gates from finish gates, uses actual dates for positive buffers, and excludes advisory constraints from blockers. It is shared by the new schedule, set tasks, task details, department queue and My Work. The tour explains the new structure.
- Existing tasks were left independent; names or departments were not used to guess stage membership. No dates or operational tasks were changed during migration or browser verification.

Run `npm test`, `npm run typecheck`, and `npm run build`. Run the isolated PostgreSQL regression with `node tests/db/set-stages.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js` (verified with PGlite 0.3.7). It includes the existing parent rollup triggers and checks set/project/parent integrity, stage inheritance, lifecycle, role restrictions, closed productions, RLS and audit.

For the isolated browser regression, run the dev server on 4173 with a locally chosen SITE_PASSWORD, set STAGE_REVIEW_PASSWORD to that same code, and run `node tests/browser/stages.mjs /absolute/path/to/playwright/index.mjs` (verified with Playwright 1.58.2). The test reads demo context, replaces scheduling data in the browser and intercepts all database mutations. It tests create/edit stage/task/subtask flows, parent reassignment, filters, department grouping, reload, viewer controls and mobile overflow. It does not write its fixtures to the live database.

Security advisors report no new findings. The existing public schedule computation and preview functions retain their previously documented SECURITY DEFINER warnings. Their permissions belong to the individual sign-in rollout: [anonymous execution remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated execution remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
