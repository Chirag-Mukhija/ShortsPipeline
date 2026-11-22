// Holographic HUD tokens: near-black field, cyan hologram light with violet, alert and ok signals, Chakra Petch / Rajdhani / Azeret Mono, glow and chromatic helpers.
import { loadFont as loadChakra } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as loadRajdhani } from "@remotion/google-fonts/Rajdhani";
import { loadFont as loadAzeret } from "@remotion/google-fonts/AzeretMono";

// Chakra Petch instead of the board's Orbitron: its chamfered corners echo the notched panels, and it reads as designed rather than "sci-fi default".
export const HEAD = loadChakra("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const LABEL = loadRajdhani("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
// Azeret Mono: tabular by nature, and its light weight makes big numerals look like instrument readouts.
export const MONO = loadAzeret("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] }).fontFamily;

export const BG = "#04070D";
export const HOLO = "#35E6FF";
export const VIOLET = "#7A5CFF";
export const ALERT = "#FF4D6D";
export const OK = "#3DFFB0";
export const INK = "#DFFBFF";
// Secondary copy: a cool grey that still holds 7:1 on BG at label sizes.
export const MUTED = "#8FB4BF";
export const FILL = "rgba(53,230,255,0.08)";
export const LINE = "rgba(53,230,255,0.6)";
// The negative palette for the incident moment: the HUD prints on light instead of glowing on dark.
export const PAPER = "#E8F4F6";
export const CARBON = "#081018";

export type Tone = "holo" | "violet" | "alert" | "ok";
export const TONE: Record<Tone, string> = { holo: HOLO, violet: VIOLET, alert: ALERT, ok: OK };

const RGB: Record<string, [number, number, number]> = {};
// Hex to rgba with alpha; cached because pieces call it every frame.
export const rgba = (hex: string, a: number) => {
  let c = RGB[hex];
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = RGB[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
};

// Text glow as text-shadow (cheap in software raster), instead of filter: drop-shadow.
export const glowText = (color = HOLO, k = 1) => `0 0 ${10 * k}px ${rgba(color, 0.55)}, 0 0 ${2 * k}px ${rgba(color, 0.8)}`;
// Chromatic offset: alert red one way, hologram cyan the other; s is the split in px.
export const chroma = (s: number) => (s <= 0.05 ? "none" : `${-s}px 0 ${rgba(ALERT, 0.7)}, ${s}px 0 ${rgba(HOLO, 0.7)}`);
export const shadows = (...xs: string[]) => xs.filter((x) => x && x !== "none").join(", ") || "none";

export const LABEL_STYLE = { fontFamily: LABEL, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em" } as const;
