// Converts database rows into the API shapes the studio consumes.
import {
  STEPS,
  type JobView,
  type LogView,
  type ProjectDetail,
  type ProjectSummary,
  type RenderArtifact,
} from "@clipforge/schema";
import { fileUrl } from "../config";
import { activeJob, latestArtifact, latestArtifacts, listJobs, listLogs, projectSpendInr } from "../db/repo";
import type { JobRow, LogRow, ProjectRow } from "../db/schema";

export function toLogView(row: LogRow): LogView {
  return { id: row.id, step: row.step, level: row.level, message: row.message, createdAt: row.createdAt };
}

export function toJobView(row: JobRow): JobView {
  return {
    id: row.id,
    step: row.step,
    status: row.status,
    attempts: row.attempts,
    progress: row.progress,
    message: row.message,
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export function projectSummary(row: ProjectRow, render?: RenderArtifact): ProjectSummary {
  const rendered = render ?? latestArtifact<RenderArtifact>(row.id, "render");
  const job = row.status === "running" || row.status === "queued" ? activeJob(row.id) : undefined;
  const index = row.currentStep ? STEPS.indexOf(row.currentStep) : -1;
  const progress =
    row.status === "done"
      ? 1
      : index < 0
        ? 0
        : (index + (job?.status === "running" ? job.progress : 0)) / STEPS.length;
  const version = rendered ? `?v=${encodeURIComponent(rendered.renderedAt)}` : "";
  return {
    id: row.id,
    topic: row.topic,
    title: row.title,
    status: row.status,
    mode: row.mode,
    currentStep: row.currentStep,
    progress,
    error: row.error,
    posterUrl: rendered ? `${fileUrl(rendered.poster)}${version}` : null,
    videoUrl: rendered ? `${fileUrl(rendered.video)}${version}` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function projectDetail(row: ProjectRow): ProjectDetail {
  const artifacts = latestArtifacts(row.id);
  return {
    ...projectSummary(row, artifacts.render as RenderArtifact | undefined),
    artifacts,
    jobs: listJobs(row.id).map(toJobView),
    logs: listLogs(row.id).map(toLogView),
    spendInr: projectSpendInr(row.id),
  };
}
