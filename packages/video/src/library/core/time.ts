// Theme-free timing: seconds from the current frame, eased ramps, fades and keyed steps every library piece is driven by.
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
export type Ease = (x: number) => number;
export const OUT: Ease = Easing.out(Easing.cubic);
export const INOUT: Ease = Easing.inOut(Easing.cubic);
export const POP: Ease = Easing.out(Easing.back(2.4));
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ramp = (t: number, a: number, d = 0.5, e: Ease = OUT) =>
  interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
export const fade = (t: number, a: number, b: number, i = 0.35, o = 0.35) => Math.min(ramp(t, a, i), 1 - ramp(t, b - o, o));
export const seg = (p: number, i: number, n: number) => clamp01(p * n - i);
export const steps = (t: number, keys: [number, number][], d = 0.45) => {
  let v = keys[0]?.[1] ?? 0;
  for (const [k, val] of keys.slice(1)) {
    if (t < k) break;
    v = v + (val - v) * ramp(t, k, d, INOUT);
  }
  return v;
};

export const useTime = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: f / fps, f };
};
