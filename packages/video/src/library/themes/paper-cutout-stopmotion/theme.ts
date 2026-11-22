// Paper cut-out stop-motion tokens: kraft board, five paper colours, ink, Fredoka / DM Serif / Space Mono, the stop-motion hold and depth-plane shadows.
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadDMSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

// Headlines and numbers (rounded, cut-friendly), a serif for quotes and contrast, a typewriter mono for tape labels.
export const HEAD = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadDMSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
loadDMSerif("italic", { weights: ["400"], subsets: ["latin"] });
export const MONO = loadSpaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const KRAFT = "#C9A27A";
export const KRAFT_DK = "#A88052";
export const CREAM = "#F3E9D2";
// The white core that shows where coloured paper tears.
export const CORE = "#FBF7EE";
export const TOMATO = "#E2553D";
export const TEAL = "#2A9D8F";
export const MUSTARD = "#E9B44C";
export const INK = "#2B2B2B";
export const TEAL_LT = "#8CC5BB";
export const TEAL_DK = "#1F776C";
export const TOMATO_DK = "#B8402C";
export const PEACH = "#EFC39C";
export const BRASS = "#C9A040";
export const TAPE = "rgba(236, 225, 192, 0.9)";
// Warm cast shadow: a desk lamp on kraft never throws pure black.
export const SHADOW_RGB = "40, 24, 8";

// Stop-motion holds: poses and entrances on threes (10 fps), camera moves on twos.
export const STEP = 3;
export const CAM_STEP = 2;

// Depth planes: the further a piece sits above the board (z, plus any lift), the further and softer its shadow falls (light from top-left).
export const castShadow = (z: number) => {
  const dx = 2 + z * 3;
  const dy = 3 + z * 3.6;
  const blur = 0.5 + z * 1.5;
  const a = Math.max(0.16, 0.36 - z * 0.035);
  return `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur.toFixed(1)}px rgba(${SHADOW_RGB}, ${a.toFixed(3)}))`;
};
