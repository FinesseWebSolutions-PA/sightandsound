import assert from "node:assert/strict";
import test from "node:test";
import { attentionWork, nextProductionKeyDate } from "../src/lib/production-overview.ts";

const today = "2026-09-11";
const project = {
  status: "active",
  design_lock_date: "2026-09-10",
  first_rehearsal_date: "2026-09-15",
  opening_date: "2026-10-01",
};
const task = (id, overrides = {}) => ({
  id,
  status: "in_progress",
  forecast_finish: "",
  due_date: "",
  ...overrides,
});

test("missing dates do not create false late alerts, and completed work stays out", () => {
  assert.deepEqual(
    attentionWork(
      [
        task("undated"),
        task("complete", { status: "complete", forecast_finish: "2026-09-01" }),
        task("today", { due_date: today }),
        task("future", { forecast_finish: "2026-09-12" }),
      ],
      today,
    ),
    [],
  );
});

test("an overdue due date is used when a work item has no forecast", () => {
  const [alert] = attentionWork([task("late", { due_date: "2026-09-10" })], today);
  assert.equal(alert.task.id, "late");
  assert.equal(alert.late, true);
  assert.equal(alert.target, "2026-09-10");
});

test("the current forecast takes precedence over the committed due date", () => {
  assert.deepEqual(
    attentionWork(
      [task("rescheduled", { due_date: "2026-09-01", forecast_finish: "2026-09-15" })],
      today,
    ),
    [],
  );
});

test("blocked late work occupies one slot and blocked work is prioritized", () => {
  const tasks = [
    task("late", { due_date: "2026-09-01" }),
    task("blocked", { status: "blocked", due_date: "2026-09-10" }),
    task("blocked-undated", { status: "blocked" }),
  ];
  const alerts = attentionWork(tasks, today);
  assert.deepEqual(
    alerts.map((item) => item.task.id),
    ["blocked", "blocked-undated", "late"],
  );
  assert.equal(alerts[0].blocked, true);
  assert.equal(alerts[0].late, true);
  assert.equal(alerts[1].late, false);
  assert.deepEqual(
    tasks.map((item) => item.id),
    ["late", "blocked", "blocked-undated"],
  );
});

test("portfolio shows the next key date instead of always showing opening", () => {
  assert.deepEqual(nextProductionKeyDate(project, today), {
    label: "First rehearsal",
    date: "2026-09-15",
    upcoming: true,
  });
});

test("today's key date is still upcoming and dates are selected chronologically", () => {
  assert.deepEqual(nextProductionKeyDate({ ...project, opening_date: today }, today), {
    label: "Opening",
    date: today,
    upcoming: true,
  });
});

test("historical and closed productions do not claim to have an upcoming date", () => {
  assert.deepEqual(nextProductionKeyDate(project, "2026-11-01"), {
    label: "Opening",
    date: "2026-10-01",
    upcoming: false,
  });
  assert.equal(nextProductionKeyDate({ ...project, status: "closed" }, today).upcoming, false);
});

test("a production without key dates has no fabricated date", () => {
  assert.equal(
    nextProductionKeyDate(
      {
        status: "planning",
        design_lock_date: "",
        first_rehearsal_date: "",
        opening_date: "",
      },
      today,
    ),
    null,
  );
});
