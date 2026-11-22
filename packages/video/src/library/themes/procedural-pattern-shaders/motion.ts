// Pattern motion vocabulary from the board: speed ramps integrated into pattern time, the tighten envelope, iris and hold-camera curves, a seeded film grain offset.
import { Easing, interpolate, random } from "remotion";
import { clamp01, INOUT } from "../../core/time";

export const EXPO: (x: number) => number = Easing.out(Easing.exp);
export const EXPO_IN: (x: number) => number = Easing.in(Easing.exp);

// Smooth 0→1→0 bump: eases up over `rise`, holds for `hold`, eases back over `fall` (inOut-cubic).
export const bump = (t: number, at: number, hold = 8 / 30, rise = 0.1, fall = 0.35) => {
  if (t <= at || t >= at + rise + hold + fall) return 0;
  if (t < at + rise) return INOUT((t - at) / rise);
  if (t < at + rise + hold) return 1;
  return 1 - INOUT((t - at - rise - hold) / fall);
};

export type Ramp = { at: number; boost?: number; hold?: number };

// Pattern time with speed ramps (board: 1× then 4× for 8 f on the stressed word, easing back). Integrates the speed
// curve rather than multiplying time, so the pattern never jumps, and stays a pure function of t.
export const rampClock = (t: number, speed = 1, ramps: Ramp[] = []) => {
  let pt = t * speed;
  for (const r of ramps) {
    if (t <= r.at) continue;
    const hold = r.hold ?? 8 / 30;
    const end = Math.min(t, r.at + 0.1 + hold + 0.35);
    const n = 24;
    const dt = (end - r.at) / n;
    let area = 0;
    for (let i = 0; i < n; i++) area += bump(r.at + (i + 0.5) * dt, r.at, hold) * dt;
    pt += area * ((r.boost ?? 4) - 1) * speed;
  }
  return pt;
};

// Spiral/swirl "tighten": frequency 0.8 → 1.6 on the stressed word and back.
export const tighten = (t: number, at: number[], lo = 0.8, hi = 1.6, hold = 0.4) =>
  lo + (hi - lo) * Math.max(0, ...at.map((a) => bump(t, a, hold, 0.18, 0.6)));

// Iris: circle radius 0 → 150 % of the half-diagonal over 20 f, expo-out.
export const irisR = (t: number, at: number, dur = 20 / 30, cover = 1.5) =>
  interpolate(t, [at, at + dur], [0, cover * Math.hypot(960, 540)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO });

// Hold camera: scale 1 → 1.12 and rotation 0 → 6° across a hold. Patterns are infinite, so no edge ever shows.
export const holdCam = (t: number, start: number, dur: number) => {
  const e = INOUT(clamp01((t - start) / dur));
  return { zoom: 1 + 0.12 * e, rot: 6 * e };
};

// Seeded grain offset per frame (grain moves on every frame, never on wall time).
export const grainShift = (f: number) => [Math.floor(random(`g${f}x`) * 256), Math.floor(random(`g${f}y`) * 256)] as const;
