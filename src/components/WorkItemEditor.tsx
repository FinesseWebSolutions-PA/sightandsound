import { Link2, Loader2, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PersonPicker } from "@/components/PersonPicker";
import { departments, personById, projectAssignments, taskDependencies, useStore } from "@/lib/store";
import { dependencyTypeLabel } from "@/lib/status";
import type { DependencyType, TaskStatus } from "@/lib/production-data";

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "blocked", "complete"];
const statusText: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  complete: "Complete",
};

const dependencyTypes: DependencyType[] = [
  "finish_to_start",
  "start_to_start",
  "finish_to_finish",
  "start_to_finish",
];

const field =
  "mt-1 block min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink focus:ring-2 focus:ring-gold focus:outline-none sm:text-sm";

/**
 * One panel for adding and editing a piece of build work, framed the way a shop
 * plans it: which department, which set, which build milestone, who, when, and
 * what it waits on.
 */
export function WorkItemEditor({
  projectId,
  taskId,
  presetDepartmentId,
  presetSceneId,
  presetParentTaskId,
  onClose,
}: {
  projectId: string;
  /** Omitted when adding a new work item. */
  taskId?: string;
  presetDepartmentId?: string;
  presetSceneId?: string;
  /** Pre-scopes a new work item as a sub-item of this one. */
  presetParentTaskId?: string;
  onClose: () => void;
}) {
  const {
    tasks,
    scenes,
    
    saving,
    saveWorkItem,
    deleteWorkItem,
    addDependency,
    removeDependency,
    createScene,
  } = useStore();

  const existing = taskId ? tasks.find((t) => t.id === taskId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.description ?? "");
  const [departmentId, setDepartmentId] = useState(
    existing?.department_id ?? presetDepartmentId ?? departments[0]?.id ?? "",
  );
  const [sceneId, setSceneId] = useState(existing?.scene_id || presetSceneId || "");
  const milestoneId = existing?.milestone_id ?? "";
  const [parentTaskId, setParentTaskId] = useState(
    existing?.parent_task_id ?? presetParentTaskId ?? "",
  );
  const [ownerId, setOwnerId] = useState(existing?.assignee_id ?? "");
  const [startDate, setStartDate] = useState(existing?.start_date ?? "");
  const [dueDate, setDueDate] = useState(existing?.due_date ?? "");
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? "not_started");
  const [affectsRehearsal, setAffectsRehearsal] = useState(existing?.affects_rehearsal ?? false);
  const [affectsPerformance, setAffectsPerformance] = useState(
    existing?.affects_performance ?? false,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [addingScene, setAddingScene] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");

  // New dependency being added.
  const [waitsOnId, setWaitsOnId] = useState("");
  const [waitsOnType, setWaitsOnType] = useState<DependencyType>("finish_to_start");
  const [lagDays, setLagDays] = useState("0");

  const projectScenes = useMemo(
    () => scenes.filter((s) => s.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order),
    [scenes, projectId],
  );

  // Only people actually staffed to this department on this production.
  const staffed = projectAssignments.filter(
    (a) => a.project_id === projectId && a.department_id === departmentId,
  );
  const ownerOptions = [
    // Whoever already has it stays selectable, even if staffing has moved on.
    ...(ownerId
      ? [{ id: ownerId, label: personById(ownerId)?.full_name ?? "Currently assigned" }]
      : []),
    ...staffed.map((a) => ({
      id: a.person_id,
      label: `${personById(a.person_id)?.full_name ?? "—"} — ${a.job_title}`,
    })),
  ].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i);

  const otherTasks = tasks.filter((t) => t.project_id === projectId && t.id !== existing?.id);
  const waitsOn = existing ? taskDependencies.filter((d) => d.task_id === existing.id) : [];

  const children = existing ? tasks.filter((t) => t.parent_task_id === existing.id) : [];
  const rollsUp = children.length > 0;
  // Nesting is one level deep, so only top-level work items from this production can be a parent.
  const parentOptions = otherTasks.filter((t) => t.project_id === projectId && !t.parent_task_id);

  async function save() {
    if (!title.trim()) {
      setProblem("Give the work item a title.");
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setProblem("The finish date cannot be before the start date.");
      return;
    }
    if (!sceneId) {
      setProblem("Choose the set this work belongs to.");
      return;
    }
    const ok = await saveWorkItem({
      ...(existing ? { id: existing.id } : {}),
      projectId,
      title,
      description: notes,
      departmentId,
      sceneId,
      milestoneId: milestoneId || null,
      parentTaskId: parentTaskId || null,
      ownerId: ownerId || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status,
      affectsRehearsal,
      affectsPerformance,
    });
    if (ok) onClose();
    else setProblem("That change could not be saved.");
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <aside
        role="dialog"
        aria-label={existing ? `Edit ${existing.title}` : "Add work item"}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-card shadow-2xl"
      >
        <header className="panel-header sticky top-0 z-10 flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="rule-label">{existing ? "Edit work item" : "New work item"}</p>
            <h2 className="mt-0.5 text-base font-semibold text-ink">
              {existing ? existing.title : "What needs building?"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div className="space-y-5 px-4 py-4">
          {problem && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-ink">
              {problem}
            </p>
          )}

          {/* What / who */}
          <section className="space-y-3">
            <h3 className="rule-label">What and who</h3>
            <label className="block">
              <span className="text-sm font-medium text-ink">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Build the tabernacle frame"
                className={field}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything the department needs to know"
                className={`${field} py-2`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Department</span>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setOwnerId("");
                }}
                className={field}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <label className="block">
                <span className="text-sm font-medium text-ink">Set</span>
                <select
                  value={addingScene ? "__new" : sceneId}
                  onChange={(e) => {
                    if (e.target.value === "__new") {
                      setAddingScene(true);
                      return;
                    }
                    setAddingScene(false);
                    setSceneId(e.target.value);
                  }}
                  className={field}
                >
                  <option value="">Choose a set…</option>
                  {projectScenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__new">+ New set…</option>
                </select>
              </label>
              {addingScene && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    aria-label="New set name"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    placeholder="e.g. Set 4 — The Flood"
                    className="min-h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={saving || !newSceneName.trim()}
                    onClick={() => {
                      void (async () => {
                        const id = await createScene(projectId, newSceneName);
                        if (!id) return;
                        setSceneId(id);
                        setNewSceneName("");
                        setAddingScene(false);
                      })();
                    }}
                    className="min-h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingScene(false);
                      setNewSceneName("");
                    }}
                    className="min-h-10 rounded-md border border-border px-3 text-sm font-medium text-ink"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {rollsUp ? (
              <p className="rounded-md border border-border bg-cream-soft px-3 py-2 text-xs text-ink-soft">
                This work item has {children.length} sub-item
                {children.length === 1 ? "" : "s"}, so it summarises them and cannot be placed
                under another work item.
              </p>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-ink">Part of</span>
                <select
                  value={parentTaskId}
                  onChange={(e) => setParentTaskId(e.target.value)}
                  className={field}
                >
                  <option value="">Stands on its own</option>
                  {parentOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-ink-soft">
                  Sub-items roll up into their parent's dates and status.
                </span>
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-ink">Assigned to</span>
              <div className="mt-1">
                <PersonPicker
                  label="Assign this work item"
                  value={ownerId}
                  onChange={setOwnerId}
                  placeholder="Unassigned"
                  suggestedIds={ownerOptions.map((o) => o.id)}
                  suggestedLabel="Staffed on this department"
                />
              </div>
            </label>
            {rollsUp ? (
              <p className="text-sm text-ink-soft">
                Status: <span className="font-semibold text-ink">{statusText[status]}</span> — taken
                from the sub-items.
              </p>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-ink">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={field}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusText[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          {/* When */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="rule-label">When</h3>
            {rollsUp ? (
              <p className="rounded-md border border-border bg-cream-soft px-3 py-2 text-sm text-ink-soft">
                {startDate || "—"} to {dueDate || "—"} — these follow the sub-items. Change a
                sub-item's dates and this moves with them.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Planned start</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Planned finish</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={field}
                  />
                </label>
              </div>
            )}
            {existing && (
              <p className="rounded-md border border-border bg-cream-soft px-3 py-2 text-xs text-ink-soft">
                Forecast finish {existing.forecast_finish || "—"} · slack{" "}
                {existing.total_float_hours === null
                  ? "not calculated"
                  : `${Math.round(existing.total_float_hours / 24)} days`}
              </p>
            )}
            <div className="space-y-2">
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={affectsRehearsal}
                  onChange={(e) => setAffectsRehearsal(e.target.checked)}
                  className="size-4"
                />
                Slipping this threatens a rehearsal
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={affectsPerformance}
                  onChange={(e) => setAffectsPerformance(e.target.checked)}
                  className="size-4"
                />
                Slipping this threatens a performance
              </label>
            </div>
          </section>

          {/* Waits on */}
          {existing && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="rule-label">Waits on</h3>
              {waitsOn.length === 0 ? (
                <p className="text-sm text-ink-soft">Nothing has to happen first.</p>
              ) : (
                <ul className="space-y-2">
                  {waitsOn.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-cream-soft px-3 py-2"
                    >
                      <Link2 aria-hidden className="mt-1 size-3.5 shrink-0 text-ink-soft" />
                      <span className="min-w-0 flex-1 text-sm text-ink">
                        {tasks.find((t) => t.id === d.depends_on_task_id)?.title ??
                          d.depends_on_task_id}
                        <span className="block text-xs text-ink-soft">
                          {dependencyTypeLabel[d.type]}
                          {d.lag_hours ? ` · ${Math.round(d.lag_hours / 24)} day lag` : ""}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeDependency(d.id, existing.id, projectId)}
                        aria-label="Remove this dependency"
                        className="grid size-11 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-danger"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2 rounded-md border border-dashed border-border px-3 py-3">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Add something it waits on</span>
                  <select
                    value={waitsOnId}
                    onChange={(e) => setWaitsOnId(e.target.value)}
                    className={field}
                  >
                    <option value="">Choose work…</option>
                    {otherTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-ink-soft">Relationship</span>
                    <select
                      value={waitsOnType}
                      onChange={(e) => setWaitsOnType(e.target.value as DependencyType)}
                      className={field}
                    >
                      {dependencyTypes.map((t) => (
                        <option key={t} value={t}>
                          {dependencyTypeLabel[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-ink-soft">Lag in days (can be negative)</span>
                    <input
                      type="number"
                      value={lagDays}
                      onChange={(e) => setLagDays(e.target.value)}
                      className={field}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={!waitsOnId || saving}
                  onClick={async () => {
                    const ok = await addDependency({
                      taskId: existing.id,
                      dependsOnTaskId: waitsOnId,
                      type: waitsOnType,
                      lagHours: (Number(lagDays) || 0) * 24,
                      hardConstraint: true,
                      projectId,
                    });
                    if (ok) {
                      setWaitsOnId("");
                      setLagDays("0");
                    }
                  }}
                  className="min-h-11 w-full rounded-md border border-border bg-cream px-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  Add dependency
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="panel-header sticky bottom-0 mt-auto flex flex-wrap items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gold-deep px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {existing ? "Save changes" : "Add work item"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
          {existing && (
            <button
              type="button"
              onClick={async () => {
                const ok = await deleteWorkItem(existing.id, projectId);
                if (ok) onClose();
                else
                  setProblem(
                    "This work item cannot be removed — other work, a conversation or a document is tied to it. Mark it complete instead.",
                  );
              }}
              disabled={saving}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-60"
            >
              <Trash2 aria-hidden className="size-4" />
              Remove
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
