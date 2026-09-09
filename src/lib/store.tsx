import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import * as seed from "./production-data";
import type {
  Approval,
  ApprovalState,
  Comment,
  DiscussionThread,
  Document,
  DocumentVersion,
  Mention,
  Notification,
  Project,
  Role,
  Task,
  TaskStatus,
  ThreadContext,
} from "./production-data";

const roleUser: Record<Role, string> = {
  admin: "per-arden",
  contributor: "per-nina",
  viewer: "per-lyle",
};

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  contributor: "Contributor",
  viewer: "Viewer",
};

export const roleDescriptions: Record<Role, string> = {
  admin: "Manages configuration and edits core timelines",
  contributor: "Updates assigned work, comments, uploads documents",
  viewer: "Read-only across every department",
};

type Store = {
  role: Role;
  setRole: (role: Role) => void;
  currentUserId: string;
  can: {
    editCoreTimeline: boolean;
    updateWork: boolean;
    comment: boolean;
    upload: boolean;
    decideApproval: boolean;
    adminConfig: boolean;
  };
  projects: Project[];
  tasks: Task[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  approvals: Approval[];
  threads: DiscussionThread[];
  comments: Comment[];
  mentions: Mention[];
  notifications: Notification[];
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  setMilestoneDate: (milestoneId: string, dueDate: string) => void;
  milestones: typeof seed.milestones;
  setPortalUrl: (projectId: string, url: string) => void;
  addDocumentVersion: (documentId: string, note: string) => void;
  recordApproval: (
    documentId: string,
    decision: Approval["decision"],
    note: string,
  ) => void;
  addComment: (threadId: string, parentCommentId: string | null, body: string) => void;
  createThread: (input: {
    projectId: string;
    contextType: ThreadContext;
    taskId?: string | null;
    documentId?: string | null;
    subject: string;
    body: string;
  }) => void;
};

const StoreContext = createContext<Store | null>(null);

let counter = 0;
const nextId = (prefix: string) => `${prefix}-new-${++counter}`;

const decisionToState: Record<Approval["decision"], ApprovalState> = {
  requested: "in_review",
  approved: "approved",
  changes_requested: "changes_requested",
  rejected: "rejected",
};

/** Resolves @mentions in a comment body into mention rows + notification rows. */
function resolveMentions(body: string, commentId: string, projectId: string, authorId: string) {
  const newMentions: Mention[] = [];
  const newNotifications: Notification[] = [];
  const author = seed.people.find((p) => p.id === authorId);
  const now = new Date().toISOString();

  for (const department of seed.departments) {
    if (!body.includes(`@${department.name}`)) continue;
    newMentions.push({
      id: nextId("mn"),
      comment_id: commentId,
      person_id: null,
      department_id: department.id,
    });
    // A department mention reaches the designated owner and any leads — never the whole roster.
    for (const recipient of [department.owner_id, ...department.lead_ids]) {
      newNotifications.push({
        id: nextId("ntf"),
        project_id: projectId,
        recipient_id: recipient,
        kind: "mention",
        summary: `${author?.full_name ?? "Someone"} mentioned ${department.name}`,
        created_at: now,
        read: false,
      });
    }
  }

  for (const person of seed.people) {
    if (!body.includes(`@${person.full_name}`)) continue;
    newMentions.push({
      id: nextId("mn"),
      comment_id: commentId,
      person_id: person.id,
      department_id: null,
    });
    newNotifications.push({
      id: nextId("ntf"),
      project_id: projectId,
      recipient_id: person.id,
      kind: "mention",
      summary: `${author?.full_name ?? "Someone"} mentioned you`,
      created_at: now,
      read: false,
    });
  }

  return { newMentions, newNotifications };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [projects, setProjects] = useState(seed.projects);
  const [tasks, setTasks] = useState(seed.tasks);
  const [milestones, setMilestones] = useState(seed.milestones);
  const [documents, setDocuments] = useState(seed.documents);
  const [documentVersions, setDocumentVersions] = useState(seed.documentVersions);
  const [approvals, setApprovals] = useState(seed.approvals);
  const [threads, setThreads] = useState(seed.discussionThreads);
  const [comments, setComments] = useState(seed.comments);
  const [mentions, setMentions] = useState(seed.mentions);
  const [notifications, setNotifications] = useState(seed.notifications);

  const currentUserId = roleUser[role];

  const setTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  }, []);

  const setMilestoneDate = useCallback((milestoneId: string, dueDate: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, due_date: dueDate } : m)),
    );
  }, []);

  const setPortalUrl = useCallback((projectId: string, url: string) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, portal_url: url } : p)));
  }, []);

  const addDocumentVersion = useCallback(
    (documentId: string, note: string) => {
      setDocuments((prevDocs) => {
        const doc = prevDocs.find((d) => d.id === documentId);
        if (!doc) return prevDocs;
        const version = doc.current_version + 1;
        setDocumentVersions((prev) => [
          ...prev,
          {
            id: nextId("dv"),
            document_id: documentId,
            version,
            uploaded_by_id: currentUserId,
            uploaded_at: new Date().toISOString().slice(0, 10),
            note: note || "New version uploaded",
            file_label: `${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${version}.pdf`,
          },
        ]);
        return prevDocs.map((d) =>
          d.id === documentId
            ? {
                ...d,
                current_version: version,
                approval_state: "draft" as ApprovalState,
                updated_at: new Date().toISOString().slice(0, 10),
              }
            : d,
        );
      });
    },
    [currentUserId],
  );

  const recordApproval = useCallback(
    (documentId: string, decision: Approval["decision"], note: string) => {
      setDocuments((prevDocs) => {
        const doc = prevDocs.find((d) => d.id === documentId);
        if (!doc) return prevDocs;
        setApprovals((prev) => [
          ...prev,
          {
            id: nextId("apr"),
            document_id: documentId,
            version: doc.current_version,
            decision,
            actor_id: currentUserId,
            created_at: new Date().toISOString().slice(0, 10),
            note,
          },
        ]);
        setNotifications((prev) => [
          {
            id: nextId("ntf"),
            project_id: doc.project_id,
            recipient_id: doc.owner_id,
            kind: "approval",
            summary: `${doc.title} v${doc.current_version}: ${decision.replace("_", " ")}`,
            created_at: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
        return prevDocs.map((d) =>
          d.id === documentId ? { ...d, approval_state: decisionToState[decision] } : d,
        );
      });
    },
    [currentUserId],
  );

  const addComment = useCallback(
    (threadId: string, parentCommentId: string | null, body: string) => {
      const id = nextId("cmt");
      const thread = threads.find((t) => t.id === threadId);
      setComments((prev) => [
        ...prev,
        {
          id,
          thread_id: threadId,
          parent_comment_id: parentCommentId,
          author_id: currentUserId,
          body,
          created_at: new Date().toISOString(),
        },
      ]);
      if (thread) {
        const { newMentions, newNotifications } = resolveMentions(
          body,
          id,
          thread.project_id,
          currentUserId,
        );
        if (newMentions.length) setMentions((prev) => [...prev, ...newMentions]);
        if (newNotifications.length)
          setNotifications((prev) => [...newNotifications, ...prev]);
      }
    },
    [currentUserId, threads],
  );

  const createThread = useCallback<Store["createThread"]>(
    ({ projectId, contextType, taskId = null, documentId = null, subject, body }) => {
      const threadId = nextId("thr");
      const commentId = nextId("cmt");
      setThreads((prev) => [
        ...prev,
        {
          id: threadId,
          project_id: projectId,
          context_type: contextType,
          task_id: taskId,
          document_id: documentId,
          subject,
          created_by_id: currentUserId,
          created_at: new Date().toISOString().slice(0, 10),
        },
      ]);
      setComments((prev) => [
        ...prev,
        {
          id: commentId,
          thread_id: threadId,
          parent_comment_id: null,
          author_id: currentUserId,
          body,
          created_at: new Date().toISOString(),
        },
      ]);
      const { newMentions, newNotifications } = resolveMentions(
        body,
        commentId,
        projectId,
        currentUserId,
      );
      if (newMentions.length) setMentions((prev) => [...prev, ...newMentions]);
      if (newNotifications.length) setNotifications((prev) => [...newNotifications, ...prev]);
    },
    [currentUserId],
  );

  const value = useMemo<Store>(
    () => ({
      role,
      setRole,
      currentUserId,
      can: {
        editCoreTimeline: role === "admin",
        adminConfig: role === "admin",
        updateWork: role !== "viewer",
        comment: role !== "viewer",
        upload: role !== "viewer",
        decideApproval: role !== "viewer",
      },
      projects,
      tasks,
      milestones,
      documents,
      documentVersions,
      approvals,
      threads,
      comments,
      mentions,
      notifications,
      setTaskStatus,
      setMilestoneDate,
      setPortalUrl,
      addDocumentVersion,
      recordApproval,
      addComment,
      createThread,
    }),
    [
      role,
      currentUserId,
      projects,
      tasks,
      milestones,
      documents,
      documentVersions,
      approvals,
      threads,
      comments,
      mentions,
      notifications,
      setTaskStatus,
      setMilestoneDate,
      setPortalUrl,
      addDocumentVersion,
      recordApproval,
      addComment,
      createThread,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

export const departments = seed.departments;
export const people = seed.people;
export const projectDepartments = seed.projectDepartments;
export const taskDependencies = seed.taskDependencies;
export const auditLog = seed.auditLog;

export const personById = (id: string) => seed.people.find((p) => p.id === id);
export const departmentById = (id: string) => seed.departments.find((d) => d.id === id);
