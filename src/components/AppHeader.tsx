import { Link } from "@tanstack/react-router";
import { Bell, Inbox } from "lucide-react";

import { people, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";

const roles: Role[] = ["admin", "contributor", "viewer"];

export function AppHeader() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  const unread = notifications.filter((n) => !n.read).length;
  // What is unread for this person specifically, which is what the Inbox shows.
  const myUnread = notifications.filter((n) => !n.read && n.recipient_id === currentUserId).length;
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
      <div className="mx-auto flex max-w-[1400px] items-stretch px-4 sm:px-6">
        {/* Brand zone */}
        <div className="flex min-w-0 items-center py-2.5 md:border-r md:border-border md:pr-6 lg:pr-8">
          <Link to="/" className="flex min-h-11 min-w-0 flex-col justify-center gap-0.5 py-1">
            <span className="truncate font-display text-xl leading-none text-ink sm:text-2xl">
              Sight &amp; Sound
            </span>
            <span className="rule-label leading-none">Show Production</span>
          </Link>
        </div>

        {/* Navigation zone */}
        <nav className="hidden flex-1 items-stretch gap-1 px-4 md:flex lg:px-8">
          <Link
            to="/"
            className="relative flex min-h-11 items-center px-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "relative flex min-h-11 items-center px-3 text-sm font-semibold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-gold",
            }}
          >
            Production Portfolio
          </Link>
          <Link
            to="/inbox"
            className="relative flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            activeProps={{
              className:
                "relative flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-gold",
            }}
          >
            <Inbox aria-hidden className="size-4" />
            My Inbox
            {myUnread > 0 && (
              <span className="rounded-full bg-gold-tint px-1.5 text-xs font-semibold text-gold-deep">
                {myUnread}
              </span>
            )}
          </Link>
        </nav>

        {/* Utilities zone */}
        <div className="ml-auto flex items-center gap-3 py-2.5 md:gap-5 md:border-l md:border-border md:pl-6 lg:pl-8">
          <Link
            to="/inbox"
            aria-label={`${unread} unread notices`}
            className="group flex min-h-11 items-center gap-2 rounded-md px-1.5 text-ink-soft hover:text-ink"
          >
            <span className="relative flex items-center">
              <Bell aria-hidden className="size-5 shrink-0" />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-cream-soft"
                >
                  {unread}
                </span>
              )}
            </span>
            <span className="hidden text-xs font-semibold sm:inline">Notices</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right">
              <p className="text-sm leading-none font-semibold text-ink">{person?.full_name}</p>
              <p className="rule-label mt-1 leading-none">{person?.title}</p>
            </div>
            <div className="flex flex-col">
              <label htmlFor="role-switcher" className="rule-label mb-1 leading-none">
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
