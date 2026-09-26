// Pipeline vocabulary shared by server and studio: step order, statuses, modes and labels.

export const STEPS = [
  "angle",
  "script",
  "review",
  "storyboard",
  "voice",
  "assets",
  "timeline",
  "render",
  "metadata",
  "publish",
] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = {
  angle: "Pick the angle",
  script: "Write the script",
  review: "Critic pass",
  storyboard: "Storyboard",
  voice: "Voiceover",
  assets: "Gather assets",
  timeline: "Sync timeline",
  render: "Render video",
  metadata: "Titles & hashtags",
  publish: "Publish",
};

export const PROJECT_STATUSES = ["idea", "queued", "running", "paused", "failed", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const MODES = ["auto", "assisted"] as const;
export type Mode = (typeof MODES)[number];

export const LOG_LEVELS = ["info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export function nextStep(step: Step): Step | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null;
}
