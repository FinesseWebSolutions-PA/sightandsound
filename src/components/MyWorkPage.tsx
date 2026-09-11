import { latestVersionReview } from "@/lib/document-library";
import { NotificationSettings } from "@/components/NotificationSettings";
import { usePersonalWorkflow } from "@/lib/personal-context";
import { notificationDisposition } from "@/lib/notification-rules";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import { AtSign, CheckCircle2, FileCheck2, ListChecks, MailOpen, Users } from "lucide-react";

import { MentionInput } from "@/components/MentionInput";
import { departments, people, personById, useStore } from "@/lib/store";
import { formatDate, formatDateTime, taskStatusMeta } from "@/lib/status";
import { snippet } from "@/lib/threads";
import { toISO } from "@/lib/schedule";
import { cn } from "@/lib/utils";

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
  /** The title itself, as the link into context — one obvious way in. */
  open: React.ReactNode;
  /** Set when the item came from a message, so it can be answered right here. */
  reply?: { threadId: string };
};

function InlineReply({ threadId }: { threadId: string }) {
  const { addComment, can } = useStore();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
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
        if (!body.trim() || sending) return;
        setSending(true);
        void addComment(threadId, body.trim())
          .then((ok) => {
            if (!ok) return;
            setBody("");
            setOpen(false);
          })
          .finally(() => setSending(false));
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
          disabled={sending || !body.trim()}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send"}
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

export function MyWorkPage() {
  const {
    currentUserId,
    projects,
    tasks,
    documents,
    approvals,
    notifications,
    threads,
    comments,
    scenes,
    projectAssignments,
    documentVersions,
    markNotifications,
  } = useStore();

  // Leadership demo: this opens on whoever you are viewing as, and you can look at
  // any team member's view to see how it works for the shop or lighting.
  const [personId, setPersonId] = useState(currentUserId);
  useEffect(() => setPersonId(currentUserId), [currentUserId]);
  const viewedId = people.some((p) => p.id === personId) ? personId : currentUserId;
  const me = people.find((p) => p.id === viewedId);
  const { state: personal, act: personalAct } = usePersonalWorkflow();
  const [disposition, setDisposition] = useState("active");
  const today = toISO(new Date());
  const [filter, setFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [query, setQuery] = useState("");

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
      const taskFromEntity =
        !task && n.source_entity_type === "task" && n.source_entity_id
          ? tasks.find((t) => t.id === n.source_entity_id)
          : undefined;
      const docFromEntity =
        !doc && n.source_entity_type === "document" && n.source_entity_id
          ? documents.find((d) => d.id === n.source_entity_id)
          : undefined;
      const target = doc ?? docFromEntity;
      const work = task ?? taskFromEntity;

      const author = comment ? personById(comment.author_id)?.full_name : undefined;
      const myDept = departments.find((d) => myDepartmentIds.includes(d.id));
      const where = work
        ? work.title
        : target
          ? target.title
          : thread?.subject || "the production updates";

      // Read like a person talking, whenever the data supports it.
      const workUpdateTitle =
        !comment && work
          ? n.summary.includes(":")
            ? n.summary
            : `${n.summary}: ${work.title}`
          : undefined;
      const humanTitle =
        workUpdateTitle ??
        (author && n.kind === "mention"
          ? `${author} mentioned ${n.via_department ? (myDept?.name ?? "your department") : "you"} on ${where}`
          : author
            ? `${author} wrote on ${where}`
            : `${n.summary.replace(/^Approval /i, "").replace(/^(\w)/, (c) => c.toUpperCase())}${
                target ? `: ${target.title}` : ""
              }`);

      const linkClass = "text-sm font-semibold text-ink hover:underline";
      const open = work ? (
        <Link
          to="/projects/$projectId/timeline"
          params={{ projectId: n.project_id }}
          search={{ task: work.id, ...(comment ? { comment: comment.id } : {}) }}
          className={linkClass}
        >
          {humanTitle}
        </Link>
      ) : target ? (
        <Link
          to="/projects/$projectId/documents"
          params={{ projectId: n.project_id }}
          search={{ document: target.id, ...(comment ? { comment: comment.id } : {}) }}
          className={linkClass}
        >
          {humanTitle}
        </Link>
      ) : n.source_entity_type === "scene" && n.source_entity_id ? (
        <Link
          className={linkClass}
          to="/projects/$projectId/sets"
          params={{ projectId: n.project_id }}
          search={{
            set: n.source_entity_id,
            section: n.summary.toLowerCase().includes("schedule") ? "planning" : "updates",
          }}
        >
          {humanTitle}
        </Link>
      ) : (
        <Link
          to="/projects/$projectId/discussions"
          params={{ projectId: n.project_id }}
          search={comment ? { comment: comment.id } : {}}
          className={linkClass}
        >
          {humanTitle}
        </Link>
      );

      const isWorkUpdate = n.kind === "status_change" && !comment;
      out.push({
        id: `n-${n.id}`,
        bucket: isWorkUpdate ? "work" : "mentions",
        projectId: n.project_id,
        created_at: n.created_at,
        read: n.read,
        notificationId: n.id,
        icon: isWorkUpdate
          ? ListChecks
          : n.via_department
            ? Users
            : n.kind === "approval"
              ? FileCheck2
              : AtSign,
        label: isWorkUpdate
          ? "Progress update"
          : n.via_department
            ? "Department mention"
            : n.kind === "mention"
              ? "Mentioned you"
              : n.kind === "approval"
                ? "Approval"
                : comment
                  ? "New message"
                  : n.kind.replace("_", " "),
        title: humanTitle,
        ...(comment ? { detail: `“${snippet(comment.body, 140)}”` } : {}),
        ...(comment ? { reply: { threadId: comment.thread_id } } : {}),
        open,
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
        open: (
          <Link
            to="/projects/$projectId/timeline"
            params={{ projectId: task.project_id }}
            search={{ task: task.id }}
            className="text-sm font-semibold text-ink hover:underline"
          >
            {task.title}
          </Link>
        ),
      });
    }

    // Reviews waiting on this person, and decisions on what they submitted.
    for (const a of approvals) {
      if (latestVersionReview(approvals, a.document_id, a.version)?.id !== a.id) continue;
      const doc = documents.find((d) => d.id === a.document_id);
      if (!doc) continue;
      const dept = departments.find((d) => d.id === doc.department_id);
      const waitingOnMe =
        a.decision === "requested" &&
        doc.approval_state === "in_review" &&
        a.version === doc.current_version &&
        (a.reviewer_id
          ? a.reviewer_id === viewedId
          : dept?.owner_id === viewedId ||
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
          ? `Requested ${formatDate(a.created_at)}${a.due_date ? ` · Needed by ${formatDate(a.due_date)}` : ""} · ${a.note}`
          : `${personById(a.decided_by_id)?.full_name ?? "A reviewer"} ${a.decision.replace("_", " ")} this — ${a.note}`,
        open: (
          <Link
            to="/projects/$projectId/documents"
            params={{ projectId: doc.project_id }}
            search={{
              document: doc.id,
              ...(a.document_version_id
                ? { version: a.document_version_id }
                : documentVersions.find((v) => v.document_id === doc.id && v.version === a.version)
                  ? {
                      version: documentVersions.find(
                        (v) => v.document_id === doc.id && v.version === a.version,
                      )!.id,
                    }
                  : {}),
            }}
            className="text-sm font-semibold text-ink hover:underline"
          >
            {`${doc.title} — v${a.version}`}
          </Link>
        ),
      });
    }

    // Collapse identical entries (e.g. the same approval/decision recorded twice)
    // so the feed reads as one story per event, not a duplicated audit trail.
    const seen = new Set<string>();
    const deduped = out.filter((item) => {
      const key = `${item.bucket}|${item.projectId}|${item.title}|${item.detail ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.sort(
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
    documentVersions,
    today,
  ]);

  const matchesFilter = (item: Item, choice: string) =>
    choice === "all" ||
    (choice === "tasks"
      ? item.id.startsWith("t-")
      : choice === "approvals"
        ? item.id.startsWith("a-")
        : choice === "mentions"
          ? item.label === "Mentioned you" || item.label === "Department mention"
          : Boolean(
              item.reply &&
              personal.threads.some(
                (t) => t.thread_id === item.reply?.threadId && t.mode === "following",
              ),
            ));
  const visibleItems = items.filter(
    (i) =>
      matchesFilter(i, filter) &&
      (i.notificationId
        ? notificationDisposition(
            personal.notifications.find((s) => s.notification_id === i.notificationId),
          ) === disposition
        : disposition === "active") &&
      (!unreadOnly || !i.read) &&
      (!projectFilter || i.projectId === projectFilter) &&
      `${i.title} ${i.detail ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const mySets = scenes
    .filter(
      (s) =>
        s.owner_id === viewedId ||
        projectAssignments.some((a) => a.scene_id === s.id && a.person_id === viewedId) ||
        tasks.some((t) => t.scene_id === s.id && t.assignee_id === viewedId),
    )
    .filter((s) => projects.find((p) => p.id === s.project_id)?.status !== "closed")
    .slice(0, 6);
  const unreadIds = visibleItems
    .filter((i) => !i.read && i.notificationId)
    .map((i) => i.notificationId!);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Other";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 font-display text-3xl text-ink sm:text-4xl">My Work</h1>
        {viewedId === currentUserId && unreadIds.length > 0 && (
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

      <p className="text-sm text-ink-soft">
        {me?.full_name?.split(" ")[0] ?? "Your"}, here is what needs your attention. Reading an
        update does not complete its task.
      </p>
      <div className="flex flex-wrap gap-2" aria-label="My Work filters">
        {[
          ["all", "All"],
          ["tasks", "Tasks"],
          ["approvals", "Approvals"],
          ["mentions", "Mentions"],
          ["following", "Following"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value!)}
            className={`min-h-11 rounded-md border px-3 text-sm ${filter === value ? "bg-ink text-cream-soft" : "bg-card"}`}
          >
            {label}{" "}
            <span className="ml-1 opacity-70">
              {items.filter((i) => matchesFilter(i, value!)).length}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search My Work"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your work…"
          className="min-h-11 min-w-0 flex-1 rounded-md border bg-card px-3 text-base sm:text-sm"
        />
        <select
          aria-label="Filter My Work by production"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="min-h-11 max-w-full rounded-md border bg-card px-3 text-sm"
        >
          <option value="">All productions</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Unread updates only
        </label>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Update status">
        {[
          ["active", "Active"],
          ["snoozed", "Snoozed"],
          ["done", "Dismissed updates"],
        ].map(([id, label]) => (
          <button
            key={id}
            className="min-h-10 rounded border px-3 text-sm"
            aria-pressed={disposition === id}
            onClick={() => setDisposition(id!)}
          >
            {label}
          </button>
        ))}
      </div>
      {mySets.length > 0 && (
        <section aria-label="My sets">
          <h2 className="mb-2 text-sm font-semibold">My sets</h2>
          <div className="flex flex-wrap gap-2">
            {mySets.map((s) => (
              <Link
                key={s.id}
                to="/projects/$projectId/sets"
                params={{ projectId: s.project_id }}
                search={{ set: s.id, section: "overview" }}
                className="min-h-11 rounded-md border bg-card px-3 py-2 text-sm"
              >
                {s.name}
                <span className="ml-2 text-xs text-ink-soft">
                  {projects.find((p) => p.id === s.project_id)?.code}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {visibleItems.length === 0 && (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No items match this view. Try another filter, or open a production to browse its work.
        </p>
      )}

      {buckets.map((bucket) => {
        const rows = visibleItems.filter((i) => i.bucket === bucket.id);
        if (rows.length === 0) return null;
        return (
          <section key={bucket.id} className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 panel-header px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{bucket.label}</h2>
              <span className="text-xs text-ink-soft">{rows.length}</span>
              {rows.some((r) => !r.read) && (
                <span className="ml-auto rounded-full bg-gold-tint px-2 py-0.5 text-xs font-semibold text-gold-deep">
                  {rows.filter((r) => !r.read).length} unread
                </span>
              )}
            </header>
            <ul className="row-list">
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
                      <p className="mt-1">{item.open}</p>
                      {item.detail && <p className="mt-0.5 text-sm text-ink-soft">{item.detail}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-x-4">
                        {/* Answering here posts as the person signed in, so it is only
                            offered when looking at your own day. */}
                        {item.reply && viewedId === currentUserId && (
                          <InlineReply {...item.reply} />
                        )}
                        {item.notificationId && viewedId === currentUserId && (
                          <>
                            <button
                              className="min-h-11 text-sm text-ink-soft underline"
                              onClick={() =>
                                void personalAct("notification", {
                                  notification_id: item.notificationId,
                                  dismissed: disposition !== "done",
                                })
                              }
                            >
                              {disposition === "done" ? "Restore update" : "Dismiss update"}
                            </button>
                            {disposition !== "done" && (
                              <button
                                className="min-h-11 text-sm text-ink-soft underline"
                                onClick={() =>
                                  void personalAct("notification", {
                                    notification_id: item.notificationId,
                                    snoozed_until:
                                      disposition === "snoozed"
                                        ? null
                                        : new Date(Date.now() + 86400000).toISOString(),
                                  })
                                }
                              >
                                {disposition === "snoozed" ? "Unsnooze" : "Remind me tomorrow"}
                              </button>
                            )}
                          </>
                        )}
                        {item.notificationId && viewedId === currentUserId && (
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

      <details className="surface-card p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">Getting started</summary>
        <ol className="ml-5 list-decimal space-y-2 text-sm text-ink-soft">
          <li>
            Open a set from My sets or{" "}
            <Link to="/productions" className="underline">
              Productions
            </Link>
            .
          </li>
          <li>Use Conversations to ask a question. Type @ to bring in a person or department.</li>
          <li>
            Use Files → New to upload. Open a file and choose Request approval when it needs
            sign-off.
          </li>
          <li>
            Approvals and mentions arrive here. Mark read tracks what you have seen; dismissing an
            update does not complete its task.
          </li>
        </ol>
      </details>
      <NotificationSettings />
      <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-4">
        <label htmlFor="inbox-person" className="text-xs text-ink-soft">
          Preview another person (demo)
        </label>
        <select
          id="inbox-person"
          value={viewedId}
          onChange={(e) => setPersonId(e.target.value)}
          className="min-h-11 w-full max-w-full min-w-0 truncate rounded-md border border-border bg-card px-2.5 text-sm text-ink sm:w-auto"
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
