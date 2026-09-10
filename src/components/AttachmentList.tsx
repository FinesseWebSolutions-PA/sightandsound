import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, Download, FileText, FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { SaveToDocsDialog } from "@/components/SaveToDocsDialog";
import { attachmentUrls, type CommentAttachment } from "@/lib/production-data";
import { useStore } from "@/lib/store";

function sizeLabel(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Files shared in a message, with the option to file them into project docs. */
export function AttachmentList({
  attachments,
  projectId,
}: {
  attachments: CommentAttachment[];
  projectId: string;
}) {
  const { documents, can, isClosed } = useStore();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<CommentAttachment | null>(null);

  const keys = attachments.map((a) => a.storage_key).join("|");
  useEffect(() => {
    const list = keys ? keys.split("|") : [];
    if (list.length === 0) return;
    let cancelled = false;
    attachmentUrls(list)
      .then((next) => {
        if (!cancelled) setUrls(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [keys]);

  if (attachments.length === 0) return null;
  const canSave = can.upload && !isClosed(projectId);

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((a) => {
        const url = urls[a.storage_key];
        const isImage = a.mime_type.startsWith("image/");
        const savedDoc = a.saved_document_id
          ? documents.find((d) => d.id === a.saved_document_id)
          : undefined;
        return (
          <div key={a.id} className="rounded-lg border border-border bg-card p-2 text-left">
            {isImage && url ? (
              <a href={url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={url}
                  alt={a.file_name}
                  loading="lazy"
                  className="max-h-56 w-full rounded-md object-cover"
                />
              </a>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <FileText aria-hidden className="size-4 shrink-0 text-ink-soft" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{a.file_name}</span>
              <span className="text-xs text-ink-soft">{sizeLabel(a.byte_size)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-cream"
                >
                  <Download aria-hidden className="size-4" />
                  Open
                </a>
              )}
              {savedDoc ? (
                <Link
                  to="/projects/$projectId/documents"
                  params={{ projectId }}
                  search={{ document: savedDoc.id }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-success hover:underline"
                >
                  <CheckCircle2 aria-hidden className="size-4" />
                  Saved to {savedDoc.folder || "documents"}
                </Link>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-soft px-2 py-1 text-xs font-medium text-ink-soft">
                    <CircleDashed aria-hidden className="size-3.5" />
                    Not saved to documents
                  </span>
                  {canSave && (
                    <button
                      type="button"
                      onClick={() => setSaving(a)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-cream"
                    >
                      <FolderPlus aria-hidden className="size-4" />
                      Save to project docs
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {saving && (
        <SaveToDocsDialog
          attachmentId={saving.id}
          fileName={saving.file_name}
          projectId={projectId}
          onClose={() => setSaving(null)}
        />
      )}
    </div>
  );
}
