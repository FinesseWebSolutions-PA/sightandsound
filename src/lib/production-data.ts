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
  /** The department head for this production; falls back to the global owner. */
  head_id: string;
};

/**
 * One person staffed on one production, inside one department. When scene_id is
 * empty the row is the production-wide default; when it names a set, the row is
 * that person's job on that set.
 */
export type ProjectAssignment = {
  id: string;
  project_id: string;
  person_id: string;
  department_id: string;
  job_title: string;
  is_head: boolean;
  scene_id: string;
};

/** A preset job title offered when staffing a department on a production. */
export type DepartmentJobTitle = {
  id: string;
  department_id: string;
  title: string;
  sort_order: number;
};

export type MilestoneStatus = "not_started" | "in_progress" | "complete" | "at_risk";

/** How much spare time an item has before it delays the production. */
export type Criticality = "critical" | "near_critical" | "normal";

export type SetStatus = "not_started" | "in_progress" | "blocked" | "complete";

/** A set: the real unit of work inside a production. */
export type Scene = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  owner_id: string;
  status: SetStatus;
  start_date: string;
  due_date: string;
  forecast_start: string;
  forecast_finish: string;
  /** The set that must finish before this one starts, if any. */
  depends_on_scene_id: string;
  lag_days: number;
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
  /** Empty unless this work item is a sub-item of another. */
  parent_task_id: string;
  milestone_id: string;
  scene_id: string;
  title: string;
  description: string;
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
  "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";

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
  task_id: string;
  scene_id: string;
  title: string;
  kind: string;
  department_id: string;
  owner_id: string;
  approval_state: ApprovalState;
  current_version: number;
  /** Optional grouping label inside the production's documents. */
  folder: string;
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

export type ThreadContext = "project" | "task" | "document" | "scene";

export type DiscussionThread = {
  id: string;
  project_id: string;
  context_type: ThreadContext;
  task_id: string | null;
  document_id: string | null;
  scene_id: string | null;
  subject: string;
  created_by_id: string;
  created_at: string;
};

/** One message in a conversation. The table has no parent id: chat is flat. */
export type Comment = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

/** A file or photo shared inside a conversation. */
export type CommentAttachment = {
  id: string;
  comment_id: string;
  storage_key: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  uploaded_by_id: string;
  /** Set once someone files it into the production's documents. */
  saved_document_id: string | null;
  created_at: string;
};

/** A file already uploaded to storage but not yet attached to a message. */
export type StagedAttachment = {
  storage_key: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
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
  projectAssignments: ProjectAssignment[];
  departmentJobTitles: DepartmentJobTitle[];
  scenes: Scene[];
  milestones: Milestone[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  approvals: Approval[];
  discussionThreads: DiscussionThread[];
  comments: Comment[];
  commentAttachments: CommentAttachment[];
  mentions: Mention[];
  notifications: Notification[];
  auditLog: AuditEntry[];
};

/**
 * The database owns the schedule maths, so the client only ever calls it.
 * The generated types do not describe these functions yet, hence the cast.
 */
type RpcCaller = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const callRpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as RpcCaller)(name, args);

/* ----------------------------------------------------------------- helpers */

const STOP_WORDS = new Set(["the", "a", "an", "and", "of", "&"]);

