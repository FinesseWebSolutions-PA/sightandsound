# Demo tasks organized by set stage

Applied September 14, 2026 in migration `20260914213002_seed_demo_set_stages.sql`.

The four shop stages from the meeting outline are Metal, Foam / plywood, Paint, and Décor. Art & design and Engineering & drafting are provisional demo labels for the preceding work, pending confirmation of the exact drafting-stage names. Stage order groups work; it does not impose finish-to-start dependencies. New foam and décor examples overlap adjacent work.

## Scope and results

The seed covers 28 sets across Daniel, Kings & Kingdoms, Ruth: A Harvest Story, and The Prodigal's Return. Each set receives six stages. Existing template tasks are identified by their exact title and description, and only tasks without a stage are assigned. Custom work and closed or unrelated productions are excluded. Subtasks inherit their parent's stage.

| Stage | Tasks, including subtasks |
| --- | ---: |
| Art & design | 56 |
| Engineering & drafting | 112 |
| Metal | 84 |
| Foam / plywood | 28 |
| Paint | 28 |
| Décor | 28 |

After seeding: 431 tasks, 336 staged (78%), 95 independent. The seed adds 56 clearly marked illustrative tasks for foam/plywood and décor. Load-in, costume and animal work remain independent examples. Engineering & drafting includes structural, automation, lighting and controls template work for this demonstration.

## Preservation and reruns

The transaction verifies that all 375 preexisting tasks retain every field except stage assignment and modification timestamp. It records seed actions in the audit log. Existing stage assignments are preserved; stage names and task seed markers prevent duplicates on rerun. New illustrative task progress and actual dates are derived from their sample dates relative to the seed date. No notifications are sent.

## Verification

Live checks confirmed 168 stages, 56 added tasks and zero parent/subtask stage mismatches. The preservation guard passed during application. The isolated PGlite fixture verifies exact-template scope, closed/real-production exclusion, inherited stages, original task preservation and an idempotent rerun using the database's allowed task statuses.

Run the fixture with an installed PGlite module:

```sh
node tests/db/demo-stage-seed.mjs /absolute/path/to/@electric-sql/pglite/dist/index.js
```
