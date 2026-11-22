// Retro web / Y2K desktop tokens: bevel grey chrome, navy-to-teal title bars, pastel pink and cream, space black, neon planet colours, pixel and bubble fonts, stepped timing.
import type { CSSProperties } from "react";
import { loadFont as loadVT323 } from "@remotion/google-fonts/VT323";
import { loadFont as loadSilkscreen } from "@remotion/google-fonts/Silkscreen";
import { loadFont as loadTitanOne } from "@remotion/google-fonts/TitanOne";
import { loadFont as loadCourierPrime } from "@remotion/google-fonts/CourierPrime";

// PIXEL: big readable terminal-pixel text (numbers, keywords). UI: Chicago-like caps for title bars, buttons, labels.
// WORD: bubbly WordArt logos. TYPE: typewriter body copy inside documents.
export const PIXEL = loadVT323("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const UI = loadSilkscreen("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const WORD = loadTitanOne("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const TYPE = loadCourierPrime("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const GREY = "#C0C0C0";
export const GREY_LT = "#DFDFDF";
export const GREY_DK = "#808080";
export const INK = "#0A0A0A";
export const WHITE = "#FFFFFF";
export const NAVY = "#000080";
export const TEAL = "#008080";
export const VIOLET = "#3B1C8F";
export const PINK = "#F2D0D0";
export const PINK_HOT = "#FF5FA8";
export const CREAM = "#F8EDE0";
export const SPACE = "#06031A";
export const CYAN = "#00FFFF";
export const ORANGE = "#FF9A00";
export const LIME = "#7CFF00";
export const MAGENTA = "#FF3EC8";
export const YELLOW = "#FFE600";
export const RED = "#E8202A";

// One "screen pixel" of the fake OS, so bevels and sprites share a grid that reads at 1080p.
export const PX = 3;

// The two-layer bevel: white then light grey on the lit top-left, black then dark grey on the bottom-right.
export const raised = (p = PX): CSSProperties => ({
  boxShadow: `inset -${p}px -${p}px 0 ${INK}, inset ${p}px ${p}px 0 ${WHITE}, inset -${2 * p}px -${2 * p}px 0 ${GREY_DK}, inset ${2 * p}px ${2 * p}px 0 ${GREY_LT}`,
});
export const sunken = (p = PX): CSSProperties => ({
  boxShadow: `inset ${p}px ${p}px 0 ${GREY_DK}, inset -${p}px -${p}px 0 ${WHITE}, inset ${2 * p}px ${2 * p}px 0 ${INK}, inset -${2 * p}px -${2 * p}px 0 ${GREY_LT}`,
});
export const pressed = (p = PX): CSSProperties => ({
  boxShadow: `inset ${p}px ${p}px 0 ${INK}, inset -${p}px -${p}px 0 ${WHITE}, inset ${2 * p}px ${2 * p}px 0 ${GREY_DK}, inset -${2 * p}px -${2 * p}px 0 ${GREY_LT}`,
});

// Title bar: navy through violet to teal, our own twist on the era's gradient bars; greyed when inactive.
export const TITLE_ON = `linear-gradient(90deg, ${NAVY} 0%, ${VIOLET} 55%, ${TEAL} 100%)`;
export const TITLE_OFF = `linear-gradient(90deg, ${GREY_DK} 0%, #9A9AA6 60%, #B4B4B4 100%)`;

// Checker dither as a CSS background, for desktops, title-bar fades and disabled states.
export const dither = (a: string, b = "transparent", s = PX) => ({
  backgroundImage: `repeating-conic-gradient(${a} 0% 25%, ${b} 0% 50%)`,
  backgroundSize: `${2 * s}px ${2 * s}px`,
});
