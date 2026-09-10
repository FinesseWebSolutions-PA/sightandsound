import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, SlidersHorizontal } from "lucide-react";

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
          "Every show-production build in one place: status, owner, departments involved, and the next key date.",
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
  const [department, setDepartment] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rows = useMemo(
    () =>
      projects.filter((project) => {
        if (status !== "all" && project.status !== status) return false;
        if (
          department !== "all" &&
          !projectDepartments.some(
            (pd) => pd.project_id === project.id && pd.department_id === department,
          )
        )
          return false;
        return true;
      }),
    [projects, status, department],
  );

  const nextKeyDate = (projectId: string) => {
    const open = milestones
      .filter((m) => m.project_id === projectId && m.status !== "complete")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return open[0];
  };

  const activeFilters =
    (status !== "all" ? 1 : 0) + (department !== "all" ? 1 : 0);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-3xl">
        <p className="rule-label">Sight &amp; Sound Theatres</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
          Production Portfolio
        </h1>
      </div>
      <div className="gold-rule mt-4 w-24" />

      {/* Status chips scroll sideways on a phone; department moves into a filter panel. */}
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
          {filtersOpen ? "Hide filters" : "Department filter"}
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
          const status = projectStatusMeta[project.status];
          const owner = personById(project.owner_id);
          const initials = (owner?.full_name ?? "")
            .split(" ")
            .map((part) => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("");
          return (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className={cn(
                "surface-card group block p-5 shadow-sm transition-colors hover:border-gold",
                project.status === "closed" && "opacity-80",
              )}
            >
              {/* Quiet meta line: identity and state, no competing chips. */}
              <div className="flex items-center justify-between gap-3">
                <span className="code-id">{project.code}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase",
                    toneText[status.tone],
                  )}
                >
                  <status.Icon aria-hidden className="size-3" />
                  {status.label}
                </span>
              </div>

              {/* Primary content */}
              <div className="mt-3">
                <h2 className="font-display text-2xl leading-tight text-ink">{project.name}</h2>
                <p className="mt-0.5 text-xs font-medium tracking-tight text-ink-soft uppercase">
                  {project.subtitle}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{project.summary}</p>
              </div>

              {/* Secondary detail: owner and next date, demoted */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cream text-[10px] font-bold text-ink"
                  >
                    {initials}
                  </span>
                  <span className="truncate text-xs font-medium text-ink">{owner?.full_name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {next ? formatDate(next.due_date) : formatDate(project.opening_date)}
                </span>
              </div>

              {/* Department readiness, condensed to one quiet line */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                {involved.map((pd) => {
                  const dept = departments.find((d) => d.id === pd.department_id);
                  const meta = readinessMeta[pd.readiness];
                  return (
                    <span
                      key={pd.department_id}
                      className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase"
                      title={`${dept?.name}: ${meta.label}`}
                    >
                      <meta.Icon aria-hidden className={cn("size-3", toneText[meta.tone])} />
                      <span className="text-ink">{dept?.name}</span>
                      <span className={cn("font-semibold", toneText[meta.tone])}>{meta.label}</span>
                    </span>
                  );
                })}
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
