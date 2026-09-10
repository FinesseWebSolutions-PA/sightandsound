import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Plus, Users, X } from "lucide-react";

import {
  departmentJobTitles,
  departments,
  people,
  personById,
  roleLabels,
  useStore,
} from "@/lib/store";
import type { Role } from "@/lib/production-data";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team & Roles — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Company-wide defaults: who is in each department, who leads it, what each person can do, and the usual job titles offered when staffing a production.",
      },
      { property: "og:title", content: "Team & Roles — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Set department defaults, access levels, and the usual job titles per department.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GlobalTeamPage,
});

const roles: Role[] = ["admin", "contributor", "viewer"];

const isLead = (personId: string) => departments.some((d) => d.lead_ids.includes(personId));

function GlobalTeamPage() {
  const {
    can,
    setPersonRole,
    setPersonDepartment,
    setDepartmentOwner,
    addJobTitlePreset,
    deleteJobTitlePreset,
  } = useStore();
  const editable = can.adminConfig;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">Team &amp; Roles</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Company-wide defaults. Each production can then staff its own team and name a head per
          department without changing anything here.
        </p>
        {!editable && (
          <p className="mt-2 text-sm text-ink-soft">
            You can read these settings. Admins can change them.
          </p>
        )}
      </header>

      <section className="surface-card overflow-hidden">
        <header className="panel-header px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">People</h2>
        </header>
        <ul className="row-list">
          {people.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
              <div className="min-w-0 lg:flex-1">
                <p className="text-sm font-medium text-ink">{p.full_name}</p>
                <p className="text-xs text-ink-soft">{p.title}</p>
              </div>
              <label className="flex flex-col gap-1 lg:w-56">
                <span className="rule-label">Department</span>
                <select
                  value={p.primary_department_id ?? ""}
                  disabled={!editable}
                  onChange={(e) =>
                    setPersonDepartment(p.id, e.target.value, isLead(p.id))
                  }
                  className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink disabled:bg-muted disabled:text-ink-soft sm:text-sm"
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink lg:w-32">
                <input
                  type="checkbox"
                  checked={isLead(p.id)}
                  disabled={!editable || !p.primary_department_id}
                  onChange={(e) =>
                    setPersonDepartment(p.id, p.primary_department_id ?? "", e.target.checked)
                  }
                  className="size-4"
                />
                Lead
              </label>
              <label className="flex flex-col gap-1 lg:w-44">
                <span className="rule-label">Access</span>
                <select
                  value={p.role}
                  disabled={!editable}
                  onChange={(e) => setPersonRole(p.id, e.target.value as Role)}
                  className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink disabled:bg-muted disabled:text-ink-soft sm:text-sm"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((dept) => (
          <section key={dept.id} className="surface-card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 panel-header px-4 py-3">
              <Users aria-hidden className="size-4 text-ink-soft" />
              <h2 className="text-sm font-semibold text-ink">{dept.name}</h2>
              <span className="code-id">{dept.code}</span>
            </header>
            <div className="space-y-4 p-4 text-sm">
              <div>
                <p className="rule-label flex items-center gap-1.5">
                  <Crown aria-hidden className="size-3.5 text-gold" />
                  Default department head
                </p>
                {editable ? (
                  <select
                    aria-label={`Default head of ${dept.name}`}
                    value={dept.owner_id}
                    onChange={(e) => setDepartmentOwner(dept.id, e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                  >
                    <option value="">No default head</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} — {p.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-0.5 text-ink">
                    {personById(dept.owner_id)?.full_name ?? "No default head"}
                  </p>
                )}
              </div>

              <div>
                <p className="rule-label">Leads</p>
                {dept.lead_ids.length === 0 ? (
                  <p className="mt-0.5 text-ink-soft">No lead named</p>
                ) : (
                  <ul className="mt-0.5 space-y-0.5">
                    {dept.lead_ids.map((id) => (
                      <li key={id} className="text-ink">
                        {personById(id)?.full_name}{" "}
                        <span className="text-xs text-ink-soft">{personById(id)?.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <JobTitlePresets
                departmentId={dept.id}
                departmentName={dept.name}
                editable={editable}
                onAdd={addJobTitlePreset}
                onRemove={deleteJobTitlePreset}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function JobTitlePresets({
  departmentId,
  departmentName,
  editable,
  onAdd,
  onRemove,
}: {
  departmentId: string;
  departmentName: string;
  editable: boolean;
  onAdd: (departmentId: string, title: string) => void;
  onRemove: (id: string, departmentId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const titles = departmentJobTitles.filter((t) => t.department_id === departmentId);

  return (
    <div>
      <p className="rule-label">Usual jobs offered when staffing</p>
      {titles.length === 0 ? (
        <p className="mt-0.5 text-ink-soft">No usual jobs listed yet</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {titles.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-ink"
            >
              {t.title}
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemove(t.id, departmentId)}
                  aria-label={`Remove ${t.title} from ${departmentName}`}
                  className="text-ink-soft hover:text-ink"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add a job for ${departmentName}`}
            aria-label={`Add a usual job for ${departmentName}`}
            className="min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-2.5 text-base text-ink sm:flex-1 sm:text-sm"
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              onAdd(departmentId, draft);
              setDraft("");
            }}
            className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-50"
          >
            <Plus aria-hidden className="size-4" />
            Add job
          </button>
        </div>
      )}
    </div>
  );
}
