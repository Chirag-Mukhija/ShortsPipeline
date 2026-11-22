// MeasuredLine: real advance widths per axis state (measured once, cached), and a solver that finds the width axis that makes a line fill an exact measure.
import type { CSSProperties, FC } from "react";
import { FLEX, INK } from "./theme";
import { VarWord, autoTrack, clampFlex, fvs, type Axes, type Look } from "./type";

const cache = new Map<string, number>();

// Width of `text` laid out exactly as VarWord lays it out (one inline-block per letter, auto tracking unless `track` is given).
// The cache key carries document.fonts.size, so a measurement taken before the variable font finished loading is never reused.
export const measure = (text: string, size: number, axes: Axes, family = FLEX, track?: number) => {
  const a = family === FLEX ? clampFlex(axes) : axes;
  const tr = track ?? autoTrack(a);
  if (typeof document === "undefined") return text.length * size * 0.55 * ((a.wdth ?? 100) / 100);
  const key = [document.fonts.size, family, size, text, fvs(a), tr].join("|");
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;display:inline-flex;white-space:pre";
  for (const ch of text) {
    const s = document.createElement("span");
    s.textContent = ch === " " ? " " : ch;
    s.style.cssText = `display:inline-block;white-space:pre;font-family:${JSON.stringify(family)};font-size:${size}px;line-height:0.9;font-weight:400;letter-spacing:${tr}em`;
    s.style.fontVariationSettings = fvs(a);
    host.appendChild(s);
  }
  document.body.appendChild(host);
  const w = host.getBoundingClientRect().width;
  host.remove();
  // Morphs measure fresh axis states every frame; a long render shouldn't grow the cache forever.
  if (cache.size > 20000) cache.clear();
  cache.set(key, w);
  return w;
};

const WDTHS = [25, 50, 75, 100, 125, 151];
const WGHT_STEP = 150;

// Width at (wght, wdth): bilinear over a coarse grid of real measurements, so a breathing line costs a handful of DOM reads in total.
const widthAt = (text: string, size: number, wght: number, wdth: number, extra: Axes) => {
  const g0 = Math.max(100, Math.min(1000 - WGHT_STEP, 100 + Math.floor((wght - 100) / WGHT_STEP) * WGHT_STEP));
  const g1 = Math.min(1000, g0 + WGHT_STEP);
  const u = Math.min(1, Math.max(0, (wght - g0) / (g1 - g0)));
  const at = (g: number) => {
    let j = WDTHS.findIndex((v) => v >= wdth);
    if (j <= 0) j = 1;
    const a = WDTHS[j - 1]!;
    const b = WDTHS[j]!;
    const wa = measure(text, size, { ...extra, wght: g, wdth: a });
    const wb = measure(text, size, { ...extra, wght: g, wdth: b });
    return wa + ((wb - wa) * (wdth - a)) / (b - a);
  };
  return at(g0) * (1 - u) + at(g1) * u;
};

export type Fit = { wdth: number; track: number; short: number };

// The width axis (plus extra tracking once the font is at its widest) that makes `text` exactly `target` px wide at `wght`.
// `short` is how many px it still falls short of when even wdth 25 is too wide; callers can show the truth with a rule.
export const fitWidth = (text: string, size: number, target: number, wght: number, extra: Axes = {}): Fit => {
  const lo = widthAt(text, size, wght, 25, extra);
  const hi = widthAt(text, size, wght, 151, extra);
  if (target <= lo) return { wdth: 25, track: autoTrack({ wght, wdth: 25 }), short: lo - target };
  if (target >= hi) return { wdth: 151, track: autoTrack({ wght, wdth: 151 }) + (target - hi) / (size * [...text].length), short: 0 };
  // Width is monotone in wdth, so bisection converges in a dozen steps with no extra DOM reads.
  let a = 25;
  let b = 151;
  for (let k = 0; k < 14; k++) {
    const m = (a + b) / 2;
    if (widthAt(text, size, wght, m, extra) < target) a = m;
    else b = m;
  }
  const wdth = (a + b) / 2;
  return { wdth, track: autoTrack({ wght, wdth }), short: 0 };
};

export type MeasuredLineProps = { text: string; size: number; width: number; wght: number; look?: (i: number, n: number) => Look; color?: string; style?: CSSProperties };

// A line that fills exactly `width` px at weight `wght`: the width axis absorbs the difference, so edges stay flush while weight moves.
export const MeasuredLine: FC<MeasuredLineProps> = ({ text, size, width, wght, look, color = INK, style }) => {
  const fit = fitWidth(text, size, width, wght);
  return <VarWord text={text} size={size} color={color} track={fit.track} style={style} axes={(i, n) => ({ wght, wdth: fit.wdth, ...look?.(i, n) })} />;
};
