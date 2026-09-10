/**
 * Live data layer for the "Sight and Sound" Supabase project (ref zqrotlehxgeztrukddck).
 *
 * The existing tables are read as-is (no schema changes, no re-seeding) and mapped
 * into the view models the interface already renders. Interactive workflows write
 * back to the same tables.
 */

import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "contributor" | "viewer";

export type Person = {
  id: string;
  full_name: string;
  title: string;
  email: string;
  primary_department_id: string;
  role: Role;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  lead_ids: string[];
};

export type ProjectStatus = "planning" | "active" | "on_hold" | "closed";

export type Project = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  status: ProjectStatus;
  venue: string;
  owner_id: string;
  opening_date: string;
  first_rehearsal_date: string;
  design_lock_date: string;
  portal_url: string;
  summary: string;
};

export type ProjectDepartment = {
  project_id: string;
  department_id: string;
  readiness: "on_track" | "at_risk" | "blocked" | "complete";
  note: string;
};

export type MilestoneStatus = "not_started" | "in_progress" | "complete" | "at_risk";

/** How much spare time an item has before it delays the production. */
export type Criticality = "critical" | "near_critical" | "normal";

export type Scene = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
};

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  status: MilestoneStatus;
  owner_id: string;
  department_id: string;
  is_core: boolean;
  /** Live best estimate from the central schedule calculation. */
  forecast_date: string;
  actual_date: string;
  criticality: Criticality;
  total_float_hours: number | null;
  affects_rehearsal: boolean;
  affects_performance: boolean;
};

export type TaskStatus = "not_started" | "in_progress" | "in_review" | "blocked" | "complete";

export type Task = {
  id: string;
  project_id: string;
  milestone_id: string;
  scene_id: string;
  title: string;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  assignee_id: string;
  department_id: string;
  /** Live best estimate from the central schedule calculation. */
  forecast_start: string;
  forecast_finish: string;
  actual_start: string;
  actual_finish: string;
  criticality: Criticality;
  total_float_hours: number | null;
  affects_rehearsal: boolean;
  affects_performance: boolean;
};

export type DependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: DependencyType;
  lag_hours: number;
  hard_constraint: boolean;
};

/** One row of the reschedule preview returned by the database. */
export type ReschedulePreviewRow = {
  entity_type: "task" | "milestone";
  entity_id: string;
  name: string;
  department_id: string | null;
  current_finish: string;
  new_finish: string;
  shift_days: number;
  affects_rehearsal: boolean;
  affects_performance: boolean;
  crosses_protected_date: boolean;
  protected_label: string | null;
};

export type ApprovalState = "draft" | "in_review" | "approved" | "changes_requested" | "rejected";

export type Document = {
  id: string;
  project_id: string;
  title: string;
  kind: string;
  department_id: string;
  owner_id: string;
  approval_state: ApprovalState;
  current_version: number;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  version: number;
  uploaded_by_id: string;
  uploaded_at: string;
  note: string;
  file_label: string;
};

export type Approval = {
  id: string;
  document_id: string;
  version: number;
  decision: "requested" | "approved" | "changes_requested" | "rejected";
  actor_id: string;
  requested_by_id: string;
  decided_by_id: string;
  created_at: string;
  note: string;
};


export type ThreadContext = "project" | "task" | "document";

