import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Crosshair,
  Diamond,
  Link2,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { SetDialog } from "@/components/SetDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { departments, personById, taskDependencies, useStore } from "@/lib/store";
import {
  criticalityMeta,
  dependencyTypeLabel,
  formatDate,
  formatFloat,
  milestoneStatusMeta,
  scheduleHealth,
  setStatusMeta,
  taskStatusMeta,
  toneClasses,
  type Tone,
} from "@/lib/status";
import {
  addDays,
  axisTicks,
  dateAtX,
  daysBetween,
  placePx,
  slipDays,
  spanOfDates,
  xAt,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/lib/schedule";
import type { Milestone, ReschedulePreviewRow, Scene, Task } from "@/lib/production-data";

/** Solid bar fills, one per tone — always paired with an icon and a text label. */
const toneBarClasses: Record<Tone, string> = {
  success: "bg-success border-success",
  warning: "bg-warning border-warning",
  danger: "bg-danger border-danger",
  info: "bg-info border-info",
  neutral: "bg-neutral-status border-neutral-status",
};

/** Hatching laid over a blocked bar so it reads as blocked even without colour. */
const BLOCKED_HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 4px, transparent 4px, transparent 9px)",
};

/** Bar colouring, icon and pattern are all driven by the one shared calculation. */
function barLook(task: Task) {
  const health = scheduleHealth(task);
  return { health, className: toneBarClasses[health.meta.tone] };
}

/** The coloured edge on a row carries the same computed schedule health. */
function edgeClasses(task: Task): string {
  const tone = scheduleHealth(task).meta.tone;
  return tone === "danger"
    ? "text-danger"
    : tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "neutral"
          ? "text-neutral-status"
          : "text-info";
}

const todayISO = new Date().toISOString().slice(0, 10);
const NAME_COL = 352; // 22rem — the fixed work-item column
const ROW_H = 80;

type Row = { task: Task; isChild: boolean };
type Group = { key: string; scene: Scene; label: string; rows: Row[] };
type Arrow = {
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  from: string;
  to: string;
};

/** True once the viewport is wide enough for the bar chart itself. */
function useWideScreen(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return wide;
}

