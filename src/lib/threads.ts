import type { Comment, DiscussionThread } from "./production-data";

export type ThreadActivity = {
  threadIds: string[];
  count: number;
  latest: Comment | null;
};

/**
 * Comment activity attached to one thing (a work item, a document, or the
 * production itself), so the count and last message can be shown right where
 * that thing is listed instead of only inside the Discussions tab.
 */
export function activityFor(
  threads: DiscussionThread[],
  comments: Comment[],
  anchor: { projectId: string; taskId?: string | null; documentId?: string | null },
): ThreadActivity {
  const matching = threads.filter((t) => {
    if (t.project_id !== anchor.projectId) return false;
    if (anchor.taskId) return t.task_id === anchor.taskId;
    if (anchor.documentId) return t.document_id === anchor.documentId;
    return t.context_type === "project";
  });
  const ids = matching.map((t) => t.id);
  const mine = comments
    .filter((c) => ids.includes(c.thread_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    threadIds: ids,
    count: mine.length,
    latest: mine.length ? mine[mine.length - 1]! : null,
  };
}

/** Short one-line preview of a comment for lists and activity feeds. */
export function snippet(body: string, limit = 110): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

export function initials(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
}
