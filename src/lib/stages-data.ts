import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
export type SetStage = {
  id: string;
  scene_id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};
type StageDatabase = {
  public: {
    Tables: {
      set_stages: {
        Row: SetStage;
        Insert: Partial<SetStage>;
        Update: Partial<SetStage>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      manage_set_stage: {
        Args: {
          p_scene: string;
          p_actor: string;
          p_name?: string;
          p_id?: string;
          p_action: string;
        };
        Returns: string;
      };
    };
  };
};
export const stageClient = supabase as unknown as SupabaseClient<StageDatabase>;
export async function writeStage(
  sceneId: string,
  actor: string,
  action: "save" | "delete" | "up" | "down",
  name?: string,
  id?: string,
) {
  const { data, error } = await stageClient.rpc("manage_set_stage", {
    p_scene: sceneId,
    p_actor: actor,
    p_action: action,
    ...(name !== undefined ? { p_name: name } : {}),
    ...(id ? { p_id: id } : {}),
  });
  if (error)
    throw new Error(
      error.code === "23505"
        ? "This set already has a stage with that name. Choose a different name."
        : error.message,
    );
  return data;
}
