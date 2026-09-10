import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CornerDownRight,
  Link2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import {
  criticalityMeta,
  dependencyTypeLabel,
  formatDate,
  formatFloat,
  taskStatusMeta,
} from "@/lib/status";
import { daysBetween, toISO } from "@/lib/schedule";
import type { Task } from "@/lib/production-data";

export function DepartmentWorkQueue({
  projectId,
  onAddWork,
}: {
  projectId: string;
  /** Present only when the viewer may plan work; opens the editor for that department. */
  onAddWork?: (departmentId: string) => void;
}) {
  const { tasks } = useStore();
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId],
  );

  const present = departments.filter((d) => projectTasks.some((t) => t.department_id === d.id));
  const [active, setActive] = useState<string>("all");
  const today = toISO(new Date());

  const shown = active === "all" ? present : present.filter((d) => d.id === active);
  const taskById = (id: string) => tasks.find((t) => t.id === id);

  function blockers(task: Task) {
    return taskDependencies
      .filter((d) => d.task_id === task.id)
      .map((d) => ({ dep: d, upstream: taskById(d.depends_on_task_id) }))
      .filter((b) => b.upstream && b.upstream.status !== "complete");
  }

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: "all", name: "All departments" }, ...present].map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(d.id)}
            aria-pressed={active === d.id}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${
              active === d.id
                ? "chip-selected"
                : "border-border bg-card text-ink-soft"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((dept) => {
          const rows = projectTasks
            .filter((t) => t.department_id === dept.id)
            .sort((a, b) => a.forecast_finish.localeCompare(b.forecast_finish));
          const openRaw = rows.filter((t) => t.status !== "complete");
          // Sub-items are listed straight under the work item they belong to.
          const open: Task[] = [];
          for (const t of openRaw) {
            if (t.parent_task_id && openRaw.some((p) => p.id === t.parent_task_id)) continue;
            open.push(t);
            for (const c of openRaw.filter((c) => c.parent_task_id === t.id)) open.push(c);
          }
          const blocked = open.filter((t) => t.status === "blocked" || blockers(t).length > 0);
          const dueSoon = open.filter((t) => {
            const days = daysBetween(today, t.forecast_finish);
            return days >= 0 && days <= 14;
          });
          return (
            <section key={dept.id} className="surface-card overflow-hidden">
              <header className="panel-header flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink">{dept.name}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {open.length} open · {blocked.length} blocked · {dueSoon.length} due within two
                    weeks
                  </p>
                </div>
                {onAddWork && (
                  <button
                    type="button"
                    onClick={() => onAddWork(dept.id)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-semibold text-ink"
                  >
                    <Plus aria-hidden className="size-4" />
                    Add work
                  </button>
                )}
              </header>
              {open.length === 0 ? (
                <p className="px-4 py-4 text-sm text-ink-soft">Nothing open for this department.</p>
              ) : (
                <ul className="row-list">
                  {open.map((task) => {
                    const blocks = blockers(task);
                    const days = daysBetween(today, task.forecast_finish);
                    return (
                      <li
                        key={task.id}
                        className={`space-y-2 py-3 pr-4 ${task.parent_task_id ? "pl-9" : "pl-4"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to="/projects/$projectId/timeline"
                              params={{ projectId }}
                              search={{ task: task.id }}
                              className={`flex items-start gap-1.5 hover:underline ${task.parent_task_id ? "text-sm font-medium text-ink" : "text-sm font-semibold text-ink"}`}
                            >
                              {task.parent_task_id && (
                                <CornerDownRight
                                  aria-hidden
                                  className="mt-0.5 size-3.5 shrink-0 text-ink-soft"
                                />
                              )}
                              {task.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {task.parent_task_id
                                ? `Part of ${taskById(task.parent_task_id)?.title ?? "another work item"} · `
                                : ""}
                              {personById(task.assignee_id)?.full_name ?? "Unassigned"} ·{" "}
                              {formatFloat(task.total_float_hours)}
                            </p>
                          </div>
                          <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                        </div>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                          <CalendarClock aria-hidden className="size-3.5" />
                          Forecast finish {formatDate(task.forecast_finish)}
                          {days >= 0 && days <= 14 && (
                            <span className="font-semibold text-warning">
                              · due in {days} day{days === 1 ? "" : "s"}
                            </span>
                          )}
                          {days < 0 && (
                            <span className="font-semibold text-danger">
                              · {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"} overdue
                            </span>
                          )}
                        </p>
                        <StatusBadge meta={criticalityMeta[task.criticality]} size="sm" />
                        {blocks.length > 0 && (
                          <div className="rounded-md border border-danger/25 bg-danger-bg px-3 py-2">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                              <AlertTriangle aria-hidden className="size-3.5" /> Waiting on other
                              work
                            </p>
                            <ul className="mt-1 space-y-1">
                              {blocks.map(({ dep, upstream }) => (
                                <li key={dep.id} className="text-xs text-ink-soft">
                                  <Link
                                    to="/projects/$projectId/timeline"
                                    params={{ projectId }}
                                    search={{ task: upstream!.id }}
                                    className="inline-flex items-start gap-1.5 underline decoration-dotted"
                                  >
                                    <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                                    <span>
                                      {upstream!.title} —{" "}
                                      {departments.find((d) => d.id === upstream!.department_id)
                                        ?.name ?? "unassigned department"}{" "}
                                      ({dependencyTypeLabel[dep.type]})
                                    </span>
                                  </Link>
                                  <Link
                                    to="/projects/$projectId/timeline"
                                    params={{ projectId }}
                                    search={{ task: upstream!.id, ask: upstream!.department_id }}
                                    className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-gold-deep hover:underline"
                                  >
                                    <MessageSquare aria-hidden className="size-3.5" />
                                    Ask{" "}
                                    {departments.find((d) => d.id === upstream!.department_id)
                                      ?.name ?? "the department"}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {shown.length === 0 && (
          <p className="surface-card p-4 text-sm text-ink-soft">
            No department work on this production yet.
          </p>
        )}
      </div>
    </div>
  );
}
