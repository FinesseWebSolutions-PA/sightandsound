import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, ChevronRight, Diamond, Link2, Lock, X } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import {
  criticalityMeta,
  dependencyTypeLabel,
  formatDate,
  formatFloat,
  milestoneStatusMeta,
  taskStatusMeta,
} from "@/lib/status";
import { addDays, daysBetween, monthTicks, place, pointAt, spanOf, slipDays } from "@/lib/schedule";
import type { Milestone, ReschedulePreviewRow, Task } from "@/lib/production-data";

/** Bar colouring is driven by the shared calculation, never chosen per view. */
function barClasses(task: Task): string {
  if (task.criticality === "critical") return "bg-danger border-danger";
  if (task.criticality === "near_critical") return "bg-warning border-warning";
  return "bg-info border-info";
}

/** The coloured edge on a row carries the same computed criticality. */
function edgeClasses(task: Task): string {
  if (task.criticality === "critical") return "text-danger";
  if (task.criticality === "near_critical") return "text-warning";
  return "text-info";
}

const todayISO = new Date().toISOString().slice(0, 10);

export function MasterTimeline({ projectId }: { projectId: string }) {
  const { tasks, milestones, can, isClosed } = useStore();
  const locked = isClosed(projectId) || !can.editCoreTimeline;

  const projectMilestones = useMemo(
    () =>
      milestones
        .filter((m) => m.project_id === projectId)
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [milestones, projectId],
  );
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId],
  );
  const span = useMemo(
    () => spanOf(projectTasks, projectMilestones),
    [projectTasks, projectMilestones],
  );
  const ticks = useMemo(() => monthTicks(span), [span]);
  const todayPoint = useMemo(
    () => (todayISO >= span.start && todayISO <= span.end ? pointAt(span, todayISO) : null),
    [span],
  );

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;


  const groups: { milestone: Milestone | null; rows: Task[] }[] = [
    ...projectMilestones.map((m) => ({
      milestone: m,
      rows: projectTasks
        .filter((t) => t.milestone_id === m.id)
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    })),
    {
      milestone: null,
      rows: projectTasks
        .filter((t) => !t.milestone_id || !projectMilestones.some((m) => m.id === t.milestone_id))
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    },
  ].filter((g) => g.rows.length > 0 || g.milestone);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["critical", "near_critical", "normal"] as const).map((c) => (
          <StatusBadge key={c} meta={criticalityMeta[c]} size="sm" />
        ))}
        {locked && (
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-cream px-2.5 py-1 text-xs text-ink-soft">
            <Lock aria-hidden className="size-3.5" /> Dates are read-only for you here
          </span>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="hidden panel-header lg:block">
          <div className="flex">
            <div className="w-[22rem] shrink-0 px-4 py-2">
              <span className="rule-label">Work item</span>
            </div>
            <div className="relative flex-1 px-3 py-2">
              {ticks.map((t) => (
                <span
                  key={t.left}
                  style={{ left: t.left }}
                  className="absolute top-2 -translate-x-1/2 text-xs text-ink-soft"
                >
                  {t.label}
                </span>
              ))}
              <span className="invisible text-xs">months</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {groups.map((group) => {
            const key = group.milestone?.id ?? "unscheduled";
            const isCollapsed = collapsed[key] === true;
            const m = group.milestone;
            const slip = m ? slipDays(m.due_date, m.forecast_date) : 0;
            return (
              <section key={key}>
                <header className="group-header">
                  <button
                    type="button"
                    onClick={() => setCollapsed((cur) => ({ ...cur, [key]: !isCollapsed }))}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-start gap-2 px-4 py-2.5 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
                    ) : (
                      <ChevronDown aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {m && <Diamond aria-hidden className="size-3.5 text-gold-deep" />}
                        <span className="text-xs font-bold tracking-[0.08em] text-ink uppercase">
                          {m ? m.name : "Not tied to a milestone yet"}
                        </span>
                        <span className="rounded-full border border-border-strong bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                          {group.rows.length}
                        </span>
                        {m && <StatusBadge meta={milestoneStatusMeta[m.status]} size="sm" />}
                        {m && <StatusBadge meta={criticalityMeta[m.criticality]} size="sm" />}
                      </span>
                      {m && (
                        <span className="mt-1 block text-xs text-ink-soft">
                          Committed {formatDate(m.due_date)} · Forecast{" "}
                          {formatDate(m.forecast_date)}
                          {slip > 0 && (
                            <span className="font-semibold text-danger"> · {slip} days late</span>
                          )}
                          {m.affects_performance && " · affects performance"}
                        </span>
                      )}
                    </span>
                  </button>
                  {m && (
                    <div className="relative hidden h-5 lg:block">
                      <span
                        style={pointAt(span, m.forecast_date)}
                        className="absolute top-0 ml-[22rem] size-3.5 -translate-x-1/2 rotate-45 border-2 border-gold-deep bg-gold shadow-sm"
                        aria-hidden
                      />
                    </div>
                  )}
                </header>

                {!isCollapsed && (
                  <ul className="divide-y divide-border">
                    {group.rows.map((task) => {
                      const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
                      const bar = place(span, task.forecast_start, task.forecast_finish);
                      const drift = slipDays(task.due_date, task.forecast_finish);
                      return (
                        <li
                          key={task.id}
                          className={`data-row status-edge lg:flex lg:items-stretch ${edgeClasses(task)}`}
                        >
                          <div className="w-full px-4 py-3 lg:w-[22rem] lg:shrink-0 lg:border-r lg:border-border">
                            <div className="flex items-start justify-between gap-3">
                              <Link
                                to="/projects/$projectId/timeline"
                                params={{ projectId }}
                                search={{ task: task.id }}
                                className="text-sm font-semibold text-ink hover:underline"
                              >
                                {task.title}
                              </Link>
                              <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                            </div>
                            <p className="mt-1 text-xs font-medium text-ink-soft">
                              {departments.find((d) => d.id === task.department_id)?.name} ·{" "}
                              {personById(task.assignee_id)?.full_name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                              <StatusBadge meta={criticalityMeta[task.criticality]} size="sm" />
                              <span>{formatFloat(task.total_float_hours)}</span>
                              <span aria-hidden>·</span>
                              <span>
                                {formatDate(task.forecast_start)} –{" "}
                                {formatDate(task.forecast_finish)}
                              </span>
                              {drift > 0 && (
                                <span className="font-semibold text-danger">
                                  {drift} days past plan
                                </span>
                              )}
                            </div>
                            {waitsOn.length > 0 && (
                              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
                                <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                                <span>
                                  {waitsOn
                                    .map(
                                      (d) =>
                                        `${dependencyTypeLabel[d.type]} after ${taskTitle(d.depends_on_task_id)}${d.lag_hours ? ` (+${d.lag_hours}h wait)` : ""}`,
                                    )
                                    .join(" · ")}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="relative hidden h-20 flex-1 px-3 lg:block">
                            {ticks.map((t) => (
                              <span
                                key={t.left}
                                style={{ left: t.left }}
                                aria-hidden
                                className="absolute inset-y-0 w-px bg-border-strong/70"
                              />
                            ))}
                            {todayPoint && (
                              <span
                                style={todayPoint}
                                aria-hidden
                                className="absolute inset-y-0 w-0.5 bg-gold"
                              />
                            )}
                            <span
                              style={place(span, task.start_date, task.due_date)}
                              aria-hidden
                              className="absolute top-4 h-2.5 rounded-full border border-border-strong bg-band"
                            />
                            <span
                              style={bar}
                              title={`${criticalityMeta[task.criticality].label} · ${formatFloat(task.total_float_hours)}`}
                              className={`absolute top-8 flex h-7 items-center overflow-hidden rounded-md border px-2 text-[11px] font-semibold whitespace-nowrap text-cream-soft shadow-sm ${barClasses(task)}`}
                            >
                              {task.criticality === "critical"
                                ? "Critical"
                                : task.criticality === "near_critical"
                                  ? "Tight"
                                  : "Slack"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                    {group.rows.length === 0 && (
                      <li className="px-4 py-3 text-sm text-ink-soft">
                        No work items under this milestone yet.
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {projectTasks.length > 0 && (
        <p className="text-xs text-ink-soft">
          {formatDate(span.start)} – {formatDate(span.end)} ·{" "}
          {daysBetween(span.start, span.end)} days
        </p>
      )}
    </div>
  );
}
