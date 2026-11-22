// Japanese minimal (ma) tokens: washi and sumi tones, one vermillion accent, light Cormorant for words, Zen Kaku Gothic for tracked labels, the grid and the slow timing scale.
import { Easing } from "remotion";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadZen } from "@remotion/google-fonts/ZenKakuGothicNew";

export const SERIF = loadCormorant("normal", { weights: ["300", "400", "500"], subsets: ["latin"] }).fontFamily;
loadCormorant("italic", { weights: ["300", "400"], subsets: ["latin"] });
export const LABEL = loadZen("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const WASHI = "#F7F5F0";
export const WASHI_DEEP = "#EFEBE2";
export const SUMI = "#1C1C1C";
// Labels sit darker than the board's #9A9A94 so 28 px caps still read on a phone; GREY is for marks, never for words.
export const SUMI_SOFT = "#5E5C57";
export const GREY = "#9A9A94";
export const MIST = "#E4DFD4";
// The one accent. One vermillion thing per scene: a seal, a dot, an emphasis mark.
export const SHU = "#D8412F";
export const INDIGO = "#2A3B5C";

// 12-column page: one grid unit is 160 px; thirds fall at 640/1280 and 360/720.
export const UNIT = 160;
export const MARGIN = 192;
export const THIRD = { x1: 640, x2: 1280, y1: 360, y2: 720 };

// Board timing: entrances 30–45 f cubic in-out with a 6 px drift, exits 24 f with no motion, a draw-on 40 f.
export const SLOW = Easing.inOut(Easing.cubic);
export const ENTER_S = 1.3;
export const EXIT_S = 0.8;
export const DRAW_S = 1.35;
export const DRIFT = 6;

export const TRACK_CAPS = "0.32em";
