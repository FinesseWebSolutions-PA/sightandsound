import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskDependency, Milestone, Scene } from "./production-data";
import { useStore } from "./store";

type RawTask = Omit<Task, "assignee_id" | "status"> & { owner_id: string | null; status: string };
export type GanttState = {
  revision: string;
  tasks: RawTask[];
  dependencies: TaskDependency[];
  milestones: Milestone[];
  sets: Scene[];
  inverse?: GanttOperation[];
};
export type GanttOperation =
  | { action: "task"; task_id: string; patch: Record<string, string | null> }
  | {
      action: "link" | "unlink";
      task_id: string;
      predecessor_id: string;
      type?: string;
      lag_hours?: number;
      hard_constraint?: boolean;
      id?: string;
    };
export type Baseline = { id: string; name: string; created_at: string; tasks: RawTask[] };
type Database = {
  public: {
    Tables: {
      gantt_baselines: {
        Row: Baseline & { project_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      gantt_snapshot: { Args: { p_project: string }; Returns: GanttState };
      gantt_edit: {
        Args: {
          p_project: string;
          p_actor: string;
          p_expected: string;
          p_operations: GanttOperation[];
          p_preview: boolean;
        };
        Returns: GanttState;
      };
      gantt_capture_baseline: {
        Args: { p_project: string; p_actor: string; p_name: string };
        Returns: string;
      };
    };
  };
};
const client = supabase as unknown as SupabaseClient<Database>;
export function ganttTask(t: RawTask): Task {
  return {
    ...t,
    assignee_id: t.owner_id ?? "",
    parent_task_id: t.parent_task_id ?? "",
    stage_id: t.stage_id ?? "",
    scene_id: t.scene_id ?? "",
    description: t.description ?? "",
    status: t.status === "done" ? "complete" : (t.status as Task["status"]),
    start_date: t.start_date ?? "",
    due_date: t.due_date ?? "",
    forecast_start: t.forecast_start ?? "",
    forecast_finish: t.forecast_finish ?? "",
    actual_start: t.actual_start ?? "",
    actual_finish: t.actual_finish ?? "",
  };
}
export type GanttPreview = {
  operations: GanttOperation[];
  expected: string;
  result: GanttState;
  changes: { id: string; title: string; before: string; after: string }[];
  warnings: string[];
};
type History = { operations: GanttOperation[]; revision: string };
export function useGanttData(projectId: string) {
  const { currentUserId, tasks: storeTasks, can, isClosed } = useStore();
  const [state, setState] = useState<GanttState | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<GanttPreview | null>(null);
  const [undo, setUndo] = useState<History[]>([]);
  const [redo, setRedo] = useState<History[]>([]);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const seq = ++generation.current;
    const { data, error } = await client.rpc("gantt_snapshot", { p_project: projectId });
    if (error) throw new Error(error.message);
    if (mounted.current && seq === generation.current && !working.current) setState(data);
  }, [projectId]);
  const loadBaselines = useCallback(async () => {
    const { data, error } = await client
      .from("gantt_baselines")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    if (mounted.current) setBaselines(data ?? []);
  }, [projectId]);
  useEffect(() => {
    if (!working.current) void refresh().catch((e) => setError(e.message));
  }, [refresh, storeTasks]);
  useEffect(() => {
    void loadBaselines().catch((e) => setError(e.message));
  }, [loadBaselines]);
  const rpc = async (operations: GanttOperation[], expected: string, isPreview: boolean) => {
    const { data, error } = await client.rpc("gantt_edit", {
      p_project: projectId,
      p_actor: currentUserId,
      p_operations: operations,
      p_expected: expected,
      p_preview: isPreview,
    });
    if (error) throw new Error(error.message);
    return data;
  };
  async function apply(
    operations: GanttOperation[],
    expected: string,
    mode: "edit" | "undo" | "redo" = "edit",
  ) {
    const result = await rpc(operations, expected, false);
    generation.current++;
    setState(result);
    setPreview(null);
    setMessage(mode === "edit" ? "Saved" : mode === "undo" ? "Change undone" : "Change redone");
    const entry = { operations: result.inverse ?? [], revision: result.revision };
    if (mode === "edit") {
      setUndo((old) => [...old.slice(-29), entry]);
      setRedo([]);
    } else if (mode === "undo") {
      setUndo((old) =>
        old
          .slice(0, -1)
          .map((x, i) => (i === old.length - 2 ? { ...x, revision: result.revision } : x)),
      );
      setRedo((old) => [...old, entry]);
    } else {
      setRedo((old) =>
        old
          .slice(0, -1)
          .map((x, i) => (i === old.length - 2 ? { ...x, revision: result.revision } : x)),
      );
      setUndo((old) => [...old, entry]);
    }
  }
  async function guarded(work: () => Promise<void>) {
    if (working.current || !can.editCoreTimeline || isClosed(projectId)) return;
    working.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Your change has not been confirmed.",
      );
      setPreview(null);
    } finally {
      working.current = false;
      setBusy(false);
      void refresh().catch(() => undefined);
    }
  }
  async function propose(operations: GanttOperation[]) {
    if (!state) return;
    await guarded(async () => {
      const result = await rpc(operations, state.revision, true);
      const before = new Map(state.tasks.map((t) => [t.id, t]));
      const changes = result.tasks.flatMap((t) => {
        const old = before.get(t.id);
        return old &&
          (old.forecast_start !== t.forecast_start ||
            old.forecast_finish !== t.forecast_finish ||
            old.start_date !== t.start_date ||
            old.due_date !== t.due_date)
          ? [
              {
                id: t.id,
                title: t.title,
                before: `${old.forecast_start || old.start_date || "Unscheduled"} → ${old.forecast_finish || old.due_date || "Unscheduled"}`,
                after: `${t.forecast_start || t.start_date || "Unscheduled"} → ${t.forecast_finish || t.due_date || "Unscheduled"}`,
              },
            ]
          : [];
      });
      const warnings = result.milestones
        .filter((m) => m.forecast_date && m.due_date && m.forecast_date > m.due_date)
        .map((m) => `${m.name} is forecast after its ${m.due_date} deadline.`);
      if (changes.length > 1 || warnings.length || operations.some((o) => o.action !== "task"))
        setPreview({ operations, expected: state.revision, result, changes, warnings });
      else await apply(operations, state.revision);
    });
  }
  const confirm = () => preview && guarded(() => apply(preview.operations, preview.expected));
  const history = (mode: "undo" | "redo") => {
    const entry = (mode === "undo" ? undo : redo).at(-1);
    if (entry) void guarded(() => apply(entry.operations, entry.revision, mode));
  };
  async function capture(name: string) {
    await guarded(async () => {
      const { error } = await client.rpc("gantt_capture_baseline", {
        p_project: projectId,
        p_actor: currentUserId,
        p_name: name,
      });
      if (error) throw new Error(error.message);
      await loadBaselines();
      setMessage("Baseline captured");
    });
  }
  return {
    state,
    baselines,
    busy,
    error,
    message,
    preview,
    propose,
    confirm,
    cancel: () => setPreview(null),
    refresh: async () => {
      await refresh();
      setError("");
    },
    undo: () => history("undo"),
    redo: () => history("redo"),
    canUndo: undo.length > 0,
    canRedo: redo.length > 0,
    capture,
  };
}
