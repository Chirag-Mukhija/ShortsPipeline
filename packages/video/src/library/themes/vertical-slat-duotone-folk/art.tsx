// Drawn tone fields for the slat renderer (sheep with a 4-pose walk, layered landscape, poppy, cloud, cabin, ridge emblem) and the full-colour photo stand-in the blinds open onto.
import { useId, type FC } from "react";
import { W, H } from "../../core/video";
import { hash, noise } from "./clock";
import type { Tone } from "./loom";

const sat = (v: number) => Math.min(1, Math.max(0, v));
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const k = sat(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - dx * k, py - ay - dy * k);
};
const inEll = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;

// ---------- sheep ----------
const WOOL: [number, number, number][] = [[-112, -6, 66], [-58, -48, 70], [10, -56, 72], [78, -40, 64], [-86, 36, 60], [-6, 32, 70], [70, 28, 60], [112, -2, 52]];
// Four walk poses (8 fps loop): foot swing of the front and back pairs, and a body bob on the passing poses.
const POSES = [
  { f: 22, b: -22, bob: 0 },
  { f: 0, b: 0, bob: -4 },
  { f: -22, b: 22, bob: 0 },
  { f: 0, b: 0, bob: -4 },
];
export const SHEEP_POSES = POSES.length;

// A woolly sheep facing right, centred at (x, y) with scale s; `graze` (0..1) lowers the head.
export const sheep = ({ x, y, s = 1, pose = 0, graze = 0 }: { x: number; y: number; s?: number; pose?: number; graze?: number }): Tone => {
  const P = POSES[((pose % 4) + 4) % 4]!;
  const legs: [number, number, number][] = [[-96, 64, P.b], [-62, 70, -P.b * 0.6], [58, 68, P.f], [92, 64, -P.f * 0.6]];
  const hy = -34 + graze * 70;
  return (px, py) => {
    const u = (px - x) / s;
    const v = (py - y) / s - P.bob;
    if (u < -190 || u > 230 || v < -140 || v > 190) return 0;
    // Face first (it overlaps the wool at the front): a long head tipped down to the muzzle, a back-swept ear, one eye.
    if (inEll(u, v, 178, hy + 8, 50, 30) || inEll(u, v, 210, hy + 22, 26, 20)) {
      if (Math.hypot(u - 186, v - hy + 2) < 6) return 0.02;
      if (inEll(u, v, 226, hy + 26, 9, 6)) return 0.12;
      return 0.5 + (u > 205 ? -0.12 : 0.06) + 0.12 * noise(u * 0.08, v * 0.08, 4);
    }
    if (inEll(u, v, 146, hy - 10, 30, 11)) return 0.34;
    let depth = 0;
    for (const [cx, cy, r] of WOOL) depth = Math.max(depth, 1 - Math.hypot(u - cx, v - cy) / r);
    if (depth > 0) {
      const tex = noise(u * 0.055, v * 0.055, 7) * 0.6 + noise(u * 0.14, v * 0.14, 8) * 0.4;
      const shade = v > 40 ? 0.72 : v < -60 ? 1.08 : 0.92;
      return sat((0.42 + 0.48 * tex) * shade * (0.55 + 0.45 * Math.min(1, depth * 3.2)));
    }
    if (inEll(u, v, -168, -6, 16, 22)) return 0.5;
    for (const [lx, ly, sw] of legs) {
      if (v > ly && v < 170 && segDist(u, v, lx, ly, lx + sw, 168) < 12) return v > 152 ? 0.16 : 0.48;
    }
    return 0;
  };
};

// ---------- landscape ----------
export const ridgeFar = (x: number) => 560 + 70 * Math.sin(x * 0.0042 + 1.3) + 38 * Math.sin(x * 0.011 + 0.4) + 34 * (noise(x * 0.012, 0, 3) - 0.5);
export const ridgeMid = (x: number) => 712 + 46 * Math.sin(x * 0.0031 + 2.2) + 26 * Math.sin(x * 0.0097 + 1.1);
export const ridgeNear = (x: number) => 884 + 36 * Math.sin(x * 0.0024 + 0.3) + 18 * Math.sin(x * 0.013);
const TREES = [[120, 360], [238, 270], [330, 200], [1600, 300], [1715, 380], [1830, 250]] as const;

