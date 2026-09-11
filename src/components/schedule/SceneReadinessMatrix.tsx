import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, useStore } from "@/lib/store";
import { cellReadinessMeta, formatDate, scheduleHealth, type StatusMeta } from "@/lib/status";
import { toISO } from "@/lib/schedule";
import type { Approval, Document, Task } from "@/lib/production-data";

type Readiness = keyof typeof cellReadinessMeta | "not_involved";

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
 * that set and department, plus schedule health (blocked/late/critical).
 * Nothing here is decorative, and the states genuinely vary — a set with no
 * blockers, no late work and no reviews pending is the only case that reads
 * "On track".
 */
function cellFor(
  tasks: Task[],
  documents: Document[],
  approvals: Approval[],
  today: Date,
): Cell {
  if (tasks.length === 0 && documents.length === 0) {
    return { readiness: "not_involved", meta: null, reason: "Not involved in this set" };
  }

  const blockedTask = tasks.find((t) => t.status === "blocked");
  if (blockedTask) {
    return {
      readiness: "blocked",
      meta: cellReadinessMeta.blocked,
      reason: `Blocked: ${blockedTask.title}`,
      task: blockedTask,
    };
  }

  const rejected = documents.find((d) => d.approval_state === "rejected");
  if (rejected) {
    return {
      readiness: "blocked",
      meta: cellReadinessMeta.blocked,
      reason: `Rejected: ${rejected.title}`,
      document: rejected,
    };
  }

  // Late or blocked-by-dependency work, using the same health rule as
  // everywhere else so a late item never reads as healthy here.
  const late = tasks
    .filter((t) => t.status !== "complete")
    .map((t) => ({ task: t, health: scheduleHealth(t, today) }))
    .find(({ health }) => health.urgent && health.lateDays > 0);
  if (late) {
    return {
      readiness: "at_risk",
      meta: cellReadinessMeta.at_risk,
      reason: `${late.health.meta.label}: ${late.task.title}`,
      task: late.task,
    };
  }

  const changes = documents.find((d) => d.approval_state === "changes_requested");
  if (changes) {
    return {
      readiness: "at_risk",
      meta: cellReadinessMeta.at_risk,
      reason: `Changes requested: ${changes.title}`,
      document: changes,
    };
  }

  const waitingReview = documents.find((d) => d.approval_state === "in_review");
  if (waitingReview) {
    const pending = approvals.find(
      (a) => a.document_id === waitingReview.id && a.decision === "requested",
    );
    return {
      readiness: "at_risk",
      meta: cellReadinessMeta.at_risk,
      reason: `Awaiting review: ${waitingReview.title}`,
      document: waitingReview,
      ...(pending ? { approval: pending } : {}),
    };
  }

  // Tight schedule margin also reads as at-risk, even without a hard blocker.
  const critical = tasks
    .filter((t) => t.status !== "complete")
    .find((t) => t.criticality === "critical");
  if (critical) {
    return {
      readiness: "at_risk",
      meta: cellReadinessMeta.at_risk,
      reason: `On the critical path: ${critical.title}`,
      task: critical,
    };
  }

  const open = tasks.filter((t) => t.status !== "complete");
  if (open.length === 0 && tasks.length > 0) {
    return { readiness: "complete", meta: cellReadinessMeta.complete, reason: "All work complete" };
  }

  const started = tasks.some((t) => t.status !== "not_started");
  if (!started && documents.every((d) => d.approval_state === "draft")) {
    return { readiness: "not_started", meta: cellReadinessMeta.not_started, reason: "Not started yet" };
  }

  const next = open.sort((a, b) => a.forecast_finish.localeCompare(b.forecast_finish))[0];
  return {
    readiness: "on_track",
    meta: cellReadinessMeta.on_track,
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

const LEGEND: { key: keyof typeof cellReadinessMeta; hint: string }[] = [
  { key: "not_started", hint: "No work has begun yet" },
  { key: "on_track", hint: "Work is progressing, nothing behind or waiting" },
  { key: "at_risk", hint: "Late work, pending review, or a critical-path item" },
  { key: "blocked", hint: "A work item or document is stuck" },
  { key: "complete", hint: "All work for this set and department is done" },
];

export function SceneReadinessMatrix({
  projectId,
  onAddWork,
}: {
  projectId: string;
  /** Present only when the viewer may plan work; opens the editor for that set. */
  onAddWork?: (sceneId: string, departmentId: string) => void;
}) {
  const { scenes, tasks, documents, approvals } = useStore();
  const today = new Date();

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
      {projectScenes.length === 0 ? (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No sets have been set up on this production yet. Sets are added on the Sets tab.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Each cell reads the real work behind it — tap one to jump to the work item, document or
            review that sets that readiness.
          </p>

          <div className="surface-card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="rule-label">Legend</span>
            {LEGEND.map(({ key, hint }) => (
              <span key={key} className="inline-flex items-center gap-1.5" title={hint}>
                <StatusBadge meta={cellReadinessMeta[key]} size="sm" />
              </span>
            ))}
          </div>

      {/* Phone: one card per set */}
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
              <th className="rule-label px-4 py-2">Set</th>
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
        </>
      )}
    </div>

  );
}
