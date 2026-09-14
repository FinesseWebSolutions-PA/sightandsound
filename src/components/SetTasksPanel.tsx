import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { WorkItemEditor } from "@/components/WorkItemEditor";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import { formatDate, taskStatusMeta } from "@/lib/status";
import { stageGroups, stageSummary, taskReadiness, taskRows } from "@/lib/task-planning";
const input = "min-h-11 rounded-md border border-border bg-card px-3 text-sm text-ink";
const button = input + " hover:bg-cream disabled:opacity-40";
export function SetTasksPanel({
  projectId,
  sceneId,
  canEdit,
}: {
  projectId: string;
  sceneId: string;
  canEdit: boolean;
}) {
  const { tasks, stages, manageStage, saving } = useStore();
  const [openTaskId, setOpenTaskId] = useState("");
  const [editor, setEditor] = useState<{
    taskId?: string;
    parentId?: string;
    stageId?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [filter, setFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [stageEdit, setStageEdit] = useState<{ id?: string; name: string } | null>(null);
  const [problem, setProblem] = useState("");
  const own = tasks.filter((t) => t.project_id === projectId && t.scene_id === sceneId);
  const groups = stageGroups(own, stages, sceneId);
  const today = new Date().toISOString().slice(0, 10);
  const matches = (t: (typeof own)[number]) => {
    if (department && t.department_id !== department) return false;
    if (
      query &&
      !`${t.title} ${personById(t.assignee_id)?.full_name ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return false;
    if (filter === "blocked") return taskReadiness(t, taskDependencies, tasks, today).blocked;
    if (filter === "late")
      return t.status !== "complete" && Boolean(t.due_date) && t.due_date < today;
    if (filter === "open") return t.status !== "complete";
    if (filter === "complete") return t.status === "complete";
    return true;
  };
  const count = groups
    .filter((g) => stageFilter === "all" || g.id === stageFilter)
    .flatMap((g) => g.tasks.filter(matches)).length;
  async function stageAction(
    action: "save" | "delete" | "up" | "down",
    name?: string,
    id?: string,
  ) {
    setProblem("");
    const ok = await manageStage(sceneId, action, name, id);
    if (ok) setStageEdit(null);
    else
      setProblem("The stage could not be saved. Check the notification for details and try again.");
  }
  return (
    <>
      <section
        className="surface-card overflow-hidden"
        aria-label="Tasks on this set"
        data-tour="set-tasks"
      >
        <header className="panel-header flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h3 className="font-display text-xl">Tasks on this set</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Every department, every stage. {own.length} tasks including subtasks.
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                className={button}
                onClick={() => {
                  setProblem("");
                  setStageEdit({ name: "" });
                }}
              >
                Add stage
              </button>
              <button
                className="min-h-11 rounded-md bg-ink px-3 text-sm text-cream-soft"
                onClick={() => setEditor({})}
              >
                <Plus aria-hidden className="mr-1 inline size-4" />
                Add task
              </button>
            </div>
          )}
        </header>
        <div className="space-y-3 border-b border-border p-4">
          <p className="text-xs text-ink-soft">
            Stages can overlap. Dates and progress come from their tasks; stage order creates no
            dependency.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className={input + " min-w-0 flex-1"}
              aria-label="Search set tasks"
              placeholder="Search tasks or owners"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter tasks by stage"
              className={input + " max-w-full"}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">All stages</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter tasks by department"
              className={input}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {departments
                .filter((d) => own.some((t) => t.department_id === d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
            <select
              aria-label="Filter tasks by status"
              className={input}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="blocked">Blocked</option>
              <option value="late">Overdue</option>
              <option value="complete">Complete</option>
            </select>
          </div>
          <p role="status" className="text-xs text-ink-soft">
            Showing {count} of {own.length} tasks
            {(query || department || filter || stageFilter !== "all") && (
              <button
                className="ml-3 min-h-11 underline"
                onClick={() => {
                  setQuery("");
                  setDepartment("");
                  setFilter("");
                  setStageFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </p>
          {stageEdit && (
            <form
              aria-label={stageEdit.id ? "Rename stage" : "Add stage"}
              className="rounded-md border border-border bg-cream-soft p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void stageAction("save", stageEdit.name, stageEdit.id);
              }}
            >
              <label className="block text-sm font-medium">
                Stage name
                <input
                  required
                  autoFocus
                  maxLength={100}
                  className={input + " mt-1 w-full"}
                  placeholder="e.g. Engineering or Metal — final assembly"
                  value={stageEdit.name}
                  onChange={(e) => setStageEdit({ ...stageEdit, name: e.target.value })}
                />
              </label>
              <p className="mt-2 text-xs text-ink-soft">
                Use your team’s stage names. Separate return visits can have their own stage.
              </p>
              <div className="mt-3 flex gap-2">
                <button className={button} disabled={saving || !stageEdit.name.trim()}>
                  Save stage
                </button>
                <button type="button" className={button} onClick={() => setStageEdit(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {problem && (
            <p role="alert" className="text-sm text-danger">
              {problem}
            </p>
          )}
        </div>
        {own.length === 0 && !stages.some((s) => s.scene_id === sceneId) && (
          <p className="p-4 text-sm text-ink-soft">
            Start with a stage, or add an independent task. Every task stays linked to this set.
          </p>
        )}
        {groups
          .filter((g) => stageFilter === "all" || g.id === stageFilter)
          .map((g, gi) => {
            const summary = stageSummary(g.tasks);
            const filtered = g.tasks.filter(matches);
            const rows = taskRows(filtered);
            const isCollapsed = collapsed.has(g.id) && !query && !filter && !department;
            const blocked = g.tasks.filter(
              (t) => taskReadiness(t, taskDependencies, tasks, today).blocked,
            ).length;
            return (
              <section
                key={g.id || "independent"}
                className="border-b border-border last:border-b-0"
                aria-label={g.name}
              >
                <div className="flex flex-wrap items-center gap-2 bg-cream-soft px-4 py-3">
                  <button
                    aria-expanded={!isCollapsed}
                    className="min-h-11 min-w-0 basis-full text-left sm:flex-1 sm:basis-0"
                    onClick={() =>
                      setCollapsed((old) => {
                        const next = new Set(old);
                        if (next.has(g.id)) next.delete(g.id);
                        else next.add(g.id);
                        return next;
                      })
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight aria-hidden className="mr-1 inline size-4" />
                    ) : (
                      <ChevronDown aria-hidden className="mr-1 inline size-4" />
                    )}
                    <span className="font-semibold">{g.name}</span>
                    <span className="ml-2 text-xs text-ink-soft">
                      {summary.status} · {summary.done}/{summary.total} work items complete
                      {blocked ? ` · ${blocked} blocked` : ""}
                    </span>
                    <span className="mt-1 block pl-5 text-xs text-ink-soft">
                      {summary.start && summary.finish
                        ? `${formatDate(summary.start)} → ${formatDate(summary.finish)}`
                        : "No scheduled dates"}
                      {summary.undated ? ` · ${summary.undated} without full dates` : ""}
                    </span>
                  </button>
                  {canEdit && (
                    <div className="flex flex-wrap gap-1 sm:ml-auto">
                      {g.stage && (
                        <>
                          <button
                            aria-label={`Move ${g.name} up`}
                            disabled={saving || gi === 0}
                            className={button}
                            onClick={() => void stageAction("up", undefined, g.id)}
                          >
                            <ArrowUp aria-hidden className="size-4" />
                          </button>
                          <button
                            aria-label={`Move ${g.name} down`}
                            disabled={saving || gi === groups.length - 2}
                            className={button}
                            onClick={() => void stageAction("down", undefined, g.id)}
                          >
                            <ArrowDown aria-hidden className="size-4" />
                          </button>
                          <button
                            aria-label={`Rename ${g.name}`}
                            className={button}
                            onClick={() => setStageEdit({ id: g.id, name: g.name })}
                          >
                            <Pencil aria-hidden className="size-4" />
                          </button>
                          {g.tasks.length === 0 && (
                            <button
                              disabled={saving}
                              className={button}
                              onClick={() => void stageAction("delete", undefined, g.id)}
                            >
                              Remove empty stage
                            </button>
                          )}
                        </>
                      )}
                      <button className={button} onClick={() => setEditor({ stageId: g.id })}>
                        + Task
                      </button>
                    </div>
                  )}
                </div>
                {!isCollapsed &&
                  (rows.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-ink-soft">
                      {g.tasks.length
                        ? "No tasks match these filters."
                        : g.stage
                          ? "No tasks in this stage yet."
                          : "Tasks without a stage appear here."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {rows.map((t) => {
                        const ready = taskReadiness(t, taskDependencies, tasks, today);
                        const late = t.status !== "complete" && t.due_date && t.due_date < today;
                        return (
                          <li
                            key={t.id}
                            className={`space-y-2 px-4 py-3 ${t.parent_task_id ? "border-l-2 border-l-border pl-7" : ""}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="min-h-11 min-w-0 flex-1 text-left text-sm font-semibold hover:underline"
                                onClick={() => setOpenTaskId(t.id)}
                              >
                                {t.title}
                              </button>
                              <StatusBadge meta={taskStatusMeta[t.status]} size="sm" />
                              {canEdit && (
                                <button
                                  className={button}
                                  aria-label={`Edit ${t.title}`}
                                  onClick={() => setEditor({ taskId: t.id })}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-ink-soft">
                              {departments.find((d) => d.id === t.department_id)?.name ??
                                "No department"}{" "}
                              · {personById(t.assignee_id)?.full_name ?? "Unassigned"} ·{" "}
                              {t.start_date ? formatDate(t.start_date) : "No start"} →{" "}
                              {t.due_date ? formatDate(t.due_date) : "No finish"}
                              {late ? " · Overdue" : ""}
                            </p>
                            {t.parent_task_id && (
                              <p className="text-xs text-ink-soft">
                                Subtask of{" "}
                                {tasks.find((p) => p.id === t.parent_task_id)?.title ??
                                  "another task"}
                              </p>
                            )}
                            {(ready.blocked || ready.finishWaiting) && (
                              <p className="text-xs text-danger">
                                {ready.blocked ? "Blocked: " : "Finish waits: "}
                                {ready.prerequisites.map((p) => p.message).join("; ") ||
                                  "Marked blocked by the team"}
                              </p>
                            )}
                            {canEdit && !t.parent_task_id && (
                              <button
                                className="min-h-11 text-xs text-gold-deep underline"
                                onClick={() => setEditor({ parentId: t.id, stageId: t.stage_id })}
                              >
                                + Subtask
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ))}
              </section>
            );
          })}
      </section>
      {openTaskId && (
        <TaskDetailPanel
          taskId={openTaskId}
          onClose={() => setOpenTaskId("")}
          {...(canEdit
            ? {
                onEdit: (id: string) => {
                  setOpenTaskId("");
                  setEditor({ taskId: id });
                },
                onAddSubTask: (id: string) => {
                  setOpenTaskId("");
                  setEditor({ parentId: id });
                },
              }
            : {})}
        />
      )}
      {editor && (
        <WorkItemEditor
          projectId={projectId}
          presetSceneId={sceneId}
          {...(editor.taskId ? { taskId: editor.taskId } : {})}
          {...(editor.parentId ? { presetParentTaskId: editor.parentId } : {})}
          {...(editor.stageId ? { presetStageId: editor.stageId } : {})}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
