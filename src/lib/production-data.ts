/**
 * Stand-in data for the leadership demo, shaped exactly like the tables in the
 * "Sight and Sound" Supabase project (ref zqrotlehxgeztrukddck):
 * people, departments, department_memberships, projects, project_departments,
 * milestones, tasks, task_dependencies, documents, document_versions,
 * approvals, discussion_threads, comments, mentions, notifications, audit_log.
 *
 * When the Supabase connector is authorized, replace the exported seed with
 * server-function reads of the same row shapes; nothing else needs to change.
 */

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
export type Venue = "Lancaster, PA" | "Branson, MO";

export type Project = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  status: ProjectStatus;
  venue: Venue;
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

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  status: MilestoneStatus;
  owner_id: string;
  department_id: string;
  is_core: boolean;
};

export type TaskStatus = "not_started" | "in_progress" | "in_review" | "blocked" | "complete";

export type Task = {
  id: string;
  project_id: string;
  milestone_id: string;
  title: string;
  status: TaskStatus;
  due_date: string;
  assignee_id: string;
  department_id: string;
};

export type TaskDependency = {
  task_id: string;
  depends_on_task_id: string;
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
};

export type AuditEntry = {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  created_at: string;
};

/* ---------------------------------------------------------------- departments */

export const departments: Department[] = [
  { id: "dep-art", name: "Art", code: "ART", owner_id: "per-arden", lead_ids: ["per-nina"] },
  {
    id: "dep-eng",
    name: "Engineering",
    code: "ENG",
    owner_id: "per-hollis",
    lead_ids: ["per-teague"],
  },
  {
    id: "dep-cos",
    name: "Costumes",
    code: "COS",
    owner_id: "per-marisol",
    lead_ids: ["per-devi"],
  },
  { id: "dep-lig", name: "Lighting", code: "LIG", owner_id: "per-owen", lead_ids: ["per-jae"] },
  { id: "dep-ani", name: "Animals", code: "ANI", owner_id: "per-ruthann", lead_ids: [] },
  { id: "dep-shp", name: "Shop", code: "SHP", owner_id: "per-cal", lead_ids: ["per-brett"] },
  {
    id: "dep-eff",
    name: "Electronics & Effects",
    code: "EFF",
    owner_id: "per-simone",
    lead_ids: ["per-abe"],
  },
];

/* -------------------------------------------------------------------- people */

export const people: Person[] = [
  {
    id: "per-arden",
    full_name: "Arden Fisk",
    title: "Art Director",
    email: "afisk@sight-sound.demo",
    primary_department_id: "dep-art",
    role: "admin",
  },
  {
    id: "per-nina",
    full_name: "Nina Volkov",
    title: "Scenic Lead",
    email: "nvolkov@sight-sound.demo",
    primary_department_id: "dep-art",
    role: "contributor",
  },
  {
    id: "per-hollis",
    full_name: "Hollis Baird",
    title: "Engineering Director",
    email: "hbaird@sight-sound.demo",
    primary_department_id: "dep-eng",
    role: "admin",
  },
  {
    id: "per-teague",
    full_name: "Teague Ramos",
    title: "Automation Lead",
    email: "tramos@sight-sound.demo",
    primary_department_id: "dep-eng",
    role: "contributor",
  },
  {
    id: "per-marisol",
    full_name: "Marisol Vance",
    title: "Costume Director",
    email: "mvance@sight-sound.demo",
    primary_department_id: "dep-cos",
    role: "contributor",
  },
  {
    id: "per-devi",
    full_name: "Devi Chandran",
    title: "Cutter / Draper Lead",
    email: "dchandran@sight-sound.demo",
    primary_department_id: "dep-cos",
    role: "contributor",
  },
  {
    id: "per-owen",
    full_name: "Owen Pryce",
    title: "Lighting Director",
    email: "opryce@sight-sound.demo",
    primary_department_id: "dep-lig",
    role: "contributor",
  },
  {
    id: "per-jae",
    full_name: "Jae Sung Park",
    title: "Programming Lead",
    email: "jpark@sight-sound.demo",
    primary_department_id: "dep-lig",
    role: "contributor",
  },
  {
    id: "per-ruthann",
    full_name: "Ruth Ann Kepler",
    title: "Animal Program Director",
    email: "rkepler@sight-sound.demo",
    primary_department_id: "dep-ani",
    role: "contributor",
  },
  {
    id: "per-cal",
    full_name: "Cal Wentworth",
    title: "Shop Superintendent",
    email: "cwentworth@sight-sound.demo",
    primary_department_id: "dep-shp",
    role: "contributor",
  },
  {
    id: "per-brett",
    full_name: "Brett Muzzarelli",
    title: "Carpentry Lead",
    email: "bmuzzarelli@sight-sound.demo",
    primary_department_id: "dep-shp",
    role: "contributor",
  },
  {
    id: "per-simone",
    full_name: "Simone Ledger",
    title: "Effects Director",
    email: "sledger@sight-sound.demo",
    primary_department_id: "dep-eff",
    role: "contributor",
  },
  {
    id: "per-abe",
    full_name: "Abe Trundle",
    title: "Controls Lead",
    email: "atrundle@sight-sound.demo",
    primary_department_id: "dep-eff",
    role: "contributor",
  },
  {
    id: "per-lyle",
    full_name: "Lyle Hartman",
    title: "Executive Producer",
    email: "lhartman@sight-sound.demo",
    primary_department_id: "dep-art",
    role: "viewer",
  },
];

