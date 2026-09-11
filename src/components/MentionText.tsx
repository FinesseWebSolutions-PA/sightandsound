import { Users } from "lucide-react";

import { departments, people } from "@/lib/store";

/** Renders comment text with @mentions of people and departments as chips. */
export function MentionText({ body }: { body: string }) {
  // Built per render because the roster is loaded after this module is imported.
  const targets = [...departments.map((d) => d.name), ...people.map((p) => p.full_name)].sort(
    (a, b) => b.length - a.length,
  );

  const nodes: (string | { mention: string })[] = [];
  let rest = body;

  while (rest.length > 0) {
    const at = rest.indexOf("@");
    if (at === -1) {
      nodes.push(rest);
      break;
    }
    const match = targets.find((t) => rest.startsWith(`@${t}`, at));
    if (!match) {
      nodes.push(rest.slice(0, at + 1));
      rest = rest.slice(at + 1);
      continue;
    }
    if (at > 0) nodes.push(rest.slice(0, at));
    nodes.push({ mention: match });
    rest = rest.slice(at + 1 + match.length);
  }

  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-ink">
      {nodes.map((node, i) => {
        if (typeof node === "string")
          return (
            <span key={i}>
              {node.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
                /^https?:\/\//.test(part) ? (
                  <a
                    key={j}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-gold-deep"
                  >
                    {part}
                  </a>
                ) : (
                  part
                ),
              )}
            </span>
          );
        const isDepartment = departments.some((d) => d.name === node.mention);
        return (
          <span
            key={i}
            className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-gold-tint px-2 py-0.5 align-baseline text-sm font-medium text-gold-deep"
            title={
              isDepartment
                ? "Department mention — notifies the department owner and leads"
                : "Team member mention"
            }
          >
            {isDepartment && <Users aria-hidden className="size-3" />}@{node.mention}
          </span>
        );
      })}
    </p>
  );
}
