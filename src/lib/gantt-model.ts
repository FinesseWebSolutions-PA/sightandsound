import type { Scene, Task, TaskDependency } from "./production-data";
import type { SetStage } from "./stages-data";
import { addDays, daysBetween } from "./schedule.ts";
export type GanttRow = {
  key: string;
  kind: "set" | "stage" | "task" | "department";
  name: string;
  depth: number;
  tasks: Task[];
  task?: Task;
  sceneId?: string;
  stageId?: string;
  expandable: boolean;
};
export function ganttRows(
  tasks: Task[],
  sets: Scene[],
  stages: SetStage[],
  collapsed: Set<string>,
  group: "sets" | "departments",
  departmentNames: Map<string, string>,
  query = "",
  department = "",
  onlyCritical = false,
) {
  const own = new Map<string, Task[]>();
  const children = new Map<string, Task[]>();
  const matched = new Set(
    tasks
      .filter(
        (t) =>
          (!department || t.department_id === department) &&
          (!onlyCritical || t.criticality === "critical") &&
          (!query || t.title.toLowerCase().includes(query.toLowerCase())),
      )
      .map((t) => t.id),
  );
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const id of [...matched]) {
    let t = byId.get(id);
    const seen = new Set<string>();
    while (t?.parent_task_id && !seen.has(t.parent_task_id)) {
      seen.add(t.parent_task_id);
      matched.add(t.parent_task_id);
      t = byId.get(t.parent_task_id);
    }
  }
  for (const t of tasks) {
    if (!matched.has(t.id)) continue;
    const list = own.get(t.scene_id) ?? [];
    list.push(t);
    own.set(t.scene_id, list);
    if (t.parent_task_id) {
      const c = children.get(t.parent_task_id) ?? [];
      c.push(t);
      children.set(t.parent_task_id, c);
    }
  }
  const rows: GanttRow[] = [];
  function taskRows(items: Task[], prefix: string, depth: number) {
    const ids = new Set(items.map((t) => t.id));
    const seen = new Set<string>();
    function visit(t: Task, d: number) {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      const key = prefix + "task:" + t.id;
      const kids = (children.get(t.id) ?? []).filter((c) => ids.has(c.id));
      rows.push({
        key,
        kind: "task",
        name: t.title,
        depth: d,
        tasks: [t],
        task: t,
        sceneId: t.scene_id,
        stageId: t.stage_id,
        expandable: kids.length > 0,
      });
      if (!collapsed.has(key) || query) for (const c of kids) visit(c, d + 1);
    }
    for (const t of items) if (!t.parent_task_id || !ids.has(t.parent_task_id)) visit(t, depth);
  }
  function setRows(s: Scene, items: Task[], prefix: string, depth: number) {
    const key = prefix + "set:" + s.id;
    rows.push({
      key,
      kind: "set",
      name: s.name,
      depth,
      tasks: items,
      sceneId: s.id,
      expandable: true,
    });
    if (collapsed.has(key) && !query) return;
    const stagesOwn = stages
      .filter((st) => st.scene_id === s.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const st of [...stagesOwn, { id: "", name: "Independent tasks" }]) {
      const subset = items.filter((t) => (t.stage_id || "") === st.id);
      if (!subset.length && (query || department || onlyCritical || group === "departments"))
        continue;
      const sk = key + ":stage:" + st.id;
      rows.push({
        key: sk,
        kind: "stage",
        name: st.name,
        depth: depth + 1,
        tasks: subset,
        sceneId: s.id,
        stageId: st.id,
        expandable: subset.length > 0,
      });
      if (!collapsed.has(sk) || query) taskRows(subset, prefix, depth + 2);
    }
  }
  if (group === "sets") {
    for (const s of sets) {
      const items = own.get(s.id) ?? [];
      if (items.length || (!query && !department && !onlyCritical)) setRows(s, items, "", 0);
    }
  } else
    for (const [id, name] of departmentNames) {
      const items = tasks.filter((t) => matched.has(t.id) && t.department_id === id);
      if (!items.length) continue;
      const key = "dept:" + id;
      rows.push({ key, kind: "department", name, depth: 0, tasks: items, expandable: true });
      if (collapsed.has(key) && !query) continue;
      for (const s of sets) {
        const si = items.filter((t) => t.scene_id === s.id);
        if (si.length) setRows(s, si, key + ":", 1);
      }
    }
  return rows;
}
export function visibleWindow(
  total: number,
  scrollTop: number,
  height: number,
  rowHeight = 44,
  overscan = 6,
) {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  return { start, end: Math.min(total, Math.ceil((scrollTop + height) / rowHeight) + overscan) };
}
export function shiftDates(
  start: string,
  finish: string,
  days: number,
  kind: "move" | "start" | "finish",
) {
  if (!start || !finish) return null;
  const s = kind === "finish" ? start : addDays(start, days);
  const f = kind === "start" ? finish : addDays(finish, days);
  return daysBetween(s, f) < 0 ? null : { start: s, finish: f };
}
export function taskSpan(tasks: Task[], mode: "plan" | "forecast") {
  let start = "",
    finish = "";
  for (const t of tasks) {
    const s = mode === "plan" ? t.start_date : t.forecast_start || t.start_date;
    const f = mode === "plan" ? t.due_date : t.forecast_finish || t.due_date;
    if (s && (!start || s < start)) start = s;
    if (f && (!finish || f > finish)) finish = f;
  }
  return { start, finish };
}
export function dependencyEnds(type: TaskDependency["type"]) {
  return {
    from: type === "start_to_start" || type === "start_to_finish" ? "start" : "finish",
    to: type === "finish_to_finish" || type === "start_to_finish" ? "finish" : "start",
  } as const;
}
