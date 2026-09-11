# Sight and Sound PM

Build a leadership-demo prototype of a show-production project-management platform for Sight & Sound Theatres (live theatrical productions, venues in Lancaster PA and Branson MO).

PRODUCT: A "Production Portfolio" listing show-build projects. Each project has its own workspace: a Dashboard (status, owner, departments, key dates, recent activity, open tasks, upcoming milestones, notification summary, quick links to documents/approvals/Portal), a Timeline (milestones + tasks with due dates, dependencies, ownership, status), a Documents area (versioned files with an approval workflow: request review -> approve/reject/request changes), and threaded discussions at three levels — project-level, task-level, and document-level — each supporting @mentions of individual people AND departments (mentioning a department notifies its designated owner + leads). Include a Team/Departments tab and a dedicated external-link field labeled "Portal (set simulation)" — just a URL field, do not try to build any 3D/simulation feature.

DEPARTMENTS: Art, Engineering, Costumes, Lighting, Animals, Shop, Electronics & Effects.

ROLES (for this prototype, skip real auth — a simple role switcher for Admin/Contributor/Viewer is fine): Admin manages everything and edits core timelines; Contributor updates assigned work, comments, and uploads documents; Viewer is read-only. Keep permissions simple and mostly open/transparent across departments — only core timeline edits and admin config are restricted.

DATA: Connect to my existing Supabase project (ref zqrotlehxgeztrukddck, named "Sight and Sound") rather than provisioning a new database — I've already created the schema and seed data there: people, departments, projects, project_departments, milestones, tasks, task_dependencies, documents, document_versions, approvals, discussion_threads, comments, mentions, notifications, audit_log. Seeded with 3 sample projects ("The Prodigal's Return" — active, Lancaster; "Kings & Kingdoms" — planning, Branson; "Ruth: A Harvest Story" — closed/archived, Lancaster), each with realistic milestones/tasks/documents/discussion so the UI has real data to render.

VISUAL IDENTITY: warm, calm, disciplined — not generic SaaS, not theatrical/decorative. Palette: gold #CF9C51 as a sparing accent only (never for status/warnings), warm gray #776B62 and #302B27 for structure/text, cream #E9E6D5 / #FAF9F5 backgrounds, white surfaces for dense tables. Typography: Inter for all UI/tables/forms/navigation, Cormorant Garamond only for large display headings, IBM Plex Mono only for IDs/codes. Every status indicator must pair color with a text label and icon — never color alone.

TERMINOLOGY: call the top-level list a "Production Portfolio"; avoid generic PM jargon like "sprint," "ticket," "epic," or "backlog," and don't call people "resources" — use "department" / "team member."

OUT OF SCOPE for this prototype: purchase orders/inventory/ERP features, native mobile app, push notifications, and any real 3D/simulation build. Browser-friendly responsive web, desktop-first with solid tablet support, is enough.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sightandsound.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c1761220-d201-474d-8a3e-43d8468dc847).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npx --yes bun@1.3.10 install --frozen-lockfile
npm run dev
```

Use Node.js 22.18 or newer for the test runner. The committed `bun.lock` pins the
dependency versions used for verification. Set `SITE_PASSWORD` and a random
`SESSION_SECRET` of at least 32 characters in an untracked `.env.local` file when
running the access-code gate locally; these are server-only variables.

Before publishing changes:

```sh
npm test
npm run typecheck
npm run build
```

The tests use synthetic data and a mocked Supabase transport. They do not write to
the live database. Ordinary portfolio reads are also read-only: schedule writers
recompute only the affected production after a change. Any new writer that changes
task dates/status, milestones, production windows, or set dependencies must keep
that schedule refresh in its save path.
