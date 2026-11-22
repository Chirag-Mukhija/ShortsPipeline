// Stop-motion clock: quantises time to held frames, snaps through pose sequences with no easing, and adds the hand-nudged jitter between exposures.
import { useCurrentFrame } from "remotion";
import { FPS } from "../../core/video";
import { clamp01 } from "../../core/time";
import { STEP } from "./theme";

// Seeded mulberry32: every random choice in this theme comes from here.
export const rng = (seed: number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// StepClock: the frame and seconds held for n frames, so anything driven by it moves like stop-motion.
export const useStep = (n = STEP) => {
  const raw = useCurrentFrame();
  const f = Math.floor(raw / n) * n;
  return { f, t: f / FPS, raw };
};
// Seconds snapped down to the global n-frame grid: every piece moves on the same exposures, like a real shoot.
export const qt = (t: number, n = STEP) => (Math.floor((t * FPS) / n + 1e-6) * n) / FPS;
// Linear progress 0..1 that only advances on held frames. Stop-motion has no easing curves; spacing does the work.
export const stepRamp = (t: number, at: number, d: number, n = STEP) => clamp01((qt(t, n) - at) / d);
// Which held pose we're on, counting from the cue; -1 before it.
export const poseAt = (t: number, at: number, count: number, hold = STEP) =>
  t < at ? -1 : Math.min(count - 1, Math.floor(((t - at) * FPS) / hold + 1e-6));

export type Pose = { dx: number; dy: number; r: number; s: number; lift: number; o: number };
export const REST: Pose = { dx: 0, dy: 0, r: 0, s: 1, lift: 0, o: 1 };
const HIDDEN: Pose = { ...REST, o: 0 };

// Placed onto the board by hand: appears lifted and big with a far shadow, then lands in two more exposures.
export const drop = (t: number, at: number, hold = STEP): Pose => {
  const i = poseAt(t, at, 3, hold);
  if (i < 0) return HIDDEN;
  return [
    { dx: -8, dy: -14, r: 4, s: 1.14, lift: 1, o: 1 },
    { dx: 2, dy: 3, r: -1.5, s: 1.03, lift: 0.3, o: 1 },
    REST,
  ][i]!;
};

// Slid on from an offset in n held steps with a 3° wobble that dies out as it lands.
export const slide = (t: number, at: number, from: [number, number], n = 5, hold = STEP): Pose => {
  const i = poseAt(t, at, n + 1, hold);
  if (i < 0) return HIDDEN;
  const u = i / n;
  return { dx: from[0] * (1 - u), dy: from[1] * (1 - u), r: i < n ? (i % 2 ? -1 : 1) * 3 * (1 - u * 0.6) : 0, s: 1, lift: i < n ? 0.25 : 0, o: 1 };
};

// Slid off the board in n even steps; REST before the cue.
export const slideOut = (t: number, at: number, to: [number, number], n = 6, hold = STEP): Pose => {
  const i = poseAt(t, at, n + 1, hold);
  if (i < 0) return REST;
  const u = i / n;
  return { dx: to[0] * u, dy: to[1] * u, r: (i % 2 ? 2 : -2) * (i < n ? 1 : 0), s: 1, lift: 0.2, o: 1 };
};

// A hand-flick: three fast exposures and it's gone.
export const flick = (t: number, at: number, to: [number, number]): Pose => {
  const i = poseAt(t, at, 4, 2);
  if (i < 0) return REST;
  const u = [0.08, 0.4, 1.3, 1.3][i]!;
  return { dx: to[0] * u, dy: to[1] * u, r: 14 * u, s: 1 + 0.06 * Math.min(u, 1), lift: 0.6, o: i < 3 ? 1 : 0 };
};

// Emphasis: pops 10 % bigger and lifts for 6 frames, then jiggles ±3° on twos and settles.
export const nudgeUp = (t: number, at: number, dur = 0.6): Pose => {
  if (t < at || t > at + dur) return REST;
  const k = Math.floor(((t - at) * FPS) / 2);
  const pop = k < 3;
  return { dx: 0, dy: pop ? -6 : 0, r: pop ? 0 : k % 2 ? -3 : 3, s: pop ? 1.1 : 1, lift: pop ? 0.8 : 0.25, o: 1 };
};

// Hold a lift (0..1) from `at` until `until`, raised and lowered in three exposures each.
export const liftFor = (t: number, at: number, until = Infinity, hold = STEP) => {
  const up = (poseAt(t, at, 4, hold) + 1) / 3;
  const down = (poseAt(t, until, 4, hold) + 1) / 3;
  return clamp01(Math.min(up, 1 - down));
};

// Combine poses: offsets and rotations add, scales multiply, the highest lift wins.
export const mix = (...ps: Partial<Pose>[]): Pose =>
  ps.reduce<Pose>(
    (a, p) => ({ dx: a.dx + (p.dx ?? 0), dy: a.dy + (p.dy ?? 0), r: a.r + (p.r ?? 0), s: a.s * (p.s ?? 1), lift: Math.max(a.lift, p.lift ?? 0), o: Math.min(a.o, p.o ?? 1) }),
    REST,
  );

// Between exposures a hand brushes the set: every piece shifts under a pixel and a fraction of a degree, re-rolled every hold.
export const nudge = (f: number, seed: number, amp = 0.7, hold = STEP) => {
  const r = rng(seed * 977 + Math.floor(f / hold) * 131 + 7);
  return { dx: (r() - 0.5) * 2 * amp, dy: (r() - 0.5) * 2 * amp, r: (r() - 0.5) * amp * 0.5 };
};
