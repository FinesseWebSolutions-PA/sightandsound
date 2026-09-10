import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, LayoutGrid, UserRound, X } from "lucide-react";

import { people, roleDescriptions, roleLabels, useStore } from "@/lib/store";
import type { Role } from "@/lib/production-data";

const roles: Role[] = ["admin", "contributor", "viewer"];

const tabBase =
  "relative flex min-h-[52px] min-w-[64px] flex-1 flex-col items-center justify-center gap-1 px-2 pt-1 text-[11px] font-medium text-ink-soft transition-colors";
const tabActive =
  "relative flex min-h-[52px] min-w-[64px] flex-1 flex-col items-center justify-center gap-1 px-2 pt-1 text-[11px] font-semibold text-gold-deep transition-colors";

export function BottomTabBar() {
  const { role, setRole, currentUserId, notifications } = useStore();
  const person = people.find((p) => p.id === currentUserId);
  const myUnread = notifications.filter((n) => !n.read && n.recipient_id === currentUserId).length;
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-cream-soft/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="flex items-stretch px-2">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className={tabBase}
            activeProps={{ className: tabActive }}
          >
            <LayoutGrid aria-hidden className="size-6" />
            Productions
          </Link>
          <Link to="/inbox" className={tabBase} activeProps={{ className: tabActive }}>
            <span className="relative flex items-center">
              <Inbox aria-hidden className="size-6" />
              {myUnread > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-2.5 inline-flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-cream-soft"
                >
                  {myUnread}
                </span>
              )}
            </span>
            My Work
          </Link>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className={tabBase}
          >
            <UserRound aria-hidden className="size-6" />
            Me
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{person?.full_name}</p>
                <p className="truncate text-sm text-ink-soft">{person?.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-ink"
              >
                <X aria-hidden className="size-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <p className="rule-label mt-4 mb-2">Viewing as</p>
            <div className="grid gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={
                    role === r
                      ? "flex min-h-11 items-center justify-between rounded-xl border border-gold bg-gold-tint px-3 text-left text-base font-semibold text-ink"
                      : "flex min-h-11 items-center justify-between rounded-xl border border-border bg-card px-3 text-left text-base font-medium text-ink"
                  }
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
            <p className="pt-2 text-sm text-ink-soft">{roleDescriptions[role]}.</p>
          </div>
        </div>
      )}
    </>
  );
}
