// Clay motion maths: drop-squash-rebound landings on a cue, jelly wobble, idle bob, button press, shrink-spin exit; all pure functions of time in seconds.
import { Easing, spring } from "remotion";
import { clamp01, ramp } from "../../core/time";
import { FPS } from "../../core/video";

export type Body = { y: number; sx: number; sy: number; rot: number; o: number; lift: number };
export const REST: Body = { y: 0, sx: 1, sy: 1, rot: 0, o: 1, lift: 0 };

const springAt = (t: number, at: number, stiffness: number, damping: number) =>
  t < at ? 0 : spring({ frame: (t - at) * FPS, fps: FPS, config: { stiffness, damping, mass: 1 } });

// The board's landing: falls for `fall` s so it hits exactly at `at` (the spoken word), stretched 1.15 in flight,
// squashed to 0.8 × 1.15 on impact, then a stiffness-220 / damping-12 spring rebounds through it.
export const drop = (t: number, at: number, { h = 520, fall = 0.4, squash = 1 }: { h?: number; fall?: number; squash?: number } = {}): Body => {
  const start = at - fall;
  if (t < start) return { y: -h, sx: 1, sy: 1, rot: 0, o: 0, lift: 1 };
  if (t < at) {
    const u = (t - start) / fall;
    const s = 1 + 0.15 * squash * clamp01(u * 2.5);
    return { y: -h * (1 - u * u), sx: 1 / Math.sqrt(s), sy: s, rot: 0, o: clamp01(u * 5), lift: 1 - u * u };
  }
  const d = 1 - springAt(t, at, 220, 12);
  return { y: 0, sx: 1 + 0.15 * squash * d, sy: 1 - 0.2 * squash * d, rot: 0, o: 1, lift: 0 };
};

// A softer arrival for things that grow in place (no fall): scale from 0 with the same squashy spring.
export const pop = (t: number, at: number, { squash = 1 }: { squash?: number } = {}): Body => {
  if (t < at) return { ...REST, sx: 0, sy: 0, o: 0 };
  const s = springAt(t, at, 200, 11);
  const d = 1 - springAt(t, at + 0.06, 220, 9);
  return { y: 0, sx: s * (1 + 0.1 * squash * d), sy: s * (1 - 0.1 * squash * d), rot: 0, o: clamp01((t - at) * 12), lift: 0 };
};

// Emphasis: volume-keeping wobble, 12 % at its peak, gone in about 0.8 s.
export const jelly = (t: number, at: number, amp = 0.12) => {
  const k = t - at;
  if (k < 0) return 0;
  return amp * Math.exp(-k * 4.2) * Math.sin(k * Math.PI * 2 * 3.1);
};

// Idle float: ±6 px on a slow sine, with a per-item phase so neighbours never move in step.
export const bob = (t: number, phase = 0, amp = 6, period = 3.2) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;

// Button press, 0 → 1 depth: down in 0.1 s, held, released through a bouncy spring.
export const press = (t: number, at: number, hold = 0.18) => {
  const down = ramp(t, at, 0.1, Easing.out(Easing.quad));
  const up = springAt(t, at + 0.1 + hold, 260, 10);
  return down * (1 - up);
};

// Exit: shrink and spin 20° with a back-in ease over 12 frames.
export const shrinkSpin = (t: number, at: number) => {
  const e = ramp(t, at, 0.4, Easing.in(Easing.back(1.7)));
  return { s: Math.max(0, 1 - e), rot: 20 * e, o: e >= 1 ? 0 : 1 };
};

// Combines a body with a wobble value into one CSS transform, pivoting on the object's base.
export const bodyTransform = (b: Body, w = 0, extraScale = 1) =>
  `translateY(${b.y}px) rotate(${b.rot}deg) scale(${b.sx * (1 + w) * extraScale}, ${b.sy * (1 - w) * extraScale})`;
