import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { Discussion } from "@/components/Discussion";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/projects/$projectId/discussions")({
  head: () => ({
    meta: [
      { title: "Discussions — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Threaded conversation at the production, work item, and document level, with mentions of team members and departments.",
      },
      { property: "og:title", content: "Discussions — Sight & Sound Show Production" },
      {
        property: "og:description",
        content:
          "Threaded conversation at production, work item, and document level with department mentions.",
      },
    ],
  }),
  component: DiscussionsTab,
});

const levels = [
  { key: "project", label: "Production-level" },
  { key: "task", label: "On work items" },
  { key: "document", label: "On documents" },
] as const;

function DiscussionsTab() {
  const { projectId } = Route.useParams();
  const { projects } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const [level, setLevel] = useState<(typeof levels)[number]["key"]>("project");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-ink">Discussions</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          One conversation per subject, visible to every department. Mention a team member by name,
          or a department to reach its owner and leads.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {levels.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setLevel(option.key)}
            aria-pressed={level === option.key}
            className={
              level === option.key
                ? "rounded-full border border-ink bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream-soft"
                : "rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-cream"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <Discussion
        key={level}
        projectId={projectId}
        contextType={level}
        heading={levels.find((l) => l.key === level)?.label ?? "Discussions"}
        blurb={
          level === "project"
            ? "Conversation about the production as a whole."
            : level === "task"
              ? "Conversation attached to individual work items on the timeline."
              : "Conversation attached to documents and their versions."
        }
      />
    </div>
  );
}
