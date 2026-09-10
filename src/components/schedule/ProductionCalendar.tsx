import { ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import { useMemo, useState } from "react";

import { SetDialog } from "@/components/SetDialog";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { addDays, daysBetween, toDate, toISO } from "@/lib/schedule";
import { formatDate, setStatusMeta, taskStatusMeta, toneClasses } from "@/lib/status";
import { departments, personById, useStore } from "@/lib/store";

const todayISO = toISO(new Date());

/** Sunday of the week a date falls in. */
function weekStart(iso: string): string {
  return addDays(iso, -toDate(iso).getUTCDay());
}

function monthLabel(iso: string): string {
  return toDate(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function addMonths(iso: string, months: number): string {
  const d = toDate(firstOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The same schedule as the Gantt, read as a calendar: sets run as bars across
 * the weeks they cover, and work items sit on the day they are due. Clicking
 * either one opens the same detail people see everywhere else.
 */
export function ProductionCalendar({
  projectId,
  sceneId: pinnedSceneId,
}: {
  projectId: string;
  /** When given, only this set and its work items are shown. */
  sceneId?: string;
}) {
  const { scenes, tasks } = useStore();

  const [anchor, setAnchor] = useState(todayISO);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [show, setShow] = useState<"both" | "sets" | "work">("both");
  const [deptId, setDeptId] = useState("");
  const [openSetId, setOpenSetId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const projectScenes = useMemo(
    () =>
      scenes
        .filter((s) => s.project_id === projectId && (!pinnedSceneId || s.id === pinnedSceneId))
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [scenes, projectId, pinnedSceneId],
  );

  const projectTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.project_id === projectId &&
          (!pinnedSceneId || t.scene_id === pinnedSceneId) &&
          (!deptId || t.department_id === deptId),
      ),
    [tasks, projectId, pinnedSceneId, deptId],
  );

  /* The visible grid: whole weeks covering the month, or a single week. */
  const weeks = useMemo(() => {
    if (mode === "week") return [weekStart(anchor)];
    const start = weekStart(firstOfMonth(anchor));
    const monthEnd = addDays(addMonths(anchor, 1), -1);
    const out: string[] = [];
    let cursor = start;
    while (cursor <= weekStart(monthEnd)) {
      out.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return out;
  }, [anchor, mode]);

  const inMonth = (iso: string) => mode === "week" || iso.slice(0, 7) === anchor.slice(0, 7);

  const tasksOn = (iso: string) => projectTasks.filter((t) => t.due_date?.slice(0, 10) === iso);

  const step = (dir: -1 | 1) =>
    setAnchor((a) => (mode === "week" ? addDays(a, dir * 7) : addMonths(a, dir)));

  const headerLabel =
    mode === "week"
      ? `${formatDate(weeks[0] as string)} – ${formatDate(addDays(weeks[0] as string, 6))}`
      : monthLabel(anchor);

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border-strong">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => step(-1)}
            className="min-h-11 bg-card px-3 text-ink-soft hover:bg-cream"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(todayISO)}
            className="inline-flex min-h-11 items-center gap-1.5 border-x border-border-strong bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
          >
            <Crosshair aria-hidden className="size-4" /> Today
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => step(1)}
            className="min-h-11 bg-card px-3 text-ink-soft hover:bg-cream"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>

        <p className="text-base font-semibold text-ink">{headerLabel}</p>

        <div className="flex overflow-hidden rounded-md border border-border-strong">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-11 px-3 text-sm font-medium ${
                mode === m ? "bg-ink text-cream-soft" : "bg-card text-ink-soft hover:bg-cream"
              }`}
            >
              {m === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-md border border-border-strong">
          {(
            [
              { id: "both", label: "Sets & work" },
              { id: "sets", label: "Sets only" },
              { id: "work", label: "Work only" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setShow(o.id)}
              className={`min-h-11 px-3 text-sm font-medium ${
                show === o.id ? "bg-ink text-cream-soft" : "bg-card text-ink-soft hover:bg-cream"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {show !== "sets" && (
          <select
            aria-label="Department"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="min-h-11 rounded-md border border-border-strong bg-card px-2.5 text-sm text-ink"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* grid */}
      <div className="surface-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border-strong">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-ink-soft">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        {weeks.map((wStart) => {
          const wEnd = addDays(wStart, 6);
          const days = Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
          // Sets that touch this week become bars across the days they cover.
          const bars =
            show === "work"
              ? []
              : projectScenes
                  .filter(
                    (s) =>
                      s.start_date &&
                      s.due_date &&
                      s.start_date <= wEnd &&
                      s.due_date >= wStart,
                  )
                  .map((s) => {
                    const from = s.start_date < wStart ? wStart : s.start_date;
                    const to = s.due_date > wEnd ? wEnd : s.due_date;
                    return {
                      scene: s,
                      col: daysBetween(wStart, from),
                      span: Math.max(1, daysBetween(from, to) + 1),
                      startsHere: s.start_date >= wStart,
                      endsHere: s.due_date <= wEnd,
                    };
                  });

          return (
            <div key={wStart} className="border-b border-border last:border-b-0">
              {bars.length > 0 && (
                <div className="grid grid-cols-7 gap-1 px-1 pt-1">
                  {bars.map((b) => (
                    <button
                      key={b.scene.id}
                      type="button"
                      onClick={() => setOpenSetId(b.scene.id)}
                      style={{ gridColumn: `${b.col + 1} / span ${b.span}` }}
                      title={`${b.scene.name} · ${formatDate(b.scene.start_date)} – ${formatDate(
                        b.scene.due_date,
                      )}`}
                      className={`flex min-h-7 items-center gap-1.5 overflow-hidden border border-ink bg-ink px-2 text-[11px] font-semibold whitespace-nowrap text-cream-soft ${
                        b.startsHere ? "rounded-l-md" : ""
                      } ${b.endsHere ? "rounded-r-md" : ""}`}
                    >
                      <span className="truncate">
                        {b.startsHere ? b.scene.name : `… ${b.scene.name}`}
                      </span>
                      <span className="hidden shrink-0 opacity-80 sm:inline">
                        {setStatusMeta[b.scene.status].label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-7">
                {days.map((iso) => {
                  const dayTasks = show === "sets" ? [] : tasksOn(iso);
                  const expanded = expandedDay === iso;
                  const visible = expanded ? dayTasks : dayTasks.slice(0, 3);
                  return (
                    <div
                      key={iso}
                      className={`min-h-24 border-r border-border p-1 last:border-r-0 ${
                        inMonth(iso) ? "" : "bg-cream-soft/60"
                      }`}
                    >
                      <p
                        className={`px-1 text-xs font-semibold ${
                          iso === todayISO
                            ? "inline-flex size-5 items-center justify-center rounded-full bg-gold-deep text-white"
                            : inMonth(iso)
                              ? "text-ink"
                              : "text-ink-soft"
                        }`}
                      >
                        {Number(iso.slice(8, 10))}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {visible.map((t) => {
                          const meta = taskStatusMeta[t.status];
                          return (
                            <li key={t.id}>
                              <button
                                type="button"
                                onClick={() => setOpenTaskId(t.id)}
                                title={`${t.title} · due ${formatDate(t.due_date)} · ${meta.label}${
                                  t.assignee_id
                                    ? ` · ${personById(t.assignee_id)?.full_name ?? ""}`
                                    : ""
                                }`}
                                className={`flex w-full items-center gap-1 rounded border px-1 py-0.5 text-left text-[11px] ${
                                  toneClasses[meta.tone]
                                }`}
                              >
                                <meta.Icon aria-hidden className="size-3 shrink-0" />
                                <span className="truncate">{t.title}</span>
                              </button>
                            </li>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setExpandedDay(expanded ? null : iso)}
                              className="px-1 text-[11px] font-semibold text-ink-soft underline"
                            >
                              {expanded ? "show less" : `+${dayTasks.length - 3} more`}
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-soft">
        Bars are sets across the days they run. Entries inside a day are work items due that day —
        click either one to open it.
      </p>

      {openSetId && (
        <SetDialog setId={openSetId} projectId={projectId} onClose={() => setOpenSetId(null)} />
      )}
      {openTaskId && <TaskDetailPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />}
    </div>
  );
}
