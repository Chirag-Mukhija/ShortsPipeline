// CPU port of every pattern in shaders.ts, drawn into ImageData: the fallback when Chromium runs without WebGL (Remotion's default GL flags give none).
import type { DrawSpec, Rendered } from "./engine";
import { rgb01 } from "./engine";
import type { PatternName } from "./shaders";

type RGB = [number, number, number];
type U = { c: RGB[]; n: number; p: number[]; q: number[]; px: number };
// Pattern result, reused per pixel to avoid allocation: r, g, b (0..1, straight), alpha, field value v.
const o = { r: 0, g: 0, b: 0, a: 1, v: 0 };

const fract = (x: number) => x - Math.floor(x);
const mod = (x: number, m: number) => x - m * Math.floor(x / m);
const len = (x: number, y: number) => Math.sqrt(x * x + y * y);
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const tri = (x: number) => Math.abs(fract(x) - 0.5) * 2;
let SEED = 0;
const h21 = (x: number, y: number) => {
  let a = fract(x * 123.34 + SEED * 0.137);
  let b = fract(y * 456.21 + SEED * 0.137);
  const d = a * (a + 45.32) + b * (b + 45.32);
  a += d;
  b += d;
  return fract(a * b);
};
const vnoise = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
// Per-draw caches: a cell's drifting seed and a metaball's position depend only on the cell/ball and time, not the pixel.
let STAMP = 0;
const CELLS = 160;
const cellStamp = new Int32Array(CELLS * CELLS);
const cellData = new Float64Array(CELLS * CELLS * 3);
const cellSeed = (cx: number, cy: number, t: number, drift: number) => {
  const k = mod(cx + CELLS / 2, CELLS) * CELLS + mod(cy + CELLS / 2, CELLS);
  if (cellStamp[k] !== STAMP) {
    const h = h21(cx, cy);
    cellStamp[k] = STAMP;
    cellData[k * 3] = 0.5 + drift * Math.sin(t * 0.6 + 6.28318 * h);
    cellData[k * 3 + 1] = 0.5 + drift * Math.cos(t * 0.5 + 6.28318 * fract(h * 7.31));
    cellData[k * 3 + 2] = h;
  }
  return k * 3;
};
let ballStamp = -1;
const balls = new Float64Array(6 * 6);
const pick = (u: U, i: number) => u.c[Math.min(4, Math.floor(mod(i, u.n) + 0.5))]!;
const set = (c: RGB, a = 1) => { o.r = c[0]; o.g = c[1]; o.b = c[2]; o.a = a; };
const mixTo = (c0: RGB, c1: RGB, m: number) => {
  o.r = c0[0] + (c1[0] - c0[0]) * m;
  o.g = c0[1] + (c1[1] - c0[1]) * m;
  o.b = c0[2] + (c1[2] - c0[2]) * m;
  o.a = 1;
};
const bands = (u: U, x: number, first: number, count: number, w: number) => {
  const i = Math.floor(x);
  mixTo(pick(u, first + mod(i - 1, count)), pick(u, first + mod(i, count)), sstep(0, Math.max(w, 1e-4), x - i));
};

