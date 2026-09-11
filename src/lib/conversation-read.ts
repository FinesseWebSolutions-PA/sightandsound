export const readKey = (userId: string, threadId: string) => `ss-read:${userId}:${threadId}`;
export function lastRead(userId: string, threadId: string): string {
  try {
    return localStorage.getItem(readKey(userId, threadId)) ?? "";
  } catch {
    return "";
  }
}
export function markConversationRead(userId: string, threadId: string, at: string) {
  try {
    if (at > lastRead(userId, threadId)) {
      localStorage.setItem(readKey(userId, threadId), at);
      window.dispatchEvent(new Event("conversation-read"));
    }
  } catch {
    /* Private browsing may disable storage. */
  }
}
