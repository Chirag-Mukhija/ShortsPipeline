// Procedural pictures for the density engine, drawn with SDFs in unit space: the eye, a radiating sun, a lit sphere, an isometric cube, a chip, a globe, a bolt, a heart and a cursor.
import { clamp01, fbm, fill, sdBox, sdCircle, sdPoly, sdSeg, smooth, stroke, type Pic } from "./field";

// An eye on skin. look = where the iris points (-1..1), open = lid opening (0 shut … 1), the burgundy-studio hero in glyphs.
export const eye = (look: [number, number] = [0, 0], open = 1): Pic => (u, v) => {
  const a = 1.0;
  const q = clamp01(1 - (u / a) ** 2);
  const up = -0.5 * Math.pow(q, 0.75) * open;
  const lo = 0.34 * q * Math.max(0.15, open);
  const r = Math.hypot(u * 0.8, v * 1.1);
  // Skin: a light fbm tone, a lid crease and a brow, fading to bare paper well inside the picture's edge.
  let d = (0.02 + 0.12 * fbm(u * 3 + 4, v * 3, 9)) * (1 - smooth(0.6, 1.25, r));
  d += 0.38 * stroke(v - (up - 0.2 - 0.05 * q), 0.022 + 0.015 * q) * smooth(1.0, 0.35, Math.abs(u));
  const brow = v - (-0.92 + 0.2 * u * u + 0.04 * u);
  d = Math.max(d, (0.45 + 0.25 * fbm(u * 18, v * 6, 4)) * stroke(brow, 0.06 * (1 - 0.6 * Math.abs(u)), 0.03) * smooth(1.05, 0.7, Math.abs(u + 0.05)));
  // Under-eye shadow.
  d += 0.12 * smooth(0.12, 0, Math.abs(v - lo - 0.12)) * smooth(0.8, 0.3, Math.abs(u));
  const inside = Math.abs(u) < a && v > up && v < lo;
  if (inside) {
    const lx = look[0] * 0.28;
    const ly = look[1] * 0.12 - 0.03;
    const ir = Math.hypot(u - lx, v - ly);
    const ang = Math.atan2(v - ly, u - lx);
    // Sclera: near-white with shading toward the corners and under the upper lid.
    let s = 0.3 * smooth(0.6, 1.0, Math.abs(u)) + 0.35 * smooth(0.1, 0, v - up);
    if (ir < 0.36) {
      const stri = 0.5 + 0.5 * Math.sin(ang * 23 + fbm(ang * 3, ir * 9, 2) * 6);
      s = 0.42 + 0.32 * stri * smooth(0.1, 0.3, ir) + 0.5 * smooth(0.27, 0.35, ir);
      s = Math.max(s, fill(ir - 0.15, 0.01));
      s += 0.25 * smooth(0.14, 0, v - up);
      // The catch-light: two bare cells of paper.
      s *= 1 - fill(Math.hypot(u - lx - 0.11, v - ly + 0.12) - 0.06, 0.012);
    }
    d = s;
  }
  // Lid lines and lashes.
  d = Math.max(d, stroke(v - up, 0.05 * q + 0.012, 0.012) * (Math.abs(u) < a ? 1 : 0));
  d = Math.max(d, 0.62 * stroke(v - lo, 0.022 * q + 0.006, 0.01) * (Math.abs(u) < a ? 1 : 0));
  if (open > 0.3)
    for (let k = 0; k < 9; k++) {
      const lu = -0.75 + k * 0.19;
      const lq = clamp01(1 - (lu / a) ** 2);
      const ly0 = -0.5 * Math.pow(lq, 0.75) * open;
      const dir = lu * 0.25;
      d = Math.max(d, 0.85 * stroke(sdSeg(u, v, lu, ly0, lu + dir - 0.02, ly0 - 0.16 * lq - 0.03), 0.012, 0.01));
    }
  return clamp01(d);
};

// A radiating sun: shaded disc, a ring and wedge rays (the Bitmap Dream test card).
export const sun = (spin = 0, rays = 16): Pic => (u, v) => {
  const r = Math.hypot(u, v);
  const ang = Math.atan2(v, u) + spin;
  let d = fill(r - 0.42, 0.015) * (0.75 + 0.25 * smooth(-0.4, 0.4, u + v));
  d = Math.max(d, 0.85 * stroke(r - 0.56, 0.035));
  const sector = (Math.PI * 2) / rays;
  const a = ((ang % sector) + sector) % sector - sector / 2;
  const wedge = Math.abs(a) * r - 0.06 * (1 - (r - 0.66) / 0.34);
  if (r > 0.66 && r < 1.0) d = Math.max(d, 0.7 * fill(wedge, 0.012));
  d = Math.max(d, 0.35 * stroke(r - 1.06, 0.012));
  return d;
};

