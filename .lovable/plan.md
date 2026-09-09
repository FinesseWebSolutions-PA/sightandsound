# Sight & Sound — Production Portfolio (leadership demo)

## One thing needed from you first

I can't link your existing "Sight and Sound" database (ref `zqrotlehxgeztrukddck`) from
this chat — that connection has to be authorized by you. In Lovable, open
**Project Settings → Connectors → Supabase** and connect that project. Once it's
connected I'll read your existing tables and seed data directly, with no new
database created and no changes to your schema.

If you'd rather I start on the interface immediately, I can build every screen
against your exact table shapes and switch it to live data the moment the
connection lands. Tell me which you prefer.

## What gets built

**Production Portfolio (home)** — the list of show-build projects: name, venue
(Lancaster / Branson), status (active / planning / closed), owner, departments
involved, next key date. Filter by status, venue, department. Each row opens a
project workspace.

**Project workspace tabs**

1. **Dashboard** — status, owner, departments, key dates, recent activity,
   open tasks, upcoming milestones, notification summary, quick links to
   Documents, Approvals, and the Portal link.
2. **Timeline** — milestones and tasks with due dates, owners, status, and
   dependency links shown as "waits on / blocks". Only Admins can edit the core
   dates.
3. **Documents** — files with version history and an approval flow:
   request review → approve / reject / request changes, with who and when.
4. **Discussions** — threaded conversation at project level, on any task, and on
   any document. Comments support @mentions of a person or a department;
   mentioning a department notifies its owner and leads.
5. **Team & Departments** — the seven departments (Art, Engineering, Costumes,
   Lighting, Animals, Shop, Electronics & Effects), their owner, leads, and
   members on this project.
6. **Portal (set simulation)** — a single labeled external link field. No 3D
   work of any kind.

**Roles** — a role switcher in the header for Admin / Contributor / Viewer, no
login. Admin edits everything including core timeline dates and configuration;
Contributor updates assigned work, comments, uploads documents; Viewer reads
only. Everything else stays open across departments.

## Look and feel

Warm, calm, disciplined. Cream backgrounds (#FAF9F5, #E9E6D5), white surfaces
for dense tables, warm grays (#776B62, #302B27) for text and structure, gold
(#CF9C51) used sparingly as an accent and never for status. Inter for all
interface text and tables, Cormorant Garamond for large display headings only,
IBM Plex Mono for IDs and codes. Every status shows a color **plus** a word and
an icon, so nothing depends on color alone. Desktop-first, comfortable on
tablet.

Language stays yours: "Production Portfolio", departments, team members — no
sprints, tickets, epics, backlogs, or "resources".

## Out of scope

No purchase orders, inventory, or ERP; no mobile app; no push notifications; no
3D or simulation build.

## Technical notes

- Read/write through server functions using the connected Supabase project;
  existing tables (`people`, `departments`, `projects`, `project_departments`,
  `milestones`, `tasks`, `task_dependencies`, `documents`, `document_versions`,
  `approvals`, `discussion_threads`, `comments`, `mentions`, `notifications`,
  `audit_log`) are used as-is. No migrations, no seeding.
- Design tokens defined once in `src/styles.css`; no hardcoded colors in
  components.
- Routes: `/` portfolio, `/projects/$projectId/{dashboard,timeline,documents,discussions,team}`,
  each with its own page metadata.
- Since auth is skipped, role is client state; mentions/notifications are
  written to your existing tables so the demo shows real records.
