// Chart maths without d3: linear scales, nice ticks, plot frames, partial polylines, number formats and a seeded RNG.
export type Pt = [number, number];
export type Box = { x: number; y: number; w: number; h: number };

export const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

// A plot area plus its domains: sx/sy map data to screen, y grows upward.
export type Plot = Box & { xd: [number, number]; yd: [number, number]; sx: (v: number) => number; sy: (v: number) => number };
export const plot = (box: Box, xd: [number, number], yd: [number, number]): Plot => ({
  ...box,
  xd,
  yd,
  sx: lin(xd[0], xd[1], box.x, box.x + box.w),
  sy: lin(yd[0], yd[1], box.y + box.h, box.y),
});

// Round tick steps (1, 2, 2.5, 5 × 10^n), the way a newsroom axis reads.
export const niceTicks = (min: number, max: number, count = 5) => {
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// The first p (0..1, by length) of a polyline, ending exactly at the drawing head.
export const slicePoly = (pts: Pt[], p: number): Pt[] => {
  if (p >= 1 || pts.length < 2) return pts;
  if (p <= 0) return [pts[0]!];
  const lens = pts.slice(1).map((q, i) => dist(pts[i]!, q));
  let left = lens.reduce((a, b) => a + b, 0) * p;
  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < lens.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (left >= lens[i]!) {
      out.push(b);
      left -= lens[i]!;
      continue;
    }
    const k = left / (lens[i]! || 1);
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    break;
  }
  return out;
};

// The polyline cut at a screen x, for a cursor that draws the line as it sweeps.
export const clipPolyX = (pts: Pt[], x: number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    if (a[0] <= x) {
      out.push(a);
      continue;
    }
    const prev = pts[i - 1];
    if (prev) out.push([x, prev[1] + ((x - prev[0]) / (a[0] - prev[0] || 1)) * (a[1] - prev[1])]);
    break;
  }
  return out;
};

export const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export const fmt = (v: number, decimals = 0) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Mulberry32: the same seed always gives the same demo data.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A seeded random walk, for demo series that look like real noisy data.
export const walk = (seed: number, n: number, start: number, drift: number, noise: number) => {
  const r = rng(seed);
  const out = [start];
  for (let i = 1; i < n; i++) out.push(Math.max(0, out[i - 1]! + drift + (r() - 0.5) * 2 * noise));
  return out;
};
