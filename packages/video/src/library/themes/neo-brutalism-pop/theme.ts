// Neo-brutalism pop tokens: paper and sky fields, pure black ink, five loud accents, chunky type, thick borders and hard offset shadows.
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

// Headlines (tight tracking), body copy, shouting, tiny labels.
export const HEAD = loadSpaceGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const BODY = loadDMSans("normal", { weights: ["500", "700", "800"], subsets: ["latin"] }).fontFamily;
export const SHOUT = loadArchivoBlack("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadSpaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#F4F4F0";
export const SKY = "#DBEAFE";
export const INK = "#000000";
export const WHITE = "#FFFFFF";
export const PINK = "#FF90E8";
export const YELLOW = "#FFC900";
export const TEAL = "#23A094";
export const GREEN = "#00D26A";
export const BLUE = "#3B82F6";
export const ACCENTS = [PINK, YELLOW, TEAL, GREEN, BLUE] as const;

// Surface: every box is a 4 px black border with the same shape repeated 8 px down-right in solid black, never blurred.
export const BORDER = 4;
export const SHADOW = 8;
export const RADIUS = 10;
export const TRACK = "-0.035em";

export const border = (w = BORDER) => `${w}px solid ${INK}`;
export const hardShadow = (s = SHADOW) => (s <= 0 ? "none" : `${s}px ${s}px 0 0 ${INK}`);
