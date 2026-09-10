import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, useStore } from "@/lib/store";
import { formatDate, readinessMeta, type StatusMeta } from "@/lib/status";
import { toISO } from "@/lib/schedule";
import type { Approval, Document, Task } from "@/lib/production-data";

type Readiness = keyof typeof readinessMeta | "not_involved";

type Cell = {
  readiness: Readiness;
  meta: StatusMeta | null;
  reason: string;
  task?: Task;
  document?: Document;
  approval?: Approval;
};

/**
 * Every cell is derived from real work: the tasks, documents and reviews for
 * that scene and department. Nothing here is decorative.
 */
function cellFor(tasks: Task[], documents: Document[], approvals: Approval[], today: string): Cell {
  if (tasks.length === 0 && documents.length === 0) {
    return { readiness: "not_involved", meta: null, reason: "Not involved in this scene" };
  }

  const blocked = tasks.find((t) => t.status === "blocked");
  if (blocked) {
    return {
      readiness: "blocked",
      meta: readinessMeta.blocked,
      reason: `Blocked: ${blocked.title}`,
      task: blocked,
    };
  }

  const waitingReview = documents.find((d) => d.approval_state === "in_review");
  if (waitingReview) {
    const pending = approvals.find(
      (a) => a.document_id === waitingReview.id && a.decision === "requested",
    );
    return {
      readiness: "at_risk",
      meta: readinessMeta.at_risk,
      reason: `Awaiting review: ${waitingReview.title}`,
      document: waitingReview,
      ...(pending ? { approval: pending } : {}),
    };
  }

  const changes = documents.find(
    (d) => d.approval_state === "changes_requested" || d.approval_state === "rejected",
  );
  if (changes) {
    return {
      readiness: "at_risk",
      meta: readinessMeta.at_risk,
      reason: `Changes requested: ${changes.title}`,
      document: changes,
    };
  }

  const late = tasks.find((t) => t.status !== "complete" && t.forecast_finish < today);
  if (late) {
    return {
      readiness: "at_risk",
      meta: readinessMeta.at_risk,
      reason: `Past forecast: ${late.title} (${formatDate(late.forecast_finish)})`,
      task: late,
    };
  }

  const open = tasks.filter((t) => t.status !== "complete");
  if (open.length === 0 && tasks.length > 0) {
    return { readiness: "complete", meta: readinessMeta.complete, reason: "All work complete" };
  }

  const next = open.sort((a, b) => a.forecast_finish.localeCompare(b.forecast_finish))[0];
  return {
    readiness: "on_track",
    meta: readinessMeta.on_track,
    reason: next ? `Next: ${next.title} by ${formatDate(next.forecast_finish)}` : "On track",
    ...(next ? { task: next } : {}),
  };
}

function CellLink({
  cell,
  projectId,
  label,
  onAddWork,
}: {
  cell: Cell;
  projectId: string;
  label: string;
  onAddWork?: () => void;
}) {
  if (!cell.meta) {
    if (onAddWork) {
      return (
        <button
          type="button"
          onClick={onAddWork}
          aria-label={`Add work for ${label}`}
          className="block min-h-11 w-full rounded-md px-2 py-2 text-left text-xs font-semibold text-ink-soft hover:bg-cream-soft"
        >
          + Add work
        </button>
      );
    }
    return <span className="block px-2 py-2 text-xs text-ink-soft">—</span>;
  }
  const body = (
    <>
      <StatusBadge meta={cell.meta} size="sm" />
      <span className="mt-1 block text-xs break-words text-ink-soft">{cell.reason}</span>
    </>
  );
  const shared = "block min-h-11 w-full rounded-md px-2 py-2 text-left hover:bg-cream-soft";

  if (cell.document) {
    return (
      <Link
        to="/projects/$projectId/documents"
        params={{ projectId }}
        search={{ document: cell.document.id }}
        aria-label={`${label}: ${cell.reason}`}
        className={shared}
      >
        {body}
      </Link>
    );
  }
  if (cell.task) {
    return (
      <Link
        to="/projects/$projectId/timeline"
        params={{ projectId }}
        search={{ task: cell.task.id }}
        aria-label={`${label}: ${cell.reason}`}
        className={shared}
      >
        {body}
      </Link>
    );
  }
  return <span className={shared}>{body}</span>;
}

