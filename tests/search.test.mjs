import assert from "node:assert/strict";
import test from "node:test";
import { searchAll } from "../src/lib/search.ts";

const sources = {
  projects: [
    {
      id: "p1",
      name: "The Prodigal's Return",
      code: "PR-26",
      subtitle: "New production",
      summary: "A story of home",
      owner_id: "u1",
    },
  ],
  departments: [{ id: "lighting", name: "Lighting" }],
  people: [{ id: "u1", full_name: "Renée Miller" }],
  milestones: [{ id: "m1", name: "Design lock" }],
  tasks: [
    {
      id: "t1",
      project_id: "p1",
      title: "Focus overhead rig",
      description: "Check balcony coverage",
      department_id: "lighting",
      assignee_id: "u1",
      milestone_id: "m1",
    },
  ],
  documents: [
    {
      id: "d1",
      project_id: "p1",
      title: "Rigging plan",
      kind: "Drawing",
      folder: "Balcony",
      owner_id: "u1",
      department_id: "lighting",
      current_version: 3,
    },
  ],
  threads: [
    { id: "th1", project_id: "p1", task_id: "t1", document_id: null, subject: "Focus notes" },
  ],
  comments: [
    { id: "c1", thread_id: "th1", author_id: "u1", body: "The balcony fixture is ready." },
  ],
};
const ids = (query) => searchAll(sources, query).map((hit) => hit.id);

test("blank and single-character queries do not return every item", () => {
  assert.deepEqual(ids("  "), []);
  assert.deepEqual(ids("a"), []);
});

test("task descriptions and document folders are searchable", () => {
  assert.deepEqual(ids("coverage"), ["t-t1"]);
  assert.deepEqual(ids("balcony"), ["t-t1", "d-d1", "c-c1"]);
});

test("multiple terms can match across department, title, and team member", () => {
  assert.deepEqual(ids("lighting overhead renee"), ["t-t1"]);
  assert.deepEqual(ids("lighting nonexistent"), []);
});

test("case, accents, and extra whitespace do not prevent a match", () => {
  assert.deepEqual(ids("  RENEE   OVERHEAD  "), ["t-t1", "c-c1"]);
});

test("production codes and milestone names find work in context", () => {
  assert.deepEqual(ids("PR-26 coverage"), ["t-t1"]);
  assert.deepEqual(ids("design lock overhead"), ["t-t1"]);
});

test("comment results preserve task and comment links", () => {
  const [hit] = searchAll(sources, "renee fixture");
  assert.equal(hit.kind, "comment");
  assert.equal(hit.projectId, "p1");
  assert.equal(hit.taskId, "t1");
  assert.equal(hit.commentId, "c1");
  assert.match(hit.excerpt, /fixture/);
});

test("comments with missing threads are ignored instead of creating broken links", () => {
  assert.deepEqual(searchAll({ ...sources, threads: [] }, "fixture"), []);
});

test("sets are searchable and preserve their set link", () => {
  const hits = searchAll(
    {
      projects: [],
      tasks: [],
      documents: [],
      milestones: [],
      departments: [],
      people: [],
      threads: [],
      comments: [],
      scenes: [{ id: "village", project_id: "prod", name: "Village Marketplace", owner_id: "" }],
    },
    "Village",
  );
  assert.equal(hits[0].kind, "set");
  assert.equal(hits[0].sceneId, "village");
  assert.equal(hits[0].projectId, "prod");
});
