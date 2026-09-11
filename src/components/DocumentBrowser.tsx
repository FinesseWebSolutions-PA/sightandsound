import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Folder,
  FolderPlus,
  Upload,
  Search,
  Star,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  X,
  Check,
  ChevronRight,
  List,
  LayoutGrid,
  MessageSquare,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Discussion } from "./Discussion";
import { DocumentPreview } from "./DocumentPreview";
import { AttachmentList } from "./AttachmentList";
import { FolderSelect } from "./FolderSelect";
import { MentionInput } from "./MentionInput";
import { MentionText } from "./MentionText";
import { people, personById, useStore } from "@/lib/store";
import {
  folderTrail,
  folderLabel,
  isFolderDescendant,
  approvedDocumentVersions,
} from "@/lib/document-library";
import { formatDateTime } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Document, DocumentFolder } from "@/lib/production-data";

const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-cream disabled:opacity-50";
const states = {
  draft: "Draft",
  in_review: "Awaiting approval",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Changes requested",
};
type View = "files" | "recent" | "starred" | "review" | "shared" | "trash";
type Action = {
  type: "new" | "rename" | "move" | "trash" | "restore";
  folder?: DocumentFolder;
  ids?: string[];
};
type Queued = {
  id: string;
  file: File;
  folderId: string | null;
  state: "queued" | "uploading" | "done" | "failed";
};

