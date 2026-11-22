// Variable font breathing type tokens: specimen paper and ink, one orange-red accent, three variable families (Roboto Flex, Fraunces, Recursive) and the axis vocabulary.
import { Easing } from "remotion";
import { loadVariableFont as loadFlex } from "@remotion/google-fonts/RobotoFlex";
import { loadVariableFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadVariableFont as loadRecursive } from "@remotion/google-fonts/Recursive";

// Variable loaders take no `weights`: one file carries every axis, so only the subset is passed.
// Roboto Flex: wght 100–1000, wdth 25–151, slnt -10–0, opsz 8–144, GRAD, XTRA. The display face for everything big.
export const FLEX = loadFlex("oblique 0deg 10deg", { subsets: ["latin"] }).fontFamily;
// Fraunces: wght 100–900, opsz 9–144, SOFT 0–100, WONK 0–1. The quote voice; SOFT is its breath.
export const SERIF = loadFraunces("normal", { subsets: ["latin"] }).fontFamily;
// Recursive: wght 300–1000, MONO 0–1, CASL 0–1, slnt -15–0. Labels, readouts and sources.
export const MONO = loadRecursive("oblique 0deg 15deg", { subsets: ["latin"] }).fontFamily;

export const PAPER = "#F3F1EC";
export const INK = "#111111";
export const NIGHT = "#0E0E0E";
export const CHALK = "#F5F5F2";
export const ACCENT = "#FF4A1C";
// Secondary ink for labels and spent states; 5:1 on paper so it still reads on a phone.
export const MUTED = "#6F6A62";
// Ghost type and hairline guides: present, never competing.
export const GHOST = "#EAE7E0";
export const RULE = "#D2CDC2";

export type Tone = "paper" | "night";
export const TONE: Record<Tone, { bg: string; ink: string; muted: string; ghost: string; rule: string; accent: string }> = {
  paper: { bg: PAPER, ink: INK, muted: MUTED, ghost: GHOST, rule: RULE, accent: ACCENT },
  night: { bg: NIGHT, ink: CHALK, muted: "#9A968E", ghost: "#1F1E1C", rule: "#34322E", accent: ACCENT },
};

// Safe margin: wider than the 96 px floor so bleeding ghost type still leaves real words clear.
export const M = 128;
// One frame in seconds, for staggers written in frames as the board specifies them.
export const FR = 1 / 30;

export const EXPO_OUT = Easing.out(Easing.exp);
export const IN_QUAD = Easing.in(Easing.quad);
export const BACK_OUT = Easing.out(Easing.back(1.4));

// The axis ranges the pieces clamp to (Roboto Flex unless named).
export const RANGE = {
  wght: [100, 1000],
  wdth: [25, 151],
  slnt: [-10, 0],
  opsz: [8, 144],
} as const;
