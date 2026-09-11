import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import type { Scene } from "@/lib/production-data";
import {
  instructionCategories,
  instructionVersions,
  type InstructionCategory,
} from "@/lib/set-instructions";
import {
  loadSetInstructions,
  saveSetInstruction,
  type SetInstruction,
} from "@/lib/set-instruction-data";
import { button, field } from "./SetUpdateComposer";

export function SetInstructions({ set, compact = false }: { set: Scene; compact?: boolean }) {
  const { documents, documentVersions, approvals, currentUserId, can, isClosed, libraryAction } =
    useStore();
  const [pins, setPins] = useState<SetInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [managing, setManaging] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<InstructionCategory>("manual");
  const [documentId, setDocumentId] = useState("");
  const generation = useRef({ sequence: 0 });
  const refresh = useCallback(async () => {
    const sequence = ++generation.current.sequence;
    try {
      const next = await loadSetInstructions(set.id);
      if (sequence === generation.current.sequence) {
        setPins(next);
        setError("");
      }
    } catch (e) {
      if (sequence === generation.current.sequence)
        setError(e instanceof Error ? e.message : "Could not load instructions.");
    } finally {
      if (sequence === generation.current.sequence) setLoading(false);
    }
  }, [set.id]);
  useEffect(() => {
    void refresh();
    const counter = generation.current;
    const focus = () => void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    window.addEventListener("focus", focus);
    return () => {
      counter.sequence++;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const editable = can.updateWork && !isClosed(set.project_id);
  const setDocs = documents.filter(
    (d) => d.scene_id === set.id && d.project_id === set.project_id && !d.deleted_at,
  );
  const save = async (id: string, kind: InstructionCategory, remove = false) => {
    setBusy(true);
    try {
      const ok = await libraryAction(set.project_id, () =>
        saveSetInstruction(set.id, kind, id, currentUserId, remove),
      );
      if (ok) {
        setDocumentId("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="surface-card p-4" aria-label="Set instructions">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-ink">Set instructions</h4>
          <p className="mt-1 text-xs text-ink-soft">
            Approved manuals, assembly notes and shipping instructions for this set.
          </p>
        </div>
        {editable && (
          <button
            className={button}
            aria-expanded={managing}
            onClick={() => setManaging(!managing)}
          >
            {managing ? "Done" : "Manage instructions"}
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}{" "}
          <button className={button} onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {compact && (
        <button
          className="mt-2 min-h-10 text-sm text-gold-deep underline"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide instruction files" : `Show instruction files (${pins.length})`}
        </button>
      )}
      {(expanded || managing) &&
        (loading ? (
          <p role="status" className="mt-3 text-sm text-ink-soft">
            Loading instructions…
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {instructionCategories.map((kind) => (
              <div key={kind.id} className="min-w-0 rounded-md border border-border p-3">
                <h5 className="text-sm font-semibold text-ink">{kind.label}</h5>
                <ul className="mt-2 space-y-3">
                  {pins
                    .filter((p) => p.category === kind.id)
                    .map((pin) => {
                      const doc = setDocs.find((d) => d.id === pin.document_id);
                      const state = instructionVersions(
                        pin.document_id,
                        documentVersions,
                        approvals,
                      );
                      return (
                        <li key={pin.document_id} className="space-y-1 text-sm">
                          <p className="break-words font-medium text-ink">
                            {doc?.title ?? "Document unavailable or moved"}
                          </p>
                          {doc && state.currentApproved && state.latest ? (
                            <Link
                              to="/projects/$projectId/documents"
                              params={{ projectId: set.project_id }}
                              search={{ document: doc.id, version: state.latest.id }}
                              className="block font-medium text-gold-deep underline"
                            >
                              Open approved v{state.latest.version}
                            </Link>
                          ) : doc ? (
                            <>
                              <p className="text-xs text-ink-soft">
                                {state.lastApproved
                                  ? `Latest revision v${state.latest?.version} is not approved.`
                                  : "No approved version yet."}
                              </p>
                              {state.lastApproved && (
                                <Link
                                  to="/projects/$projectId/documents"
                                  params={{ projectId: set.project_id }}
                                  search={{ document: doc.id, version: state.lastApproved.id }}
                                  className="block text-xs text-gold-deep underline"
                                >
                                  Previous approved v{state.lastApproved.version} — older revision
                                </Link>
                              )}
                              <Link
                                to="/projects/$projectId/documents"
                                params={{ projectId: set.project_id }}
                                search={{
                                  document: doc.id,
                                  ...(state.latest ? { version: state.latest.id } : {}),
                                }}
                                className="block text-xs text-gold-deep underline"
                              >
                                Review latest file
                              </Link>
                            </>
                          ) : (
                            <p className="text-xs text-ink-soft">
                              Choose a file from this set to replace this link.
                            </p>
                          )}
                          {editable && managing && (
                            <button
                              disabled={busy}
                              className={button}
                              aria-label={`Unpin ${doc?.title ?? "unavailable document"} from ${kind.label}`}
                              onClick={() => void save(pin.document_id, kind.id, true)}
                            >
                              Unpin
                            </button>
                          )}
                        </li>
                      );
                    })}
                </ul>
                {!pins.some((p) => p.category === kind.id) && (
                  <p className="mt-2 text-xs text-ink-soft">No instructions linked yet.</p>
                )}
              </div>
            ))}
          </div>
        ))}
      {editable && managing && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-ink-soft">
            Link an existing set file. Uploads, folders and approvals stay in Files. Only an
            approved latest revision is shown as current.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Instruction category"
              value={category}
              className={field}
              onChange={(e) => {
                setCategory(e.target.value as InstructionCategory);
                setDocumentId("");
              }}
            >
              {instructionCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Instruction document"
              value={documentId}
              className={field}
              onChange={(e) => setDocumentId(e.target.value)}
            >
              <option value="">Choose a set file…</option>
              {setDocs
                .filter((d) => !pins.some((p) => p.category === category && p.document_id === d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
            <button
              className={`${button} shrink-0`}
              disabled={!documentId || busy || loading || Boolean(error)}
              onClick={() => void save(documentId, category)}
            >
              Link file
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
