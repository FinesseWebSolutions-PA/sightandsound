import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Link2, Lock, MessageSquare } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { Discussion } from "@/components/Discussion";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import { formatDate, formatDateTime, milestoneStatusMeta, taskStatusMeta } from "@/lib/status";
import { activityFor, snippet } from "@/lib/threads";
import type { Task, TaskStatus } from "@/lib/production-data";

export const Route = createFileRoute("/projects/$projectId/timeline")({
  validateSearch: (search: Record<string, unknown>): { task?: string; comment?: string } => ({
    ...(typeof search['task'] === "string" ? { task: search['task'] } : {}),
    ...(typeof search['comment'] === "string" ? { comment: search['comment'] } : {}),
  }),

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
  openTaskId: string | null;
  onToggleThread: (taskId: string) => void;
  highlightCommentId?: string;
};

/** The conversation about one work item, shown right where the work item is listed. */
function TaskConversation({
  task,
  open,
  onToggle,
  highlightCommentId,
}: {
  task: Task;
  open: boolean;
  onToggle: () => void;
  highlightCommentId?: string;
}) {
  const { threads, comments } = useStore();
  const activity = activityFor(threads, comments, {
    projectId: task.project_id,
    taskId: task.id,
  });
  const latest = activity.latest;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex min-h-11 w-full items-start gap-2 rounded-md border border-border bg-cream-soft px-3 py-2 text-left transition-colors hover:bg-cream sm:w-auto"
      >
        <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-ink">
            {activity.count === 0
              ? open
                ? "Hide comments"
                : "Add a comment"
              : `${activity.count} comment${activity.count === 1 ? "" : "s"}${open ? " — hide" : ""}`}
          </span>
          {latest && !open && (
            <span className="mt-0.5 block max-w-md truncate text-xs text-ink-soft">
              {personById(latest.author_id)?.full_name}, {formatDateTime(latest.created_at)}:{" "}
              {snippet(latest.body, 70)}
            </span>
          )}
        </span>
      </button>
      {open && (
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <Discussion
            inline
            projectId={task.project_id}
            contextType="task"
            taskId={task.id}
            {...(highlightCommentId ? { highlightCommentId } : {})}
          />
        </div>
      )}
    </div>
  );
}


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
function TaskCards({
  rows,
  canUpdate,
  onStatus,
  taskTitle,
  emptyLabel,
  openTaskId,
  onToggleThread,
  highlightCommentId,
}: TaskViewProps) {
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
            <TaskConversation
              task={task}
              open={openTaskId === task.id}
              onToggle={() => onToggleThread(task.id)}
              {...(highlightCommentId ? { highlightCommentId } : {})}
            />
          </li>
        );
      })}
    </ul>
  );
}

function TaskTable({
  rows,
  canUpdate,
  onStatus,
  taskTitle,
  emptyLabel,
  openTaskId,
  onToggleThread,
  highlightCommentId,
}: TaskViewProps) {
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
              <Fragment key={task.id}>
              <tr className="align-top">

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
              <tr>
                <td colSpan={6} className="px-4 pb-3">
                  <TaskConversation
                    task={task}
                    open={openTaskId === task.id}
                    onToggle={() => onToggleThread(task.id)}
                    {...(highlightCommentId ? { highlightCommentId } : {})}
                  />
                </td>
              </tr>
              </Fragment>
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
  const search = Route.useSearch();
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

  // Arriving from the Inbox or the Dashboard opens that work item's thread straight away.
  const [openTaskId, setOpenTaskId] = useState<string | null>(search.task ?? null);
  useEffect(() => {
    if (search.task) setOpenTaskId(search.task);
  }, [search.task]);

  const threadProps = {
    openTaskId,
    onToggleThread: (id: string) => setOpenTaskId((cur) => (cur === id ? null : id)),
    ...(search.comment ? { highlightCommentId: search.comment } : {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">Timeline</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Milestones in date order, with the work items under each one. Core milestone dates are
            edited by Admins; anyone assigned can move their own work forward.
          </p>
        </div>
        {!canEditDates && (
          <p className="flex items-start gap-1.5 rounded-md border border-border bg-cream px-3 py-2 text-xs text-ink-soft">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
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
              <header className="border-b border-border bg-cream-soft px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
                  <StatusBadge meta={milestoneStatusMeta[milestone.status]} size="sm" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:ml-auto">
                  <span className="rule-label">Due</span>
                  {canEditDates ? (
                    <input
                      type="date"
                      aria-label={`Due date for ${milestone.name}`}
                      value={milestone.due_date}
                      onChange={(e) => setMilestoneDate(milestone.id, e.target.value)}
                      className="min-h-11 rounded-md border border-border bg-card px-2.5 text-base text-ink sm:min-h-0 sm:py-1 sm:text-xs"
                    />
                  ) : (
                    <span className="text-sm text-ink">{formatDate(milestone.due_date)}</span>
                  )}
                </div>
              </header>

              <TaskList
                rows={milestoneTasks}
                canUpdate={canUpdate}
                onStatus={setTaskStatus}
                taskTitle={taskTitle}
                emptyLabel="No work items under this milestone yet."
                {...threadProps}
              />
            </section>
          );
        })}

        {unscheduled.length > 0 && (
          <section className="surface-card overflow-hidden">
            <header className="border-b border-border bg-cream-soft px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <h3 className="text-base font-semibold text-ink">Not tied to a milestone yet</h3>
              <span className="mt-0.5 block text-xs text-ink-soft sm:mt-0">
                Work items that still need to be placed on the schedule
              </span>
            </header>
            <TaskList
              rows={unscheduled}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
              taskTitle={taskTitle}
              emptyLabel="Nothing here."
              {...threadProps}
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
