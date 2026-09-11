import { useState } from "react";
import { useStore } from "@/lib/store";
import { loadEditHistory, type EditHistory } from "@/lib/workspace-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SetUpdateComposer, button } from "./SetUpdateComposer";
export function MessageRecordTools({
  id,
  projectId,
  readOnly,
}: {
  id: string;
  projectId: string;
  readOnly: boolean;
}) {
  const { comments, threads, tasks, documents } = useStore();
  const message = comments.find((c) => c.id === id);
  const thread = threads.find((t) => t.id === message?.thread_id);
  const sceneId =
    thread?.scene_id ||
    tasks.find((t) => t.id === thread?.task_id)?.scene_id ||
    documents.find((d) => d.id === thread?.document_id)?.scene_id;
  const [record, setRecord] = useState(false);
  const [history, setHistory] = useState<EditHistory[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      {!readOnly && (
        <button className="min-h-9 text-xs text-ink-soft" onClick={() => setRecord(true)}>
          Record decision
        </button>
      )}
      {message?.edited_at && (
        <button
          className="min-h-9 text-xs underline"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              setHistory(await loadEditHistory(id));
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not load history");
            } finally {
              setLoading(false);
            }
          }}
        >
          Edit history
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {record && (
        <SetUpdateComposer
          projectId={projectId}
          sceneId={sceneId || undefined}
          sourceCommentId={id}
          initialBody={message?.body}
          onClose={() => setRecord(false)}
        />
      )}
      {history && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) setHistory(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Message edit history</DialogTitle>
              <DialogDescription>
                The original send time determines the two-hour editing window.
              </DialogDescription>
            </DialogHeader>
            {history.length ? (
              history.map((h) => (
                <section key={h.id} className="space-y-2 border-t pt-3 text-sm">
                  <p>{new Date(h.edited_at).toLocaleString()}</p>
                  <p className="whitespace-pre-wrap break-words">
                    <strong>Before: </strong>
                    {h.old_body}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    <strong>After: </strong>
                    {h.new_body}
                  </p>
                </section>
              ))
            ) : (
              <p className="text-sm">
                No retained revisions. Edits made before history was enabled are not available.
              </p>
            )}
            <button className={button} onClick={() => setHistory(null)}>
              Close
            </button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
