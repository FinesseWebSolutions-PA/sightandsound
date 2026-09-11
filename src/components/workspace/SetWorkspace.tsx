import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { departments, people, personById, projectDepartments, useStore } from "@/lib/store";
import type { Scene, ReschedulePreviewRow } from "@/lib/production-data";
import { loadWorkspace, workspaceAction, type ScheduleRequest } from "@/lib/workspace-data";
import { capacityConflicts } from "@/lib/workspace-rules";
import { SetUpdateComposer, field, button } from "./SetUpdateComposer";
import { formatDate, formatDateTime } from "@/lib/status";
type Data = Awaited<ReturnType<typeof loadWorkspace>>;
export function SetWorkspace({
  set,
  view,
}: {
  set: Scene;
  view: "overview" | "updates" | "planning";
}) {
  const store = useStore();
  const {
    tasks,
    documents,
    approvals,
    documentVersions,
    projectAssignments,
    projects,
    currentUserId,
    libraryAction,
    isClosed,
    can,
    previewReschedule,
  } = store;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyDecisions, setOnlyDecisions] = useState(false);
  const generation = useRef({ sequence: 0 });
  const refresh = useCallback(async () => {
    const g = ++generation.current.sequence;
    try {
      const next = await loadWorkspace(set.project_id, set.id);
      if (g === generation.current.sequence) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (g === generation.current.sequence)
        setError(e instanceof Error ? e.message : "Could not load workspace");
    }
  }, [set.project_id, set.id]);
  useEffect(() => {
    void refresh();
    const counter = generation.current;
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      counter.sequence++;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const act = async (action: string, payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const ok = await libraryAction(set.project_id, () =>
        workspaceAction(
          action,
          { scene_id: set.id, project_id: set.project_id, ...payload },
          currentUserId,
        ),
      );
      if (ok) await refresh();
      return ok;
    } finally {
      setBusy(false);
    }
  };
  const readOnly = isClosed(set.project_id) || !can.updateWork;
  const project = projects.find((p) => p.id === set.project_id);
  const manager = data?.manager || project?.owner_id;
  const setTasks = tasks.filter((t) => t.scene_id === set.id);
  const setDocs = documents.filter((d) => d.scene_id === set.id);
  const staff = projectAssignments.filter((a) => a.scene_id === set.id);
  const automatic =
    staff.some((a) => a.person_id === currentUserId) ||
    set.owner_id === currentUserId ||
    setTasks.some((t) => t.assignee_id === currentUserId);
  const explicit = data?.followers.some((f) => f.person_id === currentUserId);
  const name = (id: string | null | undefined) => personById(id ?? "")?.full_name ?? "Unassigned";
  const involved = departments.filter(
    (d) =>
      staff.some((a) => a.department_id === d.id) || setTasks.some((t) => t.department_id === d.id),
  );
  const [requestTask, setRequestTask] = useState("");
  const [start, setStart] = useState("");
  const [finish, setFinish] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<ScheduleRequest | null>(null);
  const [impact, setImpact] = useState<ReschedulePreviewRow[] | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [allocationTask, setAllocationTask] = useState("");
  const [lane, setLane] = useState("");
  const [mode, setMode] = useState("in_house");
  const [vendor, setVendor] = useState("");
  const [capacityOwner, setCapacityOwner] = useState(currentUserId);
  const [capacityStart, setCapacityStart] = useState("");
  const [capacityFinish, setCapacityFinish] = useState("");
  const [department, setDepartment] = useState("");
  if (!data)
    return (
      <div className="surface-card p-4" role="status">
        {error || "Loading set workspace…"}
        {error && (
          <button onClick={() => void refresh()} className={button}>
            Retry
          </button>
        )}
      </div>
    );
  const openRequests = data.requests.filter(
    (r) => setTasks.some((t) => t.id === r.task_id) && r.status === "pending",
  );
  const updates = data.updates.filter(
    (u) =>
      (!onlyDecisions || u.kind === "decision") &&
      (u.body + " " + u.source_snapshot + " " + name(u.owner_id))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const allocations = data.capacity.filter((a) =>
    tasks.some((t) => t.id === a.task_id && t.status !== "complete"),
  );
  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="surface-card p-3 text-danger">
          {error}
          <button className={button} onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <div>
          <p className="text-sm font-medium">
            {automatic
              ? "Following automatically as a set member"
              : explicit
                ? "You are following this set"
                : "Follow important updates and decisions"}
          </p>
          <p className="text-xs text-ink-soft">
            {data.recipients.length} people receive important updates. Ordinary chat stays
            conversational.
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {!automatic && (
              <button
                className={button}
                disabled={busy}
                onClick={() => void act(explicit ? "unfollow" : "follow", {})}
              >
                {explicit ? "Unfollow" : "Follow set"}
              </button>
            )}
            <button className="btn-primary px-3 py-2" onClick={() => setPosting(true)}>
              Post important update
            </button>
          </div>
        )}
      </div>
      {view === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              title="Work completed"
              value={`${setTasks.filter((t) => t.status === "complete").length} / ${setTasks.length}`}
            />
            <Metric
              title="Blocked work"
              value={String(setTasks.filter((t) => t.status === "blocked").length)}
            />
            <Metric
              title="Awaiting approval"
              value={String(setDocs.filter((d) => d.approval_state === "in_review").length)}
            />
          </div>
          <section className="surface-card p-4">
            <h3 className="font-semibold">Where this set stands</h3>
            <p className="mt-2 text-sm">
              {set.status.replaceAll("_", " ")} · Planned finish {formatDate(set.due_date)} ·
              Forecast {formatDate(set.forecast_finish)}
            </p>
            {setTasks
              .filter(
                (t) =>
                  t.status === "in_progress" || t.status === "blocked" || t.status === "in_review",
              )
              .map((t) => (
                <p className="mt-2 text-sm" key={t.id}>
                  <WorkLink projectId={set.project_id} id={t.id}>
                    {t.title}
                  </WorkLink>{" "}
                  · {t.status.replaceAll("_", " ")} · {name(t.assignee_id)}
                </p>
              ))}
            {!setTasks.length && (
              <p className="mt-2 text-sm text-ink-soft">
                Add work items to show progress and blockers.
              </p>
            )}
          </section>
          <section className="surface-card p-4">
            <h3 className="font-semibold">Responsibility and oversight</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Set assignments identify who does the work. Department contacts provide oversight.
            </p>
            {involved.map((d) => {
              const assigned = staff.filter((a) => a.department_id === d.id);
              const head =
                projectDepartments.find(
                  (p) => p.project_id === set.project_id && p.department_id === d.id,
                )?.head_id || d.owner_id;
              return (
                <div key={d.id} className="mt-3 border-t pt-3 text-sm">
                  <strong>{d.name}</strong>
                  {assigned.length ? (
                    assigned.map((a) => (
                      <div key={a.id} className="mt-1 flex flex-wrap items-center gap-2">
                        <span>
                          {name(a.person_id)} · {a.job_title || "Set contributor"} ·{" "}
                          {a.accepted_at ? "Responsibility accepted" : "Awaiting acceptance"}
                        </span>
                        {!readOnly && !a.accepted_at && a.person_id === currentUserId && (
                          <button
                            className={button}
                            disabled={busy}
                            onClick={() => void act("accept_responsibility", { id: a.id })}
                          >
                            Accept responsibility
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No responsible person assigned to this set.</p>
                  )}
                  <p className="mt-1 text-xs text-ink-soft">Department oversight: {name(head)}</p>
                </div>
              );
            })}
            {!involved.length && (
              <p className="mt-2 text-sm">Assign the set team in the Team tab.</p>
            )}
          </section>
          <section className="surface-card p-4">
            <h3 className="font-semibold">Upcoming dates and review owners</h3>
            {setTasks
              .filter((t) => t.status !== "complete" && t.due_date)
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .slice(0, 5)
              .map((t) => (
                <p className="mt-2 text-sm" key={t.id}>
                  {formatDate(t.due_date)} ·{" "}
                  <WorkLink projectId={set.project_id} id={t.id}>
                    {t.title}
                  </WorkLink>
                </p>
              ))}
            {setDocs
              .filter((d) => d.approval_state === "in_review")
              .map((d) => {
                const a = approvals
                  .filter((a) => a.document_id === d.id && a.version === d.current_version)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                return (
                  <p className="mt-2 text-sm" key={d.id}>
                    <FileLink projectId={set.project_id} id={d.id}>
                      {d.title} · v{d.current_version}
                    </FileLink>{" "}
                    · Reviewer: {name(a?.reviewer_id)}
                  </p>
                );
              })}
            <p className="mt-3 text-xs text-ink-soft">
              {openRequests.length} schedule requests awaiting {name(manager)}.
            </p>
          </section>
          <section className="surface-card p-4">
            <h3 className="font-semibold">Recent decisions</h3>
            {data.updates
              .filter((u) => u.kind === "decision")
              .slice(0, 3)
              .map((u) => (
                <p key={u.id} className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {u.body}
                  <span className="block text-xs text-ink-soft">
                    {name(u.owner_id)} · {formatDateTime(u.created_at)}
                  </span>
                </p>
              ))}
            {!data.updates.some((u) => u.kind === "decision") && (
              <p className="mt-2 text-sm text-ink-soft">
                Record a decision from a conversation or post one here.
              </p>
            )}
          </section>
          {(set.status === "complete" || isClosed(set.project_id)) && (
            <section className="surface-card p-4">
              <h3 className="font-semibold">Set handover record</h3>
              <p className="text-sm">
                Files, versions, decisions, and conversations stay available here.
              </p>
              <p className="mt-2 text-sm">
                {
                  setDocs.filter((d) => d.requires_approval && d.approval_state !== "approved")
                    .length
                }{" "}
                required files still lack current approval ·{" "}
                {
                  data.updates.filter(
                    (u) =>
                      u.needs_ack &&
                      data.receipts.some((r) => r.update_id === u.id && !r.acknowledged_at),
                  ).length
                }{" "}
                updates still need acknowledgement.
              </p>
            </section>
          )}
        </>
      )}
      {view === "updates" && (
        <section className="surface-card p-4">
          <h3 className="font-semibold">Important updates and decisions</h3>
          <div className="my-3 flex flex-wrap gap-3">
            <input
              aria-label="Search decisions and updates"
              placeholder="Search decisions and updates"
              className={field}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="text-sm">
              <input
                type="checkbox"
                checked={onlyDecisions}
                onChange={(e) => setOnlyDecisions(e.target.checked)}
              />{" "}
              Decisions only
            </label>
          </div>
          {updates.length ? (
            updates.map((u) => {
              const receipts = data.receipts.filter((r) => r.update_id === u.id);
              const mine = receipts.find((r) => r.person_id === currentUserId);
              const version = documentVersions.find((v) => v.id === u.document_version_id);
              const doc = documents.find((d) => d.id === version?.document_id);
              return (
                <article key={u.id} className="space-y-2 border-t py-4">
                  <p className="text-xs font-semibold uppercase text-ink-soft">
                    {u.kind === "decision" ? "Recorded decision" : "Important update"} ·{" "}
                    {formatDateTime(u.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{u.body}</p>
                  <p className="text-xs">
                    Responsible: {name(u.owner_id)} · Recorded by {name(u.created_by)}
                  </p>
                  {u.source_comment_id && (
                    <details className="text-xs">
                      <summary>Original message at the time of this decision</summary>
                      <p className="mt-2 whitespace-pre-wrap break-words">{u.source_snapshot}</p>
                      <Link
                        to="/projects/$projectId/discussions"
                        params={{ projectId: set.project_id }}
                        search={{ comment: u.source_comment_id }}
                        className="underline"
                      >
                        Open conversation
                      </Link>
                    </details>
                  )}
                  {version && doc && (
                    <p className="text-xs">
                      <FileLink projectId={set.project_id} id={doc.id} versionId={version.id}>
                        {doc.title} · recorded against v{version.version}
                        {version.version !== doc.current_version ? " (a newer version exists)" : ""}
                      </FileLink>
                    </p>
                  )}
                  {u.task_id && (
                    <p className="text-xs">
                      Follow-up:{" "}
                      <WorkLink projectId={set.project_id} id={u.task_id}>
                        {tasks.find((t) => t.id === u.task_id)?.title || "Work item"}
                      </WorkLink>
                    </p>
                  )}
                  <details className="text-xs">
                    <summary>
                      {u.needs_ack
                        ? `${receipts.filter((r) => r.acknowledged_at).length} / ${receipts.length} acknowledged`
                        : `${receipts.length} people notified`}
                    </summary>
                    {receipts.map((r) => (
                      <p className="mt-1" key={r.person_id}>
                        {name(r.person_id)}
                        {u.needs_ack
                          ? ` · ${r.acknowledged_at ? "Acknowledged " + formatDateTime(r.acknowledged_at) : "Awaiting acknowledgement"}`
                          : ""}
                      </p>
                    ))}
                  </details>
                  {u.needs_ack && mine && !mine.acknowledged_at && !readOnly && (
                    <button
                      disabled={busy}
                      className={button}
                      onClick={() => void act("acknowledge", { id: u.id })}
                    >
                      Acknowledge
                    </button>
                  )}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-ink-soft">No matching updates.</p>
          )}
        </section>
      )}
      {view === "planning" && (
        <>
          <section className="surface-card space-y-3 p-4">
            <h3 className="font-semibold">Schedule-change requests</h3>
            <p className="text-sm">
              Timeline owner: {name(manager)}. Contributors propose changes; the timeline owner
              reviews the impact and decides.
            </p>
            {can.adminConfig && !readOnly && (
              <label className="block text-sm">
                Timeline owner
                <select
                  className={field}
                  value={manager || ""}
                  disabled={busy}
                  onChange={(e) => void act("set_manager", { owner_id: e.target.value })}
                >
                  <option value="" disabled>
                    Choose timeline owner
                  </option>
                  {people
                    .filter((p) => p.role !== "viewer")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {!readOnly && (
              <form
                className="space-y-3 border-t pt-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act("request_schedule", {
                      task_id: requestTask,
                      start_date: start,
                      finish_date: finish,
                      reason,
                    })
                  ) {
                    setRequestTask("");
                    setReason("");
                  }
                }}
              >
                <fieldset disabled={busy} className="space-y-3">
                  <label className="block text-sm">
                    Work item
                    <select
                      className={field}
                      required
                      value={requestTask}
                      onChange={(e) => {
                        setRequestTask(e.target.value);
                        const t = tasks.find((t) => t.id === e.target.value);
                        setStart(t?.start_date || "");
                        setFinish(t?.due_date || "");
                      }}
                    >
                      <option value="">Choose work to reschedule</option>
                      {setTasks
                        .filter((t) => t.status !== "complete")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">
                      Proposed start
                      <input
                        type="date"
                        required
                        className={field}
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </label>
                    <label className="text-sm">
                      Proposed finish
                      <input
                        type="date"
                        required
                        min={start}
                        className={field}
                        value={finish}
                        onChange={(e) => setFinish(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    Reason
                    <textarea
                      required
                      className={field}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="btn-primary px-3 py-2"
                    disabled={
                      !requestTask ||
                      !reason.trim() ||
                      !start ||
                      !finish ||
                      finish < start ||
                      !manager
                    }
                  >
                    Submit request
                  </button>
                </fieldset>
              </form>
            )}
            {data.requests
              .filter((r) => setTasks.some((t) => t.id === r.task_id))
              .map((r) => (
                <article key={r.id} className="space-y-2 border-t pt-3 text-sm">
                  <p>
                    <strong>{tasks.find((t) => t.id === r.task_id)?.title}</strong> · {r.status}
                  </p>
                  <p>
                    {formatDate(r.old_start || "")}–{formatDate(r.old_finish || "")} →{" "}
                    {formatDate(r.new_start)}–{formatDate(r.new_finish)}
                  </p>
                  <p className="whitespace-pre-wrap">{r.reason}</p>
                  <p className="text-xs text-ink-soft">
                    Requested by {name(r.requested_by)}
                    {r.reviewed_by ? ` · Reviewed by ${name(r.reviewed_by)}` : ""}
                    {r.review_note ? ` · ${r.review_note}` : ""}
                  </p>
                  {!readOnly && r.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      {manager === currentUserId && (
                        <button
                          disabled={busy || previewBusy}
                          className={button}
                          onClick={async () => {
                            setReview(r);
                            setImpact(null);
                            setReviewNote("");
                            setPreviewBusy(true);
                            try {
                              setImpact(
                                (
                                  await previewReschedule(r.task_id, r.new_start, r.new_finish)
                                ).sort((a, b) => a.entity_id.localeCompare(b.entity_id)),
                              );
                              setError("");
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Preview failed");
                            } finally {
                              setPreviewBusy(false);
                            }
                          }}
                        >
                          Review impact
                        </button>
                      )}
                      {r.requested_by === currentUserId && (
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() => void act("withdraw_schedule", { id: r.id })}
                        >
                          Withdraw request
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            {review && (
              <section className="space-y-3 rounded-lg border border-gold bg-cream p-3">
                <h4 className="font-semibold">
                  Review {tasks.find((t) => t.id === review.task_id)?.title}
                </h4>
                {previewBusy ? (
                  <p>Calculating downstream changes…</p>
                ) : impact === null ? (
                  <p>Preview unavailable. Use Review impact to retry.</p>
                ) : impact.length ? (
                  impact.map((r) => (
                    <p className="text-sm" key={r.entity_id}>
                      {r.name}: {formatDate(r.current_finish)} → {formatDate(r.new_finish)}
                      {r.crosses_protected_date
                        ? ` · Crosses ${r.protected_label || "a protected date"}`
                        : ""}
                    </p>
                  ))
                ) : (
                  <p className="text-sm">No downstream dates move.</p>
                )}
                <label className="block text-sm">
                  Review note (required when declining)
                  <textarea
                    className={field}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary px-3 py-2"
                    disabled={
                      busy ||
                      impact === null ||
                      previewBusy ||
                      readOnly ||
                      manager !== currentUserId
                    }
                    onClick={async () => {
                      if (
                        await act("review_schedule", {
                          id: review.id,
                          decision: "accepted",
                          note: reviewNote,
                          impact,
                        })
                      )
                        setReview(null);
                      else setImpact(null);
                    }}
                  >
                    Accept and notify
                  </button>
                  <button
                    className={button}
                    disabled={busy || !reviewNote.trim() || readOnly || manager !== currentUserId}
                    onClick={async () => {
                      if (
                        await act("review_schedule", {
                          id: review.id,
                          decision: "declined",
                          note: reviewNote,
                        })
                      )
                        setReview(null);
                    }}
                  >
                    Decline
                  </button>
                  <button className={button} onClick={() => setReview(null)}>
                    Close
                  </button>
                </div>
              </section>
            )}
          </section>
          <section className="surface-card space-y-3 p-4">
            <h3 className="font-semibold">Department capacity and outsourcing</h3>
            <p className="text-sm text-ink-soft">
              Each named crew or build space handles one allocation at a time. Overlaps are flagged
              for planning; they do not change work dependencies or dates.
            </p>
            <label className="block text-sm">
              Department queue
              <select
                className={field}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {allocations
              .filter(
                (a) =>
                  !department ||
                  tasks.find((t) => t.id === a.task_id)?.department_id === department,
              )
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map((a) => {
                const t = tasks.find((t) => t.id === a.task_id)!;
                const overlaps = capacityConflicts(
                  allocations,
                  a,
                  (id) => tasks.find((t) => t.id === id)?.department_id || "",
                );
                return (
                  <div key={a.task_id} className="border-t pt-3 text-sm">
                    <p>
                      <WorkLink projectId={set.project_id} id={t.id}>
                        {t.title}
                      </WorkLink>{" "}
                      · {store.scenes.find((s) => s.id === t.scene_id)?.name} ·{" "}
                      {departments.find((d) => d.id === t.department_id)?.name}
                    </p>
                    <p>
                      {a.mode === "outsourced" ? `Outsourced to ${a.vendor}` : a.lane} ·{" "}
                      {formatDate(a.start_date)}–{formatDate(a.finish_date)} · {name(a.owner_id)}
                    </p>
                    {overlaps.length > 0 && (
                      <p className="text-danger">
                        Capacity conflict with{" "}
                        {overlaps
                          .map((o) => tasks.find((t) => t.id === o.task_id)?.title)
                          .join(", ")}
                      </p>
                    )}
                    {(a.start_date !== t.start_date || a.finish_date !== t.due_date) && (
                      <p className="text-xs text-ink-soft">
                        Allocation dates differ from the work schedule; review the plan.
                      </p>
                    )}
                    {!readOnly && (
                      <div className="mt-2 flex gap-2">
                        <button
                          className={button}
                          onClick={() => {
                            setAllocationTask(a.task_id);
                            setLane(a.lane);
                            setMode(a.mode);
                            setVendor(a.vendor || "");
                            setCapacityOwner(a.owner_id);
                            setCapacityStart(a.start_date);
                            setCapacityFinish(a.finish_date);
                          }}
                        >
                          Edit allocation
                        </button>
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() => void act("remove_capacity", { task_id: a.task_id })}
                        >
                          Remove allocation
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            {!allocations.length && <p className="text-sm">No capacity allocations yet.</p>}
            {!readOnly && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act("capacity", {
                      task_id: allocationTask,
                      lane,
                      mode,
                      vendor,
                      owner_id: capacityOwner,
                      start_date: capacityStart,
                      finish_date: capacityFinish,
                    })
                  )
                    setAllocationTask("");
                }}
                className="space-y-3 border-t pt-3"
              >
                <fieldset disabled={busy} className="space-y-3">
                  <h4 className="font-medium">Plan a crew, space, or outsourced build</h4>
                  <label className="block text-sm">
                    Work item
                    <select
                      required
                      value={allocationTask}
                      className={field}
                      onChange={(e) => {
                        setAllocationTask(e.target.value);
                        const t = tasks.find((t) => t.id === e.target.value);
                        setCapacityStart(t?.start_date || "");
                        setCapacityFinish(t?.due_date || "");
                      }}
                    >
                      <option value="">Choose work</option>
                      {tasks
                        .filter((t) => t.project_id === set.project_id && t.status !== "complete")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    Build location
                    <select
                      className={field}
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="in_house">In house</option>
                      <option value="outsourced">Outsourced</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    Crew or build space
                    <input
                      className={field}
                      required
                      placeholder="e.g. Shop crew A"
                      value={lane}
                      onChange={(e) => setLane(e.target.value)}
                    />
                  </label>
                  {mode === "outsourced" && (
                    <label className="block text-sm">
                      Outside builder
                      <input
                        className={field}
                        required
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                      />
                    </label>
                  )}
                  <label className="block text-sm">
                    Accountable person
                    <select
                      className={field}
                      value={capacityOwner}
                      onChange={(e) => setCapacityOwner(e.target.value)}
                    >
                      {people
                        .filter((p) => p.role !== "viewer")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">
                      Allocation start
                      <input
                        type="date"
                        required
                        className={field}
                        value={capacityStart}
                        onChange={(e) => setCapacityStart(e.target.value)}
                      />
                    </label>
                    <label className="text-sm">
                      Allocation finish
                      <input
                        type="date"
                        required
                        min={capacityStart}
                        className={field}
                        value={capacityFinish}
                        onChange={(e) => setCapacityFinish(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="btn-primary px-3 py-2"
                    disabled={
                      !allocationTask ||
                      !lane.trim() ||
                      !capacityStart ||
                      !capacityFinish ||
                      capacityFinish < capacityStart ||
                      (mode === "outsourced" && !vendor.trim())
                    }
                  >
                    Save allocation
                  </button>
                </fieldset>
              </form>
            )}
          </section>
        </>
      )}
      {posting && (
        <SetUpdateComposer
          key={set.id}
          projectId={set.project_id}
          sceneId={set.id}
          onClose={() => setPosting(false)}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  );
}
function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-ink-soft">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
function WorkLink({
  projectId,
  id,
  children,
}: {
  projectId: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="underline"
      to="/projects/$projectId/timeline"
      params={{ projectId }}
      search={{ task: id }}
    >
      {children}
    </Link>
  );
}
function FileLink({
  projectId,
  id,
  versionId,
  children,
}: {
  projectId: string;
  id: string;
  versionId?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="underline"
      to="/projects/$projectId/documents"
      params={{ projectId }}
      search={{ document: id, ...(versionId ? { version: versionId } : {}) }}
    >
      {children}
    </Link>
  );
}
