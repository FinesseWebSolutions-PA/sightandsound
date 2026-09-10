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

/**
 * Every conversation on a production, grouped the way the build is organised:
 * production-wide topics first, then one section per set carrying that set's own
 * topics plus the conversations on its work items and documents.
 */
export type ThreadRow = {
  id: string;
  kind: "project" | "scene" | "task" | "document";
  name: string;
  context: string;
  count: number;
  latest: Comment | null;
  at: string;
};

export type ThreadSection = {
  key: string;
  title: string;
  /** Set id when the section is a set, otherwise null. */
  sceneId: string | null;
  rows: ThreadRow[];
};

export function groupThreadsBySet({
  projectId,
  threads,
  comments,
  tasks,
  documents,
  scenes,
}: {
  projectId: string;
  threads: DiscussionThread[];
  comments: Comment[];
  tasks: { id: string; title: string; scene_id: string }[];
  documents: { id: string; title: string; scene_id: string }[];
  scenes: { id: string; name: string; sort_order: number }[];
}): ThreadSection[] {
  const rowFor = (t: DiscussionThread): { row: ThreadRow; sceneId: string | null } => {
    const own = comments
      .filter((c) => c.thread_id === t.id)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const latest = own.at(-1) ?? null;
    const task = t.task_id ? tasks.find((x) => x.id === t.task_id) : undefined;
    const doc = t.document_id ? documents.find((d) => d.id === t.document_id) : undefined;
    const scene = scenes.find(
      (s) => s.id === (t.scene_id || task?.scene_id || doc?.scene_id || ""),
    );
    const kind: ThreadRow["kind"] = task
      ? "task"
      : doc
        ? "document"
        : t.context_type === "scene"
          ? "scene"
          : "project";
    const context = task
      ? task.title
      : doc
        ? doc.title
        : kind === "scene"
          ? (scene?.name ?? "A set")
          : "Whole production";
    return {
      sceneId: kind === "project" ? null : (scene?.id ?? null),
      row: {
        id: t.id,
        kind,
        name: t.subject || context,
        context,
        count: own.length,
        latest,
        at: latest?.created_at ?? t.created_at,
      },
    };
  };

  const mine = threads.filter((t) => t.project_id === projectId).map(rowFor);
  const byNewest = (a: ThreadRow, b: ThreadRow) => b.at.localeCompare(a.at);

  const sections: ThreadSection[] = [];
  const wide = mine.filter((m) => m.sceneId === null && m.row.kind === "project").map((m) => m.row);
  if (wide.length > 0)
    sections.push({ key: "project", title: "Production-wide", sceneId: null, rows: wide.sort(byNewest) });

  for (const scene of scenes.slice().sort((a, b) => a.sort_order - b.sort_order)) {
    const rows = mine.filter((m) => m.sceneId === scene.id).map((m) => m.row);
    if (rows.length > 0)
      sections.push({ key: scene.id, title: scene.name, sceneId: scene.id, rows: rows.sort(byNewest) });
  }

  const loose = mine
    .filter((m) => m.sceneId === null && m.row.kind !== "project")
    .map((m) => m.row);
  if (loose.length > 0)
    sections.push({ key: "loose", title: "Not tied to a set", sceneId: null, rows: loose.sort(byNewest) });

  return sections;
}
