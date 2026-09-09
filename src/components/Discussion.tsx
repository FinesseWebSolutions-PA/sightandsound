import { useEffect, useRef, useState } from "react";
import { AtSign, CornerDownRight, MessageSquarePlus, Send } from "lucide-react";

import { MentionInput } from "@/components/MentionInput";
import { MentionText } from "@/components/MentionText";
import { personById, useStore } from "@/lib/store";
import type { ThreadContext } from "@/lib/production-data";
import { formatDateTime } from "@/lib/status";
import { cn } from "@/lib/utils";

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  withSubject = false,
  compact = false,
  autoFocus = false,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string, subject: string) => void;
  withSubject?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // On a phone the on-screen keyboard slides up over the bottom of the page, so
  // bring the whole composer (including the send button) into view on focus.
  const keepInView = () => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  };

  return (
    <form
      ref={formRef}
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
          onFocus={keepInView}
          placeholder="What is this discussion about?"
          aria-label="Discussion subject"
          className="min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
        />
      )}
      <MentionInput
        value={body}
        onChange={setBody}
        onFocus={keepInView}
        placeholder={placeholder}
        rows={compact ? 3 : 4}
        ariaLabel="Message"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <AtSign aria-hidden className="size-3.5" />
          Type @ to mention a team member or a department. Department mentions reach its owner and
          leads only.
        </p>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-soft sm:w-auto"
        >
          <Send aria-hidden className="size-4" />
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
  inline = false,
  highlightCommentId,
}: {
  projectId: string;
  contextType: ThreadContext;
  taskId?: string | null;
  documentId?: string | null;
  heading?: string;
  blurb?: string;
  /** Inline mode is used where the thing itself is shown (a work item, a document). */
  inline?: boolean;
  highlightCommentId?: string;
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

  // Jumping in from the Inbox lands on a specific message.
  useEffect(() => {
    if (!highlightCommentId) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCommentId, visible.length]);

  const contextLabel = (threadTaskId: string | null, threadDocumentId: string | null) => {
    if (threadTaskId) return tasks.find((t) => t.id === threadTaskId)?.title ?? "Task";
    if (threadDocumentId)
      return documents.find((d) => d.id === threadDocumentId)?.title ?? "Document";
    return "Project-level";
  };

  return (
    <section className="space-y-4">
      {heading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">{heading}</h2>
            {blurb && <p className="mt-1 text-sm text-ink-soft">{blurb}</p>}
          </div>
          {canStart && (
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-cream sm:w-auto"
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
            <div className="surface-card flex flex-col gap-2 p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
              <span className="rule-label">
                {contextType === "task" ? "Work item" : "Document"}
              </span>
              <select
                aria-label={contextType === "task" ? "Choose a work item" : "Choose a document"}
                value={anchorId}
                onChange={(e) => setAnchorId(e.target.value)}
                className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:min-h-0 sm:w-auto sm:py-1 sm:text-sm"
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

      {visible.length === 0 && !inline && (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No discussion here yet.
          {canPost ? " Start one to bring the right departments in." : ""}
        </p>
      )}

      {/* Inline: the first message starts the thread for this exact thing, no picking required. */}
      {visible.length === 0 && inline && (
        <div>
          {canPost ? (
            <Composer
              compact
              placeholder="Start the conversation about this — type @ to bring someone in…"
              submitLabel="Post comment"
              onSubmit={(body) =>
                createThread({
                  projectId,
                  contextType,
                  taskId: resolvedTaskId,
                  documentId: resolvedDocumentId,
                  subject: "",
                  body,
                })
              }
            />
          ) : (
            <p className="text-sm text-ink-soft">
              No comments here yet
              {locked ? " — this production is closed and archived." : "."}
            </p>
          )}
        </div>
      )}

      {visible.map((thread) => {
        const threadComments = comments.filter((c) => c.thread_id === thread.id);
        const roots = threadComments.filter((c) => !c.parent_comment_id);
        return (
          <article
            key={thread.id}
            className={inline ? "overflow-hidden" : "surface-card overflow-hidden"}
          >
            {!inline && (
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-cream-soft px-4 py-3">
                <h3 className="text-sm font-semibold text-ink">{thread.subject}</h3>
                <span className="code-id">
                  {contextType} · {contextLabel(thread.task_id, thread.document_id)}
                </span>
              </header>
            )}
            <div className="divide-y divide-border">
              {roots.map((root) => {
                const replies = threadComments.filter((c) => c.parent_comment_id === root.id);
                return (
                  <div
                    key={root.id}
                    id={`comment-${root.id}`}
                    className={cn(
                      inline ? "py-3 first:pt-0" : "px-4 py-3",
                      highlightCommentId === root.id &&
                        "-mx-2 rounded-md bg-gold-tint/60 px-2 ring-1 ring-gold",
                    )}
                  >
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
                          <div key={reply.id} id={`comment-${reply.id}`}>
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
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
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
              <div
                className={
                  inline
                    ? "border-t border-border pt-2"
                    : "border-t border-border bg-cream-soft px-4 py-3"
                }
              >
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
