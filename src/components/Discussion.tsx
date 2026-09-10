import { useEffect, useRef, useState } from "react";
import { AtSign, Loader2, MessageSquarePlus, Paperclip, Send, X } from "lucide-react";

import { AttachmentList } from "@/components/AttachmentList";
import { MentionInput } from "@/components/MentionInput";
import { MentionText } from "@/components/MentionText";
import { personById, useStore } from "@/lib/store";
import type { Comment, StagedAttachment, ThreadContext } from "@/lib/production-data";
import { formatDateTime } from "@/lib/status";
import { initials } from "@/lib/threads";
import { cn } from "@/lib/utils";

/** Chat panel shell so every conversation in the app reads the same way. */
function ChatPanel({ children }: { children: React.ReactNode }) {
  return <div className="surface-card overflow-hidden">{children}</div>;
}

function Transcript({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-[26rem] space-y-3 overflow-y-auto bg-cream-deep/70 px-3 py-3 sm:px-4">
      {children}
    </div>
  );
}


function ComposerBar({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-border bg-card px-3 py-2 sm:px-4">{children}</div>;
}

/** A quiet date divider between days, the way chat apps mark them. */
function DayDivider({ date }: { date: string }) {
  const day = new Date(date);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const label = same(day, today)
    ? "Today"
    : same(day, yesterday)
      ? "Yesterday"
      : day.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return (
    <p className="flex items-center gap-3 py-1 text-[0.6875rem] font-semibold text-ink-soft">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </p>
  );
}

function Composer({
  placeholder,
  submitLabel,
  onSubmit,
  withSubject = false,
  compact = false,
  initialDraft = "",
  autoFocus = false,
  projectId,
  threadKey,
}: {
  placeholder: string;
  submitLabel: string;
  /** Resolves false when the message could not be saved, so the text is kept. */
  onSubmit: (
    body: string,
    subject: string,
    attachments: StagedAttachment[],
  ) => void | Promise<boolean | void>;
  /** Where uploaded files are filed in storage. */
  projectId: string;
  threadKey: string;
  withSubject?: boolean;
  compact?: boolean;
  initialDraft?: string;
  autoFocus?: boolean;
}) {
  const { uploadAttachment } = useStore();
  const [body, setBody] = useState(initialDraft);
  const [subject, setSubject] = useState("");
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const pickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError("");
    const list = Array.from(files);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const uploaded = await uploadAttachment(file, projectId, threadKey);
        setStaged((prev) => [...prev, uploaded]);
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : `${file.name} could not be attached.`);
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <form
      ref={formRef}
      className={cn("space-y-2", compact ? "pt-2" : "surface-card p-4")}
      onSubmit={(e) => {
        e.preventDefault();
        // One send at a time: a second tap while the first is saving does nothing.
        if (uploading > 0 || sending) return;
        if ((!body.trim() && staged.length === 0) || (withSubject && !subject.trim())) return;
        const outgoing = { body: body.trim(), subject: subject.trim(), staged };
        setSending(true);
        void Promise.resolve(onSubmit(outgoing.body, outgoing.subject, outgoing.staged))
          .then((ok) => {
            if (ok === false) return;
            setBody("");
            setSubject("");
            setStaged([]);
          })
          .finally(() => setSending(false));
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
        onEnterSubmit={() => formRef.current?.requestSubmit()}
      />

      {(staged.length > 0 || uploading > 0 || uploadError) && (
        <div className="space-y-1">
          {staged.map((a) => (
            <div
              key={a.storage_key}
              className="flex items-center gap-2 rounded-md border border-border bg-cream-soft px-2 py-1.5 text-sm text-ink"
            >
              <Paperclip aria-hidden className="size-4 shrink-0 text-ink-soft" />
              <span className="min-w-0 flex-1 truncate">{a.file_name}</span>
              <button
                type="button"
                onClick={() => setStaged((prev) => prev.filter((s2) => s2.storage_key !== a.storage_key))}
                aria-label={`Remove ${a.file_name}`}
                className="grid size-11 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          {uploading > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Adding {uploading} file{uploading === 1 ? "" : "s"}…
            </p>
          )}
          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => void pickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
          >
            <Paperclip aria-hidden className="size-4" />
            Attach
          </button>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <AtSign aria-hidden className="size-3.5" />
            Type @ to bring in a person or department
          </p>
        </div>
        <button
          type="submit"
          disabled={
            uploading > 0 ||
            sending ||
            (!body.trim() && staged.length === 0) ||
            (withSubject && !subject.trim())
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-soft disabled:opacity-60 sm:w-auto"
        >
          {sending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden className="size-4" />
          )}
          {sending ? "Sending…" : submitLabel}
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
  
  projectId,
}: {
  authorId: string;
  projectId: string;
  body: string;
  createdAt: string;
  highlighted: boolean;
  id: string;
  mine: boolean;
}) {
  const { commentAttachments } = useStore();
  const author = personById(authorId);
  const files = commentAttachments.filter((a) => a.comment_id === id);
  return (
    <div
      id={`comment-${id}`}
      className={cn(
        "flex gap-2",
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
            "mt-1 inline-block rounded-2xl border px-3 py-2 text-left shadow-sm",
            mine ? "border-gold/45 bg-gold-tint" : "border-border bg-card",
          )}
        >

          {body && <MentionText body={body} />}
          {files.length > 0 && <AttachmentList attachments={files} projectId={projectId} />}
        </div>
      </div>
    </div>
  );
}

/**
 * One conversation, with a Messages view and a Files view listing everything ever
 * shared here — whether or not it was filed into the production's documents.
 */
function ThreadPanel({
  projectId,
  inline,
  title,
  contextText,
  threadId,
  threadComments,
  currentUserId,
  highlightCommentId,
  canPost,
  initialDraft,
  autoFocusComposer,
  endRef,
  onSend,
}: {
  projectId: string;
  inline: boolean;
  title: string;
  contextText: string;
  threadId: string;
  threadComments: Comment[];
  currentUserId: string;
  highlightCommentId?: string | undefined;
  canPost: boolean;
  initialDraft: string;
  autoFocusComposer: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  onSend: (body: string, attachments: StagedAttachment[]) => Promise<boolean>;
}) {
  const { commentAttachments } = useStore();
  const [tab, setTab] = useState<"messages" | "files">("messages");

  const ids = new Set(threadComments.map((c) => c.id));
  const files = commentAttachments
    .filter((a) => ids.has(a.comment_id))
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unsavedCount = files.filter((a) => !a.saved_document_id).length;

  return (
    <article>
      <ChatPanel>
        <header className="panel-header flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          {!inline && (
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
              <span className="text-xs text-ink-soft">{contextText}</span>
            </div>
          )}
          <div className="flex items-center gap-1" role="tablist" aria-label="Conversation views">
            {(["messages", "files"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
                  tab === key ? "chip-selected font-semibold" : "chip-quiet font-medium hover:bg-cream",
                )}

              >
                {key === "messages" ? (
                  <MessageSquarePlus aria-hidden className="size-4" />
                ) : (
                  <Paperclip aria-hidden className="size-4" />
                )}
                {key === "messages" ? "Messages" : `Files${files.length ? ` (${files.length})` : ""}`}
              </button>
            ))}
          </div>
        </header>

        {tab === "messages" ? (
          <Transcript>
            {threadComments.map((message, index) => {
              const previous = index > 0 ? threadComments[index - 1] : undefined;
              const newDay =
                !previous ||
                new Date(previous.created_at).toDateString() !==
                  new Date(message.created_at).toDateString();
              return (
                <div key={message.id} className="space-y-2">
                  {newDay && <DayDivider date={message.created_at} />}
                  <Message
                    projectId={projectId}
                    id={message.id}
                    authorId={message.author_id}
                    body={message.body}
                    createdAt={message.created_at}
                    mine={message.author_id === currentUserId}
                    highlighted={highlightCommentId === message.id}
                  />
                </div>
              );
            })}
            <div ref={endRef} />
          </Transcript>
        ) : (
          <Transcript>
            {files.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-soft">
                No files or images have been shared in this conversation yet.
              </p>
            ) : (
              <>
                <p className="text-xs text-ink-soft">
                  {files.length} shared here
                  {unsavedCount > 0 ? ` · ${unsavedCount} not yet in the production's documents` : ""}
                </p>
                {files.map((file) => {
                  const author = personById(
                    threadComments.find((c) => c.id === file.comment_id)?.author_id ?? "",
                  );
                  return (
                    <div key={file.id}>
                      <p className="text-xs text-ink-soft">
                        <span className="font-semibold text-ink">
                          {author?.full_name ?? "Someone"}
                        </span>{" "}
                        · {formatDateTime(file.created_at)}
                      </p>
                      <AttachmentList attachments={[file]} projectId={projectId} />
                    </div>
                  );
                })}
              </>
            )}
          </Transcript>
        )}

        {canPost && tab === "messages" && (
          <ComposerBar>
            <Composer
              compact
              projectId={projectId}
              threadKey={threadId}
              initialDraft={initialDraft}
              autoFocus={autoFocusComposer}
              placeholder="Message…"
              submitLabel="Send"
              onSubmit={async (body, _subject, attachments) => onSend(body, attachments)}
            />
          </ComposerBar>
        )}
      </ChatPanel>
    </article>
  );
}

