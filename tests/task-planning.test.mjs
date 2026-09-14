import assert from "node:assert/strict";
import test from "node:test";
import {
  taskPrerequisites,
  taskReadiness,
  stageGroups,
  stageSummary,
  taskRows,
} from "../src/lib/task-planning.ts";
const task = (id, extra = {}) => ({
  id,
  title: id,
  scene_id: "set-a",
  stage_id: "",
  parent_task_id: "",
  project_id: "show",
  status: "not_started",
  start_date: "2026-09-01",
  due_date: "2026-09-03",
  actual_start: "",
  actual_finish: "",
  ...extra,
});
const dep = (type, extra = {}) => ({
  id: "dep",
  task_id: "next",
  depends_on_task_id: "first",
  type,
  lag_hours: 0,
  hard_constraint: true,
  ...extra,
});
test("parallel start dependencies release after start; finish gates do not block starting", () => {
  const first = task("first", { status: "in_progress" }),
    next = task("next");
  assert.equal(taskReadiness(next, [dep("start_to_start")], [first, next]).blocked, false);
  assert.equal(taskReadiness(next, [dep("finish_to_start")], [first, next]).blocked, true);
  const result = taskReadiness(next, [dep("finish_to_finish")], [first, next]);
  assert.equal(result.blocked, false);
  assert.equal(result.finishWaiting, true);
  assert.equal(taskReadiness(next, [dep("start_to_finish")], [first, next]).finishWaiting, false);
});
test("buffers use actual handoff dates, retain fractional days and ignore forecasts as evidence", () => {
  const next = task("next"),
    first = task("first", { status: "complete", actual_finish: "2026-09-10" });
  assert.equal(
    taskPrerequisites(
      next,
      [dep("finish_to_start", { lag_hours: 25 })],
      [first, next],
      "2026-09-11",
    ).length,
    1,
  );
  assert.equal(
    taskPrerequisites(
      next,
      [dep("finish_to_start", { lag_hours: 25 })],
      [first, next],
      "2026-09-12",
    ).length,
    0,
  );
  const unknown = task("first", { status: "complete", forecast_finish: "2026-09-01" });
  assert.match(
    taskPrerequisites(
      next,
      [dep("finish_to_start", { lag_hours: 24 })],
      [unknown, next],
      "2026-09-12",
    )[0].message,
    /Confirm the actual/,
  );
});
test("advisory dependencies and completed tasks do not become blocked; missing hard prerequisites do", () => {
  const first = task("first"),
    next = task("next");
  assert.equal(
    taskReadiness(next, [dep("finish_to_start", { hard_constraint: false })], [first, next])
      .blocked,
    false,
  );
  assert.equal(
    taskReadiness(task("next", { status: "complete" }), [dep("finish_to_start")], [first]).blocked,
    false,
  );
  assert.equal(taskReadiness(next, [dep("finish_to_start")], [next]).blocked, true);
  assert.equal(taskReadiness(task("next", { status: "blocked" }), [], []).blocked, true);
});
test("stage summaries support concurrent and return work without double-counting parents", () => {
  const stages = [
    { id: "eng", scene_id: "set-a", name: "Engineering", sort_order: 1 },
    { id: "metal", scene_id: "set-a", name: "Metal", sort_order: 2 },
    { id: "return", scene_id: "set-a", name: "Metal return", sort_order: 3 },
    { id: "foreign", scene_id: "set-b", name: "Paint", sort_order: 1 },
  ];
  const tasks = [
    task("parent", { stage_id: "eng", status: "in_progress" }),
    task("child", { stage_id: "eng", parent_task_id: "parent", status: "complete" }),
    task("parallel", { stage_id: "metal", status: "in_progress" }),
    task("later", { stage_id: "return", start_date: "2026-10-01", due_date: "2026-10-03" }),
    task("independent"),
    task("other", { scene_id: "set-b", stage_id: "foreign" }),
  ];
  const groups = stageGroups(tasks, stages, "set-a");
  assert.equal(groups.length, 4);
  assert.equal(groups.flatMap((g) => g.tasks).length, 5);
  assert.equal(stageSummary(groups[0].tasks).total, 1);
  assert.equal(stageSummary(groups[0].tasks).done, 1);
  assert.equal(stageSummary(groups[1].tasks).status, "Active");
  assert.equal(stageSummary(groups[2].tasks).start, "2026-10-01");
  assert.equal(groups[3].tasks[0].id, "independent");
});
test("filtering a parent away does not hide its matching subtask; undated tasks remain counted", () => {
  const child = task("child", { parent_task_id: "parent", start_date: "", due_date: "" });
  assert.equal(taskRows([child])[0].id, "child");
  assert.equal(stageSummary([child]).undated, 1);
  assert.deepEqual(
    taskRows([child, task("parent")]).map((t) => t.id),
    ["parent", "child"],
  );
});
