// Named style presets for kit templates: each maps a library theme's tokens onto the plain Style a template reads, so previews and videos can swap looks without touching template code.
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import type { Style } from "./contract";

const inter = loadInter("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
const mono = loadMono("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;
const caveat = loadCaveat("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
const serif = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const STYLES = {
  // Video 001's look: paper, graphite, one coral accent, handwriting.
  "hand-drawn": { bg: "#f4efe4", surface: "#fbf8f1", ink: "#2b2926", muted: "#8f897e", accent: "#e4532f", accent2: "#2f6fe4", display: caveat, body: inter, mono, radius: 18, motion: "hand" },
  // Neutral studio default: warm grey canvas, black ink, one orange accent.
  studio: { bg: "#efede8", surface: "#ffffff", ink: "#141414", muted: "#77736b", accent: "#ff5a1f", accent2: "#1f6bff", display: inter, body: inter, mono, radius: 22, motion: "snappy" },
  // Dark product look for dev topics.
  night: { bg: "#0c0d10", surface: "#16181d", ink: "#f2f2f0", muted: "#8a8f98", accent: "#7cf29c", accent2: "#7aa2ff", display: inter, body: inter, mono, radius: 16, motion: "snappy" },
  // Editorial film look for stories and history.
  film: { bg: "#11100e", surface: "#1d1b17", ink: "#f3ead8", muted: "#a39a86", accent: "#e8b04a", accent2: "#c2553a", display: serif, body: inter, mono, radius: 4, motion: "calm" },
} satisfies Record<string, Style>;

export type StyleName = keyof typeof STYLES;
