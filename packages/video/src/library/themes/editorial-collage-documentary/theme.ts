// Editorial collage tokens: newsprint paper, ink, signal red, highlighter yellow and a blue-grey plate; Playfair Display headlines, Oswald labels, Special Elite typed captions.
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadElite } from "@remotion/google-fonts/SpecialElite";

export const SERIF = loadPlayfair("normal", { weights: ["400", "700", "900"], subsets: ["latin"] }).fontFamily;
loadPlayfair("italic", { weights: ["400", "700"], subsets: ["latin"] });
export const COND = loadOswald("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const TYPE = loadElite("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#EDE6D6";
// Fresh cut paper: photo rims, clippings, slips. A touch lighter than the desk so cutouts lift off it.
export const SHEET = "#F7F3EA";
export const INK = "#151515";
export const RED = "#E4312B";
export const YELLOW = "#FFE04A";
export const PLATE = "#3C4A5C";
export const MUTED = "#8A8577";

// Hard, unblurred drop shadow: the "cut and glued" tell of the look.
export const SHADOW = "rgba(21,21,21,0.34)";
export const HARD_X = 6;
export const HARD_Y = 8;
export const hardShadow = (k = 1) => `drop-shadow(${HARD_X * k}px ${HARD_Y * k}px 0 ${SHADOW})`;
