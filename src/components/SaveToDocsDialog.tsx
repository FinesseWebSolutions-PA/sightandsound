import { useState } from "react";
import { useStore } from "@/lib/store";
import { FolderSelect } from "./FolderSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
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
  const { documentFolders, saveAttachmentToDocuments } = useStore();
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            {fileName} stays linked to its original conversation.
          </DialogDescription>
        </DialogHeader>
        <FolderSelect
          folders={documentFolders.filter((f) => f.project_id === projectId)}
          value={folder}
          onChange={setFolder}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 rounded border px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-primary min-h-11 px-4"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await saveAttachmentToDocuments({
                  attachmentId,
                  folder,
                  title: fileName,
                  requiresApproval: false,
                });
                onClose();
              } catch {
                setError("Could not move this file. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Moving…" : "Move"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
