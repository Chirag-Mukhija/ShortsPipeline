// Stepped arcade timing: local frames from a cue, holds on 2s and 3s, the 3-step pop, 8 px quantised slides, 4 Hz blink, colour cycling and stepped shake.
import { random } from "remotion";
import { FPS } from "../../core/video";
import { useTime } from "../../core/time";
import { CYCLE, snap } from "./theme";

// Frames since a cue in seconds (negative before it).
export const since = (f: number, at: number) => f - Math.round(at * FPS);
// Hold every value for n frames: animating "on 2s" or "on 3s".
export const onN = (lf: number, n = 2) => Math.floor(lf / n) * n;

export const useCue = (at: number) => {
  const { f, t } = useTime();
  const lf = since(f, at);
  return { f, t, lf, l2: onN(lf, 2), l3: onN(lf, 3) };
};

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);

// Progress 0..1 over d frames, sampled on 2s so it moves in visible steps.
export const stepP = (lf: number, d: number, n = 2) => clamp(onN(lf, n) / Math.max(1, d));

// The board's pop: 0 -> .6 -> 1.15 -> 1, each held 2 frames.
export const pop = (lf: number) => (lf < 0 ? 0 : lf < 2 ? 0.6 : lf < 4 ? 1.15 : 1);
// A punch on an element already on screen: 1 -> 1.15 -> 1.
export const punch = (lf: number) => (lf >= 0 && lf < 4 ? 1.15 : 1);

// Slide from `from` px to 0 over d frames, eased then snapped to the 8 px grid.
export const slide = (lf: number, from: number, d = 12) => snap(from * (1 - outCubic(stepP(lf, d))));

// 4 Hz blink by default (8-frame period).
export const blinkOn = (f: number, period = 8) => Math.floor(f / (period / 2)) % 2 === 0;

// Step through the four emphasis colours every 3 frames.
export const cycleCol = (f: number, colors = CYCLE, every = 3) => colors[Math.floor(f / every) % colors.length]!;

// Stepped 4 px shake for d frames after a cue, a new offset every 2 frames.
export const shakeAt = (lf: number, d = 12, amp = 4, seed = 1) => {
  if (lf < 0 || lf >= d) return { x: 0, y: 0 };
  const k = Math.floor(lf / 2);
  return { x: random(`sx${seed}-${k}`) > 0.5 ? amp : -amp, y: random(`sy${seed}-${k}`) > 0.5 ? amp : -amp };
};

// Characters typed so far: one every `per` frames.
export const typedN = (lf: number, per = 1) => (lf < 0 ? 0 : Math.floor(lf / per) + 1);

// A count that eases out in 2-frame steps, for scores and timers.
export const countStep = (lf: number, from: number, to: number, d: number) => {
  const p = stepP(lf, d);
  return Math.round(from + (to - from) * (1 - Math.pow(1 - p, 4)));
};

// Stepped jump arc in 8 px units: up and down over d frames, peak h px.
export const hop = (lf: number, d = 12, h = 48) => {
  if (lf < 0 || lf >= d) return 0;
  const p = onN(lf, 2) / d;
  return -snap(4 * h * p * (1 - p));
};

// Letters drop in on 2s: two steps down, a one-step overshoot, then rest. Use as a BitText `ch` look with c = frames since that letter's cue.
export const dropLook = (c: number) => (c < 0 ? { hide: true } : c < 2 ? { dy: -3 } : c < 4 ? { dy: -1 } : c < 6 ? { dy: 0.5 } : {});
