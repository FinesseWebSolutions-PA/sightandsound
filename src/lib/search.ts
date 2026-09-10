import type {
  Comment,
  DiscussionThread,
  Document,
  Department,
  Milestone,
  Person,
  Project,
  Task,
} from "./production-data";
import { snippet } from "./threads";

export type SearchHit =
  | { kind: "project"; id: string; projectId: string; title: string; breadcrumb: string }
  | {
      kind: "task";
      id: string;
      projectId: string;
      taskId: string;
      title: string;
      breadcrumb: string;
    }
  | {
      kind: "document";
      id: string;
      projectId: string;
      documentId: string;
      title: string;
      breadcrumb: string;
    }
  | {
      kind: "comment";
      id: string;
      projectId: string;
      taskId: string | null;
      documentId: string | null;
      commentId: string;
      title: string;
      breadcrumb: string;
      excerpt: string;
    };

type Sources = {
  projects: Project[];
  tasks: Task[];
  documents: Document[];
  milestones: Milestone[];
  departments: Department[];
  people: Person[];
  threads: DiscussionThread[];
  comments: Comment[];
};

const has = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle);

/**
 * Plain substring search over the production data already loaded in the browser:
 * productions, work items, documents, and what people have written.
 */
export function searchAll(sources: Sources, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const { projects, tasks, documents, milestones, departments, people, threads, comments } = sources;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Production";
  const deptName = (id: string | null) =>
    id ? (departments.find((d) => d.id === id)?.name ?? "") : "";
  const personName = (id: string | null) =>
    id ? (people.find((p) => p.id === id)?.full_name ?? "") : "";

  const hits: SearchHit[] = [];

  for (const p of projects) {
    if (has(p.name, q) || has(p.subtitle, q) || has(p.summary, q) || has(p.code, q)) {
      hits.push({
        kind: "project",
        id: `p-${p.id}`,
        projectId: p.id,
        title: p.name,
        breadcrumb: [p.code, p.subtitle].filter(Boolean).join(" · "),
      });
    }
  }

  for (const t of tasks) {
    if (!has(t.title, q) && !has(personName(t.assignee_id), q)) continue;
    hits.push({
      kind: "task",
      id: `t-${t.id}`,
      projectId: t.project_id,
      taskId: t.id,
      title: t.title,
      breadcrumb: [projectName(t.project_id), deptName(t.department_id)]
        .filter(Boolean)
        .join(" › "),

    });
  }

  for (const d of documents) {
    if (!has(d.title, q) && !has(d.kind, q)) continue;
    hits.push({
      kind: "document",
      id: `d-${d.id}`,
      projectId: d.project_id,
      documentId: d.id,
      title: `${d.title} — v${d.current_version}`,
      breadcrumb: [projectName(d.project_id), deptName(d.department_id), d.kind]
        .filter(Boolean)
        .join(" › "),
    });
  }

  for (const c of comments) {
    if (!has(c.body, q)) continue;
    const thread = threads.find((t) => t.id === c.thread_id);
    if (!thread) continue;
    const task = thread.task_id ? tasks.find((t) => t.id === thread.task_id) : undefined;
    const doc = thread.document_id
      ? documents.find((x) => x.id === thread.document_id)
      : undefined;
    const where = task
      ? task.title
      : doc
        ? doc.title
        : thread.subject || "Production updates";
    hits.push({
      kind: "comment",
      id: `c-${c.id}`,
      projectId: thread.project_id,
      taskId: thread.task_id,
      documentId: thread.document_id,
      commentId: c.id,
      title: `${personName(c.author_id) || "A team member"} on ${where}`,
      breadcrumb: [projectName(thread.project_id), where].filter(Boolean).join(" › "),
      excerpt: snippet(c.body, 140),
    });
  }

  return hits;
}