/** Add, rename and remove the scenes a production's work can be tied to. */
function SceneAdmin({ projectId }: { projectId: string }) {
  const { scenes, tasks, documents, createScene, renameScene, deleteScene, saving } = useStore();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");

  const projectScenes = scenes
    .filter((s) => s.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const add = async () => {
    if (!name.trim()) return;
    const id = await createScene(projectId, name);
    if (id) setName("");
  };

  const countFor = (sceneId: string) =>
    tasks.filter((t) => t.scene_id === sceneId).length +
    documents.filter((d) => d.scene_id === sceneId).length;

  return (
    <section className="surface-card p-4">
      <h3 className="text-sm font-semibold text-ink">Scenes</h3>
      <p className="mt-1 text-xs text-ink-soft">
        Scenes are how the build is organized. Work items and documents can be tied to one.
      </p>

      <ul className="row-list mt-3">
        {projectScenes.map((scene) => (
          <li key={scene.id} className="flex flex-wrap items-center gap-2 py-2">
            {editingId === scene.id ? (
              <>
                <input
                  aria-label={`Rename ${scene.name}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    renameScene(scene.id, projectId, editName);
                    setEditingId("");
                  }}
                  className="min-h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId("")}
                  className="min-h-9 rounded-md border border-border px-3 text-xs font-medium text-ink"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{scene.name}</span>
                <span className="text-xs text-ink-soft">{countFor(scene.id)} tied</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(scene.id);
                    setEditName(scene.name);
                  }}
                  className="min-h-9 rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-cream"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => void deleteScene(scene.id, projectId)}
                  className="min-h-9 rounded-md border border-border px-3 text-xs font-medium text-danger hover:bg-cream"
                >
                  Remove
                </button>
              </>
            )}
          </li>
        ))}
        {projectScenes.length === 0 && (
          <li className="py-2 text-sm text-ink-soft">No scenes yet — add the first one below.</li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label="New scene name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder="e.g. Scene 4 — The Flood"
          className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:min-h-9"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={saving || !name.trim()}
          className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60 sm:min-h-9"
        >
          Add scene
        </button>
      </div>
    </section>
  );
}

export function SceneReadinessMatrix({
  projectId,
  onAddWork,
}: {
  projectId: string;
  /** Present only when the viewer may plan work; opens the editor for that scene. */
  onAddWork?: (sceneId: string, departmentId: string) => void;
}) {
  const { scenes, tasks, documents, approvals, can, isClosed } = useStore();
  const today = toISO(new Date());
  const canManage = can.adminConfig && !isClosed(projectId);

  const projectScenes = useMemo(
    () =>
      scenes.filter((s) => s.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order),
    [scenes, projectId],
  );

  const involved = departments.filter((d) =>
    tasks.some((t) => t.project_id === projectId && t.department_id === d.id),
  );

  const grid = useMemo(
    () =>
      projectScenes.map((scene) => ({
        scene,
        cells: involved.map((dept) => {
          const sceneTasks = tasks.filter(
            (t) => t.scene_id === scene.id && t.department_id === dept.id,
          );
          const sceneDocs = documents.filter(
            (d) =>
              d.scene_id === scene.id &&
              (d.department_id === dept.id || sceneTasks.some((t) => t.id === d.task_id)),
          );
          const docApprovals = approvals.filter((a) =>
            sceneDocs.some((d) => d.id === a.document_id),
          );
          return {
            dept,
            cell: cellFor(sceneTasks, sceneDocs, docApprovals, today),
          };
        }),
      })),
    [projectScenes, involved, tasks, documents, approvals, today],
  );

  return (
    <div className="space-y-4">
      {canManage && <SceneAdmin projectId={projectId} />}

      {projectScenes.length === 0 ? (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No scenes have been set up on this production yet.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Each cell reads the real work behind it — tap one to jump to the work item, document or
            review that sets that readiness.
          </p>


      {/* Phone: one card per scene */}
      <div className="space-y-3 lg:hidden">
        {grid.map(({ scene, cells }) => (
          <section key={scene.id} className="surface-card overflow-hidden">
            <header className="panel-header px-4 py-3">
              <h3 className="text-base font-semibold text-ink">{scene.name}</h3>
            </header>
            <ul className="row-list">
              {cells
                .filter((c) => c.cell.meta)
                .map(({ dept, cell }) => (
                  <li key={dept.id} className="px-3 py-2">
                    <span className="rule-label">{dept.name}</span>
                    <CellLink
                      cell={cell}
                      projectId={projectId}
                      label={`${scene.name}, ${dept.name}`}
                      {...(onAddWork ? { onAddWork: () => onAddWork(scene.id, dept.id) } : {})}
                    />
                  </li>
                ))}
              {cells.every((c) => !c.cell.meta) && (
                <li className="px-4 py-3 text-sm text-ink-soft">
                  No department work tied to this scene yet.
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>

      {/* Desktop: the matrix itself */}
      <div className="surface-card hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="rule-label px-4 py-2">Scene</th>
              {involved.map((d) => (
                <th key={d.id} className="rule-label px-2 py-2">
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="row-list">
            {grid.map(({ scene, cells }) => (
              <tr key={scene.id} className="align-top">
                <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-ink">
                  {scene.name}
                </th>
                {cells.map(({ dept, cell }) => (
                  <td key={dept.id} className="px-2 py-2">
                    <CellLink
                      cell={cell}
                      projectId={projectId}
                      label={`${scene.name}, ${dept.name}`}
                      {...(onAddWork ? { onAddWork: () => onAddWork(scene.id, dept.id) } : {})}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
