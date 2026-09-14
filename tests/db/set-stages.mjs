import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated;
create table people(id uuid primary key,role text,deactivated_at timestamptz);
create table projects(id uuid primary key,status text);
create table scenes(id uuid primary key,project_id uuid references projects(id));
create table tasks(id uuid primary key default gen_random_uuid(),project_id uuid references projects(id),scene_id uuid references scenes(id),parent_task_id uuid references tasks(id) on delete set null,title text,status text default 'not_started',start_date date,due_date date,forecast_start date,forecast_finish date,total_float_hours numeric,criticality text);
create table audit_log(entity_type text,entity_id uuid,actor_id uuid,action text,changes jsonb);
grant select,insert,update,delete on all tables in schema public to anon,authenticated;`);
await db.exec(
  readFileSync(
    new URL(
      "../../supabase/migrations/20260910161205_e1664a8e-1a72-4cfe-980c-e41a4979a0d3.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    new URL(
      "../../supabase/migrations/20260914210324_set_stages_and_task_scope.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
await db.query(
  "insert into people values($1,'admin',null),($2,'viewer',null),($3,'admin',now()),($4,'contributor',null)",
  [id(1), id(2), id(3), id(4)],
);
await db.query("insert into projects values($1,'active'),($2,'closed')", [id(10), id(11)]);
await db.query("insert into scenes values($1,$2),($3,$2),($4,$5)", [
  id(20),
  id(10),
  id(21),
  id(22),
  id(11),
]);
await db.exec("set role anon");
const stage = async (name, actor = 1, scene = 20, stageId = null, action = "save") =>
  (
    await db.query("select manage_set_stage($1,$2,$3,$4,$5) as id", [
      id(scene),
      id(actor),
      name,
      stageId,
      action,
    ])
  ).rows[0].id;
await assert.rejects(stage("Engineering", 2), /administrator/);
await assert.rejects(stage("Engineering", 3), /administrator/);
await assert.rejects(stage("Engineering", 4), /administrator/);
await assert.rejects(stage("Engineering", 1, 22), /closed/);
await assert.rejects(
  db.query("insert into set_stages(scene_id,project_id,name) values($1,$2,$3)", [
    id(20),
    id(10),
    "Direct write",
  ]),
  /row-level security/,
);
const engineering = await stage("Engineering");
const metal = await stage("Metal");
const returnWork = await stage("Metal — final assembly");
const other = await stage("Engineering", 1, 21);
await assert.rejects(stage(" engineering "), /duplicate/);
await assert.rejects(stage("   "), /name/);
const task = async (n, scene = 20, stageId = null, parent = null, project = 10) =>
  db.query(
    "insert into tasks(id,scene_id,project_id,stage_id,parent_task_id,title) values($1,$2,$3,$4,$5,$6)",
    [
      id(n),
      scene === null ? null : id(scene),
      id(project),
      stageId,
      parent === null ? null : id(parent),
      `Task ${n}`,
    ],
  );
await assert.rejects(task(100, null), /belong to a set/);
await assert.rejects(task(100, 20, other), /foreign key/);
await assert.rejects(task(100, 20, null, null, 11), /foreign key/);
await task(100, 20, engineering);
await task(101, 20, null, 100);
await assert.rejects(task(105, 20, null, 101), /one level/);
await task(102, 20);
await task(103, 20, metal);
assert.equal(
  (await db.query("select stage_id from tasks where id=$1", [id(101)])).rows[0].stage_id,
  engineering,
);
await assert.rejects(task(104, 21, null, 100), /same set/);
await assert.rejects(
  db.query("update tasks set scene_id=$1,stage_id=null where id=$2", [id(21), id(100)]),
  /subtasks/,
);
await db.query("update tasks set stage_id=$1 where id=$2", [returnWork, id(100)]);
assert.equal(
  (await db.query("select stage_id from tasks where id=$1", [id(101)])).rows[0].stage_id,
  returnWork,
);
await db.query("update tasks set stage_id=null where id=$1", [id(100)]);
assert.equal(
  (await db.query("select stage_id from tasks where id=$1", [id(101)])).rows[0].stage_id,
  null,
);
await stage("Finish", 1, 20, engineering);
await stage(null, 1, 20, returnWork, "up");
assert.deepEqual(
  (
    await db.query("select name from set_stages where scene_id=$1 order by sort_order", [id(20)])
  ).rows.map((r) => r.name),
  ["Finish", "Metal — final assembly", "Metal"],
);
await assert.rejects(stage(null, 1, 20, metal, "delete"), /Move this stage/);
await assert.rejects(stage("Wrong scope", 1, 21, metal), /does not belong/);
await stage(null, 1, 20, engineering, "delete");
assert.equal((await db.query("select count(*)::int as n from tasks")).rows[0].n, 4);
assert.equal(
  (await db.query("select count(*)::int as n from set_stages where id=$1", [engineering])).rows[0]
    .n,
  0,
);
assert.equal(
  (await db.query("select count(*)::int as n from audit_log where action='stage_delete'")).rows[0]
    .n,
  1,
);
// RPC privileges do not leave write access enabled after the operation.
assert.equal((await db.query("update set_stages set name='Bypass' returning id")).rows.length, 0);
await db.close();
console.log(
  "Passed stages: required set, scope constraints, parent inheritance, independent and return work, rename/reorder/remove, actor/closed guards, RLS and audit.",
);
