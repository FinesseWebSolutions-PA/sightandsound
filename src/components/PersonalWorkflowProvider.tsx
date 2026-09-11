import { PersonalContext as Context } from "@/lib/personal-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { personalWorkflow, emptyPersonalState, type PersonalState } from "@/lib/personal-workflow";
import { mergeConversationReads, setReadTransport } from "@/lib/conversation-read";
import { inQuietHours, notificationDisposition } from "@/lib/notification-rules";
import { toast } from "sonner";
export function PersonalWorkflowProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, notifications } = useStore();
  const [state, setState] = useState(emptyPersonalState);
  const [error, setError] = useState("");
  const actor = useRef(currentUserId);
  actor.current = currentUserId;
  const serial = useRef(0);
  const apply = useCallback((next: PersonalState, id: string) => {
    if (actor.current !== id) return;
    setState(next);
    mergeConversationReads(id, next.reads);
    setError("");
  }, []);
  const act = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const id = actor.current;
      const sequence = ++serial.current;
      try {
        const next = await personalWorkflow(id, action, payload);
        if (sequence === serial.current) apply(next, id);
        return true;
      } catch (e) {
        if (actor.current === id)
          setError(e instanceof Error ? e.message : "Personal settings could not sync.");
        return false;
      }
    },
    [apply],
  );
  useEffect(() => {
    setState(emptyPersonalState);
    setError("");
    const refresh = () => void act("get", {});
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [currentUserId, act]);
  useEffect(
    () =>
      setReadTransport(currentUserId, async (threadId, at) => {
        const result = await personalWorkflow(currentUserId, "read", { thread_id: threadId, at });
        mergeConversationReads(currentUserId, result.reads);
      }),
    [currentUserId],
  );
  const seen = useRef({ actor: "", ids: new Set<string>() });
  useEffect(() => {
    const mine = notifications.filter((n) => n.recipient_id === currentUserId);
    if (seen.current.actor !== currentUserId) {
      seen.current = { actor: currentUserId, ids: new Set(mine.map((n) => n.id)) };
      return;
    }
    const fresh = mine.filter((n) => !seen.current.ids.has(n.id));
    seen.current.ids = new Set(mine.map((n) => n.id));
    const pref = state.preferences;
    if (
      !pref?.desktop ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      inQuietHours(new Date().getHours(), pref.quiet_start, pref.quiet_end)
    )
      return;
    for (const n of fresh) {
      if (
        n.read ||
        notificationDisposition(state.notifications.find((s) => s.notification_id === n.id)) !==
          "active"
      )
        continue;
      if (
        pref.mode === "mentions" &&
        !["mention", "approval"].includes(n.kind) &&
        !n.raw_type?.includes("assign")
      )
        continue;
      try {
        new Notification("Sight & Sound", { body: n.summary, tag: n.id });
      } catch {
        toast.info(n.summary);
      }
    }
  }, [notifications, currentUserId, state]);
  return <Context.Provider value={{ state, error, act }}>{children}</Context.Provider>;
}
