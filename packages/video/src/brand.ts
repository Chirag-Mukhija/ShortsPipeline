// Brand kit v0: palette, tones, layout safe zones and color helpers shared by every template.

export const colors = {
  bg: "#090B10",
  surface: "#141A26",
  surfaceHigh: "#1C2433",
  line: "#2B3447",
  text: "#F5F7FB",
  muted: "#8D97AB",
  dim: "#566076",
  accent: "#FFB224",
  accentInk: "#1A1200",
  blue: "#4CC2FF",
  green: "#3DDC97",
  red: "#FF5C7A",
  purple: "#A98BFF",
  codeBg: "#0E131D",
} as const;

export type ToneName = "accent" | "blue" | "green" | "red" | "neutral";

export const tones: Record<ToneName, string> = {
  accent: colors.accent,
  blue: colors.blue,
  green: colors.green,
  red: colors.red,
  neutral: colors.muted,
};

// Decision: content stays inside the zone YouTube Shorts and Reels leave uncovered by their top bar, bottom title block and right-side buttons.
export const layout = {
  width: 1080,
  height: 1920,
  contentTop: 210,
  contentBottom: 1130,
  contentLeft: 72,
  contentRight: 1008,
  captionCenterY: 1275,
  captionMaxWidth: 860,
} as const;

export function alpha(hex: string, opacity: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
