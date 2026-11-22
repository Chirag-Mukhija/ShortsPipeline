// Liquid glass motion vocabulary as pure functions of time: condense in and out, spring squash, rim glints, button presses and liquid slides.
import { Easing, interpolate } from "remotion";
import { clamp01, ramp } from "../../core/time";
import { CONDENSE, MORPH, OPTICS, fr, sp, type SpringCfg } from "./theme";

const QUAD_IN = Easing.in(Easing.quad);
const SINE = Easing.inOut(Easing.sin);

export type Condensed = { scale: number; refraction: number; frost: number; wobble: number; opacity: number; content: number; shadow: number };

// Board entrance: scale 0.2 → 1 and refraction 0 → 0.69 on an 18 f spring, a blur bridge 8 → 0 px, content 6 f later.
// Exit: the bend relaxes first (6 f), then scale 1 → 0.9 and fade (10 f, in-quad).
export const condense = (t: number, at: number, out?: number, cfg: SpringCfg = CONDENSE): Condensed => {
  const s = sp(t, at, cfg);
  const settle = clamp01(s);
  const k = out === undefined ? 0 : ramp(t, out, fr(6), Easing.out(Easing.quad));
  const g = out === undefined ? 0 : interpolate(t, [out + fr(6), out + fr(16)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: QUAD_IN });
  return {
    scale: (0.2 + 0.8 * s) * (1 - 0.1 * g),
    refraction: OPTICS.refraction * settle * (1 - k),
    frost: 8 * (1 - ramp(t, at, fr(14))),
    wobble: Math.min(1, Math.abs(1 - s) * 2.2) * (t >= at ? 1 : 0),
    opacity: clamp01((t - at) / fr(3)) * (1 - g),
    content: ramp(t, at + fr(6), fr(9)) * (1 - ramp(t, out ?? 1e9, fr(5))),
    shadow: OPTICS.shadow * settle * (1 - g),
  };
};

// A droplet landing: a damped wobble that trades width for height so volume looks conserved.
export const squash = (t: number, at: number, amount = 0.14, hz = 3.2, decay = 5) => {
  if (t < at) return { sx: 1, sy: 1 };
  const u = t - at;
  const e = Math.exp(-u * decay) * Math.sin(u * hz * Math.PI * 2);
  return { sx: 1 + amount * e, sy: 1 - amount * e };
};

// Board emphasis: one glint round the rim, clockwise, over 24 f in-out sine.
export const glintAt = (t: number, cues: number[], dur = fr(24)) => {
  for (const c of cues) if (t >= c && t <= c + dur) return { u: interpolate(t, [c, c + dur], [0, 1], { easing: SINE }), s: 1 };
  return undefined;
};

// Board press: the bevel flattens 40 → 14 and the shadow deepens over 4 f, then springs back over ~8 f.
export const press = (t: number, at: number) => {
  const down = ramp(t, at, fr(4), Easing.out(Easing.quad));
  const up = sp(t, at + fr(4), { stiffness: 260, damping: 14 });
  const p = down * (1 - up);
  return { p, bevel: OPTICS.bevel - 26 * p, sink: 6 * p, shadow: OPTICS.shadow * (1 + 1.2 * p), squash: 1 - 0.04 * p };
};

// A liquid slide between keyed positions: the leading edge springs stiffer than the trailing one, so the pill
// stretches toward where it is going and snaps back when it arrives.
export const slide = (t: number, keys: [number, number][], cfg: SpringCfg = MORPH) => {
  let lead = keys[0]?.[1] ?? 0;
  let trail = lead;
  for (let i = 1; i < keys.length; i++) {
    const [at, v] = keys[i]!;
    const from = keys[i - 1]![1];
    const a = sp(t, at, { stiffness: cfg.stiffness * 1.6, damping: cfg.damping });
    const b = sp(t, at + fr(2), { stiffness: cfg.stiffness * 0.75, damping: cfg.damping * 1.05 });
    lead += (v - from) * a;
    trail += (v - from) * b;
  }
  return { lead, trail, centre: (lead + trail) / 2, stretch: Math.abs(lead - trail) };
};
