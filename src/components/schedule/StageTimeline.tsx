import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useStore, departments, personById, taskDependencies } from "@/lib/store";
import { stageGroups, stageSummary, taskReadiness, taskRows } from "@/lib/task-planning";
import { spanOfDates, axisTicks, placePx, daysBetween } from "@/lib/schedule";
import { formatDate, taskStatusMeta } from "@/lib/status";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { WorkItemEditor } from "@/components/WorkItemEditor";
import type { Task } from "@/lib/production-data";
const field = "min-h-11 max-w-full rounded-md border border-border bg-card px-3 text-sm";
export function StageTimeline({ projectId, sceneId }: { projectId: string; sceneId?: string }) {
  const { tasks, stages, scenes, can, isClosed } = useStore();
  const [department, setDepartment] = useState("");
  const [setId, setSetId] = useState(sceneId ?? "");
  const [groupBy, setGroupBy] = useState("sets");
  const [zoom, setZoom] = useState(6);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ownSets = scenes
    .filter(
      (s) =>
        s.project_id === projectId &&
        (!sceneId || s.id === sceneId) &&
        (Boolean(sceneId) || !setId || s.id === setId),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
  const filtered = tasks.filter(
    (t) =>
      t.project_id === projectId &&
      ownSets.some((s) => s.id === t.scene_id) &&
      (!department || t.department_id === department),
  );
  const groups = useMemo(() => {
    if (groupBy === "departments")
      return departments
        .filter((d) => !department || d.id === department)
        .flatMap((d) =>
          ownSets.flatMap((s) =>
            stageGroups(
              filtered.filter((t) => t.department_id === d.id),
              stages,
              s.id,
            )
              .filter((g) => g.tasks.length)
              .map((g) => ({
                ...g,
                key: `${d.id}:${s.id}:${g.id}`,
                label: `${d.name} · ${s.name}`,
                scene: s,
              })),
          ),
        );
    return ownSets.flatMap((s) =>
      stageGroups(filtered, stages, s.id)
        .filter((g) => g.stage || g.tasks.length)
        .map((g) => ({ ...g, key: `${s.id}:${g.id}`, label: s.name, scene: s })),
    );
  }, [groupBy, department, ownSets, filtered, stages]);
  const span = spanOfDates(
    filtered.flatMap((t) => [t.start_date, t.due_date, t.forecast_start, t.forecast_finish]),
  );
  const width = Math.max(620, daysBetween(span.start, span.end) * zoom + 30);
  const ticks = axisTicks(span, zoom);
  const today = new Date().toISOString().slice(0, 10);
  const canEdit = can.editCoreTimeline && !isClosed(projectId);
  const dateGrid = () => (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {ticks.map((t) => (
        <span
          key={t.key}
          className="absolute inset-y-0 border-l border-border/40"
          style={{ left: t.left }}
        />
      ))}
    </div>
  );
  function bar(task: Task) {
    const start = task.forecast_start || task.start_date;
    const finish = task.forecast_finish || task.due_date;
    const ready = taskReadiness(task, taskDependencies, tasks, today);
    const tone = ready.blocked ? "bg-danger" : task.status === "complete" ? "bg-success" : "bg-ink";
    return (
      <div className="relative h-16" style={{ width }}>
        {dateGrid()}
        {task.start_date && task.due_date && (
          <div
            aria-hidden
            className="absolute top-4 h-8 rounded border border-border bg-cream"
            style={placePx(span, task.start_date, task.due_date, zoom)}
          />
        )}
        {start && finish ? (
          <button
            onClick={() => setSelected(task.id)}
            aria-label={`Open ${task.title}, ${formatDate(start)} to ${formatDate(finish)}`}
            title={`${task.title}: ${formatDate(start)} → ${formatDate(finish)}${ready.blocked ? " · Blocked" : ""}`}
            className={`absolute top-2 min-h-11 min-w-3 overflow-hidden rounded px-2 text-left text-xs text-white ${tone}`}
            style={placePx(span, start, finish, zoom)}
          >
            {task.title}
          </button>
        ) : (
          <button
            onClick={() => setSelected(task.id)}
            className="min-h-11 px-3 text-sm text-ink-soft underline"
          >
            No full dates — open task
          </button>
        )}
      </div>
    );
  }
  return (
    <section
      className="space-y-4"
      aria-label="Stages and tasks timeline"
      data-tour="stage-timeline"
    >
      <div className="surface-card space-y-3 p-4">
        <div>
          <h3 className="font-display text-xl">Stages & tasks</h3>
          <p className="mt-1 text-sm text-ink-soft">
            See parallel work across sets. Expand a stage to see its tasks and handoffs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!sceneId && (
            <select
              aria-label="Timeline set"
              className={field}
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
            >
              <option value="">All sets</option>
              {scenes
                .filter((s) => s.project_id === projectId)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          )}
          <select
            aria-label="Timeline department"
            className={field}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Group timeline"
            className={field}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="sets">Group by set & stage</option>
            <option value="departments">Group by department</option>
          </select>
          <select
            aria-label="Timeline zoom"
            className={field}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={2}>Whole run</option>
            <option value={6}>Months</option>
            <option value={20}>Weeks</option>
          </select>
          <button className={field} onClick={() => setExpanded(new Set(groups.map((g) => g.key)))}>
            Expand all
          </button>
          <button className={field} onClick={() => setExpanded(new Set())}>
            Collapse all
          </button>
        </div>
        <p className="text-xs text-ink-soft">
          {filtered.length} tasks · Stage span = planned · Task outline = planned dates · Solid task
          = forecast (planned when no forecast exists). Stage order does not create dependencies.
          Scroll sideways to see more dates.
        </p>
      </div>
      {groups.length === 0 ? (
        <div className="surface-card p-5 text-sm text-ink-soft">
          No work matches this view. Add stages and tasks from a set’s Tasks tab.
        </div>
      ) : (
        <div
          ref={scroller}
          className="max-h-[72vh] overflow-auto rounded-md border border-border bg-card"
          tabIndex={0}
          aria-label="Scrollable stage schedule"
        >
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ minWidth: width + 180 }}
          >
            <thead className="sticky top-0 z-30 bg-cream">
              <tr>
                <th className="sticky left-0 z-30 w-[180px] min-w-[180px] sm:w-[240px] sm:min-w-[240px] border-b border-r border-border bg-cream p-3">
                  Set / stage / task
                </th>
                <th className="relative h-12 border-b border-border p-0" style={{ width }}>
                  <span className="sr-only">
                    Dates from {span.start} to {span.end}
                  </span>
                  {ticks.map((t) => (
                    <span
                      key={t.key}
                      className="absolute top-4 whitespace-nowrap text-xs font-normal"
                      style={{ left: t.left }}
                    >
                      {t.label}
                    </span>
                  ))}
                </th>
              </tr>
            </thead>
            {groups.map((g) => {
              const summary = stageSummary(g.tasks);
              const open = expanded.has(g.key);
              const rows = taskRows(g.tasks);
              const readyCount = g.tasks.filter(
                (t) => taskReadiness(t, taskDependencies, tasks, today).blocked,
              ).length;
              return (
                <tbody key={g.key}>
                  <tr className="bg-cream-soft">
                    <th className="sticky left-0 z-20 border-b border-r border-border bg-cream-soft px-3 py-2 font-normal">
                      <Link
                        to="/projects/$projectId/sets"
                        params={{ projectId }}
                        search={{ set: g.scene.id, section: "tasks" }}
                        className="block max-w-[155px] sm:max-w-[215px] truncate text-xs text-gold-deep underline"
                      >
                        {g.label}
                      </Link>
                      <button
                        className="min-h-11 w-full text-left font-semibold"
                        aria-expanded={open}
                        onClick={() =>
                          setExpanded((old) => {
                            const next = new Set(old);
                            if (next.has(g.key)) next.delete(g.key);
                            else next.add(g.key);
                            return next;
                          })
                        }
                      >
                        {open ? (
                          <ChevronDown aria-hidden className="mr-1 inline size-4" />
                        ) : (
                          <ChevronRight aria-hidden className="mr-1 inline size-4" />
                        )}
                        {g.name}
                      </button>
                      <p className="text-xs text-ink-soft">
                        {summary.status} · {summary.done}/{summary.total} complete
                        {readyCount ? ` · ${readyCount} blocked` : ""}
                        {summary.undated ? ` · ${summary.undated} undated` : ""}
                      </p>
                    </th>
                    <td className="relative border-b border-border p-0" style={{ width }}>
                      {dateGrid()}
                      {summary.start && summary.finish ? (
                        <div
                          className="absolute top-5 h-4 rounded border border-gold-deep bg-gold/20 text-xs"
                          style={placePx(span, summary.start, summary.finish, zoom)}
                          title={`${g.name}: ${summary.start} → ${summary.finish}`}
                        >
                          <span className="absolute top-5 whitespace-nowrap text-xs text-ink-soft">
                            {formatDate(summary.start)} → {formatDate(summary.finish)}
                          </span>
                        </div>
                      ) : (
                        <span className="px-3 text-xs text-ink-soft">No full dates yet</span>
                      )}
                    </td>
                  </tr>
                  {open &&
                    rows.map((t) => {
                      const ready = taskReadiness(t, taskDependencies, tasks, today);
                      return (
                        <tr key={t.id}>
                          <th
                            className={`sticky left-0 z-10 border-b border-r border-border bg-card p-3 font-normal ${t.parent_task_id ? "pl-7" : ""}`}
                          >
                            <button
                              onClick={() => setSelected(t.id)}
                              className="min-h-11 text-left font-medium hover:underline"
                            >
                              {t.title}
                            </button>
                            <p className="text-xs text-ink-soft">
                              {departments.find((d) => d.id === t.department_id)?.name ??
                                "No department"}{" "}
                              · {personById(t.assignee_id)?.full_name ?? "Unassigned"}
                            </p>
                            <p
                              className={`mt-1 text-xs ${ready.blocked ? "text-danger" : "text-ink-soft"}`}
                            >
                              {ready.blocked
                                ? "Blocked"
                                : ready.finishWaiting
                                  ? "Finish waits on prerequisite"
                                  : taskStatusMeta[t.status].label}
                            </p>
                          </th>
                          <td className="border-b border-border p-0">{bar(t)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
      {selected && (
        <TaskDetailPanel
          taskId={selected}
          onClose={() => setSelected("")}
          {...(canEdit
            ? {
                onEdit: (id: string) => {
                  setSelected("");
                  setEditing(id);
                },
              }
            : {})}
        />
      )}
      {editing && (
        <WorkItemEditor projectId={projectId} taskId={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
