// Audio-reactive visualiser tokens: the void, three neon presets (neon, mono, sunrise), Space Grotesk titles, JetBrains Mono metadata, colour maths.
import type { CSSProperties } from "react";
import { interpolateColors } from "remotion";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const DISPLAY = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const VOID = "#07070C";
export const CYAN = "#3DF5FF";
export const MAGENTA = "#FF3DA5";
export const VIOLET = "#7A5CFF";
export const WARM = "#FFF4E0";
export const MUTED = "#2A2A3A";
// Muted is a fill colour; text on the void needs this lighter grey to read on a phone.
export const DIM = "#8E8CA8";

// a = low bins / first voice, b = high bins / accent, c = the middle, hi = hot cores and flashes.
export type Palette = { name: string; a: string; b: string; c: string; hi: string };
export const NEON: Palette = { name: "neon", a: CYAN, b: MAGENTA, c: VIOLET, hi: WARM };
export const MONO_WHITE: Palette = { name: "mono", a: "#FFFFFF", b: "#C9CCE0", c: "#7D8199", hi: "#FFFFFF" };
export const SUNRISE: Palette = { name: "sunrise", a: "#FFB23D", b: "#FF3D7A", c: "#FF6A3D", hi: "#FFF4E0" };
export const PRESETS = { neon: NEON, mono: MONO_WHITE, sunrise: SUNRISE } as const;
export type PresetName = keyof typeof PRESETS;

// Safe margin from the brief; every layout keeps text inside it.
export const M = 96;

export const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
export const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
};
export const mix = (a: string, b: string, k: number) => interpolateColors(Math.max(0, Math.min(1, k)), [0, 1], [a, b]);
// A colour across the spectrum: a (bass) → c (mids) → b (highs).
export const sweep = (p: Palette, u: number) => interpolateColors(Math.max(0, Math.min(1, u)), [0, 0.5, 1], [p.a, p.c, p.b]);
// interpolateColors returns rgba(); the canvas and SVG accept it, but rgba() helpers need hex, so this re-alphas any colour string.
export const withAlpha = (color: string, a: number) => {
  if (color.startsWith("#")) return rgba(color, a);
  const m = color.match(/[\d.]+/g);
  if (!m) return color;
  return `rgba(${m[0]},${m[1]},${m[2]},${Math.max(0, Math.min(1, a))})`;
};

// Neon glow as stacked text-shadows; k scales it up on kicks.
export const neon = (color: string, k = 1) => `0 0 ${6 * k}px ${withAlpha(color, 0.9)}, 0 0 ${22 * k}px ${withAlpha(color, 0.55)}, 0 0 ${60 * k}px ${withAlpha(color, 0.3)}`;

// Title cards: wide-tracked Space Grotesk caps. Text is secondary in this theme, so it is set light and wide, never heavy and tight.
export const title = (size: number, track = 0.28): CSSProperties => ({ fontFamily: DISPLAY, fontWeight: 500, fontSize: size, letterSpacing: `${track}em`, textTransform: "uppercase", lineHeight: 1, color: WARM });
// Track metadata: JetBrains Mono, tracked out, never under 28 px.
export const meta = (size = 28, color = DIM): CSSProperties => ({ fontFamily: MONO, fontWeight: 400, fontSize: Math.max(28, size), letterSpacing: "0.16em", textTransform: "uppercase", lineHeight: 1.2, color });
