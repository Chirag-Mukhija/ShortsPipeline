// Isometric geometry and motion math: the projection view, box faces (with optional turn about the vertical axis), stagger, rise/sink curves and the grid camera.
import { createContext, useContext } from "react";
import { Easing, interpolate, interpolateColors } from "remotion";
import { FPS, H, W } from "../../core/video";
import type { Tone } from "./theme";

export const C30 = Math.cos(Math.PI / 6);
export const S30 = 0.5;

// u = screen px per grid unit; (ox, oy) = where the world pivot (cx, cy, 0) lands on screen; rot turns the world about the vertical axis; gz lifts the ground (a plate's top).
export type View = { u: number; ox: number; oy: number; cx: number; cy: number; rot: number; gz: number };
export const DEFAULT_VIEW: View = { u: 72, ox: W / 2, oy: H / 2, cx: 0, cy: 0, rot: 0, gz: 0 };
export const view = (v: Partial<View>): View => ({ ...DEFAULT_VIEW, ...v });

export const ViewCtx = createContext<View>(DEFAULT_VIEW);
export const useView = () => useContext(ViewCtx);
// Filter ids of the enclosing IsoWorld (shadow blur, glow).
export const FxCtx = createContext<{ shadow: string; soft: string }>({ shadow: "", soft: "" });
export const useFx = () => useContext(FxCtx);

