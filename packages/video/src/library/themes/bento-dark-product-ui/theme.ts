// Bento dark product UI tokens: near-black canvas, hairline panels, muted grey type with one lit word, Inter + JetBrains Mono, indigo or one hue per scene.
import { Easing, interpolateColors } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const SANS = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const BG = "#08090A";
export const PANEL = "#0F1011";
export const PANEL2 = "#141516";
export const RAISED = "#1C1D20";
export const TEXT = "#F7F8F8";
// Secondary copy inside cards: a step brighter than MUTED so 36 px body text holds on a phone.
export const SOFT = "#B4B8BF";
export const MUTED = "#8A8F98";
export const FAINT = "#3A3D43";

// One hue per scene; indigo is the default.
export const HUE = {
  indigo: "#5E6AD2",
  violet: "#8E6CF0",
  blue: "#3E9BFF",
  green: "#3DD68C",
  amber: "#F5A524",
  red: "#E5484D",
} as const;
export type Hue = keyof typeof HUE;
export const ACCENT = HUE.indigo;

// Hairline white at a given alpha: 0.08 is a resting border, 0.30 a focused one.
export const hair = (a: number) => `rgba(255,255,255,${a})`;
export const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// 0 = muted grey clause, 1 = lit white.
export const litCol = (lit: number) => interpolateColors(lit, [0, 1], [MUTED, TEXT]);

export const TRACK = "-0.03em";
export const RADIUS = 16;

// Frames to seconds, since the board's motion vocabulary is written in frames at 30 fps.
export const fr = (frames: number) => frames / 30;
// Expo-out normalised to land exactly on 1, so counted numbers finish on their value.
export const EXPO = (x: number) => (x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / (1 - Math.pow(2, -10)));
export const DOLLY = Easing.bezier(0.2, 0.7, 0.2, 1);
export const EXIT = Easing.in(Easing.cubic);
