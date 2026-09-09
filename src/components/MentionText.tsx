import { departments, people } from "@/lib/store";

const targets = [
  ...departments.map((d) => d.name),
  ...people.map((p) => p.full_name),
].sort((a, b) => b.length - a.length);

/** Renders comment text with @mentions of people and departments picked out. */
export function MentionText({ body }: { body: string }) {
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
    <p className="text-sm leading-relaxed text-ink">
      {nodes.map((node, i) =>
        typeof node === "string" ? (
          <span key={i}>{node}</span>
        ) : (
          <span
            key={i}
            className="rounded bg-gold-tint px-1 font-medium text-gold-deep"
            title={
              departments.some((d) => d.name === node.mention)
                ? "Department mention — notifies the department owner and leads"
                : "Team member mention"
            }
          >
            @{node.mention}
          </span>
        ),
      )}
    </p>
  );
}
