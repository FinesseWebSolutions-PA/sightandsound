import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getGateStatus, unlockSite } from "@/lib/gate.functions";

export function DemoGate({ children }: { children: ReactNode }) {
  const status = useServerFn(getGateStatus);
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const gate = useQuery({
    queryKey: ["demo-gate"],
    queryFn: () => status(),
    staleTime: Infinity,
    retry: false,
  });

  if (gate.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  if (gate.data?.unlocked) return <>{children}</>;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || password.trim().length === 0) return;
    setSaving(true);
    setError(false);
    try {
      const result = await unlock({ data: { password: password.trim() } });
      if (result.ok) {
        await gate.refetch();
      } else {
        setError(true);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-sm rounded-xl border border-ink-soft/40 bg-card p-6 shadow-lg">
        <img src="/favicon.png" alt="Sight &amp; Sound" className="h-10 w-10 rounded-md" />
        <h1 className="mt-4 font-display text-2xl text-ink">Show production demo</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enter the access code to open the admin demo.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Access code"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base text-ink outline-none focus:border-primary"
          />
          {error ? (
            <p className="text-sm text-danger" role="alert">
              That code isn&apos;t right. Try again.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving || password.trim().length === 0}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {saving ? "Checking…" : "Enter demo"}
          </button>
        </form>
      </div>
    </div>
  );
}
