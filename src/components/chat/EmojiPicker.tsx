import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
const EMOJIS: [string, string][] = [
  ["😀", "happy smile"],
  ["😊", "smile blush"],
  ["😂", "laugh tears"],
  ["🤣", "laugh"],
  ["😍", "love eyes"],
  ["🥰", "love hearts"],
  ["😎", "cool"],
  ["🤔", "thinking"],
  ["😅", "sweat smile"],
  ["😢", "sad cry"],
  ["😭", "cry"],
  ["😬", "nervous"],
  ["🙃", "upside down"],
  ["🙂", "smile"],
  ["😉", "wink"],
  ["😮", "surprised"],
  ["👍", "thumbs up yes"],
  ["👎", "thumbs down no"],
  ["👏", "clap"],
  ["🙌", "celebrate hands"],
  ["🙏", "thanks please"],
  ["💪", "strong"],
  ["👀", "eyes looking"],
  ["👋", "wave hello"],
  ["🤝", "agreement"],
  ["❤️", "love heart"],
  ["💛", "yellow heart"],
  ["✅", "done check"],
  ["❌", "cross no"],
  ["⚠️", "warning"],
  ["❓", "question"],
  ["💡", "idea"],
  ["🎉", "party celebrate"],
  ["🎊", "confetti"],
  ["🔥", "fire"],
  ["⭐", "star"],
  ["✨", "sparkle"],
  ["💯", "hundred"],
  ["🚀", "rocket"],
  ["🎭", "theatre"],
  ["🎬", "production"],
  ["🎵", "music"],
  ["🎤", "microphone"],
  ["🎨", "art"],
  ["🛠️", "tools work"],
  ["🔧", "wrench"],
  ["🔨", "hammer"],
  ["📐", "design ruler"],
  ["📎", "attachment"],
  ["📁", "folder"],
  ["📄", "document"],
  ["📷", "photo"],
  ["📅", "calendar"],
  ["⏰", "time"],
  ["☕", "coffee"],
  ["🍕", "pizza"],
  ["🎂", "birthday"],
  ["🌟", "star"],
  ["💬", "message"],
  ["🏁", "finished"],
  ["🟢", "green"],
  ["🔴", "red"],
];
export function EmojiPicker({
  onSelect,
  label = "Add emoji",
  disabled = false,
}: {
  onSelect: (emoji: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          title={label}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border bg-card text-ink-soft hover:bg-cream"
        >
          <Smile aria-hidden className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <input
          autoFocus
          aria-label="Find emoji"
          placeholder="Find an emoji…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 w-full rounded border p-2 text-sm"
        />
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
          {EMOJIS.filter(([emoji, name]) => (name + emoji).includes(query.toLowerCase())).map(
            ([emoji, name]) => (
              <button
                key={emoji}
                type="button"
                aria-label={name}
                title={name}
                onClick={() => {
                  onSelect(emoji!);
                  setOpen(false);
                  setQuery("");
                }}
                className="min-h-10 rounded text-xl hover:bg-cream"
              >
                {emoji}
              </button>
            ),
          )}
        </div>
        <p className="mt-2 text-xs text-ink-soft">You can also use your keyboard’s emoji picker.</p>
      </PopoverContent>
    </Popover>
  );
}
