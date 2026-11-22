// Bauhaus geometric tokens: cream paper, the three primaries plus black, Jost lowercase and Space Mono, a 40 px snap grid and the mechanical easings.
import { Easing } from "remotion";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import { loadFont as loadMono } from "@remotion/google-fonts/SpaceMono";
import { FPS } from "../../core/video";

export const GEO = loadJost("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const CREAM = "#F2E8D5";
export const RED = "#D62828";
export const YELLOW = "#F7B500";
export const BLUE = "#1D3DA8";
export const BLACK = "#111111";
export const WHITE = "#FFFFFF";
// Kandinsky's 1923 survey pairing, used whenever a piece needs "one shape per item": triangle-yellow, square-red, circle-blue.
export const KANDINSKY = { tri: YELLOW, square: RED, circle: BLUE } as const;
export const PRIMARIES = [RED, YELLOW, BLUE, BLACK] as const;

// Black rules are the only lines in this theme.
export const RULE = 6;
export const HAIR = 3;
// Everything locks to a 40 px grid; 120 px is the composition module (16 × 9 across the frame).
export const GRID = 40;
export const MODULE = 120;
export const MARGIN = 96;

// Seconds for a frame count, so motion reads in the board's frame numbers.
export const fr = (frames: number) => frames / FPS;
// Board timings: entrances 16 f back-out(1.4), rotations 12 f expo-in-out, exits 12 f ease-in, flashes 3 f.
export const ENTER = fr(16);
export const TURN = fr(12);
export const EXIT = fr(12);
export const FLASH = fr(3);
export const BACK = Easing.out(Easing.back(1.4));
export const EXPO = Easing.inOut(Easing.exp);
export const IN = Easing.in(Easing.cubic);
// In-out with a small overshoot: a rotation that clicks into its detent.
export const SNAP = Easing.bezier(0.7, 0, 0.3, 1.25);
