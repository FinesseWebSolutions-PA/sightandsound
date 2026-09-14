import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
export async function makeDatabase() {
  const db = new PGlite();
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  const file = (suffix) =>
    readFileSync(
      new URL(
        readdirSync(dir).find((f) => f.endsWith(suffix)),
        dir,
      ),
      "utf8",
    );
  await db.exec(`create role anon;create role authenticated;
 create table people(id uuid primary key,full_name text,role text,deactivated_at timestamptz);
 create table projects(id uuid primary key,name text,status text,start_date date,target_close_date date);
 create table scenes(id uuid primary key,project_id uuid references projects(id),name text,sort_order int default 0,status text default 'not_started',start_date date,due_date date,forecast_start date,forecast_finish date,depends_on_scene_id uuid,lag_days int default 0);
 create table milestones(id uuid primary key,project_id uuid,name text,due_date date,forecast_date date,criticality text,status text,affects_rehearsal boolean default false,affects_performance boolean default false);
 create table tasks(id uuid primary key default gen_random_uuid(),project_id uuid references projects(id),scene_id uuid references scenes(id),parent_task_id uuid references tasks(id),milestone_id uuid references milestones(id),title text,description text,department_id uuid,owner_id uuid references people(id),status text default 'not_started' check(status in ('not_started','in_progress','blocked','done')),start_date date,due_date date,forecast_start date,forecast_finish date,actual_start date,actual_finish date,sort_order int default 0,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now(),total_float_hours numeric,criticality text default 'normal',affects_rehearsal boolean default false,affects_performance boolean default false);
 create table task_dependencies(id uuid primary key default gen_random_uuid(),task_id uuid references tasks(id),depends_on_task_id uuid references tasks(id),type text check(type in ('finish_to_start','start_to_start','finish_to_finish','start_to_finish')),lag_hours numeric default 0,hard_constraint boolean default true,unique(task_id,depends_on_task_id));
 create table documents(id uuid primary key default gen_random_uuid(),task_id uuid,requires_approval boolean default true,status text,deleted_at timestamptz);
 create table document_versions(id uuid primary key,document_id uuid,version_number int);
 create table approvals(id uuid primary key,document_version_id uuid,status text,requested_at timestamptz);
 create table audit_log(entity_type text,entity_id uuid,actor_id uuid,action text,changes jsonb);
 grant select,insert,update,delete on all tables in schema public to anon,authenticated;`);
  await db.exec(file("_e1664a8e-1a72-4cfe-980c-e41a4979a0d3.sql"));
  await db.exec(file("_set_stages_and_task_scope.sql"));
  const legacy = file("_df960c29-07c5-49b4-a591-9688c89de85b.sql");
  await db.exec(
    legacy.slice(
      legacy.indexOf("create or replace function public.compute_project_schedule"),
      legacy.indexOf(
        "$function$;",
        legacy.indexOf("create or replace function public.compute_project_schedule"),
      ) + 11,
    ),
  );
  await db.exec(file("_gantt_atomic_editing.sql"));
  await db.exec(file("_gantt_review_guard.sql"));
  await db.exec(file("_gantt_schedule_refresh_scope.sql"));
  return db;
}
const id = (n) => `20000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const db = await makeDatabase();
await db.query(
  "insert into people values($1,'Admin','admin',null),($2,'Viewer','viewer',null),($3,'Departed','admin',now())",
  [id(1), id(2), id(3)],
);
await db.query(
  "insert into projects values($1,'Demo','active','2026-09-01','2026-12-01'),($2,'Closed','closed','2026-09-01','2026-12-01')",
  [id(10), id(11)],
);
await db.query(
  "insert into scenes(id,project_id,name) values($1,$2,'Courtyard'),($3,$4,'Closed set')",
  [id(20), id(10), id(21), id(11)],
);
await db.query(
  "insert into tasks(id,project_id,scene_id,title,start_date,due_date) values($1,$4,$5,'Design','2026-10-01','2026-10-05'),($2,$4,$5,'CNC','2026-10-06','2026-10-08'),($3,$4,$5,'Done work','2026-10-09','2026-10-10')",
  [id(30), id(31), id(32), id(10), id(20)],
);
await db.query(
  "update tasks set status='done',actual_start='2026-10-09',actual_finish='2026-10-10' where id=$1",
  [id(32)],
);
await db.query(
  "insert into task_dependencies(task_id,depends_on_task_id,type) values($1,$2,'finish_to_start'),($3,$1,'finish_to_start')",
  [id(31), id(30), id(32)],
);
await db.query("select compute_project_schedule($1)", [id(10)]);
await db.exec("set role anon");
const snapshot = async () =>
  (await db.query("select gantt_snapshot($1) as data", [id(10)])).rows[0].data;
const edit = async (operations, expected, preview = false, actor = 1, project = 10) =>
  (
    await db.query("select gantt_edit($1,$2,$3,$4,$5) as data", [
      id(project),
      id(actor),
      expected,
      JSON.stringify(operations),
      preview,
    ])
  ).rows[0].data;
const before = await snapshot();
const move = [
  { action: "task", task_id: id(30), patch: { start_date: "2026-10-04", due_date: "2026-10-08" } },
];
const preview = await edit(move, before.revision, true);
assert.equal((await snapshot()).revision, before.revision, "preview rolls back all changes");
assert.equal(
  preview.tasks.find((t) => t.id === id(31)).forecast_start,
  "2026-10-09",
  "successor moves",
);
assert.equal(
  preview.tasks.find((t) => t.id === id(32)).forecast_start,
  "2026-10-09",
  "completed work pinned",
);
await assert.rejects(edit(move, before.revision, false, 2), /administrator/);
await assert.rejects(edit(move, before.revision, false, 3), /administrator/);
await assert.rejects(edit(move, before.revision, false, 1, 11), /closed/);
const after = await edit(move, before.revision);
await assert.rejects(edit(move, before.revision), /schedule changed/);
assert.equal(after.tasks.find((t) => t.id === id(30)).start_date, "2026-10-04");
const undone = await edit(after.inverse, after.revision);
assert.equal(undone.tasks.find((t) => t.id === id(30)).start_date, "2026-10-01");
await assert.rejects(
  edit([{ action: "task", task_id: id(32), patch: { start_date: "2026-10-20" } }], undone.revision),
  /recorded dates/,
);
await assert.rejects(
  edit([{ action: "task", task_id: id(30), patch: { due_date: "2026-09-01" } }], undone.revision),
  /Finish/,
);
await assert.rejects(
  edit(
    [{ action: "link", task_id: id(30), predecessor_id: id(31), type: "finish_to_start" }],
    undone.revision,
  ),
  /circular/,
);
assert.equal(
  (await snapshot()).revision,
  undone.revision,
  "failed transactions do not change schedule",
);
await db.query("insert into documents(task_id,status) values($1,'in_review')", [id(31)]);
await assert.rejects(
  edit([{ action: "task", task_id: id(31), patch: { status: "done" } }], undone.revision),
  /Approve/,
);
const linked = await edit(
  [
    {
      action: "link",
      task_id: id(31),
      predecessor_id: id(30),
      type: "start_to_start",
      lag_hours: 24,
    },
  ],
  undone.revision,
);
assert.equal(linked.dependencies.find((d) => d.task_id === id(31)).type, "start_to_start");
const linkUndo = await edit(linked.inverse, linked.revision);
assert.equal(linkUndo.dependencies.find((d) => d.task_id === id(31)).type, "finish_to_start");
const captured = (
  await db.query("select gantt_capture_baseline($1,$2,$3) as id", [id(10), id(1), "Opening plan"])
).rows[0].id;
assert.ok(captured);
await assert.rejects(
  db.query(
    "insert into gantt_baselines(project_id,name,tasks,created_by) values($1,'Bypass','[]',$2)",
    [id(10), id(2)],
  ),
  /row-level security/,
);
await assert.rejects(
  db.query("select gantt_capture_baseline($1,$2,$3)", [id(10), id(2), "No"]),
  /administrator/,
);
const atomicBefore = await snapshot();
await assert.rejects(
  edit(
    [
      { action: "task", task_id: id(30), patch: { title: "Must roll back" } },
      { action: "task", task_id: id(32), patch: { start_date: "2026-12-01" } },
    ],
    atomicBefore.revision,
  ),
  /recorded dates/,
);
assert.equal((await snapshot()).revision, atomicBefore.revision);
console.log(
  "Passed atomic Gantt: preview rollback, cascade, completed protection, admin/closed guards, stale edits, undo, dependency cycle/reversal, approval gate, baseline RLS and batch rollback.",
);
await db.close();
