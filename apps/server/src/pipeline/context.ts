// Builds what each step handler receives: the project snapshot, typed artifact access, logging, progress and file paths.
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  STEP_LABELS,
  type AnglePlan,
  type AssetsArtifact,
  type LogLevel,
  type Metadata,
  type PublishArtifact,
  type RenderArtifact,
  type Review,
  type Script,
  type Step,
  type Storyboard,
  type Timeline,
  type VoiceArtifact,
} from "@clipforge/schema";
import { paths } from "../config";
import { addLog, latestArtifact, updateJob } from "../db/repo";
import type { JobRow, ProjectRow } from "../db/schema";
import { StepError } from "./errors";
import { emit } from "./events";
import { toLogView } from "./views";

export type ArtifactMap = {
  angle: AnglePlan;
  script: Script;
  review: Review;
  storyboard: Storyboard;
  voice: VoiceArtifact;
  assets: AssetsArtifact;
  timeline: Timeline;
  render: RenderArtifact;
  metadata: Metadata;
  publish: PublishArtifact;
};

export type StepContext = {
  project: ProjectRow;
  job: JobRow;
  dir: string;
  file: (...parts: string[]) => string;
  log: (message: string, level?: LogLevel) => void;
  progress: (fraction: number, message?: string) => void;
  need: <S extends Step>(step: S) => ArtifactMap[S];
};

export function createContext(project: ProjectRow, job: JobRow): StepContext {
  const dir = paths.project(project.id);
  mkdirSync(dir, { recursive: true });
  let lastEmitAt = 0;
  let lastValue = -1;
  return {
    project,
    job,
    dir,
    file: (...parts) => {
      const file = path.join(dir, ...parts);
      mkdirSync(path.dirname(file), { recursive: true });
      return file;
    },
    log: (message, level = "info") => {
      const row = addLog(project.id, job.step, level, message);
      emit({ type: "log", projectId: project.id, log: toLogView(row) });
      const prefix = level === "error" ? "✗" : level === "warn" ? "!" : "·";
      console.log(`${prefix} [${project.id} ${job.step}] ${message}`);
    },
    progress: (fraction, message) => {
      const value = Math.max(0, Math.min(1, fraction));
      const now = Date.now();
      if (now - lastEmitAt < 400 && Math.abs(value - lastValue) < 0.05 && value < 1) return;
      lastEmitAt = now;
      lastValue = value;
      updateJob(job.id, { progress: value, message: message ?? null });
      emit({ type: "progress", projectId: project.id, step: job.step, progress: value, message: message ?? null });
    },
    need: <S extends Step>(step: S) => {
      const data = latestArtifact<ArtifactMap[S]>(project.id, step);
      if (data === undefined) {
        throw new StepError(`Missing output of "${STEP_LABELS[step]}"; re-run the pipeline from that step`, false);
      }
      return data;
    },
  };
}
