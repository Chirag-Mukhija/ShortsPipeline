// UI walkthrough tokens: dusk/dawn wallpaper, white or graphite app windows, one #5B8CFF accent, Inter for captions and UI, JetBrains Mono for key caps, and the Screen Studio spring numbers.
import { Easing } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const SANS = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;

export const ACCENT = "#5B8CFF";
export const ACCENT_DEEP = "#3D6BF0";
export const VIOLET = "#9A7BFF";
export const GOOD = "#2FBF71";
export const WARN = "#F5A524";
export const BAD = "#F0566B";

// Wallpapers: the board's dusk (#1B1F3B → #3A2A6B) and soft dawn (#E9EEF7 → #F8F3EA).
export const WALLPAPERS = {
  dusk: { from: "#1B1F3B", to: "#3A2A6B", glowA: "#5B8CFF", glowB: "#B06CFF", glowC: "#3FD0E0", ribbon: "#8FA8FF", ink: "#FFFFFF" },
  dawn: { from: "#E3E9F6", to: "#F8F3EA", glowA: "#8FAEFF", glowB: "#F3B6CF", glowC: "#A9E2DA", ribbon: "#FFFFFF", ink: "#1A1D2E" },
} as const;
export type Wallpaper = keyof typeof WALLPAPERS;

// The app look inside a window: light (#FFFFFF) or dark (#1C1C22).
export const UI = {
  light: { win: "#FFFFFF", bar: "#F3F4F8", side: "#F6F7FB", line: "#E4E6EE", text: "#14161F", soft: "#5D6375", faint: "#9AA0B2", card: "#FFFFFF", field: "#F3F5FA", dim: "rgba(20,22,40,0.32)" },
  dark: { win: "#1C1C22", bar: "#24242C", side: "#202027", line: "#33333D", text: "#F4F5F9", soft: "#A9ADBD", faint: "#6C7084", card: "#26262E", field: "#2A2A33", dim: "rgba(0,0,0,0.45)" },
} as const;
export type Look = keyof typeof UI;

export const SHADOW = "0 30px 80px -10px rgba(0,0,0,0.35), 0 12px 28px -8px rgba(10,10,30,0.28)";
// Caption pills sit on the wallpaper, so they get their own deep-glass fill.
export const PILL_BG = "rgba(14,16,34,0.78)";

// Springs from the Screen Studio reimplementation: follow 170/20, snappier 700/30 within 160 ms of a click.
export const CURSOR_SPRING = { k: 170, c: 20 };
export const CLICK_SPRING = { k: 700, c: 30 };
// Zoom-in a touch bouncy, zoom-out softer and more damped (core-motion/video.md).
export const ZOOM_IN = { k: 170, c: 19 };
export const ZOOM_OUT = { k: 55, c: 17 };
export const PAN = { k: 140, c: 22 };

export const BACK = (s = 1.5) => Easing.out(Easing.back(s));
export const SOFT_OUT = Easing.bezier(0.22, 1, 0.36, 1);

// The default stage: the window centred at 85 % width, leaving the bottom band for the caption pill.
export const APP_W = 1360;
export const APP_H = 765;
export const BAR_H = 52;
export const WIN = { x: 960, y: 474, w: APP_W, h: APP_H };
export const CAPTION_Y = 952;
