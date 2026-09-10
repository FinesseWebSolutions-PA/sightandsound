import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Link2, X } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { people, personById, useStore } from "@/lib/store";
import { addDays } from "@/lib/schedule";
import { formatDate, setStatusMeta } from "@/lib/status";
import type { SetStatus } from "@/lib/production-data";

const statusOptions: SetStatus[] = ["not_started", "in_progress", "blocked", "complete"];

/**
 * One popup used everywhere a set is opened — the schedule, the set list, and
 * anywhere else a set name is clicked. Keeping it in a single place means every
 * set is read and edited the same way.
 */
export function SetDialog({
  setId,
  projectId,
  onClose,
}: {
  setId: string;
  projectId: string;
  onClose: () => void;
}) {
  const {
    scenes,
    tasks,
    documents,
    projects,
    can,
    isClosed,
    updateScene,
    renameScene,
  } = useStore();

  const order = useMemo(
    () =>
      scenes.filter((s) => s.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order),
    [scenes, projectId],
  );
  const set = order.find((s) => s.id === setId);
  const canEdit = can.adminConfig && !isClosed(projectId);

  const [nameDraft, setNameDraft] = useState(set?.name ?? "");
  useEffect(() => setNameDraft(set?.name ?? ""), [set?.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!set) return null;

  const index = order.findIndex((s) => s.id === set.id);
  const others = order.filter((s) => s.id !== set.id);
  const followsSet = order.find((s) => s.id === set.depends_on_scene_id);
  const workCount = tasks.filter((t) => t.scene_id === set.id).length;
  const docCount = documents.filter((d) => d.scene_id === set.id).length;
  const productionName = projects.find((p) => p.id === projectId)?.name ?? "";

  const applyChain = (predecessorId: string, lag: number) => {
    const pred = order.find((s) => s.id === predecessorId);
    const base = pred?.due_date || pred?.forecast_finish;
    const start = predecessorId && base ? addDays(base, 1 + lag) : "";
    void updateScene(set.id, projectId, {
      depends_on_scene_id: predecessorId,
      lag_days: lag,
      ...(start ? { start_date: start } : {}),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${set.name} details`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border-strong bg-card shadow-xl sm:rounded-2xl"
      >
        <header className="panel-header flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-soft">
              {productionName} · Set {index + 1} of {order.length}
            </p>
            {canEdit ? (
              <input
                aria-label="Set name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  if (nameDraft.trim() && nameDraft !== set.name)
                    renameScene(set.id, projectId, nameDraft);
                }}
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2.5 font-display text-2xl text-ink focus:ring-2 focus:ring-ring focus:outline-none"
              />
            ) : (
              <h2 className="mt-1 font-display text-2xl text-ink">{set.name}</h2>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge meta={setStatusMeta[set.status]} size="sm" />
              <span className="text-xs text-ink-soft">
                {workCount} work items · {docCount} documents
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close set details"
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <dl className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <dt className="rule-label">Set lead</dt>
            <dd className="mt-1">
              {canEdit ? (
                <select
                  aria-label="Set lead"
                  value={set.owner_id}
                  onChange={(e) => void updateScene(set.id, projectId, { owner_id: e.target.value })}
                  className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                >
                  <option value="">No lead named</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} — {p.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-ink">
                  {personById(set.owner_id)?.full_name ?? "No lead named"}
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="rule-label">Where it stands</dt>
            <dd className="mt-1">
              {canEdit ? (
                <select
                  aria-label="Set status"
                  value={set.status}
                  onChange={(e) =>
                    void updateScene(set.id, projectId, { status: e.target.value as SetStatus })
                  }
                  className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {setStatusMeta[s].label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-ink">{setStatusMeta[set.status].label}</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="rule-label">Committed start</dt>
            <dd className="mt-1">
              {canEdit && !followsSet ? (
                <input
                  type="date"
                  aria-label="Committed start"
                  value={set.start_date}
                  onChange={(e) =>
                    void updateScene(set.id, projectId, { start_date: e.target.value })
                  }
                  className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                />
              ) : (
                <span className="text-sm text-ink">
                  {set.start_date ? formatDate(set.start_date) : "Not committed"}
                </span>
              )}
              {followsSet && (
                <span className="mt-1 block text-xs text-ink-soft">
                  Filled in from {followsSet.name}
                  {set.lag_days ? ` plus a ${set.lag_days} day gap` : ""}.
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="rule-label">Committed finish</dt>
            <dd className="mt-1">
              {canEdit ? (
                <input
                  type="date"
                  aria-label="Committed finish"
                  value={set.due_date}
                  onChange={(e) => void updateScene(set.id, projectId, { due_date: e.target.value })}
                  className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                />
              ) : (
                <span className="text-sm text-ink">
                  {set.due_date ? formatDate(set.due_date) : "Not committed"}
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="rule-label">Current estimate</dt>
            <dd className="mt-1 text-sm text-ink">
              {set.forecast_start || set.forecast_finish
                ? `${set.forecast_start ? formatDate(set.forecast_start) : "—"} → ${
                    set.forecast_finish ? formatDate(set.forecast_finish) : "—"
                  }`
                : "No work scheduled yet"}
            </dd>
          </div>

          <div>
            <dt className="rule-label flex items-center gap-1.5">
              <Link2 aria-hidden className="size-3.5" />
              Follows
            </dt>
            <dd className="mt-1 space-y-2">
              {canEdit ? (
                <>
                  <select
                    aria-label="Set this one follows"
                    value={set.depends_on_scene_id}
                    onChange={(e) => applyChain(e.target.value, set.lag_days)}
                    className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                  >
                    <option value="">Starts on its own</option>
                    {others.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {set.depends_on_scene_id && (
                    <label className="block text-xs text-ink-soft">
                      Days of gap after that set finishes
                      <input
                        type="number"
                        value={set.lag_days}
                        onChange={(e) =>
                          applyChain(set.depends_on_scene_id, Number(e.target.value) || 0)
                        }
                        className="mt-1 min-h-11 w-24 rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                      />
                    </label>
                  )}
                </>
              ) : (
                <span className="text-sm text-ink">
                  {followsSet
                    ? `${followsSet.name}${set.lag_days ? ` + ${set.lag_days} day gap` : ""}`
                    : "Starts on its own"}
                </span>
              )}
            </dd>
          </div>
        </dl>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-cream"
          >
            Close
          </button>
          <Link
            to="/projects/$projectId/sets"
            params={{ projectId }}
            search={{ set: set.id }}
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft"
          >
            Open set workspace
            <ExternalLink aria-hidden className="size-4" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
