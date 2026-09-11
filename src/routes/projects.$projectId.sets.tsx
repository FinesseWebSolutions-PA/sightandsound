import { SetInstructions } from "@/components/workspace/SetInstructions";
import { SetWorkspace } from "@/components/workspace/SetWorkspace";
import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Crown, ExternalLink, Link2, Plus, X } from "lucide-react";

import { ConversationRail } from "@/components/ConversationRail";
import { DocumentBrowser } from "@/components/DocumentBrowser";
import { MasterTimeline } from "@/components/schedule/MasterTimeline";
import { ProductionCalendar } from "@/components/schedule/ProductionCalendar";
import { PersonPicker } from "@/components/PersonPicker";
import { StatusBadge } from "@/components/StatusBadge";
import { SetTasksPanel } from "@/components/SetTasksPanel";
import { departmentJobTitles, departments, people, personById, useStore } from "@/lib/store";
import { addDays } from "@/lib/schedule";
import { formatDate, setStatusMeta } from "@/lib/status";
import type { Scene, SetStatus } from "@/lib/production-data";

export const Route = createFileRoute("/projects/$projectId/sets")({
  validateSearch: (search: Record<string, unknown>): { set?: string; section?: string } => ({
    ...(typeof search["set"] === "string" ? { set: search["set"] } : {}),
    ...(typeof search["section"] === "string" &&
    [
      "overview",
      "updates",
      "planning",
      "tasks",
      "schedule",
      "documents",
      "conversation",
      "team",
    ].includes(search["section"])
      ? { section: search["section"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sets — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Every set in the production: who leads it, where it stands, the dates it is committed to, the set it follows, and the conversation about it.",
      },
      { property: "og:title", content: "Sets — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Set leads, dates, running order and the chain between sets on a show build.",
      },
    ],
  }),
  component: SetsTab,
});

const statusOptions: SetStatus[] = ["not_started", "in_progress", "blocked", "complete"];

function SetsTab() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { projects, scenes, tasks, documents, can, isClosed } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const canEdit = can.adminConfig && !isClosed(projectId);
  const [newName, setNewName] = useState("");
  const [newPortal, setNewPortal] = useState("");
  const navigate = Route.useNavigate();
  const selectedId = search.set ?? "";
  const setSelectedId = (id: string) => void navigate({ search: { set: id, section: "overview" } });
  const [adding, setAdding] = useState(false);
  const { createScene } = useStore();

  const projectSets = useMemo(
    () =>
      scenes.filter((s) => s.project_id === projectId).sort((a, b) => a.sort_order - b.sort_order),
    [scenes, projectId],
  );

  const selected = projectSets.find((s) => s.id === selectedId) ?? projectSets[0];

  const workCount = (sceneId: string) => tasks.filter((t) => t.scene_id === sceneId).length;
  const docCount = (sceneId: string) => documents.filter((d) => d.scene_id === sceneId).length;

  const add = async () => {
    if (!newName.trim()) return;
    const id = await createScene(projectId, newName, newPortal);
    if (id) {
      setNewName("");
      setNewPortal("");
      setSelectedId(id);
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">Sets</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Choose a set to see its latest work, conversations and files.{" "}
            <Link
              to="/projects/$projectId/timeline"
              params={{ projectId }}
              className="font-medium text-gold-deep underline"
            >
              See the schedule
            </Link>
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            aria-label="Add set"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-ink hover:border-gold-deep hover:text-gold-deep"
          >
            <Plus aria-hidden className="size-5" />
          </button>
        )}
      </div>

      {canEdit && adding && (
        <div className="surface-card flex flex-wrap gap-2 p-3">
          <input
            autoFocus
            aria-label="New set name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="e.g. Set 4 — The Flood"
            className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
          />
          <input
            aria-label="Portal (set simulation) link"
            value={newPortal}
            onChange={(e) => setNewPortal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Portal link (optional)"
            className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={!newName.trim()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
          >
            Add set
          </button>
        </div>
      )}

      {projectSets.length === 0 ? (
        <p className="surface-card p-4 text-sm text-ink-soft">
          No sets on this production yet
          {canEdit ? " — use the + button to add the first one." : "."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <label className="block text-sm font-medium text-ink lg:hidden">
            Set
            <select
              aria-label="Choose set"
              value={selected?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            >
              {projectSets.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.name} · {setStatusMeta[s.status].label}
                </option>
              ))}
            </select>
          </label>
          <nav
            className="surface-card hidden self-start overflow-hidden lg:block"
            aria-label="Sets in this production"
          >
            <ul className="row-list">
              {projectSets.map((s, i) => {
                const active = selected?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-current={active ? "true" : undefined}
                      className={`data-row flex min-h-14 w-full items-center gap-2 px-3 py-2 text-left ${
                        active ? "bg-cream" : "hover:bg-cream-soft"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-xs text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {s.name}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {workCount(s.id)} work items · {docCount(s.id)} documents
                        </span>
                      </span>
                      <StatusBadge meta={setStatusMeta[s.status]} size="sm" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {selected && (
            <SetDetail
              key={selected.id}
              set={selected}
              order={projectSets}
              projectId={projectId}
              canEdit={canEdit}
              section={search.section}
              onSectionChange={(section) =>
                void navigate({ search: { set: selected.id, section } })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function SetDetail({
  section,
  onSectionChange,
  set,
  order,
  projectId,
  canEdit,
}: {
  section?: string | undefined;
  onSectionChange: (section: string) => void;
  set: Scene;
  order: Scene[];
  projectId: string;
  canEdit: boolean;
}) {
  const {
    tasks,
    projectAssignments,
    updateScene,
    renameScene,
    deleteScene,
    assignPerson,
    unassignPerson,
    saving,
  } = useStore();
  const [nameDraft, setNameDraft] = useState(set.name);
  const [portalDraft, setPortalDraft] = useState(set.portal_url);
  const tab = section || "overview";
  const setTab = onSectionChange;
  const [scheduleMode, setScheduleMode] = useState<"gantt" | "calendar">("gantt");

  const index = order.findIndex((s) => s.id === set.id);
  const others = order.filter((s) => s.id !== set.id);
  const setTasks = tasks.filter((t) => t.scene_id === set.id);

  // Departments with work on this set are the ones worth staffing here.
  const involved = departments.filter(
    (d) =>
      setTasks.some((t) => t.department_id === d.id) ||
      projectAssignments.some((a) => a.scene_id === set.id && a.department_id === d.id),
  );
  const shown = involved.length > 0 ? involved : departments;

  /**
   * A set that follows another one starts the day after that set finishes, plus
   * whatever gap is set. Only the finish date is committed by hand.
   */
  const followsSet = order.find((s) => s.id === set.depends_on_scene_id);
  const startFrom = (predecessorId: string, lag: number) => {
    const pred = order.find((s) => s.id === predecessorId);
    const base = pred?.due_date || pred?.forecast_finish;
    return base ? addDays(base, 1 + lag) : "";
  };
  const applyChain = (predecessorId: string, lag: number) => {
    const start = predecessorId ? startFrom(predecessorId, lag) : "";
    void updateScene(set.id, projectId, {
      depends_on_scene_id: predecessorId,
      lag_days: lag,
      ...(start ? { start_date: start } : {}),
    });
  };

  return (
    <div className="min-w-0 space-y-4">
      <section className="surface-card p-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-2xl text-ink">{set.name}</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Set {index + 1} of {order.length} in the running order
            </p>
          </div>
          <StatusBadge meta={setStatusMeta[set.status]} size="sm" />
        </header>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
          <span>Lead: {personById(set.owner_id)?.full_name ?? "Not assigned"}</span>
          <span>Finish: {set.due_date ? formatDate(set.due_date) : "Not committed"}</span>
          {set.portal_url && (
            <a
              href={set.portal_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gold-deep underline"
            >
              Open Portal <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
        <details className="mt-4 border-t border-border pt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-ink-soft">
            Set details & settings
          </summary>
          <div className="mt-2">
            {" "}
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Set name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 font-display text-2xl text-ink focus:ring-2 focus:ring-ring focus:outline-none"
                />
                <button
                  type="button"
                  disabled={saving || !nameDraft.trim() || nameDraft === set.name}
                  onClick={() => void renameScene(set.id, projectId, nameDraft)}
                  className="min-h-11 rounded border px-3 text-sm disabled:opacity-50"
                >
                  Save name
                </button>
              </div>
            ) : (
              <h3 className="font-display text-2xl text-ink">{set.name}</h3>
            )}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="rule-label">Set lead</dt>
              <dd className="mt-1">
                {canEdit ? (
                  <PersonPicker
                    label="Set lead"
                    value={set.owner_id}
                    onChange={(id) => void updateScene(set.id, projectId, { owner_id: id })}
                    placeholder="No lead named"
                    suggestedIds={projectAssignments
                      .filter((a) => a.scene_id === set.id)
                      .map((a) => a.person_id)}
                    suggestedLabel="Staffed on this set"
                  />
                ) : (
                  <span className="text-sm text-ink">
                    {personById(set.owner_id)?.full_name ?? "No lead named"}
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className="rule-label">Where it stands</dt>
              <dd className="mt-1">
                {canEdit ? (
                  <select
                    aria-label="Set status"
                    value={set.status}
                    onChange={(e) =>
                      void updateScene(set.id, projectId, { status: e.target.value as SetStatus })
                    }
                    className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {setStatusMeta[s].label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-ink">{setStatusMeta[set.status].label}</span>
                )}
                <span className="mt-1 block text-xs text-ink-soft">
                  Updates itself as the work tied to this set moves.
                </span>
              </dd>
            </div>

            <div>
              <dt className="rule-label">Committed start</dt>
              <dd className="mt-1">
                {canEdit && !followsSet ? (
                  <input
                    type="date"
                    aria-label="Committed start"
                    value={set.start_date}
                    onChange={(e) =>
                      void updateScene(set.id, projectId, { start_date: e.target.value })
                    }
                    className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                  />
                ) : (
                  <span className="text-sm text-ink">
                    {set.start_date ? formatDate(set.start_date) : "Not committed"}
                  </span>
                )}
                {followsSet && (
                  <span className="mt-1 block text-xs text-ink-soft">
                    Filled in from {followsSet.name}
                    {set.lag_days ? ` plus a ${set.lag_days} day gap` : ""}.
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className="rule-label">Committed finish</dt>
              <dd className="mt-1">
                {canEdit ? (
                  <input
                    type="date"
                    aria-label="Committed finish"
                    value={set.due_date}
                    onChange={(e) =>
                      void updateScene(set.id, projectId, { due_date: e.target.value })
                    }
                    className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                  />
                ) : (
                  <span className="text-sm text-ink">
                    {set.due_date ? formatDate(set.due_date) : "Not committed"}
                  </span>
                )}
              </dd>
            </div>

            <div>
              <dt className="rule-label">Current estimate</dt>
              <dd className="mt-1 text-sm text-ink">
                {set.forecast_start || set.forecast_finish
                  ? `${set.forecast_start ? formatDate(set.forecast_start) : "—"} → ${
                      set.forecast_finish ? formatDate(set.forecast_finish) : "—"
                    }`
                  : "No work scheduled yet"}
                <span className="mt-1 block text-xs text-ink-soft">
                  Worked out from the work items tied to this set.
                </span>
              </dd>
            </div>

            <div>
              <dt className="rule-label flex items-center gap-1.5">
                <Link2 aria-hidden className="size-3.5" />
                Follows
              </dt>
              <dd className="mt-1 space-y-2">
                {canEdit ? (
                  <>
                    <select
                      aria-label="Set this one follows"
                      value={set.depends_on_scene_id}
                      onChange={(e) => applyChain(e.target.value, set.lag_days)}
                      className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                    >
                      <option value="">Starts on its own</option>
                      {others.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {set.depends_on_scene_id && (
                      <label className="block text-xs text-ink-soft">
                        Days of gap after that set finishes
                        <input
                          type="number"
                          value={set.lag_days}
                          onChange={(e) =>
                            applyChain(set.depends_on_scene_id, Number(e.target.value) || 0)
                          }
                          className="mt-1 min-h-11 w-24 rounded-md border border-border bg-card px-2.5 text-base text-ink sm:text-sm"
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-ink">
                    {set.depends_on_scene_id
                      ? `${order.find((s) => s.id === set.depends_on_scene_id)?.name ?? "Another set"}${
                          set.lag_days ? ` + ${set.lag_days} day gap` : ""
                        }`
                      : "Starts on its own"}
                  </span>
                )}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="rule-label">Portal (set simulation)</dt>
              <dd className="mt-1 space-y-2">
                {canEdit && (
                  <div>
                    <input
                      type="url"
                      aria-label="Portal (set simulation) link"
                      value={portalDraft}
                      onChange={(e) => setPortalDraft(e.target.value)}
                      placeholder="https://…"
                      className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm"
                    />
                    <button
                      type="button"
                      disabled={saving || portalDraft === set.portal_url}
                      onClick={() =>
                        void updateScene(set.id, projectId, { portal_link_url: portalDraft })
                      }
                      className="mt-2 min-h-11 rounded border px-3 text-sm disabled:opacity-50"
                    >
                      Save link
                    </button>
                  </div>
                )}
                {set.portal_url ? (
                  <a
                    href={set.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:underline"
                  >
                    Open Portal
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  <span className="block text-xs text-ink-soft">
                    No simulation linked for this set yet.
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {canEdit && (
            <button
              type="button"
              onClick={() => void deleteScene(set.id, projectId)}
              className="mt-4 min-h-11 rounded-md border border-border px-3 text-sm font-medium text-danger hover:bg-cream"
            >
              Remove set
            </button>
          )}
        </details>
      </section>

      <nav
        aria-label={`${set.name} sections`}
        className="surface-card flex flex-wrap items-center gap-1 p-1"
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "tasks", label: "Tasks" },
          { id: "conversation", label: "Conversations" },
          { id: "documents", label: "Files" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-md px-3 text-sm font-medium ${tab === t.id ? "bg-ink text-cream-soft" : "text-ink-soft hover:bg-cream"}`}
          >
            {t.label}
          </button>
        ))}
        <select
          aria-label="More set sections"
          value={["overview", "tasks", "conversation", "documents"].includes(tab) ? "" : tab}
          onChange={(e) => {
            if (e.target.value) setTab(e.target.value);
          }}
          className={`min-h-11 min-w-0 max-w-full flex-1 rounded-md border border-border px-2 text-sm sm:flex-none ${["overview", "tasks", "conversation", "documents"].includes(tab) ? "bg-card text-ink-soft" : "bg-ink text-cream-soft"}`}
        >
          <option value="" disabled>
            More…
          </option>
          <option value="updates">Updates & decisions</option>
          <option value="planning">Planning & capacity</option>
          <option value="schedule">Schedule</option>
          <option value="team">Team</option>
        </select>
      </nav>
      {(tab === "overview" || tab === "documents") && (
        <SetInstructions key={`instructions-${set.id}`} set={set} compact={tab === "overview"} />
      )}

      {(tab === "overview" || tab === "updates" || tab === "planning") && (
        <SetWorkspace key={`workspace-${set.id}`} set={set} view={tab} />
      )}
      {tab === "tasks" && (
        <SetTasksPanel projectId={projectId} sceneId={set.id} canEdit={canEdit} />
      )}

      {tab === "team" && (
        <section className="surface-card overflow-hidden">
          <header className="panel-header px-4 py-3">
            <h4 className="text-sm font-semibold text-ink">Who is on this set</h4>
            <p className="mt-0.5 text-xs text-ink-soft">
              Name the people responsible for this set. Production contacts provide oversight until
              a set owner is assigned.
            </p>
          </header>
          <ul className="row-list">
            {shown.map((dept) => {
              const setPeople = projectAssignments.filter(
                (a) => a.scene_id === set.id && a.department_id === dept.id,
              );
              const fallback = projectAssignments.filter(
                (a) => !a.scene_id && a.project_id === projectId && a.department_id === dept.id,
              );
              const presets = departmentJobTitles.filter((t) => t.department_id === dept.id);
              return (
                <li key={dept.id} className="px-4 py-3">
                  <p className="rule-label">{dept.name}</p>
                  {setPeople.length > 0 ? (
                    <ul className="mt-1 space-y-2">
                      {setPeople.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 text-ink">
                            {personById(a.person_id)?.full_name ?? "Unknown team member"}
                            {a.job_title && <span className="text-ink-soft"> — {a.job_title}</span>}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => unassignPerson(a.id, projectId)}
                              aria-label={`Take ${
                                personById(a.person_id)?.full_name ?? "team member"
                              } off ${set.name} for ${dept.name}`}
                              className="flex size-11 items-center justify-center rounded-md text-ink-soft hover:bg-muted hover:text-ink"
                            >
                              <X aria-hidden className="size-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {fallback.length > 0 ? (
                        <>
                          <Crown aria-hidden className="mr-1 inline size-3.5 text-gold" />
                          No set owner assigned. Production contacts:{" "}
                          {fallback
                            .map((a) => personById(a.person_id)?.full_name ?? "team member")
                            .join(", ")}
                        </>
                      ) : (
                        "Nobody named for this department yet"
                      )}
                    </p>
                  )}
                  {canEdit && (
                    <AddToSet
                      departmentName={dept.name}
                      setName={set.name}
                      presets={presets.map((t) => t.title)}
                      excludeIds={setPeople.map((a) => a.person_id)}
                      suggestedIds={people
                        .filter((p) => p.primary_department_id === dept.id)
                        .map((p) => p.id)}
                      onAdd={(personId, jobTitle) =>
                        assignPerson({
                          projectId,
                          personId,
                          departmentId: dept.id,
                          jobTitle,
                          sceneId: set.id,
                        })
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "schedule" && (
        <section className="min-w-0 space-y-3">
          <div className="flex overflow-hidden rounded-md border border-border-strong w-fit">
            {(
              [
                { id: "gantt", label: "Gantt" },
                { id: "calendar", label: "Calendar" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setScheduleMode(m.id)}
                className={`min-h-11 px-3 text-sm font-medium ${
                  scheduleMode === m.id
                    ? "bg-ink text-cream-soft"
                    : "bg-card text-ink-soft hover:bg-cream"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="min-w-0 overflow-hidden">
            {scheduleMode === "gantt" ? (
              <MasterTimeline projectId={projectId} sceneId={set.id} />
            ) : (
              <ProductionCalendar projectId={projectId} sceneId={set.id} />
            )}
          </div>
        </section>
      )}

      {tab === "documents" && (
        <section className="space-y-3">
          <DocumentBrowser projectId={projectId} sceneId={set.id} />
        </section>
      )}

      {tab === "conversation" && (
        <section className="min-w-0 space-y-3">
          <ConversationRail
            projectId={projectId}
            sceneId={set.id}
            listTitle={`Conversations on ${set.name}`}
          />
        </section>
      )}
    </div>
  );
}

function AddToSet({
  departmentName,
  setName,
  excludeIds,
  suggestedIds,
  presets,
  onAdd,
}: {
  departmentName: string;
  setName: string;
  excludeIds: string[];
  suggestedIds: string[];
  presets: string[];
  onAdd: (personId: string, jobTitle: string) => void;
}) {
  const [personId, setPersonId] = useState("");
  const [job, setJob] = useState("");

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <div className="min-w-0 sm:flex-1">
        <PersonPicker
          label={`Add someone to ${departmentName} on ${setName}`}
          value={personId}
          onChange={setPersonId}
          placeholder="Add someone to this set…"
          excludeIds={excludeIds}
          suggestedIds={suggestedIds}
          suggestedLabel={`In ${departmentName}`}
        />
      </div>
      <select
        aria-label={`Job for ${departmentName} on ${setName}`}
        value={job}
        onChange={(e) => setJob(e.target.value)}
        className="min-h-11 rounded-md border border-border bg-card px-2 text-base text-ink sm:w-44 sm:text-sm"
      >
        <option value="">No job named</option>
        {presets.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!personId}
        onClick={() => {
          onAdd(personId, job);
          setPersonId("");
          setJob("");
        }}
        className="min-h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
      >
        Add
      </button>
    </div>
  );
}
