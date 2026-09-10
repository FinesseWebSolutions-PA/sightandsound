import { useEffect, useState } from "react";
import { FolderPlus, Loader2, X } from "lucide-react";

import { useStore } from "@/lib/store";

/**
 * Asks which folder a shared file should be filed into, offering the folders that
 * already exist in this production plus a new one.
 */
export function SaveToDocsDialog({
  attachmentId,
  fileName,
  projectId,
  onClose,
}: {
  attachmentId: string;
  fileName: string;
  projectId: string;
  onClose: () => void;
}) {
  const { documents, saveAttachmentToDocuments } = useStore();
  const existing = Array.from(
    new Set(
      documents
        .filter((d) => d.project_id === projectId && d.folder)
        .map((d) => d.folder)
        .sort((a, b) => a.localeCompare(b)),
    ),
  );

  const [choice, setChoice] = useState(existing[0] ?? "__new");
  const [newFolder, setNewFolder] = useState("");
  const [title, setTitle] = useState(fileName);
  const [noApproval, setNoApproval] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const folder = choice === "__new" ? newFolder.trim() : choice;

  const submit = async () => {
    if (!folder) {
      setError("Give the folder a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveAttachmentToDocuments({
        attachmentId,
        folder,
        title: title.trim() || fileName,
        requiresApproval: !noApproval,
      });
      onClose();
    } catch {
      setError("That could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Save to project docs</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="save-title">
          Name in documents
        </label>
        <input
          id="save-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
        />

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="save-folder">
          Folder
        </label>
        <select
          id="save-folder"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
        >
          {existing.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          <option value="__new">New folder…</option>
        </select>

        {choice === "__new" && (
          <div className="mt-2 flex items-center gap-2">
            <FolderPlus aria-hidden className="size-4 shrink-0 text-ink-soft" />
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="Folder name"
              aria-label="New folder name"
              className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
            />
          </div>
        )}

        <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={noApproval}
            onChange={(e) => setNoApproval(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border"
          />
          <span>
            No approval needed
            <span className="block text-xs text-ink-soft">
              By default this document has to be approved before the work it belongs to can be
              marked complete.
            </span>
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border bg-card px-4 text-sm font-medium text-ink hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
          >
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
