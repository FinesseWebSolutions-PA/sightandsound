import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { departmentJobTitles, departments, people, useStore } from "@/lib/store";
import { projectStatusMeta } from "@/lib/status";
import type { ProjectStatus } from "@/lib/production-data";

const statusOptions: ProjectStatus[] = ["planning", "active", "on_hold"];

type StaffRow = { personId: string; jobTitle: string; isHead: boolean };

/** Starts a new production: name, state, owner, build window, departments and team. */
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
  const [staff, setStaff] = useState<Record<string, StaffRow[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titlesFor = useMemo(
    () => (departmentId: string) =>
      departmentJobTitles
        .filter((t) => t.department_id === departmentId)
        .map((t) => t.title)
        .concat("Team Member")
        .filter((t, i, all) => all.indexOf(t) === i),
    [],
  );

  const toggleDepartment = (id: string) =>
    setDepartmentIds((prev) => {
      if (prev.includes(id)) {
        setStaff((s) => {
          const next = { ...s };
          delete next[id];
          return next;
        });
        return prev.filter((d) => d !== id);
      }
      return [...prev, id];
    });

  const togglePerson = (departmentId: string, personId: string) =>
    setStaff((prev) => {
      const rows = prev[departmentId] ?? [];
      const has = rows.some((r) => r.personId === personId);
      const next = has
        ? rows.filter((r) => r.personId !== personId)
        : [
            ...rows,
            {
              personId,
              jobTitle: titlesFor(departmentId)[0] ?? "Team Member",
              isHead: rows.length === 0,
            },
          ];
      return { ...prev, [departmentId]: next };
    });

  const setJobTitle = (departmentId: string, personId: string, jobTitle: string) =>
    setStaff((prev) => ({
      ...prev,
      [departmentId]: (prev[departmentId] ?? []).map((r) =>
        r.personId === personId ? { ...r, jobTitle } : r,
      ),
    }));

  const setHead = (departmentId: string, personId: string) =>
    setStaff((prev) => ({
      ...prev,
      [departmentId]: (prev[departmentId] ?? []).map((r) => ({
        ...r,
        isHead: r.personId === personId,
      })),
    }));

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
    const assignments = departmentIds.flatMap((departmentId) =>
      (staff[departmentId] ?? []).map((row) => ({
        personId: row.personId,
        departmentId,
        jobTitle: row.jobTitle,
        isHead: row.isHead,
      })),
    );
    const id = await createProduction({
      name,
      status,
      ownerId: ownerId || null,
      startDate: startDate || null,
      targetCloseDate: targetCloseDate || null,
      departmentIds,
      assignments,
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

        {departmentIds.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-ink">Team on this production</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Pick who is staffed in each department and set their job. The first person picked is
              the department head; change it with the head option.
            </p>
            <div className="mt-3 space-y-3">
              {departmentIds.map((deptId) => {
                const dept = departments.find((d) => d.id === deptId);
                if (!dept) return null;
                const rows = staff[deptId] ?? [];
                const members = people.filter((p) => p.primary_department_id === deptId);
                const others = people.filter((p) => p.primary_department_id !== deptId);
                const roster = [...members, ...others];
                const titles = titlesFor(deptId);
                return (
                  <div key={deptId} className="rounded-lg border border-border bg-cream-50 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{dept.name}</span>
                      <span className="text-xs text-ink-soft">
                        {rows.length === 0 ? "No one yet" : `${rows.length} staffed`}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {roster.map((person) => {
                        const row = rows.find((r) => r.personId === person.id);
                        return (
                          <li
                            key={person.id}
                            className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1"
                          >
                            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink">
                              <input
                                type="checkbox"
                                checked={Boolean(row)}
                                onChange={() => togglePerson(deptId, person.id)}
                                className="size-4 shrink-0"
                              />
                              <span className="truncate">{person.full_name}</span>
                            </label>
                            {row && (
                              <>
                                <select
                                  aria-label={`Job for ${person.full_name}`}
                                  value={row.jobTitle}
                                  onChange={(e) => setJobTitle(deptId, person.id, e.target.value)}
                                  className="min-h-9 rounded-md border border-border bg-card px-2 text-xs text-ink focus:ring-2 focus:ring-ring focus:outline-none"
                                >
                                  {titles.map((title) => (
                                    <option key={title} value={title}>
                                      {title}
                                    </option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-1 text-xs text-ink-soft">
                                  <input
                                    type="radio"
                                    name={`head-${deptId}`}
                                    checked={row.isHead}
                                    onChange={() => setHead(deptId, person.id)}
                                    className="size-4"
                                  />
                                  Head
                                </label>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}



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
