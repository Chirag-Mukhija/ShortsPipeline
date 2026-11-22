// Lyric visualiser tokens: night and day palettes, per-section skies, the three type voices (Fraunces italic, Inter Light, Bebas Neue), glow, and the music-only hold rule.
import type { CSSProperties } from "react";
import { interpolateColors } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";

export const SERIF = loadFraunces("italic", { weights: ["300", "400", "600"], subsets: ["latin"] }).fontFamily;
loadFraunces("normal", { weights: ["300", "400"], subsets: ["latin"] });
export const SANS = loadInter("normal", { weights: ["300", "400", "500"], subsets: ["latin"] }).fontFamily;
export const DROP = loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export type Palette = { bg0: string; bg1: string; ink: string; accent: string; second: string; muted: string };
export const NIGHT: Palette = { bg0: "#0E0B1E", bg1: "#231B4D", ink: "#F5F0FF", accent: "#FF5E9C", second: "#5CE1E6", muted: "#8A84A8" };
// The board gives the day background, ink and accent; secondary and muted are picked to keep 4.5:1 on cream.
export const DAY: Palette = { bg0: "#F7F1E8", bg1: "#EADFCC", ink: "#1B1B1B", accent: "#E4572E", second: "#2F7F86", muted: "#6F675E" };

import type { SectionName } from "../../core/beat";
export type { SectionName };
// Each section of the song has its own sky: [deep, lifted]. The gradient drifts between them over 2 bars.
export const SKY: Record<SectionName, [string, string]> = {
  intro: ["#0E0B1E", "#231B4D"],
  build: ["#110B28", "#2D2063"],
  peak: ["#170A26", "#4A1650"],
  breathe: ["#0A1222", "#16384C"],
  out: ["#07060E", "#1A1533"],
};

// The board asks for nothing tighter; 120 px keeps text clear of YouTube's overlays.
export const M = 120;

export const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
export const alpha = (hex: string, a: number) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
};
export const mix = (a: string, b: string, k: number) => interpolateColors(k, [0, 1], [a, b]);

// The board's glow is 0 0 24 px at 30 %; k > 1 adds a wider bloom for pulses and drops.
export const glow = (color: string, k = 1) => {
  const base = `0 0 24px ${alpha(color, 0.3 * Math.min(1, k))}`;
  if (k <= 1) return base;
  return `${base}, 0 0 ${12 * k}px ${alpha(color, 0.18 * (k - 1))}, 0 0 ${48 * k}px ${alpha(color, 0.14 * (k - 1))}`;
};

// emo = feeling (Fraunces italic), cool = calm statements (Inter Light, tracking +80), drop = peaks (Bebas, tight).
export type Voice = "emo" | "cool" | "drop";
export const voice = (v: Voice, size: number): CSSProperties => {
  switch (v) {
    case "emo":
      return { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: size, letterSpacing: "-0.01em", lineHeight: 1.08 };
    case "cool":
      return { fontFamily: SANS, fontWeight: 300, fontSize: size, letterSpacing: "0.08em", lineHeight: 1.2 };
    case "drop":
      return { fontFamily: DROP, fontWeight: 400, fontSize: size, letterSpacing: "0.005em", lineHeight: 0.9 };
  }
};
// Small caps-style labels: section titles, sources, axis names.
export const label = (size = 30): CSSProperties => ({ fontFamily: SANS, fontWeight: 400, fontSize: size, letterSpacing: "0.24em", textTransform: "uppercase", lineHeight: 1 });

// Music-only hold rule (.claude/skills/studio/music-only.md): 1.5 s + 0.3 s per word, rounded up to the half second; at most 12 words.
export { MAX_WORDS, holdFor } from "../../core/beat";
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
