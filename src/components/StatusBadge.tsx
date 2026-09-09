import { cn } from "@/lib/utils";
import { toneClasses, type StatusMeta } from "@/lib/status";

/**
 * Status is never color alone: every badge carries an icon and a text label
 * alongside its tone.
 */
export function StatusBadge({
  meta,
  className,
  size = "md",
}: {
  meta: StatusMeta;
  className?: string;
  size?: "sm" | "md";
}) {
  const { label, tone, Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        toneClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} />
      {label}
    </span>
  );
}
