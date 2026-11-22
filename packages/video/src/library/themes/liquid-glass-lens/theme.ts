// Liquid glass lens tokens: the sunlit bamboo plate's colours, clear-glass optics defaults, Inter Tight and Geist Mono, springs and frame helpers.
import { spring } from "remotion";
import { loadFont as loadTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { FPS } from "../../core/video";

export const SANS = loadTight("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;

// The plate carries the colour; glass only bends it. These are the grove's own greens and its low sun.
export const HAZE = "#EEF3CF";
export const SUN = "#FFF1B8";
export const LEAF = "#7DB24F";
export const MOSS = "#3E7434";
export const DEEP = "#12301B";
export const STALK = "#5C9640";
// One accent, taken from the backlit leaves, kept for the number or word that matters.
export const LIME = "#E4FF8A";

export const INK = "#FFFFFF";
export const SOFT = "rgba(255,255,255,0.82)";
// White text on clear glass over a busy plate needs a halo, never a hard shadow.
export const HALO = "0 2px 14px rgba(6,24,10,0.55), 0 0 2px rgba(6,24,10,0.35)";

// Board optics (ybouane LiquidGlass capture): refraction 0.69, chroma 0.05, rim highlight 55 % lit side / 20 % far side.
export const OPTICS = {
  refraction: 0.69,
  chroma: 0.05,
  bevel: 40,
  rimLit: 0.55,
  rimFar: 0.2,
  shadow: 0.25,
};

export type SpringCfg = { stiffness: number; damping: number; mass?: number };
// Condense: the board's 18 f entrance spring.
export const CONDENSE: SpringCfg = { stiffness: 180, damping: 16 };
// Morph and tab slides: the board's merge spring.
export const MORPH: SpringCfg = { stiffness: 140, damping: 15 };

export const fr = (frames: number) => frames / FPS;

// A spring driven by seconds, so cue times stay in seconds like every other library piece.
export const sp = (t: number, at: number, cfg: SpringCfg = CONDENSE) =>
  t < at ? 0 : spring({ frame: (t - at) * FPS, fps: FPS, config: { mass: 1, ...cfg } });
