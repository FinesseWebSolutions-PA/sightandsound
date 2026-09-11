import { useState } from "react";
import { cn } from "@/lib/utils";
import { personById, useStore } from "@/lib/store";
import { EmojiPicker } from "./EmojiPicker";
export function MessageReactions({
  commentId,
  readOnly,
}: {
  commentId: string;
  readOnly: boolean;
}) {
  const { commentReactions, toggleReaction, currentUserId } = useStore();
  const [busy, setBusy] = useState(false);
  const grouped = new Map<string, typeof commentReactions>();
  for (const r of commentReactions.filter((r) => r.comment_id === commentId))
    grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r]);
  const react = async (emoji: string) => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      await toggleReaction(commentId, emoji);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[...grouped].map(([emoji, rows]) => {
        const mine = rows.some((r) => r.person_id === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            disabled={readOnly || busy}
            aria-pressed={mine}
            aria-label={`${mine ? "Remove" : "Add"} ${emoji} reaction, ${rows.length}`}
            title={rows.map((r) => personById(r.person_id)?.full_name ?? "Team member").join(", ")}
            onClick={() => void react(emoji)}
            className={cn(
              "min-h-9 rounded-full border px-2 text-sm",
              mine ? "border-gold bg-gold-tint" : "border-border bg-card",
            )}
          >
            {emoji} {rows.length}
          </button>
        );
      })}
      {!readOnly && (
        <EmojiPicker label="Add reaction" disabled={busy} onSelect={(emoji) => void react(emoji)} />
      )}
    </div>
  );
}
