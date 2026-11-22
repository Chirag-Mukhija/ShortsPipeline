// Flat vector explainer tokens: night-sky gradients per chapter, white ink, four glowing accents, Poppins headlines, Inter labels and the theme's bouncy easing.
import { Easing, interpolateColors } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const HEAD = loadPoppins("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const LABEL = loadInter("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;

export const INK = "#F4F6FF";
// Secondary text: the board's muted #5B6491 is too dark to read on the sky, so text uses this lifted mist and shapes keep MUTED.
export const MIST = "#B3BBE6";
export const MUTED = "#5B6491";
export const NIGHT = "#0E1430";
export const TEAL = "#2EE6C5";
export const CORAL = "#FF6B6B";
export const AMBER = "#FFC857";
export const VIOLET = "#8B7BFF";
export const ACCENTS = { teal: TEAL, coral: CORAL, amber: AMBER, violet: VIOLET } as const;
export type Accent = keyof typeof ACCENTS;

// Sky gradients (top → bottom); each chapter picks one so the hue shifts as the story moves on.
export const SKIES = {
  indigo: ["#141B3A", "#1E2A5A"],
  dusk: ["#2B1B3D", "#4A2950"],
  deep: ["#0C1230", "#182452"],
  lagoon: ["#0F2036", "#143E50"],
} as const;
export type SkyTone = keyof typeof SKIES;

// Plates for cards and bubbles: a lifted navy, never an outline.
export const PLATE = "#26336B";
export const PLATE_HI = "#31407F";

export const tint = (hex: string, k: number) => interpolateColors(k, [0, 1], [hex, "#FFFFFF"]);
export const shade = (hex: string, k: number) => interpolateColors(k, [0, 1], [hex, NIGHT]);
export const alpha = (hex: string, a: number) => `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}`;

// Motion vocabulary from the board: back-out(1.6) pops, in-cubic exits, out-cubic draws.
export const BACK = Easing.out(Easing.back(1.6));
export const BIG_BACK = Easing.out(Easing.back(2.4));
export const IN = Easing.in(Easing.cubic);
export const EXPO = Easing.out(Easing.exp);
export const POP_S = 0.53; // 16 frames
export const EXIT_S = 0.3; // 9 frames
export const STAGGER_S = 0.1; // 3 frames
export const DRAW_S = 0.67; // 20 frames
