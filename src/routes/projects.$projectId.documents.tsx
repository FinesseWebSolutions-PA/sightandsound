import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { DocumentBrowser } from "@/components/DocumentBrowser";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/projects/$projectId/documents")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { document?: string; comment?: string; folder?: string } => ({
    ...(typeof search["document"] === "string" ? { document: search["document"] } : {}),
    ...(typeof search["comment"] === "string" ? { comment: search["comment"] } : {}),
    ...(typeof search["folder"] === "string" ? { folder: search["folder"] } : {}),
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
  const navigate = useNavigate();
  const { projects } = useStore();
  if (!projects.find((p) => p.id === projectId)) throw notFound();

  /** The address is what decides which document is open, so links and Back both work. */
  const setSearch = (patch: Record<string, string | undefined>, replace = false) =>
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(patch)) {
          if (value) next[key] = value;
          else delete next[key];
        }
        return next;
      },
      replace,
    });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">Documents</h2>
      <DocumentBrowser
        projectId={projectId}
        {...(search.document ? { openDocumentId: search.document } : {})}
        {...(search.folder ? { openFolder: search.folder } : {})}
        {...(search.comment ? { highlightCommentId: search.comment } : {})}
        onOpenDocument={(documentId) => setSearch({ document: documentId })}
        onCloseDocument={() => setSearch({ document: undefined, comment: undefined })}
        onPlaceChange={(encoded) => setSearch({ folder: encoded || undefined }, true)}
      />
    </div>
  );
}
