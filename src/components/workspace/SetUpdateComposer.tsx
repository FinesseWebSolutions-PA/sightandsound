import { useEffect, useState } from "react";
import { people, useStore } from "@/lib/store";
import { loadRecipients, workspaceAction, type Recipient } from "@/lib/workspace-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export const field = "w-full min-h-10 rounded-md border border-border bg-card p-2 text-sm";
export const button =
  "min-h-10 rounded-md border border-border bg-card px-3 py-2 text-sm disabled:opacity-50";
export function SetUpdateComposer({
  projectId,
  sceneId,
  sourceCommentId,
  initialBody = "",
  onClose,
  onSaved,
}: {
  projectId: string;
  sceneId?: string | undefined;
  sourceCommentId?: string;
  initialBody?: string | undefined;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { scenes, tasks, documents, documentVersions, currentUserId, libraryAction } = useStore();
  const [scene, setScene] = useState(sceneId ?? "");
  const [body, setBody] = useState(initialBody);
  const [kind, setKind] = useState(sourceCommentId ? "decision" : "update");
  const [owner, setOwner] = useState(currentUserId);
  const [task, setTask] = useState("");
  const [version, setVersion] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setReady(false);
    setRecipients([]);
    setTask("");
    setVersion("");
    if (scene)
      loadRecipients(scene)
        .then((r) => {
          if (active) {
            setRecipients(r);
            setReady(true);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [scene]);
  const targets = recipients.filter((r) => r.person_id !== currentUserId);
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sourceCommentId ? "Record a decision" : "Important set update"}
          </DialogTitle>
          <DialogDescription>
            Keep the decision and the people who need to know together. Reactions are not approvals.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const ok = await libraryAction(projectId, () =>
                workspaceAction(
                  "post_update",
                  {
                    scene_id: scene,
                    kind,
                    body,
                    owner_id: owner,
                    task_id: task || null,
                    document_version_id: version || null,
                    source_comment_id: sourceCommentId ?? null,
                    needs_ack: ack,
                    recipients: targets.map((r) => r.person_id),
                  },
                  currentUserId,
                ),
              );
              if (ok) {
                onSaved?.();
                onClose();
              } else {
                const r = await loadRecipients(scene);
                setRecipients(r);
                setError("Not saved. Review the current recipients and try again.");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not post");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="space-y-3">
            <label className="block text-sm">
              Set
              <select
                required
                className={field}
                value={scene}
                onChange={(e) => setScene(e.target.value)}
              >
                <option value="">Choose a set</option>
                {scenes
                  .filter((s) => s.project_id === projectId && (!sceneId || s.id === sceneId))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Type
              <select className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="update">Important update</option>
                <option value="decision">Recorded decision</option>
              </select>
            </label>
            <label className="block text-sm">
              {kind === "decision" ? "Decision and reason" : "What changed?"}
              <textarea
                required
                rows={4}
                className={field}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Responsible person
              <select
                required
                className={field}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                {people
                  .filter((p) => p.role !== "viewer")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Follow-up work (optional)
              <select className={field} value={task} onChange={(e) => setTask(e.target.value)}>
                <option value="">No linked work</option>
                {tasks
                  .filter((t) => t.scene_id === scene)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Document version (optional)
              <select
                className={field}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              >
                <option value="">No linked file</option>
                {documentVersions
                  .filter((v) =>
                    documents.some((d) => d.scene_id === scene && d.id === v.document_id),
                  )
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {documents.find((d) => d.id === v.document_id)?.title} · v{v.version}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              Ask recipients to acknowledge this update
            </label>
            <div className="rounded-md bg-cream p-3 text-sm">
              <strong>Will notify {targets.length} people</strong>
              <p>
                {ready
                  ? targets.map((r) => r.full_name).join(", ") ||
                    "No other followers yet. Assign people or have them follow this set first."
                  : "Choose a set to load recipients."}
              </p>
              <p className="mt-1 text-xs">
                Assigned members, work owners, the set lead, and people following this set.
                Recipients are saved with this update.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <button
              disabled={
                !ready || !body.trim() || !scene || !owner || busy || (ack && targets.length === 0)
              }
              className="btn-primary px-4 py-2"
            >
              {busy ? "Saving…" : "Post and notify"}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
