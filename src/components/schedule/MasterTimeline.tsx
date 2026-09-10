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
  if (task.criticality === "critical") return "bg-danger/85 border-danger";
  if (task.criticality === "near_critical") return "bg-warning/80 border-warning";
  return "bg-info/70 border-info";
}

type PreviewState = {
  task: Task;
  start: string;
  finish: string;
  rows: ReschedulePreviewRow[] | null;
  error: string | null;
};

function ImpactPreview({
  state,
  onClose,
  onConfirm,
}: {
  state: PreviewState;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const crossings = (state.rows ?? []).filter((r) => r.crosses_protected_date);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-xl border border-border bg-card p-4 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl text-ink">Before you move this work</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {state.task.title} — new dates {formatDate(state.start)} to {formatDate(state.finish)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border text-ink-soft"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {state.error && (
          <p className="mt-4 rounded-md border border-danger/25 bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        {!state.rows && !state.error && (
          <p className="mt-4 text-sm text-ink-soft">Working out what this would affect…</p>
        )}

        {state.rows && (
          <div className="mt-4 space-y-3">
            {crossings.length > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-bg px-3 py-2 text-sm text-danger">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  This would push {crossings.length} item
                  {crossings.length === 1 ? "" : "s"} past a rehearsal or performance date.
                </span>
              </p>
            )}
            {state.rows.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing downstream would move.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {state.rows.map((row) => (
                  <li key={`${row.entity_type}-${row.entity_id}`} className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-ink">
                      {row.entity_type === "milestone" ? "Milestone: " : ""}
                      {row.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatDate(row.current_finish)} → {formatDate(row.new_finish)} ·{" "}
                      {row.shift_days > 0
                        ? `${row.shift_days} day${row.shift_days === 1 ? "" : "s"} later`
                        : "no change"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {row.affects_rehearsal && (
                        <span className="rule-label text-warning">Affects rehearsal</span>
                      )}
                      {row.affects_performance && (
                        <span className="rule-label text-danger">Affects performance</span>
                      )}
                      {row.crosses_protected_date && (
                        <span className="rule-label text-danger">
                          Crosses {row.protected_label ?? "a protected date"}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-ink"
          >
            Keep current dates
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!state.rows}
            className="min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-cream-soft disabled:opacity-50"
          >
            Move the work
          </button>
        </div>
      </div>
    </div>
  );
}

export function MasterTimeline({ projectId }: { projectId: string }) {
  const { tasks, milestones, previewReschedule, setTaskDates, can, isClosed } = useStore();
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

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;

  async function openPreview(task: Task, shift: number) {
    const start = addDays(task.start_date, shift);
    const finish = addDays(task.due_date, shift);
    setPreview({ task, start, finish, rows: null, error: null });
    try {
      const rows = await previewReschedule(task.id, start, finish);
      setPreview((cur) => (cur && cur.task.id === task.id ? { ...cur, rows } : cur));
    } catch (err) {
      setPreview((cur) =>
        cur && cur.task.id === task.id
          ? { ...cur, error: err instanceof Error ? err.message : "Could not work that out." }
          : cur,
      );
    }
  }

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
                <header className="bg-cream-soft/60">
                  <button
                    type="button"
                    onClick={() => setCollapsed((cur) => ({ ...cur, [key]: !isCollapsed }))}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-start gap-2 px-4 py-3 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                    ) : (
                      <ChevronDown aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {m && <Diamond aria-hidden className="size-3.5 text-gold-deep" />}
                        <span className="text-sm font-semibold text-ink">
                          {m ? m.name : "Not tied to a milestone yet"}
                        </span>
                        {m && <StatusBadge meta={milestoneStatusMeta[m.status]} size="sm" />}
                        {m && <StatusBadge meta={criticalityMeta[m.criticality]} size="sm" />}
                      </span>
                      {m && (
                        <span className="mt-1 block text-xs text-ink-soft">
                          Committed {formatDate(m.due_date)} · Forecast{" "}
                          {formatDate(m.forecast_date)}
                          {slip > 0 && <span className="text-danger"> · {slip} days late</span>}
                          {m.affects_performance && " · affects performance"}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-ink-soft">
                        {group.rows.length} work item{group.rows.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                  {m && (
                    <div className="relative hidden h-6 lg:block">
                      <span
                        style={pointAt(span, m.forecast_date)}
                        className="absolute top-0 ml-[22rem] size-3 -translate-x-1/2 rotate-45 border border-gold-deep bg-gold"
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
                        <li key={task.id} className="lg:flex lg:items-start">
                          <div className="w-full px-4 py-3 lg:w-[22rem] lg:shrink-0">
                            <Link
                              to="/projects/$projectId/timeline"
                              params={{ projectId }}
                              search={{ task: task.id }}
                              className="text-sm font-semibold text-ink hover:underline"
                            >
                              {task.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {departments.find((d) => d.id === task.department_id)?.name} ·{" "}
                              {personById(task.assignee_id)?.full_name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                              <StatusBadge meta={criticalityMeta[task.criticality]} size="sm" />
                              <span className="text-xs text-ink-soft">
                                {formatFloat(task.total_float_hours)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-ink-soft">
                              {formatDate(task.forecast_start)} – {formatDate(task.forecast_finish)}
                              {drift > 0 && (
                                <span className="text-danger"> · {drift} days past plan</span>
                              )}
                            </p>
                            {waitsOn.map((d) => (
                              <p
                                key={d.id}
                                className="mt-1 flex items-start gap-1.5 text-xs text-ink-soft"
                              >
                                <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                                <span>
                                  {dependencyTypeLabel[d.type]} after{" "}
                                  {taskTitle(d.depends_on_task_id)}
                                  {d.lag_hours ? ` (+${d.lag_hours}h wait)` : ""}
                                </span>
                              </p>
                            ))}
                          </div>

                          <div className="relative hidden h-16 flex-1 px-3 lg:block">
                            {ticks.map((t) => (
                              <span
                                key={t.left}
                                style={{ left: t.left }}
                                aria-hidden
                                className="absolute inset-y-0 w-px bg-border"
                              />
                            ))}
                            <span
                              style={place(span, task.start_date, task.due_date)}
                              aria-hidden
                              className="absolute top-3 h-2 rounded-full border border-border bg-cream"
                            />
                            <span
                              style={bar}
                              title={`${criticalityMeta[task.criticality].label} · ${formatFloat(task.total_float_hours)}`}
                              className={`absolute top-6 flex h-6 items-center overflow-hidden rounded-md border px-1.5 text-[10px] font-semibold whitespace-nowrap text-cream-soft ${barClasses(task)}`}
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

      <p className="text-xs text-ink-soft">
        The pale bar is the committed plan; the coloured bar is the live forecast from the shared
        schedule calculation. Nudging a work item always shows its knock-on effect first.
        {projectTasks.length > 0 &&
          ` Window: ${formatDate(span.start)} – ${formatDate(span.end)} (${daysBetween(span.start, span.end)} days).`}
      </p>

      {preview && (
        <ImpactPreview
          state={preview}
          onClose={() => setPreview(null)}
          onConfirm={() => {
            setTaskDates(preview.task.id, preview.start, preview.finish);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
