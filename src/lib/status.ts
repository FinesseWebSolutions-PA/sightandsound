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
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  ApprovalState,
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

export const toneClasses: Record<Tone, string> = {
  success: "bg-success-bg text-success border-success/25",
  warning: "bg-warning-bg text-warning border-warning/25",
  danger: "bg-danger-bg text-danger border-danger/25",
  info: "bg-info-bg text-info border-info/25",
  neutral: "bg-neutral-status-bg text-ink-soft border-ink-soft/25",
};

export function formatDate(value: string): string {
  const date = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
