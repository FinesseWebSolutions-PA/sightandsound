import { useState } from "react";
import { AtSign, CornerDownRight, MessageSquarePlus, Send } from "lucide-react";

import { MentionText } from "@/components/MentionText";
import { departments, people, personById, useStore } from "@/lib/store";
import type { ThreadContext } from "@/lib/production-data";
import { formatDateTime } from "@/lib/status";
import { cn } from "@/lib/utils";

function MentionPicker({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rule-label flex items-center gap-1">
        <AtSign aria-hidden className="size-3" /> Mention
      </span>
      <select
        aria-label="Mention a department"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onInsert(e.target.value);
          e.target.value = "";
        }}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-ink"
      >
        <option value="">Department…</option>
        {departments.map((d) => (
          <option key={d.id} value={`@${d.name}`}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Mention a team member"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onInsert(e.target.value);
          e.target.value = "";
        }}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-ink"
      >
        <option value="">Team member…</option>
        {people.map((p) => (
          <option key={p.id} value={`@${p.full_name}`}>
            {p.full_name}
          </option>
        ))}
      </select>
      <span className="text-ink-soft">
        A department mention notifies its owner and leads only.
      </span>
    </div>
  );
}

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  withSubject = false,
  compact = false,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string, subject: string) => void;
  withSubject?: boolean;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");

  return (
    <form
      className={cn("space-y-2", compact ? "pt-2" : "surface-card p-4")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim() || (withSubject && !subject.trim())) return;
        onSubmit(body.trim(), subject.trim());
        setBody("");
        setSubject("");
      }}
    >
      {withSubject && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is this discussion about?"
          aria-label="Discussion subject"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-ring focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MentionPicker onInsert={(token) => setBody((b) => (b ? `${b} ${token} ` : `${token} `))} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-soft"
        >
          <Send aria-hidden className="size-3.5" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Discussion({
  projectId,
  contextType,
  taskId = null,
  documentId = null,
  heading,
  blurb,
}: {
  projectId: string;
  contextType: ThreadContext;
  taskId?: string | null;
  documentId?: string | null;
  heading?: string;
  blurb?: string;
}) {
  const { threads, comments, addComment, createThread, can, tasks, documents, isClosed } =
    useStore();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [anchorId, setAnchorId] = useState("");

  const locked = isClosed(projectId);
  const canPost = can.comment && !locked;

  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const projectDocuments = documents.filter((d) => d.project_id === projectId);
  const needsAnchor =
    (contextType === "task" && !taskId) || (contextType === "document" && !documentId);
  // Each work item and each document carries exactly one discussion, so anything
  // that already has one is not offered again — you add to it instead.
  const anchorOptions = (contextType === "task" ? projectTasks : projectDocuments).filter((o) =>
    contextType === "task"
      ? !threads.some((t) => t.task_id === o.id)
      : !threads.some((t) => t.document_id === o.id),
  );
  const resolvedTaskId = contextType === "task" ? (taskId ?? (anchorId || null)) : taskId;
  const resolvedDocumentId =
    contextType === "document" ? (documentId ?? (anchorId || null)) : documentId;
  const canStart = canPost && (!needsAnchor || anchorOptions.length > 0);



  const visible = threads.filter(
    (t) =>
      t.project_id === projectId &&
      t.context_type === contextType &&
      (taskId === null || t.task_id === taskId) &&
      (documentId === null || t.document_id === documentId),
  );

  const contextLabel = (threadTaskId: string | null, threadDocumentId: string | null) => {
    if (threadTaskId) return tasks.find((t) => t.id === threadTaskId)?.title ?? "Task";
    if (threadDocumentId)
      return documents.find((d) => d.id === threadDocumentId)?.title ?? "Document";
    return "Project-level";
  };

  return (
    <section className="space-y-4">
      {heading && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">{heading}</h2>
            {blurb && <p className="mt-1 text-sm text-ink-soft">{blurb}</p>}
          </div>
          {canStart && (
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
            >
              <MessageSquarePlus aria-hidden className="size-4" />
              {showNew ? "Cancel" : "Start a discussion"}
            </button>
          )}
          {canPost && !canStart && (
            <p className="max-w-xs text-xs text-ink-soft">
              Every {contextType === "task" ? "work item" : "document"} here already has its own
              discussion — add your message to the one below.
            </p>
          )}
        </div>
      )}

      {locked && heading && (
        <p className="surface-card p-3 text-sm text-ink-soft">
          This production is closed and archived — the conversation stays readable, but nothing new
          can be posted.
        </p>
      )}

      {showNew && canStart && (

        <div className="space-y-2">
          {needsAnchor && (
            <div className="surface-card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="rule-label">
                {contextType === "task" ? "Work item" : "Document"}
              </span>
              <select
                aria-label={contextType === "task" ? "Choose a work item" : "Choose a document"}
                value={anchorId}
                onChange={(e) => setAnchorId(e.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink"
              >
                <option value="">Choose one…</option>
                {anchorOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
              {!anchorId && (
                <span className="text-xs text-ink-soft">
                  Pick what this discussion is attached to before posting.
                </span>
              )}
            </div>
          )}
          {(!needsAnchor || anchorId) && (
            <Composer
              withSubject
              placeholder="Write the first message. Use @ to bring in a department or a team member."
              submitLabel="Post discussion"
              onSubmit={(body, subject) => {
                createThread({
                  projectId,
                  contextType,
                  taskId: resolvedTaskId,
                  documentId: resolvedDocumentId,
                  subject,
                  body,
                });
                setAnchorId("");
                setShowNew(false);
              }}
            />
          )}
        </div>
      )}

      {visible.length === 0 && (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No discussion here yet.
          {canPost ? " Start one to bring the right departments in." : ""}
        </p>
      )}


      {visible.map((thread) => {
        const threadComments = comments.filter((c) => c.thread_id === thread.id);
        const roots = threadComments.filter((c) => !c.parent_comment_id);
        return (
          <article key={thread.id} className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-cream-soft px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">{thread.subject}</h3>
              <span className="code-id">
                {contextType} · {contextLabel(thread.task_id, thread.document_id)}
              </span>
            </header>
            <div className="divide-y divide-border">
              {roots.map((root) => {
                const replies = threadComments.filter((c) => c.parent_comment_id === root.id);
                return (
                  <div key={root.id} className="px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {personById(root.author_id)?.full_name}
                      </span>
                      <span className="text-xs text-ink-soft">
                        {personById(root.author_id)?.title}
                      </span>
                      <span className="ml-auto text-xs text-ink-soft">
                        {formatDateTime(root.created_at)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <MentionText body={root.body} />
                    </div>

                    {replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-cream pl-4">
                        {replies.map((reply) => (
                          <div key={reply.id}>
                            <div className="flex items-baseline gap-2">
                              <CornerDownRight aria-hidden className="size-3.5 text-ink-soft" />
                              <span className="text-sm font-semibold text-ink">
                                {personById(reply.author_id)?.full_name}
                              </span>
                              <span className="ml-auto text-xs text-ink-soft">
                                {formatDateTime(reply.created_at)}
                              </span>
                            </div>
                            <div className="mt-1 pl-5">
                              <MentionText body={reply.body} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {canPost && (
                      <div className="mt-2">
                        {replyTo === root.id ? (
                          <Composer
                            compact
                            placeholder="Write a reply…"
                            submitLabel="Reply"
                            onSubmit={(body) => {
                              addComment(thread.id, root.id, body);
                              setReplyTo(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReplyTo(root.id)}
                            className="text-xs font-semibold text-gold-deep hover:underline"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {canPost && (
              <div className="border-t border-border bg-cream-soft px-4 py-3">
                <Composer
                  compact
                  placeholder="Add to this discussion…"
                  submitLabel="Post"
                  onSubmit={(body) => addComment(thread.id, null, body)}
                />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
