type LocationEntry = {
  href: string;
  state: { __TSR_key?: string; __TSR_index?: number };
};
type SavedEntry = { href: string; index: number };
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

/** Remember proven in-app history entries, never guess from history.length or referrer. */
export function createReturnHistory(storage: () => StorageAccess | undefined) {
  const memory = new Map<string, SavedEntry>();
  const prefix = "ss-return-history:";
  return {
    remember(from: LocationEntry | undefined, to: LocationEntry) {
      const key = to.state.__TSR_key;
      const index = to.state.__TSR_index;
      if (
        !from ||
        !key ||
        typeof index !== "number" ||
        typeof from.state.__TSR_index !== "number" ||
        index !== from.state.__TSR_index + 1 ||
        from.href === to.href ||
        !from.href.startsWith("/") ||
        from.href.startsWith("//")
      )
        return;
      const entry = { href: to.href, index };
      memory.set(key, entry);
      try {
        storage()?.setItem(prefix + key, JSON.stringify(entry));
      } catch {
        /* Memory fallback. */
      }
    },
    restoreAfterTour(from: LocationEntry, to: LocationEntry) {
      if (
        !this.canReturn(from) ||
        from.href !== to.href ||
        from.state.__TSR_index !== to.state.__TSR_index ||
        !to.state.__TSR_key
      )
        return;
      const key = to.state.__TSR_key;
      const entry = { href: to.href, index: to.state.__TSR_index! };
      memory.set(key, entry);
      try {
        storage()?.setItem(prefix + key, JSON.stringify(entry));
      } catch {
        /* Memory fallback. */
      }
    },
    canReturn(location: LocationEntry) {
      const key = location.state.__TSR_key;
      if (!key) return false;
      let entry = memory.get(key);
      if (!entry) {
        try {
          const raw = storage()?.getItem(prefix + key);
          if (raw) entry = JSON.parse(raw) as SavedEntry;
        } catch {
          return false;
        }
      }
      return (
        !!entry &&
        entry.index > 0 &&
        entry.index === location.state.__TSR_index &&
        entry.href === location.href
      );
    },
  };
}

export const returnHistory = createReturnHistory(() =>
  typeof window === "undefined" ? undefined : window.sessionStorage,
);
