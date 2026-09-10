import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, ListChecks, MessageSquare, Search as SearchIcon, Theater } from "lucide-react";

import { departments, people, useStore } from "@/lib/store";
import { searchAll, type SearchHit } from "@/lib/search";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    ...(typeof search["q"] === "string" ? { q: search["q"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Search — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Find a production, work item, drawing, or something someone said, and jump straight to it in context.",
      },
      { property: "og:title", content: "Search — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Find a production, work item, drawing, or conversation and open it in context.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

const groups = [
  { kind: "project", label: "Productions", icon: Theater },
  { kind: "task", label: "Work items", icon: ListChecks },
  { kind: "document", label: "Drawings & documents", icon: FileText },
  { kind: "comment", label: "What people said", icon: MessageSquare },
] as const;

function HitLink({ hit }: { hit: SearchHit }) {
  const label = "Open";
  if (hit.kind === "project") {
    return (
      <Link
        to="/projects/$projectId"
        params={{ projectId: hit.projectId }}
        className="text-sm font-semibold text-ink hover:underline"
      >
        {hit.title}
      </Link>
    );
  }
  if (hit.kind === "task") {
    return (
      <Link
        to="/projects/$projectId/timeline"
        params={{ projectId: hit.projectId }}
        search={{ task: hit.taskId }}
        aria-label={`${label} ${hit.title}`}
        className="text-sm font-semibold text-ink hover:underline"
      >
        {hit.title}
      </Link>
    );
  }
  if (hit.kind === "document") {
    return (
      <Link
        to="/projects/$projectId/documents"
        params={{ projectId: hit.projectId }}
        search={{ document: hit.documentId }}
        className="text-sm font-semibold text-ink hover:underline"
      >
        {hit.title}
      </Link>
    );
  }
  if (hit.taskId) {
    return (
      <Link
        to="/projects/$projectId/timeline"
        params={{ projectId: hit.projectId }}
        search={{ task: hit.taskId, comment: hit.commentId }}
        className="text-sm font-semibold text-ink hover:underline"
      >
        {hit.title}
      </Link>
    );
  }
  if (hit.documentId) {
    return (
      <Link
        to="/projects/$projectId/documents"
        params={{ projectId: hit.projectId }}
        search={{ document: hit.documentId, comment: hit.commentId }}
        className="text-sm font-semibold text-ink hover:underline"
      >
        {hit.title}
      </Link>
    );
  }
  return (
    <Link
      to="/projects/$projectId/discussions"
      params={{ projectId: hit.projectId }}
      search={{ comment: hit.commentId }}
      className="text-sm font-semibold text-ink hover:underline"
    >
      {hit.title}
    </Link>
  );
}

function SearchPage() {
  const initial = Route.useSearch().q ?? "";
  const { projects, tasks, documents, milestones, threads, comments } = useStore();
  const [q, setQ] = useState(initial);

  const hits = useMemo(
    () =>
      searchAll(
        { projects, tasks, documents, milestones, departments, people, threads, comments },
        q,
      ),
    [projects, tasks, documents, milestones, threads, comments, q],
  );

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Search</h1>

      <label className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
        <SearchIcon aria-hidden className="size-4 shrink-0 text-ink-soft" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Production, work item, drawing, or something someone said"
          aria-label="Search"
          className="min-h-12 w-full bg-transparent text-base text-ink outline-none sm:text-sm"
        />
      </label>

      {q.trim().length < 2 && (
        <p className="mt-6 text-sm text-ink-soft">Type at least two letters.</p>
      )}

      {q.trim().length >= 2 && hits.length === 0 && (
        <p className="surface-card mt-6 p-4 text-sm text-ink-soft">Nothing matches “{q.trim()}”.</p>
      )}

      <div className="mt-6 space-y-4">
        {groups.map((group) => {
          const rows = hits.filter((h) => h.kind === group.kind);
          if (rows.length === 0) return null;
          return (
            <section key={group.kind} className="surface-card overflow-hidden">
              <header className="flex items-center gap-2 panel-header px-4 py-3">
                <group.icon aria-hidden className="size-4 text-ink-soft" />
                <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
                <span className="text-xs text-ink-soft">{rows.length}</span>
              </header>
              <ul className="divide-y divide-border">
                {rows.map((hit) => (
                  <li key={hit.id} className="px-4 py-3">
                    <p className="rule-label">{hit.breadcrumb}</p>
                    <div className="mt-0.5">
                      <HitLink hit={hit} />
                    </div>
                    {hit.kind === "comment" && (
                      <p className="mt-0.5 text-sm text-ink-soft italic">“{hit.excerpt}”</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
