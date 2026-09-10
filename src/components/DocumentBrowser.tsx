import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileUp,
  Folder,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
  History,
  MessageSquare,
  Send,
  ThumbsDown,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { Discussion } from "@/components/Discussion";
import { DocumentPreview } from "@/components/DocumentPreview";

import { MentionInput } from "@/components/MentionInput";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, useStore } from "@/lib/store";
import { approvalStateMeta, formatDate } from "@/lib/status";
import { activityFor } from "@/lib/threads";
import { cn } from "@/lib/utils";

/**
 * Files a document either into a set's own folder (every set has one) or into a
 * custom folder someone made up for this production.
 */
function FilingControl({
  projectId,
  documentId,
  currentFolder,
  currentSceneId,
}: {
  projectId: string;
  documentId: string;
  currentFolder: string;
  currentSceneId: string;
}) {
  const { documents, scenes, setDocumentFolder, setDocumentSet } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const projectScenes = scenes
    .filter((sc) => sc.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const folders = Array.from(
    new Set(
      documents
        .filter((d) => d.project_id === projectId && d.folder && !d.scene_id)
        .map((d) => d.folder),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (creating) {
    return (
      <span className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          aria-label="New folder name"
          placeholder="Folder name"
          className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base text-ink sm:w-48 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (name.trim()) {
              if (currentSceneId) setDocumentSet(documentId, null);
              setDocumentFolder(documentId, name.trim());
            }
            setCreating(false);
            setName("");
          }}
          className="min-h-11 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
        >
          Save
        </button>
      </span>
    );
  }

  const value = currentSceneId ? `set:${currentSceneId}` : currentFolder ? `folder:${currentFolder}` : "";

  return (
    <select
      aria-label="Document folder"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new") {
          setCreating(true);
          return;
        }
        if (v.startsWith("set:")) {
          setDocumentSet(documentId, v.slice(4));
          return;
        }
        if (currentSceneId) setDocumentSet(documentId, null);
        setDocumentFolder(documentId, v.startsWith("folder:") ? v.slice(7) : "");
      }}
      className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:w-56 sm:text-sm"
    >
      <option value="">Not filed</option>
      {projectScenes.map((sc) => (
        <option key={sc.id} value={`set:${sc.id}`}>
          {sc.name} (set)
        </option>
      ))}
      {folders.map((f) => (
        <option key={f} value={`folder:${f}`}>
          {f}
        </option>
      ))}
      <option value="__new">New folder…</option>
    </select>
  );
}

const decisionLabel: Record<"requested" | "approved" | "changes_requested" | "rejected", string> = {
  requested: "Review requested",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
};