/* ------------------------------------------------------------------ projects */

export const projects: Project[] = [
  {
    id: "prj-prodigal",
    code: "PR-27",
    name: "The Prodigal's Return",
    subtitle: "New production build — Main Stage",
    status: "active",
    venue: "Lancaster, PA",
    owner_id: "per-arden",
    opening_date: "2027-03-12",
    first_rehearsal_date: "2027-01-18",
    design_lock_date: "2026-10-30",
    portal_url: "https://portal.sight-sound.demo/sets/prodigal-return",
    summary:
      "Full new build for the Lancaster main stage: three-level revolve, live animal entrances through house left, and a practical harvest-fire effect in Act II.",
  },
  {
    id: "prj-kings",
    code: "KK-28",
    name: "Kings & Kingdoms",
    subtitle: "Branson adaptation — planning phase",
    status: "planning",
    venue: "Branson, MO",
    owner_id: "per-hollis",
    opening_date: "2028-04-07",
    first_rehearsal_date: "2028-02-14",
    design_lock_date: "2027-06-18",
    portal_url: "https://portal.sight-sound.demo/sets/kings-kingdoms",
    summary:
      "Adapting the Lancaster staging to the Branson house: reduced fly capacity, new throne platform geometry, and a shortened animal path.",
  },
  {
    id: "prj-ruth",
    code: "RU-25",
    name: "Ruth: A Harvest Story",
    subtitle: "Closed — archived for reference",
    status: "closed",
    venue: "Lancaster, PA",
    owner_id: "per-marisol",
    opening_date: "2025-03-15",
    first_rehearsal_date: "2025-01-20",
    design_lock_date: "2024-10-11",
    portal_url: "https://portal.sight-sound.demo/sets/ruth-harvest",
    summary:
      "Closed production retained as a reference build. Harvest field decking and the barley-field lighting plot are reused on The Prodigal's Return.",
  },
];

export const projectDepartments: ProjectDepartment[] = [
  {
    project_id: "prj-prodigal",
    department_id: "dep-art",
    readiness: "on_track",
    note: "Act II elevations out for review",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-eng",
    readiness: "at_risk",
    note: "Revolve bearing lead time slipped two weeks",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-cos",
    readiness: "on_track",
    note: "Principal fittings scheduled",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-lig",
    readiness: "on_track",
    note: "Plot 60% drafted",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-ani",
    readiness: "blocked",
    note: "Waiting on final house-left path clearance",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-shp",
    readiness: "on_track",
    note: "Deck framing in build",
  },
  {
    project_id: "prj-prodigal",
    department_id: "dep-eff",
    readiness: "at_risk",
    note: "Harvest-fire effect needs a second burn test",
  },
  {
    project_id: "prj-kings",
    department_id: "dep-art",
    readiness: "on_track",
    note: "Concept package started",
  },
  {
    project_id: "prj-kings",
    department_id: "dep-eng",
    readiness: "on_track",
    note: "House survey complete",
  },
  {
    project_id: "prj-kings",
    department_id: "dep-lig",
    readiness: "on_track",
    note: "Inventory reconciliation underway",
  },
  {
    project_id: "prj-kings",
    department_id: "dep-ani",
    readiness: "on_track",
    note: "Path study drafted",
  },
  {
    project_id: "prj-kings",
    department_id: "dep-shp",
    readiness: "on_track",
    note: "Capacity held for Q3",
  },
  {
    project_id: "prj-ruth",
    department_id: "dep-art",
    readiness: "complete",
    note: "Archived",
  },
  {
    project_id: "prj-ruth",
    department_id: "dep-cos",
    readiness: "complete",
    note: "Stock returned to wardrobe",
  },
  {
    project_id: "prj-ruth",
    department_id: "dep-lig",
    readiness: "complete",
    note: "Plot archived for reuse",
  },
  {
    project_id: "prj-ruth",
    department_id: "dep-shp",
    readiness: "complete",
    note: "Deck stored in Barn 3",
  },
];

