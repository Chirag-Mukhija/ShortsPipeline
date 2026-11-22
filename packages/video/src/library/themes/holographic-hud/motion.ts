// Holographic HUD motion math: seeded noise, glyph scramble, the panel unfold / collapse / flicker envelopes, card pop springs and scrambled number rolls.
import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../../core/video";
import { clamp01, ramp } from "../../core/time";

export const EXPO = Easing.out(Easing.exp);
export const IN = Easing.in(Easing.cubic);

// mulberry32: tiny seeded RNG so every flicker and glyph is the same on every render.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const noise = (seed: number, i = 0) => rng(seed * 7919 + i * 104729)();

const GLYPHS = "0123456789ABCDEF<>/\\=+*#%[]{}";
export const glyph = (seed: number) => GLYPHS[Math.floor(noise(seed) * GLYPHS.length)]!;

export type CharState = { ch: string; state: "hidden" | "scramble" | "done" };
// Each character lands at at + i / cps; for 3 frames before it lands it shows a seeded random glyph that re-rolls every frame.
export const scramble = (text: string, t: number, at: number, cps = 30, seed = 1, scrambleFrames = 3): CharState[] =>
  [...text].map((ch, i) => {
    const land = at + i / cps;
    if (ch === " ") return { ch, state: t >= land ? "done" : "hidden" };
    if (t >= land) return { ch, state: "done" };
    if (t >= land - scrambleFrames / FPS) return { ch: glyph(seed * 31 + i * 17 + Math.floor(t * FPS)), state: "scramble" };
    return { ch, state: "hidden" };
  });
export const typeEnd = (text: string, at: number, cps = 30) => at + Math.max(0, text.length - 1) / cps;

// Panel unfold, the board's order: a hairline grows from the centre (8 f), opens to full height (expo-out), the fill fades in, then content may land.
export const unfold = (t: number, at: number) => ({
  line: ramp(t, at, 8 / FPS, Easing.out(Easing.cubic)),
  open: interpolate(t, [at + 5 / FPS, at + 19 / FPS], [0.02, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO }),
  border: ramp(t, at + 2 / FPS, 12 / FPS, Easing.inOut(Easing.cubic)),
  fill: ramp(t, at + 12 / FPS, 10 / FPS),
  content: at + 16 / FPS,
});

// Exit: collapse to a horizontal line (7 f), then to a dot (7 f); returns the scales and a flash for the dot.
export const collapse = (t: number, out?: number) => {
  if (out === undefined || t < out) return { sx: 1, sy: 1, dot: 0, gone: false };
  const a = ramp(t, out, 7 / FPS, IN);
  const b = ramp(t, out + 7 / FPS, 7 / FPS, IN);
  return { sx: 1 - b * 0.99, sy: 1 - a * 0.98, dot: b * (1 - ramp(t, out + 14 / FPS, 6 / FPS)), gone: t > out + 20 / FPS };
};

// Flicker out: the board's 1,0,1,0,0 opacity pattern on consecutive frames.
export const flickerOut = (t: number, out?: number) => {
  if (out === undefined || t < out) return 1;
  const k = Math.floor((t - out) * FPS);
  return [1, 0, 1, 0, 0][k] ?? 0;
};

// Arrival flicker: a seeded few-frame stutter as a hologram stabilises.
export const flickerIn = (t: number, at: number, seed = 1, frames = 6) => {
  const k = Math.floor((t - at) * FPS);
  if (k < 0) return 0;
  if (k >= frames) return 1;
  return noise(seed, k) > 0.35 ? 0.4 + 0.6 * noise(seed + 9, k) : 0.08;
};

// Card pop: a spring for z / scale with a little overshoot, 0 before at.
export const pop = (t: number, at: number, damping = 13, stiffness = 150, mass = 0.9) =>
  t < at ? 0 : spring({ frame: (t - at) * FPS, fps: FPS, config: { damping, stiffness, mass } });

// 4-frame emphasis flash after a cue (1 → 0).
export const flash = (t: number, at: number, frames = 4) => (t < at ? 0 : 1 - clamp01((t - at) * FPS / frames));

// Number roll: the count eases out-expo; digits that are still moving are shown as seeded scrambled digits.
export const roll = (t: number, at: number, value: number, dur = 1.1, decimals = 0, seed = 3) => {
  const e = ramp(t, at, dur, EXPO);
  const v = value * e;
  const fixed = v.toFixed(decimals);
  const settled = e >= 0.999;
  if (settled || e <= 0) return { text: e <= 0 ? (0).toFixed(decimals) : value.toFixed(decimals), e, settled };
  // How many trailing digits still scramble: all of them early, none at the end.
  const k = Math.ceil((1 - e) * 4);
  const f = Math.floor(t * FPS);
  let n = 0;
  const chars = [...fixed].reverse().map((c, i) => {
    if (c < "0" || c > "9" || n >= k) return c;
    n++;
    return String(Math.floor(noise(seed * 13 + i, f) * 10));
  });
  return { text: chars.reverse().join(""), e, settled };
};

// Thousands separators on the integer part of a numeric string.
export const group = (s: string) => {
  const [i, d] = s.split(".");
  return i!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d !== undefined ? `.${d}` : "");
};