// A blocky cloud on a 12 × 9 px grid, so its edges step like woven rows.
const cloudAt = (x: number, y: number, cx: number, cy: number, s: number) => {
  const qx = Math.floor(x / 12) * 12 + 6;
  const qy = Math.floor(y / 9) * 9 + 4;
  return inEll(qx, qy, cx, cy, 120 * s, 26 * s) || inEll(qx, qy, cx - 40 * s, cy - 24 * s, 60 * s, 30 * s) || inEll(qx, qy, cx + 34 * s, cy - 30 * s, 50 * s, 32 * s);
};

export type LandscapeOpts = { w?: number; h?: number; scroll?: number; t?: number; pulse?: number; sun?: boolean; trees?: boolean; clouds?: boolean };

// Sky, sun with engraved halo rings, drifting clouds, misty far range, mid hills, dark near hill and pixel-cluster firs.
// Vertical scroll parallax: far 0.3×, mid 0.6×, near and trees 1×. Drawn in 1920×1080 design space and scaled to the box.
export const landscape = ({ w = W, h = H, scroll = 0, t = 0, pulse = 0, sun = true, trees = true, clouds = true }: LandscapeOpts = {}): Tone => {
  const kx = 1920 / w;
  const ky = 1080 / h;
  const sunX = 1380;
  const sunY = 330 - scroll * 0.15;
  const R = 92;
  const drift = t * 6;
  return (px, py) => {
    const x = px * kx;
    const y = py * ky;
    const yn = ridgeNear(x) - scroll;
    if (trees) {
      for (const [tx, th] of TREES) {
        const base = ridgeNear(tx) - scroll + 30;
        const dy = base - y;
        if (dy < 0 || dy > th) continue;
        const qx = Math.floor(x / 6) * 6 + 3;
        const qy = Math.floor(y / 6) * 6 + 3;
        const qdy = base - qy;
        const tier = (qdy / (th / 6)) % 1;
        const half = (1 - qdy / th) * th * 0.21 * (0.62 + 0.38 * tier);
        if (Math.abs(qx - tx) < half) return hash(qx, qy, 11) < 0.62 ? 0.16 + 0.3 * hash(qx, qy, 12) : 0;
        if (Math.abs(x - tx) < 5 && dy < th * 0.2) return 0.3;
      }
    }
    if (y > yn) return y < yn + 6 ? 0.42 : 0;
    const ym = ridgeMid(x) - scroll * 0.6;
    if (y > ym) return y < ym + 5 ? 0.5 : 0.24 + 0.08 * noise(x * 0.015, y * 0.03, 6);
    const yf = ridgeFar(x) - scroll * 0.3;
    if (y > yf) {
      const mist = sat((y - (ym - 90)) / 90);
      return 0.44 + 0.1 * noise(x * 0.01, y * 0.02, 2) + mist * 0.3;
    }
    if (clouds) {
      const cs = [[(380 + drift) % 2300 - 190, 250, 1], [(1060 + drift * 0.7) % 2300 - 190, 170, 0.75], [(1780 + drift * 1.2) % 2300 - 190, 400, 0.6]] as const;
      for (const [cx, cy, s] of cs) if (cloudAt(x, y + scroll * 0.2, cx, cy, s)) return 0.18;
    }
    if (sun) {
      const d = Math.hypot(x - sunX, y - sunY);
      if (d < R) return 1;
      const ring = d - R - 14 - pulse * 12;
      if (ring > 0 && ring < 150 && Math.floor(ring / 22) % 2 === 0) return 0.9 - ring * 0.0022;
    }
    return 0.56 + 0.26 * sat(y / 600);
  };
};

// ---------- poppy ----------
// A poppy with veined petals, a dark seed head and a curving stem down to the box bottom; `sway` bends it.
export const poppy = ({ x, y, r, rot = 0, sway = 0, bottom = H }: { x: number; y: number; r: number; rot?: number; sway?: number; bottom?: number }): Tone => (px, py) => {
  const hx = x + sway;
  const dx = px - hx;
  const dy = py - y;
  const d = Math.hypot(dx, dy);
  if (d < r * 1.05) {
    const a = Math.atan2(dy, dx) - rot;
    let inPetal = false;
    for (let k = 0; k < 5; k++) {
      const pa = rot + (k * Math.PI * 2) / 5;
      if (Math.hypot(dx - Math.cos(pa) * r * 0.44, dy - Math.sin(pa) * r * 0.44) < r * 0.56) inPetal = true;
    }
    if (d < r * 0.2) return 0.06;
    if (d < r * 0.3) return hash(Math.floor(px / 6), Math.floor(py / 6), 3) < 0.5 ? 0.75 : 0.1;
    if (inPetal) return Math.abs(Math.sin(a * 7)) < 0.14 ? 0.4 : 0.66 + 0.24 * noise(px * 0.03, py * 0.03, 9);
  }
  if (py > y + r * 0.8 && py < bottom) {
    const k = (py - y) / (bottom - y);
    const sx = hx + Math.sin(k * 2.4) * r * 0.25 - sway * k;
    if (Math.abs(px - sx) < 5) return 0.5;
    const lx = sx + (k > 0.45 && k < 0.7 ? Math.sin(((k - 0.45) / 0.25) * Math.PI) * r * 0.8 : 0);
    if (k > 0.45 && k < 0.7 && px > sx && px < lx && Math.floor(py / 9) % 2 === 0) return 0.45;
  }
  return 0;
};