/* ---------------------------------------------------------------- milestones */

export const milestones: Milestone[] = [
  {
    id: "mil-p1",
    project_id: "prj-prodigal",
    name: "Design lock — Act I & II",
    due_date: "2026-10-30",
    status: "in_progress",
    owner_id: "per-arden",
    department_id: "dep-art",
    is_core: true,
  },
  {
    id: "mil-p2",
    project_id: "prj-prodigal",
    name: "Revolve engineering sign-off",
    due_date: "2026-11-20",
    status: "at_risk",
    owner_id: "per-hollis",
    department_id: "dep-eng",
    is_core: true,
  },
  {
    id: "mil-p3",
    project_id: "prj-prodigal",
    name: "Shop build start — deck & levels",
    due_date: "2026-12-08",
    status: "not_started",
    owner_id: "per-cal",
    department_id: "dep-shp",
    is_core: true,
  },
  {
    id: "mil-p4",
    project_id: "prj-prodigal",
    name: "Animal path clearance & training plan",
    due_date: "2026-12-15",
    status: "at_risk",
    owner_id: "per-ruthann",
    department_id: "dep-ani",
    is_core: false,
  },
  {
    id: "mil-p5",
    project_id: "prj-prodigal",
    name: "First rehearsal readiness",
    due_date: "2027-01-18",
    status: "not_started",
    owner_id: "per-arden",
    department_id: "dep-art",
    is_core: true,
  },
  {
    id: "mil-p6",
    project_id: "prj-prodigal",
    name: "Opening night",
    due_date: "2027-03-12",
    status: "not_started",
    owner_id: "per-arden",
    department_id: "dep-art",
    is_core: true,
  },
  {
    id: "mil-k1",
    project_id: "prj-kings",
    name: "Branson house survey review",
    due_date: "2027-02-26",
    status: "complete",
    owner_id: "per-hollis",
    department_id: "dep-eng",
    is_core: true,
  },
  {
    id: "mil-k2",
    project_id: "prj-kings",
    name: "Concept package approval",
    due_date: "2027-04-16",
    status: "in_progress",
    owner_id: "per-arden",
    department_id: "dep-art",
    is_core: true,
  },
  {
    id: "mil-k3",
    project_id: "prj-kings",
    name: "Design lock",
    due_date: "2027-06-18",
    status: "not_started",
    owner_id: "per-arden",
    department_id: "dep-art",
    is_core: true,
  },
  {
    id: "mil-r1",
    project_id: "prj-ruth",
    name: "Opening night",
    due_date: "2025-03-15",
    status: "complete",
    owner_id: "per-marisol",
    department_id: "dep-cos",
    is_core: true,
  },
  {
    id: "mil-r2",
    project_id: "prj-ruth",
    name: "Strike & archive",
    due_date: "2025-11-02",
    status: "complete",
    owner_id: "per-cal",
    department_id: "dep-shp",
    is_core: true,
  },
];

/* --------------------------------------------------------------------- tasks */

