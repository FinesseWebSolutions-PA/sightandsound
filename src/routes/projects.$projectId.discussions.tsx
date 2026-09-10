import { useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileText, ListChecks, MessageSquare, MessageSquarePlus, X } from "lucide-react";

import { ConversationView, NewProjectConversation } from "@/components/Discussion";
import { personById, useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/status";
import { snippet } from "@/lib/threads";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/discussions")({
  validateSearch: (search: Record<string, unknown>): { comment?: string } => ({
    ...(typeof search["comment"] === "string" ? { comment: search["comment"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Updates — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Every conversation on this production in one place — production-wide topics, work items and documents.",
      },
      { property: "og:title", content: "Updates — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "All conversation on the build, side by side with the message you opened.",
      },
    ],
  }),
  component: UpdatesTab,
});

function UpdatesTab() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { projects, threads, comments, tasks, documents, can, isClosed } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const [showNew, setShowNew] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // Every conversation on this production, newest activity first.
  const list = useMemo(() => {
    return threads
      .filter((t) => t.project_id === projectId)
      .map((t) => {
        const own = comments
          .filter((c) => c.thread_id === t.id)
          .slice()
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const last = own.at(-1);
        const label = t.task_id
          ? (tasks.find((x) => x.id === t.task_id)?.title ?? "Work item")
          : t.document_id
            ? (documents.find((d) => d.id === t.document_id)?.title ?? "Document")
            : "Whole production";
        return {
          id: t.id,
          kind: t.task_id ? "task" : t.document_id ? "document" : "project",
          name: t.subject || label,
          context: label,
          count: own.length,
          last,
          at: last?.created_at ?? t.created_at,
        };
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [threads, comments, tasks, documents, projectId]);

  const fromLink = search.comment
    ? comments.find((c) => c.id === search.comment)?.thread_id
    : undefined;
  const activeId = picked ?? fromLink ?? list[0]?.id ?? null;
  const active = list.find((t) => t.id === activeId);
  const locked = isClosed(projectId);
  const canStart = can.comment && !locked;

  const groups = [
    { key: "project", title: "Production-wide", icon: MessageSquare },
    { key: "task", title: "Work items", icon: ListChecks },
    { key: "document", title: "Documents", icon: FileText },
  ] as const;

  return (
    <div className="space-y-3">
      {locked && (
        <p className="surface-card p-3 text-sm text-ink-soft">
          This production is closed and archived — conversation stays readable, but nothing new can
          be posted.
        </p>
      )}

      {showNew && canStart && (
        <div className="space-y-2">
          <NewProjectConversation projectId={projectId} onCreated={() => setShowNew(false)} />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Conversation list — the left rail, like a chat app's channel list. */}
        <aside
          className={cn(
            "surface-card flex min-w-0 flex-col overflow-hidden",
            active && picked ? "hidden lg:flex" : "flex",
          )}
        >
          <header className="panel-header flex items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-sm font-semibold text-ink">Conversations</h2>
            {canStart && (
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
              >
                {showNew ? (
                  <X aria-hidden className="size-4" />
                ) : (
                  <MessageSquarePlus aria-hidden className="size-4" />
                )}
                {showNew ? "Cancel" : "New"}
              </button>
            )}
          </header>

          <div className="max-h-[32rem] overflow-y-auto">
            {list.length === 0 && (
              <p className="px-3 py-4 text-sm text-ink-soft">
                No conversations on this production yet.
              </p>
            )}
            {groups.map((group) => {
              const rows = list.filter((t) => t.kind === group.key);
              if (rows.length === 0) return null;
              const Icon = group.icon;
              return (
                <section key={group.key}>
                  <p className="group-header flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-soft">
                    <Icon aria-hidden className="size-3.5" />
                    {group.title} ({rows.length})
                  </p>
                  <ul className="row-list">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(row.id)}
                          aria-current={row.id === activeId ? "true" : undefined}
                          className={cn(
                            "block w-full px-3 py-2.5 text-left transition-colors",
                            row.id === activeId ? "bg-cream" : "hover:bg-cream/70",
                          )}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-ink">
                              {row.name}
                            </span>
                            <span className="shrink-0 text-[0.6875rem] text-ink-soft">
                              {row.count} msg
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ink-soft">
                            {row.last
                              ? `${personById(row.last.author_id)?.full_name ?? "A team member"}: ${snippet(row.last.body, 60)}`
                              : "No messages yet"}
                          </span>
                          <span className="mt-0.5 block text-[0.6875rem] text-ink-soft">
                            {formatDateTime(row.at)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </aside>

        {/* The open conversation. */}
        <div className={cn("min-w-0 space-y-2", active && picked ? "block" : "hidden lg:block")}>
          {picked && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream lg:hidden"
            >
              <ArrowLeft aria-hidden className="size-4" />
              All conversations
            </button>
          )}
          {activeId ? (
            <ConversationView
              projectId={projectId}
              threadId={activeId}
              {...(search.comment && (picked ?? fromLink) === fromLink
                ? { highlightCommentId: search.comment }
                : {})}
            />
          ) : (
            <p className="surface-card p-4 text-sm text-ink-soft">
              Nothing here yet.
              {canStart ? " Start a conversation to bring the right departments in." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
