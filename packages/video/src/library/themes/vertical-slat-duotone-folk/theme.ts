// Vertical slat duotone folk tokens: umber and wheat-tan duotone (sand for light sections), Unbounded for slatted wordmarks and wide labels, Cormorant Garamond for quotes and reading text, and the slat grid.
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";

export const WIDE = loadUnbounded("normal", { weights: ["500", "800"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadCormorant("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
loadCormorant("italic", { weights: ["500", "600"], subsets: ["latin"] });

// The board's duotone. White and full colour only ever appear inside a revealed photo.
export const UMBER = "#2B2622";
export const TAN = "#B79F72";
export const SAND = "#C9B28A";
// Ground texture only: a hair lighter than umber / darker than sand, so the warp threads read as weave, not as a third colour.
export const UMBER_HI = "#332D28";
export const SAND_LO = "#BFA77E";

// A section is either dark (tan bars on umber) or sand (umber bars on sand); the same artwork renders in both.
export type Section = "dark" | "sand";
export const INK: Record<Section, string> = { dark: TAN, sand: UMBER };
export const GROUND: Record<Section, string> = { dark: UMBER, sand: SAND };

// Slat grid: art bars sit on a 6 px period at up to ~2:3 duty; type uses the same period so art and letters weave together.
export const PERIOD = 6;
export const DUTY = 0.62;
// Wide labels: the board's "tiny wide caps", kept at the 28 px floor for phones.
export const LABEL = 28;
export const TRACK = "0.16em";
// Safe margin on the 1920×1080 canvas.
export const M = 96;
