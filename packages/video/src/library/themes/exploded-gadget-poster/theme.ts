// Exploded-gadget-poster tokens: canary yellow field, ink, hero grey, one violet accent, glossy plastic shades, Bricolage Grotesque 800 headlines and Inter body.
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const DISPLAY = loadBricolage("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily;
export const BODY = loadInter("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;

export const YELLOW = "#FFC800";
export const YELLOW_HI = "#FFD84A";
export const YELLOW_LO = "#E8AE00";
export const INK = "#111111";
export const GREY = "#7A7D80";
export const GREY_HI = "#9A9DA0";
export const VIOLET = "#6B2FE0";
export const VIOLET_LO = "#4E1FAE";
export const WHITE = "#FFFFFF";

// Plastic and metal finishes for the drawn gadgets: face, side (extrusion), and the glossy highlight.
export type Finish = { face: string; side: string; hi: string; edge: string };
export const FINISH = {
  graphite: { face: "#2B2C2F", side: "#17181A", hi: "#5A5C61", edge: "#0B0B0C" },
  white: { face: "#F4F3EF", side: "#C9C7C0", hi: "#FFFFFF", edge: "#A9A79F" },
  silver: { face: "#C3C6CA", side: "#8E9196", hi: "#E9EBEE", edge: "#6E7176" },
  violet: { face: VIOLET, side: VIOLET_LO, hi: "#9466F0", edge: "#3A1585" },
  yellow: { face: "#FFD23A", side: "#D9A300", hi: "#FFE68A", edge: "#B88A00" },
} satisfies Record<string, Finish>;
export type FinishName = keyof typeof FINISH;

// Body text never drops below 36 px and labels below 28 px, so everything still reads on a phone.
export const SIZE = { mega: 260, wordmark: 230, headline: 128, title: 84, claim: 112, body: 38, label: 30 };
export const MARGIN = 96;
// The board's soft drop shadow under objects: 60 px blur at 18 % ink.
export const SHADOW_ALPHA = 0.18;
