import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";

import { departments, people } from "@/lib/store";
import { initials } from "@/lib/threads";
import { cn } from "@/lib/utils";

const POPUP_HEIGHT_ESTIMATE = 260;
const POPUP_MARGIN = 8;

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
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  ariaLabel?: string;
  onFocus?: () => void;
  className?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = inputRef ?? localRef;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<{ start: number; query: string } | null>(null);
  const [highlight, setHighlight] = useState(0);
  const caretAfterInsert = useRef<number | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null);

  // People and departments are matched together but presented as two labelled
  // groups, so it is always obvious which kind of mention you are choosing.
  const groups = useMemo<{ label: string; items: Suggestion[] }[]>(() => {
    if (!token) return [];
    const pick = (pool: Suggestion[]) =>
      pool
        .map((s) => ({ s, score: rank(s.label, token.query) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => a.score - b.score || a.s.label.localeCompare(b.s.label))
        .slice(0, MAX_RESULTS)
        .map((x) => x.s);

    const peopleHits = pick(
      people.map((p) => ({
        kind: "person" as const,
        id: p.id,
        label: p.full_name,
        hint: p.title,
      })),
    );
    const departmentHits = pick(
      departments.map((d) => ({
        kind: "department" as const,
        id: d.id,
        label: d.name,
        hint: "Reaches the owner and leads",
      })),
    );
    return [
      ...(peopleHits.length ? [{ label: "People", items: peopleHits }] : []),
      ...(departmentHits.length ? [{ label: "Departments", items: departmentHits }] : []),
    ];
  }, [token]);

  const suggestions = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const open = token !== null && suggestions.length > 0;
  const highlighted = suggestions[highlight];

  useLayoutEffect(() => {
    if (caretAfterInsert.current !== null && areaRef.current) {
      const pos = caretAfterInsert.current;
      caretAfterInsert.current = null;
      areaRef.current.focus();
      areaRef.current.setSelectionRange(pos, pos);
    }
  }, [value, areaRef]);

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
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg sm:w-80">
          <ul
            role="listbox"
            aria-label="Mention suggestions"
            className="max-h-60 overflow-y-auto py-1"
          >
            {groups.map((group) => (
              <li key={group.label} role="presentation">
                <p className="rule-label px-3 pt-2 pb-1">{group.label}</p>
                <ul role="presentation">
                  {group.items.map((s) => {
                    const i = suggestions.indexOf(s);
                    return (
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
                            <span className="block truncate text-sm font-medium text-ink">
                              {s.label}
                            </span>
                            <span className="block truncate text-xs text-ink-soft">{s.hint}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {highlighted?.kind === "department" && (
            <p className="flex items-start gap-1.5 border-t border-border bg-cream-soft px-3 py-2 text-xs text-ink-soft">
              <Users aria-hidden className="mt-0.5 size-3 shrink-0" />
              Notifies {highlighted.label}&apos;s owner and leads — not the whole roster.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
