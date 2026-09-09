import { Link } from "@tanstack/react-router";
import { Bell, ShieldCheck } from "lucide-react";

import { people, roleDescriptions, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";

const roles: Role[] = ["admin", "contributor", "viewer"];

export function AppHeader() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-cream-soft/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-display text-2xl leading-none text-ink">Sight &amp; Sound</span>
          <span className="rule-label hidden sm:inline">Show Production</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-cream hover:text-ink"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "rounded-md px-3 py-1.5 text-sm font-semibold text-ink bg-cream border-b-2 border-gold",
            }}
          >
            Production Portfolio
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Bell aria-hidden className="size-4" />
            <span>
              {unread} unread {unread === 1 ? "notice" : "notices"}
            </span>
          </span>

          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4 text-ink-soft" />
            <label htmlFor="role-switcher" className="rule-label">
              Viewing as
            </label>
            <select
              id="role-switcher"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-ink focus:ring-2 focus:ring-ring focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 pb-2 text-xs text-ink-soft">
        {person?.full_name} — {person?.title}. {roleDescriptions[role]}.
      </div>
    </header>
  );
}
