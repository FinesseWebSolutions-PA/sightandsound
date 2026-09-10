import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { departments, people, useStore } from "@/lib/store";
import { projectStatusMeta } from "@/lib/status";
import type { ProjectStatus } from "@/lib/production-data";

const statusOptions: ProjectStatus[] = ["planning", "active", "on_hold"];

/** Starts a new production: name, state, owner, build window, departments involved. */
export function NewProductionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}) {
  const { createProduction, saving } = useStore();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [ownerId, setOwnerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetCloseDate, setTargetCloseDate] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleDepartment = (id: string) =>
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );

  const submit = async () => {
    if (!name.trim()) {
      setError("Give the production a name.");
      return;
    }
    if (startDate && targetCloseDate && targetCloseDate < startDate) {
      setError("The target close date cannot come before the start date.");
      return;
    }
    setError("");
    const id = await createProduction({
      name,
      status,
      ownerId: ownerId || null,
      startDate: startDate || null,
      targetCloseDate: targetCloseDate || null,
      departmentIds,
    });
    if (!id) {
      setError("That production could not be created. Try again.");
      return;
    }
    onCreated(id);
  };

  const field =
    "mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-ink">New production</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="np-name">
          Production name
        </label>
        <input
          id="np-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Noah 2027 Revival"
          className={field}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="np-status">
              State
            </label>
            <select
              id="np-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className={field}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {projectStatusMeta[option].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="np-owner">
              Production lead
            </label>
            <select
              id="np-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={field}
            >
              <option value="">Unassigned for now</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="np-start">
              Build starts
            </label>
            <input
              id="np-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="np-close">
              Target close
            </label>
            <input
              id="np-close"
              type="date"
              value={targetCloseDate}
              onChange={(e) => setTargetCloseDate(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-ink">Departments involved</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {departments.map((dept) => {
              const on = departmentIds.includes(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDepartment(dept.id)}
                  aria-pressed={on}
                  className={
                    on
                      ? "chip-selected min-h-11 rounded-full px-4 text-sm font-semibold sm:min-h-9"
                      : "chip-quiet min-h-11 rounded-full px-4 text-sm font-medium hover:bg-cream sm:min-h-9"
                  }
                >
                  {dept.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-border bg-card px-4 text-sm font-medium text-ink hover:bg-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-ink-soft disabled:opacity-60"
          >
            {saving && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Create production
          </button>
        </div>
      </div>
    </div>
  );
}
