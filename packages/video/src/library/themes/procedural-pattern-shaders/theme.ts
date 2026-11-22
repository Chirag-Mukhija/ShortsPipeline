// Procedural-pattern tokens: per-scene 2–5 colour palettes, Archivo display and Space Grotesk labels, the flat poster page and timing constants.
import { interpolateColors } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

export const DISPLAY = loadArchivo("normal", { weights: ["800", "900"], subsets: ["latin"] }).fontFamily;
export const SANS = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;

// The flat page a pattern window sits on, and the ink used on it.
export const PAGE = "#f2ede4";
export const INK = "#111014";
export const WHITE = "#ffffff";
export const MARGIN = 96;

// Index 0 is always the ground colour; the rest are the pattern's inks. Keep a scene to one palette.
export const PALETTES = {
  pool: ["#0b1a4a", "#7cc8ff"],
  blush: ["#fde8e4", "#f4a3a8", "#7d0f2c"],
  mustard: ["#0e0d0b", "#f5b82e"],
  lilac: ["#6236ff", "#e6dcff"],
  sunset: ["#ff5e3a", "#ff9b2f", "#ffd447", "#2f4bff", "#fff3e0"],
  amber: ["#0d0b08", "#ffb300", "#ff8a00", "#ffd34d"],
  ember: ["#060507", "#ff7a1a", "#8f5bff", "#ffb03a"],
  indigo: ["#07051f", "#4c3cff", "#cfd2ff"],
  glow: ["#04040a", "#3d7bff", "#ff4fa3", "#9b6bff"],
  poster: ["#f2ede4", "#ff4a1c", "#111014"],
} satisfies Record<string, string[]>;
export type PaletteName = keyof typeof PALETTES;
export type Palette = string[];

// Exit move from the board: a scene's colour set interpolates into the next one's (pads the shorter set with its last colour).
export const blendPalette = (a: Palette, b: Palette, e: number): Palette =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
    interpolateColors(e, [0, 1], [a[Math.min(i, a.length - 1)]!, b[Math.min(i, b.length - 1)]!]),
  );

export const display = (size: number, weight = 800) => `${weight} ${size}px "${DISPLAY}"`;
