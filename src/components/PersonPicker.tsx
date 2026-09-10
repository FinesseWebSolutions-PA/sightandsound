import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, UserRound, X } from "lucide-react";

import { departments, people, personById, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";

/**
 * One way to pick a person anywhere in the app. It always searches the whole
 * organisation, but opens an organised popup: search, then narrow by department
 * or by access level, with the people most likely to be right shown first.
 */
export function PersonPicker({
  value,
  onChange,
  label,
  placeholder = "Nobody selected",
  suggestedIds = [],
  suggestedLabel = "Most likely",
  excludeIds = [],
  allowClear = true,
  disabled = false,
  triggerClassName = "",
}: {
  value: string;
  onChange: (personId: string) => void;
  /** Used for the dialog heading and the trigger's accessible name. */
  label: string;
  placeholder?: string;
  /** People to float to the top — e.g. already staffed on this production. */
  suggestedIds?: string[];
  suggestedLabel?: string;
  excludeIds?: string[];
  allowClear?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? personById(value) : undefined;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`${label}${selected ? `: ${selected.full_name}` : ""}`}
        className={`flex min-h-11 w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 text-left text-sm text-ink hover:border-gold-deep disabled:opacity-60 ${triggerClassName}`}
      >
        <UserRound aria-hidden className="size-4 shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              {selected.full_name}
              <span className="ml-1.5 text-xs text-ink-soft">{selected.title}</span>
            </>
          ) : (
            <span className="text-ink-soft">{placeholder}</span>
          )}
        </span>
        <span className="shrink-0 text-xs font-medium text-gold-deep">Change</span>
      </button>

      {open && (
        <PersonPickerDialog
          label={label}
          value={value}
          suggestedIds={suggestedIds}
          suggestedLabel={suggestedLabel}
          excludeIds={excludeIds}
          allowClear={allowClear}
          onClose={() => setOpen(false)}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function PersonPickerDialog({
  label,
  value,
  suggestedIds,
  suggestedLabel,
  excludeIds,
  allowClear,
  onClose,
  onPick,
}: {
  label: string;
  value: string;
  suggestedIds: string[];
  suggestedLabel: string;
  excludeIds: string[];
  allowClear: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const { projectAssignments } = useStore();
  const [query, setQuery] = useState("");
  const [deptId, setDeptId] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const jobTitleFor = (personId: string) => {
    const a = projectAssignments.find((x) => x.person_id === personId && x.job_title);
    return a?.job_title ?? "";
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => (deptId ? p.primary_department_id === deptId : true))
      .filter((p) => (role ? p.role === role : true))
      .filter((p) =>
        q
          ? `${p.full_name} ${p.title} ${p.email} ${jobTitleFor(p.id)}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, deptId, role, excludeIds, projectAssignments]);

  const suggested = matches.filter((p) => suggestedIds.includes(p.id));
  const rest = matches.filter((p) => !suggestedIds.includes(p.id));

  const groups = [
    ...(suggested.length > 0 ? [{ title: suggestedLabel, items: suggested }] : []),
    {
      title: suggested.length > 0 ? "Everyone else" : "Everyone in the organisation",
      items: rest,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{label}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Anyone in the organisation can be picked. Narrow the list to find them faster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-cream hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="space-y-3 border-b border-border px-4 py-3">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-cream-soft px-2.5">
            <Search aria-hidden className="size-4 shrink-0 text-ink-soft" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title or job"
              aria-label="Search people"
              className="min-w-0 flex-1 bg-transparent text-base text-ink focus:outline-none sm:text-sm"
            />
          </label>

          <div>
            <p className="rule-label">Department</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <FilterChip active={deptId === ""} onClick={() => setDeptId("")}>
                All departments
              </FilterChip>
              {departments.map((d) => (
                <FilterChip
                  key={d.id}
                  active={deptId === d.id}
                  onClick={() => setDeptId(deptId === d.id ? "" : d.id)}
                >
                  {d.name}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="rule-label">Access</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <FilterChip active={role === ""} onClick={() => setRole("")}>
                Any access
              </FilterChip>
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <FilterChip
                  key={r}
                  active={role === r}
                  onClick={() => setRole(role === r ? "" : r)}
                >
                  {roleLabels[r]}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">
              Nobody matches that. Clear a filter or try another spelling.
            </p>
          ) : (
            groups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <section key={g.title}>
                  <h3 className="panel-header px-4 py-2 text-xs font-semibold text-ink-soft">
                    {g.title}
                  </h3>
                  <ul className="row-list">
                    {g.items.map((p) => {
                      const dept = departments.find((d) => d.id === p.primary_department_id);
                      const job = jobTitleFor(p.id);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => onPick(p.id)}
                            className={`data-row flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left ${
                              p.id === value ? "bg-cream" : "hover:bg-cream-soft"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">
                                {p.full_name}
                              </span>
                              <span className="block truncate text-xs text-ink-soft">
                                {p.title}
                                {dept ? ` · ${dept.name}` : ""}
                                {job ? ` · ${job}` : ""} · {roleLabels[p.role]}
                              </span>
                            </span>
                            {p.id === value && (
                              <Check aria-label="Currently selected" className="size-4 text-gold-deep" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
          )}
        </div>

        {allowClear && (
          <footer className="flex justify-between gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onPick("")}
              className="min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-cream"
            >
              Leave unassigned
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md px-4 text-sm font-medium text-ink-soft hover:bg-cream"
            >
              Cancel
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-ink bg-ink text-cream-soft"
          : "border-border bg-card text-ink-soft hover:border-gold-deep hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
