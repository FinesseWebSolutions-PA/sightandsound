import { returnHistory } from "@/lib/return-history";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  parseTourProgress,
  tourKey,
  tourPath,
  tourSession,
  tourSteps,
  TOUR_VERSION,
  type TourProgress,
} from "@/lib/product-tour";

const button =
  "min-h-11 rounded-md border border-border bg-card px-3 text-sm font-medium text-ink hover:bg-cream disabled:opacity-40";
export function ProductTour() {
  const { currentUserId, projects, scenes, documents } = useStore();
  const router = useRouter();
  const [panel, setPanel] = useState<"welcome" | "guide" | "done" | null>(null);
  const [progress, setProgress] = useState<TourProgress | null>(null);
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [highlight, setHighlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [context, setContext] = useState({ project: "", set: "", document: "" });
  const origin = useRef<{ href: string; scroll: number; entry?: typeof router.state.location }>({
    href: "/",
    scroll: 0,
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const initialized = useRef("");
  const generation = useRef(0);
  const list = mode === "quick" ? tourSteps.filter((s) => s.quick) : tourSteps;
  const step = list[index] ?? list[0]!;

  useEffect(() => {
    if (!currentUserId || initialized.current === currentUserId) return;
    initialized.current = currentUserId;
    generation.current++;
    tourSession.active = false;
    let saved: TourProgress | null = null;
    try {
      saved = parseTourProgress(localStorage.getItem(tourKey(currentUserId)));
    } catch {
      setStorageNote("Your browser cannot save tour progress. You can still run the tour.");
    }
    setProgress(saved);
    setPanel(saved ? null : "welcome");
    setBusy(false);
    setError("");
  }, [currentUserId]);
  useEffect(
    () => () => {
      tourSession.active = false;
      generation.current++;
    },
    [],
  );
  const save = (status: TourProgress["status"], chosenMode = mode, id = step.id) => {
    const value: TourProgress = { version: TOUR_VERSION, status, mode: chosenMode, step: id };
    setProgress(value);
    try {
      localStorage.setItem(tourKey(currentUserId), JSON.stringify(value));
    } catch {
      setStorageNote(
        "Progress is kept for this visit only because browser storage is unavailable.",
      );
    }
  };
  const visit = async (nextMode: "quick" | "full", nextIndex: number, ctx = context) => {
    const sequence = ++generation.current;
    const chosen = (nextMode === "quick" ? tourSteps.filter((s) => s.quick) : tourSteps)[nextIndex];
    if (!chosen) return;
    setBusy(true);
    setError("");
    setHighlight(null);
    tourSession.active = true;
    setMode(nextMode);
    setIndex(nextIndex);
    setPanel("guide");
    save("paused", nextMode, chosen.id);
    try {
      await router.navigate({
        href: tourPath(chosen.route, ctx.project, ctx.set, ctx.document),
        replace: true,
      });
    } catch {
      if (sequence === generation.current)
        setError("This page could not open. Retry this step or pause the tour.");
    } finally {
      if (sequence === generation.current) setBusy(false);
    }
  };
  const start = (nextMode: "quick" | "full", id?: string) => {
    origin.current = {
      href: router.state.location.href,
      scroll: window.scrollY,
      entry: router.state.location,
    };
    const url = new URL(window.location.href);
    const requestedProject = url.pathname.match(/^\/projects\/([^/]+)/)?.[1];
    const project =
      projects.find((p) => p.id === requestedProject && p.status !== "closed") ??
      projects.find((p) => p.status !== "closed") ??
      projects[0];
    const set =
      scenes.find((s) => s.project_id === project?.id && s.id === url.searchParams.get("set")) ??
      scenes.find((s) => s.project_id === project?.id);
    const ctx = {
      project: project?.id ?? "",
      set: set?.id ?? "",
      document:
        documents.find((d) => d.project_id === project?.id && d.scene_id === set?.id)?.id ?? "",
    };
    setContext(ctx);
    const steps = nextMode === "quick" ? tourSteps.filter((s) => s.quick) : tourSteps;
    void visit(
      nextMode,
      Math.max(
        0,
        steps.findIndex((s) => s.id === id),
      ),
      ctx,
    );
  };
  const leave = async (complete = false) => {
    if (busy) return;
    if (panel !== "guide") {
      if (!progress) save("dismissed");
      setPanel(null);
      return;
    }
    save(complete ? "completed" : "paused");
    setBusy(true);
    setError("");
    try {
      await router.navigate({ href: origin.current.href, replace: true, resetScroll: false });
      if (origin.current.entry)
        returnHistory.restoreAfterTour(origin.current.entry, router.state.location);
      window.scrollTo({ top: origin.current.scroll, behavior: "instant" });
      setPanel(complete ? "done" : null);
    } catch {
      setError("Could not return to your starting page. You can close the tour here.");
      setPanel(complete ? "done" : null);
    } finally {
      tourSession.active = false;
      setBusy(false);
      setHighlight(null);
    }
  };
  useEffect(() => {
    if (panel !== "guide" || busy) {
      setHighlight(null);
      return;
    }
    heading.current?.focus();
    let scrolled = false;
    const measure = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(step.target));
      const target = candidates.find(
        (el) => el.getBoundingClientRect().width > 0 && !el.closest("[data-product-tour]"),
      );
      if (!target) {
        setHighlight(null);
        return;
      }
      const targetTop = target.getBoundingClientRect().top;
      if (!scrolled || targetTop > window.innerHeight * 0.4 || targetTop < -20) {
        const top = targetTop + window.scrollY - 100;
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        scrolled = true;
      }
      const r = target.getBoundingClientRect();
      setHighlight({
        top: Math.max(8, r.top - 5),
        left: Math.max(8, r.left - 5),
        width: Math.min(r.width + 10, window.innerWidth - 16),
        height: Math.min(r.height + 10, Math.max(40, window.innerHeight * 0.4)),
      });
    };
    measure();
    const timer = window.setInterval(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [panel, busy, step]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPanel("welcome")}
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-bar-foreground hover:bg-bar-foreground/10 md:ml-0"
        aria-label="Help & tour"
      >
        <BookOpen aria-hidden className="size-4" />
        <span>Help & tour</span>
      </button>
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open && !busy) void leave();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/35" />
          {panel === "guide" && highlight && (
            <div
              aria-hidden
              style={highlight}
              className="pointer-events-none fixed z-[91] rounded-md border-2 border-gold bg-transparent shadow-[0_0_0_3px_rgba(255,255,255,0.8)]"
            />
          )}
          <Dialog.Content
            key={panel === "guide" ? `${step.id}:${busy}` : panel}
            data-product-tour
            className={
              panel === "guide"
                ? "fixed inset-x-3 bottom-3 z-[92] max-h-[52dvh] overflow-y-auto rounded-xl border border-border bg-card p-5 text-ink shadow-2xl sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] sm:max-h-[70dvh]"
                : "fixed top-1/2 left-1/2 z-[92] max-h-[88dvh] w-[calc(100%_-_24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 text-ink shadow-2xl"
            }
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              if (!busy) void leave();
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold-deep">
                  {panel === "guide"
                    ? `${step.topic} · ${index + 1} of ${list.length}`
                    : "Sight & Sound guide"}
                </p>
                <Dialog.Title
                  ref={heading}
                  tabIndex={-1}
                  className="font-display text-2xl outline-none"
                >
                  {panel === "guide"
                    ? step.title
                    : panel === "done"
                      ? "You’re ready to explore"
                      : "Welcome to your production workspace"}
                </Dialog.Title>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void leave()}
                aria-label={panel === "guide" ? "Pause and close tour" : "Close tour"}
                className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-cream"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <Dialog.Description className="text-sm text-ink-soft">
              {panel === "guide"
                ? step.body
                : panel === "done"
                  ? "Use Help & tour any time to revisit a topic or restart. You’re back where you started."
                  : "Learn where to find work, conversations, drawings and approvals. The guide visits the real screens without sending messages, marking conversations read or changing your work."}
            </Dialog.Description>
            {panel === "guide" ? (
              <>
                <progress
                  style={{ accentColor: "var(--color-gold-deep, #8c6228)" }}
                  aria-label="Tour progress"
                  className="mt-4 h-1.5 w-full accent-gold-deep"
                  max={list.length}
                  value={index + 1}
                />
                <ul className="my-4 list-disc space-y-2 pl-5 text-sm">
                  {step.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {step.route === "file" && !context.document && (
                  <p className="mb-3 rounded border border-border p-2 text-sm">
                    This set has no uploaded file yet. Open any file here later to see its versions
                    and approval controls.
                  </p>
                )}
                {!context.set &&
                  !["home", "productions", "search", "people"].includes(step.route) && (
                    <p className="mb-3 rounded border border-border p-2 text-sm">
                      No set is available yet. These features appear after a production has a set.
                    </p>
                  )}
                {busy && (
                  <p role="status" className="mb-2 text-sm">
                    Opening this area…
                  </p>
                )}
                {error && (
                  <p role="alert" className="mb-2 text-sm text-danger">
                    {error}{" "}
                    <button className="underline" onClick={() => void visit(mode, index)}>
                      Retry
                    </button>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy || index === 0}
                    onClick={() => void visit(mode, index - 1)}
                  >
                    <ArrowLeft aria-hidden className="mr-1 inline size-4" />
                    Back
                  </button>
                  <button
                    className="ml-auto min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-cream-soft disabled:opacity-40"
                    disabled={busy || !!error}
                    onClick={() =>
                      index === list.length - 1 ? void leave(true) : void visit(mode, index + 1)
                    }
                  >
                    {index === list.length - 1 ? "Finish tour" : "Next"}
                    <ArrowRight aria-hidden className="ml-1 inline size-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    disabled={busy}
                    className="min-h-11 text-sm underline text-ink-soft"
                    onClick={() => void leave()}
                  >
                    Pause tour
                  </button>
                  <label className="text-xs text-ink-soft">
                    Jump to{" "}
                    <select
                      aria-label="Jump to tour step"
                      className="ml-1 min-h-11 max-w-[220px] rounded border border-border bg-card px-2 text-sm text-ink"
                      value={index}
                      disabled={busy}
                      onChange={(e) => void visit(mode, Number(e.target.value))}
                    >
                      {list.map((s, i) => (
                        <option key={s.id} value={i}>
                          {i + 1}. {s.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <>
                {progress?.status === "paused" && panel !== "done" && (
                  <button
                    className="mt-5 min-h-11 w-full rounded-md bg-ink px-4 text-sm font-semibold text-cream-soft"
                    onClick={() => start(progress.mode, progress.step)}
                  >
                    Resume: {tourSteps.find((s) => s.id === progress.step)?.title}
                  </button>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button className={button + " py-3"} onClick={() => start("quick")}>
                    <span className="block font-semibold">Quick start</span>
                    <span className="mt-1 block text-xs text-ink-soft">
                      8 steps · About 3 minutes
                    </span>
                  </button>
                  <button className={button + " py-3"} onClick={() => start("full")}>
                    <span className="block font-semibold">Full walkthrough</span>
                    <span className="mt-1 block text-xs text-ink-soft">
                      19 steps · About 8 minutes
                    </span>
                  </button>
                </div>
                <h3 className="mt-5 mb-2 text-sm font-semibold">Explore a topic</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tourSteps
                    .filter((s, i, a) => a.findIndex((x) => x.topic === s.topic) === i)
                    .map((s) => (
                      <button key={s.id} className={button} onClick={() => start("full", s.id)}>
                        {s.topic}
                        <ArrowRight aria-hidden className="ml-1 inline size-3" />
                      </button>
                    ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <button
                    className="min-h-11 text-sm underline text-ink-soft"
                    onClick={() => void leave()}
                  >
                    {panel === "done" ? "Close guide" : "I’ll explore on my own"}
                  </button>
                  <button
                    className="min-h-11 text-sm underline text-ink-soft"
                    onClick={() => {
                      try {
                        localStorage.removeItem(tourKey(currentUserId));
                      } catch {
                        setStorageNote("Browser storage is unavailable.");
                      }
                      setProgress(null);
                      setPanel("welcome");
                      setMode("quick");
                      setIndex(0);
                    }}
                  >
                    <RotateCcw aria-hidden className="mr-1 inline size-3" />
                    Reset tour progress
                  </button>
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  Tour progress is saved for this person on this browser. Reset affects only the
                  tour, not files or work.
                </p>
              </>
            )}
            {storageNote && (
              <p role="status" className="mt-3 text-xs text-ink-soft">
                {storageNote}
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