// ---------- icons ----------
export const cloudIcon = ({ x, y, s = 1 }: { x: number; y: number; s?: number }): Tone => (px, py) => {
  const u = (px - x) / s;
  const v = (py - y) / s;
  if (v > 70) return 0;
  const inside = inEll(u, v, 0, 30, 170, 46) || Math.hypot(u + 60, v + 10) < 70 || Math.hypot(u - 30, v + 36) < 86 || Math.hypot(u - 110, v + 4) < 58;
  if (!inside) return 0;
  return 0.6 + 0.3 * noise(u * 0.04, v * 0.04, 13) + (v < -40 ? 0.1 : 0);
};

// A small timber cabin with a lit window and blocky chimney smoke that climbs with t.
export const cabin = ({ x, y, s = 1, t = 0 }: { x: number; y: number; s?: number; t?: number }): Tone => (px, py) => {
  const u = (px - x) / s;
  const v = (py - y) / s;
  if (u > -40 && u < 40 && v > -34 && v < 40) return 1;
  if (u > 70 && u < 110 && v > 0 && v < 100) return 0.12;
  if (u > -150 && u < 150 && v > -60 && v < 100) return Math.floor((v + 60) / 12) % 2 === 0 ? 0.62 : 0.48;
  if (v <= -60 && v > -60 - (170 - Math.abs(u)) * 0.72 && Math.abs(u) < 170) return 0.82 + (Math.floor(u / 18) % 2 === 0 ? 0.1 : 0);
  if (u > 80 && u < 116 && v > -190 && v <= -60) return 0.4;
  for (let k = 0; k < 4; k++) {
    const rise = (t * 22 + k * 40) % 160;
    const cx = 98 + Math.sin(k * 1.7 + t) * 12 + rise * 0.25;
    const cy = -210 - rise;
    const qu = Math.floor(u / 10) * 10 + 5;
    const qv = Math.floor(v / 10) * 10 + 5;
    if (Math.hypot(qu - cx, qv - cy) < 22 - rise * 0.09) return 0.7 - rise * 0.003;
  }
  return 0;
};

// The ridge emblem: a peak with a lit and a shaded face, sun with engraved rings, a passing cloud and a row of firs, inside a slatted ring.
export const emblem = ({ x, y, r, t = 0 }: { x: number; y: number; r: number; t?: number }): Tone => (px, py) => {
  const u = (px - x) / r;
  const v = (py - y) / r;
  const d = Math.hypot(u, v);
  if (d > 1) return 0;
  if (d > 0.95) return 1;
  if (d > 0.9) return 0;
  const front = 0.42 + 0.06 * Math.sin(u * 5 + 1);
  for (const fx of [-0.62, -0.48, 0.44, 0.58, 0.7]) {
    const dy = front + 0.02 - v;
    if (dy > 0 && dy < 0.32 && Math.abs(u - fx) < (0.32 - dy) * 0.3 * (0.7 + 0.3 * ((dy / 0.064) % 1))) return 0.62;
  }
  if (v > front) return 0.06;
  const peak = -0.22 + Math.abs(u + 0.12) * 0.95 + 0.025 * Math.sin(u * 23);
  if (v > peak) {
    const snow = v < -0.06 + 0.04 * Math.sin(u * 17);
    if (u < -0.12) return snow ? 0.95 : 0.62;
    return snow ? 0.7 : 0.26;
  }
  const back = 0.02 + 0.1 * Math.sin(u * 3.2 + 0.6);
  if (v > back) return 0.42;
  const cx = -0.75 + ((t * 0.03) % 1.6);
  if (inEll(Math.floor(u * 40) / 40, Math.floor(v * 40) / 40, cx, -0.42, 0.2, 0.05) || inEll(Math.floor(u * 40) / 40, Math.floor(v * 40) / 40, cx + 0.05, -0.47, 0.1, 0.05)) return 0.98;
  const sd = Math.hypot(u - 0.3, v + 0.3);
  if (sd < 0.16) return 1;
  const ring = sd - 0.2;
  if (ring > 0 && ring < 0.3 && Math.floor(ring / 0.05) % 2 === 0) return 0.9;
  return 0.55;
};

