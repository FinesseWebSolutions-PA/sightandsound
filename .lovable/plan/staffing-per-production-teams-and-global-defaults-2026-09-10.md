# Staffing: per-production teams and global defaults

Two connected pieces: a global place that defines who is on each department and what they can do by default, and a per-production staffing screen where you pick the actual people and jobs for that show.

## 1. Global team and departments (defaults)

A new admin page, reachable from the top navigation, listing:

- Every team member: name, email, department, access level (Admin / Contributor / Viewer). All editable by admins.
- Every department: its default owner (the head that carries over to new productions) and its leads.
- A preset list of job titles per department (for example Head Engineer, Fabricator, Draftsperson), editable by admins. These are the choices offered when staffing a production.

Whatever is set here becomes the starting point every new production inherits.

## 2. Per-production team (actual staffing)

On a production's Team & Departments tab, each department card becomes editable:

- Toggle whether the department is working on this production.
- Pick the department head for this production (defaults to the global owner, overridable per show).
- Add people to the production: the picker shows that department's members first, with an option to widen to everyone.
- Each assigned person gets a job for this show, chosen from that department's preset list, or typed in as a custom job for this production only.
- Remove or re-assign people; one person can be assigned in more than one department.

Rules:
- Only Admins can change staffing. Contributors and Viewers see the roster read-only.
- Closed productions are locked, matching the rest of the app.
- Every change is written to the audit trail, like other edits.
- Department mentions in discussions keep notifying the production's head plus leads — now driven by the per-production head when one is set.

## 3. Where staffing shows up

- Production dashboard and department cards show the real named head and headcount instead of only global defaults.
- Owner/assignee pickers on work items prefer people staffed on that production.

## Technical notes

New tables (additive, no changes to existing columns):

- `project_assignments` — `project_id`, `person_id`, `department_id`, `job_title` (text), `is_head` (boolean), timestamps. Unique on (project, person, department).
- `department_job_titles` — `department_id`, `title`, `sort_order`; seeded with a sensible preset list per department.

Existing `project_departments.default_owner_id` is used as the per-production department head; `department_memberships` and `departments.default_owner_id` remain the global source of truth. Grants + open prototype RLS policies to match the current tables.

Data layer: extend `src/lib/production-data.ts` with reads for the two new tables and writes for assigning/unassigning people, setting the head, editing a person's global access level, department membership/lead flags, and job-title presets. Store actions follow the existing `runAsync` pattern with permission guards. UI: new `src/routes/team.tsx` (global) and an editable staffing section in `src/routes/projects.$projectId.team.tsx`, plus a reusable assignment editor component. Mobile layouts follow existing card/sheet patterns with 44px targets.