export type P2 = [number, number];
const rotXY = (v: View, x: number, y: number): P2 => {
  const dx = x - v.cx;
  const dy = y - v.cy;
  const c = Math.cos(v.rot);
  const s = Math.sin(v.rot);
  return [dx * c - dy * s, dx * s + dy * c];
};
export const proj = (v: View, x: number, y: number, z = 0): P2 => {
  const [xr, yr] = rotXY(v, x, y);
  return [v.ox + (xr - yr) * C30 * v.u, v.oy + (xr + yr) * S30 * v.u - (z + v.gz) * v.u];
};
// Painter's order key: larger = nearer the viewer.
export const depthOf = (v: View, x: number, y: number) => {
  const [xr, yr] = rotXY(v, x, y);
  return xr + yr;
};
export const pts = (list: P2[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// SVG matrix that lays local 2D drawing flat on the plane z (local x along world x, local y along world y, 1 local unit = 1 grid unit).
export const floorMatrix = (v: View, x: number, y: number, z: number) => {
  const o = proj(v, x, y, z);
  const ax = proj(v, x + 1, y, z);
  const ay = proj(v, x, y + 1, z);
  return `matrix(${ax[0] - o[0]} ${ax[1] - o[1]} ${ay[0] - o[0]} ${ay[1] - o[1]} ${o[0]} ${o[1]})`;
};

export type SideFace = { a: P2; b: P2; z0: number; z1: number; k: number; color: string; poly: P2[] };
export type BoxGeo = { sides: SideFace[]; top: P2[]; base: P2[] };

// The visible faces of an axis-aligned box. k is 0 for a left-facing (+y) face, 1 for a right-facing (+x) face, in between while turning.
export const boxGeo = (v: View, x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone): BoxGeo => {
  const c: P2[] = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const normals: P2[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const co = Math.cos(v.rot);
  const si = Math.sin(v.rot);
  const sides: SideFace[] = [];
  for (let i = 0; i < 4; i++) {
    const [nx, ny] = normals[i]!;
    const rx = nx * co - ny * si;
    const ry = nx * si + ny * co;
    if (rx + ry <= 1e-6) continue;
    const a = c[i]!;
    const b = c[(i + 1) % 4]!;
    const k = Math.min(1, Math.max(0, (1 - (ry - rx)) / 2));
    sides.push({
      a, b, z0: z, z1: z + h, k,
      color: interpolateColors(k, [0, 1], [tone.left, tone.right]),
      poly: [proj(v, a[0], a[1], z), proj(v, b[0], b[1], z), proj(v, b[0], b[1], z + h), proj(v, a[0], a[1], z + h)],
    });
  }
  return { sides, top: c.map(([px, py]) => proj(v, px, py, z + h)), base: c.map(([px, py]) => proj(v, px, py, z)) };
};

// A quad on a side face: s along the bottom edge (0..1), z in world units.
export const faceQuad = (v: View, f: SideFace, s0: number, s1: number, z0: number, z1: number): P2[] => {
  const at = (s: number, z: number) => proj(v, f.a[0] + (f.b[0] - f.a[0]) * s, f.a[1] + (f.b[1] - f.a[1]) * s, z);
  return [at(s0, z0), at(s1, z0), at(s1, z1), at(s0, z1)];
};

// ---- motion ----
const sec = (frames: number) => frames / FPS;
// Stagger by grid distance from an origin tile: 2 frames per tile, capped at 24 frames.
export const stagger = (at: number, gx: number, gy: number, ox = 0, oy = 0, per = 2, max = 24) =>
  at + sec(Math.min(max, per * (Math.abs(gx - ox) + Math.abs(gy - oy))));

const BACK = Easing.out(Easing.back(1.4));
const INC = Easing.in(Easing.cubic);
// Rise from the ground (40 px, back-out 1.4, 16 f) and sink/shrink away (in-cubic, 10 f). at undefined = already standing.
export const riseState = (t: number, at?: number, out?: number) => {
  const f = t * FPS;
  const fi = at === undefined ? 99 : f - at * FPS;
  const e = interpolate(fi, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BACK });
  const op = interpolate(fi, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const o = out === undefined ? 0 : interpolate(f - out * FPS, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: INC });
  return { dy: 40 * (1 - e), op: op * (o >= 1 ? 0 : 1), scale: 1 - o, k: Math.min(e, 1) * (1 - o), visible: fi > 0 && o < 1 };
};

// Line draw-on over 18 f by default.
export const drawOn = (t: number, at?: number, frames = 18) =>
  at === undefined ? 1 : interpolate(t * FPS - at * FPS, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

// 0 → 1 over d seconds from a, with an ease.
export const ease = (t: number, a: number, d: number, e: (x: number) => number = Easing.inOut(Easing.cubic)) =>
  !Number.isFinite(a) ? (a < 0 ? 1 : 0) : interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

// Idle bob: 3 px over a 90-frame period, phase-shifted per object.
export const bob = (t: number, phase = 0, amp = 3) => Math.sin(((t * FPS) / 90) * Math.PI * 2 + phase) * amp;

// Grid camera: screen point (x, y) of the world drawing brought to the centre at zoom s; each key glides in from the last (in-out-cubic, d seconds, default 34 f).
export type IsoCamKey = { t: number; x: number; y: number; s: number; d?: number };
export const isoCam = (t: number, keys: IsoCamKey[]) => {
  let { x, y, s } = keys[0]!;
  for (const k of keys.slice(1)) {
    if (t < k.t) break;
    const e = ease(t, k.t, k.d ?? 34 / FPS);
    x += (k.x - x) * e;
    y += (k.y - y) * e;
    s += (k.s - s) * e;
  }
  return `translate(${W / 2} ${H / 2}) scale(${s}) translate(${-x} ${-y})`;
};

// Path length and point-at-distance for a world polyline.
export type WP = [number, number];
export const pathLen = (path: WP[]) => path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i]![0], p[1] - path[i]![1]), 0);
export const pointAt = (path: WP[], s: number): WP => {
  let rest = s;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= l || i === path.length - 1) {
      const q = l === 0 ? 0 : Math.min(1, Math.max(0, rest / l));
      return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
    }
    rest -= l;
  }
  return path[path.length - 1]!;
};
// An L-shaped route on the grid: along x first, then y.
export const lPath = (from: WP, to: WP): WP[] => (from[0] === to[0] || from[1] === to[1] ? [from, to] : [from, [to[0], from[1]], to]);
