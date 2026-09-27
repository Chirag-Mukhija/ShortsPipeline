// User-facing pipeline controls: start or re-run from a step, retry a failure, approve a paused step, delete a project.
import { rmSync } from "node:fs";
import { STEPS, nextStep, type Step } from "@clipforge/schema";
import { paths } from "../config";
import { activeJob, cancelQueuedJobs, deleteProject, enqueueJob, getProject, listJobs, updateProject } from "../db/repo";
import { StepError } from "./errors";
import { emit } from "./events";
import { laneFor } from "./registry";

export function startProject(id: string, from: Step = STEPS[0], feedbackNote?: string): void {
  const project = getProject(id);
  if (!project) throw new StepError("Project not found", false);
  if (activeJob(id)?.status === "running") {
    throw new StepError("A step is running right now; wait for it to finish before re-running", false);
  }
  cancelQueuedJobs(id);
  enqueueJob(id, from, laneFor(from), 0, feedbackNote);
  updateProject(id, { status: "queued", currentStep: from, error: null });
  emit({ type: "project", projectId: id });
}

export function retryProject(id: string): void {
  const project = getProject(id);
  if (!project) throw new StepError("Project not found", false);
  const failed = listJobs(id).find((job) => job.status === "failed");
  startProject(id, failed?.step ?? project.currentStep ?? STEPS[0]);
}

export function approveProject(id: string): void {
  const project = getProject(id);
  if (!project || project.status !== "paused" || !project.currentStep) throw new StepError("Project is not waiting for approval", false);
  const next = nextStep(project.currentStep);
  if (next) startProject(id, next);
  else updateProject(id, { status: "done", currentStep: null });
  emit({ type: "project", projectId: id });
}

export function removeProject(id: string): void {
  cancelQueuedJobs(id);
  deleteProject(id);
  rmSync(paths.project(id), { recursive: true, force: true });
  emit({ type: "project", projectId: id });
}
