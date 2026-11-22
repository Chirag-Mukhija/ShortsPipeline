// Risograph tokens: cream stock, three fluorescent spot inks plus riso black, the press timings, and Bricolage / Rubik Mono One / Courier Prime.
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadRubikMono } from "@remotion/google-fonts/RubikMonoOne";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";

export const DISPLAY = loadBricolage("normal", { weights: ["500", "800"], subsets: ["latin"] }).fontFamily;
export const SHOUT = loadRubikMono("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadCourier("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#f4efe4";
export const PINK = "#ff48b0";
export const BLUE = "#0078bf";
export const YELLOW = "#ffe800";
export const BLACK = "#1a1a1a";

// Plates are always one of these drums; anything else would break the overprint maths.
export const INKS = { pink: PINK, blue: BLUE, yellow: YELLOW, black: BLACK } as const;
export type InkName = keyof typeof INKS;

// What each pair multiplies to on the cream stock, for labels and planning a layout's colours.
export const OVERPRINT = {
  "pink+blue": "violet-navy",
  "pink+yellow": "red-orange",
  "blue+yellow": "green",
  "all three": "near black",
} as const;

// Press timings in frames at 30 fps (from the board): each later plate lands 4 f after the one before,
// misregistration springs from 6 px to its resting offset, a kick widens it by 6 px for 4 f, exits screen out in 12 f.
export const PRESS = { plateGap: 4, landOffset: 6, rest: 3, kick: 6, exit: 12, grainEvery: 2, jitterEvery: 3 } as const;

// Halftone screen angles per ink, offset like a real separation so overlaps form rosettes, not stripes.
export const SCREEN_ANGLE: Record<string, number> = { [PINK]: 15, [BLUE]: 75, [YELLOW]: 0, [BLACK]: 45 };
