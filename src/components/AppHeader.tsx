import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Inbox, Search, Users } from "lucide-react";

import { people, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";
import logoAsset from "@/assets/sight-and-sound-logo.svg.asset.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roles: Role[] = ["admin", "contributor", "viewer"];

export function AppHeader() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  // One count everywhere: what is unread for the person you are viewing as.
  const myUnread = notifications.filter((n) => !n.read && n.recipient_id === currentUserId).length;

  const initials = (person?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

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

        {/* Navigation zone — only the two places people live in */}
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
        </nav>

        {/* Utilities zone — search icon + one account menu */}
        <div className="ml-auto flex items-center gap-1 py-2.5 md:border-l md:border-bar-border md:pl-4 lg:pl-6">
          <Link
            to="/search"
            aria-label="Search"
            title="Search"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-bar-muted transition-colors hover:bg-bar-foreground/10 hover:text-bar-foreground"
            activeProps={{ className: "text-bar-foreground bg-bar-foreground/10" }}
          >
            <Search aria-hidden className="size-5" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account and role"
              className="flex min-h-11 items-center gap-2 rounded-md px-1.5 text-bar-muted transition-colors hover:bg-bar-foreground/10 hover:text-bar-foreground focus:ring-2 focus:ring-gold focus:outline-none"
            >
              <span className="relative flex size-8 items-center justify-center rounded-full bg-bar-foreground/15 text-xs font-bold text-bar-foreground">
                {initials || "?"}
                {myUnread > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-bar"
                  >
                    {myUnread}
                  </span>
                )}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs leading-none font-semibold text-bar-foreground">
                  {person?.full_name}
                </span>
                <span className="mt-1 block text-[0.625rem] leading-none font-semibold text-bar-muted">
                  {roleLabels[role]}
                </span>
              </span>
              <ChevronDown aria-hidden className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="pb-0">{person?.full_name}</DropdownMenuLabel>
              <p className="px-2 pb-2 text-xs text-muted-foreground">{person?.title}</p>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[0.6875rem] ">
                Viewing as
              </DropdownMenuLabel>
              {roles.map((r) => (
                <DropdownMenuItem key={r} onSelect={() => setRole(r)} className="justify-between">
                  {roleLabels[r]}
                  {role === r && <Check aria-hidden className="size-4 text-gold" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/inbox" className="flex w-full items-center gap-2">
                  <Inbox aria-hidden className="size-4" />
                  My Work
                  {myUnread > 0 && (
                    <span className="ml-auto rounded-full bg-gold px-1.5 text-xs font-bold text-bar">
                      {myUnread}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/team" className="flex w-full items-center gap-2">
                  <Users aria-hidden className="size-4" />
                  Team &amp; roles
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
