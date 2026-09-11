import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

import { StoreContext } from "./store-context";
export { useStore } from "./store-context";

import {
  loadProductionData,
  writeLibraryFolder,
  changeLibraryFolder,
  changeLibraryDocuments,
  writeDocumentStar,
  writeCommentEdit,
  type DocumentFolder,
  previewTaskReschedule,
  saveAttachmentToDocs,
  writeDocumentApprovalRequirement,
  uploadChatAttachment,
  writeDocumentFolder,
  writeDocumentScene,
  writeApproval,
  writeComment,
  writeDocumentVersionFile,
  writeNewDocument,
  removeDocument,
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
  writeScene,
  writeSceneName,
  writeSceneFields,
  writeSceneOrder,
  removeScene,
  writeThread,
  writeCommentReaction,
  removeCommentReaction,
  type DependencyType,
  type WorkItemInput,
  type NewProductionInput,
  type ProductionSettingsInput,
  writeProductionSettings,
  type Approval,
  type AuditEntry,
  type Comment,
  type CommentAttachment,
  type CommentReaction,
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
  type SetStatus,
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

export type Store = {
  role: Role;
  setRole: (role: Role) => void;
  setViewingPerson: (id: string) => void;
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
  documentFolders: DocumentFolder[];
  trashedDocuments: Document[];
  documentStars: { document_id: string; person_id: string }[];
  libraryAction: (projectId: string, action: () => Promise<unknown>) => Promise<boolean>;
  createFolder: (projectId: string, parentId: string | null, name: string) => Promise<boolean>;
  changeFolder: (
    id: string,
    action: string,
    name?: string,
    parentId?: string | null,
  ) => Promise<boolean>;
  changeDocuments: (
    ids: string[],
    action: "move" | "rename" | "trash" | "restore",
    value?: string | null,
  ) => Promise<boolean>;
  starDocument: (id: string, starred: boolean) => Promise<boolean>;
  editComment: (id: string, body: string) => Promise<boolean>;
  documentVersions: DocumentVersion[];
  approvals: Approval[];
  threads: DiscussionThread[];
  comments: Comment[];
  commentAttachments: CommentAttachment[];
  commentReactions: CommentReaction[];
  mentions: Mention[];
  notifications: Notification[];
  saving: boolean;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  /** Documents attached to a work item that are still waiting on approval. */
  unapprovedDocuments: (taskId: string) => Document[];
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
  addDocumentVersion: (documentId: string, file: File, note: string) => Promise<boolean>;
  /** Uploads a file straight into the documents list, filed where you are. */
  uploadDocument: (input: {
    projectId: string;
    file: File;
    folder: string | null;
    folderId?: string | null;
    sceneId: string | null;
    /** Attaches the file to one work item, so it shows on that task. */
    taskId?: string | null;
    requiresApproval: boolean;
  }) => Promise<boolean>;
  recordApproval: (
    documentId: string,
    decision: Approval["decision"],
    note: string,
    versionId: string,
    reviewerId?: string,
    dueDate?: string,
  ) => Promise<boolean>;
  /**
   * Posts a message into an existing conversation. Chat is flat: no parent id.
   * Resolves true when the message was saved.
   */
  addComment: (
    threadId: string,
    body: string,
    attachments?: StagedAttachment[],
    replyToId?: string | null,
  ) => Promise<boolean>;
  /** Adds or removes an emoji reaction to a chat message. */
  toggleReaction: (commentId: string, emoji: string) => Promise<boolean>;
  /** Uploads a file for a conversation before the message is posted. */
  uploadAttachment: (file: File, projectId: string, threadKey: string) => Promise<StagedAttachment>;
  /** Files a shared file into the production's documents, inside a folder. */
  saveAttachmentToDocuments: (input: {
    attachmentId: string;
    folder: string;
    title: string;
    requiresApproval: boolean;
  }) => Promise<void>;
  /** Turns the approval requirement for one document on or off. */
  setDocumentApprovalRequirement: (documentId: string, requiresApproval: boolean) => void;
  setDocumentFolder: (documentId: string, folder: string) => void;
  setDocumentSet: (documentId: string, sceneId: string | null) => void;
  deleteDocument: (documentId: string) => void;
  createThread: (input: {
    projectId: string;
    contextType: ThreadContext;
    taskId?: string | null;
    documentId?: string | null;
    sceneId?: string | null;
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
    /** Leave out for the production's default team; pass a set id to staff that set. */
    sceneId?: string | null;
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
  /** Sets: the unit of work inside a production. Admin only, open productions. */
  createScene: (projectId: string, name: string, portalUrl?: string) => Promise<string | null>;
  renameScene: (sceneId: string, projectId: string, name: string) => void;
  deleteScene: (sceneId: string, projectId: string) => Promise<boolean>;
  /** Lead, status, committed dates, and which set this one follows. */
  updateScene: (
    sceneId: string,
    projectId: string,
    fields: {
      owner_id?: string | null;
      status?: SetStatus;
      start_date?: string | null;
      due_date?: string | null;
      depends_on_scene_id?: string | null;
      lag_days?: number;
      portal_link_url?: string | null;
    },
  ) => Promise<boolean>;
  /** Swaps a set with its neighbour in the running order. */
  reorderScene: (sceneId: string, neighbourId: string, projectId: string) => Promise<boolean>;
  /** Starts a production and reports whether refreshed data is ready for navigation. */
  createProduction: (input: Omit<NewProductionInput, "actorId">) => Promise<{
    id: string;
    refreshed: boolean;
  } | null>;
  /** Edits a production's own settings. Admin only; closed ones can be reopened. */
  updateProduction: (projectId: string, input: ProductionSettingsInput) => Promise<boolean>;
};

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
  const [viewingPerson, setViewingPersonState] = useState("");
  const [data, setData] = useState<ProductionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSaves, setPendingSaves] = useState(0);
  const saving = pendingSaves > 0;
  // One completed request must not unlock controls while another is still saving.
  const setSaving = useCallback((active: boolean) => {
    setPendingSaves((count) => Math.max(0, count + (active ? 1 : -1)));
    if (active) setError(null);
  }, []);
  const latestRefresh = useRef(0);
  const currentUserIdRef = useRef("");

  // Read after hydration so the server and the first client render agree.
  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (isRole(stored)) setRoleState(stored);
    setViewingPersonState(window.localStorage.getItem("ss-demo-person") ?? "");
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    setViewingPersonState("");
    window.localStorage.removeItem("ss-demo-person");
    window.localStorage.setItem(ROLE_KEY, next);
  }, []);

  const refresh = useCallback(async (refreshTables?: string[]) => {
    const request = ++latestRefresh.current;
    const next = await loadProductionData(refreshTables ? { refreshTables } : undefined);
    if (request === latestRefresh.current) {
      applyReferenceData(next);
      setData(next);
    }
    return next;
  }, []);

  const retryLoad = useCallback(async () => {
    setError(null);
    try {
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load the data.");
    }
  }, [refresh]);

  // A failed read after a successful write must not encourage duplicate submissions.
  const refreshAfterSave = useCallback(async (): Promise<boolean> => {
    const request = latestRefresh.current + 1;
    try {
      await refresh();
      // A newer read may have superseded this one without applying its result.
      return request === latestRefresh.current;
    } catch {
      setError(
        "Your change was saved, but the latest data could not be loaded. Try refreshing the data.",
      );
      return false;
    }
  }, [refresh]);

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

  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      busy = false,
      queued = false;
    const changed = new Set<string>();
    const update = async () => {
      if (stopped || document.hidden) return;
      if (busy) {
        queued = true;
        return;
      }
      busy = true;
      try {
        const tables = [...changed];
        changed.clear();
        await refresh(tables.length ? tables : undefined);
      } catch {
        /* Keep readable data while reconnecting. */
      } finally {
        busy = false;
        if (queued && !stopped) {
          queued = false;
          schedule();
        }
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void update(), 350);
    };
    let channel = supabase.channel("production-collaboration");
    for (const table of [
      "comments",
      "discussion_threads",
      "comment_reactions",
      "comment_attachments",
      "documents",
      "document_versions",
      "approvals",
      "document_folders",
      "document_stars",
      "notifications",
      "tasks",
      "scenes",
      "project_assignments",
      "people",
      "projects",
    ]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        changed.add(table);
        schedule();
      });
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") schedule();
    });
    const onFocus = () => schedule();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const recovery = setInterval(() => {
      changed.clear();
      void update();
    }, 60000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(recovery);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const currentUserId = data
    ? (data.people.find((p) => p.id === viewingPerson && p.role === role)?.id ??
      personForRole(data.people, role))
    : "";
  const setViewingPerson = useCallback(
    (id: string) => {
      const person = data?.people.find((p) => p.id === id);
      if (!person) return;
      setViewingPersonState(id);
      setRoleState(person.role);
      window.localStorage.setItem("ss-demo-person", id);
      window.localStorage.setItem(ROLE_KEY, person.role);
    },
    [data],
  );
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
   * Shared demo-role guard for every screen. This is a client-side prototype
   * control; real user authorization must be enforced by the database.
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
        await refreshAfterSave();
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
    [refresh, refreshAfterSave, setSaving],
  );

  const run = useCallback(
    (work: () => Promise<unknown>) => {
      void runAsync(work);
    },
    [runAsync],
  );

  /**
   * A work item cannot be finished while paperwork attached to it is still
   * waiting on a decision. Kept here so every screen agrees on the rule.
   */
  const unapprovedDocuments = useCallback(
    (taskId: string) =>
      (dataRef.current?.documents ?? []).filter(
        (d) => d.task_id === taskId && d.requires_approval && d.approval_state !== "approved",
      ),
    [],
  );

  const setTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      if (!allowed(projectOfTask(taskId), "contribute")) return;
      if (status === "complete") {
        const pending = unapprovedDocuments(taskId);
        if (pending.length > 0) {
          setError(
            `This work item still has ${pending.length} document${
              pending.length === 1 ? "" : "s"
            } waiting on approval, so it cannot be marked complete yet: ${pending
              .map((d) => d.title)
              .join(", ")}.`,
          );
          return;
        }
      }
      setData((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : prev,
      );
      run(() => writeTaskStatus(taskId, status, currentUserIdRef.current));
    },
    [allowed, run, unapprovedDocuments],
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
    async (documentId: string, file: File, note: string): Promise<boolean> => {
      const doc = dataRef.current?.documents.find((d) => d.id === documentId);
      if (!doc || !allowed(doc.project_id, "contribute")) return false;
      return await runAsync(() =>
        writeDocumentVersionFile(documentId, file, note, currentUserIdRef.current),
      );
    },
    [allowed, runAsync],
  );

  const uploadDocument = useCallback(
    async (input: {
      projectId: string;
      file: File;
      folder: string | null;
      folderId?: string | null;
      sceneId: string | null;
      taskId?: string | null;
      requiresApproval: boolean;
    }) => {
      if (!allowed(input.projectId, "contribute")) return false;
      setSaving(true);
      try {
        await writeNewDocument({ ...input, actorId: currentUserIdRef.current });
        await refreshAfterSave();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That file could not be uploaded.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [allowed, refreshAfterSave, setSaving],
  );

  const recordApproval = useCallback<Store["recordApproval"]>(
    async (documentId, decision, note, versionId, reviewerId, dueDate) => {
      const doc = dataRef.current?.documents.find((d) => d.id === documentId);
      if (!doc || !allowed(doc.project_id, "contribute")) return false;
      return runAsync(() =>
        writeApproval(
          documentId,
          decision,
          note,
          currentUserIdRef.current,
          versionId,
          reviewerId,
          dueDate,
        ),
      );
    },
    [allowed, runAsync],
  );

  const libraryAction = useCallback<Store["libraryAction"]>(
    async (projectId, action) => {
      if (!allowed(projectId, "contribute")) return false;
      return runAsync(action);
    },
    [allowed, runAsync],
  );
  const createFolder = useCallback<Store["createFolder"]>(
    (projectId, parentId, name) =>
      libraryAction(projectId, () =>
        writeLibraryFolder({ projectId, parentId, name }, currentUserIdRef.current),
      ),
    [libraryAction],
  );
  const changeFolder = useCallback<Store["changeFolder"]>(
    async (id, action, name, parentId) => {
      const folder = dataRef.current?.documentFolders.find((f) => f.id === id);
      return folder
        ? libraryAction(folder.project_id, () =>
            changeLibraryFolder(id, action, currentUserIdRef.current, name, parentId),
          )
        : false;
    },
    [libraryAction],
  );
  const changeDocuments = useCallback<Store["changeDocuments"]>(
    async (ids, action, value) => {
      const all = [
        ...(dataRef.current?.documents ?? []),
        ...(dataRef.current?.trashedDocuments ?? []),
      ];
      if (
        !ids.length ||
        ids.some((id) => !all.some((d) => d.id === id && allowed(d.project_id, "contribute")))
      )
        return false;
      return runAsync(() => changeLibraryDocuments(ids, action, value));
    },
    [allowed, runAsync],
  );
  const starDocument = useCallback<Store["starDocument"]>(
    async (id, starred) => {
      const doc = dataRef.current?.documents.find((d) => d.id === id);
      return doc
        ? libraryAction(doc.project_id, () =>
            writeDocumentStar(id, currentUserIdRef.current, starred),
          )
        : false;
    },
    [libraryAction],
  );
  const editComment = useCallback<Store["editComment"]>(
    async (id, body) => {
      const comment = dataRef.current?.comments.find(
        (c) => c.id === id && c.author_id === currentUserIdRef.current,
      );
      const thread = dataRef.current?.discussionThreads.find((t) => t.id === comment?.thread_id);
      return thread
        ? libraryAction(thread.project_id, () =>
            writeCommentEdit(id, body, currentUserIdRef.current),
          )
        : false;
    },
    [libraryAction],
  );

  const addComment = useCallback<Store["addComment"]>(
    async (threadId, body, attachments, replyToId) => {
      const thread = dataRef.current?.discussionThreads.find((t) => t.id === threadId);
      if (!thread || !allowed(projectOfThread(threadId), "contribute")) return false;
      if (!body.trim() && !(attachments && attachments.length > 0)) return false;
      return await runAsync(() =>
        writeComment({
          threadId,
          body,
          replyToId: replyToId || null,
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

  const toggleReaction = useCallback(
    async (commentId: string, emoji: string): Promise<boolean> => {
      if (!dataRef.current) return false;
      const existing = dataRef.current.commentReactions.find(
        (r) =>
          r.comment_id === commentId &&
          r.person_id === currentUserIdRef.current &&
          r.emoji === emoji,
      );
      return await runAsync(async () => {
        if (existing) {
          await removeCommentReaction(existing.id, currentUserIdRef.current);
        } else {
          await writeCommentReaction(commentId, emoji, currentUserIdRef.current);
        }
      });
    },
    [runAsync],
  );

  const createThread = useCallback<Store["createThread"]>(
    async ({
      projectId,
      contextType,
      taskId = null,
      documentId = null,
      sceneId = null,
      subject,
      body,
      attachments,
    }) => {
      if (!allowed(projectId, "contribute")) return false;
      // The table requires the id that matches the context, so refuse an unanchored thread.
      if (contextType === "task" && !taskId) return false;
      if (contextType === "document" && !documentId) return false;
      if (contextType === "scene" && !sceneId) return false;
      if (!body.trim() && !(attachments && attachments.length > 0)) return false;
      // One conversation per work item / document: if one exists already, this
      // message joins it instead of starting a second one. Production-wide and
      // set-level topics are free to have as many separate conversations as needed.
      const existing =
        contextType === "task" || contextType === "document"
          ? dataRef.current?.discussionThreads.find(
              (t) =>
                t.project_id === projectId &&
                t.context_type === contextType &&
                (contextType === "task" ? t.task_id === taskId : t.document_id === documentId),
            )
          : undefined;
      if (existing) {
        return await addComment(existing.id, body, attachments);
      }
      return await runAsync(() =>
        writeThread({
          projectId,
          contextType,
          taskId,
          documentId,
          sceneId,
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
      requiresApproval,
    }: {
      attachmentId: string;
      folder: string;
      title: string;
      requiresApproval: boolean;
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
          requiresApproval,
          actorId: currentUserIdRef.current,
        });
        await refreshAfterSave();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That file could not be saved to documents.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [allowed, refreshAfterSave, setSaving],
  );

  const setDocumentApprovalRequirement = useCallback(
    (documentId: string, requiresApproval: boolean) => {
      if (!allowed(projectOfDocument(documentId), "contribute")) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.map((d) =>
                d.id === documentId ? { ...d, requires_approval: requiresApproval } : d,
              ),
            }
          : prev,
      );
      run(() =>
        writeDocumentApprovalRequirement(documentId, requiresApproval, currentUserIdRef.current),
      );
    },
    [allowed, run],
  );

  const setDocumentFolder = useCallback(
    (documentId: string, folder: string) => {
      if (!allowed(projectOfDocument(documentId), "contribute")) return;
      run(() => writeDocumentFolder(documentId, folder, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const setDocumentSet = useCallback(
    (documentId: string, sceneId: string | null) => {
      if (!allowed(projectOfDocument(documentId), "contribute")) return;
      run(() => writeDocumentScene(documentId, sceneId, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const deleteDocument = useCallback(
    (documentId: string) => {
      if (!allowed(projectOfDocument(documentId), "contribute")) return;
      run(() => removeDocument(documentId, currentUserIdRef.current));
    },
    [allowed, run],
  );

  /* ------------------------------------------------------------- staffing */

  const adminGlobal = () => roleRef.current === "admin";

  const setDepartmentOnProject = useCallback(
    (projectId: string, departmentId: string, on: boolean) => {
      if (!allowed(projectId, "admin")) return;
      run(() => writeDepartmentOnProject(projectId, departmentId, on, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const assignPerson = useCallback<Store["assignPerson"]>(
    ({ projectId, personId, departmentId, jobTitle, sceneId }) => {
      if (!allowed(projectId, "admin") || !personId || !departmentId) return;
      run(() =>
        writeAssignment({
          projectId,
          personId,
          departmentId,
          jobTitle,
          sceneId: sceneId ?? null,
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

  const createScene = useCallback<Store["createScene"]>(
    async (projectId, name, portalUrl) => {
      if (!allowed(projectId, "admin") || !name.trim()) return null;
      setSaving(true);
      try {
        const id = await writeScene(projectId, name, currentUserIdRef.current, portalUrl);
        await refreshAfterSave();
        return id;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That scene could not be added.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [allowed, refreshAfterSave, setSaving],
  );

  const renameScene = useCallback<Store["renameScene"]>(
    (sceneId, projectId, name) => {
      if (!allowed(projectId, "admin") || !name.trim()) return;
      run(() => writeSceneName(sceneId, projectId, name, currentUserIdRef.current));
    },
    [allowed, run],
  );

  const deleteScene = useCallback<Store["deleteScene"]>(
    async (sceneId, projectId) => {
      if (!allowed(projectId, "admin")) return false;
      return await runAsync(() => removeScene(sceneId, projectId, currentUserIdRef.current));
    },
    [allowed, runAsync],
  );

  const updateScene = useCallback<Store["updateScene"]>(
    async (sceneId, projectId, fields) => {
      if (!allowed(projectId, "admin")) return false;
      return await runAsync(() =>
        writeSceneFields(sceneId, projectId, fields, currentUserIdRef.current),
      );
    },
    [allowed, runAsync],
  );

  const reorderScene = useCallback<Store["reorderScene"]>(
    async (sceneId, neighbourId, projectId) => {
      if (!allowed(projectId, "admin") || sceneId === neighbourId) return false;
      return await runAsync(() =>
        writeSceneOrder(sceneId, neighbourId, projectId, currentUserIdRef.current),
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
        const refreshed = await refreshAfterSave();
        return { id, refreshed };
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "That production could not be created.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [refreshAfterSave, setSaving],
  );

  const updateProduction = useCallback<Store["updateProduction"]>(
    async (projectId, input) => {
      if (!adminGlobal()) return false;
      if (!input.name.trim()) return false;
      setSaving(true);
      try {
        await writeProductionSettings(projectId, input, currentUserIdRef.current);
        await refreshAfterSave();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Those settings could not be saved.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refreshAfterSave, setSaving],
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
            setViewingPerson,
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
            documentFolders: data.documentFolders,
            trashedDocuments: data.trashedDocuments,
            documentStars: data.documentStars,
            libraryAction,
            createFolder,
            changeFolder,
            changeDocuments,
            starDocument,
            editComment,
            documentVersions: data.documentVersions,
            approvals: data.approvals,
            threads: data.discussionThreads,
            comments: data.comments,
            commentAttachments: data.commentAttachments,
            commentReactions: data.commentReactions,
            mentions: data.mentions,
            notifications: data.notifications,
            saving,
            setTaskStatus,
            unapprovedDocuments,
            setTaskDates,
            previewReschedule,
            setMilestoneDate,
            setPortalUrl,
            addDocumentVersion,
            uploadDocument,
            recordApproval,
            addComment,
            toggleReaction,
            createThread,
            uploadAttachment,
            saveAttachmentToDocuments,
            setDocumentApprovalRequirement,
            setDocumentFolder,
            setDocumentSet,
            deleteDocument,
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
            createScene,
            renameScene,
            deleteScene,
            updateScene,
            reorderScene,
            createProduction,
            updateProduction,
          }
        : {
            role,
            setRole,
            setViewingPerson,
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
            documentFolders: [],
            trashedDocuments: [],
            documentStars: [],
            libraryAction,
            createFolder,
            changeFolder,
            changeDocuments,
            starDocument,
            editComment,
            documentVersions: [],
            approvals: [],
            threads: [],
            comments: [],
            commentAttachments: [],
            commentReactions: [],
            mentions: [],
            notifications: [],
            saving,
            setTaskStatus: () => {},
            unapprovedDocuments: () => [],
            setTaskDates: () => {},
            previewReschedule: async () => [],
            setMilestoneDate: () => {},
            setPortalUrl: () => {},
            addDocumentVersion: async () => false,
            uploadDocument: async () => false,
            recordApproval: async () => false,
            addComment: async () => false,
            toggleReaction: async () => false,
            uploadAttachment: async () => {
              throw new Error("Production data is still loading.");
            },
            saveAttachmentToDocuments: async () => {},
            setDocumentApprovalRequirement: () => {},
            setDocumentFolder: () => {},
            setDocumentSet: () => {},
            deleteDocument: () => {},
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
            createScene: async () => null,
            renameScene: () => {},
            deleteScene: async () => false,
            updateScene: async () => false,
            reorderScene: async () => false,
            createProduction: async () => null,
            updateProduction: async () => false,
          },
    [
      role,
      toggleReaction,
      setViewingPerson,
      setRole,
      isClosed,

      currentUserId,
      data,
      saving,
      setTaskStatus,
      unapprovedDocuments,
      setTaskDates,
      previewReschedule,
      setMilestoneDate,
      setPortalUrl,
      libraryAction,
      createFolder,
      changeFolder,
      changeDocuments,
      starDocument,
      editComment,
      addDocumentVersion,
      uploadDocument,
      recordApproval,
      addComment,
      createThread,
      uploadAttachment,
      saveAttachmentToDocuments,
      setDocumentApprovalRequirement,
      setDocumentFolder,
      setDocumentSet,
      deleteDocument,
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
      createScene,
      renameScene,
      deleteScene,
      updateScene,
      reorderScene,
      createProduction,
      updateProduction,
    ],
  );

  return (
    <StoreContext.Provider value={value}>
      {error && data && (
        <div
          role="alert"
          className="border-b border-border bg-[var(--ss-danger-bg,#FCE8E6)] px-6 py-2 text-sm text-ink"
        >
          <span className="font-semibold">Something needs attention.</span> {error}{" "}
          <button
            type="button"
            onClick={() => void retryLoad()}
            className="mr-3 min-h-11 font-semibold underline hover:no-underline"
          >
            Refresh data
          </button>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {error && !data ? (
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-2xl text-ink">
            The production data could not be loaded
          </h1>
          <p className="mt-2 text-sm text-ink-soft" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void retryLoad()}
            className="mt-5 min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-ink-soft">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Loading the production portfolio…
        </div>
      ) : (
        children
      )}
    </StoreContext.Provider>
  );
}
