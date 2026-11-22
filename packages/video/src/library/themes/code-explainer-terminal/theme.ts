// Code-explainer tokens: GitHub-dark editor palette, syntax colours, JetBrains Mono / Inter / Space Grotesk, and the snappy frame-based timings of the format.
import { Easing } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { FPS } from "../../core/video";

export const MONO = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const POPF = loadInter("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily;
export const HEAD = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;

export const BG = "#0D1117";
export const PANEL = "#161B22";
export const PANEL_HI = "#1C2330";
export const BORDER = "#30363D";
export const TEXT = "#E6EDF3";
export const MUTED = "#8B949E";
export const ORANGE = "#FF6A3D";
export const BLUE = "#58A6FF";
export const GREEN = "#3FB950";
export const PURPLE = "#BC8CFF";
export const RED = "#FF7B72";
export const YELLOW = "#E3B341";

// GitHub-dark syntax mapping, so code reads like the editor the audience already knows.
export const SYN = {
  keyword: "#FF7B72",
  string: "#A5D6FF",
  fn: "#D2A8FF",
  num: "#79C0FF",
  comment: "#8B949E",
  type: "#FFA657",
  prop: "#79C0FF",
  tag: "#7EE787",
  plain: TEXT,
} as const;

// JetBrains Mono's advance is exactly 0.6 em, so columns map to pixels without measuring.
export const CH = 0.6;

// Frames → seconds: the board speaks in frames (6 f wipe, 8 f pop), pieces take seconds.
export const fr = (n: number) => n / FPS;
// Back-out(1.7) for keyword pops, back-out(1.5) for cards rising.
export const BACK17 = Easing.out(Easing.back(1.7));
export const BACK15 = Easing.out(Easing.back(1.5));
export const SNAP = Easing.out(Easing.cubic);

// The caret blinks on a 15-frame half period and stays solid while typing.
export const caretOn = (f: number) => Math.floor(f / 15) % 2 === 0;

// A seeded RNG (mulberry32) for glitch slices and shakes.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};
