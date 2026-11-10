// Header widget: how much of the Claude Pro 5-hour window the studio has used, when it resets, and whether runs are paused.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studio } from "../api";
import { Button } from "./ui";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function UsageMeter() {
  const client = useQueryClient();
  const { data: runner } = useQuery({ queryKey: ["runner"], queryFn: studio.runner, refetchInterval: 60_000 });
  const resume = useMutation({ mutationFn: studio.resume, onSuccess: (status) => client.setQueryData(["runner"], status) });
  if (!runner) return null;
  // Decision: a reading from a window that has already reset says nothing about the new one, so it's hidden rather than shown stale.
  const stale = Boolean(runner.usage?.resetsAt && Date.parse(runner.usage.resetsAt) < Date.now());
  const used = stale ? null : runner.usage?.fiveHour;
  const paused = runner.pausedUntil && Date.parse(runner.pausedUntil) > Date.now();
  const tone = used == null ? "bg-dim" : used >= 0.9 ? "bg-bad" : used >= 0.7 ? "bg-warn" : "bg-good";
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
      {paused ? (
        <span className="flex items-center gap-2 rounded-full bg-info/15 px-3 py-1 text-info">
          Paused for the usage limit until {time(runner.pausedUntil!)}
          <Button className="!px-2 !py-0.5 text-[11px]" onClick={() => resume.mutate()} disabled={resume.isPending}>
            Try now
          </Button>
        </span>
      ) : runner.active ? (
        <span className="flex items-center gap-1.5 text-accent">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> agents working
          {runner.queued ? ` · ${runner.queued} queued` : ""}
        </span>
      ) : runner.queued ? (
        <span>{runner.queued} queued</span>
      ) : null}
      <span className="flex items-center gap-2" title="Share of your Claude Pro 5-hour window used, as last reported by Claude Code">
        <span>Pro limit</span>
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-hi">
          <span className={`block h-full ${tone}`} style={{ width: `${Math.round((used ?? 0) * 100)}%` }} />
        </span>
        <span className="tabular-nums">{used == null ? "–" : `${Math.round(used * 100)}%`}</span>
        {stale ? <span className="text-dim">new window, updates on the next run</span> : runner.usage?.resetsAt ? <span className="text-dim">resets {time(runner.usage.resetsAt)}</span> : null}
      </span>
    </div>
  );
}
