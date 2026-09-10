import { createFileRoute, notFound } from "@tanstack/react-router";

import { DocumentBrowser } from "@/components/DocumentBrowser";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/projects/$projectId/documents")({
  validateSearch: (search: Record<string, unknown>): { document?: string; comment?: string } => ({
    ...(typeof search["document"] === "string" ? { document: search["document"] } : {}),
    ...(typeof search["comment"] === "string" ? { comment: search["comment"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Documents & approvals — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Versioned production documents with a review workflow: request review, approve, reject, or request changes.",
      },
      { property: "og:title", content: "Documents & approvals — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Versioned production documents with request review, approve, and reject steps.",
      },
    ],
  }),
  component: DocumentsTab,
});

function DocumentsTab() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { projects } = useStore();
  if (!projects.find((p) => p.id === projectId)) throw notFound();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">Documents</h2>
      <DocumentBrowser
        projectId={projectId}
        {...(search.document ? { openDocumentId: search.document } : {})}
        {...(search.comment ? { highlightCommentId: search.comment } : {})}
      />
    </div>
  );
}