// ---------- the full-colour photo stand-in ----------
const ridgePts = (w: number, h: number, f: (x: number) => number, base: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const x = (i / 64) * w;
    pts.push(`${x.toFixed(1)},${(f((x / w) * 1920) * (h / 1080) + base).toFixed(1)}`);
  }
  return `0,${h} ${pts.join(" ")} ${w},${h}`;
};
const pines = (w: number, h: number, y0: number, n: number, seed: number) => {
  const pts: string[] = [`0,${h}`];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const tall = h * (0.08 + 0.1 * hash(i, seed));
    pts.push(`${(x - w / n / 2).toFixed(1)},${(y0 + h * 0.04).toFixed(1)}`, `${x.toFixed(1)},${(y0 - tall).toFixed(1)}`);
  }
  pts.push(`${w},${h}`);
  return pts.join(" ");
};

// A painted golden-hour valley with a timber lodge; the stand-in for the creator's own photo wherever a `src` is optional.
export const PhotoStandIn: FC<{ x?: number; y?: number; w?: number; h?: number; t?: number }> = ({ x = 0, y = 0, w = W, h = H, t = 0 }) => {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const sx = w / 1920;
  const sy = h / 1080;
  const bx = w * 0.3;
  const by = h * 0.6;
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="hidden">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7E9CBB" />
          <stop offset="0.45" stopColor="#E3C3A1" />
          <stop offset="0.62" stopColor="#F7D49B" />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0.72" cy="0.42" r="0.45">
          <stop offset="0" stopColor="#FFF8E6" stopOpacity="1" />
          <stop offset="0.12" stopColor="#FFE2A6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F4B871" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFF4E2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8592A6" />
          <stop offset="1" stopColor="#B4A99E" />
        </linearGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#120C08" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}s)`} />
      <rect width={w} height={h} fill={`url(#${id}g)`} />
      <polygon points={ridgePts(w, h, ridgeFar, -40 * sy)} fill={`url(#${id}f)`} />
      <rect y={h * 0.5 + Math.sin(t * 0.4) * 4 * sy} width={w} height={h * 0.18} fill={`url(#${id}m)`} />
      <polygon points={ridgePts(w, h, ridgeMid, -10 * sy)} fill="#566A55" />
      <rect y={h * 0.6} width={w} height={h * 0.1} fill={`url(#${id}m)`} opacity={0.6} />
      <g transform={`translate(${bx} ${by}) scale(${sx} ${sy})`}>
        <rect x={-20} y={-230} width={560} height={520} fill="#4A3527" />
        <rect x={540} y={-120} width={260} height={410} fill="#3F2D21" />
        <rect x={120} y={-300} width={300} height={80} fill="#5A4130" />
        {Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 7 }, (_, c) => (
            <rect key={`${r}-${c}`} x={10 + c * 76} y={-210 + r * 66} width={40} height={36} fill={hash(r, c, 2) < 0.7 ? "#FFC56E" : "#3A2A1F"} />
          )),
        )}
        {Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: 3 }, (_, c) => <rect key={`w${r}-${c}`} x={570 + c * 76} y={-90 + r * 76} width={40} height={40} fill={hash(r, c, 5) < 0.6 ? "#FFC56E" : "#3A2A1F"} />),
        )}
        {Array.from({ length: 58 }, (_, k) => (
          <rect key={k} x={-20 + k * 14} y={k * 14 < 560 ? -230 : -120} width={3} height={k * 14 < 560 ? 520 : 410} fill="#2E2119" opacity={0.55} />
        ))}
      </g>
      <polygon points={pines(w, h, h * 0.8, 26, 4)} fill="#2C3B29" />
      <polygon points={pines(w, h, h * 0.9, 18, 7)} fill="#1B2619" />
      <rect width={w} height={h} fill={`url(#${id}v)`} />
    </svg>
  );
};
