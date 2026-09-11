import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`
create role anon;create role authenticated;create role service_role;
create table approvals(id uuid primary key);
create function public.review_document(uuid,uuid,text,text,uuid,uuid) returns uuid language plpgsql as $$ declare result uuid=gen_random_uuid(); begin insert into public.approvals(id) values(result); return result; end $$;
create table people(id uuid primary key,role text,deactivated_at timestamptz);
create table departments(id uuid primary key,default_owner_id uuid);
create table department_memberships(department_id uuid,person_id uuid,is_lead boolean);
create table project_departments(project_id uuid,department_id uuid,default_owner_id uuid);
create table project_assignments(project_id uuid,scene_id uuid,department_id uuid,person_id uuid,is_head boolean);
create table projects(id uuid primary key,status text);
create table scenes(id uuid primary key,project_id uuid);
create table discussion_threads(id uuid primary key default gen_random_uuid(),project_id uuid,context_type text,scene_id uuid,task_id uuid,document_id uuid,created_by uuid);
create table comments(id uuid primary key,thread_id uuid);
create table notifications(id uuid primary key default gen_random_uuid(),person_id uuid,type text,source_comment_id uuid);
grant select,insert,update on all tables in schema public to anon,authenticated;
`);
const dir = new URL("../../supabase/migrations/", import.meta.url);
await db.exec(
  readFileSync(
    new URL(
      readdirSync(dir).find((f) => f.endsWith("_personal_workflow_ux.sql")),
      dir,
    ),
    "utf8",
  ),
);
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
await db.query("insert into people values($1,$3,null),($2,$3,null),($4,$5,null)", [
  id(1),
  id(2),
  "contributor",
  id(3),
  "viewer",
]);
await db.query("insert into projects values($1,$2)", [id(10), "active"]);
await db.query("insert into scenes values($1,$2)", [id(20), id(10)]);
await db.exec("set role anon");
const main = async (actor = 1) =>
  (await db.query("select ensure_set_chat($1,$2) as id", [id(20), id(actor)])).rows[0].id;
const thread = await main();
assert.equal(await main(), thread);
assert.equal(await main(2), thread);
await assert.rejects(main(3), /contributor/);
const act = async (actor, action, payload = {}) =>
  (
    await db.query("select personal_workflow($1,$2,$3) as state", [
      id(actor),
      action,
      JSON.stringify(payload),
    ])
  ).rows[0].state;
await act(1, "read", { thread_id: thread, at: "2026-01-01T10:00:00Z" });
await act(1, "read", { thread_id: thread, at: "2026-01-01T09:00:00Z" });
assert.equal(
  new Date((await act(1, "get")).reads[0].last_read_at).toISOString(),
  "2026-01-01T10:00:00.000Z",
);
assert.equal((await act(2, "get")).reads.length, 0);
await act(1, "follow", { thread_id: thread, mode: "following" });
assert.equal((await db.query("select * from conversation_followers($1)", [thread])).rows.length, 1);
await act(1, "follow", { thread_id: thread, mode: "muted" });
await db.query("insert into comments values($1,$2)", [id(50), thread]);
await db.query("insert into notifications(person_id,type,source_comment_id) values($1,$2,$3)", [
  id(1),
  "new_message",
  id(50),
]);
assert.equal((await db.query("select * from notifications")).rows.length, 0);
await db.query(
  "insert into notifications(id,person_id,type,source_comment_id) values($1,$2,$3,$4)",
  [id(60), id(1), "mention", id(50)],
);
assert.equal((await db.query("select * from notifications")).rows.length, 1);
await assert.rejects(
  act(2, "notification", { notification_id: id(60), dismissed: true }),
  /another person/,
);
await act(1, "notification", { notification_id: id(60), dismissed: true });
assert.equal((await act(1, "get")).notifications[0].dismissed, true);
await act(1, "notification", { notification_id: id(60), dismissed: false });
assert.equal((await act(1, "get")).notifications[0].dismissed, false);
await assert.rejects(
  act(1, "preferences", { desktop: true, mode: "invalid", quiet_start: 24, quiet_end: 7 }),
  /constraint/,
);
await db.query("select request_document_review($1,$2,$3,$4,$5,$6)", [
  id(90),
  id(91),
  "Check clearance",
  id(1),
  id(2),
  "2099-01-01",
]);
assert.equal(
  (await db.query("select due_date::text from approvals")).rows[0].due_date,
  "2099-01-01",
);
await assert.rejects(
  db.query("select request_document_review($1,$2,$3,$4,$5,$6)", [
    id(90),
    id(91),
    "",
    id(1),
    id(2),
    "2000-01-01",
  ]),
  /future review date/,
);
await db.exec("reset role");
await db.query("update projects set status=$1", ["closed"]);
await db.exec("set role anon");
await assert.rejects(main(), /archived/);
console.log(
  "Passed personal workflow SQL: one main chat, viewer/archive guards, monotonic cross-device reads, explicit followers, muted reply filtering, mention delivery and actor-scoped notification actions.",
);
await db.close();
