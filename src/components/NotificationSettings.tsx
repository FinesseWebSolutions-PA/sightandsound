import { useEffect, useState } from "react";
import { usePersonalWorkflow } from "@/lib/personal-context";
export function NotificationSettings() {
  const { state, error, act } = usePersonalWorkflow();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pref, setPref] = useState({
    desktop: false,
    mode: "mentions" as "mentions" | "following",
    quiet_start: 22,
    quiet_end: 7,
  });
  useEffect(() => {
    if (state.preferences) setPref(state.preferences);
  }, [state.preferences]);
  return (
    <section className="surface-card p-3">
      <button
        className="min-h-11 text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Notification settings
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          Could not sync your settings.{" "}
          <button className="underline" onClick={() => void act("get", {})}>
            Retry
          </button>
        </p>
      )}
      {open && (
        <div className="space-y-3 border-t pt-3 text-sm">
          <p>
            Mentions and approval requests stay in My Work. Follow or mute ordinary replies in each
            conversation. Desktop alerts work while this app is open.
          </p>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={pref.desktop}
              onChange={(e) => setPref({ ...pref, desktop: e.target.checked })}
            />
            Desktop alerts (browser permission required)
          </label>
          <label className="block">
            Alert me about
            <select
              aria-label="Desktop alert types"
              value={pref.mode}
              onChange={(e) => setPref({ ...pref, mode: e.target.value as typeof pref.mode })}
              className="ml-2 min-h-11 rounded border bg-card px-2"
            >
              <option value="mentions">Mentions, approvals and assignments</option>
              <option value="following">All my updates</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            Quiet hours (this device’s local time):
            {(["quiet_start", "quiet_end"] as const).map((key, i) => (
              <label key={key}>
                {i === 0 ? "From" : "To"}{" "}
                <select
                  aria-label={i === 0 ? "Quiet hours start" : "Quiet hours end"}
                  value={pref[key]}
                  onChange={(e) => setPref({ ...pref, [key]: Number(e.target.value) })}
                  className="min-h-11 rounded border bg-card px-2"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            Set both times equal to turn quiet hours off. Email delivery is not enabled yet.
          </p>
          <button
            disabled={busy}
            className="min-h-11 rounded bg-ink px-4 text-cream-soft"
            onClick={async () => {
              setBusy(true);
              try {
                if (pref.desktop) {
                  if (typeof Notification === "undefined") {
                    alert("Desktop alerts are not supported on this device.");
                    return;
                  }
                  if ((await Notification.requestPermission()) !== "granted") {
                    alert("Allow notifications in your browser settings to enable desktop alerts.");
                    return;
                  }
                }
                if (await act("preferences", pref)) setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </div>
      )}
    </section>
  );
}
