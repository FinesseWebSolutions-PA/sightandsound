import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
await db.exec(`
create role anon;
create table public.people(id uuid primary key,role text,deactivated_at timestamptz);
create table public.projects(id uuid primary key,status text);
create table public.documents(id uuid primary key,project_id uuid,deleted_at timestamptz,requires_approval boolean default false,status text);
create table public.document_versions(id uuid primary key,document_id uuid,version_number int,uploaded_by uuid);
create table public.approvals(id uuid primary key default gen_random_uuid(),document_version_id uuid,requested_by uuid,reviewer_id uuid,status text,decision_note text,requested_at timestamptz default clock_timestamp(),decided_by uuid,decided_at timestamptz);
create table public.notifications(person_id uuid,type text,project_id uuid,source_entity_type text,source_entity_id uuid);
create table public.audit_log(entity_type text,entity_id uuid,actor_id uuid,action text,changes jsonb);
grant select,insert,update on all tables in schema public to anon;
`);
const dir = new URL("../../supabase/migrations/", import.meta.url);
await db.exec(
  readFileSync(
    new URL(
      readdirSync(dir).find((f) => f.endsWith("_temporary_open_upload_approval.sql")),
      dir,
    ),
    "utf8",
  ),
);
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
await db.query("insert into people values($1,$2,null),($3,$4,null),($5,$2,now()),($6,$4,null)", [
  id(1),
  "viewer",
  id(2),
  "contributor",
  id(3),
  id(4),
]);
await db.query("insert into projects values($1,$2)", [id(10), "active"]);
await db.query("insert into documents(id,project_id) values($1,$2)", [id(20), id(10)]);
await db.query("insert into document_versions values($1,$2,1,$3)", [id(30), id(20), id(2)]);
await db.exec("set role anon");
const review = (actor, decision = "approved", version = 30, reviewer = null, note = "") =>
  db.query("select public.review_document($1,$2,$3,$4,$5,$6) as id", [
    id(20),
    id(version),
    decision,
    note,
    id(actor),
    reviewer && id(reviewer),
  ]);
await assert.rejects(review(3), /read-only/);
await assert.rejects(review(99), /read-only/);
await assert.rejects(review(1, "requested", 30, 2), /read-only/);
// Viewer can directly approve an upload without a pending request.
const first = (await review(1)).rows[0].id;
let row = (await db.query("select * from approvals")).rows[0];
assert.equal(row.decided_by, id(1));
assert.equal(row.document_version_id, id(30));
assert.equal(row.requested_by, null);
assert.equal(
  (await db.query("select status,requires_approval from documents")).rows[0].status,
  "approved",
);
assert.equal((await db.query("select * from notifications")).rows[0].person_id, id(2));
assert.equal((await review(4)).rows[0].id, first);
assert.equal((await db.query("select count(*)::int as n from audit_log")).rows[0].n, 1);
assert.equal((await db.query("select decided_by from approvals")).rows[0].decided_by, id(1));
// Non-assigned viewer can approve a new revision requested from someone else.
await db.query("insert into document_versions values($1,$2,2,$3)", [id(31), id(20), id(2)]);
await review(2, "requested", 31, 4);
await assert.rejects(
  review(2, "changes_requested", 31, null, "Revise bracket"),
  /assigned reviewer/,
);
await assert.rejects(review(1, "approved", 30), /newer version/);
await review(1, "approved", 31);
row = (await db.query("select * from approvals where document_version_id=$1", [id(31)])).rows[0];
assert.equal(row.reviewer_id, id(4));
assert.equal(row.decided_by, id(1));
assert.equal(row.requested_by, id(2));
// Viewer can also be selected as the intended reviewer.
await db.query("insert into document_versions values($1,$2,3,$3)", [id(32), id(20), id(2)]);
await review(2, "requested", 32, 1);
await db.query("update projects set status='closed'");
await assert.rejects(review(1, "approved", 32), /read-only/);
await db.query("update projects set status='active'");
await db.query("update documents set deleted_at=now()");
await assert.rejects(review(1, "approved", 32), /unavailable/);
await db.close();
console.log(
  "Passed open upload approval: viewer, non-assignee, direct upload, audit identity, repeat approval, stale revision, inactive actor, closed and deleted guards.",
);
