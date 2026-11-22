// Highlight block ticker tokens: pure black, white and grey type, the five cycling block colours, JetBrains Mono on a fixed character grid, and the stepped colour clock.
import { Easing } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const MONO = loadMono("normal", { weights: ["500", "700", "800"], subsets: ["latin"] }).fontFamily;

export const BLACK = "#000000";
export const WHITE = "#F5F5F5";
export const GREY = "#8A8A8A";
// The idle scanner and table rules: present on black, never competing with a coloured block.
export const DIM = "#2C2C2C";
export const FAINT = "#141414";

export const RED = "#FF4D4D";
export const YELLOW = "#FFD400";
export const GREEN = "#3DDC97";
export const BLUE = "#4DA3FF";
export const VIOLET = "#C77DFF";
export const CYCLE = [RED, YELLOW, GREEN, BLUE, VIOLET];
// The colour a block settles on when a scene doesn't pick one.
export const BRAND = YELLOW;

// Every glyph sits in a cell 0.6 em wide (JetBrains Mono's advance), so word boxes are pure arithmetic, never measured.
export const CH = 0.6;
export const M = 96;
export const FPS = 30;

export const EXPO_OUT = Easing.out(Easing.exp);
export const EXPO_IO = Easing.inOut(Easing.exp);
export const IN_QUAD = Easing.in(Easing.quad);

// ColorStep: a palette colour that changes every `step` frames with no tween in between.
export const colorStep = (frames: number, step = 2, offset = 0, palette: string[] = CYCLE) =>
  palette[(((Math.floor(frames / step) + offset) % palette.length) + palette.length) % palette.length]!;
