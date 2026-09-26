// Durable job runner: claims queued steps from SQLite per lane, runs their handlers, then advances, pauses or retries the project.
import { STEP_LABELS, nextStep, type Step } from "@clipforge/schema";
import {
  claimNextJob,
  enqueueJob,
  finishJob,
  getProject,
  requeueInterruptedJobs,
  requeueJob,
  saveArtifact,
  updateProject,
} from "../db/repo";
import type { JobLane } from "../db/schema";
import { createContext } from "./context";
import { errorMessage, isRetryable } from "./errors";
import { emit } from "./events";
import { handlers, laneFor } from "./registry";

const IDLE_POLL_MS = 600;
const LANES: JobLane[] = ["default", "render"];

let started = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function advance(projectId: string, finished: Step): void {
  const project = getProject(projectId);
  if (!project) return;
  const next = nextStep(finished);
  if (!next) {
    updateProject(projectId, { status: "done", currentStep: null, error: null });
    return;
  }
  if (project.mode === "assisted" && project.pauseAfter.includes(finished)) {
    updateProject(projectId, { status: "paused", currentStep: finished });
    return;
  }
  enqueueJob(projectId, next, laneFor(next));
  updateProject(projectId, { status: "running", currentStep: next });
}

async function tick(lane: JobLane): Promise<boolean> {
  const job = claimNextJob(lane);
  if (!job) return false;
  const project = getProject(job.projectId);
  if (!project) {
    finishJob(job.id, "cancelled");
    return true;
  }
  updateProject(project.id, { status: "running", currentStep: job.step, error: null });
  emit({ type: "project", projectId: project.id });
  const ctx = createContext(project, job);
  const label = STEP_LABELS[job.step];
  const startedAt = Date.now();
  ctx.log(`▶ ${label}${job.attempts > 1 ? ` (attempt ${job.attempts} of ${job.maxAttempts})` : ""}`);
  try {
    const output = await handlers[job.step](ctx);
    if (!getProject(project.id)) return true;
    saveArtifact(project.id, job.step, output);
    finishJob(job.id, "done");
    ctx.log(`✓ ${label} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    advance(project.id, job.step);
  } catch (error) {
    if (!getProject(project.id)) return true;
    const message = errorMessage(error);
    if (isRetryable(error) && job.attempts < job.maxAttempts) {
      const delay = 5000 * 2 ** (job.attempts - 1);
      requeueJob(job.id, delay, message);
      ctx.log(`${label} failed: ${message}. Retrying in ${delay / 1000}s`, "warn");
    } else {
      finishJob(job.id, "failed", message);
      updateProject(project.id, { status: "failed", error: `${label}: ${message}` });
      ctx.log(`${label} failed: ${message}`, "error");
    }
  }
  emit({ type: "project", projectId: project.id });
  return true;
}

async function loop(lane: JobLane): Promise<never> {
  for (;;) {
    let worked = false;
    try {
      worked = await tick(lane);
    } catch (error) {
      console.error(`[runner:${lane}]`, error);
    }
    if (!worked) await sleep(IDLE_POLL_MS);
  }
}

export function startRunner(): void {
  if (started) return;
  started = true;
  const resumed = requeueInterruptedJobs();
  if (resumed > 0) console.log(`Resuming ${resumed} interrupted job(s)`);
  for (const lane of LANES) void loop(lane);
}
