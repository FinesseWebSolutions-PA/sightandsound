import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Bell, CalendarDays, ExternalLink, FileText, ListChecks } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import {
  auditLog,
  departments,
  personById,
  projectDepartments,
  useStore,
} from "@/lib/store";
import {
  formatDate,
  formatDateTime,
  milestoneStatusMeta,
  readinessMeta,
  taskStatusMeta,
} from "@/lib/status";

export const Route = createFileRoute("/projects/$projectId/")({
  head: () => ({
    meta: [
      { title: "Production dashboard — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Status, owner, department readiness, key dates, open work, and recent activity for a single show-production build.",
      },
      { property: "og:title", content: "Production dashboard — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Status, department readiness, key dates, and open work for a show build.",
      },
    ],
  }),
  component: DashboardTab,
});

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border bg-cream-soft px-4 py-3">
        <Icon aria-hidden className="size-4 text-ink-soft" />
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DashboardTab() {
  const { projectId } = Route.useParams();
  const { projects, tasks, milestones, documents, notifications, can, setPortalUrl, isClosed } =
    useStore();

  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const [portalDraft, setPortalDraft] = useState(project.portal_url);
  const canEditPortal = can.adminConfig && !isClosed(projectId);


  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const openTasks = projectTasks
    .filter((t) => t.status !== "complete")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const upcoming = milestones
    .filter((m) => m.project_id === projectId && m.status !== "complete")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const activity = auditLog
    .filter((a) => a.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const notices = notifications.filter((n) => n.project_id === projectId);
  const pendingReview = documents.filter(
    (d) => d.project_id === projectId && d.approval_state === "in_review",
  );
  const involved = projectDepartments.filter((pd) => pd.project_id === projectId);

  return (
    <div className="space-y-6">
      <section className="surface-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
          <div>
            <p className="rule-label">Design lock</p>
            <p className="mt-1 text-lg text-ink">{formatDate(project.design_lock_date)}</p>
          </div>
          <div>
            <p className="rule-label">First rehearsal</p>
            <p className="mt-1 text-lg text-ink">{formatDate(project.first_rehearsal_date)}</p>
          </div>
          <div>
            <p className="rule-label">Opening</p>
            <p className="mt-1 text-lg text-ink">{formatDate(project.opening_date)}</p>
          </div>
          <div>
            <p className="rule-label">Open work</p>
            <p className="mt-1 text-lg text-ink">
              {openTasks.length} of {projectTasks.length} items
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-4xl text-sm leading-relaxed text-ink-soft">{project.summary}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Department readiness" icon={ListChecks}>
            <ul className="divide-y divide-border">
              {involved.map((pd) => {
                const dept = departments.find((d) => d.id === pd.department_id);
                return (
                  <li key={pd.department_id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-sm font-medium text-ink sm:min-w-40">{dept?.name}</span>
                      <StatusBadge meta={readinessMeta[pd.readiness]} size="sm" />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{pd.note}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Owner: {personById(dept?.owner_id ?? "")?.full_name}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Open work"
            icon={ListChecks}
            action={
              <Link
                to="/projects/$projectId/timeline"
                params={{ projectId }}
                className="text-xs font-semibold text-gold-deep hover:underline"
              >
                View timeline
              </Link>
            }
          >
            {/* Phones get a stacked list; the table appears once there is room for it. */}
            <ul className="divide-y divide-border sm:hidden">
              {openTasks.slice(0, 8).map((task) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {departments.find((d) => d.id === task.department_id)?.name} ·{" "}
                    {personById(task.assignee_id)?.full_name} · due {formatDate(task.due_date)}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                  </div>
                </li>
              ))}
              {openTasks.length === 0 && (
                <li className="py-2 text-sm text-ink-soft">
                  Nothing open — this production is complete.
                </li>
              )}
            </ul>

            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="rule-label pb-2">Item</th>
                  <th className="rule-label pb-2">Department</th>
                  <th className="rule-label pb-2">Team member</th>
                  <th className="rule-label pb-2">Due</th>
                  <th className="rule-label pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openTasks.slice(0, 8).map((task) => (
                  <tr key={task.id}>
                    <td className="py-2.5 pr-3 text-ink">{task.title}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {departments.find((d) => d.id === task.department_id)?.name}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {personById(task.assignee_id)?.full_name}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                      {formatDate(task.due_date)}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                    </td>
                  </tr>
                ))}
                {openTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-ink-soft">
                      Nothing open — this production is complete.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Recent activity" icon={Activity}>
            <ul className="space-y-3">
              {activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="font-medium text-ink">
                    {personById(entry.actor_id)?.full_name}
                  </span>{" "}
                  <span className="text-ink-soft">{entry.action}</span>
                  <span className="block text-xs text-ink-soft sm:inline sm:pl-2">
                    {formatDateTime(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Upcoming milestones" icon={CalendarDays}>
            <ul className="space-y-3">
              {upcoming.map((m) => (
                <li key={m.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{m.name}</span>
                    <span className="text-xs whitespace-nowrap text-ink-soft">
                      {formatDate(m.due_date)}
                    </span>
                  </div>
                  <StatusBadge meta={milestoneStatusMeta[m.status]} size="sm" />
                </li>
              ))}
              {upcoming.length === 0 && (
                <li className="text-sm text-ink-soft">All milestones complete.</li>
              )}
            </ul>
          </Panel>

          <Panel title="Notifications" icon={Bell}>
            <p className="text-sm text-ink-soft">
              {notices.filter((n) => !n.read).length} unread of {notices.length} on this
              production.
            </p>
            <ul className="mt-3 space-y-2.5">
              {notices.slice(0, 6).map((n) => (
                <li key={n.id} className="text-sm">
                  <span className="rule-label mr-2">{n.kind.replace("_", " ")}</span>
                  <span className={n.read ? "text-ink-soft" : "text-ink"}>{n.summary}</span>
                  <span className="block text-xs text-ink-soft">
                    To {personById(n.recipient_id)?.full_name}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Quick links" icon={FileText}>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/projects/$projectId/documents"
                  params={{ projectId }}
                  className="font-semibold text-gold-deep hover:underline"
                >
                  Documents &amp; versions
                </Link>
              </li>
              <li>
                <Link
                  to="/projects/$projectId/documents"
                  params={{ projectId }}
                  className="font-semibold text-gold-deep hover:underline"
                >
                  Approvals awaiting review ({pendingReview.length})
                </Link>
              </li>
              <li>
                <Link
                  to="/projects/$projectId/discussions"
                  params={{ projectId }}
                  className="font-semibold text-gold-deep hover:underline"
                >
                  Discussions
                </Link>
              </li>
              <li>
                <a
                  href={project.portal_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-gold-deep hover:underline"
                >
                  Portal (set simulation)
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
              </li>
            </ul>

            <div className="mt-4 border-t border-border pt-3">
              <label htmlFor="portal-url" className="rule-label">
                Portal (set simulation) link
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="portal-url"
                  type="url"
                  inputMode="url"
                  value={portalDraft}
                  onChange={(e) => setPortalDraft(e.target.value)}
                  disabled={!canEditPortal}
                  className="min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-2.5 text-base text-ink disabled:bg-muted disabled:text-ink-soft sm:flex-1 sm:text-xs"
                />
                {canEditPortal && (
                  <button
                    type="button"
                    onClick={() => setPortalUrl(projectId, portalDraft)}
                    className="min-h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft sm:text-xs"
                  >
                    Save
                  </button>
                )}
              </div>
              {!canEditPortal && (
                <p className="mt-1.5 text-xs text-ink-soft">
                  {isClosed(projectId)
                    ? "This production is closed and archived — the link can no longer be changed."
                    : "Admins can change this link."}
                </p>
              )}

            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
