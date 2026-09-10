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
  saveAttachmentToDocs,
  uploadChatAttachment,
  writeDocumentFolder,
  writeApproval,
  writeComment,
  writeDocumentVersion,
  writeMilestoneDate,
  writeNotificationRead,
  writePortalUrl,
  writeAssignment,
  writeAssignmentJobTitle,
  removeAssignment,
  writeDepartmentOnProject,
  writeProjectDepartmentHead,
  writePersonRole,
  writePersonDepartment,
  writeDepartmentOwner,
  writeJobTitlePreset,
  removeJobTitlePreset,
  writeTaskDates,
  writeTaskStatus,
  writeTask,
  removeTask,
  writeTaskDependency,
  removeTaskDependency,
  writeProduction,
  writeThread,
  type DependencyType,
  type WorkItemInput,
  type NewProductionInput,
  type Approval,
  type AuditEntry,
  type Comment,
  type CommentAttachment,
  type Department,
  type DepartmentJobTitle,
  type ProjectAssignment,
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
  type StagedAttachment,
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
  commentAttachments: CommentAttachment[];
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
  /**
   * Posts a message into an existing conversation. Chat is flat: no parent id.
   * Resolves true when the message was saved.
   */
  addComment: (
    threadId: string,
    body: string,
    attachments?: StagedAttachment[],
  ) => Promise<boolean>;
  /** Uploads a file for a conversation before the message is posted. */
  uploadAttachment: (
    file: File,
    projectId: string,
    threadKey: string,
  ) => Promise<StagedAttachment>;
  /** Files a shared file into the production's documents, inside a folder. */
  saveAttachmentToDocuments: (input: {
    attachmentId: string;
    folder: string;
    title: string;
  }) => Promise<void>;
  setDocumentFolder: (documentId: string, folder: string) => void;
  createThread: (input: {
    projectId: string;
    contextType: ThreadContext;
    taskId?: string | null;
    documentId?: string | null;
    subject: string;
    body: string;
    attachments?: StagedAttachment[];
  }) => Promise<boolean>;
  /** Personal Inbox read state; works on any production, closed ones included. */
  markNotifications: (ids: string[], read: boolean) => void;
  projectAssignments: ProjectAssignment[];
  departmentJobTitles: DepartmentJobTitle[];
  /** Staffing: put a department on a production, or take it off. */
  setDepartmentOnProject: (projectId: string, departmentId: string, on: boolean) => void;
  assignPerson: (input: {
    projectId: string;
    personId: string;
    departmentId: string;
    jobTitle: string;
  }) => void;
  setAssignmentJobTitle: (assignmentId: string, projectId: string, jobTitle: string) => void;
  unassignPerson: (assignmentId: string, projectId: string) => void;
  setDepartmentHead: (projectId: string, departmentId: string, personId: string) => void;
  /** Global defaults, admin only. */
  setPersonRole: (personId: string, role: Role) => void;
  setPersonDepartment: (personId: string, departmentId: string, isLead: boolean) => void;
  setDepartmentOwner: (departmentId: string, personId: string) => void;
  addJobTitlePreset: (departmentId: string, title: string) => void;
  deleteJobTitlePreset: (id: string, departmentId: string) => void;
  /** Creates or edits a work item. Resolves false when the save did not land. */
  saveWorkItem: (input: Omit<WorkItemInput, "actorId">) => Promise<boolean>;
  deleteWorkItem: (taskId: string, projectId: string) => Promise<boolean>;
  addDependency: (input: {
    taskId: string;
    dependsOnTaskId: string;
    type: DependencyType;
    lagHours: number;
    hardConstraint: boolean;
    projectId: string;
  }) => Promise<boolean>;
  removeDependency: (id: string, taskId: string, projectId: string) => Promise<boolean>;
  /** Starts a new production. Admin only; resolves the new production's id. */
  createProduction: (input: Omit<NewProductionInput, "actorId">) => Promise<string | null>;
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
export let projectAssignments: ProjectAssignment[] = [];
export let departmentJobTitles: DepartmentJobTitle[] = [];