function departmentCode(name: string): string {
  const words = name.split(/[^A-Za-z]+/).filter(Boolean);
  if (words.length > 1)
    return words
      .map((w) => w[0]!)
      .join("")
      .slice(0, 3)
      .toUpperCase();
  return name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
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

function asSetStatus(value: string | null): SetStatus {
  if (value === "in_progress" || value === "blocked" || value === "complete") return value;
  if (value === "done") return "complete";
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

function asCriticality(value: string | null | undefined): Criticality {
  return value === "critical" || value === "near_critical" ? value : "normal";
}

function asDependencyType(value: string | null | undefined): DependencyType {
  return value === "start_to_start" || value === "finish_to_finish" || value === "start_to_finish"
    ? value
    : "finish_to_start";
}

/**
 * Asks the database to recompute float, criticality and forecast dates for every
 * production, so every view reads one shared set of numbers.
 */
export async function refreshSchedule(projectIds: string[]): Promise<void> {
  await Promise.all(
    projectIds.map(async (id) => {
      const { error } = await callRpc("compute_project_schedule", { p_project_id: id });
      if (error) throw new Error(error.message);
    }),
  );
}

/** Preview of what a proposed reschedule would do downstream. */
export async function previewTaskReschedule(
  taskId: string,
  newStart: string,
  newFinish: string,
): Promise<ReschedulePreviewRow[]> {
  const { data, error } = await callRpc("preview_task_reschedule", {
    p_task_id: taskId,
    p_new_start: newStart,
    p_new_finish: newFinish,
  });
  if (error) throw new Error(error.message);
  return (data as ReschedulePreviewRow[] | null) ?? [];
}

/** Reads every table and maps it into the shapes the interface renders. */
export async function loadProductionData(): Promise<ProductionData> {
  const { data: projectIdRows, error: projectIdError } = await supabase
    .from("projects")
    .select("id");
  if (projectIdError) throw new Error(projectIdError.message);
  await refreshSchedule((projectIdRows ?? []).map((p) => p.id));

  const [
    peopleRes,
    departmentsRes,
    membershipsRes,
    projectsRes,
    projectDepartmentsRes,
    assignmentsRes,
    jobTitlesRes,
    scenesRes,
    milestonesRes,
    tasksRes,
    taskDependenciesRes,
    documentsRes,
    versionsRes,
    approvalsRes,
    threadsRes,
    commentsRes,
    attachmentsRes,
    mentionsRes,
    notificationsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from("people").select("*").order("full_name"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("department_memberships").select("*"),
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("project_departments").select("*"),
    supabase.from("project_assignments").select("*").order("created_at"),
    supabase.from("department_job_titles").select("*").order("sort_order"),
    supabase.from("scenes").select("*").order("sort_order"),
    supabase.from("milestones").select("*").order("sort_order"),
    supabase.from("tasks").select("*").order("sort_order"),
    supabase.from("task_dependencies").select("*"),
    supabase.from("documents").select("*").order("created_at"),
    supabase.from("document_versions").select("*").order("version_number"),
    supabase.from("approvals").select("*").order("requested_at"),
    supabase.from("discussion_threads").select("*").order("created_at"),
    supabase.from("comments").select("*").order("created_at"),
    supabase.from("comment_attachments").select("*").order("created_at"),
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
    assignmentsRes,
    jobTitlesRes,
    scenesRes,
    milestonesRes,
    tasksRes,
    taskDependenciesRes,
    documentsRes,
    versionsRes,
    approvalsRes,
    threadsRes,
    commentsRes,
    attachmentsRes,
    mentionsRes,
    notificationsRes,
    auditRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const memberships = membershipsRes.data ?? [];

  const projectAssignments: ProjectAssignment[] = (assignmentsRes.data ?? []).map((a) => ({
    id: a.id,
    project_id: a.project_id,
    person_id: a.person_id,
    department_id: a.department_id,
    job_title: a.job_title ?? "",
    is_head: a.is_head ?? false,
    scene_id: a.scene_id ?? "",
  }));

  const departmentJobTitles: DepartmentJobTitle[] = (jobTitlesRes.data ?? []).map((t) => ({
    id: t.id,
    department_id: t.department_id,
    title: t.title,
    sort_order: t.sort_order ?? 0,
  }));

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

  const scenes: Scene[] = (scenesRes.data ?? []).map((s) => ({
    id: s.id,
    project_id: s.project_id,
    name: s.name,
    sort_order: s.sort_order,
    owner_id: s.owner_id ?? "",
    status: asSetStatus(s.status),
    start_date: dateOnly(s.start_date),
    due_date: dateOnly(s.due_date),
    forecast_start: dateOnly(s.forecast_start) || dateOnly(s.start_date),
    forecast_finish: dateOnly(s.forecast_finish) || dateOnly(s.due_date),
    depends_on_scene_id: s.depends_on_scene_id ?? "",
    lag_days: Number(s.lag_days ?? 0),
  }));

  const tasks: Task[] = taskRows.map((t) => ({
    id: t.id,
    project_id: t.project_id,
    parent_task_id: t.parent_task_id ?? "",
    milestone_id: t.milestone_id ?? "",
    scene_id: t.scene_id ?? "",
    title: t.title,
    description: t.description ?? "",
    status: asTaskStatus(t.status),
    start_date: dateOnly(t.start_date) || dateOnly(t.due_date),
    due_date: dateOnly(t.due_date) || dateOnly(t.start_date),
    assignee_id: t.owner_id ?? "",
    department_id: t.department_id ?? "",
    forecast_start: dateOnly(t.forecast_start) || dateOnly(t.start_date),
    forecast_finish: dateOnly(t.forecast_finish) || dateOnly(t.due_date),
    actual_start: dateOnly(t.actual_start),
    actual_finish: dateOnly(t.actual_finish),
    criticality: asCriticality(t.criticality),
    total_float_hours: t.total_float_hours === null ? null : Number(t.total_float_hours),
    affects_rehearsal: t.affects_rehearsal ?? false,
    affects_performance: t.affects_performance ?? false,
  }));

  const projects: Project[] = (projectsRes.data ?? []).map((p) => {
    const mine = milestoneRows.filter((m) => m.project_id === p.id);
    const byName = (pattern: RegExp) => mine.find((m) => pattern.test(m.name))?.due_date ?? null;
    const deptCount = (projectDepartmentsRes.data ?? []).filter(
      (pd) => pd.project_id === p.id,
    ).length;
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
    const mineFloat = tasks
      .filter((t) => t.milestone_id === m.id && t.total_float_hours !== null)
      .map((t) => t.total_float_hours as number);
    // A milestone reports what its own work items actually say, so a heading can
    // never read "Complete" while the work underneath is still open.
    const mineTasks = tasks.filter((t) => t.milestone_id === m.id);
    const stored = asMilestoneStatus(m.status);
    const today = new Date().toISOString().slice(0, 10);
    let status = stored;
    if (mineTasks.length > 0) {
      const done = mineTasks.filter((t) => t.status === "complete").length;
      if (done === mineTasks.length) {
        status = "complete";
      } else if (
        mineTasks.some((t) => t.status === "blocked") ||
        (dateOnly(m.forecast_date) || dateOnly(m.due_date)) > dateOnly(m.due_date) ||
        mineTasks.some((t) => t.status !== "complete" && t.due_date && t.due_date < today)
      ) {
        status = "at_risk";
      } else if (mineTasks.some((t) => t.status !== "not_started")) {
        status = "in_progress";
      } else {
        status = "not_started";
      }
    }
    return {
      id: m.id,
      project_id: m.project_id,
      name: m.name,
      due_date: dateOnly(m.due_date),
      status,
      owner_id: first?.assignee_id || project?.owner_id || "",
      department_id: first?.department_id ?? "",
      is_core: true,
      forecast_date: dateOnly(m.forecast_date) || dateOnly(m.due_date),
      actual_date: dateOnly(m.actual_date),
      criticality: asCriticality(m.criticality),
      total_float_hours: mineFloat.length ? Math.min(...mineFloat) : null,
      affects_rehearsal: m.affects_rehearsal ?? false,
      affects_performance: m.affects_performance ?? false,
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
    } else if (scoped.some((t) => t.status !== "complete" && t.due_date && t.due_date < today)) {
      readiness = "at_risk";
    }
    const headAssignment = projectAssignments.find(
      (a) => a.project_id === pd.project_id && a.department_id === pd.department_id && a.is_head,
    );
    const globalOwner = departments.find((d) => d.id === pd.department_id)?.owner_id ?? "";
    return {
      project_id: pd.project_id,
      department_id: pd.department_id,
      readiness,
      note: scoped.length
        ? `${done} of ${scoped.length} work item${scoped.length === 1 ? "" : "s"} complete`
        : "No work items assigned yet",
      head_id: headAssignment?.person_id ?? pd.default_owner_id ?? globalOwner,
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
      task_id: d.task_id ?? "",
      scene_id: d.scene_id ?? "",
      title: d.title,
      kind: dept ? `${dept} document` : "Production document",
      department_id: task?.department_id ?? "",
      owner_id: d.created_by ?? "",
      approval_state: documentApprovalState(d.status, d.id),
      current_version: latest || 1,
      folder: d.folder ?? "",
      updated_at: mine.length > 0 ? mine[mine.length - 1]!.uploaded_at : dateOnly(d.created_at),
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
      actor_id: a.decided_by ?? a.requested_by ?? "",
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
      author_id: c.author_id ?? "",
      body: c.body,
      created_at: c.created_at,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const commentAttachments: CommentAttachment[] = (attachmentsRes.data ?? []).map((a) => ({
    id: a.id,
    comment_id: a.comment_id,
    storage_key: a.storage_key,
    file_name: a.file_name,
    mime_type: a.mime_type ?? "",
    byte_size: Number(a.byte_size ?? 0),
    uploaded_by_id: a.uploaded_by ?? "",
    saved_document_id: a.saved_document_id ?? null,
    created_at: a.created_at,
  }));


  const discussionThreads: DiscussionThread[] = (threadsRes.data ?? []).map((t) => {
    const opener = comments.find((c) => c.thread_id === t.id);
    const contextType: ThreadContext =
      t.context_type === "task" || t.context_type === "document" || t.context_type === "scene"
        ? t.context_type
        : "project";
    const fallback =
      contextType === "task"
        ? tasks.find((x) => x.id === t.task_id)?.title
        : contextType === "document"
          ? documents.find((d) => d.id === t.document_id)?.title
          : contextType === "scene"
            ? scenes.find((s) => s.id === t.scene_id)?.name
            : projects.find((p) => p.id === t.project_id)?.name;
    return {
      id: t.id,
      project_id: t.project_id,
      context_type: contextType,
      task_id: t.task_id,
      document_id: t.document_id,
      scene_id: t.scene_id ?? null,
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
  const commentProject = new Map(comments.map((c) => [c.id, threadProject.get(c.thread_id) ?? ""]));

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
    projectAssignments,
    departmentJobTitles,
    scenes,
    milestones,
    tasks,
    taskDependencies: (taskDependenciesRes.data ?? []).map((d) => ({
      id: d.id,
      task_id: d.task_id,
      depends_on_task_id: d.depends_on_task_id,
      type: asDependencyType(d.type),
      lag_hours: Number(d.lag_hours ?? 0),
      hard_constraint: d.hard_constraint ?? true,
    })),
    documents,
    documentVersions,
    approvals,
    discussionThreads,
    comments,
    commentAttachments,
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

/** Commits a reschedule of a work item, then lets the database recompute the schedule. */
export async function writeTaskDates(
  taskId: string,
  startDate: string,
  dueDate: string,
  actorId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ start_date: startDate, due_date: dueDate, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("project_id")
    .single();
  if (error) throw new Error(error.message);
  await refreshSchedule([data.project_id]);
  await recordAudit("task", taskId, actorId, "dates_changed", {
    start_date: startDate,
    due_date: dueDate,
  });
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
  const slug = documentTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
  // One notice per person per message: someone reached both directly and through
  // their department hears about it once, and never about their own message.
  const notified = new Map<string, string>();

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
      if (recipient === authorId) continue;
      if (!notified.has(recipient)) notified.set(recipient, "department_mention");
    }
  }

  for (const person of people) {
    if (!body.includes(`@${person.full_name}`)) continue;
    mentionRows.push({
      comment_id: commentId,
      mentioned_person_id: person.id,
      mentioned_department_id: null,
    });
    // A direct mention wins over a department one for the same person.
    if (person.id !== authorId) notified.set(person.id, "mention");
  }

  const notificationRows = [...notified.entries()].map(([person_id, type]) => ({
    person_id,
    type,
    project_id: projectId || null,
    source_comment_id: commentId,
    source_entity_type: sourceEntityType,
    source_entity_id: sourceEntityId,
  }));

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
  attachments?: StagedAttachment[];
}) {
  const { data, error } = await supabase
    .from("comments")
    .insert({ thread_id: input.threadId, author_id: input.authorId, body: input.body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeAttachmentRows(data.id, input.attachments ?? [], input.authorId);
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
  sceneId?: string | null;
  subject: string;
  body: string;
  authorId: string;
  departments: Department[];
  people: Person[];
  attachments?: StagedAttachment[];
}) {
  // A work item or a document keeps exactly one conversation, so if one already
  // exists (including one just created by a double tap) the message joins it.
  let threadId: string | null = null;
  if (input.contextType !== "project") {
    const column =
      input.contextType === "task"
        ? "task_id"
        : input.contextType === "scene"
          ? "scene_id"
          : "document_id";
    const anchor =
      input.contextType === "task"
        ? input.taskId
        : input.contextType === "scene"
          ? (input.sceneId ?? null)
          : input.documentId;
    if (anchor) {
      const { data: existing } = await supabase
        .from("discussion_threads")
        .select("id")
        .eq("project_id", input.projectId)
        .eq("context_type", input.contextType)
        .eq(column, anchor)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (existing) threadId = existing.id;
    }
  }

  if (!threadId) {
    const { data, error } = await supabase
      .from("discussion_threads")
      .insert({
        project_id: input.projectId,
        context_type: input.contextType,
        task_id: input.taskId,
        document_id: input.documentId,
        scene_id: input.sceneId ?? null,
        created_by: input.authorId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    threadId = data.id;
  }
  const data = { id: threadId };

  // The table has no subject column, so the subject opens the first message and
  // becomes the thread heading when the data is read back.
  const body = input.subject ? `${input.subject}. ${input.body}` : input.body;
  await writeComment({
    threadId: data.id,
    body,
    authorId: input.authorId,
    projectId: input.projectId,
    sourceEntityType: input.contextType,
    sourceEntityId: input.taskId ?? input.documentId ?? input.sceneId ?? input.projectId,
    departments: input.departments,
    people: input.people,
    ...(input.attachments ? { attachments: input.attachments } : {}),
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

const CHAT_BUCKET = "chat-attachments";

/** Largest file a conversation accepts, matching the storage limit. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "-").slice(-80) || "file";
}

/** Uploads one file for a conversation and returns what the message should carry. */
export async function uploadChatAttachment(
  file: File,
  projectId: string,
  threadKey: string,
): Promise<StagedAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is larger than 25 MB.`);
  }
  const key = `${projectId}/${threadKey}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(key, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return {
    storage_key: key,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    byte_size: file.size,
  };
}

/** Signed links so a private file can be shown or downloaded in the browser. */
export async function attachmentUrls(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrls(keys, 60 * 60);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

async function writeAttachmentRows(
  commentId: string,
  attachments: StagedAttachment[],
  actorId: string,
) {
  if (attachments.length === 0) return;
  const { error } = await supabase.from("comment_attachments").insert(
    attachments.map((a) => ({
      comment_id: commentId,
      storage_key: a.storage_key,
      file_name: a.file_name,
      mime_type: a.mime_type,
      byte_size: a.byte_size,
      uploaded_by: actorId,
    })),
  );
  if (error) throw new Error(error.message);
}

/**
 * Files a conversation attachment into the production's documents as revision 1,
 * pointing at the same stored file, and marks the attachment as saved.
 */
export async function saveAttachmentToDocs(input: {
  attachmentId: string;
  storageKey: string;
  fileName: string;
  projectId: string;
  taskId: string | null;
  folder: string;
  title: string;
  actorId: string;
}) {
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      title: input.title || input.fileName,
      folder: input.folder || null,
      status: "draft",
      created_by: input.actorId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: versionError } = await supabase.from("document_versions").insert({
    document_id: doc.id,
    version_number: 1,
    storage_key: input.storageKey,
    uploaded_by: input.actorId,
    change_note: "Saved from a conversation",
  });
  if (versionError) throw new Error(versionError.message);

  const { error: linkError } = await supabase
    .from("comment_attachments")
    .update({ saved_document_id: doc.id })
    .eq("id", input.attachmentId);
  if (linkError) throw new Error(linkError.message);

  await recordAudit("document", doc.id, input.actorId, "saved_from_conversation", {
    folder: input.folder || null,
    file_name: input.fileName,
  });
  return doc.id;
}

/** Moves a document into a folder (or clears it with an empty string). */
export async function writeDocumentFolder(documentId: string, folder: string, actorId: string) {
  const { error } = await supabase
    .from("documents")
    .update({ folder: folder || null })
    .eq("id", documentId);
  if (error) throw new Error(error.message);
  await recordAudit("document", documentId, actorId, "folder_changed", { folder: folder || null });
}

/**
 * Files a document into a set's folder (or out of every set folder). Sets own
 * their folder, so a document in a set folder carries no custom folder name.
 */
export async function writeDocumentScene(
  documentId: string,
  sceneId: string | null,
  actorId: string,
) {
  const { error } = await supabase
    .from("documents")
    .update({ scene_id: sceneId, ...(sceneId ? { folder: null } : {}) })
    .eq("id", documentId);
  if (error) throw new Error(error.message);
  await recordAudit("document", documentId, actorId, "set_changed", { scene_id: sceneId });
}

/* --------------------------------------------------------------- staffing */

/** Puts a department on a production, or takes it off. */
export async function writeDepartmentOnProject(
  projectId: string,
  departmentId: string,
  onProduction: boolean,
  actorId: string,
) {
  if (onProduction) {
    const { error } = await supabase
      .from("project_departments")
      .upsert({ project_id: projectId, department_id: departmentId }, {
        onConflict: "project_id,department_id",
      });
    if (error) throw new Error(error.message);
  } else {
    const removals = await Promise.all([
      supabase
        .from("project_assignments")
        .delete()
        .eq("project_id", projectId)
        .eq("department_id", departmentId),
      supabase
        .from("project_departments")
        .delete()
        .eq("project_id", projectId)
        .eq("department_id", departmentId),
    ]);
    for (const r of removals) if (r.error) throw new Error(r.error.message);
  }
  await recordAudit("project", projectId, actorId, "department_involvement_changed", {
    department_id: departmentId,
    on_production: onProduction,
  });
}

/** Assigns someone to a department on a production, with their job for that show. */
export async function writeAssignment(input: {
  projectId: string;
  personId: string;
  departmentId: string;
  jobTitle: string;
  actorId: string;
  /** Omit (or pass null) for the production-wide default team. */
  sceneId?: string | null;
}) {
  const sceneId = input.sceneId || null;
  // Two levels share the table, so the existing row is matched on the level too.
  let existing = supabase
    .from("project_assignments")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("person_id", input.personId)
    .eq("department_id", input.departmentId);
  existing = sceneId ? existing.eq("scene_id", sceneId) : existing.is("scene_id", null);
  const { data: found } = await existing.limit(1).maybeSingle();

  if (found) {
    const { error } = await supabase
      .from("project_assignments")
      .update({ job_title: input.jobTitle })
      .eq("id", found.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("project_assignments").insert({
      project_id: input.projectId,
      person_id: input.personId,
      department_id: input.departmentId,
      job_title: input.jobTitle,
      scene_id: sceneId,
    });
    if (error) throw new Error(error.message);
  }
  await recordAudit("project", input.projectId, input.actorId, "person_assigned", {
    person_id: input.personId,
    department_id: input.departmentId,
    job_title: input.jobTitle,
    scene_id: sceneId,
  });
}

export async function writeAssignmentJobTitle(
  assignmentId: string,
  projectId: string,
  jobTitle: string,
  actorId: string,
) {
  const { error } = await supabase
    .from("project_assignments")
    .update({ job_title: jobTitle })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "assignment_job_changed", { job_title: jobTitle });
}

export async function removeAssignment(
  assignmentId: string,
  projectId: string,
  actorId: string,
) {
  const { error } = await supabase.from("project_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "person_unassigned", {
    assignment_id: assignmentId,
  });
}

/** Names the department head for one production. */
export async function writeProjectDepartmentHead(
  projectId: string,
  departmentId: string,
  personId: string,
  actorId: string,
) {
  const clear = await supabase
    .from("project_assignments")
    .update({ is_head: false })
    .eq("project_id", projectId)
    .eq("department_id", departmentId);
  if (clear.error) throw new Error(clear.error.message);

  if (personId) {
    const upsert = await supabase.from("project_assignments").upsert(
      {
        project_id: projectId,
        person_id: personId,
        department_id: departmentId,
        is_head: true,
      },
      { onConflict: "project_id,person_id,department_id" },
    );
    if (upsert.error) throw new Error(upsert.error.message);
  }

  const pd = await supabase
    .from("project_departments")
    .upsert(
      {
        project_id: projectId,
        department_id: departmentId,
        default_owner_id: personId || null,
      },
      { onConflict: "project_id,department_id" },
    );
  if (pd.error) throw new Error(pd.error.message);

  await recordAudit("project", projectId, actorId, "department_head_changed", {
    department_id: departmentId,
    person_id: personId || null,
  });
}

/* ------------------------------------------------------- global defaults */

export async function writePersonRole(personId: string, role: Role, actorId: string) {
  const { error } = await supabase.from("people").update({ role }).eq("id", personId);
  if (error) throw new Error(error.message);
  await recordAudit("person", personId, actorId, "access_level_changed", { role });
}

/** Moves someone to a department globally, keeping their lead flag. */
export async function writePersonDepartment(
  personId: string,
  departmentId: string,
  isLead: boolean,
  actorId: string,
) {
  const clear = await supabase
    .from("department_memberships")
    .delete()
    .eq("person_id", personId);
  if (clear.error) throw new Error(clear.error.message);
  if (departmentId) {
    const { error } = await supabase
      .from("department_memberships")
      .insert({ person_id: personId, department_id: departmentId, is_lead: isLead });
    if (error) throw new Error(error.message);
  }
  await recordAudit("person", personId, actorId, "department_changed", {
    department_id: departmentId || null,
    is_lead: isLead,
  });
}

export async function writeDepartmentOwner(
  departmentId: string,
  personId: string,
  actorId: string,
) {
  const { error } = await supabase
    .from("departments")
    .update({ default_owner_id: personId || null })
    .eq("id", departmentId);
  if (error) throw new Error(error.message);
  await recordAudit("department", departmentId, actorId, "default_owner_changed", {
    person_id: personId || null,
  });
}

export async function writeJobTitlePreset(
  departmentId: string,
  title: string,
  sortOrder: number,
  actorId: string,
) {
  const { error } = await supabase
    .from("department_job_titles")
    .upsert({ department_id: departmentId, title, sort_order: sortOrder }, {
      onConflict: "department_id,title",
    });
  if (error) throw new Error(error.message);
  await recordAudit("department", departmentId, actorId, "job_title_added", { title });
}

export async function removeJobTitlePreset(id: string, departmentId: string, actorId: string) {
  const { error } = await supabase.from("department_job_titles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await recordAudit("department", departmentId, actorId, "job_title_removed", { id });
}

/* -------------------------------------------------- work items: create / edit */

export type WorkItemInput = {
  /** Present when editing an existing work item. */
  id?: string;
  projectId: string;
  title: string;
  description: string;
  departmentId: string;
  /** Every work item belongs to a set. */
  sceneId: string;
  milestoneId: string | null;
  /** The work item this one is part of; null keeps it top level. Omit to leave unchanged. */
  parentTaskId?: string | null;
  ownerId: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: TaskStatus;
  affectsRehearsal: boolean;
  affectsPerformance: boolean;
  actorId: string;
};

/** Creates or updates one work item, then lets the database recompute the schedule. */
export async function writeTask(input: WorkItemInput): Promise<string> {
  const row = {
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    department_id: input.departmentId || null,
    scene_id: input.sceneId,
    milestone_id: input.milestoneId || null,
    owner_id: input.ownerId || null,
    start_date: input.startDate || null,
    due_date: input.dueDate || null,
    status: toTaskStatusColumn(input.status),
    affects_rehearsal: input.affectsRehearsal,
    affects_performance: input.affectsPerformance,
    updated_at: new Date().toISOString(),
    ...(input.parentTaskId === undefined ? {} : { parent_task_id: input.parentTaskId || null }),
  };

  let taskId = input.id ?? "";
  if (input.id) {
    // A work item with sub-items summarises them, so its own dates and status are
    // never written directly — the database rolls them up from the children.
    const { data: children } = await supabase
      .from("tasks")
      .select("id")
      .eq("parent_task_id", input.id)
      .limit(1);
    const hasChildren = (children?.length ?? 0) > 0;
    const { start_date, due_date, status, ...rest } = row;
    const { error } = await supabase
      .from("tasks")
      .update(hasChildren ? rest : { ...rest, start_date, due_date, status })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...row, sort_order: (count ?? 0) + 1, created_by: input.actorId || null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    taskId = data.id;
  }

  await refreshSchedule([input.projectId]);
  await recordAudit("task", taskId, input.actorId, input.id ? "task_updated" : "task_created", {
    title: row.title,
    department_id: row.department_id,
    scene_id: row.scene_id,
    milestone_id: row.milestone_id,
    owner_id: row.owner_id,
    start_date: row.start_date,
    due_date: row.due_date,
  });
  return taskId;
}

/** Tells the caller whether a work item can be removed outright, and why not. */
export async function taskRemovalBlockers(taskId: string): Promise<string[]> {
  const [deps, threads, docs, children] = await Promise.all([
    supabase.from("task_dependencies").select("id").eq("depends_on_task_id", taskId),
    supabase.from("discussion_threads").select("id").eq("task_id", taskId),
    supabase.from("documents").select("id").eq("task_id", taskId),
    supabase.from("tasks").select("id").eq("parent_task_id", taskId),
  ]);
  const blockers: string[] = [];
  if ((children.data?.length ?? 0) > 0) blockers.push("it has sub-items");
  if ((deps.data?.length ?? 0) > 0) blockers.push("other work waits on it");
  if ((threads.data?.length ?? 0) > 0) blockers.push("it has a conversation");
  if ((docs.data?.length ?? 0) > 0) blockers.push("documents are attached to it");
  return blockers;
}

export async function removeTask(taskId: string, projectId: string, actorId: string) {
  const blockers = await taskRemovalBlockers(taskId);
  if (blockers.length > 0) {
    throw new Error(`This work item cannot be removed because ${blockers.join(", ")}.`);
  }
  const { error: depError } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("task_id", taskId);
  if (depError) throw new Error(depError.message);
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  await refreshSchedule([projectId]);
  await recordAudit("task", taskId, actorId, "task_removed", {});
}

export async function writeTaskDependency(input: {
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  lagHours: number;
  hardConstraint: boolean;
  projectId: string;
  actorId: string;
}) {
  if (input.taskId === input.dependsOnTaskId) {
    throw new Error("A work item cannot wait on itself.");
  }
  const { error } = await supabase.from("task_dependencies").insert({
    task_id: input.taskId,
    depends_on_task_id: input.dependsOnTaskId,
    type: input.type,
    lag_hours: input.lagHours,
    hard_constraint: input.hardConstraint,
  });
  if (error) throw new Error(error.message);
  await refreshSchedule([input.projectId]);
  await recordAudit("task", input.taskId, input.actorId, "dependency_added", {
    depends_on_task_id: input.dependsOnTaskId,
    type: input.type,
    lag_hours: input.lagHours,
  });
}

export async function removeTaskDependency(
  id: string,
  taskId: string,
  projectId: string,
  actorId: string,
) {
  const { error } = await supabase.from("task_dependencies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await refreshSchedule([projectId]);
  await recordAudit("task", taskId, actorId, "dependency_removed", { id });
}

/* -------------------------------------------------- productions: create */

export type NewProductionInput = {
  name: string;
  status: ProjectStatus;
  ownerId: string | null;
  startDate: string | null;
  targetCloseDate: string | null;
  departmentIds: string[];
  /** People staffed on the production at creation time. */
  assignments: {
    personId: string;
    departmentId: string;
    jobTitle: string;
    isHead: boolean;
  }[];
  actorId: string;
};


/** Every production in this build is Lancaster; venue stays in the schema only. */
const LANCASTER = "Lancaster, PA";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "production"
  );
}

/** Creates a production, files it under the chosen departments, and returns its id. */
export async function writeProduction(input: NewProductionInput): Promise<string> {
  const base = slugify(input.name);
  const { data: taken } = await supabase.from("projects").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i += 1) slug = `${base}-${i}`;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name.trim(),
      slug,
      venue: LANCASTER,
      status: input.status,
      owner_id: input.ownerId || null,
      start_date: input.startDate || null,
      target_close_date: input.targetCloseDate || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.departmentIds.length > 0) {
    const { error: deptError } = await supabase.from("project_departments").insert(
      input.departmentIds.map((department_id) => ({
        project_id: data.id,
        department_id,
        default_owner_id:
          input.assignments.find((a) => a.departmentId === department_id && a.isHead)?.personId ??
          null,
      })),
    );
    if (deptError) throw new Error(deptError.message);
  }

  const staffing = input.assignments.filter((a) => input.departmentIds.includes(a.departmentId));
  if (staffing.length > 0) {
    const { error: staffError } = await supabase.from("project_assignments").insert(
      staffing.map((a) => ({
        project_id: data.id,
        person_id: a.personId,
        department_id: a.departmentId,
        job_title: a.jobTitle || "Team Member",
        is_head: a.isHead,
      })),
    );
    if (staffError) throw new Error(staffError.message);
  }

  await recordAudit("project", data.id, input.actorId, "created", {
    name: input.name.trim(),
    status: input.status,
    departments: input.departmentIds.length,
    team_members: staffing.length,
  });

  return data.id;
}

/* ------------------------------------------------------------------ scenes */

/** Adds a scene to a production and returns its id. */
export async function writeScene(
  projectId: string,
  name: string,
  actorId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("scenes")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("scenes")
    .insert({ project_id: projectId, name: name.trim(), sort_order: nextOrder })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "scene_added", { name: name.trim() });
  return data.id;
}

/** Renames a scene. */
export async function writeSceneName(
  sceneId: string,
  projectId: string,
  name: string,
  actorId: string,
) {
  const { error } = await supabase
    .from("scenes")
    .update({ name: name.trim() })
    .eq("id", sceneId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "scene_renamed", { name: name.trim() });
}

/**
 * Removes a set. Every work item belongs to a set, so a set still holding work
 * cannot be removed — that work has to be moved or deleted first.
 */
export async function removeScene(sceneId: string, projectId: string, actorId: string) {
  const { count: held, error: heldError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("scene_id", sceneId);
  if (heldError) throw new Error(heldError.message);
  if ((held ?? 0) > 0)
    throw new Error(
      "This set still has work items. Move them to another set or delete them first.",
    );
  const cleared = await Promise.all([
    supabase.from("documents").update({ scene_id: null }).eq("scene_id", sceneId),
    // Sets that followed this one in the chain now follow nothing.
    supabase
      .from("scenes")
      .update({ depends_on_scene_id: null })
      .eq("depends_on_scene_id", sceneId),
    supabase.from("project_assignments").delete().eq("scene_id", sceneId),
  ]);
  for (const r of cleared) if (r.error) throw new Error(r.error.message);
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "scene_removed", { scene_id: sceneId });
}

/** Updates one set's lead, status, committed dates, or place in the chain. */
export async function writeSceneFields(
  sceneId: string,
  projectId: string,
  fields: {
    owner_id?: string | null;
    status?: SetStatus;
    start_date?: string | null;
    due_date?: string | null;
    depends_on_scene_id?: string | null;
    lag_days?: number;
  },
  actorId: string,
) {
  const patch: {
    owner_id?: string | null;
    status?: string;
    start_date?: string | null;
    due_date?: string | null;
    depends_on_scene_id?: string | null;
    lag_days?: number;
  } = {};
  if ("owner_id" in fields) patch['owner_id'] = fields.owner_id || null;
  if (fields.status) patch['status'] = fields.status;
  if ("start_date" in fields) patch['start_date'] = fields.start_date || null;
  if ("due_date" in fields) patch['due_date'] = fields.due_date || null;
  if ("depends_on_scene_id" in fields)
    patch['depends_on_scene_id'] = fields.depends_on_scene_id || null;
  if (typeof fields.lag_days === "number") patch['lag_days'] = fields.lag_days;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("scenes").update(patch).eq("id", sceneId);
  if (error) throw new Error(error.message);
  await recordAudit("project", projectId, actorId, "scene_updated", { scene_id: sceneId, ...patch });
}

/** Moves a set up or down in the running order by swapping with its neighbour. */
export async function writeSceneOrder(
  sceneId: string,
  neighbourId: string,
  projectId: string,
  actorId: string,
) {
  const { data, error: readError } = await supabase
    .from("scenes")
    .select("id, sort_order")
    .in("id", [sceneId, neighbourId]);
  if (readError) throw new Error(readError.message);
  const a = data?.find((r) => r.id === sceneId);
  const b = data?.find((r) => r.id === neighbourId);
  if (!a || !b) return;
  const updates = await Promise.all([
    supabase.from("scenes").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("scenes").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
  for (const u of updates) if (u.error) throw new Error(u.error.message);
  await recordAudit("project", projectId, actorId, "scene_reordered", { scene_id: sceneId });
}
