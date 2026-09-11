import type { Project, Task } from "./production-data";

type KeyDate = { label: string; date: string; upcoming: boolean };

/** Show the next committed key date; label historical dates without calling them upcoming. */
export function nextProductionKeyDate(
  project: Pick<Project, "status" | "design_lock_date" | "first_rehearsal_date" | "opening_date">,
  today: string,
): KeyDate | null {
  const dates = [
    { label: "Design lock", date: project.design_lock_date },
    { label: "First rehearsal", date: project.first_rehearsal_date },
    { label: "Opening", date: project.opening_date },
  ]
    .filter((item) => Boolean(item.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = project.status !== "closed" && dates.find((item) => item.date >= today);
  if (next) return { ...next, upcoming: true };
  const latest = dates.at(-1);
  return latest ? { ...latest, upcoming: false } : null;
}

/** Each work item occupies one attention slot, even when it is both blocked and late. */
export function attentionWork<T extends Pick<Task, "status" | "forecast_finish" | "due_date">>(
  tasks: T[],
  today: string,
): { task: T; blocked: boolean; late: boolean; target: string }[] {
  return tasks
    .filter((task) => task.status !== "complete")
    .map((task) => {
      const target = task.forecast_finish || task.due_date;
      return {
        task,
        target,
        blocked: task.status === "blocked",
        late: Boolean(target && target < today),
      };
    })
    .filter((item) => item.blocked || item.late)
    .sort(
      (a, b) =>
        Number(b.blocked) - Number(a.blocked) ||
        (a.target || "9999").localeCompare(b.target || "9999"),
    );
}
