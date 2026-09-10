import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileUp,
  Folder,
  LayoutGrid,
  List,
  Search,
  History,
  MessageSquare,
  Send,
  ThumbsDown,
  XCircle,
} from "lucide-react";

import { Discussion } from "@/components/Discussion";
import { MentionInput } from "@/components/MentionInput";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, useStore } from "@/lib/store";
import { approvalStateMeta, formatDate, formatDateTime } from "@/lib/status";
import { activityFor, snippet } from "@/lib/threads";
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
    isClosed,
    threads,
    comments,
    createThread,
  } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const locked = isClosed(projectId);
  const canReview = can.decideApproval && !locked;
  const canUpload = can.upload && !locked;

  const projectDocs = documents.filter(
    (d) => d.project_id === projectId && (!pinnedSceneId || d.scene_id === pinnedSceneId),
  );
  const [selectedId, setSelectedId] = useState(openDocumentId ?? projectDocs[0]?.id ?? "");
  // Arriving from the Inbox or the Dashboard opens that exact document.
  useEffect(() => {
    if (openDocumentId) setSelectedId(openDocumentId);
  }, [openDocumentId]);
  const selected = projectDocs.find((d) => d.id === selectedId) ?? projectDocs[0];
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

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
  const folderList = [
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

  const [sending, setSending] = useState(false);
  /** Which action row in the document menu is open; only one at a time. */
  type MenuAction =
    | null
    | "folder"
    | "requested"
    | "approved"
    | "changes_requested"
    | "rejected"
    | "version";
  const [menuAction, setMenuAction] = useState<MenuAction>(null);
  useEffect(() => {
    setMenuAction(null);
    setNote("");
  }, [selectedId]);

  /**
   * A review note behaves like a chat message: it lands in this document's
   * conversation too, so any @mentions in it actually reach people.
   */
  const postNoteToConversation = async (prefix: string) => {
    if (!selected || !note.trim()) return;
    await createThread({
      projectId,
      contextType: "document",
      documentId: selected.id,
      subject: selected.title,
      body: `${prefix} ${note.trim()}`,
    });
  };

  const act = async (decision: "requested" | "approved" | "changes_requested" | "rejected") => {
    if (!selected || sending) return;
    setSending(true);
    try {
      recordApproval(selected.id, decision, note || "No note added.");
      await postNoteToConversation(`${decisionLabel[decision]} —`);
      setNote("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
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

          {/* Folders use the familiar compact Drive grid at the top level. */}
          {!pinnedSceneId && place === null && !query.trim() && folderList.length > 0 && (
            <div className="border-b border-border bg-card px-4 py-4">
              <h3 className="mb-3 text-sm font-medium text-ink">Folders</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {folderList.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setPlace(f.place)}
                    className="group flex min-h-14 select-none items-center gap-3 rounded-lg border border-border bg-cream-soft px-3 py-3 text-left transition-colors hover:border-border-strong hover:bg-cream"
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
              </div>
            </div>
          )}

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
              {visibleDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  aria-pressed={doc.id === selected?.id}
                  className={cn(
                    "rounded-lg border border-border p-3 text-left hover:bg-cream-soft",
                    doc.id === selected?.id ? "bg-cream-soft ring-2 ring-gold-deep/40" : "bg-card",
                  )}
                >
                  <FileText aria-hidden className="size-6 text-ink-soft" />
                  <p className="mt-2 truncate text-sm font-medium text-ink">{doc.title}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    v{doc.current_version} · updated {formatDate(doc.updated_at)}
                  </p>
                  <div className="mt-2">
                    {doc.requires_approval ? (
                      <StatusBadge meta={approvalStateMeta[doc.approval_state]} size="sm" />
                    ) : (
                      <span className="text-xs text-ink-soft">No approval needed</span>
                    )}
                  </div>
                </button>
              ))}
              {visibleDocs.length === 0 && (
                <p className="col-span-full px-1 py-6 text-sm text-ink-soft">
                  Nothing here yet.
                </p>
              )}
            </div>
          ) : (
            <>
              {!pinnedSceneId && place === null && folderList.length > 0 && !query.trim() && (
                <h3 className="border-b border-border bg-card px-4 py-3 text-sm font-medium text-ink">
                  Files
                </h3>
              )}
              {/* Phones get full-width tappable rows instead of a table. */}
              <ul className="row-list lg:hidden">
                {visibleDocs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(doc.id)}
                      aria-pressed={doc.id === selected?.id}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-4 text-left",
                        doc.id === selected?.id ? "bg-cream-soft" : "",
                      )}
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
                          {doc.requires_approval ? (
                      <StatusBadge meta={approvalStateMeta[doc.approval_state]} size="sm" />
                    ) : (
                      <span className="text-xs text-ink-soft">No approval needed</span>
                    )}
                          <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                            <MessageSquare aria-hidden className="size-3.5" />
                            {activityFor(threads, comments, { projectId, documentId: doc.id }).count}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {visibleDocs.length === 0 && (
                  <li className="px-4 py-6 text-sm text-ink-soft">Nothing here yet.</li>
                )}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="rule-label px-4 py-2.5">Name</th>
                      <th className="rule-label px-4 py-2.5">Folder</th>
                      <th className="rule-label px-4 py-2.5">Department</th>
                      <th className="rule-label px-4 py-2.5">Ver.</th>
                      <th className="rule-label px-4 py-2.5">Review</th>
                      <th className="rule-label px-4 py-2.5">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="row-list">
                    {visibleDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className={
                          doc.id === selected?.id
                            ? "cursor-pointer bg-cream-soft"
                            : "cursor-pointer hover:bg-cream-soft"
                        }
                        onClick={() => setSelectedId(doc.id)}
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-start gap-2">
                            <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                            <span className="min-w-0">
                              <button type="button" className="text-left font-medium text-ink">
                                {doc.title}
                              </button>
                              <span className="block text-xs text-ink-soft">
                                {doc.kind} · updated {formatDate(doc.updated_at)}
                              </span>
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
                        <td className="px-4 py-3">
                          {doc.requires_approval ? (
                      <StatusBadge meta={approvalStateMeta[doc.approval_state]} size="sm" />
                    ) : (
                      <span className="text-xs text-ink-soft">No approval needed</span>
                    )}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MessageSquare aria-hidden className="size-3.5" />
                            {activityFor(threads, comments, { projectId, documentId: doc.id }).count}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {visibleDocs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-sm text-ink-soft">
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


        {selected && (
          <section className="space-y-4">
            <div className="surface-card p-4">
              <h3 className="text-lg font-semibold text-ink">{selected.title}</h3>
              <p className="text-sm text-ink-soft">
                {selected.kind} · owned by {personById(selected.owner_id)?.full_name}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selected.requires_approval ? (
                  <StatusBadge meta={approvalStateMeta[selected.approval_state]} />
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-cream-soft px-2.5 py-1 text-xs font-medium text-ink-soft">
                    <FileText aria-hidden className="size-3.5" />
                    No approval needed
                  </span>
                )}
              </div>
              {canUpload && (
                <label className="mt-3 flex items-start gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!selected.requires_approval}
                    onChange={(e) =>
                      setDocumentApprovalRequirement(selected.id, !e.target.checked)
                    }
                    className="mt-0.5 size-4 rounded border-border"
                  />
                  <span>
                    No approval needed
                    <span className="block text-xs text-ink-soft">
                      Documents that need approval must be approved before the work item they belong
                      to can be marked complete.
                    </span>
                  </span>
                </label>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="rule-label">Folder</span>
                {canUpload ? (
                  <FilingControl
                    projectId={projectId}
                    documentId={selected.id}
                    currentFolder={selected.folder}
                    currentSceneId={selected.scene_id}
                  />
                ) : (
                  <span className="text-sm text-ink">
                    {projectScenes.find((sc) => sc.id === selected.scene_id)?.name ||
                      selected.folder ||
                      "Not filed"}
                  </span>
                )}
              </div>
              {selected.requires_approval && (() => {
                const approvedVersions = approvals
                  .filter((a) => a.document_id === selected.id && a.decision === "approved")
                  .map((a) => a.version);
                const lastApproved = approvedVersions.length ? Math.max(...approvedVersions) : null;
                const safe =
                  selected.approval_state === "approved" &&
                  lastApproved === selected.current_version;
                const message = safe
                  ? `Revision v${selected.current_version} is approved — safe to build from.`
                  : selected.approval_state === "in_review"
                    ? `Revision v${selected.current_version} is still under review — do not build from it yet.`
                    : lastApproved
                      ? `Revision v${selected.current_version} is not approved. The last approved revision is v${lastApproved}.`
                      : `No revision has been approved yet — do not build from this.`;
                return (
                  <p
                    className={cn(
                      "mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium",
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

              {(() => {
                const a = activityFor(threads, comments, {
                  projectId,
                  documentId: selected.id,
                });
                return (
                  <a
                    href="#document-discussion"
                    className="mt-3 flex min-h-11 items-start gap-2 rounded-md border border-border bg-cream-soft px-3 py-2 text-left hover:bg-cream"
                  >
                    <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                    <span className="block min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-ink">
                        {a.count === 0
                          ? "No comments yet — start the conversation below"
                          : `${a.count} comment${a.count === 1 ? "" : "s"} on this document`}
                      </span>
                      {a.latest && (
                        <span className="mt-0.5 block text-xs break-words text-ink-soft">
                          {personById(a.latest.author_id)?.full_name},{" "}
                          {formatDateTime(a.latest.created_at)}: {snippet(a.latest.body, 60)}
                        </span>
                      )}
                    </span>
                  </a>
                );
              })()}

              {canReview && selected.requires_approval ? (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <label htmlFor="review-note" className="rule-label">
                    Review note
                  </label>
                  <MentionInput
                    value={note}
                    onChange={setNote}
                    rows={2}
                    ariaLabel="Review note"
                    placeholder="What did you check, or what needs to change? Type @ to bring someone in"
                  />
                  <p className="text-xs text-ink-soft">
                    Notes post into this document&rsquo;s conversation, so anyone you @mention gets
                    notified.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void act("requested")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
                    >
                      <Send aria-hidden className="size-4" /> Request review
                    </button>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void act("approved")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-success/30 bg-success-bg px-3 text-sm font-medium text-success hover:brightness-98 disabled:opacity-60"
                    >
                      <CheckCircle2 aria-hidden className="size-4" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void act("changes_requested")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-warning/30 bg-warning-bg px-3 text-sm font-medium text-warning hover:brightness-98 disabled:opacity-60"
                    >
                      <ThumbsDown aria-hidden className="size-4" /> Request changes
                    </button>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void act("rejected")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-danger-bg px-3 text-sm font-medium text-danger hover:brightness-98 disabled:opacity-60"
                    >
                      <XCircle aria-hidden className="size-4" /> Reject
                    </button>
                  </div>
                  {canUpload && (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => {
                        addDocumentVersion(selected.id, note);
                        void postNoteToConversation("New version uploaded —");
                        setNote("");
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream sm:w-auto"
                    >
                      <FileUp aria-hidden className="size-4" /> Upload new version
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-4 border-t border-border pt-3 text-xs text-ink-soft">
                  {locked
                    ? "This production is closed and archived — documents and their review history stay readable, but no new reviews or versions can be added."
                    : "Viewers can read documents and their review history."}
                </p>
              )}
            </div>

            <div className="surface-card overflow-hidden">
              <header className="flex items-center gap-2 panel-header px-4 py-2.5">
                <History aria-hidden className="size-4 text-ink-soft" />
                <h4 className="text-sm font-semibold text-ink">Version history</h4>
              </header>
              <ul className="row-list">
                {documentVersions
                  .filter((v) => v.document_id === selected.id)
                  .sort((a, b) => b.version - a.version)
                  .map((v) => (
                    <li key={v.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="code-id">v{v.version}</span>
                        {v.version === selected.current_version && (
                          <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[11px] font-semibold text-gold-deep">
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
            </div>

            <div className="surface-card overflow-hidden">
              <header className="panel-header px-4 py-2.5">
                <h4 className="text-sm font-semibold text-ink">Review record</h4>
              </header>
              <ul className="row-list">
                {approvals
                  .filter((a) => a.document_id === selected.id)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((a) => (
                    <li key={a.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">
                          {personById(a.actor_id)?.full_name}
                        </span>
                        <span className="rule-label">
                          {a.decision.replace("_", " ")} · v{a.version}
                        </span>
                        <span className="ml-auto text-xs text-ink-soft">
                          {formatDate(a.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-ink-soft">{a.note}</p>
                    </li>
                  ))}
                {approvals.filter((a) => a.document_id === selected.id).length === 0 && (
                  <li className="px-4 py-3 text-sm text-ink-soft">No review activity yet.</li>
                )}
              </ul>
            </div>
          </section>
        )}
      </div>

      {selected && <div id="document-discussion" />}
      {selected && (
        <div className="space-y-2">
          <p className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-cream-soft px-3 py-2 text-xs text-ink-soft">
            <span className="code-id">v{selected.current_version}</span>
            <span>
              is the current revision of {selected.title}. Messages here cover the document as a
              whole, not one revision.
            </span>
          </p>
          <Discussion
            projectId={projectId}
            contextType="document"
            documentId={selected.id}
            heading={`Conversation on ${selected.title}`}
            {...(highlightCommentId ? { highlightCommentId } : {})}
          />
        </div>
      )}
    </div>
  );
}
