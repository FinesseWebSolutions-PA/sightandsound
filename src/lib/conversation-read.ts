export const readKey = (userId: string, threadId: string) => `ss-read:${userId}:${threadId}`;
let transport: { user: string; send: (thread: string, at: string) => Promise<void> } | null = null;
const pending = new Map<string, { user: string; thread: string; at: string }>();
let running = false;
const memoryReads = new Map<string, string>();
export function lastRead(userId: string, threadId: string): string {
  try {
    return (
      localStorage.getItem(readKey(userId, threadId)) ??
      memoryReads.get(readKey(userId, threadId)) ??
      ""
    );
  } catch {
    return memoryReads.get(readKey(userId, threadId)) ?? "";
  }
}
export function mergeConversationReads(
  user: string,
  rows: { thread_id: string; last_read_at: string }[],
) {
  let changed = false;
  for (const r of rows) {
    if (new Date(r.last_read_at).getTime() > new Date(lastRead(user, r.thread_id) || 0).getTime()) {
      memoryReads.set(readKey(user, r.thread_id), new Date(r.last_read_at).toISOString());
      changed = true;
    }
    try {
      if (
        new Date(r.last_read_at).getTime() >
        new Date(localStorage.getItem(readKey(user, r.thread_id)) || 0).getTime()
      ) {
        localStorage.setItem(readKey(user, r.thread_id), new Date(r.last_read_at).toISOString());
        changed = true;
      }
    } catch {
      /* Read markers still work in memory when storage is unavailable. */
    }
  }
  if (changed) window.dispatchEvent(new Event("conversation-read"));
}
async function flush() {
  if (running || !transport) return;
  running = true;
  const current = transport;
  try {
    for (const [key, row] of pending) {
      if (row.user !== current.user) continue;
      try {
        await current.send(row.thread, row.at);
        if (pending.get(key) === row) pending.delete(key);
      } catch {
        break;
      }
    }
  } finally {
    running = false;
  }
}
export function setReadTransport(
  user: string,
  send: (thread: string, at: string) => Promise<void>,
) {
  transport = { user, send };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const prefix = `ss-read:${user}:`;
      if (key?.startsWith(prefix)) {
        const at = localStorage.getItem(key);
        if (at) pending.set(key, { user, thread: key.slice(prefix.length), at });
      }
    }
  } catch {
    /* Storage is optional. */
  }
  void flush();
  const timer = window.setInterval(() => void flush(), 30000);
  return () => {
    window.clearInterval(timer);
    if (transport?.user === user) transport = null;
  };
}
export function markConversationRead(userId: string, threadId: string, at: string) {
  if (!userId || !threadId || !Number.isFinite(Date.parse(at))) return;
  const old = lastRead(userId, threadId);
  if (old && new Date(at).getTime() <= new Date(old).getTime()) return;
  memoryReads.set(readKey(userId, threadId), at);
  try {
    localStorage.setItem(readKey(userId, threadId), at);
  } catch {
    /* Keep queued state. */
  }
  pending.set(readKey(userId, threadId), { user: userId, thread: threadId, at });
  window.dispatchEvent(new Event("conversation-read"));
  void flush();
}
