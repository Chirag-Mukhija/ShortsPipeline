// Brand kit: a catalog of dark palettes (one rotated in per video), full vs. gameplay-split layout variants, and color helpers.
import type { PaletteId } from "@clipforge/schema";

export type Palette = {
  bg: string;
  surface: string;
  surfaceHigh: string;
  line: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentInk: string;
  blue: string;
  green: string;
  red: string;
  purple: string;
  codeBg: string;
};

// Decision: green/red/purple/text stay identical across palettes (they carry meaning — success, warning, a
// secondary highlight); only the background wash, accent and "blue" tone shift, so every palette stays legible.
const SHARED = { text: "#F5F7FB", green: "#3DDC97", red: "#FF5C7A", purple: "#A98BFF" } as const;

export const PALETTES: Record<PaletteId, Palette> = {
  amberBlack: {
    ...SHARED,
    bg: "#090B10",
    surface: "#141A26",
    surfaceHigh: "#1C2433",
    line: "#2B3447",
    muted: "#8D97AB",
    dim: "#566076",
    accent: "#FFB224",
    accentInk: "#1A1200",
    blue: "#4CC2FF",
    codeBg: "#0E131D",
  },
  cyanNavy: {
    ...SHARED,
    bg: "#070D14",
    surface: "#101B28",
    surfaceHigh: "#16273A",
    line: "#233A52",
    muted: "#8CA6BE",
    dim: "#4A6480",
    accent: "#2FD8FF",
    accentInk: "#001820",
    blue: "#6E7BFF",
    codeBg: "#0A141F",
  },
  magentaViolet: {
    ...SHARED,
    bg: "#0D0812",
    surface: "#1B1226",
    surfaceHigh: "#261A35",
    line: "#3B2650",
    muted: "#AD98C4",
    dim: "#6B5484",
    accent: "#F45BE0",
    accentInk: "#210017",
    blue: "#7C8CFF",
    codeBg: "#150C1F",
  },
  emeraldTeal: {
    ...SHARED,
    bg: "#06120F",
    surface: "#0F211C",
    surfaceHigh: "#152E27",
    line: "#204238",
    muted: "#8FC0AE",
    dim: "#4C7566",
    accent: "#2FE5A8",
    accentInk: "#00170F",
    blue: "#3FC7E8",
    codeBg: "#0A1712",
  },
  crimsonCharcoal: {
    ...SHARED,
    bg: "#120808",
    surface: "#221010",
    surfaceHigh: "#301616",
    line: "#4A2222",
    muted: "#C79A9A",
    dim: "#7A4C4C",
    accent: "#FF6A4D",
    accentInk: "#200300",
    blue: "#5FA8D6",
    codeBg: "#180B0B",
  },
};

export type ToneName = "accent" | "blue" | "green" | "red" | "neutral";

export function tonesFor(palette: Palette): Record<ToneName, string> {
  return { accent: palette.accent, blue: palette.blue, green: palette.green, red: palette.red, neutral: palette.muted };
}

export type Layout = {
  width: number;
  height: number;
  contentTop: number;
  contentBottom: number;
  contentLeft: number;
  contentRight: number;
  captionCenterY: number;
  captionMaxWidth: number;
  // Top edge of the gameplay strip in split layout; null means "no gameplay clip, use the full canvas".
  gameplayTop: number | null;
};

// Decision: content stays inside the zone YouTube Shorts and Reels leave uncovered by their top bar, bottom title block and right-side buttons.
export const FULL_LAYOUT: Layout = {
  width: 1080,
  height: 1920,
  contentTop: 210,
  contentBottom: 1130,
  contentLeft: 72,
  contentRight: 1008,
  captionCenterY: 1275,
  captionMaxWidth: 860,
  gameplayTop: null,
};

// Decision: the gameplay strip takes exactly the bottom 40% of the canvas (1920 * 0.4 = 768px); everything above
// it keeps the same horizontal margins as FULL_LAYOUT, just compressed vertically with a tighter caption band.
export const SPLIT_LAYOUT: Layout = {
  width: 1080,
  height: 1920,
  contentTop: 150,
  contentBottom: 1030,
  contentLeft: 72,
  contentRight: 1008,
  captionCenterY: 1090,
  captionMaxWidth: 860,
  gameplayTop: 1152,
};

export function resolveLayout(hasBackground: boolean): Layout {
  return hasBackground ? SPLIT_LAYOUT : FULL_LAYOUT;
}

export function alpha(hex: string, opacity: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