export type DiscussionThread = {
  id: string;
  project_id: string;
  context_type: ThreadContext;
  task_id: string | null;
  document_id: string | null;
  subject: string;
  created_by_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  thread_id: string;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

export type Mention = {
  id: string;
  comment_id: string;
  person_id: string | null;
  department_id: string | null;
};

export type Notification = {
  id: string;
  project_id: string;
  recipient_id: string;
  kind: "mention" | "approval" | "due_soon" | "status_change";
  summary: string;
  created_at: string;
  read: boolean;
  /** Where the notice came from, so the Inbox can jump straight to it. */
  source_comment_id: string | null;
  source_entity_type: string | null;
  source_entity_id: string | null;
  /** True when the notice came from a department mention rather than a direct one. */
  via_department: boolean;
};


export type AuditEntry = {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  created_at: string;
};

export type ProductionData = {
  departments: Department[];
  people: Person[];
  projects: Project[];
  projectDepartments: ProjectDepartment[];
  milestones: Milestone[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  approvals: Approval[];
  discussionThreads: DiscussionThread[];
  comments: Comment[];
  mentions: Mention[];
  notifications: Notification[];
  auditLog: AuditEntry[];
};

/* ----------------------------------------------------------------- helpers */

const STOP_WORDS = new Set(["the", "a", "an", "and", "of", "&"]);

function departmentCode(name: string): string {
  const words = name.split(/[^A-Za-z]+/).filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0]!).join("").slice(0, 3).toUpperCase();
  return name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

function projectCode(name: string, dateish: string | null): string {
  const initials = name
    .split(/[^A-Za-z']+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()))
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 3);
  const year = dateish ? dateish.slice(2, 4) : "";
  return year ? `${initials}-${year}` : initials;
}

const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: "In planning",
  active: "In production",
  on_hold: "On hold",
  closed: "Closed — archived for reference",
};

function asProjectStatus(value: string): ProjectStatus {
  return value === "active" || value === "on_hold" || value === "closed" ? value : "planning";
}

function asMilestoneStatus(value: string): MilestoneStatus {
  if (value === "complete" || value === "at_risk" || value === "in_progress") return value;
  return "not_started";
}

/** The tasks table stores not_started / in_progress / blocked / done. */
function asTaskStatus(value: string): TaskStatus {
  if (value === "done" || value === "complete") return "complete";
  if (value === "in_progress" || value === "in_review" || value === "blocked") return value;
  return "not_started";
}

function toTaskStatusColumn(status: TaskStatus): string {
  if (status === "complete") return "done";
  if (status === "in_review") return "in_progress";
  return status;
}

export function asApprovalState(value: string | null | undefined): ApprovalState {
  if (
    value === "in_review" ||
    value === "approved" ||
    value === "changes_requested" ||
    value === "rejected"
  )
    return value;
  return "draft";
}

function asNotificationKind(type: string): Notification["kind"] {
  if (type.includes("mention")) return "mention";
  if (type.includes("approval") || type.includes("review")) return "approval";
  if (type.includes("due")) return "due_soon";
  return "status_change";
}

function firstLine(body: string, limit = 72): string {
  const clean = body.replace(/\s+/g, " ").trim();
  const sentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  const text = sentence.length > limit ? `${sentence.slice(0, limit).trimEnd()}…` : sentence;
  return text.replace(/[.]$/, "");
}

const dateOnly = (value: string | null): string => (value ? value.slice(0, 10) : "");

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/* -------------------------------------------------------------------- read */

/** Reads every table and maps it into the shapes the interface renders. */
export async function loadProductionData(): Promise<ProductionData> {
  const [
    peopleRes,
    departmentsRes,
    membershipsRes,
    projectsRes,
    projectDepartmentsRes,
    milestonesRes,
    tasksRes,
    taskDependenciesRes,
    documentsRes,
    versionsRes,
    approvalsRes,
    threadsRes,
    commentsRes,
    mentionsRes,
    notificationsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from("people").select("*").order("full_name"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("department_memberships").select("*"),
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("project_departments").select("*"),
    supabase.from("milestones").select("*").order("sort_order"),
    supabase.from("tasks").select("*").order("sort_order"),
    supabase.from("task_dependencies").select("*"),
    supabase.from("documents").select("*").order("created_at"),
    supabase.from("document_versions").select("*").order("version_number"),
    supabase.from("approvals").select("*").order("requested_at"),
    supabase.from("discussion_threads").select("*").order("created_at"),
    supabase.from("comments").select("*").order("created_at"),
    supabase.from("mentions").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  for (const res of [
    peopleRes,
    departmentsRes,
    membershipsRes,
    projectsRes,
    projectDepartmentsRes,
    milestonesRes,
    tasksRes,
    taskDependenciesRes,
    documentsRes,
    versionsRes,
    approvalsRes,
    threadsRes,
    commentsRes,
    mentionsRes,
    notificationsRes,
    auditRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const memberships = membershipsRes.data ?? [];

  const departments: Department[] = (departmentsRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    code: departmentCode(d.name),
    owner_id: d.default_owner_id ?? "",
    lead_ids: memberships
      .filter((m) => m.department_id === d.id && m.is_lead && m.person_id !== d.default_owner_id)
      .map((m) => m.person_id),
  }));

  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? "";

  const people: Person[] = (peopleRes.data ?? [])
    .filter((p) => !p.deactivated_at)
    .map((p) => {
      const membership =
        memberships.find((m) => m.person_id === p.id && m.is_lead) ??
        memberships.find((m) => m.person_id === p.id);
      const dept = membership ? departmentName(membership.department_id) : "";
      const title = dept
        ? membership?.is_lead
          ? `${dept} Lead`
          : `${dept} Team Member`
        : p.role === "admin"
          ? "Production Office"
          : "Team Member";
      return {
        id: p.id,
        full_name: p.full_name,
        title,
        email: p.email ?? "",
        primary_department_id: membership?.department_id ?? "",
        role: (p.role === "admin" || p.role === "contributor" ? p.role : "viewer") as Role,
        };
    });

  const milestoneRows = milestonesRes.data ?? [];
  const taskRows = tasksRes.data ?? [];

  const tasks: Task[] = taskRows.map((t) => ({
    id: t.id,
    project_id: t.project_id,
    milestone_id: t.milestone_id ?? "",
    title: t.title,
    status: asTaskStatus(t.status),
    due_date: dateOnly(t.due_date) || dateOnly(t.start_date),
    assignee_id: t.owner_id ?? "",
    department_id: t.department_id ?? "",
  }));

  const projects: Project[] = (projectsRes.data ?? []).map((p) => {
    const mine = milestoneRows.filter((m) => m.project_id === p.id);
    const byName = (pattern: RegExp) => mine.find((m) => pattern.test(m.name))?.due_date ?? null;
    const deptCount = (projectDepartmentsRes.data ?? []).filter((pd) => pd.project_id === p.id)
      .length;
    const workCount = tasks.filter((t) => t.project_id === p.id).length;
    const status = asProjectStatus(p.status);
    return {
      id: p.id,
      code: projectCode(p.name, p.target_close_date ?? p.start_date),
      name: p.name,
      subtitle: projectStatusLabels[status],
      status,
      venue: p.venue,
      owner_id: p.owner_id ?? "",
      opening_date: dateOnly(byName(/opening/i) ?? p.target_close_date),
      first_rehearsal_date: dateOnly(byName(/rehearsal/i) ?? p.start_date),
      design_lock_date: dateOnly(byName(/design|freeze/i) ?? p.start_date),
      portal_url: p.portal_link_url ?? "",
      summary: `${mine.length} key milestone${mine.length === 1 ? "" : "s"} and ${workCount} work item${
        workCount === 1 ? "" : "s"
      } across ${deptCount} department${deptCount === 1 ? "" : "s"}. Build window ${
        dateOnly(p.start_date) || "TBD"
      } to ${dateOnly(p.target_close_date) || "TBD"}.`,
    };
  });

  const milestones: Milestone[] = milestoneRows.map((m) => {
    const first = tasks.find((t) => t.milestone_id === m.id);
    const project = projects.find((p) => p.id === m.project_id);
    return {
      id: m.id,
      project_id: m.project_id,
      name: m.name,
      due_date: dateOnly(m.due_date),
      status: asMilestoneStatus(m.status),
      owner_id: first?.assignee_id || project?.owner_id || "",
      department_id: first?.department_id ?? "",
      is_core: true,
    };
  });

  const projectDepartments: ProjectDepartment[] = (projectDepartmentsRes.data ?? []).map((pd) => {
    const scoped = tasks.filter(
      (t) => t.project_id === pd.project_id && t.department_id === pd.department_id,
    );
    const done = scoped.filter((t) => t.status === "complete").length;
    const project = projects.find((p) => p.id === pd.project_id);
    const today = new Date().toISOString().slice(0, 10);
    let readiness: ProjectDepartment["readiness"] = "on_track";
    if (project?.status === "closed" || (scoped.length > 0 && done === scoped.length)) {
      readiness = "complete";
    } else if (scoped.some((t) => t.status === "blocked")) {
      readiness = "blocked";
    } else if (
      scoped.some((t) => t.status !== "complete" && t.due_date && t.due_date < today)
    ) {
      readiness = "at_risk";
    }
    return {
      project_id: pd.project_id,
      department_id: pd.department_id,
      readiness,
      note: scoped.length
        ? `${done} of ${scoped.length} work item${scoped.length === 1 ? "" : "s"} complete`
        : "No work items assigned yet",
    };
  });

  const versionRows = versionsRes.data ?? [];

  const documentVersions: DocumentVersion[] = versionRows.map((v) => ({
    id: v.id,
    document_id: v.document_id,
    version: v.version_number,
    uploaded_by_id: v.uploaded_by ?? "",
    uploaded_at: dateOnly(v.uploaded_at),
    note: v.change_note ?? "",
    file_label: (v.storage_key ?? "").split("/").pop() || `version-${v.version_number}`,
  }));

  const versionInfoEarly = new Map(versionRows.map((v) => [v.id, v]));
  const latestApprovalByDocument = new Map<string, { status: string; version: number }>();
  for (const a of approvalsRes.data ?? []) {
    const version = versionInfoEarly.get(a.document_version_id);
    if (!version) continue;
    const current = latestApprovalByDocument.get(version.document_id);
    if (!current || version.version_number >= current.version) {
      latestApprovalByDocument.set(version.document_id, {
        status: a.status,
        version: version.version_number,
      });
    }
  }

  /**
   * The documents table has no changes_requested state, so the review outcome is
   * read from the newest approval row for the newest version of the document.
   */
  const documentApprovalState = (docStatus: string, documentId: string): ApprovalState => {
    const latestVersion = versionRows
      .filter((v) => v.document_id === documentId)
      .reduce((max, v) => Math.max(max, v.version_number), 0);
    const approval = latestApprovalByDocument.get(documentId);
    if (approval && approval.version === latestVersion) {
      if (approval.status === "pending") return "in_review";
      return asApprovalState(approval.status);
    }
    return asApprovalState(docStatus);
  };

  const documents: Document[] = (documentsRes.data ?? []).map((d) => {
    const task = tasks.find((t) => t.id === d.task_id);
    const mine = documentVersions.filter((v) => v.document_id === d.id);
    const latest = mine.reduce((max, v) => Math.max(max, v.version), 0);
    const dept = task?.department_id ? departmentName(task.department_id) : "";
    return {
      id: d.id,
      project_id: d.project_id,
      title: d.title,
      kind: dept ? `${dept} document` : "Production document",
      department_id: task?.department_id ?? "",
      owner_id: d.created_by ?? "",
      approval_state: documentApprovalState(d.status, d.id),
      current_version: latest || 1,
      updated_at:
        mine.length > 0 ? mine[mine.length - 1]!.uploaded_at : dateOnly(d.created_at),
    };
  });

  const versionInfo = new Map(versionRows.map((v) => [v.id, v]));

  const approvals: Approval[] = (approvalsRes.data ?? []).map((a) => {
    const version = versionInfo.get(a.document_version_id);
    const decision: Approval["decision"] =
      a.status === "approved" || a.status === "rejected" || a.status === "changes_requested"
        ? a.status
        : "requested";
    return {
      id: a.id,
      document_id: version?.document_id ?? "",
      version: version?.version_number ?? 1,
      decision,
      actor_id: (a.decided_by ?? a.requested_by) ?? "",
      requested_by_id: a.requested_by ?? "",
      decided_by_id: a.decided_by ?? "",
      created_at: dateOnly(a.decided_at ?? a.requested_at),
      note: a.decision_note ?? "",
    };

  });

  const commentRows = commentsRes.data ?? [];

  const comments: Comment[] = commentRows
    .filter((c) => !c.deleted_at)
    .map((c) => ({
      id: c.id,
      thread_id: c.thread_id,
      parent_comment_id: null,
      author_id: c.author_id ?? "",
      body: c.body,
      created_at: c.created_at,
    }));

  const discussionThreads: DiscussionThread[] = (threadsRes.data ?? []).map((t) => {
    const opener = comments.find((c) => c.thread_id === t.id);
    const contextType: ThreadContext =
      t.context_type === "task" || t.context_type === "document" ? t.context_type : "project";
    const fallback =
      contextType === "task"
        ? tasks.find((x) => x.id === t.task_id)?.title
        : contextType === "document"
          ? documents.find((d) => d.id === t.document_id)?.title
          : projects.find((p) => p.id === t.project_id)?.name;
    return {
      id: t.id,
      project_id: t.project_id,
      context_type: contextType,
      task_id: t.task_id,
      document_id: t.document_id,
      subject: opener ? firstLine(opener.body) : (fallback ?? "Discussion"),
      created_by_id: t.created_by ?? "",
      created_at: t.created_at,
    };
  });

  const mentions: Mention[] = (mentionsRes.data ?? []).map((m) => ({
    id: m.id,
    comment_id: m.comment_id,
    person_id: m.mentioned_person_id,
    department_id: m.mentioned_department_id,
  }));

  const personName = (id: string | null) =>
    people.find((p) => p.id === id)?.full_name ?? "A team member";
  const commentById = new Map(comments.map((c) => [c.id, c]));

  const notifications: Notification[] = (notificationsRes.data ?? []).map((n) => {
    const source = n.source_comment_id ? commentById.get(n.source_comment_id) : undefined;
    const kind = asNotificationKind(n.type);
    let summary = humanize(n.type);
    if (kind === "mention" && source) {
      const who = personName(source.author_id);
      summary = n.type.includes("department")
        ? `${who} mentioned your department: “${firstLine(source.body, 60)}”`
        : `${who} mentioned you: “${firstLine(source.body, 60)}”`;
    } else if (source) {
      summary = `${humanize(n.type)} — “${firstLine(source.body, 60)}”`;
    } else if (n.source_entity_type) {
      summary = `${humanize(n.type)} on a ${n.source_entity_type.replace(/_/g, " ")}`;
    }
    return {
      id: n.id,
      project_id: n.project_id ?? "",
      recipient_id: n.person_id,
      kind,
      summary,
      created_at: n.created_at,
      read: n.is_read,
      source_comment_id: n.source_comment_id,
      source_entity_type: n.source_entity_type,
      source_entity_id: n.source_entity_id,
      via_department: n.type.includes("department"),
    };
  });


  const threadProject = new Map(discussionThreads.map((t) => [t.id, t.project_id]));
  const commentProject = new Map(
    comments.map((c) => [c.id, threadProject.get(c.thread_id) ?? ""]),
  );

  const resolveAuditProject = (entityType: string, entityId: string): string => {
    switch (entityType) {
      case "project":
        return entityId;
      case "task":
        return tasks.find((t) => t.id === entityId)?.project_id ?? "";
      case "milestone":
        return milestones.find((m) => m.id === entityId)?.project_id ?? "";
      case "document":
        return documents.find((d) => d.id === entityId)?.project_id ?? "";
      case "document_version":
        return (
          documents.find(
            (d) => d.id === documentVersions.find((v) => v.id === entityId)?.document_id,
          )?.project_id ?? ""
        );
      case "approval":
        return (
          documents.find((d) => d.id === approvals.find((a) => a.id === entityId)?.document_id)
            ?.project_id ?? ""
        );
      case "comment":
        return commentProject.get(entityId) ?? "";
      case "discussion_thread":
        return threadProject.get(entityId) ?? "";
      default:
        return "";
    }
  };

  const auditLog: AuditEntry[] = (auditRes.data ?? []).map((a) => ({
    id: a.id,
    project_id: resolveAuditProject(a.entity_type, a.entity_id),
    actor_id: a.actor_id ?? "",
    action: `${humanize(a.action)} — ${a.entity_type.replace(/_/g, " ")}`,
    created_at: a.created_at,
  }));

  return {
    departments,
    people,
    projects,
    projectDepartments,
    milestones,
    tasks,
    taskDependencies: (taskDependenciesRes.data ?? []).map((d) => ({
      task_id: d.task_id,
      depends_on_task_id: d.depends_on_task_id,
    })),
    documents,
    documentVersions,
    approvals,
    discussionThreads,
    comments,
    mentions,
    notifications,
    auditLog,
  };
}

/* ------------------------------------------------------------------- write */

async function recordAudit(
  entityType: string,
  entityId: string,
  actorId: string,
  action: string,
  changes: Record<string, string | number | boolean | null>,
) {
  await supabase.from("audit_log").insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_id: actorId,
    action,
    changes,
  });
}

export async function writeTaskStatus(taskId: string, status: TaskStatus, actorId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({ status: toTaskStatusColumn(status), updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  await recordAudit("task", taskId, actorId, "status_changed", { status });
}

export async function writeMilestoneDate(milestoneId: string, dueDate: string, actorId: string) {
  const { error } = await supabase
    .from("milestones")
    .update({ due_date: dueDate })
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);
  await recordAudit("milestone", milestoneId, actorId, "date_changed", { due_date: dueDate });
}

export async function writePortalUrl(projectId: string, url: string, actorId: string) {
  const { error } = await supabase
    .from("projects")
    .update({ portal_link_url: url || null })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "portal_link_updated", { portal_link_url: url });
}

export async function writeDocumentVersion(
  documentId: string,
  documentTitle: string,
  nextVersion: number,
  note: string,
  actorId: string,
) {
  const slug = documentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      storage_key: `demo/${slug}-v${nextVersion}.pdf`,
      uploaded_by: actorId,
      change_note: note || "New version uploaded",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: docError } = await supabase
    .from("documents")
    .update({ status: "draft" })
    .eq("id", documentId);
  if (docError) throw new Error(docError.message);
  await recordAudit("document_version", data.id, actorId, "version_uploaded", {
    version_number: nextVersion,
  });
}

