import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, SlidersHorizontal } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, projectDepartments, personById, useStore } from "@/lib/store";
import { formatDate, projectStatusMeta, readinessMeta } from "@/lib/status";
import { cn } from "@/lib/utils";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilters =
    (status !== "all" ? 1 : 0) + (venue !== "all" ? 1 : 0) + (department !== "all" ? 1 : 0);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-3xl">
        <p className="rule-label">Sight &amp; Sound Theatres</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
          Production Portfolio
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Every show build across Lancaster and Branson, with the department readiness and key
          dates that leadership asks about first. Open a production to see its dashboard, timeline,
          documents, and discussions.
        </p>
      </div>
      <div className="gold-rule mt-6 w-24" />

      {/* Status chips scroll sideways on a phone; venue and department move into a filter panel. */}
      <div className="mt-6 space-y-3 sm:mt-8">
        <div className="-mx-4 flex snap-x items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="rule-label shrink-0">Status</span>
          {statusFilters.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
              className={
                status === option
                  ? "min-h-11 shrink-0 snap-start rounded-full border border-ink bg-ink px-4 text-sm font-semibold whitespace-nowrap text-cream-soft sm:min-h-9"
                  : "min-h-11 shrink-0 snap-start rounded-full border border-border bg-card px-4 text-sm font-medium whitespace-nowrap text-ink-soft hover:bg-cream sm:min-h-9"
              }
            >
              {option === "all" ? "All" : projectStatusMeta[option].label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="portfolio-filters"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-ink sm:hidden"
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          {filtersOpen ? "Hide filters" : "Venue & department filters"}
          {activeFilters > 0 && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-cream-soft">
              {activeFilters}
            </span>
          )}
        </button>

        <div
          id="portfolio-filters"
          className={cn(
            "flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-end sm:gap-6",
            filtersOpen ? "flex" : "hidden",
          )}
        >
          <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span className="rule-label">Venue</span>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:min-h-9 sm:w-auto sm:text-sm"
            >
              <option value="all">All venues</option>
              <option value="Lancaster, PA">Lancaster, PA</option>
              <option value="Branson, MO">Branson, MO</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span className="rule-label">Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:min-h-9 sm:w-auto sm:text-sm"
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
              className="surface-card group block p-4 transition-colors hover:border-gold sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="code-id">{project.code}</span>
                    <StatusBadge meta={projectStatusMeta[project.status]} size="sm" />
                  </div>
                  <h2 className="mt-1.5 font-display text-xl leading-tight text-ink sm:text-2xl">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{project.subtitle}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                    {project.summary}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="rule-label">Venue</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
                      <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
                      {project.venue}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="rule-label">Production owner</dt>
                    <dd className="mt-0.5 text-ink">{personById(project.owner_id)?.full_name}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="rule-label">Next key date</dt>
                    <dd className="mt-0.5 flex items-start gap-1.5 text-ink">
                      <CalendarDays aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-soft" />
                      <span>
                        {next
                          ? `${formatDate(next.due_date)} — ${next.name}`
                          : `Opened ${formatDate(project.opening_date)}`}
                      </span>
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
                <span className="inline-flex w-full items-center gap-1 text-sm font-semibold text-gold-deep sm:ml-auto sm:w-auto">
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