export function DocumentBrowser({
  projectId,
  sceneId,
  openDocumentId = "",
  initialVersionId,
  openFolder = "",
  highlightCommentId,
  onOpenDocument,
  onCloseDocument,
  onPlaceChange,
}: {
  projectId: string;
  sceneId?: string;
  openDocumentId?: string;
  initialVersionId?: string | undefined;
  openFolder?: string;
  highlightCommentId?: string;
  onOpenDocument?: (id: string) => void;
  onCloseDocument?: () => void;
  onPlaceChange?: (value: string) => void;
}) {
  const store = useStore();
  const {
    documents,
    trashedDocuments,
    documentFolders,
    documentStars,
    documentVersions,
    approvals,
    currentUserId,
    commentAttachments,
    comments,
    threads,
    can,
    isClosed,
  } = store;
  const folders = documentFolders.filter((f) => f.project_id === projectId);
  const [location, setLocation] = useState(openFolder);
  const [openedId, setOpenedId] = useState(openDocumentId);
  const [query, setQuery] = useState("");
  const [fileState, setFileState] = useState("all");
  const [grid, setGrid] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<Action | null>(null);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [queue, setQueue] = useState<Queued[]>([]);
  const uploading = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => setLocation(openFolder), [openFolder]);
  useEffect(() => setOpenedId(openDocumentId), [openDocumentId]);
  const view: View = location.startsWith("view:") ? (location.slice(5) as View) : "files";
  const pinned = sceneId ? folders.find((f) => f.scene_id === sceneId) : null;
  const requestedFolderId =
    (location.startsWith("folder:")
      ? folders.find((f) => f.id === location.slice(7) || f.name === location.slice(7))?.id
      : location.startsWith("set:")
        ? folders.find((f) => f.scene_id === location.slice(4))?.id
        : pinned?.id) ?? null;
  const folderId =
    pinned && (!requestedFolderId || !isFolderDescendant(folders, requestedFolderId, pinned.id))
      ? pinned.id
      : requestedFolderId;
  const currentFolder = folders.find((f) => f.id === folderId);
  const writable = can.upload && !isClosed(projectId);
  const navigate = (next: string) => {
    setLocation(next);
    setSelected([]);
    setQuery("");
    onPlaceChange?.(next);
  };
  const openFile = (id: string) => {
    setOpenedId(id);
    onOpenDocument?.(id);
  };
  const closeFile = () => {
    setOpenedId("");
    onCloseDocument?.();
  };
  const projectDocs = (view === "trash" ? trashedDocuments : documents).filter(
    (d) => d.project_id === projectId && (!sceneId || d.scene_id === sceneId),
  );
  const stars = new Set(
    documentStars.filter((s) => s.person_id === currentUserId).map((s) => s.document_id),
  );
  const visibleDocs = projectDocs
    .filter(
      (d) =>
        fileState === "all" ||
        (fileState === "approved"
          ? d.approval_state === "approved"
          : fileState === "reference"
            ? !d.requires_approval
            : d.requires_approval && d.approval_state !== "approved"),
    )
    .filter((d) => {
      if (query.trim())
        return `${d.title} ${folderLabel(folders, d.folder_id ?? null)}`
          .toLowerCase()
          .includes(query.toLowerCase().trim());
      if (view === "starred") return stars.has(d.id);
      if (view === "review") return d.approval_state === "in_review";
      if (view === "shared") return false;
      if (view === "recent" || view === "trash") return true;
      return (
        (d.folder_id ?? null) === folderId || (!!sceneId && !d.folder_id && d.scene_id === sceneId)
      );
    })
    .sort((a, b) =>
      view === "recent" ? b.updated_at.localeCompare(a.updated_at) : a.title.localeCompare(b.title),
    );
  const visibleFolders = folders.filter((f) =>
    query.trim()
      ? (view === "files" || view === "trash") &&
        (view === "trash" ? !!f.deleted_at : !f.deleted_at) &&
        f.name.toLowerCase().includes(query.toLowerCase())
      : view === "trash"
        ? !!f.deleted_at && !folders.some((p) => p.id === f.parent_id && p.deleted_at)
        : view === "files" && !f.deleted_at && f.parent_id === folderId,
  );
  const shared = commentAttachments.filter((a) => {
    const thread = threads.find(
      (t) => t.id === comments.find((c) => c.id === a.comment_id)?.thread_id,
    );
    return (
      thread?.project_id === projectId &&
      (!sceneId ||
        thread.scene_id === sceneId ||
        documents.some((d) => d.id === thread.document_id && d.scene_id === sceneId) ||
        store.tasks.some((t) => t.id === thread.task_id && t.scene_id === sceneId)) &&
      (!query || a.file_name.toLowerCase().includes(query.toLowerCase()))
    );
  });
  const opened = documents.find((d) => d.id === openedId && d.project_id === projectId);
  const startAction = (next: Action) => {
    setAction(next);
    setName(next.folder?.name ?? documents.find((d) => d.id === next.ids?.[0])?.title ?? "");
    setDestination(folderId ?? "");
    setActionError("");
  };
  const finishAction = async () => {
    if (!action) return;
    setBusy(true);
    setActionError("");
    try {
      const ok =
        action.type === "new"
          ? await store.createFolder(projectId, folderId, name)
          : action.folder
            ? await store.changeFolder(action.folder.id, action.type, name, destination || null)
            : await store.changeDocuments(
                action.ids ?? [],
                action.type as "move" | "rename" | "trash" | "restore",
                action.type === "rename" ? name : destination || null,
              );
      if (ok) {
        setAction(null);
        setSelected([]);
      } else setActionError("Could not save this change. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const uploadFiles = async (files: File[], retry?: Queued) => {
    if (uploading.current || !writable || view === "trash") return;
    uploading.current = true;
    const items = retry
      ? [{ ...retry, state: "queued" as const }]
      : files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          folderId,
          state: "queued" as const,
        }));
    setQueue((prev) =>
      retry ? prev.map((q) => (q.id === retry.id ? items[0]! : q)) : [...prev, ...items],
    );
    try {
      for (const item of items) {
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, state: "uploading" } : q)));
        const ok = await store.uploadDocument({
          projectId,
          file: item.file,
          folder: null,
          folderId: item.folderId,
          sceneId: null,
          requiresApproval: false,
        });
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, state: ok ? "done" : "failed" } : q)),
        );
      }
    } finally {
      uploading.current = false;
    }
  };
  const drop = (e: React.DragEvent, target: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!writable || view === "trash") return;
    const ids = e.dataTransfer.getData("application/sight-sound-files");
    if (ids) {
      try {
        const list = JSON.parse(ids);
        if (
          Array.isArray(list) &&
          list.every((id) => documents.some((d) => d.id === id && d.project_id === projectId))
        )
          void store.changeDocuments(list, "move", target);
      } catch {
        /* Ignore unrelated drag payloads. */
      }
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (target === folderId) void uploadFiles(files);
    else {
      // Preserve the drop destination even when the current folder is different.
      if (uploading.current) return;
      uploading.current = true;
      const items = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        folderId: target,
        state: "queued" as const,
      }));
      setQueue((p) => [...p, ...items]);
      void (async () => {
        try {
          for (const item of items) {
            setQueue((p) => p.map((q) => (q.id === item.id ? { ...q, state: "uploading" } : q)));
            const ok = await store.uploadDocument({
              projectId,
              file: item.file,
              folder: null,
              folderId: target,
              sceneId: null,
              requiresApproval: false,
            });
            setQueue((p) =>
              p.map((q) => (q.id === item.id ? { ...q, state: ok ? "done" : "failed" } : q)),
            );
          }
        } finally {
          uploading.current = false;
        }
      })();
    }
  };
  const fileMenu = (doc: Document) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${doc.title}`}
          className="grid size-10 place-items-center rounded hover:bg-cream"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {view !== "trash" && (
          <DropdownMenuItem onSelect={() => openFile(doc.id)}>Open file</DropdownMenuItem>
        )}
        {writable &&
          (view === "trash" ? (
            <DropdownMenuItem onSelect={() => startAction({ type: "restore", ids: [doc.id] })}>
              Restore
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => startAction({ type: "rename", ids: [doc.id] })}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startAction({ type: "move", ids: [doc.id] })}>
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startAction({ type: "trash", ids: [doc.id] })}>
                Move to Trash
              </DropdownMenuItem>
            </>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <div className="space-y-4">
      <div className="surface-card overflow-hidden md:grid md:grid-cols-[180px_minmax(0,1fr)]">
        <nav
          aria-label="Document library"
          className="flex gap-1 overflow-x-auto border-b border-border bg-cream-soft p-2 md:flex-col md:border-b-0 md:border-r"
        >
          {(
            [
              ["files", "Files", Folder],
              ["recent", "Recent", Clock],
              ["starred", "Starred", Star],
              ["review", "Awaiting approval", CheckCircle2],
              ["shared", "Shared in conversations", MessageSquare],
              ["trash", "Trash", Trash2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key === "files" ? "" : `view:${key}`)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded px-3 text-left text-sm",
                view === key ? "bg-gold-tint font-semibold" : "hover:bg-cream",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <section
          className="min-w-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, folderId)}
        >
          <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <nav
              aria-label="Folder path"
              className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
            >
              <button
                className="min-h-10 px-2 font-medium"
                type="button"
                onClick={() => navigate("")}
              >
                {sceneId ? "This set" : "Files"}
              </button>
              {view === "files" ? (
                folderTrail(folders, folderId).map((f) => (
                  <span key={f.id} className="flex items-center">
                    <ChevronRight className="size-3" />
                    <button
                      type="button"
                      className="min-h-10 max-w-48 truncate px-2"
                      onClick={() => navigate(`folder:${f.id}`)}
                    >
                      {f.name}
                    </button>
                  </span>
                ))
              ) : (
                <span>
                  /{" "}
                  {view === "review"
                    ? "Awaiting approval"
                    : view === "shared"
                      ? "Shared in conversations"
                      : view[0]?.toUpperCase() + view.slice(1)}
                </span>
              )}
            </nav>
            <div className="ml-auto flex gap-2">
              {writable && view !== "trash" && (
                <>
                  <button
                    type="button"
                    className={button}
                    disabled={uploading.current}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload className="size-4" />
                    Upload files
                  </button>
                  {view === "files" && (
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        startAction({ type: "new" });
                        setName("");
                      }}
                    >
                      <FolderPlus className="size-4" />
                      New folder
                    </button>
                  )}
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  void uploadFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex w-full gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-3 size-4 text-ink-soft" />
                <input
                  aria-label="Search documents"
                  placeholder="Search files and folders…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-10 w-full rounded border border-border bg-card pl-9 pr-3 text-sm"
                />
              </label>
              <button
                type="button"
                aria-label={grid ? "List view" : "Grid view"}
                className={button}
                onClick={() => setGrid(!grid)}
              >
                {grid ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
              </button>
            </div>
            <label className="block text-xs text-ink-soft">
              File status
              <select
                className="mt-1 min-h-10 w-full rounded border border-border bg-card px-2 text-sm"
                value={fileState}
                onChange={(e) => {
                  setFileState(e.target.value);
                  setSelected([]);
                }}
              >
                <option value="all">All files</option>
                <option value="approved">Current approved files</option>
                <option value="draft">Drafts and files needing approval</option>
                <option value="reference">Reference files</option>
              </select>
            </label>
          </header>
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-cream p-2 text-sm">
              <span>{selected.length} selected</span>
              {writable &&
                (view === "trash" ? (
                  <button
                    className={button}
                    onClick={() => startAction({ type: "restore", ids: selected })}
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      className={button}
                      onClick={() => startAction({ type: "move", ids: selected })}
                    >
                      Move
                    </button>
                    <button
                      className={button}
                      onClick={() => startAction({ type: "trash", ids: selected })}
                    >
                      Trash
                    </button>
                  </>
                ))}
              <button className={button} onClick={() => setSelected([])}>
                Clear
              </button>
            </div>
          )}
          {view === "shared" ? (
            <div className="space-y-3 p-4">
              {shared.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  Files shared in conversations will appear here automatically.
                </p>
              ) : (
                <AttachmentList attachments={shared} projectId={projectId} />
              )}
            </div>
          ) : (
            <div
              className={
                grid
                  ? "grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3"
                  : "divide-y divide-border"
              }
            >
              {visibleFolders.map((f) => (
                <div
                  key={f.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => drop(e, f.id)}
                  className={cn(
                    "flex min-w-0 items-center gap-2 p-3",
                    grid && "rounded-lg border border-border",
                  )}
                >
                  <Folder className="size-6 shrink-0 fill-gold-tint text-gold-deep" />
                  <button
                    type="button"
                    disabled={!!f.deleted_at}
                    onClick={() => navigate(`folder:${f.id}`)}
                    className="min-w-0 flex-1 text-left text-sm font-semibold"
                  >
                    <span className="block truncate">{f.name}</span>
                    <span className="text-xs font-normal text-ink-soft">
                      {f.scene_id ? "Set folder" : "Folder"}
                    </span>
                  </button>
                  {writable && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for folder ${f.name}`}
                          className="grid size-10 place-items-center"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {f.deleted_at ? (
                          <DropdownMenuItem
                            onSelect={() => startAction({ type: "restore", folder: f })}
                          >
                            Restore folder
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onSelect={() => startAction({ type: "rename", folder: f })}
                            >
                              Rename
                            </DropdownMenuItem>
                            {!f.scene_id && (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => startAction({ type: "move", folder: f })}
                                >
                                  Move
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => startAction({ type: "trash", folder: f })}
                                >
                                  Move to Trash
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              {visibleDocs.map((doc) => (
                <div
                  key={doc.id}
                  draggable={writable && view !== "trash"}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/sight-sound-files",
                      JSON.stringify(selected.includes(doc.id) ? selected : [doc.id]),
                    )
                  }
                  className={cn(
                    "flex min-w-0 items-center gap-2 p-3",
                    grid && "flex-wrap rounded-lg border border-border",
                    selected.includes(doc.id) && "bg-gold-tint/40",
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${doc.title}`}
                    checked={selected.includes(doc.id)}
                    onChange={(e) =>
                      setSelected((p) =>
                        e.target.checked ? [...p, doc.id] : p.filter((id) => id !== doc.id),
                      )
                    }
                  />
                  <FileText className="size-5 shrink-0 text-ink-soft" />
                  <button
                    type="button"
                    disabled={view === "trash"}
                    onClick={() => openFile(doc.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">{doc.title}</span>
                    <span className="block text-xs text-ink-soft">
                      v{doc.current_version} ·{" "}
                      {doc.requires_approval ? states[doc.approval_state] : "Reference file"}
                    </span>
                    {view !== "files" && (
                      <span className="block truncate text-xs text-ink-soft">
                        {folderLabel(folders, doc.folder_id ?? null)}
                      </span>
                    )}
                  </button>
                  {view !== "trash" && writable && (
                    <button
                      type="button"
                      aria-label={`${stars.has(doc.id) ? "Unstar" : "Star"} ${doc.title}`}
                      onClick={() => void store.starDocument(doc.id, !stars.has(doc.id))}
                      className="grid size-10 place-items-center"
                    >
                      <Star
                        className={cn(
                          "size-4",
                          stars.has(doc.id) ? "fill-gold text-gold-deep" : "text-ink-soft",
                        )}
                      />
                    </button>
                  )}{" "}
                  {fileMenu(doc)}
                </div>
              ))}
              {visibleDocs.length === 0 && visibleFolders.length === 0 && (
                <div className="p-10 text-center text-sm text-ink-soft">
                  {query
                    ? "No matching files or folders."
                    : view === "trash"
                      ? "Trash is empty."
                      : view === "review"
                        ? "No files are waiting for approval."
                        : view === "starred"
                          ? "Star a file to keep it close at hand."
                          : "This folder is empty. Drop files here or choose Upload files."}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {queue.length > 0 && (
        <section className="surface-card p-3" aria-label="Upload progress">
          <div className="flex justify-between">
            <h3 className="text-sm font-semibold">
              Uploads · {queue.filter((q) => q.state === "done").length} of {queue.length} complete
            </h3>
            {!uploading.current && (
              <button
                type="button"
                onClick={() => setQueue((p) => p.filter((q) => q.state === "failed"))}
                className="text-xs underline"
              >
                Clear completed
              </button>
            )}
          </div>
          <ul className="mt-2 space-y-2" aria-live="polite">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{q.file.name}</span>
                <span>
                  {q.state === "done"
                    ? "Uploaded"
                    : q.state === "failed"
                      ? "Failed"
                      : q.state === "uploading"
                        ? "Uploading…"
                        : "Queued"}
                </span>
                {q.state === "failed" && (
                  <button
                    type="button"
                    disabled={uploading.current}
                    onClick={() => void uploadFiles([], q)}
                    className="underline"
                  >
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.type === "new"
                ? "New folder"
                : action?.type === "trash"
                  ? "Move to Trash"
                  : action?.type === "restore"
                    ? "Restore"
                    : action?.type === "move"
                      ? "Move to folder"
                      : "Rename"}
            </DialogTitle>
            <DialogDescription>
              {action?.type === "trash"
                ? "Files and conversation history are kept. You can restore this from Trash."
                : "Keep your production files organized."}
            </DialogDescription>
          </DialogHeader>
          {(action?.type === "new" || action?.type === "rename") && (
            <input
              aria-label="Name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 rounded border px-3"
              maxLength={120}
            />
          )}{" "}
          {action?.type === "move" && (
            <FolderSelect
              folders={folders}
              value={destination}
              onChange={setDestination}
              {...(action.folder ? { excludeId: action.folder.id } : {})}
            />
          )}{" "}
          {actionError && (
            <p role="alert" className="text-sm text-danger">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button className={button} disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </button>
            <button
              className="btn-primary min-h-10 px-4"
              disabled={
                busy || ((action?.type === "new" || action?.type === "rename") && !name.trim())
              }
              onClick={() => void finishAction()}
            >
              {busy
                ? "Saving…"
                : action?.type === "trash"
                  ? "Move to Trash"
                  : action?.type === "restore"
                    ? "Restore"
                    : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {opened && (
        <FileViewer
          initialVersionId={initialVersionId}
          key={`${opened.id}:${initialVersionId || "latest"}`}
          doc={opened}
          onClose={closeFile}
          {...(highlightCommentId ? { highlightCommentId } : {})}
        />
      )}
    </div>
  );
}

function FileViewer({
  initialVersionId,
  doc,
  onClose,
  highlightCommentId,
}: {
  initialVersionId?: string | undefined;
  doc: Document;
  onClose: () => void;
  highlightCommentId?: string;
}) {
  const {
    documentVersions,
    approvals,
    recordApproval,
    addDocumentVersion,
    can,
    isClosed,
    currentUserId,
    setDocumentApprovalRequirement,
    documentFolders,
  } = useStore();
  const versions = documentVersions
    .filter((v) => v.document_id === doc.id)
    .sort((a, b) => b.version - a.version);
  const [versionId, setVersionId] = useState(initialVersionId || versions[0]?.id || "");
  const version = versions.find((v) => v.id === versionId);
  const latest = versions[0];
  const [pane, setPane] = useState<"review" | "conversation">(
    highlightCommentId ? "conversation" : "review",
  );
  const [requesting, setRequesting] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState(false);
  const history = approvals
    .filter((a) => a.document_id === doc.id && a.version === version?.version)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pending = history[0]?.decision === "requested" ? history[0] : undefined;
  const current = versionId === latest?.id;
  const writable = can.upload && !isClosed(doc.project_id);
  const mayDecide =
    writable &&
    current &&
    pending &&
    (!pending.reviewer_id || pending.reviewer_id === currentUserId);
  const approvedVersions = approvedDocumentVersions(approvals, doc.id);
  const approved = approvedVersions[0];
  const decide = async (decision: "requested" | "approved" | "changes_requested") => {
    if (!version || busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await recordApproval(
        doc.id,
        decision,
        decision === "approved" ? "" : note,
        version.id,
        reviewer,
      );
      if (ok) {
        setRequesting(false);
        setChanging(false);
        setNote("");
      } else setError("The decision was not saved. Review the message above and try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="flex h-[94dvh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-[1400px]"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate pr-2 text-base">{doc.title}</DialogTitle>
            <DialogDescription className="truncate">
              {folderLabel(documentFolders, doc.folder_id ?? null)}
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Close file"
            disabled={busy}
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center"
          >
            <X className="size-5" />
          </button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
          <section className="min-w-0 border-r border-border">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <label className="text-sm">
                Version{" "}
                <select
                  aria-label="File version"
                  value={versionId}
                  disabled={busy}
                  onChange={(e) => {
                    setVersionId(e.target.value);
                    setRequesting(false);
                    setChanging(false);
                    setError("");
                  }}
                  className="ml-2 rounded border p-2"
                >
                  {versions.map((v) => (
                    <option value={v.id} key={v.id}>
                      v{v.version}
                      {v.id === latest?.id ? " — latest" : ""}
                      {approvedVersions.includes(v.version) ? " · approved" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {writable && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => setUploadMode(!uploadMode)}
                >
                  <Upload className="size-4" />
                  New version
                </button>
              )}
            </div>
            {!current && (
              <div className="mx-3 mb-3 rounded border border-warning/30 bg-warning-bg p-3 text-sm">
                You’re viewing v{version?.version}.{" "}
                <button className="underline" onClick={() => setVersionId(latest?.id ?? "")}>
                  Open latest version
                </button>
              </div>
            )}
            {uploadMode && (
              <div className="m-3 space-y-3 rounded border p-3">
                <label className="block text-sm">
                  Choose updated file
                  <input
                    aria-label="New version file"
                    type="file"
                    disabled={busy}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full"
                  />
                </label>
                <MentionInput
                  value={note}
                  onChange={setNote}
                  rows={2}
                  ariaLabel="Version changes"
                  placeholder="What changed?"
                />
                <button
                  className="btn-primary min-h-10 px-4"
                  disabled={busy || !file}
                  onClick={async () => {
                    if (!file) return;
                    setBusy(true);
                    setError("");
                    try {
                      if (await addDocumentVersion(doc.id, file, note)) {
                        setUploadMode(false);
                        setFile(null);
                        setNote("");
                      } else setError("The version could not be uploaded. Please retry.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Uploading…" : "Upload version"}
                </button>
                <p className="text-xs text-ink-soft">
                  Existing approvals stay with their version. The new version needs a fresh review.
                </p>
              </div>
            )}
            <DocumentPreview
              storageKey={version?.storage_key ?? null}
              fileLabel={version?.file_label ?? doc.title}
            />
          </section>
          <aside className="min-w-0">
            <div className="flex gap-1 border-b p-2">
              {(
                [
                  ["review", "Details & approval"],
                  ["conversation", "Conversation"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={cn(button, pane === key && "bg-cream font-semibold")}
                  onClick={() => setPane(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-4 p-4">
              {error && (
                <p
                  role="alert"
                  className="rounded border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
                >
                  {error}
                </p>
              )}
              {pane === "conversation" ? (
                <Discussion
                  inline
                  projectId={doc.project_id}
                  contextType="document"
                  documentId={doc.id}
                  {...(highlightCommentId ? { highlightCommentId } : {})}
                />
              ) : (
                <>
                  <div className="rounded-lg border bg-cream-soft p-3">
                    <p className="font-semibold">
                      {current
                        ? doc.requires_approval
                          ? states[doc.approval_state]
                          : "Reference file"
                        : history[0]
                          ? states[
                              history[0].decision === "requested"
                                ? "in_review"
                                : history[0].decision
                            ]
                          : "No approval recorded"}
                    </p>
                    {pending && (
                      <p className="mt-1 text-sm">
                        Waiting for{" "}
                        {personById(pending.reviewer_id ?? "")?.full_name ?? "a reviewer"} · v
                        {version?.version}
                      </p>
                    )}
                    {!pending && history[0]?.decided_by_id && (
                      <p className="mt-1 text-sm">
                        {personById(history[0].decided_by_id)?.full_name} ·{" "}
                        {formatDateTime(history[0].created_at)}
                      </p>
                    )}
                    {approved && approved !== version?.version && (
                      <button
                        className="mt-2 text-sm underline"
                        onClick={() =>
                          setVersionId(
                            versions.find((v) => v.version === approved)?.id ?? versionId,
                          )
                        }
                      >
                        Open approved version v{approved}
                      </button>
                    )}
                  </div>
                  {writable && current && !pending && !requesting && !changing && (
                    <button
                      className="btn-primary min-h-11 w-full px-4"
                      onClick={() => {
                        setRequesting(true);
                        setReviewer("");
                        setNote("");
                      }}
                    >
                      Request approval
                    </button>
                  )}
                  {requesting && current && (
                    <div className="space-y-3 rounded border p-3">
                      <label className="block space-y-1 text-sm">
                        <span>Reviewer</span>
                        <select
                          aria-label="Reviewer"
                          value={reviewer}
                          onChange={(e) => setReviewer(e.target.value)}
                          className="min-h-11 w-full rounded border bg-card px-2"
                        >
                          <option value="">Choose a reviewer…</option>
                          {people
                            .filter((p) => p.role !== "viewer")
                            .map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.full_name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <MentionInput
                        value={note}
                        onChange={setNote}
                        ariaLabel="Review request note"
                        rows={2}
                        placeholder="Optional note for the reviewer"
                      />
                      <button
                        className="btn-primary min-h-10 px-4"
                        disabled={busy || !reviewer}
                        onClick={() => void decide("requested")}
                      >
                        {busy ? "Sending…" : "Send request"}
                      </button>
                      <button
                        className="ml-2 text-sm"
                        disabled={busy}
                        onClick={() => setRequesting(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {mayDecide && !changing && (
                    <div className="flex gap-2">
                      <button
                        className="btn-primary min-h-11 flex-1 px-3"
                        disabled={busy}
                        onClick={() => {
                          setNote("");
                          void decide("approved");
                        }}
                      >
                        <Check className="mr-1 inline size-4" />
                        {busy ? "Saving…" : "Approve"}
                      </button>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => {
                          setChanging(true);
                          setNote("");
                        }}
                      >
                        Request changes
                      </button>
                    </div>
                  )}
                  {changing && mayDecide && (
                    <div className="space-y-3">
                      <MentionInput
                        value={note}
                        onChange={setNote}
                        rows={3}
                        ariaLabel="Requested changes"
                        placeholder="What needs to change?"
                      />
                      <button
                        className="btn-primary min-h-11 px-4"
                        disabled={busy || !note.trim()}
                        onClick={() => void decide("changes_requested")}
                      >
                        {busy ? "Saving…" : "Request changes"}
                      </button>
                      <button
                        className="ml-2 text-sm"
                        disabled={busy}
                        onClick={() => setChanging(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {writable &&
                    current &&
                    doc.requires_approval &&
                    !pending &&
                    doc.approval_state !== "approved" && (
                      <button
                        className="text-xs underline text-ink-soft"
                        onClick={() => setDocumentApprovalRequirement(doc.id, false)}
                      >
                        Mark as reference — no approval needed
                      </button>
                    )}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">
                      Review history · v{version?.version}
                    </h3>
                    {history.length === 0 ? (
                      <p className="text-sm text-ink-soft">No review requested for this version.</p>
                    ) : (
                      history.map((a) => (
                        <div key={a.id} className="mb-2 rounded border p-3 text-sm">
                          <p className="font-medium">
                            {a.decision === "requested"
                              ? "Approval requested"
                              : a.decision === "approved"
                                ? "Approved"
                                : "Changes requested"}
                          </p>
                          <p className="text-xs text-ink-soft">
                            {personById(a.actor_id)?.full_name} · {formatDateTime(a.created_at)}
                          </p>
                          {a.note && (
                            <div className="mt-2">
                              <MentionText body={a.note} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold">Version history</h3>
                    {versions.map((v) => (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => setVersionId(v.id)}
                        className={cn(
                          "mt-2 block w-full rounded border p-3 text-left text-sm",
                          v.id === versionId && "bg-cream",
                        )}
                      >
                        <strong>
                          v{v.version} ·{" "}
                          {v.id === latest?.id ? "Current version" : "Superseded version"}
                        </strong>{" "}
                        · {personById(v.uploaded_by_id)?.full_name}
                        <span className="block text-xs text-ink-soft">
                          {formatDateTime(v.uploaded_at)}
                        </span>
                        <span className="block">{v.note}</span>
                      </button>
                    ))}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
