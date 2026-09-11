import { useEffect, useState } from "react";
import { departments, people, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
export function MentionAudience({
  body,
  threadKey,
  projectId,
}: {
  body: string;
  threadKey: string;
  projectId: string;
}) {
  const { currentUserId, threads, tasks, documents } = useStore();
  const thread = threads.find((t) => t.id === threadKey);
  const scene =
    thread?.scene_id ||
    tasks.find((t) => t.id === thread?.task_id)?.scene_id ||
    documents.find((d) => d.id === thread?.document_id)?.scene_id ||
    (threadKey.startsWith("new:") && threadKey !== "new:project" ? threadKey.slice(4) : null);
  const mentioned = departments.filter((d) => body.includes(`@${d.name}`));
  const key = mentioned.map((d) => d.id).join(",");
  const [audience, setAudience] = useState<{
    key: string;
    rows: { department_id: string; person_id: string }[];
    error: boolean;
  } | null>(null);
  const contextKey = `${projectId}:${scene}:${key}`;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const rpc = supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: { department_id: string; person_id: string }[]; error: unknown }>;
    void rpc("department_audience", { p_project: projectId, p_scene: scene }).then(
      (r) => {
        if (!cancelled)
          setAudience({ key: contextKey, rows: r.data ?? [], error: Boolean(r.error) });
      },
      () => {
        if (!cancelled) setAudience({ key: contextKey, rows: [], error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, projectId, scene, contextKey]);
  const ids = new Set(people.filter((p) => body.includes(`@${p.full_name}`)).map((p) => p.id));
  if (audience?.key === contextKey)
    audience.rows
      .filter((r) => mentioned.some((d) => d.id === r.department_id))
      .forEach((r) => ids.add(r.person_id));
  ids.delete(currentUserId);
  const recipients = people.filter((p) => ids.has(p.id));
  if (!mentioned.length && !recipients.length) return null;
  return (
    <p className="mt-1 text-xs text-ink-soft" role="status">
      {mentioned.length && audience?.key !== contextKey
        ? "Checking mention recipients…"
        : audience?.error && mentioned.length
          ? "Recipient preview unavailable. Recipients will be checked again when you send."
          : `Mentions notify: ${recipients.length ? recipients.map((p) => p.full_name).join(", ") : "no other assigned recipients"}.`}{" "}
      Visible to this production. People following the conversation can also receive replies.
    </p>
  );
}
