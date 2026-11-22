// Data-story-charts tokens: newsroom paper and night palettes, one highlight, grey context, four type voices and the board's motion timings.
import { createContext, useContext } from "react";
import { Easing } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/SourceSerif4";

// Four voices: Inter for labels and values, Plex for headlines, Source Serif for the annotator, Plex Mono for issue numbers and dates.
export const LABEL = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const TITLE = loadPlex("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadPlexMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;
loadSerif("italic", { weights: ["400", "600"], subsets: ["latin"] });

export type Tone = {
  bg: string;
  ink: string;
  muted: string;
  context: string;
  grid: string;
  hi: string;
  pos: string;
  // Text drawn on top of a highlight fill.
  onHi: string;
};

export const PAPER: Tone = {
  bg: "#FAFAF7",
  ink: "#1A1A1A",
  muted: "#5E636B",
  context: "#B8BCC4",
  grid: "#E5E5E0",
  hi: "#E4572E",
  pos: "#1F9D6B",
  onHi: "#FFFFFF",
};

export const NIGHT: Tone = {
  bg: "#101418",
  ink: "#F1F1EC",
  muted: "#9BA1AA",
  context: "#4C535D",
  grid: "#262C34",
  hi: "#F0643A",
  pos: "#35B582",
  onHi: "#101418",
};

// Pudding-style chapter fields: one flat colour per chapter, always with ink type on top.
export const CHAPTER = {
  vermilion: "#E4572E",
  mustard: "#D9A43A",
  teal: "#3FA7A0",
  violet: "#9A6CC8",
  magenta: "#D84FB0",
  sky: "#6FA8DC",
} as const;

// A chart sits on paper by default; wrap a subtree in <ToneCtx.Provider value={NIGHT}> for the dark look.
export const ToneCtx = createContext<Tone>(PAPER);
export const useTone = () => useContext(ToneCtx);

// The board's motion vocabulary, in seconds at 30 fps.
export const F = 1 / 30;
export const AXIS_D = 10 * F;
export const CONTEXT_D = 20 * F;
export const CONTEXT_STAGGER = 2 * F;
export const HI_D = 30 * F;
export const BAR_STAGGER = 3 * F;
export const BAR_D = 22 * F;
export const PUNCH_D = 6 * F;
export const CALLOUT_D = 12 * F;
export const MORPH_D = 27 * F;
export const REORDER_D = 20 * F;
export const ZOOM_D = 24 * F;
// Exits dim to this instead of removing, so the story keeps its context.
export const DIM = 0.2;

export const OUT3 = Easing.out(Easing.cubic);
export const INOUT3 = Easing.inOut(Easing.cubic);
// Expo-out normalised to land exactly on 1, so a count-up ends on its true value.
export const OUTEXPO = (x: number) => (x >= 1 ? 1 : (1 - 2 ** (-10 * x)) / (1 - 2 ** -10));

// Type sizes at 1080p: never under 28 for labels or 36 for body.
export const SIZE = { label: 30, small: 28, body: 38, note: 40, title: 92, number: 280 } as const;
export const MARGIN = 96;
export const TNUM = { fontVariantNumeric: "tabular-nums" as const, fontFeatureSettings: '"tnum" 1' };