/** Records a review request or a decision against the document's latest version. */
export async function writeApproval(
  documentId: string,
  decision: Approval["decision"],
  note: string,
  actorId: string,
  documentOwnerId: string,
  projectId: string,
) {
  const { data: versions, error: versionError } = await supabase
    .from("document_versions")
    .select("id, version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (versionError) throw new Error(versionError.message);
  const versionId = versions?.[0]?.id;
  if (!versionId) throw new Error("This document has no versions to review yet.");

  // The documents table accepts draft / in_review / approved / rejected / superseded.
  const documentStatus =
    decision === "requested" ? "in_review" : decision === "changes_requested" ? "draft" : decision;

  if (decision === "requested") {
    const { error } = await supabase.from("approvals").insert({
      document_version_id: versionId,
      requested_by: actorId,
      status: "pending",
      decision_note: note || null,
    });
    if (error) throw new Error(error.message);
  } else {
    const { data: pending } = await supabase
      .from("approvals")
      .select("id")
      .eq("document_version_id", versionId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(1);
    const payload = {
      status: decision,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
      decision_note: note || null,
    };
    if (pending?.[0]) {
      const { error } = await supabase.from("approvals").update(payload).eq("id", pending[0].id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("approvals").insert({
        document_version_id: versionId,
        requested_by: actorId,
        ...payload,
      });
      if (error) throw new Error(error.message);
    }
  }

  const { error: docError } = await supabase
    .from("documents")
    .update({ status: documentStatus })
    .eq("id", documentId);
  if (docError) throw new Error(docError.message);

  if (documentOwnerId && documentOwnerId !== actorId) {
    await supabase.from("notifications").insert({
      person_id: documentOwnerId,
      type: decision === "requested" ? "review_requested" : `approval_${decision}`,
      project_id: projectId || null,
      source_entity_type: "document",
      source_entity_id: documentId,
    });
  }

  await recordAudit("document", documentId, actorId, `approval_${decision}`, { note });
}

/** Inserts mention rows plus notifications for the people a comment reaches. */
async function writeMentions(
  body: string,
  commentId: string,
  projectId: string,
  sourceEntityType: string,
  sourceEntityId: string | null,
  departments: Department[],
  people: Person[],
  authorId: string,
) {
  const mentionRows: {
    comment_id: string;
    mentioned_person_id: string | null;
    mentioned_department_id: string | null;
  }[] = [];
  const notificationRows: {
    person_id: string;
    type: string;
    project_id: string | null;
    source_comment_id: string;
    source_entity_type: string;
    source_entity_id: string | null;
  }[] = [];

  for (const department of departments) {
    if (!body.includes(`@${department.name}`)) continue;
    mentionRows.push({
      comment_id: commentId,
      mentioned_person_id: null,
      mentioned_department_id: department.id,
    });
    // A department mention reaches the designated owner and any leads — never the whole roster.
    const recipients = new Set([department.owner_id, ...department.lead_ids].filter(Boolean));
    for (const recipient of recipients) {
      notificationRows.push({
        person_id: recipient,
        type: "department_mention",
        project_id: projectId || null,
        source_comment_id: commentId,
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
      });
    }
  }

  for (const person of people) {
    if (!body.includes(`@${person.full_name}`)) continue;
    mentionRows.push({
      comment_id: commentId,
      mentioned_person_id: person.id,
      mentioned_department_id: null,
    });
    if (person.id !== authorId) {
      notificationRows.push({
        person_id: person.id,
        type: "mention",
        project_id: projectId || null,
        source_comment_id: commentId,
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
      });
    }
  }

  if (mentionRows.length) await supabase.from("mentions").insert(mentionRows);
  if (notificationRows.length) await supabase.from("notifications").insert(notificationRows);
}

export async function writeComment(input: {
  threadId: string;
  body: string;
  authorId: string;
  projectId: string;
  sourceEntityType: string;
  sourceEntityId: string | null;
  departments: Department[];
  people: Person[];
}) {
  const { data, error } = await supabase
    .from("comments")
    .insert({ thread_id: input.threadId, author_id: input.authorId, body: input.body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeMentions(
    input.body,
    data.id,
    input.projectId,
    input.sourceEntityType,
    input.sourceEntityId,
    input.departments,
    input.people,
    input.authorId,
  );
  await recordAudit("comment", data.id, input.authorId, "comment_posted", {
    thread_id: input.threadId,
  });
}

export async function writeThread(input: {
  projectId: string;
  contextType: ThreadContext;
  taskId: string | null;
  documentId: string | null;
  subject: string;
  body: string;
  authorId: string;
  departments: Department[];
  people: Person[];
}) {
  const { data, error } = await supabase
    .from("discussion_threads")
    .insert({
      project_id: input.projectId,
      context_type: input.contextType,
      task_id: input.taskId,
      document_id: input.documentId,
      created_by: input.authorId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // The table has no subject column, so the subject opens the first message and
  // becomes the thread heading when the data is read back.
  const body = input.subject ? `${input.subject}. ${input.body}` : input.body;
  await writeComment({
    threadId: data.id,
    body,
    authorId: input.authorId,
    projectId: input.projectId,
    sourceEntityType: input.contextType,
    sourceEntityId: input.taskId ?? input.documentId ?? input.projectId,
    departments: input.departments,
    people: input.people,
  });
  await recordAudit("discussion_thread", data.id, input.authorId, "thread_started", {
    context_type: input.contextType,
  });
}

/** Marks personal Inbox items read (or unread again). */
export async function writeNotificationRead(ids: string[], read: boolean) {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notifications").update({ is_read: read }).in("id", ids);
  if (error) throw new Error(error.message);
}