export const tasks: Task[] = [
  {
    id: "tsk-p101",
    project_id: "prj-prodigal",
    milestone_id: "mil-p1",
    title: "Act II elevations — house-left barn wall",
    status: "in_review",
    due_date: "2026-10-16",
    assignee_id: "per-nina",
    department_id: "dep-art",
  },
  {
    id: "tsk-p102",
    project_id: "prj-prodigal",
    milestone_id: "mil-p1",
    title: "Paint elevations for harvest field decking",
    status: "in_progress",
    due_date: "2026-10-23",
    assignee_id: "per-nina",
    department_id: "dep-art",
  },
  {
    id: "tsk-p103",
    project_id: "prj-prodigal",
    milestone_id: "mil-p2",
    title: "Revolve bearing load calculations",
    status: "in_progress",
    due_date: "2026-11-06",
    assignee_id: "per-teague",
    department_id: "dep-eng",
  },
  {
    id: "tsk-p104",
    project_id: "prj-prodigal",
    milestone_id: "mil-p2",
    title: "Automation cue list — three-level lift",
    status: "blocked",
    due_date: "2026-11-13",
    assignee_id: "per-teague",
    department_id: "dep-eng",
  },
  {
    id: "tsk-p105",
    project_id: "prj-prodigal",
    milestone_id: "mil-p3",
    title: "Deck framing package to Shop",
    status: "not_started",
    due_date: "2026-12-01",
    assignee_id: "per-brett",
    department_id: "dep-shp",
  },
  {
    id: "tsk-p106",
    project_id: "prj-prodigal",
    milestone_id: "mil-p4",
    title: "House-left path clearance walk with Engineering",
    status: "blocked",
    due_date: "2026-11-24",
    assignee_id: "per-ruthann",
    department_id: "dep-ani",
  },
  {
    id: "tsk-p107",
    project_id: "prj-prodigal",
    milestone_id: "mil-p5",
    title: "Harvest-fire effect second burn test",
    status: "in_progress",
    due_date: "2026-12-18",
    assignee_id: "per-simone",
    department_id: "dep-eff",
  },
  {
    id: "tsk-p108",
    project_id: "prj-prodigal",
    milestone_id: "mil-p5",
    title: "Principal costume fittings — Act I",
    status: "not_started",
    due_date: "2027-01-09",
    assignee_id: "per-devi",
    department_id: "dep-cos",
  },
  {
    id: "tsk-p109",
    project_id: "prj-prodigal",
    milestone_id: "mil-p5",
    title: "Lighting plot draft — barley field looks",
    status: "in_progress",
    due_date: "2026-12-22",
    assignee_id: "per-jae",
    department_id: "dep-lig",
  },
  {
    id: "tsk-p110",
    project_id: "prj-prodigal",
    milestone_id: "mil-p1",
    title: "Reference pull from Ruth harvest decking",
    status: "complete",
    due_date: "2026-09-30",
    assignee_id: "per-nina",
    department_id: "dep-art",
  },
  {
    id: "tsk-k101",
    project_id: "prj-kings",
    milestone_id: "mil-k2",
    title: "Throne platform geometry study",
    status: "in_progress",
    due_date: "2027-03-19",
    assignee_id: "per-teague",
    department_id: "dep-eng",
  },
  {
    id: "tsk-k102",
    project_id: "prj-kings",
    milestone_id: "mil-k2",
    title: "Concept boards — royal court",
    status: "in_review",
    due_date: "2027-03-26",
    assignee_id: "per-nina",
    department_id: "dep-art",
  },
  {
    id: "tsk-k103",
    project_id: "prj-kings",
    milestone_id: "mil-k3",
    title: "Reduced fly capacity impact list",
    status: "not_started",
    due_date: "2027-05-14",
    assignee_id: "per-hollis",
    department_id: "dep-eng",
  },
  {
    id: "tsk-r101",
    project_id: "prj-ruth",
    milestone_id: "mil-r2",
    title: "Archive lighting plot for reuse",
    status: "complete",
    due_date: "2025-10-24",
    assignee_id: "per-jae",
    department_id: "dep-lig",
  },
  {
    id: "tsk-r102",
    project_id: "prj-ruth",
    milestone_id: "mil-r2",
    title: "Return wardrobe stock",
    status: "complete",
    due_date: "2025-10-30",
    assignee_id: "per-devi",
    department_id: "dep-cos",
  },
];

export const taskDependencies: TaskDependency[] = [
  { task_id: "tsk-p104", depends_on_task_id: "tsk-p103" },
  { task_id: "tsk-p105", depends_on_task_id: "tsk-p101" },
  { task_id: "tsk-p105", depends_on_task_id: "tsk-p103" },
  { task_id: "tsk-p106", depends_on_task_id: "tsk-p104" },
  { task_id: "tsk-p107", depends_on_task_id: "tsk-p102" },
  { task_id: "tsk-p109", depends_on_task_id: "tsk-p102" },
  { task_id: "tsk-k103", depends_on_task_id: "tsk-k101" },
];

/* ----------------------------------------------------------------- documents */

