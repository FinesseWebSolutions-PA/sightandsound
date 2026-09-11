export function inQuietHours(hour: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
export function notificationDisposition(
  state: { dismissed: boolean; snoozed_until: string | null } | undefined,
  now = Date.now(),
) {
  return state?.dismissed
    ? "done"
    : state?.snoozed_until && new Date(state.snoozed_until).getTime() > now
      ? "snoozed"
      : "active";
}
