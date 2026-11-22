// Cut-paper geometry: scissor-cut polygons (hand-cut circles are faceted), torn edges with a white core showing, and layered hills for dioramas.
import { rng } from "./stop";

export type P = [number, number];
export const pathOf = (pts: P[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;

// Scissors: each vertex lands a little off where it was meant to.
export const cutPoly = (pts: P[], seed: number, wob = 3): P[] => {
  const r = rng(seed);
  return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * wob, y + (r() - 0.5) * 2 * wob]);
};

// A circle cut with scissors is a polygon of short straight snips, never a true curve.
export const cutCircle = (cx: number, cy: number, rad: number, seed: number, facets = Math.max(14, Math.round(rad / 5))): P[] => {
  const r = rng(seed);
  return Array.from({ length: facets }, (_, i) => {
    const a = ((i + (r() - 0.5) * 0.35) / facets) * Math.PI * 2;
    const rr = rad * (1 + (r() - 0.5) * 0.035);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as P;
  });
};

export const cutEllipse = (cx: number, cy: number, rx: number, ry: number, seed: number, facets = 22): P[] =>
  cutCircle(0, 0, 1, seed, facets).map(([x, y]) => [cx + x * rx, cy + y * ry]);

export const cutRect = (x: number, y: number, w: number, h: number, seed: number, wob = 3): P[] =>
  cutPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], seed, wob);

// Rounded corners cut in three snips each.
export const cutRound = (x: number, y: number, w: number, h: number, rad: number, seed: number, wob = 2): P[] => {
  const pts: P[] = [];
  const corners: [number, number, number][] = [[x + w - rad, y + rad, -90], [x + w - rad, y + h - rad, 0], [x + rad, y + h - rad, 90], [x + rad, y + rad, 180]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 3; k++) {
    const a = ((a0 + k * 30) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return cutPoly(pts, seed, wob);
};

// Star or sunburst: alternating outer and inner radii.
export const burst = (cx: number, cy: number, R: number, r0: number, n: number, seed: number, rot = -90): P[] => {
  const r = rng(seed);
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rr = (i % 2 ? r0 : R) * (1 + (r() - 0.5) * 0.08);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as P;
  });
};

// One torn edge from a to b: a damped random walk plus fine jags; the core rides just outside it by a varying width.
const tear = (a: P, b: P, r: () => number, amp: number, core: number, step = 7) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / step));
  const nx = (b[1] - a[1]) / len;
  const ny = -(b[0] - a[0]) / len;
  const paper: P[] = [];
  const coreP: P[] = [];
  let w = 0;
  let c = 0.5;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    w = w * 0.6 + (r() - 0.5) * amp;
    const off = w + (r() - 0.5) * amp * 0.45;
    c = Math.min(1, Math.max(0, c + (r() - 0.5) * 0.55));
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    paper.push([x + nx * off, y + ny * off]);
    const co = off + core * (0.2 + c);
    coreP.push([x + nx * co, y + ny * co]);
  }
  return { paper, core: coreP };
};

// A sheet with any of its sides torn ("t", "r", "b", "l"); cut sides stay scissor-straight.
export const tornRect = (x: number, y: number, w: number, h: number, seed: number, sides = "tb", amp = 7, core = 6) => {
  const r = rng(seed);
  const c: P[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const paper: P[] = [];
  const coreP: P[] = [];
  "trbl".split("").forEach((side, i) => {
    const a = c[i]!;
    const b = c[(i + 1) % 4]!;
    if (sides.includes(side)) {
      const e = tear(a, b, r, amp, core);
      paper.push(...e.paper);
      coreP.push(...e.core);
    } else {
      const j: P = [a[0] + (r() - 0.5) * 2, a[1] + (r() - 0.5) * 2];
      paper.push(j);
      coreP.push(j);
    }
  });
  return { paper: pathOf(paper), core: pathOf(coreP) };
};

// A torn circle; inward=true puts the core inside (a hole torn in a sheet), otherwise outside (a disc torn out).
export const tornCircle = (cx: number, cy: number, rad: number, seed: number, amp = 8, core = 7, inward = false) => {
  const r = rng(seed);
  const n = Math.max(24, Math.round((rad * Math.PI * 2) / 9));
  const walk: number[] = [];
  let w = 0;
  for (let i = 0; i < n; i++) walk.push((w = w * 0.7 + (r() - 0.5) * amp) + (r() - 0.5) * amp * 0.25);
  const drift = walk[n - 1]! - walk[0]!;
  const paper: P[] = [];
  const coreP: P[] = [];
  let c = 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const off = walk[i]! - (drift * i) / n;
    c = Math.min(1, Math.max(0, c + (r() - 0.5) * 0.55));
    const pr = rad + off;
    const cr = pr + (inward ? -1 : 1) * core * (0.2 + c);
    paper.push([cx + Math.cos(a) * pr, cy + Math.sin(a) * pr]);
    coreP.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
  }
  return { paper: pathOf(paper), core: pathOf(coreP) };
};

// A diorama hill layer: rolling top edge torn by hand, filled down to `bottom`.
export const hills = (x0: number, x1: number, baseY: number, bottom: number, seed: number, amp = 60, waves = 2.2, tearAmp = 6) => {
  const r = rng(seed);
  const ph = r() * Math.PI * 2;
  const ph2 = r() * Math.PI * 2;
  const step = 9;
  const n = Math.round((x1 - x0) / step);
  const paper: P[] = [];
  const coreP: P[] = [];
  let w = 0;
  let c = 0.5;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = x0 + (x1 - x0) * u;
    const roll = Math.sin(u * Math.PI * 2 * waves + ph) * amp + Math.sin(u * Math.PI * 2 * waves * 2.3 + ph2) * amp * 0.3;
    w = w * 0.6 + (r() - 0.5) * tearAmp;
    c = Math.min(1, Math.max(0, c + (r() - 0.5) * 0.55));
    const y = baseY - roll + w;
    paper.push([x, y]);
    coreP.push([x, y - tearAmp * (0.3 + c)]);
  }
  const close: P[] = [[x1, bottom], [x0, bottom]];
  return { paper: pathOf([...paper, ...close]), core: pathOf([...coreP, ...close]), top: (x: number) => paper[Math.round(((x - x0) / (x1 - x0)) * n)]?.[1] ?? baseY };
};

// Masking-tape ends: a zigzag tear as CSS polygon points, so a strip of any width keeps its torn ends.
export const tapeClip = (seed: number, jag = 7) => {
  const r = rng(seed);
  const n = 7;
  const left = Array.from({ length: n + 1 }, (_, i) => `${(r() * jag).toFixed(1)}px ${((i / n) * 100).toFixed(1)}%`);
  const right = Array.from({ length: n + 1 }, (_, i) => `calc(100% - ${(r() * jag).toFixed(1)}px) ${(100 - (i / n) * 100).toFixed(1)}%`);
  return `polygon(${[...left, ...right].join(", ")})`;
};
