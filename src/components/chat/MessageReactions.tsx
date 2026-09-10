import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const QUICK_EMOJIS = ["👍", "❤️", "✅", "🎉", "👀", "😂"];

export function MessageReactions({
  commentId,
  readOnly,
}: {
  commentId: string;
  readOnly: boolean;
}) {
  const { commentReactions, toggleReaction, currentUserId } = useStore();

  const reactions = commentReactions.filter((r) => r.comment_id === commentId);
  const counts = new Map<string, number>();
  const own = new Map<string, string | undefined>();
  for (const r of reactions) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    if (r.person_id === currentUserId) {
      own.set(r.emoji, r.id);
    }
  }

  const handle = async (emoji: string) => {
    if (readOnly) return;
    await toggleReaction(commentId, emoji);
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {Array.from(counts.entries()).map(([emoji, count]) => {
        const isOwn = own.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handle(emoji)}
            disabled={readOnly}
            aria-label={isOwn ? `Remove ${emoji} reaction` : `Add ${emoji} reaction`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
              isOwn
                ? "border-gold/60 bg-gold-tint text-ink"
                : "border-border bg-card text-ink-soft hover:bg-cream",
              readOnly && "cursor-default opacity-70",
            )}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
      {!readOnly && (
        <div className="group relative">
          <button
            type="button"
            aria-label="Add reaction"
            className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cream"
          >
            <span className="text-sm">+</span>
          </button>
          <span className="absolute bottom-full left-0 mb-1.5 hidden w-max gap-1 rounded-lg border border-border bg-card px-2 py-1.5 shadow-sm group-hover:flex">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handle(emoji)}
                className="rounded p-1 hover:bg-cream"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
