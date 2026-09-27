// Output shapes of the non-LLM pipeline steps, persisted as artifacts and shown in the studio.
import type { CodeToken, ResolvedAsset, TimedWord } from "./timeline";

export type VoiceScene = {
  id: string;
  file: string;
  durationMs: number;
  speechEndMs: number;
  words: TimedWord[];
  source: "tts" | "recorded";
};

export type VoiceArtifact = {
  provider: string;
  voice: string;
  scenes: VoiceScene[];
  totalMs: number;
};

export type AssetsArtifact = {
  media: Record<string, ResolvedAsset | null>;
  code: Record<string, { tokens: CodeToken[][]; background: string }>;
  music: { src: string; volume: number } | null;
  background: { src: string; durationInFrames: number } | null;
};

export type RenderArtifact = {
  video: string;
  poster: string;
  durationSec: number;
  sizeBytes: number;
  renderedAt: string;
};

export type PublishArtifact = {
  youtube: { videoId: string; url: string; privacy: string } | null;
  exportDir: string;
  notes: string[];
};
