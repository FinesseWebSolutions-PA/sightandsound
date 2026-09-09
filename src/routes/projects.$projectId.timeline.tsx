import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Link2, Lock } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import { formatDate, milestoneStatusMeta, taskStatusMeta } from "@/lib/status";
import type { Task, TaskStatus } from "@/lib/production-data";

export const Route = createFileRoute("/projects/$projectId/timeline")({
  head: () => ({
    meta: [
      { title: "Production timeline — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Milestones and work items with due dates, ownership, status, and what each item waits on.",
      },
      { property: "og:title", content: "Production timeline — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Milestones and work items with due dates, ownership, status, and dependencies.",
      },
    ],
  }),
  component: TimelineTab,
});

// Matches the values the tasks table accepts.
const statusOptions: TaskStatus[] = ["not_started", "in_progress", "blocked", "complete"];

type TaskViewProps = {
  rows: Task[];
  canUpdate: boolean;
  onStatus: (taskId: string, status: TaskStatus) => void;
  taskTitle: (id: string) => string;
  emptyLabel: string;
};

function StatusControl({
  task,
  canUpdate,
  onStatus,
  size,
}: {
  task: Task;
  canUpdate: boolean;
  onStatus: (taskId: string, status: TaskStatus) => void;
  size: "sm" | "touch";
}) {
  if (!canUpdate) return <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />;
  return (
    <div className="space-y-1.5">
      <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
      <select
        aria-label={`Status for ${task.title}`}
        value={task.status}
        onChange={(e) => onStatus(task.id, e.target.value as TaskStatus)}
        className={
          size === "touch"
            ? "block min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink"
            : "block rounded-md border border-border bg-card px-2 py-1 text-xs text-ink"
        }
      >
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {taskStatusMeta[s].label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Phone view: each work item is its own stacked card, dependencies written out as text. */
function TaskCards({ rows, canUpdate, onStatus, taskTitle, emptyLabel }: TaskViewProps) {
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-ink-soft lg:hidden">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-border lg:hidden">
      {rows.map((task) => {
        const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
        const blocks = taskDependencies.filter((d) => d.depends_on_task_id === task.id);
        return (
          <li key={task.id} className="space-y-2 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">{task.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {departments.find((d) => d.id === task.department_id)?.name} ·{" "}
                {personById(task.assignee_id)?.full_name}
              </p>
            </div>
            <p className="text-xs text-ink-soft">Due {formatDate(task.due_date)}</p>
            {waitsOn.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-ink-soft">
                <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                <span>
                  <span className="font-semibold">Waits on:</span>{" "}
                  {waitsOn.map((d) => taskTitle(d.depends_on_task_id)).join(", ")}
                </span>
              </p>
            )}
            {blocks.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-ink-soft">
                <ArrowUpRight aria-hidden className="mt-0.5 size-3 shrink-0" />
                <span>
                  <span className="font-semibold">Blocks:</span>{" "}
                  {blocks.map((b) => taskTitle(b.task_id)).join(", ")}
                </span>
              </p>
            )}
            <StatusControl task={task} canUpdate={canUpdate} onStatus={onStatus} size="touch" />
          </li>
        );
      })}
    </ul>
  );
}

function TaskTable({ rows, canUpdate, onStatus, taskTitle, emptyLabel }: TaskViewProps) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[46rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="rule-label px-4 py-2">Work item</th>
            <th className="rule-label px-4 py-2">Department</th>
            <th className="rule-label px-4 py-2">Team member</th>
            <th className="rule-label px-4 py-2">Due</th>
            <th className="rule-label px-4 py-2">Waits on</th>
            <th className="rule-label px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((task) => {
            const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
            const blocks = taskDependencies.filter((d) => d.depends_on_task_id === task.id);
            return (
              <tr key={task.id} className="align-top">
                <td className="px-4 py-3">
                  <span className="text-ink">{task.title}</span>
                  <span className="code-id mt-0.5 block">{task.id}</span>
                  {blocks.length > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-ink-soft">
                      <ArrowUpRight aria-hidden className="size-3" />
                      Blocks {blocks.map((b) => taskTitle(b.task_id)).join(", ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {departments.find((d) => d.id === task.department_id)?.name}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {personById(task.assignee_id)?.full_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                  {formatDate(task.due_date)}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {waitsOn.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="space-y-1">
                      {waitsOn.map((d) => (
                        <li key={d.depends_on_task_id} className="flex items-start gap-1.5">
                          <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                          <span>{taskTitle(d.depends_on_task_id)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusControl task={task} canUpdate={canUpdate} onStatus={onStatus} size="sm" />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-3 text-ink-soft">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TaskList(props: TaskViewProps) {
  return (
    <>
      <TaskCards {...props} />
      <TaskTable {...props} />
    </>
  );
}

function TimelineTab() {
  const { projectId } = Route.useParams();
  const { projects, milestones, tasks, can, setTaskStatus, setMilestoneDate, isClosed } =
    useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const locked = isClosed(projectId);
  const canEditDates = can.editCoreTimeline && !locked;
  const canUpdate = can.updateWork && !locked;

  const projectMilestones = milestones
    .filter((m) => m.project_id === projectId)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const unscheduled = projectTasks
    .filter((t) => !t.milestone_id || !projectMilestones.some((m) => m.id === t.milestone_id))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-ink">Timeline</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Milestones in date order, with the work items under each one. Core milestone dates are
            edited by Admins; anyone assigned can move their own work forward.
          </p>
        </div>
        {!canEditDates && (
          <p className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-ink-soft">
            <Lock aria-hidden className="size-3.5" />
            {locked
              ? "This production is closed — the timeline is read-only for everyone"
              : "Core milestone dates are read-only in your role"}
          </p>
        )}
      </div>

      <div className="space-y-5">
        {projectMilestones.map((milestone) => {
          const milestoneTasks = projectTasks
            .filter((t) => t.milestone_id === milestone.id)
            .sort((a, b) => a.due_date.localeCompare(b.due_date));
          return (
            <section key={milestone.id} className="surface-card overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-border bg-cream-soft px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">{milestone.name}</h3>
                    {milestone.is_core && (
                      <span className="rule-label inline-flex items-center gap-1">
                        <Lock aria-hidden className="size-3" /> Core
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {[
                      departments.find((d) => d.id === milestone.department_id)?.name,
                      personById(milestone.owner_id)?.full_name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusBadge meta={milestoneStatusMeta[milestone.status]} size="sm" />
                <div className="ml-auto flex items-center gap-2">
                  <span className="rule-label">Due</span>
                  {canEditDates ? (
                    <input
                      type="date"
                      aria-label={`Due date for ${milestone.name}`}
                      value={milestone.due_date}
                      onChange={(e) => setMilestoneDate(milestone.id, e.target.value)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-xs text-ink"
                    />
                  ) : (
                    <span className="text-sm text-ink">{formatDate(milestone.due_date)}</span>
                  )}
                </div>
              </header>

              <TaskTable
                rows={milestoneTasks}
                canUpdate={canUpdate}
                onStatus={setTaskStatus}
                taskTitle={taskTitle}
                emptyLabel="No work items under this milestone yet."
              />
            </section>
          );
        })}

        {unscheduled.length > 0 && (
          <section className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b border-border bg-cream-soft px-4 py-3">
              <h3 className="text-base font-semibold text-ink">Not tied to a milestone yet</h3>
              <span className="text-xs text-ink-soft">
                Work items that still need to be placed on the schedule
              </span>
            </header>
            <TaskTable
              rows={unscheduled}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
              taskTitle={taskTitle}
              emptyLabel="Nothing here."
            />
          </section>
        )}

        {projectMilestones.length === 0 && unscheduled.length === 0 && (
          <p className="surface-card p-4 text-sm text-ink-soft">
            No milestones or work items on this production yet.
          </p>
        )}
      </div>
    </div>
  );
}
