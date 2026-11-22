// Split-flap departure board tokens: board blacks, plastic cell faces, warm-white ink with amber/green/red status colours, Oswald flaps and Barlow Condensed painted signage.
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadBarlow } from "@remotion/google-fonts/BarlowCondensed";

// The flap print: tall condensed caps, tabular by construction because every glyph owns a cell.
export const FLAP = loadOswald("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
// Paint on the board's frame (headers, platform names): a different voice from the flaps on purpose.
export const PAINT = loadBarlow("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;

export const WALL = "#0B0C0D";
export const BOARD = "#111214";
export const SLOT = "#0A0B0C";
export const HINGE = "#08090A";
export const FACE_TOP = "#26272B";
export const FACE_TOP2 = "#202125";
export const FACE_BOT = "#1C1D20";
export const FACE_BOT2 = "#17181B";
export const BEZEL_HI = "#34363B";
export const BEZEL_LO = "#16171A";

export const INK = "#F2EFE6";
export const AMBER = "#FFB000";
export const GREEN = "#4ADE80";
export const RED = "#FF5A4F";
// Secondary print: still 7:1 on a cell face, for columns that should sit back.
export const DIM = "#B4AFA3";

export type Tone = "ink" | "amber" | "green" | "red" | "dim";
export const TONE: Record<Tone, string> = { ink: INK, amber: AMBER, green: GREEN, red: RED, dim: DIM };

// Cell aspect from the board: width = 0.62 × height; gaps 6–12 px scale with the cell.
export const ASPECT = 0.62;
export const cellW = (h: number) => Math.round(h * ASPECT);
export const gapFor = (h: number) => Math.round(Math.min(12, Math.max(5, h * 0.07)));
export const pitch = (h: number) => cellW(h) + gapFor(h);
export const rowWidth = (h: number, cols: number) => cols * cellW(h) + (cols - 1) * gapFor(h);

export const M = 96;
export const FPS = 30;
