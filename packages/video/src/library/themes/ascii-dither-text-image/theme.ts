// ASCII/dither theme tokens: paper-grey and phosphor-black grounds, one blood-red accent, JetBrains Mono for glyphs and labels, Newsreader for the human headline, and the luminance ramps.
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/Newsreader";

export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily;
export const SERIF_IT = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#ECECEC";
export const INK = "#111111";
export const GREY = "#8A8A8A";
export const FAINT = "#C9C9C9";
export const BLACK = "#0A0A0A";
export const PHOSPHOR = "#E8E8E8";
export const DIM = "#6B6B6B";
// The single accent: one element per scene, never a second red thing.
export const RED = "#D40000";
// Alternate accent for dark, terminal-flavoured scenes; never on the same screen as RED.
export const GREEN = "#39FF14";

export type Ground = "paper" | "black";
export const GROUND = { paper: { bg: PAPER, ink: INK, soft: GREY, faint: FAINT }, black: { bg: BLACK, ink: PHOSPHOR, soft: DIM, faint: "#262626" } } as const;

// Light → dark (more ink). On the black ground the same index reads as brighter phosphor.
export const RAMP = " .:-=+*#%@";
export const DIGITS = " 0123456789";
// Glyphs a scrambling cell may flash through: the ramp's inked marks plus a few letterforms so noise reads as "text".
export const NOISE = ".:-=+*#%@/\\<>{}[]01xX$&";

// Glyph cell: a JetBrains Mono advance is 0.6 em, so a 12 px column takes a 20 px font on a 20 px row (line-height 1.0).
export const CELL = 12;
export const ADV = 0.6;
export const M = 96;
