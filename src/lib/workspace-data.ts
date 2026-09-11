import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export type SetUpdate = {
  id: string;
  scene_id: string;
  kind: "update" | "decision";
  body: string;
  owner_id: string;
  created_by: string;
  source_comment_id: string | null;
  source_snapshot: string | null;
  document_version_id: string | null;
  task_id: string | null;
  needs_ack: boolean;
  created_at: string;
};
export type Recipient = { person_id: string; full_name: string };
export type Receipt = { update_id: string; person_id: string; acknowledged_at: string | null };
export type ScheduleRequest = {
  id: string;
  project_id: string;
  task_id: string;
  requested_by: string;
  old_start: string | null;
  old_finish: string | null;
  new_start: string;
  new_finish: string;
  reason: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};
export type Allocation = {
  task_id: string;
  project_id: string;
  lane: string;
  mode: "in_house" | "outsourced";
  vendor: string | null;
  owner_id: string;
  start_date: string;
  finish_date: string;
  updated_at: string;
};
export type EditHistory = {
  id: string;
  comment_id: string;
  author_id: string;
  old_body: string;
  new_body: string;
  edited_at: string;
};
type Rows = {
  set_updates: SetUpdate;
  set_update_recipients: Receipt;
  schedule_change_requests: ScheduleRequest;
  capacity_allocations: Allocation;
  comment_edit_history: EditHistory;
  set_followers: { scene_id: string; person_id: string };
  project_workflow_settings: { project_id: string; timeline_owner_id: string };
};
type WorkspaceDatabase = {
  public: {
    Tables: {
      [K in keyof Rows]: {
        Row: Rows[K];
        Insert: Partial<Rows[K]>;
        Update: Partial<Rows[K]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      workspace_action: {
        Args: { p_action: string; p_payload: Record<string, unknown>; p_actor: string };
        Returns: string;
      };
      set_recipients: { Args: { p_scene: string }; Returns: Recipient[] };
    };
  };
};
const client = supabase as unknown as SupabaseClient<WorkspaceDatabase>;
export async function workspaceAction(
  action: string,
  payload: Record<string, unknown>,
  actor: string,
) {
  const { data, error } = await client.rpc("workspace_action", {
    p_action: action,
    p_payload: payload,
    p_actor: actor,
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function loadRecipients(sceneId: string) {
  const { data, error } = await client.rpc("set_recipients", { p_scene: sceneId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function loadWorkspace(projectId: string, sceneId: string) {
  const [updates, requests, capacity, settings, followers, recipients] = await Promise.all([
    client
      .from("set_updates")
      .select("*")
      .eq("scene_id", sceneId)
      .order("created_at", { ascending: false }),
    client
      .from("schedule_change_requests")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    client.from("capacity_allocations").select("*").eq("project_id", projectId),
    client.from("project_workflow_settings").select("*").eq("project_id", projectId).maybeSingle(),
    client.from("set_followers").select("*").eq("scene_id", sceneId),
    loadRecipients(sceneId),
  ]);
  for (const result of [updates, requests, capacity, settings, followers])
    if (result.error) throw new Error(result.error.message);
  const ids = (updates.data ?? []).map((u) => u.id);
  const receipts = ids.length
    ? await client.from("set_update_recipients").select("*").in("update_id", ids)
    : { data: [], error: null };
  if (receipts.error) throw new Error(receipts.error.message);
  return {
    updates: updates.data ?? [],
    requests: requests.data ?? [],
    capacity: capacity.data ?? [],
    manager: settings.data?.timeline_owner_id ?? null,
    followers: followers.data ?? [],
    recipients,
    receipts: receipts.data ?? [],
  };
}
export async function loadEditHistory(commentId: string) {
  const { data, error } = await client
    .from("comment_edit_history")
    .select("*")
    .eq("comment_id", commentId)
    .order("edited_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
