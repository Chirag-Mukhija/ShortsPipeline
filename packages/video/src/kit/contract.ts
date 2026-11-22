// The scene-template contract: what every kit template exports, so a planner picks templates by data, the renderer draws them in any video's style, and the same timeline always renders the same video.
import type { FC } from "react";
import type { z } from "zod";

// Which part of the visual mix a template counts toward (the plan sets targets, e.g. face 40–50%, graphics 30–40%, stock/screen 20–30%).
export type Mode = "face" | "graphic" | "stock" | "screen" | "text";

// How the template sits in the frame: the whole frame, beside the creator (a panel next to face cam), or on top of footage.
export type Layout = "full" | "split" | "overlay";

// A video's look as plain tokens. Templates never hard-code a colour or font; they read these, so one template serves every theme.
export type Style = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  // Font families, already loaded by the theme.
  display: string;
  body: string;
  mono: string;
  // Corner radius in px at 1080p, 0 for sharp themes.
  radius: number;
  // Motion temperament: "calm" eases, "snappy" springs with a little overshoot, "hand" adds the hand-drawn boil.
  motion: "calm" | "snappy" | "hand";
};

// Footage or an image the template treats as material: masked, moved, graded and captioned, never just dropped in a box.
export type Media = {
  // Path inside the render's public folder (e.g. "media/fs-01.mov") or an http(s) URL.
  src: string;
  kind: "video" | "image";
  // Seconds into the source where this use starts.
  from?: number;
  // Where the subject is, 0–1, so crops and zooms keep it in frame.
  focus?: [x: number, y: number];
  // An alpha-matted copy of the same clip (person cut out), when one exists; enables text-behind-subject.
  matte?: string;
};

// A spoken word inside the segment, in seconds from the segment's start: templates land their beats on these.
export type Cue = { at: number; end: number; word: string };

export type SceneProps<P> = {
  props: P;
  style: Style;
  // The canvas the template draws into: 1920×1080 for "full" and "overlay", 1000×1080 for "split" (a panel beside face cam). Lay out from these, never from fixed screen numbers.
  width: number;
  height: number;
  // Segment length in seconds (the template must fill it exactly and look settled by the end).
  duration: number;
  // Media slots in order; a template documents what slot 0, 1… mean in its useFor.
  media: Media[];
  cues: Cue[];
};

export type KitTemplate<S extends z.ZodType = z.ZodType> = {
  id: string;
  title: string;
  mode: Mode;
  layouts: Layout[];
  // When the planner should reach for it, and when not.
  useFor: string;
  avoid: string;
  // Props the planner fills, validated before render. Text fields carry max lengths so nothing overflows.
  schema: S;
  // Demo props: also the planner's worked example.
  example: z.infer<S>;
  // Demo media, as names in data/library/kit/demo-media/ (served as "media/<name>").
  exampleMedia: Media[];
  // Demo narration words, so cue-driven timing shows in previews (the words the example's *Word props name).
  exampleCues: Cue[];
  seconds: { min: number; max: number; demo: number };
  // Media slots it needs: 0 for pure graphics.
  mediaSlots: number;
  // Where the idea came from, credited (e.g. a prompt-motion.com piece).
  credit?: { name: string; url: string };
  status: "draft" | "ready";
  Component: FC<SceneProps<z.infer<S>>>;
};

export const defineTemplate = <S extends z.ZodType>(t: KitTemplate<S>): KitTemplate<S> => t;
