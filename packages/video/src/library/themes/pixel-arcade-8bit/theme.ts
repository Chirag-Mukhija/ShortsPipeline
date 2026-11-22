// Pixel arcade 8-bit tokens: the cabinet palette and its sprite shades, Press Start 2P, and the 8 px grid everything snaps to.
import { loadFont } from "@remotion/google-fonts/PressStart2P";

export const PX = loadFont("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

// The board's seven colours.
export const BG = "#0B0F2A";
export const INK = "#FFFFFF";
export const CYAN = "#00F0FF";
export const PINK = "#FF3D9A";
export const YELLOW = "#FFE14D";
export const GROUND = "#2B3A67";
export const DANGER = "#FF4D4D";

// One darker step of each, used only as sprite shading, bevels and hard shadows so the palette stays limited.
export const SHADE = "#05071A";
export const NIGHT = "#161D4A";
export const GROUND_LT = "#4A5D9C";
export const CYAN_DK = "#0A8FB0";
export const PINK_DK = "#A3195E";
export const YELLOW_DK = "#E09A1C";
export const DANGER_DK = "#A61E35";

// Sprite colour keys: every sprite map in sprites.ts is written with these single letters ("." is transparent).
export const SPAL: Record<string, string> = {
  k: SHADE,
  n: NIGHT,
  w: INK,
  c: CYAN,
  C: CYAN_DK,
  p: PINK,
  P: PINK_DK,
  y: YELLOW,
  Y: YELLOW_DK,
  r: DANGER,
  R: DANGER_DK,
  g: GROUND,
  G: GROUND_LT,
};

// The grid: positions snap to 8 px and type sizes are multiples of 8 so pixels stay square.
export const U = 8;
export const snap = (v: number, step = U) => Math.round(v / step) * step;

// The four colours the emphasis cycle steps through.
export const CYCLE = [YELLOW, PINK, CYAN, INK];