export function Discussion({
  projectId,
  contextType,
  taskId = null,
  documentId = null,
  sceneId = null,
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
  /** Set the conversation belongs to, when the context is a set. */
  sceneId?: string | null;
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
  const [showNew, setShowNew] = useState(false);
  const [anchorId, setAnchorId] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

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

  // After sending, the newest message is brought into view inside the transcript.
  const lastMessageId = comments
    .filter((c) => visible.some((t) => t.id === c.thread_id))
    .reduce<string>((latest, c) => (latest > c.created_at ? latest : c.created_at + c.id), "");
  useEffect(() => {
    if (highlightCommentId || !lastMessageId) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [lastMessageId, highlightCommentId]);

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
              projectId={projectId}
              threadKey="new"
              withSubject={needsSubject}
              placeholder="Write the first message…"
              submitLabel="Send"
              onSubmit={async (body, subject, attachments) => {
                const ok = await createThread({
                  projectId,
                  contextType,
                  taskId: resolvedTaskId,
                  documentId: resolvedDocumentId,
                  subject,
                  body,
                  attachments,
                });
                if (!ok) return false;
                setAnchorId("");
                setShowNew(false);
                onSent?.();
                return true;
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
        <ChatPanel>
          <Transcript>
            <p className="py-4 text-center text-sm text-ink-soft">
              No messages here yet
              {canPost ? " — say something to bring the right people in." : locked ? " — this production is closed and archived." : "."}
            </p>
          </Transcript>
          {canPost && (
            <ComposerBar>
            <Composer
              compact
              projectId={projectId}
              threadKey="new"
              initialDraft={initialDraft}
              autoFocus={autoFocusComposer}
              placeholder="Message about this…"
              submitLabel="Send"
              onSubmit={async (body, _subject, attachments) => {
                const ok = await createThread({
                  projectId,
                  contextType,
                  taskId: resolvedTaskId,
                  documentId: resolvedDocumentId,
                  subject: "",
                  body,
                  attachments,
                });
                if (!ok) return false;
                onSent?.();
                return true;
              }}
            />
            </ComposerBar>
          )}
        </ChatPanel>
      )}

      {visible.map((thread) => {
        // Chat here is flat, in the order it was said — the table keeps no reply parent.
        const threadComments = comments
          .filter((c) => c.thread_id === thread.id)
          .slice()
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return (
          <ThreadPanel
            key={thread.id}
            projectId={projectId}
            inline={inline}
            title={thread.subject || contextLabel(thread.task_id, thread.document_id)}
            contextText={contextLabel(thread.task_id, thread.document_id)}
            threadId={thread.id}
            threadComments={threadComments}
            currentUserId={currentUserId}
            highlightCommentId={highlightCommentId}
            canPost={canPost}
            initialDraft={initialDraft}
            autoFocusComposer={autoFocusComposer}
            endRef={endRef}
            onSend={async (body, attachments) => {
              const ok = await addComment(thread.id, body, attachments);
              if (!ok) return false;
              onSent?.();
              return true;
            }}
          />
        );
      })}
    </section>
  );
}

/**
 * One conversation on its own, for the Slack-style layout where the list of
 * conversations lives on the left and the chosen one opens on the right.
 */
export function ConversationView({
  projectId,
  threadId,
  highlightCommentId,
}: {
  projectId: string;
  threadId: string;
  highlightCommentId?: string | undefined;
}) {
  const { threads, comments, tasks, documents, addComment, can, isClosed, currentUserId } =
    useStore();
  const endRef = useRef<HTMLDivElement>(null);
  const thread = threads.find((t) => t.id === threadId);

  const threadComments = comments
    .filter((c) => c.thread_id === threadId)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  useEffect(() => {
    if (!highlightCommentId) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCommentId, threadId]);

  useEffect(() => {
    if (highlightCommentId) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [threadId, threadComments.length, highlightCommentId]);

  if (!thread) {
    return (
      <ChatPanel>
        <Transcript>
          <p className="py-6 text-center text-sm text-ink-soft">
            Pick a conversation on the left to open it here.
          </p>
        </Transcript>
      </ChatPanel>
    );
  }

  const contextText = thread.task_id
    ? (tasks.find((t) => t.id === thread.task_id)?.title ?? "Work item")
    : thread.document_id
      ? (documents.find((d) => d.id === thread.document_id)?.title ?? "Document")
      : "Whole production";

  return (
    <ThreadPanel
      projectId={projectId}
      inline={false}
      title={thread.subject || contextText}
      contextText={contextText}
      threadId={thread.id}
      threadComments={threadComments}
      currentUserId={currentUserId}
      highlightCommentId={highlightCommentId}
      canPost={can.comment && !isClosed(projectId)}
      initialDraft=""
      autoFocusComposer={false}
      endRef={endRef}
      onSend={async (body, attachments) => addComment(thread.id, body, attachments)}
    />
  );
}

/** Starts a new production-wide conversation (subject + first message). */
export function NewProjectConversation({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated?: (() => void) | undefined;
}) {
  const { createThread } = useStore();
  return (
    <Composer
      projectId={projectId}
      threadKey="new"
      withSubject
      placeholder="Write the first message…"
      submitLabel="Send"
      onSubmit={async (body, subject, attachments) => {
        const ok = await createThread({
          projectId,
          contextType: "project",
          taskId: null,
          documentId: null,
          subject,
          body,
          attachments,
        });
        if (!ok) return false;
        onCreated?.();
        return true;
      }}
    />
  );
}
