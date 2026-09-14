import type { Task, TaskDependency } from "./production-data";
import type { SetStage } from "./stages-data";
export type Prerequisite = {
  dep: TaskDependency;
  upstream: Task | undefined;
  gate: "start" | "finish";
  message: string;
};
/** A finish constraint does not prevent starting parallel work. Never infer an actual handoff from a forecast. */
export function taskPrerequisites(
  task: Task,
  dependencies: TaskDependency[],
  tasks: Task[],
  today = new Date().toISOString().slice(0, 10),
): Prerequisite[] {
  if (task.status === "complete") return [];
  return dependencies
    .filter((d) => d.task_id === task.id && d.hard_constraint)
    .flatMap((dep) => {
      const upstream = tasks.find((t) => t.id === dep.depends_on_task_id);
      const gate =
        dep.type === "finish_to_start" || dep.type === "start_to_start" ? "start" : "finish";
      const needsStart = dep.type === "start_to_start" || dep.type === "start_to_finish";
      const occurred =
        upstream &&
        (needsStart
          ? Boolean(upstream.actual_start) ||
            ["in_progress", "in_review", "complete"].includes(upstream.status)
          : upstream.status === "complete");
      const label = needsStart ? "start" : "completion";
      let message = `Waiting for ${label} of “${upstream?.title ?? "unavailable prerequisite"}”`;
      if (occurred) {
        if (dep.lag_hours <= 0) return [];
        const actual = needsStart ? upstream!.actual_start : upstream!.actual_finish;
        if (actual) {
          const ready = new Date(
            Date.parse(actual.slice(0, 10) + "T12:00:00Z") +
              Math.ceil(dep.lag_hours / 24) * 86400000,
          )
            .toISOString()
            .slice(0, 10);
          if (today >= ready) return [];
          message = `Buffer after “${upstream!.title}” ends ${ready}`;
        } else
          message = `Confirm the actual ${label} date of “${upstream!.title}” to check its ${dep.lag_hours}-hour buffer`;
      }
      return [{ dep, upstream, gate, message }];
    });
}
export function taskReadiness(task: Task, deps: TaskDependency[], tasks: Task[], today?: string) {
  const prerequisites = taskPrerequisites(task, deps, tasks, today);
  const start = prerequisites.filter((p) => p.gate === "start");
  const finish = prerequisites.filter((p) => p.gate === "finish");
  return {
    blocked: task.status !== "complete" && (task.status === "blocked" || start.length > 0),
    finishWaiting: finish.length > 0,
    start,
    finish,
    prerequisites,
  };
}
export function stageGroups(tasks: Task[], stages: SetStage[], sceneId: string) {
  const own = tasks.filter((t) => t.scene_id === sceneId);
  const configured = stages
    .filter((s) => s.scene_id === sceneId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const groups = configured.map((stage) => ({
    id: stage.id,
    name: stage.name,
    stage,
    tasks: own.filter((t) => t.stage_id === stage.id),
  }));
  const ids = new Set(configured.map((s) => s.id));
  return [
    ...groups,
    {
      id: "",
      name: "Independent tasks",
      stage: undefined,
      tasks: own.filter((t) => !t.stage_id || !ids.has(t.stage_id)),
    },
  ];
}
export function stageSummary(tasks: Task[]) {
  const parents = new Set(tasks.map((t) => t.parent_task_id).filter(Boolean));
  const leaves = tasks.filter((t) => !parents.has(t.id));
  const done = leaves.filter((t) => t.status === "complete").length;
  const starts = leaves
    .map((t) => t.start_date)
    .filter(Boolean)
    .sort();
  const finishes = leaves
    .map((t) => t.due_date)
    .filter(Boolean)
    .sort();
  const active = leaves.some((t) => ["in_progress", "in_review", "blocked"].includes(t.status));
  return {
    total: leaves.length,
    done,
    status:
      leaves.length === 0
        ? "No tasks"
        : done === leaves.length
          ? "Complete"
          : active
            ? "Active"
            : "Not started",
    start: starts[0] ?? "",
    finish: finishes.at(-1) ?? "",
    undated: leaves.filter((t) => !t.start_date || !t.due_date).length,
  };
}
/** Keep matching subtasks discoverable even when their parent is filtered out. */
export function taskRows(tasks: Task[]) {
  const ids = new Set(tasks.map((t) => t.id));
  return tasks
    .filter((t) => !t.parent_task_id || !ids.has(t.parent_task_id))
    .flatMap((t) => [t, ...tasks.filter((c) => c.parent_task_id === t.id)]);
}
