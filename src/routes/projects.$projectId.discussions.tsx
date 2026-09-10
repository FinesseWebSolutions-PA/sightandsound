import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FileText, ListChecks, MessageSquare } from "lucide-react";

import { Discussion } from "@/components/Discussion";
import { personById, useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/status";
import { snippet } from "@/lib/threads";

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
          "Production-wide updates plus the full history of what has been said on work items and documents.",
      },
      { property: "og:title", content: "Updates — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Production-wide updates and the full history of conversation across the build.",
      },
    ],
  }),
  component: UpdatesTab,
});

function UpdatesTab() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { projects, threads, comments, tasks, documents } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  // Everything said on work items and documents, newest first, with its context.
  const elsewhere = comments
    .map((c) => ({ comment: c, thread: threads.find((t) => t.id === c.thread_id) }))
    .filter(
      (row) =>
        row.thread &&
        row.thread.project_id === projectId &&
        row.thread.context_type !== "project",
    )
    .sort((a, b) => b.comment.created_at.localeCompare(a.comment.created_at))
    .slice(0, 20);

  return (
    <div className="space-y-8">
      <Discussion
        projectId={projectId}
        contextType="project"
        heading="Production updates"
        {...(search.comment ? { highlightCommentId: search.comment } : {})}
      />

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Said elsewhere on this production</h2>
        <ul className="surface-card divide-y divide-border overflow-hidden">
          {elsewhere.map(({ comment, thread }) => {
            const task = thread!.task_id ? tasks.find((t) => t.id === thread!.task_id) : undefined;
            const doc = thread!.document_id
              ? documents.find((d) => d.id === thread!.document_id)
              : undefined;
            return (
              <li key={comment.id} className="px-4 py-3">
                <p className="rule-label flex items-center gap-1.5">
                  {task ? (
                    <ListChecks aria-hidden className="size-3.5" />
                  ) : (
                    <FileText aria-hidden className="size-3.5" />
                  )}
                  {task ? "Work item" : "Document"} · {formatDateTime(comment.created_at)}
                </p>
                {task ? (
                  <Link
                    to="/projects/$projectId/timeline"
                    params={{ projectId }}
                    search={{ task: task.id, comment: comment.id }}
                    className="mt-0.5 block text-sm font-semibold text-ink hover:underline"
                  >
                    {personById(comment.author_id)?.full_name ?? "A team member"} on {task.title}
                  </Link>
                ) : doc ? (
                  <Link
                    to="/projects/$projectId/documents"
                    params={{ projectId }}
                    search={{ document: doc.id, comment: comment.id }}
                    className="mt-0.5 block text-sm font-semibold text-ink hover:underline"
                  >
                    {personById(comment.author_id)?.full_name ?? "A team member"} on {doc.title}
                  </Link>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-ink">
                    {personById(comment.author_id)?.full_name ?? "A team member"}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-ink-soft italic">
                  “{snippet(comment.body, 140)}”
                </p>
              </li>
            );
          })}
          {elsewhere.length === 0 && (
            <li className="flex items-center gap-2 px-4 py-4 text-sm text-ink-soft">
              <MessageSquare aria-hidden className="size-4" />
              Nothing has been said on a work item or document yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
