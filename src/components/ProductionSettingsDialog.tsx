import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { PersonPicker } from "@/components/PersonPicker";
import { useStore } from "@/lib/store";
import { projectStatusMeta } from "@/lib/status";
import type { Project, ProjectStatus } from "@/lib/production-data";

const statusOptions: ProjectStatus[] = ["planning", "active", "on_hold", "closed"];

/** Admin-only settings for one production: name, state, lead, window, portal link. */
export function ProductionSettingsDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { updateProduction, saving } = useStore();
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [ownerId, setOwnerId] = useState(project.owner_id);
  const [startDate, setStartDate] = useState(project.start_date);
  const [targetCloseDate, setTargetCloseDate] = useState(project.target_close_date);
  const [portalUrl, setPortalUrl] = useState(project.portal_url);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    const ok = await updateProduction(project.id, {
      name,
      status,
      ownerId: ownerId || null,
      startDate: startDate || null,
      targetCloseDate: targetCloseDate || null,
      portalUrl,
    });
    if (!ok) {
      setError("Those settings could not be saved. Try again.");
      return;
    }
    onClose();
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
      <div
        role="dialog"
        aria-label="Production settings"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-ink">Production settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="ps-name">
          Production name
        </label>
        <input
          id="ps-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="ps-status">
              State
            </label>
            <select
              id="ps-status"
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
            <span className="block text-sm font-medium text-ink">Production lead</span>
            <div className="mt-1">
              <PersonPicker
                label="Production lead"
                value={ownerId}
                onChange={setOwnerId}
                placeholder="Unassigned for now"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="ps-start">
              Build starts
            </label>
            <input
              id="ps-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="ps-close">
              Opening / target close
            </label>
            <input
              id="ps-close"
              type="date"
              value={targetCloseDate}
              onChange={(e) => setTargetCloseDate(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="ps-portal">
          Portal link (set simulation)
        </label>
        <input
          id="ps-portal"
          value={portalUrl}
          onChange={(e) => setPortalUrl(e.target.value)}
          placeholder="https://…"
          className={field}
        />

        {status === "closed" && (
          <p className="mt-3 text-sm text-ink-soft">
            Closing a production makes it a read-only record for everyone. You can reopen it here
            later.
          </p>
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
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
