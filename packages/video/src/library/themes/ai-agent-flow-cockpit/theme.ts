// AI agent flow cockpit tokens: paper page, dark cockpit panel with a teal-brown glow, grey wires that light green, one amber highlight; Inter Tight headlines, Inter UI, JetBrains Mono for sources and tool calls.
import { Easing, interpolateColors } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const UI = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const HEAD = loadTight("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

export const C = {
  page: "#FAF9F6",
  pageDot: "#E9E5DD",
  pageDotHi: "#D3CDC1",
  ink: "#16181A",
  inkMuted: "#6B6F73",
  panel: "#14171A",
  glowA: "#1E3A36",
  glowB: "#3A2A22",
  card: "#1D2226",
  cardHi: "#262D32",
  well: "#161A1D",
  border: "#2E353A",
  chipLine: "#2C4641",
  text: "#E9ECEF",
  muted: "#8B949B",
  wire: "#4A545B",
  green: "#3BB38A",
  greenHi: "#7FE0BD",
  amber: "#E6B04B",
  // Errors only: a muted coral so a failed call reads at a glance without turning the cockpit alarming.
  red: "#E0685A",
};

// Sizes are the web board's values scaled up for a 1080p frame read on a phone.
export const R = { panel: 36, card: 26, wire: 22 };
export const SIZE = { body: 36, label: 30, mono: 28, head: 104 };

// Expo-out that actually lands on 1 (Remotion's stops at 0.999, which leaves counters one short).
export const EXPO = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const SINE = Easing.inOut(Easing.sin);
export const IN = Easing.in(Easing.cubic);

// Board timings are in frames at 30 fps; pieces take seconds.
export const fr = (frames: number) => frames / 30;

export const mix = (a: string, b: string, k: number) => interpolateColors(Math.min(1, Math.max(0, k)), [0, 1], [a, b]);
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