export function MasterTimeline({
  projectId,
  sceneId: pinnedSceneId,
}: {
  projectId: string;
  /** When given, the chart shows only this set — used inside a set's own workspace. */
  sceneId?: string;
}) {
  const {
    tasks,
    scenes,
    can,
    isClosed,
    previewReschedule,
    setTaskDates,
    updateScene,
  } = useStore();
  const readOnly = isClosed(projectId) || !can.editCoreTimeline;
  const wide = useWideScreen();
  const [openSetId, setOpenSetId] = useState<string | null>(null);


  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === projectId),
    [tasks, projectId],
  );
  const projectScenes = useMemo(
    () =>
      scenes
        .filter((s) => s.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [scenes, projectId],
  );

  const clean: boolean = true;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);

  /** Hovering a set lights up the sets downstream of it in the chain. */
  const setChain = useMemo(() => {
    if (!hoveredScene) return null;
    const lit = new Set<string>([hoveredScene]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of projectScenes) {
        if (!lit.has(s.id) && s.depends_on_scene_id && lit.has(s.depends_on_scene_id)) {
          lit.add(s.id);
          grew = true;
        }
      }
    }
    let up = projectScenes.find((s) => s.id === hoveredScene)?.depends_on_scene_id;
    while (up && !lit.has(up)) {
      lit.add(up);
      up = projectScenes.find((s) => s.id === up)?.depends_on_scene_id;
    }
    return lit;
  }, [hoveredScene, projectScenes]);

  const locked = readOnly || clean;

  /** The chart window covers every set and work item on screen. */
  const baseSpan = useMemo(
    () =>
      spanOfDates([
        ...projectTasks.flatMap((t) => [
          t.start_date,
          t.due_date,
          t.forecast_start,
          t.forecast_finish,
        ]),
        ...projectScenes.flatMap((s) => [
          s.start_date,
          s.due_date,
          s.forecast_start,
          s.forecast_finish,
        ]),
      ]),
    [projectTasks, projectScenes],
  );

  /**
   * The calendar keeps going in both directions: scrolling near either edge adds
   * more weeks to the window, so you can always keep going.
   */
  const [pad, setPad] = useState({ before: 0, after: 0 });
  const span = useMemo(
    () => ({
      start: addDays(baseSpan.start, -pad.before),
      end: addDays(baseSpan.end, pad.after),
    }),
    [baseSpan, pad],
  );




  const totalDays = Math.max(1, daysBetween(span.start, span.end));

  /* ---------------- zoom + horizontal scroll ---------------- */

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pxPerDay, setPxPerDay] = useState(8);
  const [viewportWidth, setViewportWidth] = useState(900);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => setViewportWidth(Math.max(320, el.clientWidth - NAME_COL));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  const baseDays = Math.max(1, daysBetween(baseSpan.start, baseSpan.end));
  const fitZoom = Math.max(ZOOM_MIN, viewportWidth / baseDays);
  const chartWidth = Math.round(totalDays * pxPerDay);

  /** Open on the whole run so the shape of the production reads at a glance. */
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !wide) return;
    fitted.current = true;
    setPxPerDay(fitZoom);
  }, [fitZoom, wide]);

  /* Endless calendar: grow the window whenever a scroll reaches either edge. */
  const shiftAfterGrow = useRef(0);
  const growing = useRef(false);
  const CHUNK = 56; // days added each time

  const onChartScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || growing.current) return;
    const px = zoomRef.current;
    if (el.scrollLeft < 200) {
      growing.current = true;
      shiftAfterGrow.current = CHUNK * px;
      setPad((p) => ({ ...p, before: p.before + CHUNK }));
    } else if (el.scrollWidth - el.scrollLeft - el.clientWidth < 200) {
      growing.current = true;
      setPad((p) => ({ ...p, after: p.after + CHUNK }));
    }
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && shiftAfterGrow.current) {
      el.scrollLeft += shiftAfterGrow.current;
      shiftAfterGrow.current = 0;
    }
    growing.current = false;
  }, [pad]);



  const setZoom = useCallback(
    (next: number, anchorX?: number) => {
      const el = scrollRef.current;
      const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      setPxPerDay((current) => {
        if (el) {
          const anchor = anchorX ?? el.clientWidth / 2;
          const chartX = el.scrollLeft + anchor - NAME_COL;
          const ratio = clamped / current;
          requestAnimationFrame(() => {
            el.scrollLeft = Math.max(0, chartX * ratio - anchor + NAME_COL);
          });
        }
        return clamped;
      });
    },
    [],
  );

  const zoomRef = useRef(pxPerDay);
  zoomRef.current = pxPerDay;

  // Ctrl/⌘ + wheel and trackpad pinch zoom, anchored on the date under the cursor.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      setZoom(zoomRef.current * Math.exp(-dy * 0.002), e.clientX - rect.left);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom, wide]);

  const scrollToDate = useCallback(
    (date: string) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft = Math.max(0, xAt(span, date, pxPerDay) - (el.clientWidth - NAME_COL) / 2);
    },
    [span, pxPerDay],
  );

  const ticks = useMemo(() => axisTicks(span, pxPerDay), [span, pxPerDay]);
  const todayX =
    todayISO >= span.start && todayISO <= span.end ? xAt(span, todayISO, pxPerDay) : null;

  /* ---------------- rows: global (milestones) or per set (departments) ---------------- */

  const childrenOf = useCallback(
    (id: string) =>
      projectTasks
        .filter((t) => t.parent_task_id === id)
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [projectTasks],
  );

  /** Lays a group out so each sub-item sits directly under the work item it belongs to. */
  const nest = useCallback(
    (rows: Task[]): Row[] => {
      const byDate = [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const out: Row[] = [];
      for (const t of byDate) {
        if (t.parent_task_id && byDate.some((p) => p.id === t.parent_task_id)) continue;
        out.push({ task: t, isChild: Boolean(t.parent_task_id) });
        for (const c of childrenOf(t.id)) {
          if (byDate.some((r) => r.id === c.id)) out.push({ task: c, isChild: true });
        }
      }
      return out;
    },
    [childrenOf],
  );

  /**
   * The production timeline is planned set by set: it shows only the sets, their
   * dates and the chain between them. Work items appear on a set's own schedule.
   */
  const setsOnly = !pinnedSceneId;

  const groups: Group[] = useMemo(
    () =>
      (pinnedSceneId ? projectScenes.filter((s) => s.id === pinnedSceneId) : projectScenes).map(
        (s) => ({
          key: s.id,
          scene: s,
          label: s.name,
          rows: setsOnly ? [] : nest(projectTasks.filter((t) => t.scene_id === s.id)),
        }),
      ),
    [pinnedSceneId, projectScenes, projectTasks, nest, setsOnly],
  );

  const visibleTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groups) {
      if (collapsed[g.key]) continue;
      for (const r of g.rows) ids.add(r.task.id);
    }
    return ids;
  }, [groups, collapsed]);

  /* ---------------- dependency chain highlighting ---------------- */

  const taskById = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);
  const taskTitle = useCallback((id: string) => taskById(id)?.title ?? id, [taskById]);

  const focusId = hovered ?? openTask;
  const chain = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    const walk = (id: string, up: boolean) => {
      const next = up
        ? taskDependencies.filter((d) => d.task_id === id).map((d) => d.depends_on_task_id)
        : taskDependencies.filter((d) => d.depends_on_task_id === id).map((d) => d.task_id);
      for (const n of next) {
        if (set.has(n)) continue;
        set.add(n);
        walk(n, up);
      }
    };
    walk(focusId, true);
    walk(focusId, false);
    return set;
  }, [focusId]);

  /* ---------------- dependency arrows, measured from the rendered bars ---------------- */

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef(new Map<string, HTMLElement>());
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [surfaceHeight, setSurfaceHeight] = useState(0);

  const layoutKey = `${pinnedSceneId ?? ""}|${pxPerDay}|${[...visibleTaskIds].sort().join(",")}|${groups.map((g) => g.key).join(",")}`;

  useLayoutEffect(() => {
    if (!wide) {
      setArrows([]);
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const base = wrap.getBoundingClientRect();
    setSurfaceHeight(base.height);
    const next: Arrow[] = [];
    const chartLeft = NAME_COL;
    const chartRight = NAME_COL + chartWidth;
    for (const dep of taskDependencies) {
      const fromEl = barRefs.current.get(dep.depends_on_task_id);
      const toEl = barRefs.current.get(dep.task_id);
      if (!fromEl || !toEl) continue;
      if (!visibleTaskIds.has(dep.task_id) || !visibleTaskIds.has(dep.depends_on_task_id)) continue;
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      const fromEnd = dep.type === "start_to_start" || dep.type === "start_to_finish";
      const toEnd = dep.type === "finish_to_finish" || dep.type === "start_to_finish";
      const x1 = (fromEnd ? a.left : a.right) - base.left;
      const x2 = (toEnd ? b.right : b.left) - base.left;
      if (x2 < chartLeft || x1 > chartRight) continue;
      next.push({
        id: dep.id,
        label: `${dependencyTypeLabel[dep.type]}${dep.lag_hours ? ` +${dep.lag_hours}h` : ""}`,
        x1: Math.max(chartLeft, x1),
        y1: a.top + a.height / 2 - base.top,
        x2: Math.max(chartLeft, Math.min(chartRight, x2)),
        y2: b.top + b.height / 2 - base.top,
        from: dep.depends_on_task_id,
        to: dep.task_id,
      });
    }
    // Set-to-set chain: each set starts after the one it follows finishes.
    for (const s of projectScenes) {
      if (!s.depends_on_scene_id) continue;
      const fromEl = barRefs.current.get(`set-${s.depends_on_scene_id}`);
      const toEl = barRefs.current.get(`set-${s.id}`);
      if (!fromEl || !toEl) continue;
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      const x1 = a.right - base.left;
      const x2 = b.left - base.left;
      if (x2 < chartLeft || x1 > chartRight) continue;
      next.push({
        id: `set-chain-${s.id}`,
        label: s.lag_days ? `then +${s.lag_days}d` : "then",
        x1: Math.max(chartLeft, x1),
        y1: a.top + a.height / 2 - base.top,
        x2: Math.max(chartLeft, Math.min(chartRight, x2)),
        y2: b.top + b.height / 2 - base.top,
        from: `set-${s.depends_on_scene_id}`,
        to: `set-${s.id}`,
      });
    }
    setArrows(next);
  }, [layoutKey, wide, visibleTaskIds, projectScenes, chartWidth]);

  /* ---------------- drag to reschedule ---------------- */

  const [drag, setDrag] = useState<{
    taskId: string;
    kind: "move" | "resize";
    startX: number;
    days: number;
  } | null>(null);
  const [pending, setPending] = useState<{
    task: Task;
    start: string;
    due: string;
    rows: ReschedulePreviewRow[] | null;
  } | null>(null);

  const beginDrag = (task: Task, kind: "move" | "resize", e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ taskId: task.id, kind, startX: e.clientX, days: 0 });
  };

  const dragTask = drag ? taskById(drag.taskId) : undefined;

  useEffect(() => {
    if (!drag || !dragTask) return;
    const onMove = (e: PointerEvent) => {
      const days = Math.round((e.clientX - drag.startX) / pxPerDay);
      setDrag((cur) => (cur && cur.days !== days ? { ...cur, days } : cur));
    };
    const onUp = () => {
      const days = drag.days;
      setDrag(null);
      if (!days) return;
      const start = drag.kind === "move" ? addDays(dragTask.start_date, days) : dragTask.start_date;
      const due = addDays(dragTask.due_date, days);
      if (daysBetween(start, due) < 0) return;
      setPending({ task: dragTask, start, due, rows: null });
      void previewReschedule(dragTask.id, start, due)
        .then((rows) => setPending((cur) => (cur ? { ...cur, rows } : cur)))
        .catch(() => setPending((cur) => (cur ? { ...cur, rows: [] } : cur)));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, dragTask, pxPerDay, previewReschedule]);

  const commitPending = () => {
    if (!pending) return;
    setTaskDates(pending.task.id, pending.start, pending.due);
    setPending(null);
  };

  /* ---------------- drag a set's dates on the chart ---------------- */

  const canDragSets = !readOnly && can.adminConfig;
  const [sDrag, setSDrag] = useState<{
    sceneId: string;
    kind: "move" | "start" | "end";
    startX: number;
    days: number;
  } | null>(null);
  const sDragRef = useRef(sDrag);
  useEffect(() => {
    sDragRef.current = sDrag;
  }, [sDrag]);
  const setDragStartRef = useRef<{
    sceneId: string;
    kind: "move" | "start" | "end";
    startX: number;
  } | null>(null);
  const suppressSetClickRef = useRef(false);
  const SET_DRAG_THRESHOLD = 4;

  const beginSetDrag = (
    sceneId: string,
    kind: "move" | "start" | "end",
    e: React.PointerEvent | PointerEvent,
  ) => {
    if (!canDragSets) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setSDrag({ sceneId, kind, startX: e.clientX, days: 0 });
  };

  const handleSetPointerDown = (
    sceneId: string,
    kind: "move" | "start" | "end",
    e: React.PointerEvent,
  ) => {
    if (!canDragSets) return;
    e.preventDefault();
    e.stopPropagation();
    setDragStartRef.current = { sceneId, kind, startX: e.clientX };

    const onMove = (ev: PointerEvent) => {
      if (!setDragStartRef.current || sDragRef.current) return;
      const dx = Math.abs(ev.clientX - setDragStartRef.current.startX);
      if (dx > SET_DRAG_THRESHOLD) {
        suppressSetClickRef.current = true;
        beginSetDrag(sceneId, kind, ev);
        cleanup();
      }
    };
    const onUp = () => {
      cleanup();
      setDragStartRef.current = null;
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /** Sets that follow the one that moved slide along with it. */
  const cascadeFrom = useCallback(
    (sceneId: string, finish: string) => {
      let cursorId = sceneId;
      let cursorFinish = finish;
      const guard = new Set<string>([sceneId]);
      for (;;) {
        const next = projectScenes.find((s) => s.depends_on_scene_id === cursorId);
        if (!next || guard.has(next.id)) break;
        guard.add(next.id);
        const length = Math.max(0, daysBetween(next.start_date, next.due_date));
        const start = addDays(cursorFinish, 1 + (next.lag_days || 0));
        const due = addDays(start, length);
        void updateScene(next.id, projectId, { start_date: start, due_date: due });
        cursorId = next.id;
        cursorFinish = due;
      }
    },
    [projectScenes, updateScene, projectId],
  );

  useEffect(() => {
    if (!sDrag) return;
    const scene = projectScenes.find((s) => s.id === sDrag.sceneId);
    if (!scene) return;
    const onMove = (e: PointerEvent) => {
      const days = Math.round((e.clientX - sDrag.startX) / pxPerDay);
      setSDrag((cur) => (cur && cur.days !== days ? { ...cur, days } : cur));
    };
    const onUp = () => {
      const { kind, days } = sDrag;
      setSDrag(null);
      if (!days) return;
      const start =
        kind === "end" ? scene.start_date : addDays(scene.start_date || todayISO, days);
      const due = kind === "start" ? scene.due_date : addDays(scene.due_date || todayISO, days);
      if (daysBetween(start, due) < 0) return;
      const patch =
        kind === "start"
          ? { start_date: start }
          : kind === "end"
            ? { due_date: due }
            : { start_date: start, due_date: due };
      void Promise.resolve(updateScene(scene.id, projectId, patch)).then(() =>
        cascadeFrom(scene.id, due),
      );
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [sDrag, projectScenes, pxPerDay, updateScene, projectId, cascadeFrom]);


  /* ---------------- render ---------------- */

  const detail = openTask ? taskById(openTask) : undefined;

  const chartCell = (row: Row) => {
    const { task } = row;
    const dimmed = chain ? !chain.has(task.id) : false;
    const dragging = drag?.taskId === task.id;
    const shift = dragging ? drag.days * pxPerDay : 0;
    const live = placePx(span, task.forecast_start, task.forecast_finish, pxPerDay);
    const planned = placePx(span, task.start_date, task.due_date, pxPerDay);
    const { health, className: barClass } = barLook(task);
    const Icon = health.meta.Icon;
    const blocked = task.status === "blocked";
    return (
      <div className="relative h-20" style={{ width: chartWidth }}>
        {ticks.map((t) => (
          <span
            key={t.key}
            style={{ left: t.left }}
            aria-hidden
            className={`absolute inset-y-0 w-px ${t.major ? "bg-border-strong" : "bg-border"}`}
          />
        ))}
        {todayX !== null && (
          <span
            style={{ left: todayX }}
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-gold"
          />
        )}
        {/* ghost baseline: the committed plan, faint behind the live forecast bar */}
        <span
          style={{ left: planned.left, width: planned.width }}
          aria-hidden
          className={`absolute top-4 h-2.5 rounded-full border border-border-strong bg-band ${dimmed ? "opacity-30" : "opacity-70"}`}
        />
        <span
          ref={(el) => {
            if (el) barRefs.current.set(task.id, el);
            else barRefs.current.delete(task.id);
          }}
          role="button"
          tabIndex={0}
          onPointerDown={(e) => {
            if (e.button === 0 && !locked) beginDrag(task, "move", e);
          }}
          onClick={() => setOpenTask((cur) => (cur === task.id ? null : task.id))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenTask((cur) => (cur === task.id ? null : task.id));
            }
          }}
          onMouseEnter={() => setHovered(task.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            left: live.left + shift,
            width: live.width + (dragging && drag.kind === "resize" ? drag.days * pxPerDay : 0),
            ...(blocked ? BLOCKED_HATCH : {}),
          }}
          title={`${task.title} · ${health.meta.label}${health.detail ? ` · ${health.detail}` : ""} · ${formatFloat(task.total_float_hours)}`}
          className={`absolute top-8 flex h-7 items-center gap-1 overflow-hidden rounded-md border px-2 text-[11px] font-semibold whitespace-nowrap text-cream-soft shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${barClass} ${
            dimmed ? "opacity-40" : ""
          } ${openTask === task.id ? "ring-2 ring-ink" : ""} ${blocked ? "ring-1 ring-inset ring-cream-soft/80" : ""} ${locked ? "cursor-pointer" : "cursor-grab"}`}
        >
          <Icon aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{health.meta.label}</span>
          {!locked && (
            <span
              aria-hidden
              onPointerDown={(e) => {
                e.stopPropagation();
                beginDrag(task, "resize", e);
              }}
              className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-black/15"
            />
          )}
        </span>
        {dragging && drag.days !== 0 && (
          <span
            style={{ left: live.left + shift, top: 4 }}
            className="absolute rounded-md border border-ink bg-card px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow-sm"
          >
            {drag.days > 0 ? `+${drag.days}` : drag.days} days
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* view controls */}
      <div className="flex flex-wrap items-center gap-2">

        <div className="flex overflow-hidden rounded-md border border-border-strong">
          {(
            [
              { id: "week", label: "Week", px: 22 },
              { id: "month", label: "Month", px: 8 },
              { id: "all", label: "Whole run", px: fitZoom },
            ] as const
          ).map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoom(z.px)}
              className={`min-h-11 px-3 text-sm font-medium ${
                Math.abs(pxPerDay - z.px) < 0.6
                  ? "bg-ink text-cream-soft"
                  : "bg-card text-ink-soft hover:bg-cream"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollToDate(todayISO)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 text-sm font-medium text-ink hover:bg-cream"
        >
          <Crosshair aria-hidden className="size-4" /> Today
        </button>
      </div>


      {/* legend */}
      {!clean && (
        <div className="flex flex-wrap items-center gap-2">
          {!setsOnly &&
            (["critical", "near_critical", "normal"] as const).map((c) => (
              <StatusBadge key={c} meta={criticalityMeta[c]} size="sm" />
            ))}
          <span className="flex items-center gap-1.5 rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
            <span aria-hidden className="h-2 w-5 rounded-full border border-border-strong bg-band" />
            Committed plan
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
            <span aria-hidden className="h-0.5 w-4 bg-gold" /> Today
          </span>
          <span className="rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
            Ctrl or ⌘ + scroll to zoom
          </span>
          {setsOnly ? (
            <span className="rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
              Open a set to plan the work inside it
            </span>
          ) : readOnly ? (
            <span className="flex items-center gap-1.5 rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
              <Lock aria-hidden className="size-3.5" /> Dates are read-only for you here
            </span>
          ) : (
            <span className="rounded-md border border-border-strong bg-card px-2.5 py-1 text-xs text-ink-soft">
              Drag a bar to reschedule — you'll see the knock-on effect first
            </span>
          )}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div ref={scrollRef} onScroll={onChartScroll} className="overflow-x-auto">
          <div ref={wrapRef} className="relative" style={wide ? { width: NAME_COL + chartWidth } : undefined}>
            {/* axis */}
            {wide && (
              <div className="panel-header sticky top-0 z-30 flex">
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-border-strong bg-band px-4 py-2"
                  style={{ width: NAME_COL }}
                >
                  <span className="rule-label">{setsOnly ? "Sets" : "Sets & work"}</span>
                </div>
                <div className="relative py-2" style={{ width: chartWidth }}>
                  {ticks.map((t) => (

                    <span
                      key={t.key}
                      style={{ left: t.left }}
                      className={`absolute top-2 -translate-x-1/2 text-xs whitespace-nowrap ${
                        t.major ? "font-semibold text-ink" : "text-ink-soft"
                      }`}
                    >
                      {t.label}
                    </span>
                  ))}
                  <span className="invisible text-xs">months</span>
                </div>
              </div>
            )}

            {/* dependency arrows */}
            {wide && arrows.length > 0 && (
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20"
                width={NAME_COL + chartWidth}
                height={surfaceHeight}
              >
                <defs>
                  <clipPath id="gantt-clip">
                    <rect x={NAME_COL} y={0} width={chartWidth} height={surfaceHeight} />
                  </clipPath>
                  <marker id="gantt-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
                  </marker>
                </defs>
                <g clipPath="url(#gantt-clip)">
                {arrows.map((a) => {
                  const lit = setChain
                    ? setChain.has(a.from.replace("set-", "")) &&
                      setChain.has(a.to.replace("set-", ""))
                    : chain
                      ? chain.has(a.from) && chain.has(a.to)
                      : false;
                  const mid = a.x2 > a.x1 ? (a.x1 + a.x2) / 2 : a.x1 + 14;
                  const d = `M ${a.x1} ${a.y1} H ${mid} V ${a.y2} H ${a.x2}`;
                  return (
                    <g
                      key={a.id}
                      className={lit ? "text-ink" : "text-ink-soft"}
                      opacity={chain ? (lit ? 1 : 0.12) : 0.4}
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={lit ? 2 : 1.25}
                        markerEnd="url(#gantt-arrow)"
                      />
                      {lit && (
                        <text
                          x={mid + 4}
                          y={(a.y1 + a.y2) / 2 - 3}
                          className="fill-current text-[10px] font-semibold"
                        >
                          {a.label}
                        </text>
                      )}
                    </g>
                  );
                })}
                </g>
              </svg>
            )}

            {/* rows */}
            <div>
              {groups.map((group) => {
                const isCollapsed = collapsed[group.key] === true;
                const s = group.scene;
                const slip = slipDays(s.due_date, s.forecast_finish);
                const setPlanned = placePx(span, s.start_date, s.due_date, pxPerDay);
                
                const setDimmed = setChain ? !setChain.has(s.id) : false;
                const follows = projectScenes.find((o) => o.id === s.depends_on_scene_id);
                return (
                  <section key={group.key}>
                    <header className="group-header flex items-stretch">
                      {(() => {
                        const inner = (
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-ink">{group.label}</span>
                              {!setsOnly && (
                                <span className="rounded-full border border-border-strong bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                                  {group.rows.length}
                                </span>
                              )}
                              {!clean && <StatusBadge meta={setStatusMeta[s.status]} size="sm" />}
                            </span>
                            <span className="mt-1 block text-xs text-ink-soft">
                              {s.start_date ? formatDate(s.start_date) : "No start"} –{" "}
                              {s.due_date ? formatDate(s.due_date) : "No finish"}
                              {s.start_date && s.due_date &&
                                ` · ${Math.max(1, daysBetween(s.start_date, s.due_date))} days`}
                              {slip > 0 && (
                                <span className="font-semibold text-danger">
                                  {" "}
                                  · {slip} days late
                                </span>
                              )}
                              {follows && ` · follows ${follows.name}`}
                            </span>

                          </span>
                        );
                        const shellClass =
                          "flex shrink-0 items-start gap-2 px-4 py-2.5 text-left lg:sticky lg:left-0 lg:z-10 lg:bg-band";
                        const shellStyle = wide ? { width: NAME_COL } : undefined;
                        return setsOnly ? (
                          <button
                            type="button"
                            onClick={() => setOpenSetId(s.id)}
                            onMouseEnter={() => wide && setHoveredScene(s.id)}
                            onMouseLeave={() => wide && setHoveredScene(null)}
                            className={shellClass}
                            style={shellStyle}
                          >
                            {inner}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsed((cur) => ({ ...cur, [group.key]: !isCollapsed }))
                            }
                            onMouseEnter={() => wide && setHoveredScene(s.id)}
                            onMouseLeave={() => wide && setHoveredScene(null)}
                            aria-expanded={!isCollapsed}
                            className={shellClass}
                            style={shellStyle}
                          >
                            {isCollapsed ? (
                              <ChevronRight
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 text-ink"
                              />
                            ) : (
                              <ChevronDown aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
                            )}
                            {inner}
                          </button>
                        );
                      })()}
                      {wide && (
                        <div
                          className="relative"
                          style={{ width: chartWidth, minHeight: setsOnly ? 64 : 56 }}
                        >
                          {/* gridlines keep every bar readable against the axis */}
                          {ticks.map((t) => (
                            <span
                              key={t.key}
                              style={{ left: t.left }}
                              aria-hidden
                              className={`absolute inset-y-0 w-px ${t.major ? "bg-border-strong" : "bg-border"}`}
                            />
                          ))}
                          {todayX !== null && (
                            <span
                              style={{ left: todayX }}
                              aria-hidden
                              className="absolute inset-y-0 w-0.5 bg-gold"
                            />
                          )}
                          {/* committed plan: the bar people read, and drag */}
                          {(() => {
                            const dragging = sDrag?.sceneId === s.id;
                            const shift = dragging ? sDrag.days * pxPerDay : 0;
                            const left =
                              setPlanned.left + (dragging && sDrag.kind !== "end" ? shift : 0);
                            const width =
                              setPlanned.width +
                              (dragging && sDrag.kind === "end" ? shift : 0) +
                              (dragging && sDrag.kind === "start" ? -shift : 0);
                            return (
                              <>
                                <button
                                  type="button"
                                  ref={(el) => {
                                    if (el) barRefs.current.set(`set-${s.id}`, el);
                                    else barRefs.current.delete(`set-${s.id}`);
                                  }}
                                  onPointerDown={(e) => {
                                    if (e.button === 0 && canDragSets) handleSetPointerDown(s.id, "move", e);
                                  }}
                                  onClick={() => {
                                    if (suppressSetClickRef.current) {
                                      suppressSetClickRef.current = false;
                                      return;
                                    }
                                    if (!sDrag) setOpenSetId(s.id);
                                  }}
                                  onMouseEnter={() => setHoveredScene(s.id)}
                                  onMouseLeave={() => setHoveredScene(null)}
                                  style={{ left, width: Math.max(pxPerDay, width) }}
                                  title={`${s.name} · ${formatDate(s.start_date)} – ${formatDate(s.due_date)}${
                                    canDragSets ? " · drag the bar or its ends to reschedule" : ""
                                  }`}
                                  className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md border border-ink bg-ink px-2 text-[11px] font-semibold whitespace-nowrap text-cream-soft shadow-sm ${
                                    setDimmed ? "opacity-30" : ""
                                  } ${canDragSets ? "cursor-grab" : "cursor-pointer"} ${
                                    dragging ? "ring-2 ring-gold" : ""
                                  }`}
                                >
                                  {Math.max(pxPerDay, width) > 84 ? s.name : ""}
                                  {canDragSets && (
                                    <>
                                      <span
                                        aria-hidden
                                        onPointerDown={(e) => handleSetPointerDown(s.id, "start", e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize bg-cream/25"
                                      />
                                      <span
                                        aria-hidden
                                        onPointerDown={(e) => handleSetPointerDown(s.id, "end", e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize bg-cream/25"
                                      />
                                    </>
                                  )}
                                </button>
                                {dragging && sDrag.days !== 0 && (
                                  <span
                                    style={{ left, top: 2 }}
                                    className="absolute rounded-md border border-ink bg-card px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow-sm"
                                  >
                                    {sDrag.days > 0 ? `+${sDrag.days}` : sDrag.days} days
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {/* slip past the committed finish, drawn as an overhang */}
                          {slip > 0 && (
                            <span
                              style={{
                                left: setPlanned.left + setPlanned.width,
                                width: Math.max(4, slip * pxPerDay),
                              }}
                              aria-hidden
                              className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-r-md bg-danger ${setDimmed ? "opacity-30" : ""}`}
                            />
                          )}
                        </div>
                      )}

                    </header>

                    {!setsOnly && !isCollapsed && (
                      <ul className="row-list">
                        {group.rows.map((row) => {
                          const { task, isChild } = row;
                          const waitsOn = taskDependencies.filter((d) => d.task_id === task.id);
                          const drift = slipDays(task.due_date, task.forecast_finish);
                          const dimmed = chain ? !chain.has(task.id) : false;
                          return (
                            <li
                              key={task.id}
                              className={`data-row status-edge lg:flex lg:items-stretch ${edgeClasses(task)} ${dimmed ? "opacity-60" : ""}`}
                              onMouseEnter={() => wide && setHovered(task.id)}
                              onMouseLeave={() => wide && setHovered(null)}
                            >
                              <div
                                className={`w-full py-3 pr-4 lg:sticky lg:left-0 lg:z-10 lg:shrink-0 lg:border-r lg:border-border lg:bg-card ${isChild ? "pl-9" : "pl-4"}`}
                                style={wide ? { width: NAME_COL, minHeight: ROW_H } : undefined}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <Link
                                    to="/projects/$projectId/timeline"
                                    params={{ projectId }}
                                    search={{ task: task.id }}
                                    className={`flex items-start gap-1.5 hover:underline ${isChild ? "text-sm font-medium text-ink" : "text-sm font-semibold text-ink"}`}
                                  >
                                    {isChild && (
                                      <CornerDownRight
                                        aria-hidden
                                        className="mt-0.5 size-3.5 shrink-0 text-ink-soft"
                                      />
                                    )}
                                    {task.title}
                                  </Link>
                                  <StatusBadge meta={taskStatusMeta[task.status]} size="sm" />
                                </div>
                                <p className="mt-1 text-xs font-medium text-ink-soft">
                                  {departments.find((d) => d.id === task.department_id)?.name} ·{" "}
                                  {personById(task.assignee_id)?.full_name}
                                </p>
                                {!clean && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                                    <span>{formatFloat(task.total_float_hours)}</span>
                                    <span aria-hidden>·</span>
                                    <span>
                                      {formatDate(task.forecast_start)} –{" "}
                                      {formatDate(task.forecast_finish)}
                                    </span>
                                    {drift > 0 && (
                                      <span className="font-semibold text-danger">
                                        {drift} days past plan
                                      </span>
                                    )}
                                  </div>
                                )}
                                {waitsOn.length > 0 && !wide && (
                                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
                                    <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                                    <span>
                                      {waitsOn
                                        .map(
                                          (d) =>
                                            `${dependencyTypeLabel[d.type]} after ${taskTitle(d.depends_on_task_id)}${d.lag_hours ? ` (+${d.lag_hours}h wait)` : ""}`,
                                        )
                                        .join(" · ")}
                                    </span>
                                  </p>
                                )}
                              </div>

                              {wide && chartCell(row)}
                            </li>
                          );
                        })}
                        {group.rows.length === 0 && (
                          <li className="px-4 py-3 text-sm text-ink-soft">
                            No work on this set yet.
                          </li>
                        )}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* detail card */}
      {detail && (
        <div className="surface-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-ink">{detail.title}</h4>
              <p className="mt-0.5 text-xs text-ink-soft">
                {departments.find((d) => d.id === detail.department_id)?.name} ·{" "}
                {personById(detail.assignee_id)?.full_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenTask(null)}
              aria-label="Close details"
              className="grid size-11 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge meta={taskStatusMeta[detail.status]} size="sm" />
            <StatusBadge meta={criticalityMeta[detail.criticality]} size="sm" />
            <span className="text-xs text-ink-soft">{formatFloat(detail.total_float_hours)}</span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="rule-label">Committed plan</dt>
              <dd className="text-ink">
                {formatDate(detail.start_date)} – {formatDate(detail.due_date)}
              </dd>
            </div>
            <div>
              <dt className="rule-label">Current estimate</dt>
              <dd className="text-ink">
                {formatDate(detail.forecast_start)} – {formatDate(detail.forecast_finish)}
              </dd>
            </div>
          </dl>
          {(() => {
            const waits = taskDependencies.filter((d) => d.task_id === detail.id);
            if (waits.length === 0) return null;
            return (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
                <Link2 aria-hidden className="mt-0.5 size-3 shrink-0" />
                <span>
                  {waits
                    .map(
                      (d) =>
                        `${dependencyTypeLabel[d.type]} after ${taskTitle(d.depends_on_task_id)}${d.lag_hours ? ` (+${d.lag_hours}h wait)` : ""}`,
                    )
                    .join(" · ")}
                </span>
              </p>
            );
          })()}
          <Link
            to="/projects/$projectId/timeline"
            params={{ projectId }}
            search={{ task: detail.id }}
            className="mt-3 inline-flex min-h-11 items-center rounded-md border border-border-strong bg-card px-3 text-sm font-semibold text-ink hover:bg-cream"
          >
            Open work item
          </Link>
        </div>
      )}

      {/* reschedule confirmation */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setPending(null)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:rounded-2xl">
            <h3 className="text-base font-semibold text-ink">Move “{pending.task.title}”?</h3>
            <p className="mt-1 text-sm text-ink-soft">
              New dates {formatDate(pending.start)} – {formatDate(pending.due)}.
            </p>

            {pending.rows === null ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 aria-hidden className="size-4 animate-spin" /> Working out what else moves…
              </p>
            ) : pending.rows.length === 0 ? (
              <p className="mt-4 text-sm text-ink">Nothing downstream shifts.</p>
            ) : (
              <>
                {pending.rows.some((r) => r.crosses_protected_date) && (
                  <p className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      This pushes protected work past its date:{" "}
                      {pending.rows
                        .filter((r) => r.crosses_protected_date)
                        .map((r) => `${r.name}${r.protected_label ? ` (${r.protected_label})` : ""}`)
                        .join(", ")}
                    </span>
                  </p>
                )}
                <ul className="row-list mt-4 rounded-md border border-border">
                  {pending.rows.map((r) => (
                    <li key={`${r.entity_type}-${r.entity_id}`} className="px-3 py-2 text-sm">
                      <span className="font-medium text-ink">{r.name}</span>
                      <span className="block text-xs text-ink-soft">
                        {formatDate(r.current_finish)} → {formatDate(r.new_finish)} ·{" "}
                        {r.shift_days > 0 ? `${r.shift_days} days later` : "no shift"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-11 rounded-md border border-border bg-card px-4 text-sm font-medium text-ink hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitPending}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-ink-soft"
              >
                Move it
              </button>
            </div>
          </div>
        </div>
      )}

      {projectTasks.length > 0 && !clean && (
        <p className="text-xs text-ink-soft">
          {formatDate(span.start)} – {formatDate(span.end)} · {totalDays} days
        </p>
      )}

      {openSetId && (
        <SetDialog
          setId={openSetId}
          projectId={projectId}
          onClose={() => setOpenSetId(null)}
        />
      )}
    </div>
  );
}