export const FIELDS: Record<PatternName, (x: number, y: number, t: number, u: U) => void> = {
  spiral: (x, y, t, u) => {
    const [arms, rings, duty] = u.p as [number, number, number];
    const r = len(x, y);
    const a = Math.atan2(y, x) / 6.28318;
    const k = r * rings + a * arms - t * 0.5;
    const w = u.px * (rings + arms / (6.28318 * Math.max(r, 1e-3)));
    const d = tri(k);
    o.v = d;
    mixTo(u.c[1]!, u.c[0]!, sstep(duty - w, duty + w, d));
  },
  swirl: (x, y, t, u) => {
    const [rep, twist, wob] = u.p as [number, number, number];
    const r = len(x, y);
    const a = Math.atan2(y, x) / 6.28318;
    const n = rep * u.n;
    const sr = Math.sqrt(r);
    const k = a * n + twist * sr * n * 0.5 + wob * Math.sin(r * 7 - t * 1.1) - t * 0.35;
    const w = u.px * n * (1 / (6.28318 * Math.max(r, 1e-3)) + (twist * 0.25) / Math.sqrt(Math.max(r, 1e-3)));
    o.v = tri(k);
    bands(u, k, 0, u.n, w * 1.5);
  },
  waves: (x, y, t, u) => {
    const [rows, freq, amp, duty] = u.p as [number, number, number, number];
    const z = Math.abs(fract(x * freq - t * 0.25) - 0.5) * 4 - 1;
    const k = y * rows + amp * z;
    const d = tri(k + 0.5);
    const w = u.px * (rows + 4 * amp * freq) * 1.2;
    o.v = 1 - d;
    mixTo(u.c[0]!, pick(u, 1 + mod(Math.floor(k + 0.5), Math.max(u.n - 1, 1))), 1 - sstep(duty - w, duty + w, d));
  },
  voronoi: (x, y, t, u) => {
    const [dens, drift, width] = u.p as [number, number, number];
    const qx = x * dens, qy = y * dens;
    const cx = Math.floor(qx), cy = Math.floor(qy);
    const fx = qx - cx, fy = qy - cy;
    let f1 = 8, f2 = 8, idx = 0, idy = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const k = cellSeed(cx + i, cy + j, t, drift);
        const d = len(i + cellData[k]! - fx, j + cellData[k + 1]! - fy);
        if (d < f1) { f2 = f1; f1 = d; idx = cx + i; idy = cy + j; }
        else if (d < f2) f2 = d;
      }
    const h = h21(idx, idy);
    o.v = h;
    const w = u.px * dens * 1.2;
    mixTo(pick(u, 1 + Math.floor(h * (u.n - 1))), u.c[0]!, 1 - sstep(width - w, width + w, f2 - f1));
  },
  perlin: (x, y, t, u) => {
    const [freq, nb, warp, th] = u.p as [number, number, number, number];
    let qx = x * freq, qy = y * freq;
    const wx = vnoise(qx, qy + t * 0.12), wy = vnoise(qx + 5.2, qy - t * 0.12);
    qx += warp * wx - warp * 0.5;
    qy += warp * wy - warp * 0.5;
    let s = 0, a = 0.5, px = qx + t * 0.06, py = qy;
    for (let i = 0; i < 3; i++) { s += a * vnoise(px, py); px = px * 2.03 + 11.7; py = py * 2.03 + 11.7; a *= 0.5; }
    const n = s / 0.875;
    o.v = n;
    const w = u.px * freq * 2.2;
    if (nb < 0.5) mixTo(u.c[0]!, u.c[1]!, sstep(th - w, th + w, n));
    else bands(u, n * nb, 0, u.n, w * nb);
  },
  dots: (x, y, t, u) => {
    const [dens, rad0, orbit, mode] = u.p as [number, number, number, number];
    const qx = x * dens, qy = y * dens;
    const ix = Math.floor(qx), iy = Math.floor(qy);
    const fx = qx - ix - 0.5, fy = qy - iy - 0.5;
    const h = h21(ix, iy);
    let ox = orbit * Math.cos(t * 1.3 + h * 6.28318), oy = orbit * Math.sin(t * 1.3 + h * 6.28318);
    let rad = rad0;
    let ink: RGB = pick(u, 1 + Math.floor(h * (u.n - 1)));
    if (mode > 0.5 && mode < 1.5) {
      const rx = (ix + 0.5) / dens - u.q[0]!, ry = (iy + 0.5) / dens - u.q[1]!;
      const ang = fract(Math.atan2(rx, -ry) / 6.28318 + 1);
      const ring = len(rx, ry) <= u.q[2]! ? 1 : 0;
      const inside = ang <= u.q[3]! ? ring : 0;
      rad = inside ? rad0 * 1.45 : rad0 * (ring ? 0.55 : 0.35);
      ink = inside ? u.c[1]! : ring ? u.c[2]! : u.c[3]!;
      ox = oy = 0;
    } else if (mode > 1.5) {
      rad = rad0 * sstep(0.28, 0.72, vnoise(((ix + 0.5) / dens) * 2.4 + t * 0.15, ((iy + 0.5) / dens) * 2.4 - t * 0.08));
      ox = oy = 0;
    }
    const d = len(fx - ox, fy - oy);
    const w = u.px * dens * 1.1;
    o.v = h;
    mixTo(u.c[0]!, ink, 1 - sstep(rad - w, rad + w, d));
  },
  metaballs: (x, y, t, u) => {
    const [rs, spread, pulse, count] = u.p as [number, number, number, number];
    const nb = Math.min(6, count);
    if (ballStamp !== STAMP) {
      ballStamp = STAMP;
      for (let i = 0; i < nb; i++) {
        const c = pick(u, 1 + mod(i, u.n - 1));
        const rr = (0.13 + 0.05 * Math.sin(i * 3.7)) * rs * (1 + pulse);
        balls.set([Math.sin(t * (0.37 + i * 0.11) + i * 2.1) * 0.62 * spread, Math.cos(t * (0.29 + i * 0.07) + i * 1.3) * 0.3 * spread, rr * rr, c[0], c[1], c[2]], i * 6);
      }
    }
    let sum = 0, ws = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < nb; i++) {
      const dx = x - balls[i * 6]!, dy = y - balls[i * 6 + 1]!;
      const k = balls[i * 6 + 2]! / Math.max(dx * dx + dy * dy, 1e-5);
      const k3 = k * k * k;
      sum += k; ws += k3; r += k3 * balls[i * 6 + 3]!; g += k3 * balls[i * 6 + 4]!; b += k3 * balls[i * 6 + 5]!;
    }
    const w = u.px * 14;
    const m = sstep(1 - w, 1 + w, sum);
    o.v = clamp(sum * 0.5);
    const c0 = u.c[0]!;
    if (m <= 0) { set(c0); return; }
    const s = 1 / Math.max(ws, 1e-9);
    const hi = sstep(2, 6, sum);
    r *= s; g *= s; b *= s;
    r += (Math.min(r * 1.12 + 0.05, 1) - r) * hi;
    g += (Math.min(g * 1.12 + 0.05, 1) - g) * hi;
    b += (Math.min(b * 1.12 + 0.05, 1) - b) * hi;
    o.r = c0[0] + (r - c0[0]) * m; o.g = c0[1] + (g - c0[1]) * m; o.b = c0[2] + (b - c0[2]) * m; o.a = 1;
  },
  rays: (x, y, t, u) => {
    const [sx, sy, dens, inten] = u.p as [number, number, number, number];
    const rx = x - sx, ry = y - sy;
    const a = Math.atan2(ry, rx);
    const r = len(rx, ry);
    let s = 0;
    for (let k = 0; k < 4; k++) s += Math.sin(a * Math.floor(dens * (1 + k * 1.37)) + t * (0.35 + k * 0.21) + k * 1.7) / (1 + k * 0.6);
    const ray = Math.pow(clamp(0.5 + (0.5 * s) / 2.1), 2.4);
    const core = Math.exp(-r * 5);
    const i = ray * Math.exp(-r * 0.9) * inten;
    o.v = clamp(i + core);
    mixTo(u.c[0]!, u.c[1]!, clamp(i * 1.6));
    const hi = pick(u, Math.min(2, u.n - 1)), m = clamp(i * i * 1.4 + core * 0.9);
    o.r += (hi[0] - o.r) * m; o.g += (hi[1] - o.g) * m; o.b += (hi[2] - o.b) * m;
  },
  border: (x, y, t, u) => {
    const [bw, bh, rad, th] = u.p as [number, number, number, number];
    const qx = Math.abs(x) - bw + rad, qy = Math.abs(y) - bh + rad;
    const sd = len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
    const d = Math.abs(sd) - th * 0.5;
    const clear = u.q[1]! > 0.5;
    // Past ~0.35 units the glow is under 1/255: skip the colour work.
    if (d > 0.35) { o.v = 0; if (clear) set(u.c[0]!, 0); else set(u.c[0]!); return; }
    const w = u.px * 1.2;
    const line = 1 - sstep(-w, w, d);
    const glow = Math.exp(-Math.max(d, 0) * 22) * (0.6 + 0.4 * Math.sin(t * 2.2)) * (0.7 + u.q[0]!);
    const k = fract(Math.atan2(y, x) / 6.28318 + t * 0.12) * (u.n - 1);
    const c0 = pick(u, 1 + Math.floor(k)), c1 = pick(u, 1 + mod(Math.floor(k) + 1, u.n - 1));
    const m = sstep(0, 1, fract(k));
    const a = clamp(Math.max(line, glow));
    const ia = 1 / Math.max(a, 1e-3);
    const e = line * 0.6 + glow, l = line * 0.45;
    const r = Math.min(Math.min((c0[0] + (c1[0] - c0[0]) * m) * e + l, 1) * ia, 1);
    const g = Math.min(Math.min((c0[1] + (c1[1] - c0[1]) * m) * e + l, 1) * ia, 1);
    const b = Math.min(Math.min((c0[2] + (c1[2] - c0[2]) * m) * e + l, 1) * ia, 1);
    o.v = a;
    if (clear) { o.r = r; o.g = g; o.b = b; o.a = a; return; }
    const g0 = u.c[0]!;
    o.r = g0[0] + (r - g0[0]) * a; o.g = g0[1] + (g - g0[1]) * a; o.b = g0[2] + (b - g0[2]) * a; o.a = 1;
  },
  stripes: (x, y, t, u) => {
    const [ang, freq, wob, wf] = u.p as [number, number, number, number];
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const k = (x * dx + y * dy) * freq + wob * Math.sin((-x * dy + y * dx) * wf + t * 0.8) - t * 0.5;
    o.v = tri(k);
    bands(u, k, 0, u.n, u.px * (freq + wob * wf) * 1.2);
  },
};

