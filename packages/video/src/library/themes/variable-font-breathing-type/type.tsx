// The letterform engine: axis states, VarGlyph and VarWord (a per-letter axis function of time), and the motion presets that make letters grow, breathe, inflate, thin and squeeze.
import type { CSSProperties, FC } from "react";
import { interpolate } from "remotion";
import { INOUT, clamp01, ramp } from "../../core/time";
import { BACK_OUT, EXPO_OUT, FLEX, FR, IN_QUAD, INK, RANGE } from "./theme";

// One letter's state. Axis names are the fonts' own tags; color and opacity ride along so one function drives the whole glyph.
export type Axes = { wght?: number; wdth?: number; slnt?: number; opsz?: number; GRAD?: number; SOFT?: number; WONK?: number; MONO?: number; CASL?: number };
export type Look = Axes & { color?: string; opacity?: number };
// Per-letter look: i is the letter index, n the letter count, ch the character.
export type AxisFn = (i: number, n: number, ch: string) => Look;

const AXIS_KEYS = ["wght", "wdth", "slnt", "opsz", "GRAD", "SOFT", "WONK", "MONO", "CASL"] as const;
const lim = (v: number, [a, b]: readonly [number, number]) => Math.min(b, Math.max(a, v));

// Roboto Flex limits applied here so presets can overshoot freely without asking the font for values it doesn't have.
export const clampFlex = (a: Axes): Axes => ({
  ...a,
  wght: a.wght === undefined ? undefined : lim(a.wght, RANGE.wght),
  wdth: a.wdth === undefined ? undefined : lim(a.wdth, RANGE.wdth),
  slnt: a.slnt === undefined ? undefined : lim(a.slnt, RANGE.slnt),
  opsz: a.opsz === undefined ? undefined : lim(a.opsz, RANGE.opsz),
});

export const fvs = (a: Axes) =>
  AXIS_KEYS.filter((k) => a[k] !== undefined)
    .map((k) => `"${k}" ${Math.round((a[k] as number) * 10) / 10}`)
    .join(", ");

// Linear blend between two axis states; keys missing on one side hold the other's value.
export const mix = (a: Look, b: Look, e: number): Look => {
  const out: Look = { ...a, ...b };
  for (const k of AXIS_KEYS) {
    const va = a[k];
    const vb = b[k];
    if (va !== undefined && vb !== undefined) out[k] = va + (vb - va) * e;
  }
  if (a.opacity !== undefined || b.opacity !== undefined) out.opacity = (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * e;
  out.color = e < 0.5 ? (a.color ?? b.color) : (b.color ?? a.color);
  return out;
};

// Tight tracking that follows the letterform: heavier and wider letters close up, hairlines open a touch.
export const autoTrack = (a: Axes) => {
  const w = ((a.wght ?? 400) - 100) / 900;
  return (-0.004 - 0.016 * w) * ((a.wdth ?? 100) / 100);
};

export type GlyphProps = { ch: string; size: number; look: Look; family?: string; track?: number; lineHeight?: number };

// One character with its own axis state. Inline-block so each letter owns its advance; the box itself never moves.
export const VarGlyph: FC<GlyphProps> = ({ ch, size, look, family = FLEX, track, lineHeight = 0.9 }) => {
  const axes = family === FLEX ? clampFlex(look) : look;
  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "pre",
        fontFamily: family,
        fontSize: size,
        lineHeight,
        fontWeight: 400,
        fontVariationSettings: fvs(axes),
        letterSpacing: `${track ?? autoTrack(axes)}em`,
        color: look.color,
        opacity: look.opacity ?? 1,
      }}
    >
      {ch === " " ? " " : ch}
    </span>
  );
};

export type VarWordProps = { text: string; size: number; axes: AxisFn; family?: string; color?: string; track?: number; lineHeight?: number; style?: CSSProperties };

