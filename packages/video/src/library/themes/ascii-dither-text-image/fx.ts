// Per-cell effects in seconds: radial scramble-settle, scramble-out, accent flash, scan-bar erase/reveal, Bayer develop between fields, and region dimming.
import { bayer, clamp01, hash, type Field } from "./field";
import type { Fx } from "./grid";

const F = 30;

// Cells start as random glyphs and lock radially from (cx, cy): delay = distance in 12 px cells × `spread` frames (board: 0.12 f).
export const settle = (t: number, at: number, o: { cx: number; cy: number; dur?: number; spread?: number; burst?: number }): Fx => {
  const dur = o.dur ?? 0.8;
  const spread = o.spread ?? 0.12;
  const burst = o.burst ?? 0.25;
  if (t >= at + dur + 4) return () => null;
  return (x, y) => {
    const dist = Math.hypot(x - o.cx, y - o.cy) / 12;
    const delay = (dist * spread) / F;
    // The noise itself spreads out from the centre first, so even the arrival is radial.
    if (t < at + delay * burst) return { hide: true };
    return { noise: 1 - clamp01((t - at - delay) / dur) };
  };
};

// Reverse of settle: cells scramble to noise, then drop out at random over the second half.
export const scrambleOut = (t: number, at: number, dur = 0.6, seed = 0): Fx => {
  if (t < at) return () => null;
  const k = (t - at) / dur;
  return (_x, _y, i, j) => {
    if (hash(i, j, 991 + seed) < (k - 0.45) / 0.55) return { hide: true };
    return { noise: clamp01(k * 2.2) };
  };
};

// The key-word move: cells inside `region` turn accent and scramble hard for 6 f, then lock (accent stays unless `hold` ends it).
export const flash = (t: number, at: number, region: (x: number, y: number) => boolean = () => true, hold = Infinity): Fx => {
  if (t < at || t > at + hold) return () => null;
  const n = 1 - clamp01((t - at) / 0.2);
  return (x, y) => (region(x, y) ? { accent: true, noise: n * 0.85 } : null);
};

// Horizontal scan bar position in px at time t (20 f linear by default).
export const scanX = (t: number, at: number, w: number, dur = 20 / F) => clamp01((t - at) / dur) * (w + 24) - 12;
// Cells behind the bar are erased (or, with reveal, only cells behind it exist); the two columns in front of it flicker to noise.
export const scan = (t: number, at: number, w: number, o: { dur?: number; reveal?: boolean; dir?: 1 | -1 } = {}): Fx => {
  const raw = scanX(t, at, w, o.dur);
  const bx = o.dir === -1 ? w - raw : raw;
  return (x) => {
    const ahead = o.dir === -1 ? bx - x : x - bx;
    const behind = ahead < 0;
    if (behind !== !!o.reveal) return { hide: true };
    return Math.abs(ahead) < 26 ? { noise: 0.7 } : null;
  };
};

// The picture "develops" into field B: each cell flips once its Bayer threshold drops under p, so pixels switch in a stable ordered pattern.
// bias > 0 turns the crossfade into a left-to-right wipe made of the same pattern.
export const develop = (b: Field, p: number, o: { bias?: number; w?: number } = {}): Fx => {
  if (p <= 0) return () => null;
  const bias = o.bias ?? 0;
  const w = o.w ?? 1920;
  return (x, y, i, j) => {
    const q = p * (1 + bias) - bias * (x / w);
    return bayer(i, j) < q ? { d: b(x, y) } : null;
  };
};

// Fade a region to `alpha` (older list rows, the loser in a comparison).
export const dim = (region: (x: number, y: number) => boolean, alpha: number): Fx => (x, y) => (alpha < 1 && region(x, y) ? { alpha } : null);
export const box = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number) => x >= x0 && x < x1 && y >= y0 && y < y1;
