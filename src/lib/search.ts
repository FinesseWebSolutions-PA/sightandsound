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
import { snippet } from "./threads.ts";

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

const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Match every query word across an item's content and context, so searches such
 * as a department plus a team member work without requiring an exact phrase.
 */
export function searchAll(sources: Sources, query: string): SearchHit[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const matches = (...fields: (string | null | undefined)[]) => {
    const text = normalize(fields.filter(Boolean).join(" "));
    return words.every((word) => text.includes(word));
  };

  const { projects, tasks, documents, milestones, departments, people, threads, comments } = sources;
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const departmentMap = new Map(departments.map((department) => [department.id, department]));
  const personMap = new Map(people.map((person) => [person.id, person]));
  const milestoneMap = new Map(milestones.map((milestone) => [milestone.id, milestone]));
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const documentMap = new Map(documents.map((document) => [document.id, document]));
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
  const projectName = (id: string) => projectMap.get(id)?.name ?? "Production";
  const deptName = (id: string | null) =>
    id ? (departmentMap.get(id)?.name ?? "") : "";
  const personName = (id: string | null) =>
    id ? (personMap.get(id)?.full_name ?? "") : "";

  const hits: SearchHit[] = [];

  for (const p of projects) {
    if (matches(p.name, p.subtitle, p.summary, p.code, personName(p.owner_id))) {
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
    if (!matches(t.title, t.description, personName(t.assignee_id), deptName(t.department_id), projectName(t.project_id), projectMap.get(t.project_id)?.code, milestoneMap.get(t.milestone_id)?.name)) continue;
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
    if (!matches(d.title, d.kind, d.folder, personName(d.owner_id), deptName(d.department_id), projectName(d.project_id), projectMap.get(d.project_id)?.code)) continue;
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
    const thread = threadMap.get(c.thread_id);
    if (!thread) continue;
    const task = thread.task_id ? taskMap.get(thread.task_id) : undefined;
    const doc = thread.document_id
      ? documentMap.get(thread.document_id)
      : undefined;
    const where = task
      ? task.title
      : doc
        ? doc.title
        : thread.subject || "Production updates";
    if (!matches(c.body, personName(c.author_id), where, projectName(thread.project_id))) continue;
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
