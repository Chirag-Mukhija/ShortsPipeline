// Density fields: the one source every mark renderer reads. Seeded hashes, ordered/blue-noise thresholds, SDF shapes, combinators and box fitting.
export type Field = (x: number, y: number) => number;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mixN = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (e0: number, e1: number, x: number) => {
  const k = clamp01((x - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};

// Integer hash → 0..1. Cheap enough to call per cell per frame, and identical on every render.
export const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const B8 = (() => {
  const m = [[0]];
  let cur = m;
  for (let n = 1; n < 8; n *= 2) {
    const next: number[][] = Array.from({ length: n * 2 }, () => new Array<number>(n * 2).fill(0));
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = cur[y]![x]! * 4;
        next[y]![x] = v;
        next[y]![x + n] = v + 2;
        next[y + n]![x] = v + 3;
        next[y + n]![x + n] = v + 1;
      }
    cur = next;
  }
  return cur.flat();
})();
// Ordered-dither threshold for an 8×8 Bayer matrix, 0..1 (centred inside each step).
export const bayer = (i: number, j: number) => (B8[(((j % 8) + 8) % 8) * 8 + (((i % 8) + 8) % 8)]! + 0.5) / 64;
// Interleaved-gradient noise: a deterministic blue-ish threshold with no texture to load.
export const blue = (i: number, j: number) => {
  const v = 52.9829189 * ((0.06711056 * i + 0.00583715 * j) % 1);
  return v - Math.floor(v);
};

// Smooth value noise (seeded), 0..1.
export const vnoise = (x: number, y: number, seed = 0) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return mixN(mixN(a, b, u), mixN(c, d, u), v);
};
export const fbm = (x: number, y: number, seed = 0) => vnoise(x, y, seed) * 0.6 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.1;

// ---------- signed distances (unit space, negative inside) ----------
export const sdCircle = (x: number, y: number, r: number) => Math.hypot(x, y) - r;
export const sdBox = (x: number, y: number, hw: number, hh: number, r = 0) => {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
export const sdSeg = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const px = x - ax;
  const py = y - ay;
  const dx = bx - ax;
  const dy = by - ay;
  const h = clamp01((px * dx + py * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - dx * h, py - dy * h);
};
export const sdPoly = (x: number, y: number, pts: [number, number][]) => {
  let d = Infinity;
  let inside = false;
  for (let k = 0, l = pts.length - 1; k < pts.length; l = k++) {
    const [ax, ay] = pts[l]!;
    const [bx, by] = pts[k]!;
    d = Math.min(d, sdSeg(x, y, ax, ay, bx, by));
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -d : d;
};
// Coverage of a shape from its distance, with a soft edge so glyph ramps get in-between marks.
export const fill = (d: number, soft = 0.02) => smooth(soft, -soft, d);
export const stroke = (d: number, w: number, soft = 0.015) => smooth(w + soft, w - soft, Math.abs(d));

// ---------- combinators ----------
export const blank: Field = () => 0;
export const mix = (a: Field, b: Field, k: number): Field => (k <= 0 ? a : k >= 1 ? b : (x, y) => mixN(a(x, y), b(x, y), k));
export const add = (...fs: Field[]): Field => (x, y) => clamp01(fs.reduce((s, f) => s + f(x, y), 0));
export const max = (...fs: Field[]): Field => (x, y) => fs.reduce((s, f) => Math.max(s, f(x, y)), 0);
export const gain = (f: Field, g: number, lift = 0): Field => (x, y) => clamp01(f(x, y) * g + lift);
export const invert = (f: Field): Field => (x, y) => 1 - f(x, y);
export const shift = (f: Field, dx: number, dy: number): Field => (x, y) => f(x - dx, y - dy);
// Shade a mask with a texture so a solid letter or shape is drawn in many glyphs, not a wall of "@".
export const shade = (mask: Field, tex: Field): Field => (x, y) => {
  const m = mask(x, y);
  return m <= 0 ? 0 : m * tex(x, y);
};

// A picture in unit space ([-1, 1] on the short side, y down) placed into a w×h px box: centre (cx, cy) in the box, scale s.
export type Pic = (u: number, v: number) => number;
export const place = (pic: Pic, w: number, h: number, s = 1, cx = w / 2, cy = h / 2): Field => {
  const k = (Math.min(w, h) / 2) * s;
  return (x, y) => pic((x - cx) / k, (y - cy) / k);
};

// Gradients and noise as fields in box px.
export const linear = (w: number, h: number, angle = 0, from = 0, to = 1): Field => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const span = Math.abs(w * c) + Math.abs(h * s);
  return (x, y) => mixN(from, to, clamp01(((x - w / 2) * c + (y - h / 2) * s) / span + 0.5));
};
export const radial = (cx: number, cy: number, r: number, from = 1, to = 0): Field => (x, y) => mixN(from, to, clamp01(Math.hypot(x - cx, y - cy) / r));
export const noiseField = (scale: number, seed = 0, lo = 0, hi = 1): Field => (x, y) => mixN(lo, hi, fbm(x / scale, y / scale, seed));
