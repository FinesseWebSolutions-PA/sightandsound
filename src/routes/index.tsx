import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, projectDepartments, personById, useStore } from "@/lib/store";
import { formatDate, projectStatusMeta, readinessMeta } from "@/lib/status";
import type { ProjectStatus } from "@/lib/production-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Production Portfolio — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Every show-production build in one place: status, owner, departments involved, and the next key date for Lancaster and Branson.",
      },
      { property: "og:title", content: "Production Portfolio — Sight & Sound Show Production" },
      {
        property: "og:description",
        content:
          "Every show-production build in one place: status, owner, departments involved, and the next key date.",
      },
    ],
  }),
  component: PortfolioPage,
});

const statusFilters: ("all" | ProjectStatus)[] = ["all", "active", "planning", "closed"];

function PortfolioPage() {
  const { projects, milestones } = useStore();
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [venue, setVenue] = useState("all");
  const [department, setDepartment] = useState("all");

  const rows = useMemo(
    () =>
      projects.filter((project) => {
        if (status !== "all" && project.status !== status) return false;
        if (venue !== "all" && project.venue !== venue) return false;
        if (
          department !== "all" &&
          !projectDepartments.some(
            (pd) => pd.project_id === project.id && pd.department_id === department,
          )
        )
          return false;
        return true;
      }),
    [projects, status, venue, department],
  );

  const nextKeyDate = (projectId: string) => {
    const open = milestones
      .filter((m) => m.project_id === projectId && m.status !== "complete")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return open[0];
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="max-w-3xl">
        <p className="rule-label">Sight &amp; Sound Theatres</p>
        <h1 className="mt-2 font-display text-5xl text-ink">Production Portfolio</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Every show build across Lancaster and Branson, with the department readiness and key
          dates that leadership asks about first. Open a production to see its dashboard, timeline,
          documents, and discussions.
        </p>
      </div>
      <div className="gold-rule mt-6 w-24" />

      <div className="mt-8 flex flex-wrap items-end gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rule-label">Status</span>
          {statusFilters.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
              className={
                status === option
                  ? "rounded-full border border-ink bg-ink px-3 py-1 text-xs font-semibold text-cream-soft"
                  : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:bg-cream"
              }
            >
              {option === "all" ? "All" : projectStatusMeta[option].label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="rule-label">Venue</span>
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-ink"
          >
            <option value="all">All venues</option>
            <option value="Lancaster, PA">Lancaster, PA</option>
            <option value="Branson, MO">Branson, MO</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="rule-label">Department</span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-ink"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((project) => {
          const involved = projectDepartments.filter((pd) => pd.project_id === project.id);
          const next = nextKeyDate(project.id);
          return (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="surface-card group block p-5 transition-colors hover:border-gold"
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-[18rem] flex-1">
                  <div className="flex items-center gap-3">
                    <span className="code-id">{project.code}</span>
                    <StatusBadge meta={projectStatusMeta[project.status]} size="sm" />
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl text-ink">{project.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{project.subtitle}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                    {project.summary}
                  </p>
                </div>

                <dl className="grid min-w-[16rem] gap-3 text-sm">
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
                    <dt className="rule-label">Next key date</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
                      <CalendarDays aria-hidden className="size-3.5 text-ink-soft" />
                      {next
                        ? `${formatDate(next.due_date)} — ${next.name}`
                        : `Opened ${formatDate(project.opening_date)}`}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="rule-label mr-1">Departments</span>
                {involved.map((pd) => {
                  const dept = departments.find((d) => d.id === pd.department_id);
                  return (
                    <span
                      key={pd.department_id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream-soft px-2 py-1 text-xs text-ink"
                    >
                      {dept?.name}
                      <StatusBadge meta={readinessMeta[pd.readiness]} size="sm" />
                    </span>
                  );
                })}
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-gold-deep">
                  Open workspace
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}

        {rows.length === 0 && (
          <p className="surface-card p-6 text-sm text-ink-soft">
            No productions match those filters.
          </p>
        )}
      </div>
    </main>
  );
}
