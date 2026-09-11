export const MESSAGE_EDIT_WINDOW_MS = 2 * 60 * 60 * 1000;
export function canEditMessage(createdAt: string, now = Date.now()) {
  const sent = Date.parse(createdAt);
  return Number.isFinite(sent) && now >= sent && now < sent + MESSAGE_EDIT_WINDOW_MS;
}
export type CapacitySlot = {
  task_id: string;
  lane: string;
  mode: string;
  start_date: string;
  finish_date: string;
};
export function capacityConflicts<T extends CapacitySlot>(
  slots: T[],
  slot: T,
  departmentFor: (id: string) => string,
) {
  if (slot.mode !== "in_house") return [];
  return slots.filter(
    (other) =>
      other.task_id !== slot.task_id &&
      other.mode === "in_house" &&
      other.lane.trim().toLowerCase() === slot.lane.trim().toLowerCase() &&
      departmentFor(other.task_id) === departmentFor(slot.task_id) &&
      other.start_date <= slot.finish_date &&
      other.finish_date >= slot.start_date,
  );
}
