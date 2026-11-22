// Kinetic type film tokens: void black, paper, white/ink, red and lime accents, Inter (variable weight) for hits, Instrument Serif italic for feeling, JetBrains Mono for tech and labels.
import type { CSSProperties } from "react";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// Google serves Inter as one variable file for every weight, so `fontVariationSettings: "wght" n` can morph between them.
export const DISPLAY = loadInter("normal", { weights: ["300", "400", "500", "800", "900"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;

export const VOID = "#0B0B0F";
export const PAPER = "#F5F2EA";
export const WHITE = "#FFFFFF";
export const INK = "#111111";
export const RED = "#FF3B2F";
export const LIME = "#D7FF3A";
export const MUTED = "#6E6E78";
// A step darker than MUTED, for bars and rules that sit behind the one highlighted thing.
export const DIM = "#2A2A31";

// Colour blocks change per beat; each block has one ink and one accent that read on it.
export type Bg = "void" | "paper" | "red" | "lime";
export const BLOCK: Record<Bg, { bg: string; ink: string; accent: string; muted: string }> = {
  void: { bg: VOID, ink: WHITE, accent: RED, muted: MUTED },
  paper: { bg: PAPER, ink: INK, accent: RED, muted: "#8A867D" },
  red: { bg: RED, ink: INK, accent: PAPER, muted: "#7A1A14" },
  lime: { bg: LIME, ink: INK, accent: VOID, muted: "#5E7019" },
};

// Safe margin: the board asks for 120 px, wider than the library's 96 px floor.
export const M = 120;

// The four voices of the film. Hits are tight and heavy; support is plain; emo is the serif aside; tech is mono.
export type Voice = "hit" | "support" | "emo" | "tech";
export const voice = (v: Voice, size: number, weight?: number): CSSProperties => {
  switch (v) {
    case "hit":
      return { fontFamily: DISPLAY, fontSize: size, fontWeight: weight ?? 900, letterSpacing: "-0.045em", lineHeight: 1 };
    case "support":
      return { fontFamily: DISPLAY, fontSize: size, fontWeight: weight ?? 500, letterSpacing: "-0.015em", lineHeight: 1.1 };
    case "emo":
      return { fontFamily: SERIF, fontStyle: "italic", fontSize: size, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1 };
    case "tech":
      return { fontFamily: MONO, fontSize: size, fontWeight: weight ?? 500, letterSpacing: "0.02em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" };
  }
};

// Rough advance width of Inter Black with the hit tracking, in em per character; only used to size words to a box.
export const HIT_EM = 0.64;
export const fitSize = (text: string, width: number, max: number, em = HIT_EM) => Math.min(max, Math.floor(width / Math.max(1, text.length * em)));
