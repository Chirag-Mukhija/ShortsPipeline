// Math-explainer dark board tokens: near-black board, Manim's colour set, STIX Two for maths, Inter for prose, stroke and timing constants.
import { Easing } from "remotion";
import { loadFont as loadStix } from "@remotion/google-fonts/STIXTwoText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const STIX_OPTS = { weights: ["400", "600"] as ("400" | "600")[], subsets: ["latin", "latin-ext", "greek"] as ("latin" | "latin-ext" | "greek")[] };
export const MATH = loadStix("normal", STIX_OPTS).fontFamily;
loadStix("italic", STIX_OPTS);
export const SANS = loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const BOARD = "#1C1C1C";
export const BOARD_EDGE = "#121212";
export const INK = "#E8E8E8";
export const BLUE = "#58C4DD";
export const YELLOW = "#F5D547";
export const GOLD = "#F5C542";
export const GREEN = "#83C167";
export const RED = "#FC6255";
export const PURPLE = "#9A72AC";
export const MUTED = "#888888";
export const DIM = "#5A5A5A";

// Named colours usable inside equations as \c{blue}{...}.
export const NAMED: Record<string, string> = { ink: INK, blue: BLUE, yellow: YELLOW, gold: GOLD, green: GREEN, red: RED, purple: PURPLE, muted: MUTED };

// One board unit, the spacing of the coordinate grid: 16 x 9 units fill the frame.
export const UNIT = 120;
export const STROKE = 3.5;

// Manim's rate functions: smooth for most moves, in-out-sine for equation transforms, near-linear for Write.
export const SMOOTH = Easing.bezier(0.45, 0, 0.25, 1);
export const SINE = Easing.inOut(Easing.sin);
export const LIN = Easing.bezier(0.3, 0.1, 0.7, 0.9);
// there-and-back: 0 → 1 → 0 over the ramp, for Indicate.
export const thereBack = (p: number) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p));
