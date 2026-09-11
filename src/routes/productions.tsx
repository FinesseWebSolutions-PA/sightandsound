import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { NewProductionDialog } from "@/components/NewProductionDialog";

import { departments, projectDepartments, personById, useStore } from "@/lib/store";
import { formatDate, projectStatusMeta, readinessMeta, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/production-data";
import { nextProductionKeyDate } from "@/lib/production-overview";
import { toISO } from "@/lib/schedule";

/** Status colour as text only — quieter than a filled chip, still label + icon. */
const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-soft",
};

export const Route = createFileRoute("/productions")({
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

const statusFilters: ("all" | ProjectStatus)[] = ["all", "active", "planning", "on_hold", "closed"];

function PortfolioPage() {
  const { projects, can } = useStore();
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const today = toISO(new Date());

  const rows = useMemo(
    () =>
      projects.filter((project) => {
        if (status !== "all" && project.status !== status) return false;
        return true;
      }),
    [projects, status],
  );

  const countFor = (option: "all" | ProjectStatus) =>
    option === "all" ? projects.length : projects.filter((p) => p.status === option).length;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
          Production Portfolio
        </h1>
        {can.adminConfig && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-ink-soft"
          >
            <Plus aria-hidden className="size-4" />
            New production
          </button>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Every show-production build in one place — status, owner, departments involved, and the next
        key date.
      </p>
      <div className="gold-rule mt-4 w-24" />

      <div className="mt-6 space-y-3 sm:mt-8">
        <p className="text-xs text-ink-soft">
          Showing <span className="font-semibold text-ink">{rows.length}</span> of{" "}
          <span className="font-semibold text-ink">{projects.length}</span> productions
          {status !== "all" && <> filtered to {projectStatusMeta[status].label.toLowerCase()}</>}.
        </p>
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
                  ? "chip-selected min-h-11 shrink-0 snap-start rounded-full px-4 text-sm font-semibold whitespace-nowrap sm:min-h-9"
                  : "chip-quiet min-h-11 shrink-0 snap-start rounded-full px-4 text-sm font-medium whitespace-nowrap hover:bg-cream sm:min-h-9"
              }
            >
              {option === "all" ? "All" : projectStatusMeta[option].label} {countFor(option)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((project) => {
          const involved = projectDepartments.filter((pd) => pd.project_id === project.id);

          const status = projectStatusMeta[project.status];
          const owner = personById(project.owner_id);
          const keyDate = nextProductionKeyDate(project, today);
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
                "surface-card group block border-l-4 border-l-transparent p-5 transition-all hover:-translate-y-px hover:border-border-strong hover:border-l-gold hover:shadow-md",
                project.status === "closed" && "opacity-80",
              )}
            >
              {/* Quiet meta line: identity and state, no competing chips. */}
              <div className="flex items-center justify-between gap-3">
                <span className="code-id">{project.code}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-semibold ",
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
                <p className="mt-0.5 text-xs font-medium text-ink-soft">{project.subtitle}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{project.summary}</p>
              </div>

              {/* Secondary detail: owner and next date, demoted */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-strong pt-4">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cream text-[10px] font-bold text-ink"
                  >
                    {initials}
                  </span>
                  <span className="truncate text-xs font-medium text-ink">
                    {owner?.full_name || "Owner not assigned"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {keyDate ? (
                    <span>
                      {keyDate.upcoming ? "Next: " : ""}
                      {keyDate.label} · {formatDate(keyDate.date)}
                    </span>
                  ) : (
                    "Key dates not set"
                  )}
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
                      className="flex items-center gap-1.5 text-[10px] font-bold "
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

      {creating && (
        <NewProductionDialog
          onClose={() => setCreating(false)}
          onCreated={(projectId) => {
            setCreating(false);
            void navigate({ to: "/projects/$projectId", params: { projectId } });
          }}
        />
      )}
    </main>
  );
}
