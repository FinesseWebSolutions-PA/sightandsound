import { Link } from "@tanstack/react-router";
import { ArrowUpRight, FileText, Link2, MessageSquare, Users, X } from "lucide-react";
import { useEffect } from "react";

import { Discussion } from "@/components/Discussion";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import {
  criticalityMeta,
  dependencyTypeLabel,
  formatDate,
  formatFloat,
  taskStatusMeta,
} from "@/lib/status";
import type { TaskStatus } from "@/lib/production-data";

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "blocked", "complete"];

/**
 * One work item, opened in place: the essentials, what it waits on, the drawings
 * attached to it, and its conversation — without leaving the schedule.
 */
export function TaskDetailPanel({
  taskId,
  onClose,
  highlightCommentId,
  askDepartmentId,
}: {
  taskId: string;
  onClose: () => void;
  highlightCommentId?: string;
  askDepartmentId?: string;
}) {
  const { tasks, documents, milestones, scenes, can, setTaskStatus, isClosed } = useStore();
  const task = tasks.find((t) => t.id === taskId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  const locked = isClosed(task.project_id);
  const canUpdate = can.updateWork && !locked;
  const dept = departments.find((d) => d.id === task.department_id);
  const milestone = milestones.find((m) => m.id === task.milestone_id);
  const scene = scenes.find((s) => s.id === task.scene_id);
  const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
  const blocks = taskDependencies.filter((d) => d.depends_on_task_id === task.id);
  const attached = documents.filter((d) => d.task_id === task.id);
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;

  const askDept = askDepartmentId ? departments.find((d) => d.id === askDepartmentId) : undefined;
  const draft = askDept ? `@${askDept.name} ` : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close work item"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30"
      />
      <aside
        role="dialog"
        aria-label={task.title}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-cream-soft px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="rule-label">
              {dept?.name ?? "Work item"}
              {milestone ? ` · ${milestone.name}` : ""}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-ink">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream hover:text-ink"
            aria-label="Close"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="space-y-5 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
            <StatusBadge meta={criticalityMeta[task.criticality]} size="sm" />
            <span className="text-xs text-ink-soft">{formatFloat(task.total_float_hours)}</span>
          </div>

          {canUpdate && (
            <label className="block">
              <span className="rule-label">Update status</span>
              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(e) => setTaskStatus(task.id, e.target.value as TaskStatus)}
                className="mt-1 block min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {taskStatusMeta[s].label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="rule-label">Team member</dt>
              <dd className="mt-0.5 text-ink">
                {personById(task.assignee_id)?.full_name ?? "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="rule-label">Due</dt>
              <dd className="mt-0.5 text-ink">{formatDate(task.due_date)}</dd>
            </div>
            <div>
              <dt className="rule-label">Forecast finish</dt>
              <dd className="mt-0.5 text-ink">{formatDate(task.forecast_finish)}</dd>
            </div>
            {scene && (
              <div>
                <dt className="rule-label">Scene</dt>
                <dd className="mt-0.5 text-ink">{scene.name}</dd>
              </div>
            )}
          </dl>

          {(waitsOn.length > 0 || blocks.length > 0) && (
            <div className="space-y-2 rounded-md border border-border bg-cream-soft px-3 py-2.5">
              {waitsOn.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Link2 aria-hidden className="size-3.5" /> Waits on
                  </p>
                  <ul className="mt-1 space-y-1">
                    {waitsOn.map((d) => (
                      <li key={d.id} className="text-xs text-ink-soft">
                        {taskTitle(d.depends_on_task_id)} ({dependencyTypeLabel[d.type]})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {blocks.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <ArrowUpRight aria-hidden className="size-3.5" /> Blocks
                  </p>
                  <ul className="mt-1 space-y-1">
                    {blocks.map((b) => (
                      <li key={b.id} className="text-xs text-ink-soft">
                        {taskTitle(b.task_id)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {attached.length > 0 && (
            <div>
              <p className="rule-label">Drawings and documents</p>
              <ul className="mt-1 space-y-1">
                {attached.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      to="/projects/$projectId/documents"
                      params={{ projectId: task.project_id }}
                      search={{ document: doc.id }}
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-gold-deep hover:underline"
                    >
                      <FileText aria-hidden className="size-3.5" />
                      {doc.title} — v{doc.current_version}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <MessageSquare aria-hidden className="size-4 text-gold-deep" /> Conversation
            </p>
            {askDept && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-soft">
                <Users aria-hidden className="mt-0.5 size-3 shrink-0" />
                Asking {askDept.name} — their owner and leads will be notified.
              </p>
            )}
            <div className="mt-2">
              <Discussion
                inline
                projectId={task.project_id}
                contextType="task"
                taskId={task.id}
                initialDraft={draft}
                autoFocusComposer={Boolean(askDept)}
                {...(highlightCommentId ? { highlightCommentId } : {})}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
