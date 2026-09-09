import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { Archive, CalendarDays, ExternalLink, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { personById, useStore } from "@/lib/store";
import { formatDate, projectStatusMeta } from "@/lib/status";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectWorkspace,
  notFoundComponent: ProjectNotFound,
});

function ProjectNotFound() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-16">
      <h1 className="font-display text-4xl text-ink">Production not found</h1>
      <p className="mt-2 text-sm text-ink-soft">
        This production isn&apos;t in the portfolio.{" "}
        <Link to="/" className="font-semibold text-gold-deep hover:underline">
          Back to Production Portfolio
        </Link>
      </p>
    </main>
  );
}

const tabs = [
  { to: "/projects/$projectId", label: "Dashboard", exact: true },
  { to: "/projects/$projectId/timeline", label: "Timeline", exact: false },
  { to: "/projects/$projectId/documents", label: "Documents", exact: false },
  { to: "/projects/$projectId/discussions", label: "Discussions", exact: false },
  { to: "/projects/$projectId/team", label: "Team & Departments", exact: false },
] as const;

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const { projects, isClosed } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const closed = isClosed(projectId);

  return (
    <div>
      <div className="border-b border-border bg-cream">
        <div className="mx-auto max-w-[1400px] px-6 pt-8">
          <Link to="/" className="rule-label hover:text-ink">
            Production Portfolio
          </Link>
          {closed && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"
            >
              <Archive aria-hidden className="size-4 text-ink-soft" />
              <span>
                <strong className="font-semibold">Closed &amp; archived.</strong> This production is
                a read-only record — nothing can be edited, added, or commented on, in any role.
              </span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="code-id">{project.code}</span>
                <StatusBadge meta={projectStatusMeta[project.status]} size="sm" />
              </div>
              <h1 className="mt-1 font-display text-4xl text-ink">{project.name}</h1>
              <p className="mt-1 text-sm text-ink-soft">{project.subtitle}</p>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="rule-label">Venue</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
                  <MapPin aria-hidden className="size-3.5 text-ink-soft" />
                  {project.venue}
                </dd>
              </div>
              <div>
                <dt className="rule-label">Production owner</dt>
                <dd className="mt-0.5 text-ink">{personById(project.owner_id)?.full_name}</dd>
              </div>
              <div>
                <dt className="rule-label">Opening</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
                  <CalendarDays aria-hidden className="size-3.5 text-ink-soft" />
                  {formatDate(project.opening_date)}
                </dd>
              </div>
              <div>
                <dt className="rule-label">Portal (set simulation)</dt>
                <dd className="mt-0.5">
                  <a
                    href={project.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-gold-deep hover:underline"
                  >
                    Open Portal
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <nav className="mt-6 flex flex-wrap gap-1" aria-label="Project sections">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                params={{ projectId }}
                activeOptions={{ exact: tab.exact }}
                className="rounded-t-md border-b-2 border-transparent px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-soft hover:text-ink"
                activeProps={{
                  className:
                    "rounded-t-md border-b-2 border-gold bg-cream-soft px-4 py-2 text-sm font-semibold text-ink",
                }}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
