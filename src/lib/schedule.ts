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
