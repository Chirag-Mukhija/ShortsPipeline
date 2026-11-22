// Exploded-gadget-poster motion vocabulary: squash-pop springs, back-out pops, expo lifts, in-back drops, wiggles and a seeded RNG, all pure functions of time.
import { Easing, interpolate, random, spring } from "remotion";
import { FPS } from "../../core/video";
import { clamp01 } from "../../core/time";

export const EXPO_OUT = Easing.out(Easing.exp);
export const IN_BACK = Easing.in(Easing.back(1.7));
export const IN_CUBIC = Easing.in(Easing.cubic);
export const BACK_OUT = Easing.out(Easing.back(1.8));

// The board's squash spring (stiffness 220, damping 12): from 0 it overshoots to about 1.25 and settles at 1.
export const squash = (t: number, at: number) =>
  t < at ? 0 : spring({ frame: (t - at) * FPS, fps: FPS, config: { stiffness: 220, damping: 12, mass: 1 } });

// Scale-y 0.8 -> 1.05 -> 1 plus a drop from above, for wordmarks and headlines.
export const squashPop = (t: number, at: number, drop = 90) => {
  const s = squash(t, at);
  const o = clamp01((t - at) * 10);
  return { o, sy: 0.8 + 0.2 * s, sx: 1.04 - 0.04 * s, y: (1 - Math.min(1, s)) * -drop };
};

// 0 -> 1 with back-out(1.8), for buttons, bubbles and stickers.
export const pop = (t: number, at: number, d = 0.4) =>
  interpolate(t, [at, at + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BACK_OUT });

export const ease = (t: number, at: number, d: number, e: (x: number) => number) =>
  interpolate(t, [at, at + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

// Idle wiggle: ±amp degrees, slow enough to stay under conscious notice.
export const wiggle = (t: number, amp = 1.5, speed = 2.1, phase = 0) => Math.sin(t * speed + phase) * amp;

// Low-fps clock for 1-bit screens: the integer frame of an `fps`-rate flipbook.
export const tick = (t: number, fps = 8) => Math.floor(t * fps);

export const rnd = (seed: string | number) => random(`egp-${seed}`);

// Count-up for stats: eases to `to` and rounds to the given decimals.
export const countUp = (t: number, at: number, d: number, to: number, decimals = 0) => {
  const v = to * ease(t, at, d, Easing.out(Easing.cubic));
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Stable SVG ids from React's useId (its colons break url(#...) references).
export const svgId = (id: string, part: string) => `egp${id.replace(/[^a-zA-Z0-9]/g, "")}${part}`;

// Idle spin for dials and cranks: one revolution per 40 frames, with an eased wobble so each turn surges and settles.
export const crank = (t: number, revPerSec = 30 / 40) => 360 * t * revPerSec + 14 * Math.sin(t * revPerSec * Math.PI * 2);
