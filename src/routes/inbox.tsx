import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMemo } from "react";
import { AtSign, CheckCircle2, FileCheck2, ListChecks, MailOpen, Users } from "lucide-react";

import { MentionInput } from "@/components/MentionInput";
import { departments, people, personById, useStore } from "@/lib/store";
import { formatDate, formatDateTime, taskStatusMeta } from "@/lib/status";
import { snippet } from "@/lib/threads";
import { toISO } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "My Work — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Everything that needs you across every production: reviews waiting on you, mentions of you and your departments, and the work you are assigned.",
      },
      { property: "og:title", content: "My Work — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Reviews, mentions, and assigned work waiting on you across all productions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWorkPage,
});

/** The order these groups appear in is the order things should be dealt with. */
const buckets = [
  { id: "waiting", label: "Waiting on you" },
  { id: "mentions", label: "Mentions of you and your departments" },
  { id: "work", label: "Work assigned to you" },
  { id: "decisions", label: "Decisions on what you sent" },
] as const;

type BucketId = (typeof buckets)[number]["id"];

type Item = {
  id: string;
  bucket: BucketId;
  projectId: string;
  created_at: string;
  read: boolean;
  notificationId?: string;
  icon: typeof AtSign;
  label: string;
  title: string;
  detail?: string;
  link: React.ReactNode;
  /** Set when the item came from a message, so it can be answered right here. */
  reply?: { threadId: string; parentCommentId: string };
};

