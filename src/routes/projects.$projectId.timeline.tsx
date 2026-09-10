import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Clock, Link2, Lock, MessageSquare } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { TaskDetailPanel } from "@/components/TaskDetailPanel";

import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentWorkQueue } from "@/components/schedule/DepartmentWorkQueue";
import { MasterTimeline } from "@/components/schedule/MasterTimeline";
import { SceneReadinessMatrix } from "@/components/schedule/SceneReadinessMatrix";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import { formatDate, formatDateTime, milestoneStatusMeta, taskStatusMeta } from "@/lib/status";
import { activityFor, snippet } from "@/lib/threads";
import type { Task, TaskStatus } from "@/lib/production-data";

/** The scheduling views a person can switch between. */
const views = [
  {
    id: "master",
    label: "Master Timeline",
    blurb: "Milestones, dependencies and the critical path",
  },
  {
    id: "queue",
    label: "Department Work Queue",
    blurb: "What each department owes, and what's blocking it",
  },
  { id: "scenes", label: "Scene Readiness", blurb: "Scene by scene, department by department" },
  { id: "list", label: "Work & conversations", blurb: "Milestone list with comments in place" },
] as const;

type ViewId = (typeof views)[number]["id"];

const comingSoon = [
  { label: "Capacity Heat Map", blurb: "Where crew hours are over-committed, week by week" },
  { label: "Load-in / Load-out Gantt", blurb: "Hour-by-hour plan for moving into the theatre" },
  { label: "Show-Day Command Dashboard", blurb: "One live screen for the day of a performance" },
  {
    label: "Role-based presets",
    blurb: "Ready-made views for Executive, Vendor/Procurement and Recovery",
  },
];

export const Route = createFileRoute("/projects/$projectId/timeline")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { task?: string; comment?: string; view?: string; ask?: string } => ({
    ...(typeof search["task"] === "string" ? { task: search["task"] } : {}),
    ...(typeof search["comment"] === "string" ? { comment: search["comment"] } : {}),
    ...(typeof search["view"] === "string" ? { view: search["view"] } : {}),
    ...(typeof search["ask"] === "string" ? { ask: search["ask"] } : {}),
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
  onOpenTask: (taskId: string) => void;
};

/** Comment count and latest message for one work item; opens the work item in place. */
function TaskCommentsButton({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { threads, comments } = useStore();
  const activity = activityFor(threads, comments, {
    projectId: task.project_id,
    taskId: task.id,
  });
  const latest = activity.latest;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex min-h-11 w-full items-start gap-2 rounded-md border border-border bg-cream-soft px-3 py-2 text-left transition-colors hover:bg-cream sm:w-auto"
    >
      <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
      <span className="block min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ink">
          {activity.count === 0
            ? "Comment"
            : `${activity.count} comment${activity.count === 1 ? "" : "s"}`}
        </span>
        {latest && (
          <span className="mt-0.5 block text-xs break-words text-ink-soft">
            {personById(latest.author_id)?.full_name}, {formatDateTime(latest.created_at)}:{" "}
            {snippet(latest.body, 70)}
          </span>
        )}
      </span>
    </button>
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
  onOpenTask,
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
              <button
                type="button"
                onClick={() => onOpenTask(task.id)}
                className="text-left text-sm font-semibold text-ink underline decoration-transparent hover:decoration-gold-deep"
              >
                {task.title}
              </button>
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
            <TaskCommentsButton task={task} onOpen={() => onOpenTask(task.id)} />
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
  onOpenTask,
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
                    <button
                      type="button"
                      onClick={() => onOpenTask(task.id)}
                      className="text-left text-ink underline decoration-transparent hover:decoration-gold-deep"
                    >
                      {task.title}
                    </button>
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
                    <StatusControl
                      task={task}
                      canUpdate={canUpdate}
                      onStatus={onStatus}
                      size="sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 pb-3">
                    <TaskCommentsButton task={task} onOpen={() => onOpenTask(task.id)} />
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

  // Arriving from My Work, the Dashboard or a blocker link opens that work item in place.
  const navigate = useNavigate();
  const [openTaskId, setOpenTaskId] = useState<string | null>(search.task ?? null);
  useEffect(() => {
    if (search.task) setOpenTaskId(search.task);
  }, [search.task]);

  // "Ask <Department>" is taken from the link once, then dropped from the address so
  // it cannot keep re-prefilling the message box.
  const [askId, setAskId] = useState<string | null>(search.ask ?? null);
  useEffect(() => {
    if (!search.ask) return;
    setAskId(search.ask);
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next["ask"];
        return next;
      },
      replace: true,
    });
  }, [search.ask, navigate]);

  const threadProps = {
    onOpenTask: (id: string) => setOpenTaskId(id),
  };

  const initialView: ViewId = views.some((v) => v.id === search.view)
    ? (search.view as ViewId)
    : "master";
  const [view, setView] = useState<ViewId>(initialView);

  const activeView = views.find((v) => v.id === view) ?? views[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">Schedule</h2>
        </div>
        {!canEditDates && (
          <p className="flex items-start gap-1.5 rounded-md border border-border bg-cream px-3 py-2 text-xs text-ink-soft">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {locked
              ? "This production is closed — the schedule is read-only for everyone"
              : "Core dates are read-only in your role"}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div
          role="tablist"
          aria-label="Schedule views"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                view === v.id
                  ? "border-gold-deep bg-gold-pale text-ink"
                  : "border-border bg-card text-ink-soft"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-soft">{activeView.blurb}</p>
      </div>

      {view === "master" && <MasterTimeline projectId={projectId} />}
      {view === "queue" && <DepartmentWorkQueue projectId={projectId} />}
      {view === "scenes" && <SceneReadinessMatrix projectId={projectId} />}

      {view !== "list" && (
        <section className="surface-card p-4">
          <h3 className="text-sm font-semibold text-ink">Coming soon</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            Planned views that need data the system does not collect yet.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {comingSoon.map((item) => (
              <li
                key={item.label}
                aria-disabled="true"
                className="rounded-md border border-dashed border-border bg-cream-soft px-3 py-2.5"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                  <Clock aria-hidden className="size-3.5" />
                  {item.label}
                  <span className="rule-label ml-1">Coming soon</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{item.blurb}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={view === "list" ? "space-y-5" : "hidden"}>
        {projectMilestones.map((milestone) => {
          const milestoneTasks = projectTasks
            .filter((t) => t.milestone_id === milestone.id)
            .sort((a, b) => a.due_date.localeCompare(b.due_date));
          return (
            <section key={milestone.id} className="surface-card overflow-hidden">
              <header className="panel-header px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
            <header className="panel-header px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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

      {openTaskId && (
        <TaskDetailPanel
          taskId={openTaskId}
          onClose={() => {
            setOpenTaskId(null);
            setAskId(null);
          }}
          {...(search.comment ? { highlightCommentId: search.comment } : {})}
          {...(askId ? { askDepartmentId: askId } : {})}
        />
      )}
    </div>
  );
}
