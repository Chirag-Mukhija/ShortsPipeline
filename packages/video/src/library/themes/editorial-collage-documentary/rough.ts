// Seeded randomness, the 12 fps stepped clock and the rough geometry (torn edges, marker loops, wobbly strokes) every collage piece is cut from.
import { Easing } from "remotion";
import { OUT, ramp, type Ease } from "../../core/time";

export type P = [number, number];

// mulberry32: small, fast, and identical on every render.
export const rng = (seed: number) => {
  let a = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Smooth 1-D value noise in [-1, 1], for low-frequency wander along an edge or a loop.
export const noise1 = (seed: number) => {
  const r = rng(seed);
  const v = Array.from({ length: 64 }, () => r() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % 64) + 64) % 64]!;
    const b = v[(((i + 1) % 64) + 64) % 64]!;
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
};

// The Vox "hand-assembled" stutter: entrances and boil advance on a 12 fps clock while the video runs at 30.
export const q12 = (t: number) => Math.floor(t * 12 + 1e-4) / 12;
export const stepIn = (t: number, at: number, d = 0.36, e: Ease = OUT) => ramp(q12(t), at, d, e);
export const SETTLE: Ease = Easing.out(Easing.back(1.6));
export const boilIx = (t: number) => Math.floor(t * 12) % 3;
// Exits are hard swipes, not stepped: 8 frames, in-cubic.
export const swipeOut = (t: number, at: number) => ramp(t, at, 8 / 30, Easing.in(Easing.cubic));

export type Edges = { top?: number; right?: number; bottom?: number; left?: number };

// Walks a w×h rectangle clockwise, nudging each point in or out. Amplitudes above ~5 px read as a tear (fibrous, notched);
// small ones read as a scissor cut. `inward` keeps every point inside the box (for CSS clip-paths, which can't paint outside).
export const tornRect = (w: number, h: number, seed: number, edges: Edges = {}, inward = false): P[] => {
  const r = rng(seed);
  const n = noise1(seed + 17);
  const sides: [number, number, number, number, number, number, number][] = [
    [0, 0, w, 0, edges.top ?? 1.5, 0, -1],
    [w, 0, w, h, edges.right ?? 1.5, 1, 0],
    [w, h, 0, h, edges.bottom ?? 1.5, 0, 1],
    [0, h, 0, 0, edges.left ?? 1.5, -1, 0],
  ];
  const pts: P[] = [];
  sides.forEach(([x0, y0, x1, y1, amp, nx, ny], si) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const torn = amp > 4;
    const step = torn ? 7 : 26;
    const count = Math.max(2, Math.round(len / step));
    for (let i = 0; i < count; i++) {
      const u = i / count;
      let j = torn ? amp * (0.6 * n(si * 9 + (u * len) / 70) + 0.4 * (r() * 2 - 1)) : amp * (r() * 2 - 1);
      if (torn && r() < 0.06) j -= amp * 0.9;
      if (inward) j = -Math.abs(j) - (torn ? amp * 0.4 : 0);
      pts.push([x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j]);
    }
  });
  return pts;
};

export const polyD = (pts: P[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;

// The same tear as a CSS clip-path for auto-sized HTML slips: % of the box plus an inward px offset per point.
export const tornClip = (seed: number, edges: Edges = {}, ref = { w: 600, h: 120 }) => {
  const pts = tornRect(ref.w, ref.h, seed, edges, true);
  const per = (v: number, size: number) => {
    const edge = Math.round(v / size) * size;
    return `calc(${((edge / size) * 100).toFixed(2)}% ${v - edge >= 0 ? "+" : "-"} ${Math.abs(v - edge).toFixed(1)}px)`;
  };
  // Snap each coordinate to its nearest edge so the jitter stays a fixed px depth whatever the slip's real size.
  return `polygon(${pts
    .map(([x, y]) => {
      const nearX = Math.min(x, ref.w - x) < 30;
      const nearY = Math.min(y, ref.h - y) < 30;
      const xs = nearX ? per(x, ref.w) : `${((x / ref.w) * 100).toFixed(2)}%`;
      const ys = nearY ? per(y, ref.h) : `${((y / ref.h) * 100).toFixed(2)}%`;
      return `${xs} ${ys}`;
    })
    .join(",")})`;
};

// Catmull-Rom through the points, as cubic Béziers: a marker line with no corners.
export const smoothD = (pts: P[]) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

// A marker loop the way a hand draws one: starts upper-left, overshoots past a full turn, spirals out a little, never closes neatly.
export const markerLoop = (cx: number, cy: number, rx: number, ry: number, seed: number, boil = 0, turns = 1.14): P[] => {
  const r = rng(seed);
  const n = noise1(seed + 3);
  const a0 = -Math.PI * 0.8 + r() * 0.5;
  const tilt = (r() - 0.5) * 0.16;
  const jb = rng(seed * 31 + boil * 7);
  const N = 72;
  return Array.from({ length: N + 1 }, (_, i) => {
    const u = i / N;
    const a = a0 + u * turns * Math.PI * 2;
    const k = 1 + n(u * 5) * 0.045 + u * 0.06;
    const x0 = Math.cos(a) * rx * k;
    const y0 = Math.sin(a) * ry * k;
    return [cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt) + (jb() - 0.5) * 2.2, cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt) + (jb() - 0.5) * 2.2] as P;
  });
};

// A slightly bowed, wavering stroke between two points (underlines, arrow shafts, strings).
export const roughLine = (x1: number, y1: number, x2: number, y2: number, seed: number, bow = 0.06, boil = 0, N = 14): P[] => {
  const n = noise1(seed);
  const jb = rng(seed * 13 + boil * 5);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / (len || 1);
  const ny = (x2 - x1) / (len || 1);
  return Array.from({ length: N + 1 }, (_, i) => {
    const u = i / N;
    const off = Math.sin(u * Math.PI) * bow * len + n(u * 3) * 3 + (jb() - 0.5) * 1.6;
    return [x1 + (x2 - x1) * u + nx * off, y1 + (y2 - y1) * u + ny * off] as P;
  });
};

// Arrowhead strokes for the end of a rough line.
export const arrowHead = (pts: P[], size = 34): P[][] => {
  const a = pts[pts.length - 1]!;
  const b = pts[Math.max(0, pts.length - 3)]!;
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const wing = (s: number): P[] => [
    [a[0] + Math.cos(ang + Math.PI + s * 0.5) * size, a[1] + Math.sin(ang + Math.PI + s * 0.5) * size],
    a,
  ];
  return [wing(1), wing(-1)];
};
