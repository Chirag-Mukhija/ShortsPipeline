// Hand-drawn theme tokens: paper, graphite ink, pencil grey, one coral accent, Caveat handwriting and Inter for numbers.
import { interpolateColors } from "remotion";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const HAND = loadCaveat("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const SANS = loadInter("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#f4efe4";
export const DOT = "#d6cdbb";
export const INK = "#2b2926";
export const PENCIL = "#8f897e";
// The single accent: reserve it for the one thing that matters most in a scene, so it keeps its weight.
export const ACCENT = "#e4532f";

// 0 = faded pencil grey, 1 = full graphite.
export const inkCol = (ink: number) => interpolateColors(ink, [0, 1], [PENCIL, INK]);
