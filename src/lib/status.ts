import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  FileEdit,
  PauseCircle,
  Play,
  Timer,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type {
  ApprovalState,
  Criticality,
  DependencyType,
  MilestoneStatus,
  ProjectDepartment,
  ProjectStatus,
  TaskStatus,
} from "./production-data";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusMeta = { label: string; tone: Tone; Icon: LucideIcon };

export const projectStatusMeta: Record<ProjectStatus, StatusMeta> = {
  planning: { label: "Planning", tone: "info", Icon: FileEdit },
  active: { label: "Active", tone: "success", Icon: Play },
  on_hold: { label: "On hold", tone: "warning", Icon: PauseCircle },
  closed: { label: "Closed", tone: "neutral", Icon: CheckCircle2 },
};

export const milestoneStatusMeta: Record<MilestoneStatus, StatusMeta> = {
  not_started: { label: "Not started", tone: "neutral", Icon: CircleDashed },
  in_progress: { label: "In progress", tone: "info", Icon: Play },
  at_risk: { label: "At risk", tone: "warning", Icon: AlertTriangle },
  complete: { label: "Complete", tone: "success", Icon: CheckCircle2 },
};

export const taskStatusMeta: Record<TaskStatus, StatusMeta> = {
  not_started: { label: "Not started", tone: "neutral", Icon: CircleDashed },
  in_progress: { label: "In progress", tone: "info", Icon: Play },
  in_review: { label: "In review", tone: "info", Icon: Eye },
  blocked: { label: "Blocked", tone: "danger", Icon: Ban },
  complete: { label: "Complete", tone: "success", Icon: CheckCircle2 },
};

export const approvalStateMeta: Record<ApprovalState, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral", Icon: FileEdit },
  in_review: { label: "In review", tone: "info", Icon: Clock },
  approved: { label: "Approved", tone: "success", Icon: CheckCircle2 },
  changes_requested: { label: "Changes requested", tone: "warning", Icon: AlertTriangle },
  rejected: { label: "Rejected", tone: "danger", Icon: XCircle },
};

export const readinessMeta: Record<ProjectDepartment["readiness"], StatusMeta> = {
  on_track: { label: "On track", tone: "success", Icon: CheckCircle2 },
  at_risk: { label: "At risk", tone: "warning", Icon: AlertTriangle },
  blocked: { label: "Blocked", tone: "danger", Icon: Ban },
  complete: { label: "Complete", tone: "neutral", Icon: CheckCircle2 },
};

/** Where a set stands as a whole; rolled up from the work tied to it. */
export const setStatusMeta = {
  not_started: { label: "Not started", tone: "neutral", Icon: CircleDashed },
  in_progress: { label: "In progress", tone: "info", Icon: Play },
  blocked: { label: "Blocked", tone: "danger", Icon: Ban },
  complete: { label: "Complete", tone: "success", Icon: CheckCircle2 },
} satisfies Record<string, StatusMeta>;

/** How tight an item's spare time is, straight from the shared schedule calculation. */
export const criticalityMeta: Record<Criticality, StatusMeta> = {
  critical: { label: "Critical path", tone: "danger", Icon: Zap },
  near_critical: { label: "Little slack", tone: "warning", Icon: Timer },
  normal: { label: "Has slack", tone: "neutral", Icon: CircleDashed },
};

export const dependencyTypeLabel: Record<DependencyType, string> = {
  finish_to_start: "Finish → Start",
  start_to_start: "Start → Start",
  finish_to_finish: "Finish → Finish",
  start_to_finish: "Start → Finish",
};

/** Turns hours of spare time into something a person can read. */
export function formatFloat(hours: number | null): string {
  if (hours === null) return "Not calculated";
  if (hours <= 0) return "No spare time";
  const days = Math.round(hours / 24);
  if (days < 1) return `${Math.round(hours)} hr spare`;
  return `${days} day${days === 1 ? "" : "s"} spare`;
}

export const toneClasses: Record<Tone, string> = {
  success: "bg-success-bg text-success border-success/45 font-semibold",
  warning: "bg-warning-bg text-warning border-warning/45 font-semibold",
  danger: "bg-danger-bg text-danger border-danger/45 font-semibold",
  info: "bg-info-bg text-info border-info/45 font-semibold",
  neutral: "bg-cream text-ink-soft border-ink-soft/35 font-semibold",
};

/** Shown wherever a date simply has not been committed yet. */
export const NO_DATE = "No date set";

function parseDay(value: string): Date | null {
  const date = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined, fallback = NO_DATE): string {
  if (!value) return fallback;
  const date = parseDay(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string | null | undefined, fallback = NO_DATE): string {
  if (!value) return fallback;
  const date = parseDay(value);
  if (!date) return fallback;
  // A date-only value carries no real time of day, so don't invent "12:00 AM".
  if (value.length <= 10) return formatDate(value, fallback);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ *
 * One place decides how a work item's schedule health reads, so a late
 * or blocked item can never also be presented as comfortably slack.
 * ------------------------------------------------------------------ */

export type ScheduleHealth = {
  /** The single dominant badge: Blocked → Late → Complete → tightness. */
  meta: StatusMeta;
  /** Supporting line; empty when it would repeat the badge. */
  detail: string;
  /** True when the item is behind or blocked — never show it as healthy. */
  urgent: boolean;
  lateDays: number;
};

const DAY = 24 * 60 * 60 * 1000;

export function scheduleHealth(
  item: {
    status?: TaskStatus;
    due_date?: string | null;
    forecast_finish?: string | null;
    criticality?: Criticality;
    total_float_hours?: number | null;
  },
  today: Date = new Date(),
): ScheduleHealth {
  const target = item.forecast_finish || item.due_date || null;
  const parsed = target ? parseDay(target) : null;
  const lateDays =
    parsed && item.status !== "complete"
      ? Math.max(0, Math.floor((today.getTime() - parsed.getTime()) / DAY))
      : 0;

  if (item.status === "complete") {
    return { meta: taskStatusMeta.complete, detail: "", urgent: false, lateDays: 0 };
  }
  if (item.status === "blocked") {
    return {
      meta: taskStatusMeta.blocked,
      detail: lateDays > 0 ? `Late by ${lateDays} day${lateDays === 1 ? "" : "s"}` : "Waiting on other work",
      urgent: true,
      lateDays,
    };
  }
  if (lateDays > 0) {
    return {
      meta: { label: `Late by ${lateDays} day${lateDays === 1 ? "" : "s"}`, tone: "danger", Icon: AlertTriangle },
      detail: item.criticality === "critical" ? "On the critical path" : "",
      urgent: true,
      lateDays,
    };
  }
  const criticality = item.criticality ?? "normal";
  const meta = criticalityMeta[criticality];
  const spare = item.total_float_hours ?? null;
  return {
    meta,
    detail: criticality === "normal" && spare !== null && spare > 0 ? formatFloat(spare) : "",
    urgent: false,
    lateDays: 0,
  };
}


/** Sorts by a date, keeping items with no date at the end of the list. */
export function byDateAsc<T>(pick: (item: T) => string | null | undefined) {
  return (a: T, b: T) => {
    const x = pick(a) || "";
    const y = pick(b) || "";
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x.localeCompare(y);
  };
}
