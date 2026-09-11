import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CornerDownRight,
  FileText,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Discussion } from "@/components/Discussion";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import {
  approvalStateMeta,
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
  onEdit,
  onAddSubTask,
}: {
  taskId: string;
  onClose: () => void;
  highlightCommentId?: string;
  askDepartmentId?: string;
  /** Present only when the viewer may restructure this work item. */
  onEdit?: (taskId: string) => void;
  /** Opens the single task form with this work item preset as the parent. */
  onAddSubTask?: (parentTaskId: string) => void;
}) {
  const {
    tasks,
    documents,
    scenes,

    can,
    setTaskStatus,
    unapprovedDocuments,
    isClosed,
    uploadDocument,
    saving,
  } = useStore();
  // A sub-task opens in the same panel, with the same features, and a way back up.
  const [activeId, setActiveId] = useState(taskId);
  const task = tasks.find((t) => t.id === activeId) ?? tasks.find((t) => t.id === taskId);
  // An "Ask <Department>" prefill is used once: after the message is sent it is gone.
  const [askUsed, setAskUsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // A fresh work item, or a fresh department to ask, starts the prefill over so it
  // never carries across to another work item.
  useEffect(() => {
    setAskUsed(false);
    setActiveId(taskId);
  }, [taskId, askDepartmentId]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  const locked = isClosed(task.project_id);
  const pendingDocs = unapprovedDocuments(task.id);
  const canUpdate = can.updateWork && !locked;
  const dept = departments.find((d) => d.id === task.department_id);
  
  const scene = scenes.find((s) => s.id === task.scene_id);
  const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
  const blocks = taskDependencies.filter((d) => d.depends_on_task_id === task.id);
  const attached = documents.filter((d) => d.task_id === task.id);
  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;

  const subItems = tasks.filter((t) => t.parent_task_id === task.id);
  const parent = task.parent_task_id ? tasks.find((t) => t.id === task.parent_task_id) : undefined;
  const canAddSub = can.editCoreTimeline && !locked && !task.parent_task_id;
  const subDone = subItems.filter((t) => t.status === "complete").length;

  /** Files attach straight to this work item — no folders to choose. */
  async function addFiles(files: File[], requiresApproval: boolean) {
    if (files.length === 0 || uploading || !task) return;
    setPendingFiles([]);
    setUploading(true);
    try {
      for (const file of files) {
        await uploadDocument({
          projectId: task.project_id,
          file,
          folder: null,
          sceneId: task.scene_id,
          taskId: task.id,
          requiresApproval,
        });
      }
    } finally {
      setUploading(false);
    }
  }


  const askDept =
    askDepartmentId && !askUsed && task.id === taskId
      ? departments.find((d) => d.id === askDepartmentId)
      : undefined;
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
        <header className="sticky top-0 z-10 flex items-start gap-3 panel-header px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="rule-label">{dept?.name ?? "Work item"}</p>

            <h2 className="mt-0.5 text-base font-semibold text-ink">{task.title}</h2>
            {parent && (
              <button
                type="button"
                onClick={() => setActiveId(parent.id)}
                className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
              >
                <CornerDownRight aria-hidden className="size-3.5" />
                Part of {parent.title}
              </button>
            )}
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task.id)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-semibold text-ink"
            >
              <Pencil aria-hidden className="size-4" />
              Edit
            </button>
          )}
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
            {/* One dominant read of where this stands — a late or blocked item
                is never also presented as comfortably slack. */}
            {health.meta.label !== taskStatusMeta[task.status].label && (
              <StatusBadge meta={health.meta} size="sm" />
            )}
            {health.detail && <span className="text-xs text-ink-soft">{health.detail}</span>}
          </div>


          {canUpdate && subItems.length === 0 && (
            <label className="block">
              <span className="rule-label">Update status</span>
              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(e) => setTaskStatus(task.id, e.target.value as TaskStatus)}
                className="mt-1 block min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s} disabled={s === "complete" && pendingDocs.length > 0}>
                    {taskStatusMeta[s].label}
                    {s === "complete" && pendingDocs.length > 0 ? " (needs approvals)" : ""}
                  </option>
                ))}
              </select>
              {pendingDocs.length > 0 && (
                <span className="mt-1.5 block text-xs text-ink-soft">
                  Waiting on approval: {pendingDocs.map((d) => d.title).join(", ")}
                </span>
              )}
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
                <dt className="rule-label">Set</dt>
                <dd className="mt-0.5 text-ink">{scene.name}</dd>
              </div>
            )}
          </dl>

          {(subItems.length > 0 || (canAddSub && onAddSubTask)) && (
            <section className="rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-semibold text-ink">Sub-tasks</p>
                {subItems.length > 0 && (
                  <p className="text-xs text-ink-soft">
                    {subDone} of {subItems.length} complete
                  </p>
                )}
              </div>
              {subItems.length > 0 && (
                <ul className="row-list">
                  {subItems.map((s) => (
                    <li key={s.id} className="data-row flex items-center gap-2 px-3 py-2">
                      <CornerDownRight aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
                      <button
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink hover:underline"
                      >
                        {s.title}
                      </button>
                      <StatusBadge meta={taskStatusMeta[s.status]} size="sm" />
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(s.id)}
                          className="shrink-0 rounded-md p-1.5 text-ink-soft hover:bg-cream hover:text-ink"
                          aria-label={`Edit ${s.title}`}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canAddSub && onAddSubTask && (
                <div className="border-t border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onAddSubTask(task.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-semibold text-cream"
                  >
                    <Plus aria-hidden className="size-4" />
                    Add sub-task
                  </button>
                </div>
              )}
            </section>
          )}


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

          <section className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <FileText aria-hidden className="size-3.5 text-gold-deep" /> Documents
              </p>
              {canUpdate && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-ink disabled:opacity-50"
                >
                  <Plus aria-hidden className="size-3.5" />
                  {uploading ? "Adding…" : "Add document"}
                </button>
              )}
            </div>
            {attached.length > 0 ? (
              <ul className="row-list">
                {attached.map((doc) => (
                  <li key={doc.id} className="data-row flex items-center gap-2 px-3 py-2">
                    <Link
                      to="/projects/$projectId/documents"
                      params={{ projectId: task.project_id }}
                      search={{ document: doc.id }}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline"
                    >
                      {doc.title} — v{doc.current_version}
                    </Link>
                    <StatusBadge
                      meta={
                        doc.requires_approval
                          ? approvalStateMeta[doc.approval_state]
                          : { label: "No approval needed", tone: "neutral" as const, Icon: FileText }
                      }
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2.5 text-xs text-ink-soft">
                Nothing attached to this task yet.
              </p>
            )}
            {canUpdate && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    setPendingFiles(files);
                  }}
                />
                {pendingFiles.length > 0 && (
                  <div className="border-t border-border px-3 py-2.5">
                    <p className="text-xs font-semibold text-ink">
                      Does {pendingFiles.length === 1 ? "this document" : "this set of documents"}{" "}
                      need approval?
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {pendingFiles.map((f) => f.name).join(", ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => void addFiles(pendingFiles, true)}
                        className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        Needs approval
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => void addFiles(pendingFiles, false)}
                        className="min-h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-ink disabled:opacity-60"
                      >
                        No approval needed
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingFiles([])}
                        className="min-h-9 rounded-md px-2 text-xs font-medium text-ink-soft"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

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
                key={`${task.id}-${askDepartmentId ?? ""}`}
                inline
                projectId={task.project_id}
                contextType="task"
                taskId={task.id}
                initialDraft={draft}
                autoFocusComposer={Boolean(askDept)}
                onSent={() => setAskUsed(true)}
                {...(highlightCommentId ? { highlightCommentId } : {})}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
