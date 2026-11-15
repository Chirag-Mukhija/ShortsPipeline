// Sidebar widget: how much of the Claude Pro 5-hour and weekly limits is used, when the reading was taken, a refresh, and whether agents are working or paused.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studio } from "../api";
import { RefreshIcon } from "./icons";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const pct = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v * 100)}%`);
const tone = (v: number | null | undefined) => (v == null ? "bg-dim" : v >= 0.9 ? "bg-bad" : v >= 0.7 ? "bg-warn" : "bg-ink");

function Bar({ value, thin = false }: { value: number | null | undefined; thin?: boolean }) {
  return (
    <div className={`${thin ? "h-0.5" : "h-1"} overflow-hidden rounded-full bg-surface-hi`}>
      <div className={`h-full rounded-full transition-all duration-500 ${tone(value)}`} style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
    </div>
  );
}

export function UsageMeter({ compact = false }: { compact?: boolean }) {
  const client = useQueryClient();
  const { data: runner } = useQuery({ queryKey: ["runner"], queryFn: studio.runner, refetchInterval: 60_000 });
  const resume = useMutation({ mutationFn: studio.resume, onSuccess: (status) => client.setQueryData(["runner"], status) });
  const refresh = useMutation({ mutationFn: studio.refreshUsage, onSuccess: (status) => client.setQueryData(["runner"], status) });
  if (!runner) return null;
  // Decision: a reading from a window that has already reset says nothing about the new one, so it's hidden rather than shown stale.
  const stale = Boolean(runner.usage?.resetsAt && Date.parse(runner.usage.resetsAt) < Date.now());
  const used = stale ? null : runner.usage?.fiveHour;
  const weekly = runner.usage?.sevenDay;
  const paused = runner.pausedUntil && Date.parse(runner.pausedUntil) > Date.now();
  const refreshTitle = "Check your current Pro usage (sends one tiny Haiku request)";

  if (compact) {
    return (
      <button className="flex flex-col items-center gap-1 rounded-md px-1 py-1 transition-colors hover:bg-surface" title={`Pro limit used: ${pct(used)}. Click to refresh.`} onClick={() => refresh.mutate()} disabled={refresh.isPending}>
        {runner.active ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
        <span className={`font-mono text-[10px] tabular-nums ${refresh.isPending ? "animate-pulse text-muted" : "text-dim"}`}>{pct(used)}</span>
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {paused ? (
        <div className="rounded-lg border border-info/25 bg-info/5 p-2.5 text-xs text-info">
          Paused for the usage limit until {time(runner.pausedUntil!)}.
          <button className="mt-1 block text-ink underline decoration-line-hi underline-offset-2 hover:decoration-ink" onClick={() => resume.mutate()} disabled={resume.isPending}>
            Try now
          </button>
        </div>
      ) : runner.active || runner.queued ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          {runner.active ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
          {runner.active ? "Agents working" : ""}
          {runner.queued ? `${runner.active ? " · " : ""}${runner.queued} queued` : ""}
        </div>
      ) : null}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="eyebrow">Pro limit</span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-xs tabular-nums text-muted">{pct(used)}</span>
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              title={refreshTitle}
              aria-label="Refresh Pro usage"
              className="grid size-5 place-items-center rounded text-dim transition-colors hover:bg-surface-hi hover:text-ink disabled:opacity-60"
            >
              <RefreshIcon size={12} className={refresh.isPending ? "animate-spin" : ""} />
            </button>
          </span>
        </div>
        <Bar value={used} />
        <div className="mt-1.5 text-[11px] leading-relaxed text-dim">
          {refresh.isPending
            ? "Checking…"
            : stale
              ? "New window. Refresh to read it."
              : runner.usage?.resetsAt
                ? `Resets ${time(runner.usage.resetsAt)} · read ${time(runner.usage.checkedAt)}`
                : "No reading yet. Refresh to check."}
        </div>
        {refresh.error ? <div className="mt-1 text-[11px] text-bad">{refresh.error.message}</div> : null}
      </div>
      {weekly != null ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="eyebrow">Weekly</span>
            <span className="font-mono text-xs tabular-nums text-dim">{pct(weekly)}</span>
          </div>
          <Bar value={weekly} thin />
        </div>
      ) : null}
    </div>
  );
}