// A lit sphere with a cast shadow: the cleanest demo of a full luminance ramp.
export const sphere = (light: [number, number] = [-0.55, -0.6]): Pic => (u, v) => {
  const R = 0.72;
  const x = u / R;
  const y = (v + 0.08) / R;
  const rr = x * x + y * y;
  const shadow = 0.45 * fill(Math.hypot(u * 0.55 - 0.08, (v - 0.78) * 2.4) - 0.42, 0.06);
  if (rr > 1) return shadow;
  const z = Math.sqrt(1 - rr);
  const lz = Math.sqrt(Math.max(0, 1 - light[0] ** 2 - light[1] ** 2));
  const lam = Math.max(0, x * light[0] + y * light[1] + z * lz);
  const spec = Math.pow(lam, 30);
  return clamp01(0.08 + 0.92 * (1 - lam) ** 1.2 - spec * 0.6) * fill(Math.sqrt(rr) - 1, 0.02);
};

// An isometric cube, three faces at three densities.
export const cube = (u: number, v: number) => {
  const s = 0.62;
  const c = Math.cos(Math.PI / 6) * s;
  const top: [number, number][] = [[0, -s * 1.25], [c, -s * 0.75], [0, -s * 0.25], [-c, -s * 0.75]];
  const left: [number, number][] = [[-c, -s * 0.75], [0, -s * 0.25], [0, s * 0.95], [-c, s * 0.45]];
  const right: [number, number][] = [[c, -s * 0.75], [0, -s * 0.25], [0, s * 0.95], [c, s * 0.45]];
  const tex = 0.06 * fbm(u * 8, v * 8, 3);
  let d = 0;
  d = Math.max(d, (0.22 + tex) * fill(sdPoly(u, v, top), 0.01));
  d = Math.max(d, (0.55 + tex) * fill(sdPoly(u, v, left), 0.01));
  d = Math.max(d, (0.9 + tex) * fill(sdPoly(u, v, right), 0.01));
  return clamp01(d);
};

// A microchip: dark body, light die with a grid, pins on all four sides.
export const chip = (u: number, v: number) => {
  let d = 0.85 * fill(sdBox(u, v, 0.55, 0.55, 0.06), 0.01);
  const die = sdBox(u, v, 0.3, 0.3, 0.02);
  if (die < 0) d = 0.22 + 0.5 * Math.max(stroke(((u + 0.3) % 0.15) - 0.075, 0.008), stroke(((v + 0.3) % 0.15) - 0.075, 0.008));
  for (let k = 0; k < 6; k++) {
    const p = -0.42 + k * 0.168;
    d = Math.max(d, 0.7 * fill(sdBox(u - p, Math.abs(v) - 0.72, 0.035, 0.14), 0.01), 0.7 * fill(sdBox(Math.abs(u) - 0.72, v - p, 0.14, 0.035), 0.01));
  }
  return d;
};

// A globe: shaded disc with meridians and parallels.
export const globe = (spin = 0): Pic => (u, v) => {
  const r = Math.hypot(u, v);
  const R = 0.82;
  if (r > R + 0.04) return 0;
  const edge = stroke(r - R, 0.025);
  if (r > R) return 0.9 * edge;
  const lat = Math.asin(v / R);
  const lon = Math.asin(clamp01(Math.abs(u) / (R * Math.cos(lat))) * Math.sign(u)) + spin;
  const grid = Math.max(stroke(Math.sin(lat * 6), 0.07), stroke(Math.sin(lon * 4), 0.08 / Math.max(0.3, Math.cos(lat))));
  const shade = 0.12 + 0.25 * smooth(-0.6, 0.9, (u + v) / R);
  return Math.max(edge * 0.9, shade + 0.6 * grid);
};

export const bolt = (u: number, v: number) => {
  const p: [number, number][] = [[0.12, -0.95], [-0.5, 0.12], [-0.04, 0.12], [-0.18, 0.95], [0.5, -0.18], [0.04, -0.18]];
  const d = sdPoly(u, v, p);
  return Math.max(fill(d, 0.012) * (0.62 + 0.38 * smooth(-0.9, 0.9, v)), 0.95 * stroke(d, 0.025));
};

export const heart = (u: number, v: number) => {
  const x = u * 1.15;
  const y = -v * 1.15 + 0.15;
  const k = (x * x + y * y - 0.5) ** 3 - x * x * y * y * y;
  return k < 0 ? 0.6 + 0.4 * smooth(0.6, -0.6, u + v * 0.5) : 0;
};

export const cursor = (u: number, v: number) => {
  const p: [number, number][] = [[-0.45, -0.9], [-0.45, 0.6], [-0.1, 0.28], [0.15, 0.85], [0.32, 0.77], [0.08, 0.22], [0.52, 0.2]];
  const d = sdPoly(u, v, p);
  return Math.max(0.18 * fill(d, 0.01), 0.95 * stroke(d, 0.04));
};

export const ring = (r0 = 0.6, w = 0.12): Pic => (u, v) => stroke(sdCircle(u, v, r0), w, 0.06);

export const PICS = { eye: eye(), sun: sun(), sphere: sphere(), cube, chip, globe: globe(), bolt, heart, cursor } satisfies Record<string, Pic>;
export type PicName = keyof typeof PICS;
