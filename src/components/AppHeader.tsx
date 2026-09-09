import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Menu, ShieldCheck } from "lucide-react";

import { people, roleDescriptions, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";

const roles: Role[] = ["admin", "contributor", "viewer"];

export function AppHeader() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  const unread = notifications.filter((n) => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);

  const roleSelect = (id: string) => (
    <select
      id={id}
      value={role}
      onChange={(event) => setRole(event.target.value as Role)}
      className="min-h-11 w-full rounded-md border border-border bg-card px-2.5 py-2 text-base font-medium text-ink focus:ring-2 focus:ring-ring focus:outline-none sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-sm"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {roleLabels[r]}
        </option>
      ))}
    </select>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-cream-soft/95 backdrop-blur">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3 md:flex md:gap-4">
        <Link to="/" className="flex min-h-11 min-w-0 items-baseline gap-2 py-2 sm:gap-3">
          <span className="truncate font-display text-xl leading-none text-ink sm:text-2xl">
            Sight &amp; Sound
          </span>
          <span className="rule-label hidden sm:inline">Show Production</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-cream hover:text-ink"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-ink bg-cream border-b-2 border-gold",
            }}
          >
            Production Portfolio
          </Link>
        </nav>

        <div className="flex items-center justify-end gap-2 md:ml-auto md:gap-4">
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Bell aria-hidden className="size-4 shrink-0" />
            <span className="hidden sm:inline">
              {unread} unread {unread === 1 ? "notice" : "notices"}
            </span>
            <span className="sm:hidden" aria-label={`${unread} unread notices`}>
              {unread}
            </span>
          </span>

          <div className="hidden items-center gap-2 md:flex">
            <ShieldCheck aria-hidden className="size-4 text-ink-soft" />
            <label htmlFor="role-switcher" className="rule-label">
              Viewing as
            </label>
            {roleSelect("role-switcher")}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-ink md:hidden"
          >
            <Menu aria-hidden className="size-5" />
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-cream-soft px-4 py-3 md:hidden">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-11 items-center rounded-md px-3 text-base font-medium text-ink hover:bg-cream"
          >
            Production Portfolio
          </Link>
          <div className="mt-3 border-t border-border pt-3">
            <label
              htmlFor="role-switcher-mobile"
              className="rule-label flex items-center gap-1.5 pb-1.5"
            >
              <ShieldCheck aria-hidden className="size-3.5" />
              Viewing as
            </label>
            {roleSelect("role-switcher-mobile")}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 pb-2 text-xs leading-relaxed text-ink-soft sm:px-6">
        {person?.full_name} — {person?.title}. {roleDescriptions[role]}.
      </div>
    </header>
  );
}
