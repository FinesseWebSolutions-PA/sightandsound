import { useEffect, useRef, useState } from "react";
import { AtSign, MessageSquarePlus, Send } from "lucide-react";

import { MentionInput } from "@/components/MentionInput";
import { MentionText } from "@/components/MentionText";
import { personById, useStore } from "@/lib/store";
import type { ThreadContext } from "@/lib/production-data";
import { formatDateTime } from "@/lib/status";
import { initials } from "@/lib/threads";
import { cn } from "@/lib/utils";

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  withSubject = false,
  compact = false,
  initialDraft = "",
  autoFocus = false,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string, subject: string) => void;
  withSubject?: boolean;
  compact?: boolean;
  initialDraft?: string;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initialDraft);
  const [subject, setSubject] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // On a phone the on-screen keyboard slides up over the bottom of the page, so
  // bring the whole composer (including the send button) into view on focus.
  const keepInView = () => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  };

  useEffect(() => {
    if (!autoFocus) return;
    const el = areaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    keepInView();
  }, [autoFocus]);

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
          placeholder="What is this about?"
          aria-label="Discussion subject"
          className="min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
        />
      )}
      <MentionInput
        value={body}
        onChange={setBody}
        onFocus={keepInView}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        ariaLabel="Message"
        inputRef={areaRef}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <AtSign aria-hidden className="size-3.5" />
          Type @ to bring in a person or department
        </p>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-soft sm:w-auto"
        >
          <Send aria-hidden className="size-4" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** One message, styled like a chat bubble; your own messages sit on the right. */
function Message({
  authorId,
  body,
  createdAt,
  highlighted,
  id,
  mine,
  reply = false,
}: {
  authorId: string;
  body: string;
  createdAt: string;
  highlighted: boolean;
  id: string;
  mine: boolean;
  reply?: boolean;
}) {
  const author = personById(authorId);
  return (
    <div
      id={`comment-${id}`}
      className={cn(
        "flex gap-2",
        reply && "pl-6",
        mine ? "flex-row-reverse" : "flex-row",
        highlighted && "-mx-1 rounded-lg bg-gold-tint/50 px-1 py-1 ring-1 ring-gold",
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[0.625rem] font-semibold text-cream-soft"
      >
        {initials(author?.full_name ?? "?")}
      </span>
      <div className={cn("min-w-0 max-w-[85%]", mine && "text-right")}>
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{author?.full_name ?? "Someone"}</span>
          <span>{formatDateTime(createdAt)}</span>
        </p>
        <div
          className={cn(
            "mt-1 inline-block rounded-2xl px-3 py-2 text-left",
            mine ? "bg-gold-tint" : "bg-cream-soft",
          )}
        >
          <MentionText body={body} />
        </div>
      </div>
    </div>
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
  initialDraft = "",
  autoFocusComposer = false,
  onSent,
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
  /** Pre-written opening text, e.g. when asking a department about a blocker. */
  initialDraft?: string;
  autoFocusComposer?: boolean;
  /** Fired after a message is sent, so a prefilled draft is only used once. */
  onSent?: () => void;
}) {
  const {
    threads,
    comments,
    addComment,
    createThread,
    can,
    tasks,
    documents,
    isClosed,
    currentUserId,
  } = useStore();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [anchorId, setAnchorId] = useState("");

  const locked = isClosed(projectId);
  const canPost = can.comment && !locked;

  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const projectDocuments = documents.filter((d) => d.project_id === projectId);
  const needsAnchor =
    (contextType === "task" && !taskId) || (contextType === "document" && !documentId);
  // Each work item and each document carries exactly one conversation, so anything
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
  // Only project-level topics need a name of their own; a conversation about a
  // work item or a drawing is simply that thing's conversation.
  const needsSubject = contextType === "project";

  const visible = threads.filter(
    (t) =>
      t.project_id === projectId &&
      t.context_type === contextType &&
      (taskId === null || t.task_id === taskId) &&
      (documentId === null || t.document_id === documentId),
  );

  // Jumping in from My Work lands on a specific message.
  useEffect(() => {
    if (!highlightCommentId) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCommentId, visible.length]);

  const contextLabel = (threadTaskId: string | null, threadDocumentId: string | null) => {
    if (threadTaskId) return tasks.find((t) => t.id === threadTaskId)?.title ?? "Work item";
    if (threadDocumentId)
      return documents.find((d) => d.id === threadDocumentId)?.title ?? "Document";
    return "Whole production";
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
              {showNew ? "Cancel" : "New conversation"}
            </button>
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
            </div>
          )}
          {(!needsAnchor || anchorId) && (
            <Composer
              withSubject={needsSubject}
              placeholder="Write the first message…"
              submitLabel="Send"
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
                onSent?.();
              }}
            />
          )}
        </div>
      )}

      {visible.length === 0 && !inline && !showNew && (
        <p className="surface-card p-4 text-sm text-ink-soft">
          Nothing here yet.
          {canPost ? " Start a conversation to bring the right departments in." : ""}
        </p>
      )}

      {/* Inline: the first message starts the conversation for this exact thing. */}
      {visible.length === 0 && inline && (
        <div>
          {canPost ? (
            <Composer
              compact
              initialDraft={initialDraft}
              autoFocus={autoFocusComposer}
              placeholder="Message about this…"
              submitLabel="Send"
              onSubmit={(body) => {
                createThread({
                  projectId,
                  contextType,
                  taskId: resolvedTaskId,
                  documentId: resolvedDocumentId,
                  subject: "",
                  body,
                });
                onSent?.();
              }}
            />
          ) : (
            <p className="text-sm text-ink-soft">
              No messages here yet
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
                <h3 className="text-sm font-semibold text-ink">
                  {thread.subject || contextLabel(thread.task_id, thread.document_id)}
                </h3>
                <span className="text-xs text-ink-soft">
                  {contextLabel(thread.task_id, thread.document_id)}
                </span>
              </header>
            )}
            <div className={inline ? "space-y-4" : "space-y-4 px-4 py-3"}>
              {roots.map((root) => {
                const replies = threadComments.filter((c) => c.parent_comment_id === root.id);
                return (
                  <div key={root.id} className="space-y-2">
                    <Message
                      id={root.id}
                      authorId={root.author_id}
                      body={root.body}
                      createdAt={root.created_at}
                      mine={root.author_id === currentUserId}
                      highlighted={highlightCommentId === root.id}
                    />
                    {replies.map((reply) => (
                      <Message
                        key={reply.id}
                        reply
                        id={reply.id}
                        authorId={reply.author_id}
                        body={reply.body}
                        createdAt={reply.created_at}
                        mine={reply.author_id === currentUserId}
                        highlighted={highlightCommentId === reply.id}
                      />
                    ))}

                    {canPost && (
                      <div className="pl-9">
                        {replyTo === root.id ? (
                          <Composer
                            compact
                            autoFocus
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
                            className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-ink hover:underline"
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
                  initialDraft={initialDraft}
                  autoFocus={autoFocusComposer}
                  placeholder="Message…"
                  submitLabel="Send"
                  onSubmit={(body) => {
                    addComment(thread.id, null, body);
                    onSent?.();
                  }}
                />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
