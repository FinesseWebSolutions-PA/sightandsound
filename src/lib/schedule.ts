/**
 * Small date helpers shared by every scheduling view. All of the real schedule
 * maths (spare time, critical path, forecast dates) is done in the database —
 * this file only turns dates into positions on a bar chart.
 */
import type { Milestone, Task } from "./production-data";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return toISO(new Date(toDate(value).getTime() + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
}

export type Span = { start: string; end: string };

/** The window every bar is laid out inside. */
export function spanOf(tasks: Task[], milestones: Milestone[]): Span {
  const dates = [
    ...tasks.flatMap((t) => [t.start_date, t.due_date, t.forecast_start, t.forecast_finish]),
    ...milestones.flatMap((m) => [m.due_date, m.forecast_date]),
  ].filter(Boolean);
  if (dates.length === 0) {
    const today = toISO(new Date());
    return { start: today, end: addDays(today, 30) };
  }
  const sorted = [...dates].sort();
  const start = addDays(sorted[0] as string, -3);
  const end = addDays(sorted[sorted.length - 1] as string, 3);
  return { start, end };
}

/** Percentage offset/width of a date range inside the chart window. */
export function place(span: Span, start: string, end: string) {
  const total = Math.max(1, daysBetween(span.start, span.end));
  const left = (daysBetween(span.start, start) / total) * 100;
  const width = (Math.max(1, daysBetween(start, end)) / total) * 100;
  return {
    left: `${Math.max(0, Math.min(100, left))}%`,
    width: `${Math.max(1.2, Math.min(100 - Math.max(0, left), width))}%`,
  };
}

export function pointAt(span: Span, date: string) {
  const total = Math.max(1, daysBetween(span.start, span.end));
  const left = (daysBetween(span.start, date) / total) * 100;
  return { left: `${Math.max(0, Math.min(100, left))}%` };
}

/** Month tick marks across the top of the chart. */
export function monthTicks(span: Span): { label: string; left: string }[] {
  const ticks: { label: string; left: string }[] = [];
  const cursor = toDate(span.start);
  cursor.setUTCDate(1);
  const last = toDate(span.end);
  while (cursor <= last) {
    const iso = toISO(cursor);
    if (iso >= span.start) {
      ticks.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        ...pointAt(span, iso),
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

/** Days a forecast finish sits past the committed date; negative means early. */
export function slipDays(planned: string, forecast: string): number {
  if (!planned || !forecast) return 0;
  return daysBetween(planned, forecast);
}

/* ------------------------------------------------------------------ *
 * Pixel layout — used by the zoomable, scrollable Gantt chart.
 * ------------------------------------------------------------------ */

export const ZOOM_MIN = 2;
export const ZOOM_MAX = 48;

/** Horizontal pixel offset of a date inside the chart window. */
export function xAt(span: Span, date: string, pxPerDay: number): number {
  return daysBetween(span.start, date) * pxPerDay;
}

/** Pixel offset and width of a date range inside the chart window. */
export function placePx(span: Span, start: string, end: string, pxPerDay: number) {
  const left = xAt(span, start, pxPerDay);
  const width = Math.max(pxPerDay, Math.max(1, daysBetween(start, end)) * pxPerDay);
  return { left, width };
}

/** The date sitting at a pixel offset in the chart window. */
export function dateAtX(span: Span, x: number, pxPerDay: number): string {
  return addDays(span.start, Math.round(x / pxPerDay));
}

export type AxisTick = { key: string; label: string; left: number; major: boolean };

/**
 * Tick marks across the top of the chart. Zoomed in far enough, each week gets
 * a dated tick; zoomed out, months carry the axis on their own.
 */
export function axisTicks(span: Span, pxPerDay: number): AxisTick[] {
  const ticks: AxisTick[] = [];
  const last = toDate(span.end);
  const weekly = pxPerDay >= 10;

  const cursor = toDate(span.start);
  if (weekly) {
    // Start on the Sunday at or before the window start.
    cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
  } else {
    cursor.setUTCDate(1);
  }

  while (cursor <= last) {
    const iso = toISO(cursor);
    if (iso >= span.start) {
      const isMonthStart = cursor.getUTCDate() <= 7;
      ticks.push({
        key: iso,
        label: weekly
          ? cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
          : cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
        left: xAt(span, iso, pxPerDay),
        major: weekly ? isMonthStart : true,
      });
    }
    if (weekly) cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