export const documents: Document[] = [
  {
    id: "doc-p1",
    project_id: "prj-prodigal",
    title: "Act II Scenic Elevations",
    kind: "Drawing set",
    department_id: "dep-art",
    owner_id: "per-nina",
    approval_state: "in_review",
    current_version: 3,
    updated_at: "2026-10-14",
  },
  {
    id: "doc-p2",
    project_id: "prj-prodigal",
    title: "Revolve Structural Calculations",
    kind: "Engineering package",
    department_id: "dep-eng",
    owner_id: "per-teague",
    approval_state: "changes_requested",
    current_version: 2,
    updated_at: "2026-10-09",
  },
  {
    id: "doc-p3",
    project_id: "prj-prodigal",
    title: "Harvest-Fire Effect Safety Plan",
    kind: "Safety document",
    department_id: "dep-eff",
    owner_id: "per-simone",
    approval_state: "draft",
    current_version: 1,
    updated_at: "2026-10-12",
  },
  {
    id: "doc-p4",
    project_id: "prj-prodigal",
    title: "House-Left Animal Path Layout",
    kind: "Layout",
    department_id: "dep-ani",
    owner_id: "per-ruthann",
    approval_state: "in_review",
    current_version: 2,
    updated_at: "2026-10-15",
  },
  {
    id: "doc-p5",
    project_id: "prj-prodigal",
    title: "Deck Framing Package",
    kind: "Shop drawings",
    department_id: "dep-shp",
    owner_id: "per-brett",
    approval_state: "approved",
    current_version: 4,
    updated_at: "2026-10-02",
  },
  {
    id: "doc-k1",
    project_id: "prj-kings",
    title: "Branson House Survey Report",
    kind: "Survey",
    department_id: "dep-eng",
    owner_id: "per-hollis",
    approval_state: "approved",
    current_version: 1,
    updated_at: "2027-02-24",
  },
  {
    id: "doc-k2",
    project_id: "prj-kings",
    title: "Royal Court Concept Boards",
    kind: "Concept package",
    department_id: "dep-art",
    owner_id: "per-nina",
    approval_state: "in_review",
    current_version: 2,
    updated_at: "2027-03-22",
  },
  {
    id: "doc-r1",
    project_id: "prj-ruth",
    title: "Barley Field Lighting Plot (archived)",
    kind: "Lighting plot",
    department_id: "dep-lig",
    owner_id: "per-jae",
    approval_state: "approved",
    current_version: 6,
    updated_at: "2025-10-24",
  },
];

export const documentVersions: DocumentVersion[] = [
  {
    id: "dv-p1-1",
    document_id: "doc-p1",
    version: 1,
    uploaded_by_id: "per-nina",
    uploaded_at: "2026-09-18",
    note: "First pass, barn wall only",
    file_label: "act2-elevations-v1.pdf",
  },
  {
    id: "dv-p1-2",
    document_id: "doc-p1",
    version: 2,
    uploaded_by_id: "per-nina",
    uploaded_at: "2026-10-02",
    note: "Added harvest field decking",
    file_label: "act2-elevations-v2.pdf",
  },
  {
    id: "dv-p1-3",
    document_id: "doc-p1",
    version: 3,
    uploaded_by_id: "per-nina",
    uploaded_at: "2026-10-14",
    note: "Revised sightlines per Engineering walk",
    file_label: "act2-elevations-v3.pdf",
  },
  {
    id: "dv-p2-1",
    document_id: "doc-p2",
    version: 1,
    uploaded_by_id: "per-teague",
    uploaded_at: "2026-09-25",
    note: "Initial load case set",
    file_label: "revolve-calcs-v1.pdf",
  },
  {
    id: "dv-p2-2",
    document_id: "doc-p2",
    version: 2,
    uploaded_by_id: "per-teague",
    uploaded_at: "2026-10-09",
    note: "Updated bearing spec after lead-time change",
    file_label: "revolve-calcs-v2.pdf",
  },
  {
    id: "dv-p3-1",
    document_id: "doc-p3",
    version: 1,
    uploaded_by_id: "per-simone",
    uploaded_at: "2026-10-12",
    note: "Draft for internal read-through",
    file_label: "harvest-fire-safety-v1.pdf",
  },
  {
    id: "dv-p4-1",
    document_id: "doc-p4",
    version: 1,
    uploaded_by_id: "per-ruthann",
    uploaded_at: "2026-09-29",
    note: "Path option A",
    file_label: "animal-path-v1.pdf",
  },
  {
    id: "dv-p4-2",
    document_id: "doc-p4",
    version: 2,
    uploaded_by_id: "per-ruthann",
    uploaded_at: "2026-10-15",
    note: "Path option B with wider turn radius",
    file_label: "animal-path-v2.pdf",
  },
  {
    id: "dv-p5-4",
    document_id: "doc-p5",
    version: 4,
    uploaded_by_id: "per-brett",
    uploaded_at: "2026-10-02",
    note: "Approved for build",
    file_label: "deck-framing-v4.pdf",
  },
  {
    id: "dv-k1-1",
    document_id: "doc-k1",
    version: 1,
    uploaded_by_id: "per-hollis",
    uploaded_at: "2027-02-24",
    note: "Survey with fly capacity notes",
    file_label: "branson-survey-v1.pdf",
  },
  {
    id: "dv-k2-2",
    document_id: "doc-k2",
    version: 2,
    uploaded_by_id: "per-nina",
    uploaded_at: "2027-03-22",
    note: "Second palette direction",
    file_label: "royal-court-boards-v2.pdf",
  },
  {
    id: "dv-r1-6",
    document_id: "doc-r1",
    version: 6,
    uploaded_by_id: "per-jae",
    uploaded_at: "2025-10-24",
    note: "Final as-built plot, archived",
    file_label: "barley-plot-v6.pdf",
  },
];