// Soft, glow-only patterns lose nothing at half resolution on the CPU path.
const SOFT: Partial<Record<PatternName, number>> = { rays: 0.5 };

let cpuCanvas: HTMLCanvasElement | null = null;

export const renderCpu = (spec: DrawSpec): Rendered | null => {
  if (typeof document === "undefined") return null;
  const f = SOFT[spec.pattern] ?? 1;
  const d = { ...spec, w: Math.max(2, Math.round(spec.w * f)), h: Math.max(2, Math.round(spec.h * f)) };
  cpuCanvas ??= document.createElement("canvas");
  if (cpuCanvas.width < d.w || cpuCanvas.height < d.h) {
    cpuCanvas.width = Math.max(cpuCanvas.width, d.w);
    cpuCanvas.height = Math.max(cpuCanvas.height, d.h);
  }
  const ctx = cpuCanvas.getContext("2d");
  if (!ctx) return null;
  const cols = d.colors.length ? d.colors : ["#000000"];
  const u: U = {
    c: Array.from({ length: 5 }, (_, i) => rgb01(cols[Math.min(i, cols.length - 1)]!)),
    n: Math.min(5, cols.length),
    p: d.p,
    q: d.q,
    px: (d.rect.w / d.w / d.origin[2] / d.cam[2]) * d.scale,
  };
  SEED = d.seed;
  STAMP++;
  const field = FIELDS[d.pattern];
  const img = ctx.createImageData(d.w, d.h);
  const data = img.data;
  const cr = Math.cos(d.cam[3]), sr = Math.sin(d.cam[3]);
  for (let j = 0; j < d.h; j++) {
    const py = d.rect.y + ((j + 0.5) / d.h) * d.rect.h;
    for (let i = 0; i < d.w; i++) {
      const px = d.rect.x + ((i + 0.5) / d.w) * d.rect.w;
      const ux = (px - d.origin[0]) / d.origin[2], uy = (py - d.origin[1]) / d.origin[2];
      // Same as the shader's mat2(c, s, -s, c) * p: GLSL matrices are column-major.
      const x = ((cr * ux - sr * uy) / d.cam[2] + d.cam[0]) * d.scale;
      const y = ((sr * ux + cr * uy) / d.cam[2] + d.cam[1]) * d.scale;
      o.a = 1;
      field(x, y, d.time, u);
      let a = o.a;
      if (d.threshold > 0) a *= sstep(d.threshold - 0.015, d.threshold + 0.015, o.v);
      const k = (j * d.w + i) * 4;
      data[k] = o.r * 255;
      data[k + 1] = o.g * 255;
      data[k + 2] = o.b * 255;
      data[k + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { src: cpuCanvas, sx: 0, sy: 0, sw: d.w, sh: d.h };
};
