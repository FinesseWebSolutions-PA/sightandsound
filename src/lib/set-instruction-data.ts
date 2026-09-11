import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { InstructionCategory } from "./set-instructions";
export type SetInstruction = {
  scene_id: string;
  document_id: string;
  category: InstructionCategory;
  updated_by: string;
  updated_at: string;
};
type Database = {
  public: {
    Tables: {
      set_instruction_documents: {
        Row: SetInstruction;
        Insert: Partial<SetInstruction>;
        Update: Partial<SetInstruction>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      set_instruction_action: {
        Args: {
          p_scene: string;
          p_category: string;
          p_document: string;
          p_actor: string;
          p_remove: boolean;
        };
        Returns: undefined;
      };
    };
  };
};
const client = supabase as unknown as SupabaseClient<Database>;
export async function loadSetInstructions(sceneId: string) {
  const { data, error } = await client
    .from("set_instruction_documents")
    .select("*")
    .eq("scene_id", sceneId)
    .order("updated_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function saveSetInstruction(
  sceneId: string,
  category: InstructionCategory,
  documentId: string,
  actor: string,
  remove = false,
) {
  const { error } = await client.rpc("set_instruction_action", {
    p_scene: sceneId,
    p_category: category,
    p_document: documentId,
    p_actor: actor,
    p_remove: remove,
  });
  if (error) throw new Error(error.message);
}
