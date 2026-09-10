import { useState } from "react";
import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { WorkItemEditor } from "@/components/WorkItemEditor";
import { departments, useStore } from "@/lib/store";
import { formatDate, taskStatusMeta } from "@/lib/status";

/**
 * The tasks on one set — where its dates actually come from. Shared by the set
 * workspace and the set popup so both read and edit work the same way.
 */
export function SetTasksPanel({
  projectId,
  sceneId,
  canEdit,
}: {
  projectId: string;
  sceneId: string;
  canEdit: boolean;
}) {
  const { tasks } = useStore();
  const [openTaskId, setOpenTaskId] = useState("");
  const [editorTaskId, setEditorTaskId] = useState<string | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  /** One form for adding tasks: preset parent when adding a sub-task. */
  const [editorParentId, setEditorParentId] = useState<string | undefined>(undefined);

  const setTasks = tasks.filter((t) => t.scene_id === sceneId);

  const openNew = (parentId?: string) => {
    setEditorTaskId(undefined);
    setEditorParentId(parentId);
    setEditorOpen(true);
  };

  return (
    <>
      <section className="surface-card overflow-hidden">
        <header className="panel-header flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-ink">Tasks on this set</h4>
            <p className="mt-0.5 text-xs text-ink-soft">
              Dates set here are what the set&apos;s schedule is built from.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => openNew()}
              className="min-h-11 rounded-md bg-ink px-3 text-sm font-medium text-cream-soft hover:opacity-90"
            >
              <Plus className="mr-1 inline size-4" aria-hidden="true" />
              Add task
            </button>
          )}
        </header>
        {setTasks.length === 0 ? (
          <div className="px-4 py-6">
            <p className="text-sm text-ink-soft">
              No tasks on this set yet. Add the first one to start its schedule.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => openNew()}
                className="mt-2 min-h-11 text-sm font-medium text-gold-deep hover:underline"
              >
                + Add the first task
              </button>
            )}
          </div>
        ) : (
          <ul className="row-list">
            {setTasks
              .filter((t) => !t.parent_task_id)
              .map((parent) => {
                const children = setTasks.filter((t) => t.parent_task_id === parent.id);
                return [parent, ...children].map((t) => (
                  <li
                    key={t.id}
                    className={`data-row flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 ${
                      t.parent_task_id ? "pl-8" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenTaskId(t.id)}
                      className="min-w-0 flex-1 text-left text-sm font-medium text-ink hover:underline"
                    >
                      {t.title}
                    </button>
                    <span className="text-xs text-ink-soft">
                      {departments.find((d) => d.id === t.department_id)?.name ?? "Unassigned"}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {t.start_date || t.due_date
                        ? `${t.start_date ? formatDate(t.start_date) : "—"} → ${
                            t.due_date ? formatDate(t.due_date) : "—"
                          }`
                        : "No dates yet"}
                    </span>
                    <StatusBadge meta={taskStatusMeta[t.status]} size="sm" />
                    {canEdit && !t.parent_task_id && (
                      <button
                        type="button"
                        onClick={() => openNew(t.id)}
                        className="min-h-11 rounded-md border border-border px-2.5 text-xs font-medium text-ink-soft hover:bg-cream"
                      >
                        + Sub-task
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditorTaskId(t.id);
                          setEditorOpen(true);
                        }}
                        className="min-h-11 rounded-md border border-border px-2.5 text-xs font-medium text-ink-soft hover:bg-cream"
                      >
                        Edit
                      </button>
                    )}
                  </li>
                ));
                }).flat()}
            {canEdit && (
              <li>
                <button
                  type="button"
                  onClick={() => openNew()}
                  className="min-h-11 w-full px-4 py-3 text-left text-sm font-medium text-gold-deep hover:bg-cream"
                >
                  + Add task
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {openTaskId && (
        <TaskDetailPanel
          taskId={openTaskId}
          onClose={() => setOpenTaskId("")}
          {...(canEdit
            ? {
                onEdit: (id: string) => {
                  setOpenTaskId("");
                  setEditorTaskId(id);
                  setEditorOpen(true);
                },
              }
            : {})}
        />
      )}

      {editorOpen && (
        <WorkItemEditor
          projectId={projectId}
          {...(editorTaskId ? { taskId: editorTaskId } : {})}
          {...(editorParentId ? { presetParentTaskId: editorParentId } : {})}
          presetSceneId={sceneId}
          onClose={() => {
            setEditorOpen(false);
            setEditorTaskId(undefined);
            setEditorParentId(undefined);
          }}
        />
      )}
    </>
  );
}
