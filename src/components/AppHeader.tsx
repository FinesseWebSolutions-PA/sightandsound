import { Link } from "@tanstack/react-router";
import { Bell, Inbox, Search, Users } from "lucide-react";

import { people, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";
import logoAsset from "@/assets/sight-and-sound-logo.svg.asset.json";

const roles: Role[] = ["admin", "contributor", "viewer"];

export function AppHeader() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  // One count everywhere: what is unread for the person you are viewing as.
  const myUnread = notifications.filter((n) => !n.read && n.recipient_id === currentUserId).length;

  const roleSelect = (id: string) => (
    <select
      id={id}
      value={role}
      onChange={(event) => setRole(event.target.value as Role)}
      className="min-h-11 w-full rounded-md border border-bar-border bg-bar-foreground/10 px-2.5 py-2 text-base font-medium text-bar-foreground focus:ring-2 focus:ring-gold focus:outline-none sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-sm"
    >
      {roles.map((r) => (
        <option key={r} value={r} className="text-ink">
          {roleLabels[r]}
        </option>
      ))}
    </select>
  );

  const navIdle =
    "relative flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-bar-muted transition-colors hover:text-bar-foreground";
  const navActive =
    "relative flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-bar-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-gold";

  return (
    <header className="sticky top-0 z-30 border-b border-bar-border bg-bar text-bar-foreground">
      <div className="mx-auto flex max-w-[1400px] items-stretch px-4 sm:px-6">
        {/* Brand zone */}
        <div className="flex min-w-0 items-center py-2.5 md:border-r md:border-bar-border md:pr-6 lg:pr-8">
          <Link to="/" className="flex min-h-11 min-w-0 items-center gap-3 py-1">
            <img
              src={logoAsset.url}
              alt="Sight &amp; Sound"
              className="h-4 w-auto sm:h-[18px]"
              width={215}
              height={29}
            />
          </Link>
        </div>

        {/* Navigation zone */}
        <nav className="hidden flex-1 items-stretch gap-1 px-4 md:flex lg:px-8">
          <Link
            to="/"
            className={navIdle}
            activeOptions={{ exact: true }}
            activeProps={{ className: navActive }}
          >
            Productions
          </Link>
          <Link to="/inbox" className={navIdle} activeProps={{ className: navActive }}>
            <Inbox aria-hidden className="size-4" />
            My Work
            {myUnread > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-xs font-bold text-bar">
                {myUnread}
              </span>
            )}
          </Link>
          <Link to="/search" className={navIdle} activeProps={{ className: navActive }}>
            <Search aria-hidden className="size-4" />
            Search
          </Link>
          <Link to="/team" className={navIdle} activeProps={{ className: navActive }}>
            <Users aria-hidden className="size-4" />
            Team
          </Link>
        </nav>

        {/* Utilities zone */}
        <div className="ml-auto flex items-center gap-3 py-2.5 md:gap-5 md:border-l md:border-bar-border md:pl-6 lg:pl-8">
          <Link
            to="/inbox"
            aria-label={`${myUnread} unread notices`}
            className="group flex min-h-11 items-center gap-2 rounded-md px-1.5 text-bar-muted hover:text-bar-foreground"
          >
            <span className="relative flex items-center">
              <Bell aria-hidden className="size-5 shrink-0" />
              {myUnread > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-bar"
                >
                  {myUnread}
                </span>
              )}
            </span>
            <span className="hidden text-xs font-semibold sm:inline">Notices</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right">
              <p className="text-sm leading-none font-semibold text-bar-foreground">
                {person?.full_name}
              </p>
              <p className="mt-1 text-[0.6875rem] leading-none font-semibold tracking-[0.09em] text-bar-muted uppercase">
                {person?.title}
              </p>
            </div>
            <div className="flex flex-col">
              <label
                htmlFor="role-switcher"
                className="mb-1 text-[0.6875rem] leading-none font-semibold tracking-[0.09em] text-bar-muted uppercase"
              >
                Viewing as
              </label>
              {roleSelect("role-switcher")}
            </div>
          </div>
        </div>
      </div>
    </header>
  );

}
