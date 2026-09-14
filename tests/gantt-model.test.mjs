import assert from "node:assert/strict";
import test from "node:test";
import { ganttRows, visibleWindow, shiftDates, dependencyEnds } from "../src/lib/gantt-model.ts";
const task = (id, parent = "", stage = "metal") => ({
  id,
  title: id,
  parent_task_id: parent,
  scene_id: "set",
  stage_id: stage,
  department_id: "shop",
  criticality: "normal",
});
const sets = [{ id: "set", name: "Courtyard" }],
  stages = [{ id: "metal", scene_id: "set", name: "Metal", sort_order: 1 }];
test("Gantt retains hierarchy when searching for a subtask", () => {
  const rows = ganttRows(
    [task("Frame"), task("Brackets", "Frame")],
    sets,
    stages,
    new Set(),
    "sets",
    new Map(),
    "Brackets",
  );
  assert.deepEqual(
    rows.map((r) => r.name),
    ["Courtyard", "Metal", "Frame", "Brackets"],
  );
  assert.equal(rows.at(-1).depth, 3);
});
test("Collapsing a set hides its stages and tasks without changing tasks", () => {
  const rows = ganttRows([task("Frame")], sets, stages, new Set(["set:set"]), "sets", new Map());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].tasks.length, 1);
});
test("Independent work stays under its set", () => {
  const rows = ganttRows([task("Inspection", "", "")], sets, stages, new Set(), "sets", new Map());
  assert.ok(rows.some((r) => r.name === "Independent tasks"));
  assert.equal(rows.at(-1).task.scene_id, "set");
});
test("Virtual window stays bounded at 5,000 rows", () => {
  const w = visibleWindow(5000, 70000, 600);
  assert.ok(w.end - w.start < 30);
  assert.ok(w.start > 1500);
});
test("Moving across daylight savings preserves calendar dates and duration", () => {
  assert.deepEqual(shiftDates("2026-03-07", "2026-03-09", 2, "move"), {
    start: "2026-03-09",
    finish: "2026-03-11",
  });
  assert.equal(shiftDates("2026-03-07", "2026-03-09", 3, "start"), null);
});
test("All relationship types attach to correct ends", () => {
  assert.deepEqual(dependencyEnds("finish_to_start"), { from: "finish", to: "start" });
  assert.deepEqual(dependencyEnds("start_to_finish"), { from: "start", to: "finish" });
  assert.deepEqual(dependencyEnds("finish_to_finish"), { from: "finish", to: "finish" });
  assert.deepEqual(dependencyEnds("start_to_start"), { from: "start", to: "start" });
});
