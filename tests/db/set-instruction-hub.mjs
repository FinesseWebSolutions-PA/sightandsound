// Isolated PostgreSQL test. Install @electric-sql/pglite@0.3.7 outside the app,
// then pass its module path as the first argument. Never connects to Supabase.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table people(id uuid primary key,full_name text,role text,deactivated_at timestamptz);
create table projects(id uuid primary key,status text);
create table scenes(id uuid primary key,project_id uuid references projects);
create table departments(id uuid primary key,default_owner_id uuid);
create table department_memberships(department_id uuid,person_id uuid,is_lead boolean);
create table project_departments(project_id uuid,department_id uuid,default_owner_id uuid);
create table project_assignments(project_id uuid,scene_id uuid,department_id uuid,person_id uuid,is_head boolean);
create table tasks(id uuid primary key,project_id uuid,scene_id uuid);
create table documents(id uuid primary key,project_id uuid,scene_id uuid,deleted_at timestamptz);
create table discussion_threads(id uuid primary key,project_id uuid,context_type text,scene_id uuid,task_id uuid,document_id uuid);
grant select on all tables in schema public to anon,authenticated;
`);
const migrations = new URL("../../supabase/migrations/", import.meta.url);
const migration = readdirSync(migrations).find((f) => f.endsWith("_set_instruction_hub.sql"));
await db.exec(readFileSync(new URL(migration, migrations), "utf8"));
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
for (let n = 1; n <= 8; n++)
  await db.query("insert into people values($1,$2,$3,$4)", [
    id(n),
    `Person ${n}`,
    n === 8 ? "viewer" : "contributor",
    n === 7 ? "2026-01-01" : null,
  ]);
await db.query("insert into projects values($1,$3),($2,$3)", [id(10), id(11), "active"]);
await db.query("insert into scenes values($1,$3),($2,$3),($4,$5)", [
  id(20),
  id(21),
  id(10),
  id(22),
  id(11),
]);
await db.query("insert into departments values($1,$2)", [id(30), id(4)]);
await db.query("insert into department_memberships values($1,$2,true)", [id(30), id(5)]);
await db.query("insert into project_departments values($1,$2,$3)", [id(10), id(30), id(3)]);
for (const [scene, person, head] of [
  [20, 1, false],
  [21, 2, false],
  [null, 3, true],
  [20, 7, false],
  [null, 6, false],
]) {
  await db.query("insert into project_assignments values($1,$2,$3,$4,$5)", [
    id(10),
    scene ? id(scene) : null,
    id(30),
    id(person),
    head,
  ]);
}
await db.query("insert into tasks values($1,$2,$3)", [id(40), id(10), id(20)]);
await db.query("insert into documents values($1,$2,$3,null),($4,$2,$5,null)", [
  id(50),
  id(10),
  id(20),
  id(51),
  id(21),
]);
for (const [thread, kind, scene, task, doc] of [
  [60, "scene", 20, null, null],
  [61, "task", null, 40, null],
  [62, "document", null, null, 50],
  [63, "project", null, null, null],
]) {
  await db.query("insert into discussion_threads values($1,$2,$3,$4,$5,$6)", [
    id(thread),
    id(10),
    kind,
    scene ? id(scene) : null,
    task ? id(task) : null,
    doc ? id(doc) : null,
  ]);
}
const recipients = async (thread) =>
  (
    await db.query("select person_id from department_mention_recipients($1) order by person_id", [
      id(thread),
    ])
  ).rows.map((r) => r.person_id);
// Scoped engineer and named oversight, never another set, global leads or inactive people.
for (const thread of [60, 61, 62]) assert.deepEqual(await recipients(thread), [id(1), id(3)]);
assert.deepEqual(await recipients(63), [id(3), id(6)]);
assert.deepEqual(await recipients(999), []);
await db.exec("delete from project_departments; update project_assignments set is_head=false;");
assert.deepEqual(await recipients(60), [id(1), id(4), id(5)]);
// Restore production oversight and verify real demo-role SELECT/function grants.
await db.query("insert into project_departments values($1,$2,$3)", [id(10), id(30), id(3)]);
await db.exec("set role anon");
assert.deepEqual(await recipients(62), [id(1), id(3)]);
const pin = (scene, doc, actor = 1, category = "manual", remove = false) =>
  db.query("select set_instruction_action($1,$2,$3,$4,$5)", [
    id(scene),
    category,
    id(doc),
    id(actor),
    remove,
  ]);
await pin(20, 50);
await pin(20, 50);
assert.equal((await db.query("select * from set_instruction_documents")).rows.length, 1);
await assert.rejects(pin(20, 51), /Choose an available document/);
await assert.rejects(pin(22, 50), /Choose an available document/);
await assert.rejects(pin(20, 50, 8), /active contributor/);
await assert.rejects(pin(20, 50, 7), /active contributor/);
await assert.rejects(pin(20, 50, 1, "invalid"), /check constraint/);
await pin(20, 50, 1, "assembly");
assert.equal((await db.query("select * from set_instruction_documents")).rows.length, 2);
await db.exec("reset role");
await db.query("update documents set deleted_at=now() where id=$1", [id(50)]);
await db.exec("set role anon");
await assert.rejects(pin(20, 50), /Choose an available document/);
// Stale links can still be unpinned without modifying the actual document.
await pin(20, 50, 1, "manual", true);
await db.exec("reset role");
await db.query("update projects set status=$1 where id=$2", ["closed", id(10)]);
await db.exec("set role anon");
await assert.rejects(pin(20, 50, 1, "assembly", true), /archived/);
await db.exec("reset role");
assert.equal((await db.query("select * from documents")).rows.length, 2);
console.log(
  "Passed isolated PostgreSQL: scoped mentions, oversight fallback, anon grants, instruction validation, archive and trash handling.",
);
await db.close();
