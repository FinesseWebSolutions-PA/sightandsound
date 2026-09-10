import { createFileRoute, notFound } from "@tanstack/react-router";

import { ConversationRail } from "@/components/ConversationRail";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/projects/$projectId/discussions")({
  validateSearch: (search: Record<string, unknown>): { comment?: string } => ({
    ...(typeof search["comment"] === "string" ? { comment: search["comment"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Updates — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Every conversation on this production, set by set — the sets themselves, their work items and their documents.",
      },
      { property: "og:title", content: "Updates — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "All conversation on the build, grouped set by set beside the message you opened.",
      },
    ],
  }),
  component: UpdatesTab,
});

function UpdatesTab() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { projects } = useStore();
  if (!projects.find((p) => p.id === projectId)) throw notFound();

  return (
    <ConversationRail
      projectId={projectId}
      {...(search.comment ? { highlightCommentId: search.comment } : {})}
    />
  );
}
