import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, FileUp, History, Send, ThumbsDown, XCircle } from "lucide-react";

import { Discussion } from "@/components/Discussion";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, useStore } from "@/lib/store";
import { approvalStateMeta, formatDate } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/documents")({
  head: () => ({
    meta: [
      { title: "Documents & approvals — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Versioned production documents with a review workflow: request review, approve, reject, or request changes.",
      },
      { property: "og:title", content: "Documents & approvals — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Versioned production documents with request review, approve, and reject steps.",
      },
    ],
  }),
  component: DocumentsTab,
});

function DocumentsTab() {
  const { projectId } = Route.useParams();
  const {
    projects,
    documents,
    documentVersions,
    approvals,
    can,
    recordApproval,
    addDocumentVersion,
    isClosed,
  } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const locked = isClosed(projectId);
  const canReview = can.decideApproval && !locked;
  const canUpload = can.upload && !locked;

  const projectDocs = documents.filter((d) => d.project_id === projectId);
  const [selectedId, setSelectedId] = useState(projectDocs[0]?.id ?? "");
  const selected = projectDocs.find((d) => d.id === selectedId) ?? projectDocs[0];
  const [note, setNote] = useState("");

  const act = (decision: "requested" | "approved" | "changes_requested" | "rejected") => {
    if (!selected) return;
    recordApproval(selected.id, decision, note || "No note added.");
    setNote("");
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink sm:text-3xl">Documents</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Every drawing set, package, and plan with its version history and review record. Nothing
          is hidden between departments.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="surface-card overflow-hidden">
          {/* Phones get full-width tappable rows instead of a table. */}
          <ul className="divide-y divide-border lg:hidden">
            {projectDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  aria-pressed={doc.id === selected?.id}
                  className={cn(
                    "w-full px-4 py-4 text-left",
                    doc.id === selected?.id ? "bg-cream-soft" : "",
                  )}
                >
                  <p className="text-sm font-medium text-ink">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {doc.kind} · {departments.find((d) => d.id === doc.department_id)?.name} ·
                    updated {formatDate(doc.updated_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="code-id">v{doc.current_version}</span>
                    <StatusBadge meta={approvalStateMeta[doc.approval_state]} size="sm" />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-cream-soft text-left">
                  <th className="rule-label px-4 py-2.5">Document</th>
                  <th className="rule-label px-4 py-2.5">Department</th>
                  <th className="rule-label px-4 py-2.5">Ver.</th>
                  <th className="rule-label px-4 py-2.5">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectDocs.map((doc) => (
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
                      <button type="button" className="text-left font-medium text-ink">
                        {doc.title}
                      </button>
                      <span className="block text-xs text-ink-soft">
                        {doc.kind} · updated {formatDate(doc.updated_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {departments.find((d) => d.id === doc.department_id)?.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="code-id">v{doc.current_version}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge meta={approvalStateMeta[doc.approval_state]} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section className="space-y-4">
            <div className="surface-card p-4">
              <span className="code-id">{selected.id}</span>
              <h3 className="mt-1 text-lg font-semibold text-ink">{selected.title}</h3>
              <p className="text-sm text-ink-soft">
                {selected.kind} · owned by {personById(selected.owner_id)?.full_name}
              </p>
              <div className="mt-3">
                <StatusBadge meta={approvalStateMeta[selected.approval_state]} />
              </div>

              {canReview ? (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <label htmlFor="review-note" className="rule-label">
                    Review note
                  </label>
                  <textarea
                    id="review-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="What did you check, or what needs to change?"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => act("requested")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-ink-soft"
                    >
                      <Send aria-hidden className="size-4" /> Request review
                    </button>
                    <button
                      type="button"
                      onClick={() => act("approved")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-success/30 bg-success-bg px-3 text-sm font-medium text-success hover:brightness-98"
                    >
                      <CheckCircle2 aria-hidden className="size-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => act("changes_requested")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-warning/30 bg-warning-bg px-3 text-sm font-medium text-warning hover:brightness-98"
                    >
                      <ThumbsDown aria-hidden className="size-4" /> Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => act("rejected")}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-danger-bg px-3 text-sm font-medium text-danger hover:brightness-98"
                    >
                      <XCircle aria-hidden className="size-4" /> Reject
                    </button>
                  </div>
                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => {
                        addDocumentVersion(selected.id, note);
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
              <header className="flex items-center gap-2 border-b border-border bg-cream-soft px-4 py-2.5">
                <History aria-hidden className="size-4 text-ink-soft" />
                <h4 className="text-sm font-semibold text-ink">Version history</h4>
              </header>
              <ul className="divide-y divide-border">
                {documentVersions
                  .filter((v) => v.document_id === selected.id)
                  .sort((a, b) => b.version - a.version)
                  .map((v) => (
                    <li key={v.id} className="px-4 py-3 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="code-id">v{v.version}</span>
                        <span className="text-xs text-ink-soft">{formatDate(v.uploaded_at)}</span>
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
              <header className="border-b border-border bg-cream-soft px-4 py-2.5">
                <h4 className="text-sm font-semibold text-ink">Review record</h4>
              </header>
              <ul className="divide-y divide-border">
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

      {selected && (
        <Discussion
          projectId={projectId}
          contextType="document"
          documentId={selected.id}
          heading={`Discussion on ${selected.title}`}
          blurb="Document-level conversation, kept with the file rather than in a separate chat."
        />
      )}
    </div>
  );
}
