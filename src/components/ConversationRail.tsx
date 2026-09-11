import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  ListChecks,
  MessageSquare,
  MessageSquarePlus,
  Layers,
  X,
} from "lucide-react";

import { ConversationView, NewProjectConversation, SetChatStart } from "@/components/Discussion";
import { personById, useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/status";
import { groupThreadsBySet, snippet, type ThreadRow } from "@/lib/threads";
import { lastRead } from "@/lib/conversation-read";
import { cn } from "@/lib/utils";

const kindIcon = {
  project: MessageSquare,
  scene: Layers,
  task: ListChecks,
  document: FileText,
} as const;

/**
 * The conversation space used both by a production's Updates tab and by a single
 * set: the list of conversations on the left, the open one on the right. Sets are
 * the sections, so the talk about the build reads set by set.
 */
export function ConversationRail({
  projectId,
  sceneId,
  highlightCommentId,
  listTitle = "Conversations",
}: {
  projectId: string;
  /** When given, only this set's conversations are shown and new ones join it. */
  sceneId?: string;
  highlightCommentId?: string;
  listTitle?: string;
}) {
  const { threads, comments, tasks, documents, scenes, can, isClosed } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [picked, setPicked] = useState<string | null>(sceneId ? "__general__" : null);
  const general = threads.find((t) => t.scene_id === sceneId && t.is_general);
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});

  const projectScenes = useMemo(
    () => scenes.filter((s) => s.project_id === projectId),
    [scenes, projectId],
  );

  const sections = useMemo(
    () =>
      groupThreadsBySet({
        projectId,
        threads,
        comments,
        tasks: tasks.filter((t) => t.project_id === projectId),
        documents: documents.filter((d) => d.project_id === projectId),
        scenes: projectScenes,
      }).filter((s) => (sceneId ? s.sceneId === sceneId : true)),
    [projectId, threads, comments, tasks, documents, projectScenes, sceneId],
  );

  const allRows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);
  const fromLink = highlightCommentId
    ? comments.find((c) => c.id === highlightCommentId)?.thread_id
    : undefined;
  const linkedHere = fromLink && allRows.some((r) => r.id === fromLink) ? fromLink : undefined;
  const activeId =
    picked === "__general__"
      ? (general?.id ?? "__general__")
      : (picked ?? linkedHere ?? allRows[0]?.id ?? null);

  const locked = isClosed(projectId);
  const canStart = can.comment && !locked;

  return (
    <div className="space-y-3">
      {locked && (
        <p className="surface-card p-3 text-sm text-ink-soft">
          This production is closed and archived — conversation stays readable, but nothing new can
          be posted.
        </p>
      )}

      {showNew && canStart && (
        <div className="space-y-2">
          <NewProjectConversation
            projectId={projectId}
            {...(sceneId ? { sceneId } : {})}
            onCreated={() => {
              setShowNew(false);
              // The fresh conversation is the newest one, so let the list land on it.
              setPicked(null);
            }}
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "surface-card flex min-w-0 flex-col overflow-hidden",
            activeId && picked ? "hidden md:flex" : "flex",
          )}
        >
          <header className="panel-header flex items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-sm font-semibold text-ink">{listTitle}</h2>
            {canStart && (
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
              >
                {showNew ? (
                  <X aria-hidden className="size-4" />
                ) : (
                  <MessageSquarePlus aria-hidden className="size-4" />
                )}
                {showNew ? "Cancel" : "New topic"}
              </button>
            )}
          </header>

          <div className="max-h-[32rem] overflow-y-auto">
            {sceneId && (
              <button
                className="min-h-12 w-full border-b px-3 text-left text-sm font-semibold"
                aria-current={picked === "__general__" ? "page" : undefined}
                onClick={() => setPicked("__general__")}
              >
                Main conversation
              </button>
            )}
            {sections.length === 0 && !sceneId && (
              <p className="px-3 py-4 text-sm text-ink-soft">
                No conversations here yet.
                {canStart ? " Start one to bring the right departments in." : ""}
              </p>
            )}
            {sections.map((section) => {
              const isClosedSection = closedSections[section.key] === true;
              return (
                <section key={section.key}>
                  {/* Inside one set the list is already that set's, so its name is not repeated. */}
                  {!sceneId && (
                    <div className="group-header flex items-center gap-1.5 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setClosedSections((prev) => ({
                            ...prev,
                            [section.key]: !isClosedSection,
                          }))
                        }
                        aria-expanded={!isClosedSection}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold text-ink-soft"
                      >
                        {isClosedSection ? (
                          <ChevronRight aria-hidden className="size-3.5 shrink-0" />
                        ) : (
                          <ChevronDown aria-hidden className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{section.title}</span>
                        <span className="shrink-0">({section.rows.length})</span>
                      </button>
                      {section.sceneId && !sceneId && (
                        <Link
                          to="/projects/$projectId/sets"
                          params={{ projectId }}
                          search={{ set: section.sceneId }}
                          className="shrink-0 text-[0.6875rem] font-medium text-gold-deep underline"
                        >
                          Open set
                        </Link>
                      )}
                    </div>
                  )}
                  {(!isClosedSection || sceneId) && (
                    <ul className="row-list">
                      {section.rows
                        .filter((row) => row.id !== general?.id)
                        .map((row) => (
                          <li key={row.id}>
                            <RailRow
                              row={row}
                              active={row.id === activeId}
                              onPick={() => setPicked(row.id)}
                            />
                          </li>
                        ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </aside>

        <div className={cn("min-w-0 space-y-2", activeId && picked ? "block" : "hidden md:block")}>
          {picked && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream md:hidden"
            >
              <ArrowLeft aria-hidden className="size-4" />
              All conversations
            </button>
          )}
          {activeId === "__general__" && sceneId ? (
            <SetChatStart projectId={projectId} sceneId={sceneId} />
          ) : activeId ? (
            <ConversationView
              projectId={projectId}
              threadId={activeId}
              {...(highlightCommentId && (picked ?? linkedHere) === linkedHere
                ? { highlightCommentId }
                : {})}
            />
          ) : (
            <p className="surface-card p-4 text-sm text-ink-soft">
              Nothing here yet.
              {canStart ? " Start a conversation to bring the right departments in." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RailRow({ row, active, onPick }: { row: ThreadRow; active: boolean; onPick: () => void }) {
  const Icon = kindIcon[row.kind];
  const { currentUserId, comments } = useStore();
  const [, redraw] = useState(0);
  useEffect(() => {
    const refresh = () => redraw((n) => n + 1);
    window.addEventListener("conversation-read", refresh);
    return () => window.removeEventListener("conversation-read", refresh);
  }, []);
  const unread = comments.filter(
    (c) =>
      c.thread_id === row.id &&
      c.author_id !== currentUserId &&
      c.created_at > lastRead(currentUserId, row.id),
  ).length;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block w-full px-3 py-2.5 text-left transition-colors",
        active ? "bg-cream" : "hover:bg-cream/70",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <Icon aria-hidden className="size-3.5 shrink-0 translate-y-0.5 text-ink-soft" />
          <span className="truncate text-sm font-semibold text-ink">{row.name}</span>
        </span>
        <span className="shrink-0 text-[0.6875rem] text-ink-soft">
          {unread > 0 ? `${unread} unread` : `${row.count} msg`}
        </span>
      </span>
      {row.name !== row.context && (
        <span className="mt-0.5 block truncate text-[0.6875rem] text-ink-soft">{row.context}</span>
      )}
      <span className="mt-0.5 block truncate text-xs text-ink-soft">
        {row.latest
          ? `${personById(row.latest.author_id)?.full_name ?? "A team member"}: ${snippet(row.latest.body, 60)}`
          : "No messages yet"}
      </span>
      <span className="mt-0.5 block text-[0.6875rem] text-ink-soft">{formatDateTime(row.at)}</span>
    </button>
  );
}
