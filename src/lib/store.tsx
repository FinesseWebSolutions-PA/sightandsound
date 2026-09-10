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
  previewTaskReschedule,
  writeApproval,
  writeComment,
  writeDocumentVersion,
  writeMilestoneDate,
  writeNotificationRead,
  writePortalUrl,
  writeTaskDates,
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
  type ReschedulePreviewRow,
  type Role,
  type Scene,
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
  /** A closed production is an archive: browsable by everyone, editable by no one. */
  isClosed: (projectId: string) => boolean;
  projects: Project[];
  scenes: Scene[];
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
  /** Moves a work item's planned dates; the database recomputes the rest. */
  setTaskDates: (taskId: string, startDate: string, dueDate: string) => void;
  /** Read-only "what would this do?" check, straight from the database. */
  previewReschedule: (
    taskId: string,
    startDate: string,
    dueDate: string,
  ) => Promise<ReschedulePreviewRow[]>;
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
  /** Personal Inbox read state; works on any production, closed ones included. */
  markNotifications: (ids: string[], read: boolean) => void;
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

const ROLE_KEY = "ss-demo-role";
const isRole = (v: string | null): v is Role =>
  v === "admin" || v === "contributor" || v === "viewer";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("admin");
  const [data, setData] = useState<ProductionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentUserIdRef = useRef("");

  // Read after hydration so the server and the first client render agree.
  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (isRole(stored)) setRoleState(stored);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(ROLE_KEY, next);
  }, []);

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

  const dataRef = useRef<ProductionData | null>(null);
  dataRef.current = data;
  const roleRef = useRef<Role>(role);
  roleRef.current = role;

  const isClosed = useCallback(
    (projectId: string) =>
      dataRef.current?.projects.find((p) => p.id === projectId)?.status === "closed",
    [],
  );

  /**
   * Server-side of the permission story: even if a control were re-enabled in the
   * browser, a closed production or an insufficient role never writes.
   */
  const allowed = useCallback(
    (projectId: string | undefined, level: "contribute" | "admin") => {
      if (!projectId) return false;
      if (isClosed(projectId)) return false;
      if (level === "admin") return roleRef.current === "admin";
      return roleRef.current !== "viewer";
    },
    [isClosed],
  );

  const projectOfTask = (taskId: string) =>
    dataRef.current?.tasks.find((t) => t.id === taskId)?.project_id;
  const projectOfMilestone = (milestoneId: string) =>
    dataRef.current?.milestones.find((m) => m.id === milestoneId)?.project_id;
  const projectOfDocument = (documentId: string) =>
    dataRef.current?.documents.find((d) => d.id === documentId)?.project_id;
  const projectOfThread = (threadId: string) =>
    dataRef.current?.discussionThreads.find((t) => t.id === threadId)?.project_id;

  const run = useCallback(
    (work: () => Promise<unknown>) => {
      setSaving(true);
      void work()
        .then(() => refresh())
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "That change could not be saved.");
          // Drop any optimistic edit that did not land.
          void refresh().catch(() => undefined);
        })
        .finally(() => setSaving(false));
    },
    [refresh],
  );

  const setTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      if (!allowed(projectOfTask(taskId), "contribute")) return;
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : prev,
      );
      run(() => writeTaskStatus(taskId, status, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const setTaskDates = useCallback(
    (taskId: string, startDate: string, dueDate: string) => {
      if (!allowed(projectOfTask(taskId), "admin")) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, start_date: startDate, due_date: dueDate } : t,
              ),
            }
          : prev,
      );
      run(() => writeTaskDates(taskId, startDate, dueDate, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const previewReschedule = useCallback(
    (taskId: string, startDate: string, dueDate: string) =>
      previewTaskReschedule(taskId, startDate, dueDate),
    [],
  );

  const setMilestoneDate = useCallback(
    (milestoneId: string, dueDate: string) => {
      if (!allowed(projectOfMilestone(milestoneId), "admin")) return;
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
    [allowed, run],
  );

  const setPortalUrl = useCallback(
    (projectId: string, url: string) => {
      if (!allowed(projectId, "admin")) return;
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
    [allowed, run],
  );

  const addDocumentVersion = useCallback(
    (documentId: string, note: string) => {
      const doc = data?.documents.find((d) => d.id === documentId);
      if (!doc || !allowed(doc.project_id, "contribute")) return;
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
    [allowed, data, run],
  );

  const recordApproval = useCallback(
    (documentId: string, decision: Approval["decision"], note: string) => {
      const doc = data?.documents.find((d) => d.id === documentId);
      if (!doc || !allowed(projectOfDocument(documentId), "contribute")) return;
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
    [allowed, data, run],
  );

  const addComment = useCallback(
    (threadId: string, _parentCommentId: string | null, body: string) => {
      const thread = data?.discussionThreads.find((t) => t.id === threadId);
      if (!thread || !allowed(projectOfThread(threadId), "contribute")) return;
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
    [allowed, data, run],
  );

  const createThread = useCallback<Store["createThread"]>(
    ({ projectId, contextType, taskId = null, documentId = null, subject, body }) => {
      if (!allowed(projectId, "contribute")) return;
      // The table requires the id that matches the context, so refuse an unanchored thread.
      if (contextType === "task" && !taskId) return;
      if (contextType === "document" && !documentId) return;
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
    [allowed, data, run],
  );

  const markNotifications = useCallback(
    (ids: string[], read: boolean) => {
      if (ids.length === 0) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                ids.includes(n.id) ? { ...n, read } : n,
              ),
            }
          : prev,
      );
      run(() => writeNotificationRead(ids, read));
    },
    [run],
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
            isClosed: (projectId: string) => isClosed(projectId) === true,
            projects: data.projects,
            scenes: data.scenes,
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
            setTaskDates,
            previewReschedule,
            setMilestoneDate,
            setPortalUrl,
            addDocumentVersion,
            recordApproval,
            addComment,
            createThread,
            markNotifications,
          }
        : null,
    [
      role,
      setRole,
      isClosed,

      currentUserId,
      data,
      saving,
      setTaskStatus,
      setTaskDates,
      previewReschedule,
      setMilestoneDate,
      setPortalUrl,
      addDocumentVersion,
      recordApproval,
      addComment,
      createThread,
      markNotifications,
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

  return (
    <StoreContext.Provider value={value}>
      {error && (
        <div
          role="alert"
          className="border-b border-border bg-[var(--ss-danger-bg,#FCE8E6)] px-6 py-2 text-sm text-ink"
        >
          <span className="font-semibold">That change was not saved.</span> {error}{" "}
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