export function DocumentBrowser({
  projectId,
  sceneId: pinnedSceneId,
  openDocumentId,
  highlightCommentId,
}: {
  projectId: string;
  /** When given, only this set's folder is shown — used inside a set workspace. */
  sceneId?: string;
  openDocumentId?: string;
  highlightCommentId?: string;
}) {
  const {
    projects,
    scenes,
    documents,
    documentVersions,
    approvals,
    can,
    recordApproval,
    setDocumentApprovalRequirement,
    addDocumentVersion,
    uploadDocument,
    deleteDocument,
    isClosed,
    threads,
    comments,
    createThread,
    currentUserId,
  } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const locked = isClosed(projectId);
  const canReview = can.decideApproval && !locked;
  const canUpload = can.upload && !locked;

  const projectDocs = documents.filter(
    (d) => d.project_id === projectId && (!pinnedSceneId || d.scene_id === pinnedSceneId),
  );

  /** Highlighted row (single click) vs. opened file (double click / Enter). */
  const [activeId, setActiveId] = useState("");
  const [openedId, setOpenedId] = useState(openDocumentId ?? "");
  // Arriving from the Inbox or the Dashboard opens that exact document.
  useEffect(() => {
    if (openDocumentId) {
      setActiveId(openDocumentId);
      setOpenedId(openDocumentId);
    }
  }, [openDocumentId]);

  const [note, setNote] = useState("");
  /** A decision is only recorded once the reviewer signs it with their own name. */
  const [signature, setSignature] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [pane, setPane] = useState<"details" | "conversation">("details");

  const projectScenes = useMemo(
    () =>
      scenes
        .filter((sc) => sc.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [scenes, projectId],
  );

  /** Where you are: a set's folder, a custom folder, or the top level. */
  type Place = { kind: "set"; id: string; name: string } | { kind: "custom"; name: string } | null;
  const pinnedPlace: Place = pinnedSceneId
    ? {
        kind: "set",
        id: pinnedSceneId,
        name: projectScenes.find((sc) => sc.id === pinnedSceneId)?.name ?? "Set",
      }
    : null;
  const [place, setPlace] = useState<Place>(pinnedPlace);

  // Every set is automatically a folder, even before anything is filed in it.
  const folderList =
    pinnedSceneId || place !== null || query.trim()
      ? []
      : [
          ...projectScenes.map((sc) => ({
            key: `set:${sc.id}`,
            name: sc.name,
            isSet: true,
            count: projectDocs.filter((d) => d.scene_id === sc.id).length,
            place: { kind: "set" as const, id: sc.id, name: sc.name },
          })),
          ...Array.from(
            projectDocs.reduce((acc, d) => {
              if (d.folder && !d.scene_id) acc.set(d.folder, (acc.get(d.folder) ?? 0) + 1);
              return acc;
            }, new Map<string, number>()),
          )
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({
              key: `folder:${name}`,
              name,
              isSet: false,
              count,
              place: { kind: "custom" as const, name },
            })),
        ];

  const q = query.trim().toLowerCase();
  const visibleDocs = projectDocs.filter((d) => {
    if (q) return d.title.toLowerCase().includes(q) || (d.folder ?? "").toLowerCase().includes(q);
    if (place === null) return !d.folder && !d.scene_id;
    if (place.kind === "set") return d.scene_id === place.id;
    return d.folder === place.name && !d.scene_id;
  });

  /** The file open in the Drive-style viewer. */
  const opened = documents.find((d) => d.id === openedId && d.project_id === projectId);

  /** Uploading a file straight into wherever you're standing. */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [uploading, setUploading] = useState(false);
  const addFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadDocument({
          projectId,
          file,
          folder: place?.kind === "custom" ? place.name : null,
          sceneId: place?.kind === "set" ? place.id : null,
          requiresApproval: needsApproval,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const [sending, setSending] = useState(false);
  /** Which action row in the viewer menu is open; only one at a time. */
  type MenuAction =
    | null
    | "folder"
    | "requested"
    | "approved"
    | "changes_requested"
    | "rejected"
    | "version";
  const [menuAction, setMenuAction] = useState<MenuAction>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenuAction(null);
    setMenuOpen(false);
    setNote("");
    setSignature("");
    setPane("details");
  }, [openedId]);
  useEffect(() => {
    setSignature("");
  }, [menuAction]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  // Esc closes the viewer, just like Drive.
  useEffect(() => {
    if (!openedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !menuOpen) setOpenedId("");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openedId, menuOpen]);

  /**
   * A review note behaves like a chat message: it lands in this document's
   * conversation too, so any @mentions in it actually reach people.
   */
  const postNoteToConversation = async (prefix: string) => {
    if (!opened || !note.trim()) return;
    await createThread({
      projectId,
      contextType: "document",
      documentId: opened.id,
      subject: opened.title,
      body: `${prefix} ${note.trim()}`,
    });
  };

  /** Who is signing, and whether what they typed matches their own name. */
  const signerName = personById(currentUserId)?.full_name ?? "";
  const needsSignature = (decision: string) => decision !== "requested";
  const signatureOk =
    signature.trim().toLowerCase() === signerName.trim().toLowerCase() && signerName !== "";

  const act = async (decision: "requested" | "approved" | "changes_requested" | "rejected") => {
    if (!opened || sending) return;
    if (needsSignature(decision) && !signatureOk) return;
    const signedLine = needsSignature(decision) ? ` Signed: ${signerName}.` : "";
    setSending(true);
    try {
      recordApproval(opened.id, decision, `${note || "No note added."}${signedLine}`);
      await postNoteToConversation(`${decisionLabel[decision]} —`);
      setNote("");
      setSignature("");
    } finally {
      setSending(false);
    }
  };

  const reviewCell = (doc: (typeof projectDocs)[number], size: "sm" | "md" = "sm") =>
    doc.requires_approval ? (
      <StatusBadge meta={approvalStateMeta[doc.approval_state]} size={size} />
    ) : (
      <span className="text-xs text-ink-soft">No approval needed</span>
    );

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden">
        {/* Drive-style toolbar: where you are, what you're looking for, how you see it. */}
        <div className="panel-header flex flex-wrap items-center gap-2 px-3 py-2.5">
          <nav aria-label="Folder path" className="flex min-w-0 items-center gap-1 text-sm">
            <button
              type="button"
              disabled={!!pinnedSceneId}
              onClick={() => setPlace(null)}
              className={cn(
                "min-h-9 rounded-md px-2 font-medium",
                place === null ? "text-ink" : "text-ink-soft hover:bg-cream",
                pinnedSceneId ? "cursor-default" : "",
              )}
            >
              {pinnedSceneId ? "This set" : "All documents"}
            </button>
            {place !== null && !pinnedSceneId && (
              <>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft" />
                <span className="truncate font-medium text-ink">{place.name}</span>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {canUpload && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={needsApproval}
                    onChange={(e) => setNeedsApproval(e.target.checked)}
                    className="size-4 rounded border-border"
                  />
                  Needs approval
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void addFiles(files);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary min-h-9 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm"
                >
                  <FileUp aria-hidden className="size-4" />
                  {uploading ? "Uploading…" : "Add document"}
                </button>
              </>
            )}
            <label className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-ink-soft"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search documents"
                placeholder="Search documents"
                className="min-h-9 w-40 rounded-md border border-border bg-card pr-2 pl-8 text-sm text-ink sm:w-56"
              />
            </label>
            <div className="flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={cn("min-h-9 px-2", view === "list" ? "bg-cream-soft" : "bg-card")}
              >
                <List aria-hidden className="size-4 text-ink" />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={cn(
                  "min-h-9 border-l border-border px-2",
                  view === "grid" ? "bg-cream-soft" : "bg-card",
                )}
              >
                <LayoutGrid aria-hidden className="size-4 text-ink" />
              </button>
            </div>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 xl:grid-cols-4">
            {folderList.map((f) => (
              <button
                key={f.key}
                type="button"
                onDoubleClick={() => setPlace(f.place)}
                onClick={() => setPlace(f.place)}
                className="group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-cream-soft px-3 py-3 text-left transition-colors hover:border-border-strong hover:bg-cream"
              >
                <Folder
                  aria-hidden
                  className="size-6 shrink-0 fill-gold-tint text-gold-deep transition-colors group-hover:fill-cream-deep"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                  <span className="block text-xs text-ink-soft">
                    {f.isSet ? "Set folder · " : ""}
                    {f.count} file{f.count === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
            {visibleDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveId(doc.id)}
                onDoubleClick={() => {
                  setActiveId(doc.id);
                  setOpenedId(doc.id);
                }}
                aria-pressed={doc.id === activeId}
                className={cn(
                  "rounded-lg border border-border p-3 text-left hover:bg-cream-soft",
                  doc.id === activeId ? "bg-cream-soft ring-2 ring-gold-deep/40" : "bg-card",
                )}
              >
                <FileText aria-hidden className="size-6 text-ink-soft" />
                <p className="mt-2 truncate text-sm font-medium text-ink">{doc.title}</p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  v{doc.current_version} · updated {formatDate(doc.updated_at)}
                </p>
                <div className="mt-2">{reviewCell(doc)}</div>
              </button>
            ))}
            {visibleDocs.length === 0 && folderList.length === 0 && (
              <p className="col-span-full px-1 py-6 text-sm text-ink-soft">Nothing here yet.</p>
            )}
          </div>
        ) : (
          <>
            {/* Phones get full-width tappable rows instead of a table. */}
            <ul className="row-list lg:hidden">
              {folderList.map((f) => (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() => setPlace(f.place)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left"
                  >
                    <Folder
                      aria-hidden
                      className="size-5 shrink-0 fill-gold-tint text-gold-deep"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{f.name}</span>
                      <span className="block text-xs text-ink-soft">
                        {f.isSet ? "Set folder · " : ""}
                        {f.count} file{f.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft" />
                  </button>
                </li>
              ))}
              {visibleDocs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(doc.id);
                      setOpenedId(doc.id);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left"
                  >
                    <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{doc.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {doc.kind} · {departments.find((d) => d.id === doc.department_id)?.name} ·
                        updated {formatDate(doc.updated_at)}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="code-id">v{doc.current_version}</span>
                        {reviewCell(doc)}
                        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                          <MessageSquare aria-hidden className="size-3.5" />
                          {activityFor(threads, comments, { projectId, documentId: doc.id }).count}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {visibleDocs.length === 0 && folderList.length === 0 && (
                <li className="px-4 py-6 text-sm text-ink-soft">Nothing here yet.</li>
              )}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="rule-label px-4 py-2.5">Name</th>
                    <th className="rule-label px-4 py-2.5">Folder</th>
                    <th className="rule-label px-4 py-2.5">Department</th>
                    <th className="rule-label px-4 py-2.5">Ver.</th>
                    <th className="rule-label px-4 py-2.5">Review</th>
                    <th className="rule-label px-4 py-2.5">Last updated</th>
                    <th className="rule-label px-4 py-2.5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="row-list">
                  {folderList.map((f) => (
                    <tr
                      key={f.key}
                      className="cursor-pointer hover:bg-cream-soft"
                      onClick={() => setPlace(f.place)}
                    >
                      <td className="px-4 py-3" colSpan={2}>
                        <span className="flex items-center gap-2">
                          <Folder
                            aria-hidden
                            className="size-4 shrink-0 fill-gold-tint text-gold-deep"
                          />
                          <span className="font-medium text-ink">{f.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft" colSpan={4}>
                        {f.isSet ? "Set folder · " : "Folder · "}
                        {f.count} file{f.count === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-soft">
                        <ChevronRight aria-hidden className="ml-auto size-4" />
                      </td>
                    </tr>
                  ))}
                  {visibleDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      tabIndex={0}
                      className={cn(
                        "cursor-pointer",
                        doc.id === activeId ? "bg-cream-soft" : "hover:bg-cream-soft",
                      )}
                      onClick={() => setActiveId(doc.id)}
                      onDoubleClick={() => {
                        setActiveId(doc.id);
                        setOpenedId(doc.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setActiveId(doc.id);
                          setOpenedId(doc.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-start gap-2">
                          <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                          <span className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(doc.id);
                                setOpenedId(doc.id);
                              }}
                              className="text-left font-medium text-ink hover:underline"
                            >
                              {doc.title}
                            </button>
                            <span className="block text-xs text-ink-soft">{doc.kind}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {(() => {
                          const set = projectScenes.find((sc) => sc.id === doc.scene_id);
                          const label = set ? set.name : doc.folder;
                          if (!label) return "Not filed";
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlace(
                                  set
                                    ? { kind: "set", id: set.id, name: set.name }
                                    : { kind: "custom", name: label },
                                );
                              }}
                              className="inline-flex items-center gap-1 text-ink-soft hover:text-ink"
                            >
                              <Folder aria-hidden className="size-3.5" />
                              {label}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {departments.find((d) => d.id === doc.department_id)?.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="code-id">v{doc.current_version}</span>
                      </td>
                      <td className="px-4 py-3">{reviewCell(doc)}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {formatDate(doc.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label={`Open ${doc.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveId(doc.id);
                            setOpenedId(doc.id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-cream"
                        >
                          <MoreVertical aria-hidden className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleDocs.length === 0 && folderList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-ink-soft">
                        Nothing here yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Drive-style viewer: the file fills the screen, details and chat sit beside it. */}
      {opened && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={opened.title}
          className="fixed inset-0 z-50 flex flex-col bg-ink/80 backdrop-blur-sm"
        >
          <header className="flex items-center gap-2 px-3 py-2.5 text-cream sm:px-4">
            <FileText aria-hidden className="size-5 shrink-0 text-gold-tint" />
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
              {opened.title}
            </h3>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Document actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                disabled={locked}
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-cream hover:bg-white/15 disabled:opacity-40"
              >
                <MoreVertical aria-hidden className="size-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-white shadow-lg">
                  <ul role="menu" className="py-1">
                    <li role="none">
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setPane("conversation");
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream"
                      >
                        <MessageSquare aria-hidden className="size-4 text-ink-soft" />
                        <span className="flex-1">Open conversation</span>
                        <span className="text-xs text-ink-soft">
                          {(() => {
                            const a = activityFor(threads, comments, {
                              projectId,
                              documentId: opened.id,
                            });
                            return a.count === 0 ? "None" : a.count;
                          })()}
                        </span>
                      </button>
                    </li>
                    {canUpload && (
                      <li role="none">
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setPane("details");
                            setMenuAction("folder");
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream"
                        >
                          <Folder aria-hidden className="size-4 text-ink-soft" />
                          <span className="flex-1">Move to folder</span>
                        </button>
                      </li>
                    )}
                    {canReview &&
                      opened.requires_approval &&
                      (
                        [
                          { key: "requested", label: "Request review", Icon: Send },
                          { key: "approved", label: "Approve", Icon: CheckCircle2 },
                          { key: "changes_requested", label: "Request changes", Icon: ThumbsDown },
                          { key: "rejected", label: "Reject", Icon: XCircle },
                        ] as const
                      ).map(({ key, label, Icon }) => (
                        <li key={key} role="none">
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setPane("details");
                              setMenuAction(key);
                              setMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream"
                          >
                            <Icon aria-hidden className="size-4 text-ink-soft" />
                            <span className="flex-1">{label}</span>
                          </button>
                        </li>
                      ))}
                    {canUpload && (
                      <li role="none">
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setPane("details");
                            setMenuAction("version");
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream"
                        >
                          <FileUp aria-hidden className="size-4 text-ink-soft" />
                          <span className="flex-1">Upload new version</span>
                          <span className="text-xs text-ink-soft">v{opened.current_version}</span>
                        </button>
                      </li>
                    )}
                    {canUpload && (
                      <li role="none">
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-cream">
                          <input
                            type="checkbox"
                            checked={!opened.requires_approval}
                            onChange={(e) => {
                              setDocumentApprovalRequirement(opened.id, !e.target.checked);
                              setMenuOpen(false);
                            }}
                            className="size-4 rounded border-border"
                          />
                          <span className="flex-1">No approval needed</span>
                        </label>
                      </li>
                    )}
                    {canUpload && (
                      <>
                        <li role="separator" className="my-1 border-t border-border" />
                        <li role="none">
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              if (window.confirm(`Delete “${opened.title}”? It will be removed from the production's documents but any conversation history stays visible.`)) {
                                deleteDocument(opened.id);
                                setOpenedId("");
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg"
                          >
                            <Trash2 aria-hidden className="size-4" />
                            <span className="flex-1">Delete document</span>
                          </button>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Close file"
              onClick={() => setOpenedId("")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-cream hover:bg-white/15"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto px-3 pb-3 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-3 lg:overflow-hidden sm:px-4 sm:pb-4">
            <div className="surface-card min-h-0 overflow-y-auto">
              {(() => {
                const current = documentVersions
                  .filter((v) => v.document_id === opened.id)
                  .sort((a, b) => b.version - a.version)[0];
                return (
                  <DocumentPreview
                    storageKey={current?.storage_key ?? null}
                    fileLabel={current?.file_label ?? opened.title}
                  />
                );
              })()}
            </div>

            <aside className="surface-card mt-3 flex min-h-0 flex-col overflow-hidden lg:mt-0">
              <div className="panel-header flex items-center gap-1 px-2 py-2">
                {(
                  [
                    { key: "details", label: "Details" },
                    { key: "conversation", label: "Conversation" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={pane === key}
                    onClick={() => setPane(key)}
                    className={cn(
                      "min-h-9 rounded-md px-3 text-sm font-medium",
                      pane === key ? "bg-cream text-ink" : "text-ink-soft hover:bg-cream-soft",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {pane === "details" ? (
                  <div className="space-y-3 p-3">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-ink-soft">Revision</dt>
                        <dd className="code-id">v{opened.current_version}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-soft">Review</dt>
                        <dd>{reviewCell(opened, "md")}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-soft">Department</dt>
                        <dd className="text-ink">
                          {departments.find((d) => d.id === opened.department_id)?.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-soft">Folder</dt>
                        <dd className="text-ink">
                          {projectScenes.find((sc) => sc.id === opened.scene_id)?.name ??
                            opened.folder ??
                            "Not filed"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-soft">Last updated</dt>
                        <dd className="text-ink">{formatDate(opened.updated_at)}</dd>
                      </div>
                    </dl>

                    {opened.requires_approval &&
                      (() => {
                        const approvedVersions = approvals
                          .filter((a) => a.document_id === opened.id && a.decision === "approved")
                          .map((a) => a.version);
                        const lastApproved = approvedVersions.length
                          ? Math.max(...approvedVersions)
                          : null;
                        const safe =
                          opened.approval_state === "approved" &&
                          lastApproved === opened.current_version;
                        const message = safe
                          ? `Revision v${opened.current_version} is approved — safe to build from.`
                          : opened.approval_state === "in_review"
                            ? `Revision v${opened.current_version} is still under review — do not build from it yet.`
                            : lastApproved
                              ? `Revision v${opened.current_version} is not approved. The last approved revision is v${lastApproved}.`
                              : `No revision has been approved yet — do not build from this.`;
                        return (
                          <p
                            className={cn(
                              "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm font-medium",
                              safe
                                ? "border-success/30 bg-success-bg text-success"
                                : "border-warning/30 bg-warning-bg text-warning",
                            )}
                          >
                            {safe ? (
                              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
                            ) : (
                              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                            )}
                            {message}
                          </p>
                        );
                      })()}

                    {menuAction === "folder" && canUpload && (
                      <div className="rounded-md border border-border bg-cream-soft px-3 py-3">
                        <p className="mb-2 text-xs font-medium text-ink-soft">Move to folder</p>
                        <FilingControl
                          projectId={projectId}
                          documentId={opened.id}
                          currentFolder={opened.folder}
                          currentSceneId={opened.scene_id}
                        />
                      </div>
                    )}

                    {(() => {
                      if (!menuAction || !canReview || !opened.requires_approval) return null;
                      let decision:
                        | "requested"
                        | "approved"
                        | "changes_requested"
                        | "rejected"
                        | null = null;
                      let label = "";
                      let Icon = Send;
                      if (menuAction === "requested") {
                        decision = "requested";
                        label = "Request review";
                        Icon = Send;
                      } else if (menuAction === "approved") {
                        decision = "approved";
                        label = "Approve";
                        Icon = CheckCircle2;
                      } else if (menuAction === "changes_requested") {
                        decision = "changes_requested";
                        label = "Request changes";
                        Icon = ThumbsDown;
                      } else if (menuAction === "rejected") {
                        decision = "rejected";
                        label = "Reject";
                        Icon = XCircle;
                      }
                      if (!decision) return null;
                      return (
                        <div className="space-y-2 rounded-md border border-border bg-cream-soft px-3 py-3">
                          <p className="text-xs font-medium text-ink-soft">{label}</p>
                          <MentionInput
                            value={note}
                            onChange={setNote}
                            rows={2}
                            ariaLabel="Review note"
                            placeholder="What did you check, or what needs to change? Type @ to bring someone in"
                          />
                          {needsSignature(decision) && (
                            <div>
                              <label
                                htmlFor="review-signature"
                                className="text-xs font-medium text-ink-soft"
                              >
                                Sign this decision — type your full name
                              </label>
                              <input
                                id="review-signature"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                autoComplete="off"
                                placeholder={signerName}
                                className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 font-display text-lg text-ink"
                              />
                              <p className="mt-1 text-xs text-ink-soft">
                                {signatureOk
                                  ? `Signing as ${signerName} · ${formatDate(new Date().toISOString())}`
                                  : `Type “${signerName}” exactly to sign. This name is recorded with the decision.`}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={sending || (needsSignature(decision) && !signatureOk)}
                              onClick={() => {
                                void act(decision);
                                setMenuAction(null);
                              }}
                              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
                            >
                              <Icon aria-hidden className="size-4" /> {label}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMenuAction(null)}
                              className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {menuAction === "version" && canUpload && (
                      <div className="space-y-2 rounded-md border border-border bg-cream-soft px-3 py-3">
                        <p className="text-xs font-medium text-ink-soft">Upload new version</p>
                        <MentionInput
                          value={note}
                          onChange={setNote}
                          rows={2}
                          ariaLabel="What changed in this version"
                          placeholder="What changed in this version? Type @ to bring someone in"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => {
                              addDocumentVersion(opened.id, note);
                              void postNoteToConversation("New version uploaded —");
                              setNote("");
                              setMenuAction(null);
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
                          >
                            <FileUp aria-hidden className="size-4" /> Upload version
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenuAction(null)}
                            className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!canReview && (
                      <p className="text-xs text-ink-soft">
                        {locked
                          ? "This production is closed and archived — documents stay readable, but no new reviews or versions can be added."
                          : "Viewers can read documents and their review history."}
                      </p>
                    )}

                    {/* Rarely needed, so it stays tucked away until someone asks for it. */}
                    <details className="rounded-md border border-border">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm text-ink-soft hover:bg-cream">
                        <History aria-hidden className="size-4" />
                        Version history
                        <span className="ml-auto text-xs">
                          {documentVersions.filter((v) => v.document_id === opened.id).length}
                        </span>
                      </summary>
                      <ul className="row-list border-t border-border">
                        {documentVersions
                          .filter((v) => v.document_id === opened.id)
                          .sort((a, b) => b.version - a.version)
                          .map((v) => (
                            <li key={v.id} className="px-3 py-3 text-sm">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="code-id">v{v.version}</span>
                                {v.version === opened.current_version && (
                                  <span className="text-[11px] font-medium text-ink-soft">
                                    Current
                                  </span>
                                )}
                                <span className="ml-auto text-xs text-ink-soft">
                                  {formatDate(v.uploaded_at)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-ink">{v.note}</p>
                              <p className="text-xs text-ink-soft">
                                {personById(v.uploaded_by_id)?.full_name} · {v.file_label}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </details>
                  </div>
                ) : (
                  <div className="p-3">
                    <Discussion
                      inline
                      projectId={projectId}
                      contextType="document"
                      documentId={opened.id}
                      {...(highlightCommentId ? { highlightCommentId } : {})}
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
