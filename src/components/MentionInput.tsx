import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";

import { departments, people } from "@/lib/store";
import { initials } from "@/lib/threads";
import { cn } from "@/lib/utils";

type Suggestion =
  | { kind: "department"; id: string; label: string; hint: string }
  | { kind: "person"; id: string; label: string; hint: string };

const MAX_QUERY = 32;
const MAX_RESULTS = 7;

/** Finds the "@…" being typed immediately before the caret, if there is one. */
function activeToken(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  const prev = at === 0 ? " " : before[at - 1]!;
  if (!/[\s(,:]/.test(prev)) return null;
  const query = before.slice(at + 1);
  if (query.length > MAX_QUERY || /[\n]/.test(query)) return null;
  return { start: at, query };
}

function rank(label: string, query: string): number {
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 1;
  if (l.startsWith(q)) return 0;
  const words = l.split(/[^a-z0-9]+/);
  if (words.some((w) => w.startsWith(q))) return 1;
  if (l.includes(q)) return 2;
  return -1;
}

/**
 * Comment box with a Slack-style mention picker: typing "@" opens a live
 * filtering list of departments and team members, navigable with the arrow
 * keys, and selecting one inserts a mention the app recognises.
 */
export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  ariaLabel,
  onFocus,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  ariaLabel?: string;
  onFocus?: () => void;
  className?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [token, setToken] = useState<{ start: number; query: string } | null>(null);
  const [highlight, setHighlight] = useState(0);
  const caretAfterInsert = useRef<number | null>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!token) return [];
    const pool: Suggestion[] = [
      ...departments.map((d) => ({
        kind: "department" as const,
        id: d.id,
        label: d.name,
        hint: "Department — notifies the owner and leads",
      })),
      ...people.map((p) => ({
        kind: "person" as const,
        id: p.id,
        label: p.full_name,
        hint: p.title,
      })),
    ];
    return pool
      .map((s) => ({ s, score: rank(s.label, token.query) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || a.s.label.localeCompare(b.s.label))
      .slice(0, MAX_RESULTS)
      .map((x) => x.s);
  }, [token]);

  const open = token !== null && suggestions.length > 0;

  useLayoutEffect(() => {
    if (caretAfterInsert.current !== null && areaRef.current) {
      const pos = caretAfterInsert.current;
      caretAfterInsert.current = null;
      areaRef.current.focus();
      areaRef.current.setSelectionRange(pos, pos);
    }
  }, [value]);

  const sync = (next: string, caret: number) => {
    const found = activeToken(next, caret);
    setToken(found);
    setHighlight(0);
  };

  const insert = (suggestion: Suggestion) => {
    if (!token || !areaRef.current) return;
    const caret = areaRef.current.selectionStart ?? value.length;
    const inserted = `@${suggestion.label} `;
    const next = value.slice(0, token.start) + inserted + value.slice(caret);
    caretAfterInsert.current = token.start + inserted.length;
    setToken(null);
    onChange(next);
  };

  return (
    <div className="relative">
      <textarea
        ref={areaRef}
        value={value}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        placeholder={placeholder}
        rows={rows}
        onFocus={onFocus}
        onBlur={() => window.setTimeout(() => setToken(null), 120)}
        onChange={(e) => {
          onChange(e.target.value);
          sync(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => sync(value, e.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            sync(value, e.currentTarget.selectionStart ?? value.length);
          }
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insert(suggestions[highlight]!);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setToken(null);
          }
        }}
        className={cn(
          "w-full rounded-md border border-border bg-card px-3 py-2 text-base text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:text-sm",
          className,
        )}
      />

      {open && (
        <ul
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg sm:w-80"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.kind}-${s.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(s)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left",
                  i === highlight ? "bg-cream" : "hover:bg-cream-soft",
                )}
              >
                {s.kind === "person" ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[0.625rem] font-semibold text-cream-soft">
                    {initials(s.label)}
                  </span>
                ) : (
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gold-tint text-gold-deep">
                    <Users aria-hidden className="size-3.5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{s.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{s.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
