import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

import {
  loadProductionData,
  writeApproval,
  writeComment,
  writeDocumentVersion,
  writeMilestoneDate,
  writePortalUrl,
  writeTaskStatus,
  writeThread,
  type Approval,
  type AuditEntry,
  type Comment,
  type Department,
  type DiscussionThread,
  type Document,
  type DocumentVersion,
  type Mention,
  type Milestone,
  type Notification,
  type Person,
  type ProductionData,
  type Project,
  type ProjectDepartment,
  type Role,
  type Task,
  type TaskDependency,
  type TaskStatus,
  type ThreadContext,
} from "./production-data";

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
  milestones: Milestone[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  approvals: Approval[];
  threads: DiscussionThread[];
  comments: Comment[];
  mentions: Mention[];
  notifications: Notification[];
  saving: boolean;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  setMilestoneDate: (milestoneId: string, dueDate: string) => void;
  setPortalUrl: (projectId: string, url: string) => void;
  addDocumentVersion: (documentId: string, note: string) => void;
  recordApproval: (documentId: string, decision: Approval["decision"], note: string) => void;
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

/**
 * Reference data the screens import directly. These are live bindings kept in
 * sync with the database read; children only render once the first read lands.
 */
export let departments: Department[] = [];
export let people: Person[] = [];
export let projectDepartments: ProjectDepartment[] = [];
export let taskDependencies: TaskDependency[] = [];
export let auditLog: AuditEntry[] = [];

export const personById = (id: string) => people.find((p) => p.id === id);
export const departmentById = (id: string) => departments.find((d) => d.id === id);

function applyReferenceData(data: ProductionData) {
  departments = data.departments;
  people = data.people;
  projectDepartments = data.projectDepartments;
  taskDependencies = data.taskDependencies;
  auditLog = data.auditLog;
}

function personForRole(roster: Person[], role: Role): string {
  return (roster.find((p) => p.role === role) ?? roster[0])?.id ?? "";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [data, setData] = useState<ProductionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentUserIdRef = useRef("");

  const refresh = useCallback(async () => {
    const next = await loadProductionData();
    applyReferenceData(next);
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadProductionData()
      .then((next) => {
        if (cancelled) return;
        applyReferenceData(next);
        setData(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUserId = data ? personForRole(data.people, role) : "";
  currentUserIdRef.current = currentUserId;

  const run = useCallback(
    (work: () => Promise<unknown>) => {
      setSaving(true);
      void work()
        .then(() => refresh())
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "That change could not be saved.");
        })
        .finally(() => setSaving(false));
    },
    [refresh],
  );

  const setTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : prev,
      );
      run(() => writeTaskStatus(taskId, status, currentUserIdRef.current));
    },
    [run],
  );

  const setMilestoneDate = useCallback(
    (milestoneId: string, dueDate: string) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              milestones: prev.milestones.map((m) =>
                m.id === milestoneId ? { ...m, due_date: dueDate } : m,
              ),
            }
          : prev,
      );
      run(() => writeMilestoneDate(milestoneId, dueDate, currentUserIdRef.current));
    },
    [run],
  );

  const setPortalUrl = useCallback(
    (projectId: string, url: string) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              projects: prev.projects.map((p) =>
                p.id === projectId ? { ...p, portal_url: url } : p,
              ),
            }
          : prev,
      );
      run(() => writePortalUrl(projectId, url, currentUserIdRef.current));
    },
    [run],
  );

  const addDocumentVersion = useCallback(
    (documentId: string, note: string) => {
      const doc = data?.documents.find((d) => d.id === documentId);
      if (!doc) return;
      run(() =>
        writeDocumentVersion(
          documentId,
          doc.title,
          doc.current_version + 1,
          note,
          currentUserIdRef.current,
        ),
      );
    },
    [data, run],
  );

  const recordApproval = useCallback(
    (documentId: string, decision: Approval["decision"], note: string) => {
      const doc = data?.documents.find((d) => d.id === documentId);
      if (!doc) return;
      run(() =>
        writeApproval(
          documentId,
          decision,
          note,
          currentUserIdRef.current,
          doc.owner_id,
          doc.project_id,
        ),
      );
    },
    [data, run],
  );

  const addComment = useCallback(
    (threadId: string, _parentCommentId: string | null, body: string) => {
      const thread = data?.discussionThreads.find((t) => t.id === threadId);
      if (!thread) return;
      run(() =>
        writeComment({
          threadId,
          body,
          authorId: currentUserIdRef.current,
          projectId: thread.project_id,
          sourceEntityType: thread.context_type,
          sourceEntityId: thread.task_id ?? thread.document_id ?? thread.project_id,
          departments: data?.departments ?? [],
          people: data?.people ?? [],
        }),
      );
    },
    [data, run],
  );

  const createThread = useCallback<Store["createThread"]>(
    ({ projectId, contextType, taskId = null, documentId = null, subject, body }) => {
      run(() =>
        writeThread({
          projectId,
          contextType,
          taskId,
          documentId,
          subject,
          body,
          authorId: currentUserIdRef.current,
          departments: data?.departments ?? [],
          people: data?.people ?? [],
        }),
      );
    },
    [data, run],
  );

  const value = useMemo<Store | null>(
    () =>
      data
        ? {
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
            projects: data.projects,
            tasks: data.tasks,
            milestones: data.milestones,
            documents: data.documents,
            documentVersions: data.documentVersions,
            approvals: data.approvals,
            threads: data.discussionThreads,
            comments: data.comments,
            mentions: data.mentions,
            notifications: data.notifications,
            saving,
            setTaskStatus,
            setMilestoneDate,
            setPortalUrl,
            addDocumentVersion,
            recordApproval,
            addComment,
            createThread,
          }
        : null,
    [
      role,
      currentUserId,
      data,
      saving,
      setTaskStatus,
      setMilestoneDate,
      setPortalUrl,
      addDocumentVersion,
      recordApproval,
      addComment,
      createThread,
    ],
  );

  if (error && !value) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">The production data could not be loaded</h1>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-ink-soft">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Loading the production portfolio…
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
