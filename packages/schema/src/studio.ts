// Studio vocabulary shared by server and website: videos read from videos/NNN-slug/, their stages, creator questions, inbox items and agent runs.

export const VIDEO_MODES = ["chat", "gated", "autonomous"] as const;
export type VideoMode = (typeof VIDEO_MODES)[number];

// Decision: "voice" is a voice-over the creator records; "music" has no voice at all, so visuals and on-screen text carry the video.
export const VIDEO_AUDIO = ["voice", "music"] as const;
export type VideoAudio = (typeof VIDEO_AUDIO)[number];

export const INBOX_INTENTS = ["reference", "use as visual", "for a beat", "other"] as const;
export type InboxIntent = (typeof INBOX_INTENTS)[number];

export type StageRow = { name: string; state: string; output: string; gate: boolean };

export type StudioOption = { label: string; description?: string };
export type StudioQuestion = { id: string; question: string; header?: string; multiSelect?: boolean; options: StudioOption[] };
export type StudioQuestions = { stage: string; asked?: string; questions: StudioQuestion[] };

export type InboxItem = { file: string; url: string; kind: "image" | "video" | "audio" | "other"; addedAt: string; note: string; intent: string };

export type RunState = "queued" | "running" | "done" | "failed" | "stopped" | "paused";

export type FeedLine = { at: string; kind: "start" | "text" | "tool" | "agent" | "result" | "error" | "pause"; text: string };

export type RunSummary = {
  id: string;
  videoId: string;
  kind: "next" | "message";
  state: RunState;
  startedAt: string | null;
  endedAt: string | null;
  costUsd: number | null;
  feed: FeedLine[];
};

export type VideoSummary = {
  id: string;
  number: number;
  title: string;
  mode: VideoMode;
  audio: VideoAudio;
  currentStage: string | null;
  currentState: string | null;
  waitingForCreator: boolean;
  running: boolean;
  updatedAt: string;
};

export type VideoDetail = VideoSummary & {
  stages: StageRow[];
  decisions: string[];
  notes: string[];
  files: string[];
  questions: StudioQuestions | null;
  inbox: InboxItem[];
  runs: RunSummary[];
};

export type VoiceStatus = {
  exists: boolean;
  updatedAt: string | null;
  samples: number;
  newSamples: number;
  due: boolean;
  topic: string;
};

export type Usage = { fiveHour: number | null; sevenDay: number | null; resetsAt: string | null; checkedAt: string };

export type RunnerStatus = {
  active: { videoId: string; runId: string } | null;
  queued: number;
  pausedUntil: string | null;
  usage: Usage | null;
  ceiling: number;
};

export type StudioEvent =
  | { type: "studio"; videoId: string }
  | { type: "studio-feed"; videoId: string; runId: string; line: FeedLine }
  | { type: "runner"; status: RunnerStatus };
