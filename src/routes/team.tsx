import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Pencil, Plus, Search, Users, X } from "lucide-react";

import { PersonPicker } from "@/components/PersonPicker";
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

      <PeopleDirectory
        editable={editable}
        setPersonRole={setPersonRole}
        setPersonDepartment={setPersonDepartment}
      />

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
                  <div className="mt-1">
                    <PersonPicker
                      label={`Default head of ${dept.name}`}
                      value={dept.owner_id}
                      onChange={(id: string) => setDepartmentOwner(dept.id, id)}
                      placeholder="No default head"
                      suggestedIds={people
                        .filter((p) => p.primary_department_id === dept.id)
                        .map((p) => p.id)}
                      suggestedLabel={`In ${dept.name}`}
                    />
                  </div>
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

function PersonRow({
  person,
  editable,
  setPersonRole,
  setPersonDepartment,
}: {
  person: (typeof people)[number];
  editable: boolean;
  setPersonRole: (id: string, role: Role) => void;
  setPersonDepartment: (id: string, departmentId: string, lead: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const dept = departments.find((d) => d.id === person.primary_department_id);
  const lead = isLead(person.id);

  if (!editing) {
    return (
      <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {person.full_name}
            {lead && <span className="ml-1.5 text-xs font-semibold text-gold-deep">Lead</span>}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {person.title} · {dept?.name ?? "No department"} · {roleLabels[person.role]}
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${person.full_name}`}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <Pencil aria-hidden className="size-4" />
          </button>
        ) : (
          <span className="shrink-0 text-xs text-ink-soft">Read-only</span>
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center">
      <div className="min-w-0 lg:flex-1">
        <p className="text-sm font-medium text-ink">{person.full_name}</p>
        <p className="text-xs text-ink-soft">{person.title}</p>
      </div>
      <label className="flex flex-col gap-1 lg:w-56">
        <span className="rule-label">Department</span>
        <select
          value={person.primary_department_id ?? ""}
          onChange={(e) => setPersonDepartment(person.id, e.target.value, lead)}
          className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink sm:text-sm"
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
          checked={lead}
          disabled={!person.primary_department_id}
          onChange={(e) => setPersonDepartment(person.id, person.primary_department_id ?? "", e.target.checked)}
          className="size-4"
        />
        Lead
      </label>
      <label className="flex flex-col gap-1 lg:w-44">
        <span className="rule-label">Access</span>
        <select
          value={person.role}
          onChange={(e) => setPersonRole(person.id, e.target.value as Role)}
          className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink sm:text-sm"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="min-h-11 shrink-0 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-cream"
      >
        Done
      </button>
    </li>
  );
}

function PeopleDirectory({
  editable,
  setPersonRole,
  setPersonDepartment,
}: {
  editable: boolean;
  setPersonRole: (id: string, role: Role) => void;
  setPersonDepartment: (id: string, departmentId: string, lead: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !p.full_name.toLowerCase().includes(q) && !p.title.toLowerCase().includes(q)) {
        return false;
      }
      if (deptFilter !== "all" && p.primary_department_id !== deptFilter) return false;
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      return true;
    });
  }, [query, deptFilter, roleFilter]);

  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 panel-header px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">People</h2>
        <span className="text-xs text-ink-soft">
          {filtered.length} of {people.length}
        </span>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search people</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or title"
            className="min-h-11 w-full rounded-md border border-border bg-card py-2 pr-2.5 pl-8 text-base text-ink sm:text-sm"
          />
        </label>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter by department"
          className="min-h-11 shrink-0 rounded-md border border-border bg-card px-2 text-base text-ink sm:text-sm"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | Role)}
          aria-label="Filter by access role"
          className="min-h-11 shrink-0 rounded-md border border-border bg-card px-2 text-base text-ink sm:text-sm"
        >
          <option value="all">All access levels</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
      </div>
      <ul className="row-list">
        {filtered.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            editable={editable}
            setPersonRole={setPersonRole}
            setPersonDepartment={setPersonDepartment}
          />
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-sm text-ink-soft">No one matches those filters.</li>
        )}
      </ul>
    </section>
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
