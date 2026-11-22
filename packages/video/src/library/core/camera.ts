// Theme-free camera: keyed pan and zoom over a world-space SVG group, with a slow hand-held drift.
import { W, H } from "./video";
import { INOUT, ramp } from "./time";
// Camera: world point at screen centre plus zoom; each key eases in from wherever the last one left off.
export type CamKey = { t: number; x: number; y: number; s: number; d?: number };
export const camAt = (t: number, keys: CamKey[]) => {
  let { x, y, s } = keys[0]!;
  for (const k of keys.slice(1)) {
    if (t < k.t) break;
    const e = ramp(t, k.t, k.d ?? 1, INOUT);
    x += (k.x - x) * e;
    y += (k.y - y) * e;
    s += (k.s - s) * e;
  }
  // A slow hand-held drift so holds never freeze.
  x += Math.sin(t * 0.6) * 4;
  y += Math.sin(t * 0.83 + 1) * 3;
  return `translate(${W / 2} ${H / 2}) scale(${s}) translate(${-x} ${-y})`;
};
