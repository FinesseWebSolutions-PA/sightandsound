// Temporarily paused. Re-enable without clearing anyone’s saved tour progress.
export const PRODUCT_TOUR_ENABLED = false;
export const TOUR_VERSION = 1;
export type TourRoute =
  | "home"
  | "productions"
  | "overview"
  | "tasks"
  | "conversation"
  | "documents"
  | "updates"
  | "planning"
  | "schedule"
  | "team"
  | "search"
  | "people"
  | "file";
export type TourStep = {
  id: string;
  topic: string;
  title: string;
  body: string;
  points: string[];
  route: TourRoute;
  target: string;
  quick?: boolean;
};
export const tourSteps: TourStep[] = [
  {
    id: "home",
    topic: "Getting around",
    title: "Start with what needs you",
    route: "home",
    target: '[data-tour="my-work"]',
    quick: true,
    body: "My Work brings your tasks, review requests and mentions together across productions.",
    points: [
      "Use Tasks, Approvals or Mentions to narrow the list.",
      "Reading or dismissing an update does not complete its task.",
    ],
  },
  {
    id: "productions",
    topic: "Getting around",
    title: "A production contains its sets",
    route: "productions",
    target: '[data-tour="productions"]',
    quick: true,
    body: "Open a production to find the sets being designed and built for that show.",
    points: [
      "The set is the everyday workspace for the people doing the work.",
      "You can return to older productions to find their records.",
    ],
  },
  {
    id: "overview",
    topic: "Your set",
    title: "Understand where a set stands",
    route: "overview",
    target: '[data-tour="set-tabs"]',
    quick: true,
    body: "Overview brings together blockers, responsibility, reviews and recent decisions for the selected set.",
    points: [
      "Use the set picker to move between sets in the same production.",
      "Tasks, Conversations and Files stay one tab away. More holds planning, updates, schedule and team.",
    ],
  },
  {
    id: "team",
    topic: "Your set",
    title: "Know who does the work",
    route: "team",
    target: '[data-tour="set-tabs"]',
    body: "A set has named contributors from its departments. Department heads provide oversight.",
    points: [
      "A department contact is not automatically the person doing that set’s work.",
      "Assignments and responsibility acknowledgements help make the handoff clear.",
    ],
  },
  {
    id: "tasks",
    topic: "Your set",
    title: "Follow tasks and blockers",
    route: "tasks",
    target: '[data-tour="set-tabs"]',
    quick: true,
    body: "Every task belongs to a set. Tasks groups all of the set’s work by stage, with independent tasks alongside it.",
    points: [
      "Stages can overlap. Expand a stage, filter by department or status, and open a task for its owner, subtasks and prerequisites.",
      "Task completion and message read status are separate. Editing controls depend on your role.",
    ],
  },
  {
    id: "chat",
    topic: "Conversations",
    title: "Start a natural conversation",
    route: "conversation",
    target: '[data-tour="set-tabs"]',
    quick: true,
    body: "The main set conversation is ready for a question, photo or update. Named topics are available when a subject needs its own thread.",
    points: [
      "Reply in context so others can follow the discussion.",
      "Emoji, attachments and pasted screenshots work in the composer. The tour never sends a message.",
    ],
  },
  {
    id: "mentions",
    topic: "Conversations",
    title: "Bring the right people into the loop",
    route: "conversation",
    target: '[data-tour="set-tabs"]',
    body: "Type @ to choose a person or department. Department mentions use the people responsible for this set and its oversight contacts.",
    points: [
      "Check the recipient preview before sending a department mention.",
      "Follow or mute ordinary replies; direct mentions still reach you.",
    ],
  },
  {
    id: "edits",
    topic: "Conversations",
    title: "Correct a message within two hours",
    route: "conversation",
    target: '[data-tour="set-tabs"]',
    body: "You can edit your own message for two hours after it was originally sent. Edit history keeps the changes traceable.",
    points: [
      "After the window closes, add a reply with the correction.",
      "An emoji reaction or a read marker is not a document approval.",
    ],
  },
  {
    id: "files",
    topic: "Files & approval",
    title: "Find files in familiar folders",
    route: "documents",
    target: '[aria-label="Document library"]',
    quick: true,
    body: "Files organizes the set’s documents into folders, with search, recent files, stars and trash.",
    points: [
      "Use New to upload files or create a folder. Check the upload destination.",
      "Filter by department, type or approval status. Trashing a file offers Undo.",
    ],
  },
  {
    id: "versions",
    topic: "Files & approval",
    title: "Latest and approved are different",
    route: "file",
    target: '[aria-label="File version"]',
    body: "A file keeps its version history. Uploading a new revision does not automatically approve it.",
    points: [
      "Check the version number and approval status before using a drawing.",
      "Open approved files at their exact revision. An older approval is labelled when a newer revision exists.",
    ],
  },
  {
    id: "approval",
    topic: "Files & approval",
    title: "Approve the exact upload",
    route: "file",
    target: '[data-tour="file-review"]',
    quick: true,
    body: "For now, any active person—including viewers—can approve the latest upload in an open production.",
    points: [
      "Open a file and choose Approve v…; the actual approver and version are recorded.",
      "A reviewer assignment is optional for approval. You can still request a named reviewer and due date.",
      "Older revisions and closed productions stay read-only. This tour records no approvals.",
    ],
  },
  {
    id: "return",
    topic: "Files & approval",
    title: "Return to where you came from",
    route: "file",
    target: '[aria-label="Close file"]',
    body: "When you follow a file link from another screen, closing the file follows your in-app click history back to that screen.",
    points: [
      "A file opened from set Overview returns to that Overview.",
      "A link opened directly uses Files as its fallback. Copy a file link when sharing a specific revision.",
    ],
  },
  {
    id: "instructions",
    topic: "Files & approval",
    title: "Keep instructions with the set",
    route: "overview",
    target: '[aria-label="Set instructions"]',
    body: "Set instructions links operating manuals, assembly/load-in notes and shipping/packing files already in the library.",
    points: [
      "Approval labels tell you whether an instruction revision is approved for use.",
      "Removing an instruction shortcut does not delete the original file.",
    ],
  },
  {
    id: "decisions",
    topic: "Planning & handoff",
    title: "Separate discussion from decisions",
    route: "updates",
    target: '[data-tour="set-tabs"]',
    body: "Updates & decisions keeps important outcomes and follow-up work easy to find after the conversation moves on.",
    points: [
      "Record the agreed decision with its owner and related file when needed.",
      "Use important updates and acknowledgements for consequential changes, not every ordinary reply.",
    ],
  },
  {
    id: "planning",
    topic: "Planning & handoff",
    title: "Propose a schedule change",
    route: "planning",
    target: '[data-tour="set-tabs"]',
    body: "Planning & capacity holds schedule-change requests and their downstream impact.",
    points: [
      "The named timeline owner reviews proposed changes. A proposal is not an approved schedule change.",
      "Capacity lanes and outsourcing help expose competing demands on the same crew or space.",
    ],
  },
  {
    id: "schedule",
    topic: "Planning & handoff",
    title: "Read the dates in context",
    route: "schedule",
    target: '[data-tour="stage-timeline"]',
    body: "Stages & tasks shows overlapping work across sets. Group by department to see that team’s work, or expand a stage to see its tasks.",
    points: [
      "Stage order creates no dependency. Check each task’s prerequisites; whole-set commitments remain in Set dates.",
      "Timeline editing follows role controls. Discuss date changes with the timeline owner.",
    ],
  },
  {
    id: "search",
    topic: "Find & follow up",
    title: "Find information across the app",
    route: "search",
    target: '[data-tour="search"]',
    quick: true,
    body: "Search finds productions, sets, tasks, files and what people said.",
    points: [
      "Type at least two characters, then narrow by result type or production.",
      "Results link to the relevant record so you can check the original context.",
    ],
  },
  {
    id: "notifications",
    topic: "Find & follow up",
    title: "Choose how to stay informed",
    route: "home",
    target: '[data-tour="notifications"]',
    body: "Notification settings live in My Work. Use them to choose desktop alerts and quiet hours.",
    points: [
      "Desktop alerts need browser permission and work while the app is open; email delivery is not enabled.",
      "Snooze or dismiss updates without completing the underlying work. You can revisit those updates later.",
    ],
  },
  {
    id: "people",
    topic: "Find & follow up",
    title: "Find people and understand access",
    route: "people",
    target: "main",
    body: "People helps you find colleagues and department contacts. The current prototype uses demo identities and role controls.",
    points: [
      "Switching a demo role changes the controls you see; it is not individual verified sign-in.",
      "Viewer approval is a temporary exception. It does not grant other editing permissions.",
    ],
  },
];
export type TourProgress = {
  version: number;
  status: "dismissed" | "paused" | "completed";
  mode: "quick" | "full";
  step: string;
};
export const tourKey = (person: string) => `ss-product-tour:${TOUR_VERSION}:${person}`;
export function parseTourProgress(raw: string | null): TourProgress | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value &&
      value.version === TOUR_VERSION &&
      ["dismissed", "paused", "completed"].includes(value.status) &&
      ["quick", "full"].includes(value.mode) &&
      tourSteps.some((s) => s.id === value.step)
      ? (value as TourProgress)
      : null;
  } catch {
    return null;
  }
}
export function tourPath(
  route: TourRoute,
  projectId?: string,
  setId?: string,
  documentId?: string,
) {
  if (route === "home") return "/";
  if (route === "productions") return "/productions";
  if (route === "search") return "/search";
  if (route === "people") return "/team";
  if (!projectId || !setId) return "/productions";
  if (route === "file" && documentId)
    return `/projects/${encodeURIComponent(projectId)}/documents?document=${encodeURIComponent(documentId)}`;
  const section = route === "file" ? "documents" : route;
  return `/projects/${encodeURIComponent(projectId)}/sets?set=${encodeURIComponent(setId)}&section=${section}`;
}
// Prevent passive conversation read receipts while the guide visits a screen.
export const tourSession = { active: false };