// A word split into VarGlyphs, every letter asking `axes` for its state on this frame.
export const VarWord: FC<VarWordProps> = ({ text, size, axes, family = FLEX, color = INK, track, lineHeight, style }) => {
  const chars = [...text];
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", whiteSpace: "pre", color, ...style }}>
      {chars.map((ch, i) => (
        <VarGlyph key={i} ch={ch} size={size} family={family} track={track} lineHeight={lineHeight} look={{ color, ...axes(i, chars.length, ch) }} />
      ))}
    </span>
  );
};

// ---------- presets: pure functions of time (seconds) and letter index ----------

// Travelling sine of weight: the WeightWave. phaseStep is in cycles per letter, so 0.08 puts ~12 letters in one wave.
export const weightWave = (t: number, i: number, { base = 500, amp = 120, period = 3, phaseStep = 0.08, phase = 0 } = {}) =>
  base + amp * Math.sin(2 * Math.PI * (t / period - i * phaseStep + phase));

// A bump of weight that runs through the word every `every` seconds; 0 outside the run.
export const ripple = (t: number, i: number, n: number, { every = 3, run = 0.9, width = 1.4, offset = 0 } = {}) => {
  const ph = (((t - offset) % every) + every) % every;
  if (ph > run) return 0;
  const c = (ph / run) * (n + 3) - 1.5;
  return Math.exp(-((i - c) ** 2) / (2 * width * width));
};

// Idle breathing from the board: weight wave, a ±3° slant sway, and the 3 s ripple.
export const breathe = (t: number, i: number, n: number, base: Axes = { wght: 600, wdth: 100 }, amt = 1): Axes => {
  const r = ripple(t, i, n);
  return {
    ...base,
    wght: (base.wght ?? 600) + amt * (120 * Math.sin(2 * Math.PI * (t / 3 - i * 0.08)) + 220 * r),
    wdth: (base.wdth ?? 100) + amt * 8 * r,
    slnt: (base.slnt ?? 0) + amt * (-3 - 3 * Math.sin(2 * Math.PI * (t / 4 - i * 0.05))),
  };
};

export const HAIRLINE: Axes = { wght: 100, wdth: 50 };

// Entrance: each letter starts as a hairline and fills to `to`, 2 f apart, 20 f expo-out, so a wave of weight crosses the word.
export const growE = (t: number, at: number, i: number, stagger = 2 * FR, dur = 20 * FR) => ramp(t, at + i * stagger, dur, EXPO_OUT);
export const grow = (t: number, at: number, i: number, to: Look, from: Look = HAIRLINE, stagger?: number): Look => {
  const e = growE(t, at, i, stagger);
  return { ...mix(from, to, e), opacity: (to.opacity ?? 1) * clamp01(e * 5) };
};

// Exit: letters thin back to hairline while they fade, 1 f apart, 14 f in-quad.
export const thinE = (t: number, out: number, i: number) => ramp(t, out + i * FR, 14 * FR, IN_QUAD);
export const thin = (t: number, out: number, i: number, from: Look): Look => {
  const e = thinE(t, out, i);
  return { ...mix(from, { wght: 100 }, e), opacity: (from.opacity ?? 1) * (1 - e) };
};

// Width squeeze: the word collapses toward 25 % width and hairline weight (WidthSqueeze).
export const squeeze = (from: Look, e: number): Look => mix(from, { wght: 100, wdth: 25 }, e);

// Emphasis envelope: rises with back-out(1.4) over 10 f, then relaxes over 30 f down to `keep`.
export const inflateE = (t: number, at: number, keep = 0.35) => {
  if (t < at) return 0;
  const rise = interpolate(t, [at, at + 10 * FR], [0, 1], { extrapolateRight: "clamp", easing: BACK_OUT });
  return rise * (1 - (1 - keep) * ramp(t, at + 10 * FR, 30 * FR, INOUT));
};
// The inflate itself: +300 weight and +20 width at the peak.
export const inflate = (base: Look, env: number, { dw = 300, dx = 20 } = {}): Look => ({ ...base, wght: (base.wght ?? 500) + dw * env, wdth: (base.wdth ?? 100) + dx * env });
