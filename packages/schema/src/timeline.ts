// Render-ready timeline: everything the Remotion composition needs, resolved to frames, files and colors.
import type { CueAction } from "./storyboard";
import type { PaletteId } from "./theme";
import type {
  CodeBlockProps,
  CompareProps,
  DiagramProps,
  HookSlamProps,
  KineticTextProps,
  ListRevealProps,
  MediaProps,
  StatCounterProps,
} from "./templates";

export const SFX_NAMES = ["whoosh", "pop", "slam", "ding"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

export const VIDEO_DEFAULTS = { fps: 30, width: 1080, height: 1920 } as const;

export type TimedWord = { text: string; startMs: number; endMs: number };
export type TimedCue = { frame: number; action: CueAction; target?: string };
export type CaptionPage = { startMs: number; endMs: number; words: TimedWord[] };
export type CodeToken = { text: string; color: string };
export type ResolvedAsset = { src: string; type: "video" | "image"; credit: string | null };

export type ResolvedCodeBlockProps = CodeBlockProps & { tokens: CodeToken[][]; background: string };
export type ResolvedMediaProps = MediaProps & { asset: ResolvedAsset | null };

export type SceneTiming = {
  id: string;
  from: number;
  durationInFrames: number;
  narration: string;
  audio: { src: string; durationMs: number } | null;
  words: TimedWord[];
  cues: TimedCue[];
};

export type TimelineScene = SceneTiming &
  (
    | { template: "HookSlam"; props: HookSlamProps }
    | { template: "KineticText"; props: KineticTextProps }
    | { template: "Diagram"; props: DiagramProps }
    | { template: "CodeBlock"; props: ResolvedCodeBlockProps }
    | { template: "Compare"; props: CompareProps }
    | { template: "ListReveal"; props: ListRevealProps }
    | { template: "StatCounter"; props: StatCounterProps }
    | { template: "Media"; props: ResolvedMediaProps }
  );

export type Timeline = {
  version: 1;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  title: string;
  scenes: TimelineScene[];
  captions: CaptionPage[];
  sfx: { frame: number; name: SfxName; volume: number }[];
  music: { src: string; volume: number } | null;
  theme: { palette: PaletteId };
  background: { src: string; durationInFrames: number } | null;
};

export type VideoProps = { timeline: Timeline; assetBase: string };
