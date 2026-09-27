// Shapes exchanged between the server API and the studio UI.
import type { JobStatus, LogLevel, Mode, ProjectStatus, Step } from "./pipeline";

export type ProjectSummary = {
  id: string;
  topic: string;
  title: string | null;
  status: ProjectStatus;
  mode: Mode;
  currentStep: Step | null;
  progress: number;
  error: string | null;
  posterUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobView = {
  id: string;
  step: Step;
  status: JobStatus;
  attempts: number;
  progress: number;
  message: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type LogView = {
  id: number;
  step: Step | null;
  level: LogLevel;
  message: string;
  createdAt: string;
};

export type RecordingView = { sceneId: string; durationMs: number; createdAt: string };

export type ProjectDetail = ProjectSummary & {
  artifacts: Partial<Record<Step, unknown>>;
  jobs: JobView[];
  logs: LogView[];
  spendInr: number;
  recordings: RecordingView[];
};

export type SystemStatus = {
  llm: { provider: string; model: string; paid: boolean };
  tts: { provider: string; voice: string };
  stock: { providers: string[] };
  youtube: { configured: boolean; connected: boolean };
  budget: { monthSpendInr: number; capInr: number };
  autopilot: { everyHours: number; nextRun: string | null };
};

export type ServerEvent =
  | { type: "project"; projectId: string }
  | { type: "progress"; projectId: string; step: Step; progress: number; message: string | null }
  | { type: "log"; projectId: string; log: LogView };