export const personById = (id: string) => people.find((p) => p.id === id);
export const departmentById = (id: string) => departments.find((d) => d.id === id);

function applyReferenceData(data: ProductionData) {
  departments = data.departments;
  people = data.people;
  projectDepartments = data.projectDepartments;
  taskDependencies = data.taskDependencies;
  auditLog = data.auditLog;
  projectAssignments = data.projectAssignments;
  departmentJobTitles = data.departmentJobTitles;
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

  /** Awaitable save: reports back whether the change actually landed. */
  const runAsync = useCallback(
    async (work: () => Promise<unknown>): Promise<boolean> => {
      setSaving(true);
      try {
        await work();
        await refresh();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That change could not be saved.");
        // Drop any optimistic edit that did not land.
        await refresh().catch(() => undefined);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const run = useCallback(
    (work: () => Promise<unknown>) => {
      void runAsync(work);
    },
    [runAsync],
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

  const addComment = useCallback<Store["addComment"]>(
    async (threadId, body, attachments) => {
      const thread = dataRef.current?.discussionThreads.find((t) => t.id === threadId);
      if (!thread || !allowed(projectOfThread(threadId), "contribute")) return false;
      if (!body.trim() && !(attachments && attachments.length > 0)) return false;
      return await runAsync(() =>
        writeComment({
          threadId,
          body,
          authorId: currentUserIdRef.current,
          projectId: thread.project_id,
          sourceEntityType: thread.context_type,
          sourceEntityId: thread.task_id ?? thread.document_id ?? thread.project_id,
          departments: dataRef.current?.departments ?? [],
          people: dataRef.current?.people ?? [],
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        }),
      );
    },
    [allowed, runAsync],
  );

  const createThread = useCallback<Store["createThread"]>(
    async ({
      projectId,
      contextType,
      taskId = null,
      documentId = null,
      subject,
      body,
      attachments,
    }) => {
      if (!allowed(projectId, "contribute")) return false;
      // The table requires the id that matches the context, so refuse an unanchored thread.
      if (contextType === "task" && !taskId) return false;
      if (contextType === "document" && !documentId) return false;
      if (!body.trim() && !(attachments && attachments.length > 0)) return false;
      // One conversation per work item / document: if one exists already, this
      // message joins it instead of starting a second one.
      const existing = dataRef.current?.discussionThreads.find(
        (t) =>
          t.project_id === projectId &&
          t.context_type === contextType &&
          (contextType === "task"
            ? t.task_id === taskId
            : contextType === "document"
              ? t.document_id === documentId
              : false),
      );
      if (existing) {
        return await addComment(existing.id, body, attachments);
      }
      return await runAsync(() =>
        writeThread({
          projectId,
          contextType,
          taskId,
          documentId,
          subject,
          body,
          authorId: currentUserIdRef.current,
          departments: dataRef.current?.departments ?? [],
          people: dataRef.current?.people ?? [],
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        }),
      );
    },
    [addComment, allowed, runAsync],
  );

  const uploadAttachment = useCallback(
    (file: File, projectId: string, threadKey: string) =>
      uploadChatAttachment(file, projectId, threadKey),
    [],
  );

  const saveAttachmentToDocuments = useCallback(
    async ({
      attachmentId,
      folder,
      title,
    }: {
      attachmentId: string;
      folder: string;
      title: string;
    }) => {
      const current = dataRef.current;
      const attachment = current?.commentAttachments.find((a) => a.id === attachmentId);
      if (!current || !attachment || attachment.saved_document_id) return;
      const comment = current.comments.find((c) => c.id === attachment.comment_id);
      const thread = current.discussionThreads.find((t) => t.id === comment?.thread_id);
      if (!thread || !allowed(thread.project_id, "contribute")) return;
      setSaving(true);
      try {
        await saveAttachmentToDocs({
          attachmentId,
          storageKey: attachment.storage_key,
          fileName: attachment.file_name,
          projectId: thread.project_id,
          taskId: thread.task_id ?? null,
          folder,
          title,
          actorId: currentUserIdRef.current,
        });
        await refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That file could not be saved to documents.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [allowed, refresh],
  );

  const setDocumentFolder = useCallback(
    (documentId: string, folder: string) => {
      if (!allowed(projectOfDocument(documentId), "contribute")) return;
      run(() => writeDocumentFolder(documentId, folder, currentUserIdRef.current));
    },
    [allowed, run],
  );

  /* ------------------------------------------------------------- staffing */

  const adminGlobal = () => roleRef.current === "admin";

  const setDepartmentOnProject = useCallback(
    (projectId: string, departmentId: string, on: boolean) => {
      if (!allowed(projectId, "admin")) return;
      run(() =>
        writeDepartmentOnProject(projectId, departmentId, on, currentUserIdRef.current),
      );
    },
    [allowed, run],
  );

  const assignPerson = useCallback<Store["assignPerson"]>(
    ({ projectId, personId, departmentId, jobTitle }) => {
      if (!allowed(projectId, "admin") || !personId || !departmentId) return;
      run(() =>
        writeAssignment({
          projectId,
          personId,
          departmentId,
          jobTitle,
          actorId: currentUserIdRef.current,
        }),
      );
    },
    [allowed, run],
  );

  const setAssignmentJobTitle = useCallback(
    (assignmentId: string, projectId: string, jobTitle: string) => {
      if (!allowed(projectId, "admin")) return;
      run(() =>
        writeAssignmentJobTitle(assignmentId, projectId, jobTitle, currentUserIdRef.current),
      );
    },
    [allowed, run],
  );

  const unassignPerson = useCallback(
    (assignmentId: string, projectId: string) => {
      if (!allowed(projectId, "admin")) return;
      run(() => removeAssignment(assignmentId, projectId, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const setDepartmentHead = useCallback(
    (projectId: string, departmentId: string, personId: string) => {
      if (!allowed(projectId, "admin")) return;
      run(() =>
        writeProjectDepartmentHead(projectId, departmentId, personId, currentUserIdRef.current),
      );
    },
    [allowed, run],
  );

  const setPersonRole = useCallback(
    (personId: string, role: Role) => {
      if (!adminGlobal()) return;
      run(() => writePersonRole(personId, role, currentUserIdRef.current));
    },
    [run],
  );

  const setPersonDepartment = useCallback(
    (personId: string, departmentId: string, isLead: boolean) => {
      if (!adminGlobal()) return;
      run(() => writePersonDepartment(personId, departmentId, isLead, currentUserIdRef.current));
    },
    [run],
  );

  const setDepartmentOwner = useCallback(
    (departmentId: string, personId: string) => {
      if (!adminGlobal()) return;
      run(() => writeDepartmentOwner(departmentId, personId, currentUserIdRef.current));
    },
    [run],
  );

  const addJobTitlePreset = useCallback(
    (departmentId: string, title: string) => {
      if (!adminGlobal() || !title.trim()) return;
      const next =
        (dataRef.current?.departmentJobTitles.filter((t) => t.department_id === departmentId)
          .length ?? 0) + 1;
      run(() => writeJobTitlePreset(departmentId, title.trim(), next, currentUserIdRef.current));
    },
    [run],
  );

  const deleteJobTitlePreset = useCallback(
    (id: string, departmentId: string) => {
      if (!adminGlobal()) return;
      run(() => removeJobTitlePreset(id, departmentId, currentUserIdRef.current));
    },
    [run],
  );

  /* ---------------------------------------------------------- work items */

  const saveWorkItem = useCallback<Store["saveWorkItem"]>(
    async (input) => {
      if (!allowed(input.projectId, "admin")) return false;
      if (!input.title.trim()) return false;
      return await runAsync(() => writeTask({ ...input, actorId: currentUserIdRef.current }));
    },
    [allowed, runAsync],
  );

  const deleteWorkItem = useCallback<Store["deleteWorkItem"]>(
    async (taskId, projectId) => {
      if (!allowed(projectId, "admin")) return false;
      return await runAsync(() => removeTask(taskId, projectId, currentUserIdRef.current));
    },
    [allowed, runAsync],
  );

  const addDependency = useCallback<Store["addDependency"]>(
    async (input) => {
      if (!allowed(input.projectId, "admin")) return false;
      return await runAsync(() =>
        writeTaskDependency({ ...input, actorId: currentUserIdRef.current }),
      );
    },
    [allowed, runAsync],
  );

  const removeDependency = useCallback<Store["removeDependency"]>(
    async (id, taskId, projectId) => {
      if (!allowed(projectId, "admin")) return false;
      return await runAsync(() =>
        removeTaskDependency(id, taskId, projectId, currentUserIdRef.current),
      );
    },
    [allowed, runAsync],
  );

  const createProduction = useCallback<Store["createProduction"]>(
    async (input) => {
      if (!adminGlobal()) return null;
      if (!input.name.trim()) return null;
      setSaving(true);
      try {
        const id = await writeProduction({ ...input, actorId: currentUserIdRef.current });
        await refresh();
        return id;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That production could not be created.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
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

  const value = useMemo<Store>(
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
            commentAttachments: data.commentAttachments,
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
            uploadAttachment,
            saveAttachmentToDocuments,
            setDocumentFolder,
            markNotifications,
            projectAssignments: data.projectAssignments,
            departmentJobTitles: data.departmentJobTitles,
            setDepartmentOnProject,
            assignPerson,
            setAssignmentJobTitle,
            unassignPerson,
            setDepartmentHead,
            setPersonRole,
            setPersonDepartment,
            setDepartmentOwner,
            addJobTitlePreset,
            deleteJobTitlePreset,
            saveWorkItem,
            deleteWorkItem,
            addDependency,
            removeDependency,
            createProduction,
          }
        : {
            role,
            setRole,
            currentUserId: "",
            can: {
              editCoreTimeline: role === "admin",
              adminConfig: role === "admin",
              updateWork: role !== "viewer",
              comment: role !== "viewer",
              upload: role !== "viewer",
              decideApproval: role !== "viewer",
            },
            isClosed: () => false,
            projects: [],
            scenes: [],
            tasks: [],
            milestones: [],
            documents: [],
            documentVersions: [],
            approvals: [],
            threads: [],
            comments: [],
            commentAttachments: [],
            mentions: [],
            notifications: [],
            saving,
            setTaskStatus: () => {},
            setTaskDates: () => {},
            previewReschedule: async () => [],
            setMilestoneDate: () => {},
            setPortalUrl: () => {},
            addDocumentVersion: () => {},
            recordApproval: () => {},
            addComment: async () => false,
            uploadAttachment: async () => {
              throw new Error("Production data is still loading.");
            },
            saveAttachmentToDocuments: async () => {},
            setDocumentFolder: () => {},
            createThread: async () => false,
            markNotifications: () => {},
            projectAssignments: [],
            departmentJobTitles: [],
            setDepartmentOnProject: () => {},
            assignPerson: () => {},
            setAssignmentJobTitle: () => {},
            unassignPerson: () => {},
            setDepartmentHead: () => {},
            setPersonRole: () => {},
            setPersonDepartment: () => {},
            setDepartmentOwner: () => {},
            addJobTitlePreset: () => {},
            deleteJobTitlePreset: () => {},
            saveWorkItem: async () => false,
            deleteWorkItem: async () => false,
            addDependency: async () => false,
            removeDependency: async () => false,
            createProduction: async () => null,
          },
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
      uploadAttachment,
      saveAttachmentToDocuments,
      setDocumentFolder,
      markNotifications,
      setDepartmentOnProject,
      assignPerson,
      setAssignmentJobTitle,
      unassignPerson,
      setDepartmentHead,
      setPersonRole,
      setPersonDepartment,
      setDepartmentOwner,
      addJobTitlePreset,
      deleteJobTitlePreset,
      saveWorkItem,
      deleteWorkItem,
      addDependency,
      removeDependency,
      createProduction,
    ],
  );

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">The production data could not be loaded</h1>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
      </div>
    );
  }

  if (!data) {
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
