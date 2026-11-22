// Kinetic type timing on the 30 fps grid: snap-ins with overshoot, emphasis punches, fast exits, sine shake and flash frames. Every cue is a spoken word's time in seconds.
import { Easing, interpolate } from "remotion";
import { FPS } from "../../core/video";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EXPO = Easing.out(Easing.exp);
export const IN = Easing.in(Easing.cubic);
export const IN_EXPO = Easing.in(Easing.exp);
export const SWAP = Easing.bezier(0.7, 0, 0.2, 1);

// Visuals land 3 frames before the spoken word (core-motion video.md §1).
export const LEAD = 3 / FPS;
export const sec = (frames: number) => frames / FPS;
// Frames elapsed since a cue, with the lead applied.
export const since = (t: number, at: number, lead = LEAD) => (t - at + lead) * FPS;
export const span = (t: number, at: number, frames: number, ease = EXPO, lead = LEAD) =>
  interpolate(since(t, at, lead), [0, frames], [0, 1], { ...CLAMP, easing: ease });

// Word snap-in: out-expo from 55 % to 110 % in `frames`, then settles to 100 % over 6 f. o = opacity, s = scale, y = rise in em.
export const snap = (t: number, at: number, frames = 7) => {
  const u = since(t, at);
  if (u < 0) return { o: 0, s: 0.55, y: 0.2, p: 0 };
  const a = interpolate(u, [0, frames], [0, 1], { ...CLAMP, easing: EXPO });
  const settle = interpolate(u, [frames, frames + 6], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.quad) });
  return { o: Math.min(1, (u + 1) / 2), s: 0.55 + 0.55 * a - 0.1 * settle, y: (1 - a) * 0.2, p: a };
};

// Slam: arrives too big (1.7×) and hits 100 % in `frames` with an accelerating curve, for numbers and verdicts.
export const slam = (t: number, at: number, frames = 5) => {
  const u = since(t, at);
  if (u < 0) return { o: 0, s: 1.7 };
  const a = interpolate(u, [0, frames], [0, 1], { ...CLAMP, easing: Easing.in(Easing.quad) });
  return { o: Math.min(1, (u + 1) / 2), s: 1.7 - 0.7 * a };
};

// Emphasis on the stressed word: 100 → 130 % in 6 f, settles to 110 % over 8 f. No lead: it lands on the syllable.
export const emph = (t: number, at: number, peak = 1.3, rest = 1.1) => {
  const u = (t - at) * FPS;
  if (u <= 0) return 1;
  const up = interpolate(u, [0, 6], [1, peak], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  return u < 6 ? up : interpolate(u, [6, 14], [peak, rest], { ...CLAMP, easing: Easing.inOut(Easing.quad) });
};

// Exit progress: 6 f in-cubic, so words leave faster than they arrive.
export const exit = (t: number, at: number, frames = 6) => interpolate((t - at) * FPS, [0, frames], [0, 1], { ...CLAMP, easing: IN });

// Deterministic sine shake for 6 f after a hit, decaying to rest; returns px.
export const shake = (t: number, at: number, amp = 26, frames = 6) => {
  const u = (t - at) * FPS;
  if (u < 0 || u > frames) return { x: 0, y: 0 };
  const d = 1 - u / frames;
  return { x: amp * d * Math.sin(u * 2.9), y: amp * 0.7 * d * Math.sin(u * 3.7 + 1) };
};

// 1 for exactly `frames` frames starting at `at` (the 2 f flash frame on a hard cut).
export const flashOn = (t: number, at: number, frames = 2) => {
  const u = (t - at) * FPS;
  return u >= 0 && u < frames ? 1 : 0;
};

// Which cue we are in: index of the last time in `times` that has passed (−1 before the first).
export const cueIndex = (t: number, times: number[], lead = LEAD) => {
  let k = -1;
  times.forEach((c, i) => {
    if (t >= c - lead) k = i;
  });
  return k;
};
