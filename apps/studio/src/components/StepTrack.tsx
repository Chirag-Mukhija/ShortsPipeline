// Vertical pipeline tracker: each step's latest job state, progress and duration.
import { STEPS, STEP_LABELS, type JobView, type Step } from "@clipforge/schema";
import { Progress } from "./ui";

type StepState = "pending" | "queued" | "running" | "done" | "failed" | "cancelled";

function latestJobs(jobs: JobView[]): Partial<Record<Step, JobView>> {
  const latest: Partial<Record<Step, JobView>> = {};
  for (const job of jobs) {
    const current = latest[job.step];
    if (!current || job.createdAt > current.createdAt) latest[job.step] = job;
  }
  return latest;
}

function duration(job: JobView): string | null {
  if (!job.startedAt || !job.finishedAt) return null;
  const seconds = (Date.parse(job.finishedAt) - Date.parse(job.startedAt)) / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

const ICONS: Record<StepState, string> = {
  pending: "○",
  queued: "◌",
  running: "◉",
  done: "✓",
  failed: "✕",
  cancelled: "–",
};

const COLORS: Record<StepState, string> = {
  pending: "text-dim",
  queued: "text-info",
  running: "text-accent animate-pulse",
  done: "text-good",
  failed: "text-bad",
  cancelled: "text-dim",
};

export function StepTrack({ jobs }: { jobs: JobView[] }) {
  const latest = latestJobs(jobs);
  return (
    <ol className="flex flex-col gap-1">
      {STEPS.map((step) => {
        const job = latest[step];
        const state: StepState = job ? job.status : "pending";
        return (
          <li key={step} className={`rounded-xl px-3 py-2 ${state === "running" ? "bg-accent/10" : ""}`}>
            <div className="flex items-center gap-3 text-sm">
              <span className={`w-4 text-center font-bold ${COLORS[state]}`}>{ICONS[state]}</span>
              <span className={state === "pending" ? "text-dim" : "text-ink"}>{STEP_LABELS[step]}</span>
              <span className="ml-auto text-xs text-dim">
                {job && state === "done" ? duration(job) : null}
                {job && job.attempts > 1 && state !== "done" ? `try ${job.attempts}` : null}
              </span>
            </div>
            {state === "running" && job ? (
              <div className="mt-2 pl-7">
                <Progress value={job.progress} />
                {job.message ? <div className="mt-1 text-xs text-muted">{job.message}</div> : null}
              </div>
            ) : null}
            {state === "failed" && job?.error ? <div className="mt-1 pl-7 text-xs text-bad">{job.error}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