export const approvals: Approval[] = [
  {
    id: "apr-1",
    document_id: "doc-p1",
    version: 3,
    decision: "requested",
    actor_id: "per-nina",
    created_at: "2026-10-14",
    note: "Requested review from Engineering and Shop.",
  },
  {
    id: "apr-2",
    document_id: "doc-p2",
    version: 2,
    decision: "changes_requested",
    actor_id: "per-hollis",
    created_at: "2026-10-10",
    note: "Add the alternate bearing case before sign-off.",
  },
  {
    id: "apr-3",
    document_id: "doc-p5",
    version: 4,
    decision: "approved",
    actor_id: "per-hollis",
    created_at: "2026-10-03",
    note: "Cleared for build.",
  },
  {
    id: "apr-4",
    document_id: "doc-p4",
    version: 2,
    decision: "requested",
    actor_id: "per-ruthann",
    created_at: "2026-10-15",
    note: "Needs Engineering clearance on the turn radius.",
  },
  {
    id: "apr-5",
    document_id: "doc-k1",
    version: 1,
    decision: "approved",
    actor_id: "per-arden",
    created_at: "2027-02-25",
    note: "Survey accepted as the planning baseline.",
  },
  {
    id: "apr-6",
    document_id: "doc-k2",
    version: 2,
    decision: "requested",
    actor_id: "per-nina",
    created_at: "2027-03-22",
    note: "Review requested from Art and Lighting.",
  },
];

/* --------------------------------------------------------- discussions */

export const discussionThreads: DiscussionThread[] = [
  {
    id: "thr-p1",
    project_id: "prj-prodigal",
    context_type: "project",
    task_id: null,
    document_id: null,
    subject: "Weekly production sync notes",
    created_by_id: "per-arden",
    created_at: "2026-10-13",
  },
  {
    id: "thr-p2",
    project_id: "prj-prodigal",
    context_type: "project",
    task_id: null,
    document_id: null,
    subject: "Revolve lead time — what it changes downstream",
    created_by_id: "per-hollis",
    created_at: "2026-10-09",
  },
  {
    id: "thr-p3",
    project_id: "prj-prodigal",
    context_type: "task",
    task_id: "tsk-p106",
    document_id: null,
    subject: "House-left clearance walk scheduling",
    created_by_id: "per-ruthann",
    created_at: "2026-10-12",
  },
  {
    id: "thr-p4",
    project_id: "prj-prodigal",
    context_type: "task",
    task_id: "tsk-p107",
    document_id: null,
    subject: "Burn test window and who needs to attend",
    created_by_id: "per-simone",
    created_at: "2026-10-15",
  },
  {
    id: "thr-p5",
    project_id: "prj-prodigal",
    context_type: "document",
    task_id: null,
    document_id: "doc-p1",
    subject: "Sightline question on v3",
    created_by_id: "per-teague",
    created_at: "2026-10-15",
  },
  {
    id: "thr-p6",
    project_id: "prj-prodigal",
    context_type: "document",
    task_id: null,
    document_id: "doc-p2",
    subject: "Alternate bearing case",
    created_by_id: "per-hollis",
    created_at: "2026-10-10",
  },
  {
    id: "thr-k1",
    project_id: "prj-kings",
    context_type: "project",
    task_id: null,
    document_id: null,
    subject: "Branson adaptation kickoff",
    created_by_id: "per-hollis",
    created_at: "2027-02-27",
  },
  {
    id: "thr-k2",
    project_id: "prj-kings",
    context_type: "document",
    task_id: null,
    document_id: "doc-k2",
    subject: "Palette direction on the court boards",
    created_by_id: "per-arden",
    created_at: "2027-03-23",
  },
  {
    id: "thr-r1",
    project_id: "prj-ruth",
    context_type: "project",
    task_id: null,
    document_id: null,
    subject: "Closeout notes for future reference",
    created_by_id: "per-marisol",
    created_at: "2025-11-03",
  },
];

