import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Crown, ExternalLink, Users, X } from "lucide-react";

import { PersonPicker } from "@/components/PersonPicker";
import { StatusBadge } from "@/components/StatusBadge";
import {
  departmentJobTitles,
  departments,
  people,
  personById,
  projectAssignments,
  projectDepartments,
  roleLabels,
  useStore,
} from "@/lib/store";
import { readinessMeta } from "@/lib/status";

export const Route = createFileRoute("/projects/$projectId/team")({
  head: () => ({
    meta: [
      { title: "Team & Departments — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Staff each department on this production: name the department head and assign team members to the jobs they hold on this show.",
      },
      { property: "og:title", content: "Team & Departments — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Name department heads and assign team members to jobs on a show build.",
      },
    ],
  }),
  component: TeamTab,
});

function TeamTab() {
  const { projectId } = Route.useParams();
  const {
    projects,
    can,
    setPortalUrl,
    isClosed,
    setDepartmentOnProject,
    assignPerson,
    setAssignmentJobTitle,
    unassignPerson,
    setDepartmentHead,
  } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const [portalDraft, setPortalDraft] = useState(project.portal_url);
  const closed = isClosed(projectId);
  const canEdit = can.adminConfig && !closed;

  const involvement = (departmentId: string) =>
    projectDepartments.find(
      (pd) => pd.project_id === projectId && pd.department_id === departmentId,
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ink sm:text-3xl">Team &amp; Departments</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Who is staffed on this production, and the job each person holds on this show. Mentioning
          a department notifies its head and leads — not the whole roster.{" "}
          {can.adminConfig && (
            <Link to="/team" className="font-medium text-gold-deep underline">
              Set company-wide defaults
            </Link>
          )}
        </p>
      </div>

      <section className="surface-card p-4">
        <label htmlFor="team-portal-url" className="rule-label flex items-center gap-1.5">
          <ExternalLink aria-hidden className="size-3.5" />
          Portal (set simulation) link
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            id="team-portal-url"
            value={portalDraft}
            onChange={(e) => setPortalDraft(e.target.value)}
            disabled={!canEdit}
            type="url"
            inputMode="url"
            className="min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-2.5 text-base text-ink disabled:bg-muted disabled:text-ink-soft sm:flex-1 sm:text-sm"
          />
          {canEdit && (
            <button
              type="button"
              onClick={() => setPortalUrl(projectId, portalDraft)}
              className="min-h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft"
            >
              Save link
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          {canEdit
            ? "Opens the external set-simulation Portal in a new tab."
            : closed
              ? "This production is closed and archived — the link can no longer be changed."
              : "Admins can change this link."}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((dept) => {
          const pd = involvement(dept.id);
          const assigned = projectAssignments.filter(
            (a) => a.project_id === projectId && a.department_id === dept.id,
          );
          const presets = departmentJobTitles.filter((t) => t.department_id === dept.id);
          const candidates = people.filter((p) => !assigned.some((a) => a.person_id === p.id));

          return (
            <section key={dept.id} className="surface-card overflow-hidden">
              <header className="flex flex-wrap items-center gap-2 panel-header px-4 py-3">
                <Users aria-hidden className="size-4 text-ink-soft" />
                <h3 className="text-sm font-semibold text-ink">{dept.name}</h3>
                <span className="code-id">{dept.code}</span>
                <span className="sm:ml-auto">
                  {pd ? (
                    <StatusBadge meta={readinessMeta[pd.readiness]} size="sm" />
                  ) : (
                    <span className="rounded-md border border-border px-2 py-0.5 text-xs text-ink-soft">
                      Not on this production
                    </span>
                  )}
                </span>
              </header>

              <div className="space-y-4 p-4 text-sm">
                {canEdit && (
                  <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={Boolean(pd)}
                      onChange={(e) => setDepartmentOnProject(projectId, dept.id, e.target.checked)}
                      className="size-4"
                    />
                    This department is working on this production
                  </label>
                )}

                {pd ? (
                  <>
                    <p className="text-ink-soft">{pd.note}</p>

                    <div>
                      <p className="rule-label flex items-center gap-1.5">
                        <Crown aria-hidden className="size-3.5 text-gold" />
                        Department head on this production
                      </p>
                      {canEdit ? (
                        <div className="mt-1">
                          <PersonPicker
                            label={`${dept.name} head on this production`}
                            value={pd.head_id}
                            onChange={(id) => setDepartmentHead(projectId, dept.id, id)}
                            placeholder="No head named"
                            suggestedIds={assigned.map((a) => a.person_id)}
                            suggestedLabel={`Staffed on ${dept.name}`}
                          />
                        </div>
                      ) : (
                        <p className="mt-0.5 text-ink">
                          {personById(pd.head_id)?.full_name ?? "No head named"}{" "}
                          <span className="text-xs text-ink-soft">
                            {personById(pd.head_id)?.title}
                          </span>
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="rule-label">Staffed on this production</p>
                      {assigned.length === 0 ? (
                        <p className="mt-0.5 text-ink-soft">Nobody assigned yet</p>
                      ) : (
                        <ul className="mt-1 space-y-2">
                          {assigned.map((a) => (
                            <li
                              key={a.id}
                              className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center"
                            >
                              <span className="min-w-0 flex-1 text-ink">
                                {a.is_head && (
                                  <Crown
                                    aria-label="Department head"
                                    className="mr-1 inline size-3.5 text-gold"
                                  />
                                )}
                                {personById(a.person_id)?.full_name ?? "Unknown team member"}
                              </span>
                              {canEdit ? (
                                <JobTitleField
                                  value={a.job_title}
                                  presets={presets.map((t) => t.title)}
                                  onChange={(title) =>
                                    setAssignmentJobTitle(a.id, projectId, title)
                                  }
                                />
                              ) : (
                                <span className="text-xs text-ink-soft sm:w-52">
                                  {a.job_title || "No job named"}
                                </span>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => unassignPerson(a.id, projectId)}
                                  aria-label={`Remove ${personById(a.person_id)?.full_name ?? "team member"} from ${dept.name}`}
                                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-muted hover:text-ink"
                                >
                                  <X aria-hidden className="size-4" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {canEdit && (
                      <AddAssignment
                        departmentName={dept.name}
                        excludeIds={assigned.map((a) => a.person_id)}
                        suggestedIds={candidates
                          .filter((p) => p.primary_department_id === dept.id)
                          .map((p) => p.id)}
                        presets={presets.map((t) => t.title)}
                        onAdd={(personId, jobTitle) =>
                          assignPerson({
                            projectId,
                            personId,
                            departmentId: dept.id,
                            jobTitle,
                          })
                        }
                      />
                    )}
                  </>
                ) : (
                  <p className="text-ink-soft">
                    {canEdit
                      ? "Turn this department on to start staffing it."
                      : "This department is not working on this production."}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="surface-card overflow-x-auto">
        <header className="panel-header px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Everyone with access</h3>
        </header>
        <ul className="row-list lg:hidden">
          {people.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <p className="text-sm font-medium text-ink">{p.full_name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{p.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {departments.find((d) => d.id === p.primary_department_id)?.name} ·{" "}
                {roleLabels[p.role]}
              </p>
            </li>
          ))}
        </ul>
        <table className="hidden w-full min-w-[38rem] text-sm lg:table">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="rule-label px-4 py-2">Team member</th>
              <th className="rule-label px-4 py-2">Title</th>
              <th className="rule-label px-4 py-2">Department</th>
              <th className="rule-label px-4 py-2">Access</th>
            </tr>
          </thead>
          <tbody className="row-list">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 text-ink">{p.full_name}</td>
                <td className="px-4 py-2.5 text-ink-soft">{p.title}</td>
                <td className="px-4 py-2.5 text-ink-soft">
                  {departments.find((d) => d.id === p.primary_department_id)?.name}
                </td>
                <td className="px-4 py-2.5 text-ink-soft">{roleLabels[p.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const CUSTOM = "__custom__";

/** Job on this production: pick a usual one, or type one just for this show. */
function JobTitleField({
  value,
  presets,
  onChange,
}: {
  value: string;
  presets: string[];
  onChange: (title: string) => void;
}) {
  const known = value === "" || presets.includes(value);
  const [custom, setCustom] = useState(known ? "" : value);
  const [typing, setTyping] = useState(!known);

  if (typing) {
    return (
      <span className="flex gap-2 sm:w-52">
        <input
          aria-label="Job on this production"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => custom.trim() && custom.trim() !== value && onChange(custom.trim())}
          placeholder="Job on this show"
          className="min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-2 text-base text-ink sm:text-sm"
        />
      </span>
    );
  }

  return (
    <select
      aria-label="Job on this production"
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          setTyping(true);
          return;
        }
        onChange(e.target.value);
      }}
      className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink sm:w-52 sm:text-sm"
    >
      <option value="">No job named</option>
      {presets.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      <option value={CUSTOM}>Other job…</option>
    </select>
  );
}

function AddAssignment({
  departmentName,
  excludeIds,
  suggestedIds,
  presets,
  onAdd,
}: {
  departmentName: string;
  excludeIds: string[];
  suggestedIds: string[];
  presets: string[];
  onAdd: (personId: string, jobTitle: string) => void;
}) {
  const [personId, setPersonId] = useState("");
  const [job, setJob] = useState(presets[0] ?? "");
  const [customJob, setCustomJob] = useState("");

  const finalJob = job === CUSTOM ? customJob.trim() : job;

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="rule-label">Add someone to {departmentName}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 sm:flex-1">
          <PersonPicker
            label={`Add someone to ${departmentName}`}
            value={personId}
            onChange={setPersonId}
            placeholder="Choose a team member…"
            excludeIds={excludeIds}
            suggestedIds={suggestedIds}
            suggestedLabel={`In ${departmentName}`}
          />
        </div>
        <select
          aria-label={`Job for the new ${departmentName} team member`}
          value={job}
          onChange={(e) => setJob(e.target.value)}
          className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink sm:w-48 sm:text-sm"
        >
          <option value="">No job named</option>
          {presets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value={CUSTOM}>Other job…</option>
        </select>
      </div>
      {job === CUSTOM && (
        <input
          aria-label="Custom job for this production"
          value={customJob}
          onChange={(e) => setCustomJob(e.target.value)}
          placeholder="Job just for this production"
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
        />
      )}
      <button
        type="button"
        disabled={!personId}
        onClick={() => {
          onAdd(personId, finalJob);
          setPersonId("");
          setCustomJob("");
        }}
        className="mt-2 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-50"
      >
        Add to production
      </button>
    </div>
  );
}