function InlineReply({ threadId, parentCommentId }: { threadId: string; parentCommentId: string }) {
  const { addComment, can } = useStore();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  if (!can.comment) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-ink hover:underline"
      >
        Reply
      </button>
    );
  }
  return (
    <form
      className="mt-1 w-full space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        addComment(threadId, parentCommentId, body.trim());
        setBody("");
        setOpen(false);
      }}
    >
      <MentionInput
        value={body}
        onChange={setBody}
        rows={2}
        ariaLabel="Reply"
        placeholder="Reply…"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-ink-soft"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-full px-4 text-sm font-medium text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function MyWorkPage() {
  const {
    currentUserId,
    projects,
    tasks,
    documents,
    approvals,
    notifications,
    threads,
    comments,
    markNotifications,
  } = useStore();

  // Leadership demo: this opens on whoever you are viewing as, and you can look at
  // any team member's view to see how it works for the shop or lighting.
  const [personId, setPersonId] = useState(currentUserId);
  const viewedId = people.some((p) => p.id === personId) ? personId : currentUserId;
  const me = people.find((p) => p.id === viewedId);
  const today = toISO(new Date());

  // Departments this person belongs to, leads, or owns — department mentions land here too.
  const myDepartmentIds = useMemo(
    () =>
      departments
        .filter(
          (d) =>
            d.id === me?.primary_department_id ||
            d.owner_id === viewedId ||
            d.lead_ids.includes(viewedId),
        )
        .map((d) => d.id),
    [me?.primary_department_id, viewedId],
  );

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    // Direct @mentions and department mentions, wherever they were written.
    for (const n of notifications.filter((n) => n.recipient_id === viewedId)) {
      const comment = n.source_comment_id
        ? comments.find((c) => c.id === n.source_comment_id)
        : undefined;
      const thread = comment ? threads.find((t) => t.id === comment.thread_id) : undefined;
      const task = thread?.task_id ? tasks.find((t) => t.id === thread.task_id) : undefined;
      const doc = thread?.document_id
        ? documents.find((d) => d.id === thread.document_id)
        : undefined;
      const docFromEntity =
        !doc && n.source_entity_type === "document" && n.source_entity_id
          ? documents.find((d) => d.id === n.source_entity_id)
          : undefined;
      const target = doc ?? docFromEntity;

      const link = task ? (
        <Link
          to="/projects/$projectId/timeline"
          params={{ projectId: n.project_id }}
          search={{ task: task.id, ...(comment ? { comment: comment.id } : {}) }}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
        >
          Open {task.title}
        </Link>
      ) : target ? (
        <Link
          to="/projects/$projectId/documents"
          params={{ projectId: n.project_id }}
          search={{ document: target.id, ...(comment ? { comment: comment.id } : {}) }}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
        >
          Open {target.title}
        </Link>
      ) : (
        <Link
          to="/projects/$projectId/discussions"
          params={{ projectId: n.project_id }}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
        >
          Open the conversation
        </Link>
      );

      const cleanSummary = n.summary
        .replace(/^Approval /i, "")
        .replace(/^(\w)/, (c) => c.toUpperCase());

      out.push({
        id: `n-${n.id}`,
        bucket: "mentions",
        projectId: n.project_id,
        created_at: n.created_at,
        read: n.read,
        notificationId: n.id,
        icon: n.via_department ? Users : n.kind === "approval" ? FileCheck2 : AtSign,
        label: n.via_department
          ? "Department mention"
          : n.kind === "mention"
            ? "Mentioned you"
            : n.kind === "approval"
              ? "Approval"
              : n.kind.replace("_", " "),
        // Name the actual document or work item rather than "a document".
        title: target
          ? cleanSummary.replace(/ (?:on|for) an? document\b/i, ` on ${target.title}`)
          : task
            ? cleanSummary.replace(/ (?:on|for) an? task\b/i, ` on ${task.title}`)
            : cleanSummary,
        ...(comment ? { detail: `“${snippet(comment.body, 140)}”` } : {}),
        ...(comment ? { reply: { threadId: comment.thread_id, parentCommentId: comment.id } } : {}),
        link,
      });
    }

    // Work assigned to this person that is still open; late work is pulled forward.
    for (const task of tasks.filter((t) => t.assignee_id === viewedId && t.status !== "complete")) {
      const late = task.due_date < today;
      const blocked = task.status === "blocked";
      out.push({
        id: `t-${task.id}`,
        bucket: late || blocked ? "waiting" : "work",
        projectId: task.project_id,
        created_at: task.due_date,
        read: true,
        icon: ListChecks,
        label: blocked ? "Blocked" : late ? "Past its date" : "Assigned to you",
        title: task.title,
        detail: `Due ${formatDate(task.due_date)} · ${taskStatusMeta[task.status].label}`,
        link: (
          <Link
            to="/projects/$projectId/timeline"
            params={{ projectId: task.project_id }}
            search={{ task: task.id }}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
          >
            Open this work item
          </Link>
        ),
      });
    }

    // Reviews waiting on this person, and decisions on what they submitted.
    for (const a of approvals) {
      const doc = documents.find((d) => d.id === a.document_id);
      if (!doc) continue;
      const dept = departments.find((d) => d.id === doc.department_id);
      const waitingOnMe =
        a.decision === "requested" &&
        doc.approval_state === "in_review" &&
        (dept?.owner_id === viewedId ||
          (dept ? dept.lead_ids.includes(viewedId) : false) ||
          myDepartmentIds.includes(doc.department_id));
      const mySubmission = a.requested_by_id === viewedId && a.decision !== "requested";
      if (!waitingOnMe && !mySubmission) continue;

      out.push({
        id: `a-${a.id}`,
        bucket: waitingOnMe ? "waiting" : "decisions",
        projectId: doc.project_id,
        created_at: a.created_at,
        read: true,
        icon: waitingOnMe ? FileCheck2 : CheckCircle2,
        label: waitingOnMe ? "Your review" : "Decision on your submission",
        title: `${doc.title} — v${a.version}`,
        detail: waitingOnMe
          ? `Requested ${formatDate(a.created_at)} · ${a.note}`
          : `${personById(a.decided_by_id)?.full_name ?? "A reviewer"} ${a.decision.replace("_", " ")} this — ${a.note}`,
        link: (
          <Link
            to="/projects/$projectId/documents"
            params={{ projectId: doc.project_id }}
            search={{ document: doc.id }}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-deep hover:underline"
          >
            Open this document
          </Link>
        ),
      });
    }

    return out.sort(
      (x, y) => Number(x.read) - Number(y.read) || y.created_at.localeCompare(x.created_at),
    );
  }, [
    viewedId,
    myDepartmentIds,
    notifications,
    comments,
    threads,
    tasks,
    documents,
    approvals,
    today,
  ]);

  const unreadIds = items.filter((i) => !i.read && i.notificationId).map((i) => i.notificationId!);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Other";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 font-display text-3xl text-ink sm:text-4xl">
          {me?.full_name?.split(" ")[0] ?? "You"}
          {"’"}s day
        </h1>
        {unreadIds.length > 0 && (
          <button
            type="button"
            onClick={() => markNotifications(unreadIds, true)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
          >
            <MailOpen aria-hidden className="size-4" />
            Mark {unreadIds.length} as read
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="surface-card p-4 text-sm text-ink-soft">
          Nothing needs you right now. Anything addressed to you or your department will land here.
        </p>
      )}

      {buckets.map((bucket) => {
        const rows = items.filter((i) => i.bucket === bucket.id);
        if (rows.length === 0) return null;
        return (
          <section key={bucket.id} className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-border bg-cream-soft px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{bucket.label}</h2>
              <span className="text-xs text-ink-soft">{rows.length}</span>
              {rows.some((r) => !r.read) && (
                <span className="ml-auto rounded-full bg-gold-tint px-2 py-0.5 text-xs font-semibold text-gold-deep">
                  {rows.filter((r) => !r.read).length} unread
                </span>
              )}
            </header>
            <ul className="divide-y divide-border">
              {rows.map((item) => (
                <li key={item.id} className={cn("px-4 py-4", item.read ? "" : "bg-gold-tint/25")}>
                  <div className="flex gap-3">
                    <item.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="rule-label">{item.label}</span>
                        <span className="text-xs text-ink-soft">{projectName(item.projectId)}</span>
                        <span className="text-xs text-ink-soft">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-ink">{item.title}</p>
                      {item.detail && <p className="mt-0.5 text-sm text-ink-soft">{item.detail}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-x-4">
                        {item.link}
                        {item.reply && <InlineReply {...item.reply} />}
                        {item.notificationId && (
                          <button
                            type="button"
                            onClick={() => markNotifications([item.notificationId!], !item.read)}
                            className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-ink hover:underline"
                          >
                            {item.read ? "Mark unread" : "Mark read"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <label htmlFor="inbox-person" className="text-xs text-ink-soft">
          Viewing as
        </label>
        <select
          id="inbox-person"
          value={viewedId}
          onChange={(e) => setPersonId(e.target.value)}
          className="min-h-11 rounded-md border border-border bg-card px-2.5 text-sm text-ink"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} — {p.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