export const comments: Comment[] = [
  {
    id: "cmt-1",
    thread_id: "thr-p1",
    parent_comment_id: null,
    author_id: "per-arden",
    body: "Design lock is three weeks out. @Engineering @Shop — flag anything in the Act II package that would stop you from starting the deck build on schedule.",
    created_at: "2026-10-13T09:12:00Z",
  },
  {
    id: "cmt-2",
    thread_id: "thr-p1",
    parent_comment_id: "cmt-1",
    author_id: "per-hollis",
    body: "One thing: the bearing lead time slipped two weeks. Deck framing is unaffected, the revolve sign-off is what moves.",
    created_at: "2026-10-13T10:04:00Z",
  },
  {
    id: "cmt-3",
    thread_id: "thr-p1",
    parent_comment_id: "cmt-1",
    author_id: "per-cal",
    body: "Shop is clear as soon as the framing package lands. @Brett Muzzarelli has the crew held for the week of Dec 8.",
    created_at: "2026-10-13T11:20:00Z",
  },
  {
    id: "cmt-4",
    thread_id: "thr-p2",
    parent_comment_id: null,
    author_id: "per-hollis",
    body: "Two-week slip on the bearing. Sign-off moves to Nov 20 and I'd rather we all see it now than in December. @Art @Electronics & Effects, this touches your cue timing.",
    created_at: "2026-10-09T14:30:00Z",
  },
  {
    id: "cmt-5",
    thread_id: "thr-p2",
    parent_comment_id: "cmt-4",
    author_id: "per-simone",
    body: "Understood. The harvest-fire cue rides on the second level, so we'll hold the burn test until the lift timing is fixed.",
    created_at: "2026-10-09T15:02:00Z",
  },
  {
    id: "cmt-6",
    thread_id: "thr-p3",
    parent_comment_id: null,
    author_id: "per-ruthann",
    body: "I can't schedule the training plan until we walk the house-left path. @Engineering, can someone join us Tuesday morning?",
    created_at: "2026-10-12T08:45:00Z",
  },
  {
    id: "cmt-7",
    thread_id: "thr-p3",
    parent_comment_id: "cmt-6",
    author_id: "per-teague",
    body: "Tuesday works. I'll bring the lift timing so we can check the turn radius against the automation cue.",
    created_at: "2026-10-12T09:30:00Z",
  },
  {
    id: "cmt-8",
    thread_id: "thr-p4",
    parent_comment_id: null,
    author_id: "per-simone",
    body: "Burn test window is Dec 18, 7am, on the Lancaster stage. @Lighting @Animals — please have someone present, the smoke path affects both of you.",
    created_at: "2026-10-15T16:10:00Z",
  },
  {
    id: "cmt-9",
    thread_id: "thr-p5",
    parent_comment_id: null,
    author_id: "per-teague",
    body: "On v3 the barn wall reads two inches into the sightline from row C. @Nina Volkov is that dimension fixed or is there room?",
    created_at: "2026-10-15T13:22:00Z",
  },
  {
    id: "cmt-10",
    thread_id: "thr-p5",
    parent_comment_id: "cmt-9",
    author_id: "per-nina",
    body: "There's room. I'll pull it back and post v4 before the review closes.",
    created_at: "2026-10-15T13:48:00Z",
  },
  {
    id: "cmt-11",
    thread_id: "thr-p6",
    parent_comment_id: null,
    author_id: "per-hollis",
    body: "Requesting changes on v2 — add the alternate bearing case so we have a fallback if the lead time slips again.",
    created_at: "2026-10-10T07:55:00Z",
  },
  {
    id: "cmt-12",
    thread_id: "thr-k1",
    parent_comment_id: null,
    author_id: "per-hollis",
    body: "Survey is accepted. The two real constraints in Branson are fly capacity and the shorter animal path. @Art @Animals, plan around those from the start.",
    created_at: "2027-02-27T10:00:00Z",
  },
  {
    id: "cmt-13",
    thread_id: "thr-k2",
    parent_comment_id: null,
    author_id: "per-arden",
    body: "The second palette is closer. Warmer stone, less contrast in the court. @Lighting, does that hold up under the Branson rig?",
    created_at: "2027-03-23T09:15:00Z",
  },
  {
    id: "cmt-14",
    thread_id: "thr-r1",
    parent_comment_id: null,
    author_id: "per-marisol",
    body: "Closeout is done. Harvest decking and the barley plot are the two things worth reusing on The Prodigal's Return.",
    created_at: "2025-11-03T11:00:00Z",
  },
];

