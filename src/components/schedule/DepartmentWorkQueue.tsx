import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Clock,
  CornerDownRight,
  Layers,
  Link2,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, taskDependencies, personById, useStore } from "@/lib/store";
import {
  criticalityMeta,
  dependencyTypeLabel,
  formatDate,
  formatFloat,
  scheduleHealth,
} from "@/lib/status";
import { daysBetween, toISO } from "@/lib/schedule";
import type { Task } from "@/lib/production-data";

type Group = {
  key: string;
  label: string;
  Icon: typeof AlertTriangle;
  tone: "danger" | "warning" | "info" | "neutral";
  tasks: Task[];
};

export function DepartmentWorkQueue({
  projectId,
  onAddWork,
}: {
  projectId: string;
  /** Present only when the viewer may plan work; opens the editor for that department. */
  onAddWork?: (departmentId: string) => void;
}) {
  const { tasks, scenes: projectScenes } = useStore();
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId],
  );

  const present = departments.filter((d) => projectTasks.some((t) => t.department_id === d.id));
  const [active, setActive] = useState<string>("all");
  const today = toISO(new Date());

  const shown = active === "all" ? present : present.filter((d) => d.id === active);
  const taskById = (id: string) => tasks.find((t) => t.id === id);
  const sceneById = (id: string) => projectScenes.find((s) => s.id === id);

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
          const late = open.filter(
            (t) => !blocked.includes(t) && scheduleHealth(t, new Date(`${today}T12:00:00Z`)).lateDays > 0,
          );
          const dueSoon = open.filter((t) => {
            if (blocked.includes(t) || late.includes(t)) return false;
            const days = daysBetween(today, t.forecast_finish);
            return days >= 0 && days <= 14;
          });
          const later = open.filter(
            (t) => !blocked.includes(t) && !late.includes(t) && !dueSoon.includes(t),
          );

          const groups: Group[] = [
            { key: "blocked", label: "Blocked", Icon: Ban, tone: "danger", tasks: blocked },
            { key: "late", label: "Late", Icon: AlertTriangle, tone: "danger", tasks: late },
            { key: "due_soon", label: "Due soon", Icon: Clock, tone: "warning", tasks: dueSoon },
            { key: "later", label: "Later", Icon: Layers, tone: "neutral", tasks: later },
          ].filter((g) => g.tasks.length > 0);

          return (
            <section key={dept.id} className="surface-card overflow-hidden">
              <header className="panel-header flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-ink">{dept.name}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {open.length} open · {blocked.length} blocked · {late.length} late ·{" "}
                    {dueSoon.length} due soon
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
                <div className="divide-y divide-border">
                  {groups.map((group) => (
                    <div key={group.key}>
                      <p
                        className={`rule-label flex items-center gap-1.5 px-4 pt-3 pb-1 ${
                          group.tone === "danger"
                            ? "text-danger"
                            : group.tone === "warning"
                              ? "text-warning"
                              : "text-ink-soft"
                        }`}
                      >
                        <group.Icon aria-hidden className="size-3.5" />
                        {group.label} ({group.tasks.length})
                      </p>
                      <ul className="row-list">
                        {group.tasks.map((task) => {
                          const blocks = blockers(task);
                          const health = scheduleHealth(task, new Date(`${today}T12:00:00Z`));
                          const scene = sceneById(task.scene_id);
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
                                    <span className="font-semibold text-ink-soft">
                                      {scene?.name ?? "No set assigned"}
                                    </span>
                                    {" · "}
                                    {dept.name}
                                    {" · "}
                                    {task.parent_task_id
                                      ? `Part of ${taskById(task.parent_task_id)?.title ?? "another work item"} · `
                                      : ""}
                                    {personById(task.assignee_id)?.full_name ?? "Unassigned"}
                                  </p>
                                </div>
                                <StatusBadge meta={health.meta} size="sm" />
                              </div>
                              <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                                <CalendarClock aria-hidden className="size-3.5" />
                                Forecast finish {formatDate(task.forecast_finish)}
                                {health.detail && <span>· {health.detail}</span>}
                              </p>
                              {!health.urgent && (
                                <StatusBadge meta={criticalityMeta[task.criticality]} size="sm" />
                              )}
                              {!health.urgent && task.total_float_hours !== null && (
                                <p className="text-xs text-ink-soft">
                                  {formatFloat(task.total_float_hours)}
                                </p>
                              )}
                              {blocks.length > 0 && (
                                <div className="rounded-md border border-danger/25 bg-danger-bg px-3 py-2">
                                  <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                                    <AlertTriangle aria-hidden className="size-3.5" /> Blocked by
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
                              {blocks.length === 0 && task.status === "blocked" && (
                                <div className="rounded-md border border-danger/25 bg-danger-bg px-3 py-2">
                                  <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                                    <AlertTriangle aria-hidden className="size-3.5" /> Blocked —
                                    no upstream work item found; check with the owning department.
                                  </p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
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
