// Stepped timing for the clunky-on-purpose look: local frames from a cue, frame-quantised progress, stepped pops, 4 Hz blink and keyed paths.
import { FPS } from "../../core/video";

export const fr = (s: number) => Math.round(s * FPS);
export const local = (f: number, at: number) => f - fr(at);
export const quant = (f: number, n: number) => Math.floor(f / n) * n;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Progress 0..1 over `frames`, advancing only every `step` frames, like an animated GIF.
export const stepP = (f: number, at: number, frames: number, step = 1) => {
  const l = local(f, at);
  return l < 0 ? 0 : clamp(quant(l, step) / frames);
};

// Icon pop on fixed frames, no easing curve: small, overshoot, settle.
export const popS = (l: number) => (l < 0 ? 0 : l < 2 ? 0.55 : l < 4 ? 1.18 : l < 6 ? 0.94 : 1);

// 4 Hz blink: on/off every 3.75 frames.
export const blink = (f: number, hz = 4) => Math.floor((f * hz * 2) / FPS) % 2 === 0;

// A keyed path sampled in 3-frame steps, so motion snaps like a slow machine redrawing the screen.
export type Key = { t: number; x: number; y: number };
export const pathAt = (f: number, keys: Key[], step = 3) => {
  const t = quant(f, step) / FPS;
  let { x, y } = keys[0]!;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t <= a.t) break;
    const k = clamp((t - a.t) / Math.max(0.001, b.t - a.t));
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    x = lerp(a.x, b.x, e);
    y = lerp(a.y, b.y, e);
  }
  return { x, y };
};

// Seeded RNG (mulberry32) for star tiles and glitch bars.
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
