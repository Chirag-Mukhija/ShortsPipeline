// Frosted glass tokens: the indigo-to-coral colour field, white glass with specular edges, one cyan accent, Plus Jakarta Sans with an Instrument Serif italic word, springs and colour helpers.
import { spring } from "remotion";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { FPS } from "../../core/video";

export const SANS = loadJakarta("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
// One italic serif word per headline is the theme's signature voice (the Superdesign glass reference).
export const SERIF = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const DEEP = "#1B1740";
export const VIOLET = "#3A2A8C";
export const CORAL = "#FF7A59";
export const CYAN = "#8EF0FF";
export const ORCHID = "#B26BFF";
export const ROSE = "#FF5FA2";
export const AZURE = "#4F7BFF";
export const PEACH = "#FFC59E";
export const MINT = "#7CF2C4";

export const INK = "#FFFFFF";
// Secondary copy sits a little above the board's 0.65 so labels survive a bright blob behind the glass.
export const SOFT = "rgba(255,255,255,0.74)";
export const MUTE = "rgba(255,255,255,0.52)";

export const RADIUS = 32;
export const BLUR = 24;
export const SHADOW = "0 40px 80px -24px rgba(10,5,40,0.55), 0 14px 30px -10px rgba(10,5,40,0.35)";
// Legibility on glass: a soft violet halo, never a hard drop shadow.
export const TEXT_SHADOW = "0 2px 18px rgba(20,10,60,0.35)";

export type Tint = "clear" | "milk" | "cyan" | "coral" | "violet" | "smoke";
// Glass fill as a top-lit gradient: brighter at the top edge where the light hits.
export const TINT: Record<Tint, [string, string]> = {
  clear: ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"],
  milk: ["rgba(255,255,255,0.26)", "rgba(255,255,255,0.12)"],
  cyan: ["rgba(142,240,255,0.22)", "rgba(142,240,255,0.07)"],
  coral: ["rgba(255,122,89,0.26)", "rgba(255,122,89,0.08)"],
  violet: ["rgba(178,107,255,0.24)", "rgba(120,80,255,0.08)"],
  smoke: ["rgba(30,18,80,0.34)", "rgba(20,12,60,0.22)"],
};

// A colour field: a two-stop base and the blobs that drift behind the glass.
export type Field = { base: [string, string]; blobs: string[] };
export const FIELDS: Record<string, Field> = {
  dusk: { base: [DEEP, VIOLET], blobs: [CORAL, ORCHID, AZURE, ROSE, CYAN] },
  lagoon: { base: ["#0E1E45", "#1B3A8C"], blobs: [CYAN, AZURE, MINT, ORCHID, "#5AD7FF"] },
  ember: { base: ["#2A0F3A", "#5A1F6B"], blobs: [CORAL, PEACH, ROSE, "#FF9F43", ORCHID] },
};

const RGB: Record<string, [number, number, number]> = {};
// Hex to rgba; cached because every card calls it every frame.
export const rgba = (hex: string, a: number) => {
  let c = RGB[hex];
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = RGB[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
};

export type SpringCfg = { damping?: number; stiffness?: number; mass?: number };
// The theme's pop: a soft spring that overshoots a little, like glass settling on a cushion.
export const POPCFG: SpringCfg = { damping: 13, stiffness: 170, mass: 0.9 };
export const SETTLE: SpringCfg = { damping: 20, stiffness: 120, mass: 1 };
export const sp = (t: number, at: number, config: SpringCfg = POPCFG) =>
  spring({ frame: Math.max(0, (t - at) * FPS), fps: FPS, config });
export const fr = (frames: number) => frames / FPS;
