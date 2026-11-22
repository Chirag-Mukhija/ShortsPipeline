// Bauhaus motion grammar as pure functions of time: axis slides that lock, detent rotations, shrink-to-point exits, 3-frame colour swaps, rolling and rail travel.
import { ramp } from "../../core/time";
import { BACK, ENTER, EXIT, FLASH, GRID, IN, SNAP, TURN, WHITE } from "./theme";

// 0 → 1 with the board's back-out overshoot; the value passes 1 briefly, which is the "lock".
export const enter = (t: number, at: number, d = ENTER) => ramp(t, at, d, BACK);

// Distance still to travel on an axis slide: start `dist` px away, overshoot, lock at 0.
export const slide = (t: number, at: number, dist: number, d = ENTER) => (1 - enter(t, at, d)) * dist;

// Rotation that clicks between detents: keys are [seconds, degrees]; use multiples of 45 or 90.
export const detents = (t: number, keys: [number, number][], d = TURN) => {
  let v = keys[0]?.[1] ?? 0;
  for (const [k, deg] of keys.slice(1)) {
    if (t < k) break;
    v += (deg - v) * ramp(t, k, d, SNAP);
  }
  return v;
};

// Board exit: rotate 90° and shrink to a point, 12 f ease-in.
export const shrink = (t: number, at: number, d = EXIT) => {
  const e = ramp(t, at, d, IN);
  return { rot: 90 * e, scale: 1 - e, gone: e >= 1 };
};

// A colour swap with a 3-frame flash between the two colours.
export const swap = (t: number, at: number, from: string, to: string, flash = WHITE) => (t < at ? from : t < at + FLASH ? flash : to);

// Degrees a circle of radius r has turned after rolling dx px.
export const rollDeg = (dx: number, r: number) => (dx / r) * (180 / Math.PI);

export const onGrid = (v: number, g = GRID) => Math.round(v / g) * g;

// Slow whole-composition sway, ±amp° over a 6 s (180 f) cycle.
export const sway = (t: number, amp = 3) => amp * Math.sin((t / 6) * Math.PI * 2);

export type Pt = { x: number; y: number };

// Manhattan rail from a to b: horizontal first, then vertical, so shapes travel like they're on tracks.
export const elbow = (a: Pt, b: Pt, vFirst = false): Pt[] => (a.x === b.x || a.y === b.y ? [a, b] : vFirst ? [a, { x: a.x, y: b.y }, b] : [a, { x: b.x, y: a.y }, b]);

export const polyLen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);

// Point at fraction s (0..1) along a polyline.
export const along = (pts: Pt[], s: number): Pt => {
  const total = polyLen(pts);
  let left = Math.max(0, Math.min(1, s)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= l || i === pts.length - 1) {
      const u = l === 0 ? 0 : Math.min(1, left / l);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
    left -= l;
  }
  return pts[pts.length - 1] ?? { x: 0, y: 0 };
};

// Seeded RNG (mulberry32) so every "random" composition is the same on every render.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};