export const mentions: Mention[] = [
  { id: "mn-1", comment_id: "cmt-1", person_id: null, department_id: "dep-eng" },
  { id: "mn-2", comment_id: "cmt-1", person_id: null, department_id: "dep-shp" },
  { id: "mn-3", comment_id: "cmt-3", person_id: "per-brett", department_id: null },
  { id: "mn-4", comment_id: "cmt-4", person_id: null, department_id: "dep-art" },
  { id: "mn-5", comment_id: "cmt-4", person_id: null, department_id: "dep-eff" },
  { id: "mn-6", comment_id: "cmt-6", person_id: null, department_id: "dep-eng" },
  { id: "mn-7", comment_id: "cmt-8", person_id: null, department_id: "dep-lig" },
  { id: "mn-8", comment_id: "cmt-8", person_id: null, department_id: "dep-ani" },
  { id: "mn-9", comment_id: "cmt-9", person_id: "per-nina", department_id: null },
  { id: "mn-10", comment_id: "cmt-12", person_id: null, department_id: "dep-art" },
  { id: "mn-11", comment_id: "cmt-12", person_id: null, department_id: "dep-ani" },
  { id: "mn-12", comment_id: "cmt-13", person_id: null, department_id: "dep-lig" },
];

export const notifications: Notification[] = [
  {
    id: "ntf-1",
    project_id: "prj-prodigal",
    recipient_id: "per-hollis",
    kind: "mention",
    summary: "Arden Fisk mentioned Engineering in “Weekly production sync notes”",
    created_at: "2026-10-13T09:12:00Z",
    read: false,
  },
  {
    id: "ntf-2",
    project_id: "prj-prodigal",
    recipient_id: "per-teague",
    kind: "mention",
    summary: "Ruth Ann Kepler mentioned Engineering on “House-left path clearance walk”",
    created_at: "2026-10-12T08:45:00Z",
    read: false,
  },
  {
    id: "ntf-3",
    project_id: "prj-prodigal",
    recipient_id: "per-nina",
    kind: "approval",
    summary: "Review requested on Act II Scenic Elevations v3",
    created_at: "2026-10-14T15:00:00Z",
    read: false,
  },
  {
    id: "ntf-4",
    project_id: "prj-prodigal",
    recipient_id: "per-teague",
    kind: "approval",
    summary: "Changes requested on Revolve Structural Calculations v2",
    created_at: "2026-10-10T07:55:00Z",
    read: true,
  },
  {
    id: "ntf-5",
    project_id: "prj-prodigal",
    recipient_id: "per-simone",
    kind: "due_soon",
    summary: "Harvest-fire effect second burn test is due Dec 18",
    created_at: "2026-10-15T06:00:00Z",
    read: false,
  },
  {
    id: "ntf-6",
    project_id: "prj-kings",
    recipient_id: "per-owen",
    kind: "mention",
    summary: "Arden Fisk mentioned Lighting on the court boards",
    created_at: "2027-03-23T09:15:00Z",
    read: false,
  },
];

export const auditLog: AuditEntry[] = [
  {
    id: "aud-1",
    project_id: "prj-prodigal",
    actor_id: "per-nina",
    action: "Uploaded Act II Scenic Elevations v3",
    created_at: "2026-10-14T14:52:00Z",
  },
  {
    id: "aud-2",
    project_id: "prj-prodigal",
    actor_id: "per-ruthann",
    action: "Uploaded House-Left Animal Path Layout v2",
    created_at: "2026-10-15T08:30:00Z",
  },
  {
    id: "aud-3",
    project_id: "prj-prodigal",
    actor_id: "per-hollis",
    action: "Requested changes on Revolve Structural Calculations v2",
    created_at: "2026-10-10T07:55:00Z",
  },
  {
    id: "aud-4",
    project_id: "prj-prodigal",
    actor_id: "per-hollis",
    action: "Moved “Revolve engineering sign-off” to Nov 20",
    created_at: "2026-10-09T14:10:00Z",
  },
  {
    id: "aud-5",
    project_id: "prj-prodigal",
    actor_id: "per-teague",
    action: "Marked “Automation cue list — three-level lift” blocked",
    created_at: "2026-10-09T14:22:00Z",
  },
  {
    id: "aud-6",
    project_id: "prj-prodigal",
    actor_id: "per-cal",
    action: "Commented on “Weekly production sync notes”",
    created_at: "2026-10-13T11:20:00Z",
  },
  {
    id: "aud-7",
    project_id: "prj-kings",
    actor_id: "per-arden",
    action: "Approved Branson House Survey Report v1",
    created_at: "2027-02-25T10:12:00Z",
  },
  {
    id: "aud-8",
    project_id: "prj-ruth",
    actor_id: "per-cal",
    action: "Closed project and archived build",
    created_at: "2025-11-02T16:00:00Z",
  },
];
