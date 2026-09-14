import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Undo2, Redo2, Link2, X, Maximize2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useStore, departments, people } from "@/lib/store";
import { addDays, axisTicks, daysBetween, spanOfDates, toISO } from "@/lib/schedule";
import {
  ganttRows,
  visibleWindow,
  taskSpan,
  shiftDates,
  dependencyEnds,
  type GanttRow,
} from "@/lib/gantt-model";
import { useGanttData, ganttTask, type GanttOperation } from "@/lib/gantt-data";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { WorkItemEditor } from "@/components/WorkItemEditor";
import type { Task, TaskDependency } from "@/lib/production-data";
import { taskStatusMeta } from "@/lib/status";
const button =
  "min-h-11 rounded-md border border-border bg-card px-3 text-sm hover:bg-cream disabled:opacity-40";
const input = "min-h-11 rounded-md border border-border bg-card px-3 text-sm";
const RH = 44,
  HH = 44;
type Preferences = {
  zoom: number;
  tableWidth: number;
  group: "sets" | "departments";
  department: string;
  setId: string;
  collapsed: string[] | null;
  expansionVersion: number;
  columns: string[];
  scrollTop: number;
  scrollLeft: number;
};
const defaults: Preferences = {
  zoom: 12,
  tableWidth: 700,
  group: "sets",
  department: "",
  setId: "",
  collapsed: null,
  expansionVersion: 1,
  columns: ["owner", "status", "start", "finish"],
  scrollTop: 0,
  scrollLeft: 0,
};
type Cell = { id: string; field: string; value: string };
type Drag = {
  id: string;
  kind: "move" | "start" | "finish";
  x: number;
  scroll: number;
  days: number;
  start: string;
  finish: string;
};
export function StageTimeline({ projectId, sceneId }: { projectId: string; sceneId?: string }) {
  const store = useStore();
  const data = useGanttData(projectId);
  const key = `ss-gantt-v2:${projectId}:${sceneId ?? "all"}`;
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [critical, setCritical] = useState(false);
  const [links, setLinks] = useState(true);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState("");
  const [editor, setEditor] = useState<{
    taskId?: string | undefined;
    stageId?: string | undefined;
    sceneId?: string | undefined;
    parentId?: string | undefined;
  } | null>(null);
  const [cell, setCell] = useState<Cell | null>(null);
  const [stageForm, setStageForm] = useState<{ scene: string; name: string } | null>(null);
  const [linkForm, setLinkForm] = useState<{
    task: string;
    predecessor: string;
    type: TaskDependency["type"];
    lag: number;
    existing?: boolean;
  } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [full, setFull] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const [viewport, setViewport] = useState({ top: 0, left: 0, width: 1200, height: 600 });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      if (v)
        setPrefs({
          ...defaults,
          ...v,
          zoom: Math.max(0.1, Math.min(48, Number(v.zoom) || 12)),
          tableWidth: Math.max(320, Math.min(1000, Number(v.tableWidth) || 700)),
          group: v.group === "departments" ? "departments" : "sets",
          columns: Array.isArray(v.columns)
            ? v.columns.filter((x: string) =>
                ["owner", "status", "start", "finish", "duration", "float"].includes(x),
              )
            : defaults.columns,
          // Older views were expanded automatically; start them with the new overview.
          expansionVersion: 1,
          collapsed: v.expansionVersion === 1 && Array.isArray(v.collapsed) ? v.collapsed : null,
          scrollTop: v.expansionVersion === 1 ? v.scrollTop || 0 : 0,
        });
    } catch {
      /* Ignore damaged view preferences. */
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(prefs));
      } catch {
        /* Browsing still works without storage. */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [key, prefs, loaded]);
  const patchPrefs = useCallback(
    (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })),
    [],
  );
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const read = () =>
      setViewport({
        top: el.scrollTop,
        left: el.scrollLeft,
        width: el.clientWidth,
        height: el.clientHeight,
      });
    const observer = new ResizeObserver(read);
    observer.observe(el);
    read();
    return () => observer.disconnect();
  }, [data.state, full]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !data.state || !loaded || restored.current) return;
    restored.current = true;
    el.scrollTop = prefs.scrollTop;
    el.scrollLeft = prefs.scrollLeft;
  }, [data.state, loaded, prefs.scrollTop, prefs.scrollLeft]);
  const tasks = useMemo(() => data.state?.tasks.map(ganttTask) ?? [], [data.state]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const currentPeople = people;
  const currentDepartments = departments;
  const personNames = useMemo(
    () => new Map(currentPeople.map((p) => [p.id, p.full_name])),
    [currentPeople],
  );
  const deptNames = useMemo(
    () =>
      new Map([
        ...currentDepartments.map((d) => [d.id, d.name] as [string, string]),
        ["", "No department"],
      ]),
    [currentDepartments],
  );
  const sets = useMemo(
    () =>
      store.scenes
        .filter(
          (s) =>
            s.project_id === projectId &&
            (!sceneId || s.id === sceneId) &&
            (!prefs.setId || sceneId || s.id === prefs.setId),
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    [store.scenes, projectId, sceneId, prefs.setId],
  );
  const included = useMemo(() => {
    const ids = new Set(sets.map((s) => s.id));
    return tasks.filter((t) => ids.has(t.scene_id));
  }, [tasks, sets]);
  const collapsed = useMemo(
    () =>
      new Set(
        prefs.collapsed ??
          ganttRows(included, sets, store.stages, new Set(), prefs.group, deptNames)
            .filter((row) => row.expandable)
            .map((row) => row.key),
      ),
    [prefs.collapsed, included, sets, store.stages, prefs.group, deptNames],
  );
  const rows = useMemo(
    () =>
      ganttRows(
        included,
        sets,
        store.stages,
        collapsed,
        prefs.group,
        deptNames,
        query,
        prefs.department,
        critical,
      ),
    [
      included,
      sets,
      store.stages,
      collapsed,
      prefs.group,
      deptNames,
      query,
      prefs.department,
      critical,
    ],
  );
  const parents = useMemo(
    () => new Set(tasks.map((t) => t.parent_task_id).filter(Boolean)),
    [tasks],
  );
  const today = toISO(new Date());
  const span = useMemo(
    () =>
      spanOfDates([
        ...included.flatMap((t) => [t.start_date, t.due_date, t.forecast_start, t.forecast_finish]),
        ...(data.state?.milestones.flatMap((m) => [m.due_date, m.forecast_date]) ?? []),
        today,
      ]),
    [included, data.state?.milestones, today],
  );
  const tableWidth = Math.min(prefs.tableWidth, Math.max(220, viewport.width * 0.7));
  const columns = viewport.width < 800 ? [] : prefs.columns;
  const titleWidth = Math.max(180, tableWidth - columns.length * 100);
  const timelineWidth = Math.max(
    120,
    viewport.width - tableWidth,
    (daysBetween(span.start, span.end) + 1) * prefs.zoom,
  );
  const ticks = useMemo(() => {
    let last = -Infinity;
    return axisTicks(span, prefs.zoom).filter((t) => {
      if (t.left - last < 70) return false;
      last = t.left;
      return true;
    });
  }, [span, prefs.zoom]);
  const windowRows = visibleWindow(
    rows.length,
    Math.max(0, viewport.top - HH),
    viewport.height,
    RH,
  );
  const visible = rows.slice(windowRows.start, windowRows.end);
  const taskToRow = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r, i) => r.tasks.forEach((t) => map.set(t.id, i)));
    return map;
  }, [rows]);
  const dependencies = useMemo(() => data.state?.dependencies ?? [], [data.state?.dependencies]);
  const predecessorMap = useMemo(() => {
    const map = new Map<string, TaskDependency[]>();
    for (const d of dependencies) {
      const list = map.get(d.task_id) ?? [];
      list.push(d);
      map.set(d.task_id, list);
    }
    return map;
  }, [dependencies]);
  const editable = store.can.editCoreTimeline && !store.isClosed(projectId);
  const locked = data.busy || Boolean(data.preview);
  const canDate = (t: Task) =>
    editable &&
    !parents.has(t.id) &&
    t.status !== "complete" &&
    !t.actual_start &&
    !t.actual_finish;
  const x = (date: string) => daysBetween(span.start, date) * prefs.zoom;
  const box = (start: string, finish: string) => ({
    left: x(start),
    width: Math.max(prefs.zoom, (daysBetween(start, finish) + 1) * prefs.zoom),
  });
  function toggle(row: GanttRow) {
    const next = new Set(collapsed);
    if (next.has(row.key)) next.delete(row.key);
    else next.add(row.key);
    patchPrefs({ collapsed: [...next] });
  }
  function zoom(value: number) {
    const el = scroller.current;
    const center = (viewport.left + Math.max(0, viewport.width - tableWidth) / 2) / prefs.zoom;
    patchPrefs({ zoom: value });
    requestAnimationFrame(() => {
      if (el)
        el.scrollLeft = Math.max(0, center * value - Math.max(0, viewport.width - tableWidth) / 2);
    });
  }
  function fit() {
    const z = Math.max(
      0.1,
      Math.min(48, (viewport.width - tableWidth - 30) / (daysBetween(span.start, span.end) + 1)),
    );
    patchPrefs({ zoom: z });
    if (scroller.current) scroller.current.scrollLeft = 0;
  }
  function focusTask(id: string) {
    setSelected(id);
    const i = taskToRow.get(id);
    if (i !== undefined && scroller.current) {
      scroller.current.scrollTop = Math.max(0, i * RH - viewport.height / 3);
      const t = byId.get(id);
      if (t?.start_date)
        scroller.current.scrollLeft = Math.max(0, x(t.forecast_start || t.start_date) - 100);
    }
  }
  async function saveCell(nextCell: Cell | null = cell) {
    const cell = nextCell;
    if (!cell) return;
    const t = byId.get(cell.id);
    if (!t) return;
    let field = cell.field;
    let value: string | null = cell.value || null;
    if (field === "duration") {
      const n = Number(cell.value);
      if (!Number.isInteger(n) || n < 1 || n > 3650 || !t.start_date) {
        setNotice("Use 1–3,650 calendar days and set a start date first.");
        return;
      }
      field = "due_date";
      value = addDays(t.start_date, n - 1);
    }
    setCell(null);
    await data.propose([{ action: "task", task_id: t.id, patch: { [field]: value } }]);
  }
  const beginDrag = (t: Task, kind: Drag["kind"], e: React.PointerEvent) => {
    if (!canDate(t) || locked || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const start = t.forecast_start || t.start_date;
    const finish = t.forecast_finish || t.due_date;
    if (!start || !finish) return;
    const d = { id: t.id, kind, x: e.clientX, scroll: viewport.left, days: 0, start, finish };
    dragRef.current = d;
    setDrag(d);
  };
  function moveDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const el = scroller.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (e.clientX > rect.right - 35) el.scrollLeft += 12;
      if (e.clientX < rect.left + tableWidth + 25) el.scrollLeft -= 12;
    }
    const days = Math.round(
      (e.clientX - d.x + (scroller.current?.scrollLeft ?? d.scroll) - d.scroll) / prefs.zoom,
    );
    if (days !== d.days) {
      dragRef.current = { ...d, days };
      setDrag(dragRef.current);
    }
  }
  function finishDrag(cancel = false) {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || cancel || !d.days) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    const result = shiftDates(d.start, d.finish, d.days, d.kind);
    if (result)
      void data.propose([
        {
          action: "task",
          task_id: d.id,
          patch: { start_date: result.start, due_date: result.finish },
        },
      ]);
    else setNotice("Finish must be on or after start.");
  }
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dragRef.current = null;
        setDrag(null);
        setCell(null);
        setFull(false);
      }
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (!locked) {
          if (e.shiftKey) data.redo();
          else data.undo();
        }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [data, locked]);
  function field(t: Task, col: string) {
    const value =
      col === "owner"
        ? personNames.get(t.assignee_id) || "Unassigned"
        : col === "status"
          ? taskStatusMeta[t.status].label
          : col === "start"
            ? t.start_date || "Set date"
            : col === "finish"
              ? t.due_date || "Set date"
              : col === "duration"
                ? t.start_date && t.due_date
                  ? `${daysBetween(t.start_date, t.due_date) + 1}d`
                  : "—"
                : t.total_float_hours == null
                  ? "—"
                  : `${Math.round((t.total_float_hours / 24) * 10) / 10}d`;
    const key =
      col === "owner"
        ? "owner_id"
        : col === "start"
          ? "start_date"
          : col === "finish"
            ? "due_date"
            : col;
    const enabled =
      editable &&
      !locked &&
      col !== "float" &&
      (!["start", "finish", "duration"].includes(col) || canDate(t)) &&
      (col !== "status" || !parents.has(t.id));
    if (cell?.id === t.id && cell.field === key)
      return (
        <form
          className="flex h-11 items-center border-2 border-blue-500"
          onSubmit={(e) => {
            e.preventDefault();
            void saveCell();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveCell();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setCell(null);
            }
          }}
        >
          {col === "owner" || col === "status" ? (
            <select
              autoFocus
              aria-label={`New ${col} for ${t.title}`}
              className="h-full w-full min-w-0 bg-card text-xs"
              value={cell.value}
              onChange={(e) => void saveCell({ ...cell, value: e.target.value })}
              onBlur={() => setCell(null)}
            >
              {col === "owner" ? (
                <>
                  <option value="">Unassigned</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Complete</option>
                </>
              )}
            </select>
          ) : (
            <input
              autoFocus
              required
              aria-label={`New ${col} for ${t.title}`}
              className="h-full w-full min-w-0 bg-card px-1 text-xs"
              type={["start", "finish"].includes(col) ? "date" : "number"}
              value={cell.value}
              onChange={(e) => setCell({ ...cell, value: e.target.value })}
              onBlur={(e) => {
                if (e.target.checkValidity()) void saveCell();
              }}
            />
          )}
        </form>
      );
    return (
      <button
        className="h-11 w-full truncate px-2 text-left text-xs hover:bg-cream disabled:cursor-default disabled:hover:bg-transparent"
        disabled={!enabled}
        title={enabled ? `Edit ${col}: ${value}` : value}
        aria-label={`Edit ${col} for ${t.title}`}
        onClick={() =>
          setCell({
            id: t.id,
            field: key,
            value:
              col === "owner"
                ? t.assignee_id
                : col === "status"
                  ? t.status === "complete"
                    ? "done"
                    : t.status === "in_review"
                      ? "in_progress"
                      : t.status
                  : col === "duration"
                    ? String(daysBetween(t.start_date, t.due_date) + 1)
                    : col === "start"
                      ? t.start_date
                      : t.due_date,
          })
        }
      >
        {value}
      </button>
    );
  }
  function renderBar(row: GanttRow) {
    const t = row.task;
    const range = taskSpan(row.tasks, "forecast");
    if (!range.start || !range.finish)
      return t ? (
        <button
          className="h-11 px-2 text-xs text-ink-soft underline"
          onClick={() =>
            canDate(t) ? setCell({ id: t.id, field: "start_date", value: today }) : setDetail(t.id)
          }
        >
          Unscheduled
        </button>
      ) : null;
    const dateRange =
      t && drag?.id === t.id ? shiftDates(drag.start, drag.finish, drag.days, drag.kind) : null;
    const placement = box(dateRange?.start || range.start, dateRange?.finish || range.finish);
    const summary = !t || parents.has(t.id);
    const color =
      t?.status === "complete"
        ? "bg-success"
        : t?.status === "blocked"
          ? "bg-danger"
          : critical && t?.criticality === "critical"
            ? "bg-danger"
            : summary
              ? "bg-gold/40"
              : "bg-ink";
    return (
      <>
        <div
          className={`absolute top-2 h-7 rounded ${color} ${selected === t?.id ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${summary ? "border border-gold-deep" : "text-white"}`}
          style={placement}
        >
          <button
            className="relative z-10 h-full w-full truncate px-2 text-left text-xs touch-none"
            aria-label={t ? `Schedule ${t.title}` : `${row.name} summary`}
            title={`${row.name}: ${range.start} → ${range.finish}${t && canDate(t) ? " · Drag to move; Alt + arrow to move one day" : ""}`}
            onPointerDown={(e) => t && !summary && beginDrag(t, "move", e)}
            onPointerMove={moveDrag}
            onPointerUp={() => finishDrag()}
            onPointerCancel={() => finishDrag(true)}
            onClick={() => {
              if (suppressClick.current) return;
              if (t) setSelected(t.id);
              else toggle(row);
            }}
            onDoubleClick={() => t && setDetail(t.id)}
            onKeyDown={(e) => {
              if (
                t &&
                canDate(t) &&
                !locked &&
                e.altKey &&
                ["ArrowLeft", "ArrowRight"].includes(e.key)
              ) {
                e.preventDefault();
                const change = shiftDates(
                  range.start,
                  range.finish,
                  e.key === "ArrowRight" ? 1 : -1,
                  "move",
                );
                if (change)
                  void data.propose([
                    {
                      action: "task",
                      task_id: t.id,
                      patch: { start_date: change.start, due_date: change.finish },
                    },
                  ]);
              }
              if (t && e.key === "Enter") setDetail(t.id);
            }}
          >
            {row.name}
          </button>
          {t &&
            canDate(t) &&
            !summary &&
            !locked &&
            (["start", "finish"] as const).map((edge) => (
              <button
                key={edge}
                aria-label={`Resize ${edge} of ${t.title}`}
                title={`Drag to change ${edge}`}
                tabIndex={-1}
                className={`absolute inset-y-0 z-20 w-2 cursor-ew-resize touch-none rounded bg-white/20 ${edge === "start" ? "left-0" : "right-0"}`}
                onPointerDown={(e) => beginDrag(t, edge, e)}
                onPointerMove={moveDrag}
                onPointerUp={() => finishDrag()}
                onPointerCancel={() => finishDrag(true)}
              />
            ))}
        </div>
        {dateRange && (
          <span
            className="absolute -top-4 z-40 rounded bg-ink px-2 text-xs text-white"
            style={{ left: placement.left }}
          >
            {dateRange.start} → {dateRange.finish}
          </span>
        )}
      </>
    );
  }
  if (!data.state)
    return (
      <div role="status" className="surface-card p-6">
        {data.error || "Loading schedule…"}
      </div>
    );
  return (
    <section
      aria-label="Production Gantt"
      data-tour="stage-timeline"
      className={full ? "fixed inset-0 z-40 overflow-auto bg-cream p-4" : "space-y-3"}
    >
      <div className="surface-card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-display text-xl">Gantt</h3>
          <span role="status" className="text-xs text-ink-soft">
            {data.busy ? "Saving…" : data.message || `${included.length} tasks`}
          </span>
          <button
            className={button}
            disabled={!editable || locked || !data.canUndo}
            onClick={data.undo}
            title="Undo (Ctrl/Cmd + Z)"
          >
            <Undo2 className="inline size-4" /> <span className="sr-only sm:not-sr-only">Undo</span>
          </button>
          <button
            className={button}
            disabled={!editable || locked || !data.canRedo}
            onClick={data.redo}
            title="Redo (Ctrl/Cmd + Shift + Z)"
          >
            <Redo2 className="inline size-4" /> <span className="sr-only sm:not-sr-only">Redo</span>
          </button>
          <button className={button} onClick={() => setColumnsOpen((v) => !v)}>
            Fields
          </button>
          <button
            className={button}
            onClick={() => setFull((v) => !v)}
            aria-label={full ? "Exit full screen" : "Full screen"}
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className={input + " min-w-32 flex-1"}
            placeholder="Find a task…"
            aria-label="Search Gantt tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!sceneId && (
            <select
              className={input}
              aria-label="Gantt set"
              value={prefs.setId}
              onChange={(e) => patchPrefs({ setId: e.target.value })}
            >
              <option value="">All sets</option>
              {store.scenes
                .filter((s) => s.project_id === projectId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          )}
          <select
            className={input}
            aria-label="Gantt department"
            value={prefs.department}
            onChange={(e) => patchPrefs({ department: e.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className={input}
            aria-label="Group Gantt"
            value={prefs.group}
            onChange={(e) => patchPrefs({ group: e.target.value as Preferences["group"] })}
          >
            <option value="sets">By set & stage</option>
            <option value="departments">By department</option>
          </select>
          <button
            className={button}
            onClick={() => {
              if (scroller.current)
                scroller.current.scrollLeft = Math.max(
                  0,
                  x(today) - Math.max(0, viewport.width - tableWidth) / 2,
                );
            }}
          >
            Today
          </button>
          <button className={button} onClick={fit}>
            Fit
          </button>
          <select
            className={input}
            aria-label="Gantt zoom"
            value={prefs.zoom}
            onChange={(e) => zoom(Number(e.target.value))}
          >
            {![2, 6, 12, 24, 48].includes(prefs.zoom) && <option value={prefs.zoom}>Fit</option>}
            <option value={2}>Whole run</option>
            <option value={6}>Months</option>
            <option value={12}>Weeks</option>
            <option value={24}>Days</option>
            <option value={48}>Close up</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button className="min-h-9 underline" onClick={() => patchPrefs({ collapsed: [] })}>
            Expand all
          </button>
          <button className="min-h-9 underline" onClick={() => patchPrefs({ collapsed: null })}>
            Collapse all
          </button>
          <label className="flex min-h-9 items-center gap-1">
            <input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} />{" "}
            Dependencies
          </label>
          <label className="flex min-h-9 items-center gap-1">
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
            />{" "}
            Critical tasks
          </label>
        </div>
        {columnsOpen && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
            {["owner", "status", "start", "finish", "duration", "float"].map((c) => (
              <label key={c} className="flex min-h-9 items-center gap-1">
                <input
                  type="checkbox"
                  checked={prefs.columns.includes(c)}
                  onChange={(e) =>
                    patchPrefs({
                      columns: e.target.checked
                        ? [...prefs.columns, c]
                        : prefs.columns.filter((x) => x !== c),
                    })
                  }
                />
                {c === "float" ? "Float (days)" : c.charAt(0).toUpperCase() + c.slice(1)}
              </label>
            ))}
            <label>
              Table width{" "}
              <input
                aria-label="Table width"
                type="range"
                min="320"
                max="1000"
                step="20"
                value={prefs.tableWidth}
                onChange={(e) => patchPrefs({ tableWidth: Number(e.target.value) })}
              />
            </label>
          </div>
        )}
        <p className="text-xs text-ink-soft">
          Click a cell to edit. Double-click a bar for details. Drag an unstarted task to move it.
          Stages may overlap; links define the handoffs. Durations use calendar days.
        </p>
      </div>
      {(data.error || notice) && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded border border-danger p-3 text-sm text-danger"
        >
          <span>{data.error || notice}</span>
          <button
            className={button}
            onClick={() => {
              setNotice("");
              void data.refresh().catch(() => undefined);
            }}
          >
            Refresh schedule
          </button>
        </div>
      )}
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Gantt chart"
        onScroll={(e) => {
          const el = e.currentTarget;
          setViewport({
            top: el.scrollTop,
            left: el.scrollLeft,
            width: el.clientWidth,
            height: el.clientHeight,
          });
          patchPrefs({ scrollTop: el.scrollTop, scrollLeft: el.scrollLeft });
        }}
        className="relative overflow-auto rounded-md border border-border bg-card"
        style={{ height: full ? "calc(100vh - 270px)" : "min(68vh, 720px)", minHeight: 320 }}
      >
        <div style={{ width: tableWidth + timelineWidth, minHeight: "100%" }}>
          <div
            className="sticky top-0 z-40 flex border-b border-border bg-cream"
            style={{ height: HH }}
          >
            <div
              className="sticky left-0 z-50 flex shrink-0 overflow-hidden border-r border-border bg-cream"
              style={{ width: tableWidth }}
            >
              <span className="shrink-0 p-3 text-xs font-semibold" style={{ width: titleWidth }}>
                Set / stage / task
              </span>
              {columns.map((c) => (
                <span key={c} className="w-[100px] shrink-0 p-3 text-xs capitalize">
                  {c === "float" ? "Float (days)" : c}
                </span>
              ))}
              <div
                role="separator"
                aria-label="Resize task table"
                aria-orientation="vertical"
                tabIndex={0}
                className="absolute inset-y-0 right-0 w-2 cursor-col-resize bg-border/50"
                onKeyDown={(e) => {
                  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    patchPrefs({
                      tableWidth: Math.min(
                        1000,
                        Math.max(320, prefs.tableWidth + (e.key === "ArrowRight" ? 20 : -20)),
                      ),
                    });
                  }
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  e.currentTarget.dataset["start"] = String(e.clientX);
                  e.currentTarget.dataset["width"] = String(prefs.tableWidth);
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    patchPrefs({
                      tableWidth: Math.min(
                        1000,
                        Math.max(
                          320,
                          Number(e.currentTarget.dataset["width"]) +
                            e.clientX -
                            Number(e.currentTarget.dataset["start"]),
                        ),
                      ),
                    });
                }}
              />
            </div>
            <div className="relative shrink-0" style={{ width: timelineWidth }}>
              {(data.state?.milestones ?? [])
                .filter((m) => m.due_date)
                .map((m) => (
                  <span
                    key={m.id}
                    role="img"
                    aria-label={`Milestone ${m.name}: ${m.due_date}`}
                    title={`${m.name} · Planned ${m.due_date}${m.forecast_date ? ` · Forecast ${m.forecast_date}` : ""}`}
                    className="absolute bottom-0 z-10 -translate-x-1/2 text-sm text-gold-deep"
                    style={{ left: x(m.due_date) }}
                  >
                    ◆
                  </span>
                ))}
              {ticks
                .filter(
                  (t) => t.left >= viewport.left - 100 && t.left <= viewport.left + viewport.width,
                )
                .map((t) => (
                  <span
                    key={t.key}
                    className="absolute top-3 whitespace-nowrap text-xs"
                    style={{ left: t.left }}
                  >
                    {t.label}
                  </span>
                ))}
            </div>
          </div>
          <div className="relative" style={{ height: Math.max(RH, rows.length * RH) }}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0"
              style={{
                left: tableWidth,
                width: timelineWidth,
                backgroundImage:
                  "linear-gradient(to right, var(--color-border, #d5cec2) 1px, transparent 1px)",
                backgroundSize: `${prefs.zoom * (prefs.zoom < 2 ? 90 : prefs.zoom < 8 ? 30 : 7)}px 100%`,
              }}
            >
              <div
                className="absolute inset-y-0 border-l-2 border-blue-400/60"
                style={{ left: x(today) }}
              />
            </div>
            {visible.map((row, offset) => {
              const t = row.task;
              const index = windowRows.start + offset;
              return (
                <div
                  key={row.key}
                  data-gantt-row={row.key}
                  className={`absolute left-0 flex w-full border-b border-border/60 ${t ? "" : "bg-cream/40"}`}
                  style={{ top: index * RH, height: RH }}
                >
                  <div
                    className={`sticky left-0 z-30 flex shrink-0 overflow-hidden border-r border-border ${selected === t?.id ? "bg-blue-50" : t ? "bg-card" : "bg-cream-soft"}`}
                    style={{ width: tableWidth }}
                  >
                    <div
                      className="flex shrink-0 items-center gap-1 overflow-hidden pr-1"
                      style={{ width: titleWidth, paddingLeft: 8 + row.depth * 12 }}
                    >
                      {row.expandable ? (
                        <button
                          className="h-11 w-5 shrink-0"
                          aria-label={`${collapsed.has(row.key) ? "Expand" : "Collapse"} ${row.name}`}
                          aria-expanded={!collapsed.has(row.key)}
                          onClick={() => toggle(row)}
                        >
                          {collapsed.has(row.key) ? (
                            <ChevronRight className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                      {t && cell?.id === t.id && cell.field === "title" ? (
                        <form
                          className="min-w-0 flex-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveCell();
                          }}
                        >
                          <input
                            autoFocus
                            required
                            maxLength={500}
                            aria-label={`Rename ${t.title}`}
                            className="h-10 w-full min-w-0 border-2 border-blue-500 bg-card px-1 text-sm"
                            value={cell.value}
                            onChange={(e) => setCell({ ...cell, value: e.target.value })}
                            onBlur={(e) => {
                              if (e.target.checkValidity()) void saveCell();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setCell(null);
                              }
                            }}
                          />
                        </form>
                      ) : (
                        <button
                          className={`h-11 min-w-0 flex-1 truncate text-left text-sm ${t ? "" : "font-semibold"}`}
                          title={row.name}
                          onClick={() => (t ? setSelected(t.id) : toggle(row))}
                          onDoubleClick={() => t && setDetail(t.id)}
                          onKeyDown={(e) => {
                            if (t && editable && e.key === "F2") {
                              e.preventDefault();
                              setCell({ id: t.id, field: "title", value: t.title });
                            }
                            if (t && e.key === "Enter") setDetail(t.id);
                          }}
                        >
                          {row.name}
                        </button>
                      )}
                      {editable && !locked && row.kind === "set" && (
                        <button
                          className="h-11 w-6 shrink-0"
                          aria-label={`Add stage to ${row.name}`}
                          title="Add stage"
                          onClick={() => setStageForm({ scene: row.sceneId!, name: "" })}
                        >
                          <Plus className="size-4" />
                        </button>
                      )}
                      {editable && !locked && row.kind === "stage" && (
                        <button
                          className="h-11 w-6 shrink-0"
                          aria-label={`Add task to ${row.name}`}
                          title="Add task"
                          onClick={() => setEditor({ sceneId: row.sceneId, stageId: row.stageId })}
                        >
                          <Plus className="size-4" />
                        </button>
                      )}
                      {t && editable && !locked && (
                        <button
                          className="h-11 w-6 shrink-0"
                          title="Dependencies"
                          aria-label={`Dependencies for ${t.title}`}
                          onClick={() =>
                            setLinkForm({
                              task: t.id,
                              predecessor: "",
                              type: "finish_to_start",
                              lag: 0,
                            })
                          }
                        >
                          <Link2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {columns.map((c) => (
                      <div key={c} className="w-[100px] shrink-0 border-l border-border/50">
                        {t ? field(t, c) : null}
                      </div>
                    ))}
                  </div>
                  <div className="relative shrink-0" style={{ width: timelineWidth }}>
                    {renderBar(row)}
                  </div>
                </div>
              );
            })}
            {links && (
              <svg
                className="pointer-events-none absolute top-0 z-20 overflow-visible"
                style={{ left: tableWidth, width: timelineWidth, height: rows.length * RH }}
                aria-label="Task dependencies"
              >
                <defs>
                  <marker
                    id={`gantt-arrow-${sceneId ?? projectId}`}
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
                  </marker>
                </defs>
                {dependencies.flatMap((d) => {
                  const a = taskToRow.get(d.depends_on_task_id),
                    b = taskToRow.get(d.task_id);
                  if (
                    a === undefined ||
                    b === undefined ||
                    a === b ||
                    Math.max(a, b) < windowRows.start ||
                    Math.min(a, b) >= windowRows.end
                  )
                    return [];
                  const from = byId.get(d.depends_on_task_id),
                    to = byId.get(d.task_id);
                  if (!from || !to) return [];
                  const ends = dependencyEnds(d.type);
                  const datesA = taskSpan([from], "forecast"),
                    datesB = taskSpan([to], "forecast");
                  if (!datesA.start || !datesA.finish || !datesB.start || !datesB.finish) return [];
                  const x1 = x(ends.from === "finish" ? addDays(datesA.finish, 1) : datesA.start),
                    x2 = x(ends.to === "finish" ? addDays(datesB.finish, 1) : datesB.start),
                    y1 = a * RH + 22,
                    y2 = b * RH + 22;
                  const mid = x1 + 12;
                  const selectedLink = selected === from.id || selected === to.id;
                  return [
                    <path
                      key={d.id}
                      d={`M${x1},${y1} H${mid} V${y2} H${x2}`}
                      fill="none"
                      stroke={selectedLink ? "#2563eb" : "#9c8c79"}
                      strokeWidth={selectedLink ? 2 : 1.2}
                      strokeDasharray={d.hard_constraint ? undefined : "4 3"}
                      markerEnd={`url(#gantt-arrow-${sceneId ?? projectId})`}
                      className="pointer-events-auto cursor-pointer"
                      style={{ pointerEvents: "stroke" }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${from.title} → ${to.title}`}
                      onClick={() =>
                        setLinkForm({
                          task: to.id,
                          predecessor: from.id,
                          type: d.type,
                          lag: d.lag_hours,
                          existing: true,
                        })
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        setLinkForm({
                          task: to.id,
                          predecessor: from.id,
                          type: d.type,
                          lag: d.lag_hours,
                          existing: true,
                        })
                      }
                    >
                      <title>
                        {from.title} → {to.title} · {d.type.replaceAll("_", " ")} · {d.lag_hours}h
                        buffer
                      </title>
                    </path>,
                  ];
                })}
              </svg>
            )}
            {rows.length === 0 && (
              <p className="sticky left-0 w-80 p-4 text-sm">
                No tasks match this view. Clear the filters to see all work.
              </p>
            )}
          </div>
        </div>
      </div>
      {selected && byId.has(selected) && (
        <div className="surface-card flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="mr-auto font-medium">{byId.get(selected)!.title}</span>
          <button className={button} onClick={() => setDetail(selected)}>
            Open details
          </button>
          {editable && (
            <>
              <button
                className={button}
                onClick={() => {
                  focusTask(selected);
                  setCell({ id: selected, field: "title", value: byId.get(selected)!.title });
                }}
              >
                Rename
              </button>
              <button className={button} onClick={() => setEditor({ taskId: selected })}>
                Edit task
              </button>
              <button
                className={button}
                onClick={() =>
                  setEditor({ sceneId: byId.get(selected)!.scene_id, parentId: selected })
                }
              >
                Add subtask
              </button>
              <button
                className={button}
                onClick={() =>
                  setLinkForm({ task: selected, predecessor: "", type: "finish_to_start", lag: 0 })
                }
              >
                Dependencies
              </button>
            </>
          )}
          <button className={button} onClick={() => setSelected("")} aria-label="Clear selection">
            <X className="size-4" />
          </button>
        </div>
      )}
      {data.preview && (
        <Modal title="Review schedule changes" onClose={data.cancel}>
          <p className="mb-3 text-sm">
            Review the affected work before saving. Recorded actual dates stay unchanged.
          </p>
          {data.preview.warnings.map((w) => (
            <p className="mb-2 rounded bg-danger/10 p-3 text-sm text-danger" key={w}>
              {w}
            </p>
          ))}
          <ul className="max-h-72 overflow-auto divide-y divide-border">
            {data.preview.changes.map((c) => (
              <li className="py-2 text-sm" key={c.id}>
                <strong>{c.title}</strong>
                <p className="text-xs">{c.before}</p>
                <p className="text-xs">→ {c.after}</p>
              </li>
            ))}
          </ul>
          {!data.preview.changes.length && (
            <p className="text-sm">
              The dependency will be updated without changing forecast dates.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button className={button} disabled={data.busy} onClick={() => void data.confirm()}>
              Save changes
            </button>
            <button className={button} disabled={data.busy} onClick={data.cancel}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {cell &&
        cell.field !== "title" &&
        !columns.some(
          (c) =>
            (c === "owner"
              ? "owner_id"
              : c === "start"
                ? "start_date"
                : c === "finish"
                  ? "due_date"
                  : c) === cell.field,
        ) && (
          <Modal title={`Edit ${cell.field.replaceAll("_", " ")}`} onClose={() => setCell(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveCell();
              }}
            >
              <label className="block text-sm">
                {byId.get(cell.id)?.title}
                {cell.field === "owner_id" ? (
                  <select
                    autoFocus
                    aria-label="Owner"
                    className={input + " mt-2 w-full"}
                    value={cell.value}
                    onChange={(e) => setCell({ ...cell, value: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                ) : cell.field === "status" ? (
                  <select
                    autoFocus
                    aria-label="Status"
                    className={input + " mt-2 w-full"}
                    value={cell.value}
                    onChange={(e) => setCell({ ...cell, value: e.target.value })}
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Complete</option>
                  </select>
                ) : (
                  <input
                    autoFocus
                    required
                    aria-label="New value"
                    className={input + " mt-2 w-full"}
                    type={
                      cell.field.endsWith("_date")
                        ? "date"
                        : cell.field === "duration"
                          ? "number"
                          : "text"
                    }
                    value={cell.value}
                    onChange={(e) => setCell({ ...cell, value: e.target.value })}
                  />
                )}
              </label>
              <button className={button + " mt-4"} disabled={locked}>
                Save
              </button>
            </form>
          </Modal>
        )}
      {linkForm && (
        <Modal title="Task dependencies" onClose={() => setLinkForm(null)}>
          <p className="mb-3 text-sm font-semibold">{byId.get(linkForm.task)?.title}</p>
          <ul className="mb-3 space-y-2">
            {(predecessorMap.get(linkForm.task) ?? []).map((d) => (
              <li key={d.id} className="flex gap-2 text-xs">
                <button
                  className="flex-1 text-left underline"
                  onClick={() => {
                    setLinkForm(null);
                    focusTask(d.depends_on_task_id);
                  }}
                >
                  {byId.get(d.depends_on_task_id)?.title} · {d.type.replaceAll("_", " ")} ·{" "}
                  {d.lag_hours}h
                </button>
                {editable && (
                  <button
                    className="min-h-9 underline"
                    disabled={locked}
                    onClick={() => {
                      setLinkForm(null);
                      void data.propose([
                        {
                          action: "unlink",
                          task_id: d.task_id,
                          predecessor_id: d.depends_on_task_id,
                        },
                      ]);
                    }}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setLinkForm(null);
                void data.propose([
                  {
                    action: "link",
                    task_id: linkForm.task,
                    predecessor_id: linkForm.predecessor,
                    type: linkForm.type,
                    lag_hours: linkForm.lag,
                    hard_constraint: true,
                  },
                ]);
              }}
            >
              <label className="block text-sm">
                Prerequisite
                <select
                  required
                  aria-label="Prerequisite"
                  className={input + " mt-1 w-full"}
                  value={linkForm.predecessor}
                  onChange={(e) => setLinkForm({ ...linkForm, predecessor: e.target.value })}
                >
                  <option value="">Choose a task…</option>
                  {tasks
                    .filter((t) => t.id !== linkForm.task && !parents.has(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {store.scenes.find((s) => s.id === t.scene_id)?.name} · {t.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm">
                Relationship
                <select
                  aria-label="Relationship"
                  className={input + " mt-1 w-full"}
                  value={linkForm.type}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, type: e.target.value as TaskDependency["type"] })
                  }
                >
                  <option value="finish_to_start">Finish → Start</option>
                  <option value="start_to_start">Start → Start</option>
                  <option value="finish_to_finish">Finish → Finish</option>
                  <option value="start_to_finish">Start → Finish</option>
                </select>
              </label>
              <label className="block text-sm">
                Buffer in hours
                <input
                  className={input + " mt-1 w-full"}
                  type="number"
                  min="0"
                  max="87600"
                  step="1"
                  value={linkForm.lag}
                  onChange={(e) => setLinkForm({ ...linkForm, lag: Number(e.target.value) })}
                />
              </label>
              <p className="text-xs text-ink-soft">
                Date-only schedules round partial-day buffers to calendar dates. Independent tasks
                need no link.
              </p>
              <button className={button} disabled={locked}>
                {linkForm.existing ? "Update dependency" : "Add dependency"}
              </button>
            </form>
          )}
        </Modal>
      )}
      {stageForm && (
        <Modal title="Add stage" onClose={() => setStageForm(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await store.manageStage(stageForm.scene, "save", stageForm.name))
                setStageForm(null);
            }}
          >
            <label className="block text-sm">
              Stage name
              <input
                autoFocus
                required
                maxLength={100}
                className={input + " mt-1 w-full"}
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
              />
            </label>
            <button className={button + " mt-4"} disabled={store.saving}>
              Save stage
            </button>
          </form>
        </Modal>
      )}
      {detail && (
        <TaskDetailPanel
          taskId={detail}
          onClose={() => setDetail("")}
          {...(editable
            ? {
                onEdit: (id: string) => {
                  setDetail("");
                  setEditor({ taskId: id });
                },
              }
            : {})}
        />
      )}
      {editor && (
        <WorkItemEditor
          projectId={projectId}
          {...(editor.taskId ? { taskId: editor.taskId } : {})}
          {...(editor.sceneId ? { presetSceneId: editor.sceneId } : {})}
          {...(editor.stageId ? { presetStageId: editor.stageId } : {})}
          {...(editor.parentId ? { presetParentTaskId: editor.parentId } : {})}
          onClose={() => {
            setEditor(null);
            void data.refresh().catch(() => undefined);
          }}
        />
      )}
      <p className="text-xs text-ink-soft">
        {editable ? "Administrator planning access" : "Read-only schedule"} · {rows.length} rows ·{" "}
        <Link
          to="/projects/$projectId/sets"
          params={{ projectId }}
          search={{ ...(sceneId ? { set: sceneId } : {}), section: "tasks" }}
          className="underline"
        >
          Manage sets and stages
        </Link>
      </p>
    </section>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focus = el?.querySelector<HTMLElement>("input,select,button");
    focus?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[88vh] w-full max-w-xl overflow-auto rounded-xl bg-card p-5 shadow-xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const items = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
              ),
            ];
            const first = items[0],
              last = items.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button className={button} aria-label={`Close ${title}`} onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
