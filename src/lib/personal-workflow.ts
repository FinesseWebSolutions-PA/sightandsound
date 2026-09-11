import { supabase } from "@/integrations/supabase/client";
export type PersonalState = {
  reads: { thread_id: string; last_read_at: string }[];
  threads: { thread_id: string; mode: "following" | "muted" }[];
  notifications: { notification_id: string; dismissed: boolean; snoozed_until: string | null }[];
  preferences: {
    desktop: boolean;
    mode: "mentions" | "following";
    quiet_start: number;
    quiet_end: number;
  } | null;
};
export const emptyPersonalState: PersonalState = {
  reads: [],
  threads: [],
  notifications: [],
  preferences: null,
};
export async function personalWorkflow(
  actor: string,
  action = "get",
  payload: Record<string, unknown> = {},
): Promise<PersonalState> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: PersonalState; error: { message: string } | null }>
  )("personal_workflow", { p_actor: actor, p_action: action, p_payload: payload });
  if (error) throw new Error(error.message);
  return data;
}
