// Moments only this theme does: AxisMorph (letters re-cut into the next word), LineCut (a word squeezed to a line becomes the next word), FitStack (weight up, width gives way, edges stay flush), SaysIt (the word does what it means) and BeatBreath (kicks ripple through the letterforms).
import type { CSSProperties, FC } from "react";
import { AbsoluteFill } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { useSong, type Cue } from "../../core/beat";
import { W } from "../../core/video";
import { ACCENT, BACK_OUT, EXPO_OUT, FR, IN_QUAD, INK, M, MUTED, RULE, TONE } from "./theme";
import { VarGlyph, VarWord, breathe, grow, mix, squeeze, thin, type Axes, type Look } from "./type";
import { fitWidth, measure } from "./measure";
import { AxisReadout, monoStyle } from "./paper";

// ---------- AxisMorph ----------

// Longest-common-subsequence alignment: shared letters pair up and hold, the rest become slots that fade in or out.
const align = (a: string, b: string) => {
  const A = [...a];
  const B = [...b];
  const L = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i]![j] = A[i] === B[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: [string | null, string | null][] = [];
  let i = 0;
  let j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) out.push([A[i++]!, B[j++]!]);
    else if (j >= B.length || (i < A.length && L[i + 1]![j]! >= L[i]![j + 1]!)) out.push([A[i++]!, null]);
    else out.push([null, B[j++]!]);
  }
  return out;
};

export type MorphStep = { text: string; at: number; look: Look };

// Tween a line's letters toward the next text's axis values: shared letters hold and re-weight, others cross-fade in 8 f while their slots open or close.
export const AxisMorph: FC<{ steps: MorphStep[]; size?: number; y?: number; idle?: number; readout?: boolean }> = ({ steps, size = 300, y = 300, idle = 0.25, readout = true }) => {
  const { t } = useTime();
  let s = 0;
  steps.forEach((st, k) => {
    if (t >= st.at) s = k;
  });
  const cur = steps[s]!;
  const prev = s > 0 ? steps[s - 1]! : null;
  const settle = ramp(t, cur.at + 0.9, 0.8);
  const idleLook = (l: Look, i: number, n: number): Look => ({ ...l, ...breathe(t, i, n, l, idle * settle) });
  const pairs: [string | null, string | null][] = prev ? align(prev.text, cur.text) : [...cur.text].map((c) => [null, c]);
  const h = size * 0.9;
  let ib = 0;
  const slots = pairs.map(([a, b], k) => {
    const eA = ramp(t, cur.at + k * 2 * FR, 24 * FR, INOUT);
    const eF = ramp(t, cur.at + k * 2 * FR, 8 * FR);
    const bi = b === null ? ib : ib++;
    const toLook = idleLook(cur.look, bi, cur.text.length);
    if (!prev) {
      const g = grow(t, cur.at, k, toLook);
      return { w: measure(b!, size, g), glyphs: [{ ch: b!, look: g }] };
    }
    if (a !== null && a === b) {
      const l = mix(prev.look, toLook, eA);
      return { w: measure(a, size, l), glyphs: [{ ch: a, look: l }] };
    }
    const outLook: Look = { ...squeeze(prev.look, eA), opacity: 1 - eF };
    const inLook: Look = { ...mix(squeeze(toLook, 1), toLook, eA), opacity: eF };
    const wa = a === null ? 0 : measure(a, size, outLook);
    const wb = b === null ? 0 : measure(b, size, inLook);
    const glyphs = [...(a === null ? [] : [{ ch: a, look: outLook }]), ...(b === null ? [] : [{ ch: b, look: inLook }])];
    return { w: wa + (wb - wa) * eA, glyphs };
  });
  const shown = mix(prev?.look ?? cur.look, cur.look, ramp(t, cur.at, 0.9, INOUT));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: M, top: y, display: "flex", alignItems: "flex-start" }}>
        {slots.map((sl, k) => (
          <span key={k} style={{ position: "relative", display: "inline-block", width: sl.w, height: h }}>
            {sl.glyphs.map((g, j) => (
              <span key={j} style={{ position: "absolute", left: 0, top: 0 }}>
                <VarGlyph ch={g.ch} size={size} look={{ color: INK, ...g.look }} />
              </span>
            ))}
          </span>
        ))}
      </div>
      {readout && <AxisReadout axes={shown} color={MUTED} size={30} style={{ position: "absolute", left: M + 6, top: y + h + 40 }} />}
    </AbsoluteFill>
  );
};

// ---------- LineCut ----------

// Scene-level versions of the cut for any content: collapse to a line, and unfold from one.
export const collapseStyle = (e: number): CSSProperties => ({ transform: `scaleY(${1 - 0.985 * e})`, opacity: e > 0.98 ? 0 : 1 });
export const unfoldStyle = (e: number): CSSProperties => collapseStyle(1 - e);

export type LineCutProps = { from: string; to: string; at: number; size?: number; fromLook?: Look; toLook?: Look; y?: number; color?: string };

// Transition: the outgoing word squeezes to 25 % width and hairline weight, flattens into an accent rule, the rule sweeps the frame, and the next word unfolds out of it.
export const LineCut: FC<LineCutProps> = ({ from, to, at, size = 240, fromLook = { wght: 820, wdth: 100 }, toLook = { wght: 820, wdth: 100 }, y = 380, color = INK }) => {
  const { t } = useTime();
  const h = size * 0.9;
  const before = t < at;
  const flat = before ? ramp(t, at - 0.22, 0.2, IN_QUAD) : 1 - ramp(t, at + 0.14, 0.32, EXPO_OUT);
  const wFrom = measure(from, size, squeeze(fromLook, 1));
  const wTo = measure(to, size, squeeze(toLook, 1));
  const sweep = ramp(t, at - 0.06, 0.16, INOUT);
  const back = ramp(t, at + 0.1, 0.18, INOUT);
  const full = W - 2 * M;
  const ruleW = before ? wFrom + (full - wFrom) * sweep : full + (wTo - full) * back;
  const ruleOn = t > at - 0.12 && t < at + 0.42 ? 1 : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: M, top: y, height: h, transform: `scaleY(${Math.max(0.015, 1 - flat)})`, transformOrigin: "0 58%", opacity: flat > 0.97 ? 0 : 1 }}>
        {before ? (
          <VarWord text={from} size={size} color={color} axes={(i) => squeeze(fromLook, ramp(t, at - 0.6 + i * FR, 0.34, INOUT))} />
        ) : (
          <VarWord text={to} size={size} color={color} axes={(i, n) => grow(t, at + 0.2, i, { ...toLook, ...breathe(t, i, n, toLook, 0.4 * ramp(t, at + 1.1, 0.8)) }, squeeze(toLook, 1), 1.5 * FR)} />
        )}
      </div>
      <div style={{ position: "absolute", left: M, top: y + h * 0.58 - 4, height: 8, width: ruleW, background: ACCENT, opacity: ruleOn }} />
    </AbsoluteFill>
  );
};

// ---------- FitStack ----------

export type FitStackProps = { lines: string[]; at: number; width?: number; maxSize?: number; accent?: number; y?: number; guides?: boolean };

// A justified block where each line's weight swings on its own phase and the width axis gives way to keep both edges flush; the measure itself breathes.
export const FitStack: FC<FitStackProps> = ({ lines, at, width = 1300, maxSize = 230, accent, y = 250, guides = true }) => {
  const { t } = useTime();
  const meas = width * (1 + 0.025 * Math.sin((2 * Math.PI * (t - at)) / 5));
  // Each line's size is set once so it fills the measure at mid weight and normal width; after that only the axes move.
  const sizes = lines.map((l) => Math.min(maxSize, (100 * width) / measure(l, 100, { wght: 550, wdth: 100 })));
  let top = y;
  const guideOn = ramp(t, at - 0.2, 0.4);
  const bottom = y + sizes.reduce((s, z) => s + z * 0.9 + 6, 0);
  return (
    <AbsoluteFill>
      {guides && (
        <>
          <div style={{ position: "absolute", left: M - 1, top: y - 40, width: 2, height: (bottom - y + 80) * guideOn, background: RULE }} />
          <div style={{ position: "absolute", left: M + meas - 1, top: y - 40, width: 2, height: (bottom - y + 80) * guideOn, background: RULE }} />
          <div style={{ ...monoStyle(28), color: MUTED, position: "absolute", left: M + meas - 300, top: bottom + 52, width: 300, textAlign: "right", opacity: guideOn }}>{`measure ${Math.round(meas)} px`}</div>
        </>
      )}
      {lines.map((l, k) => {
        const size = sizes[k]!;
        const enter = ramp(t, at + k * 0.3, 0.9, EXPO_OUT);
        const swing = Math.sin(2 * Math.PI * ((t - at) / 3.6) + (k * 2 * Math.PI) / lines.length);
        const wght = 100 + (560 + 300 * swing - 100) * enter;
        const fit = fitWidth(l, size, meas, wght);
        const ty = top;
        top += size * 0.9 + 6;
        return (
          <div key={k} style={{ position: "absolute", left: M, top: ty }}>
            <VarWord text={l} size={size} track={fit.track} color={k === accent ? ACCENT : INK} axes={(i) => ({ wght, wdth: fit.wdth, opacity: clamp01((t - at - k * 0.3 - i * FR) * 6) })} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- SaysIt ----------

// Meaning presets: e runs 0 → 1 and the word acts out its own sense through one axis.
export const MEANINGS: Record<string, { axis: keyof Axes; look: (e: number) => Look }> = {
  heavy: { axis: "wght", look: (e) => ({ wght: 100 + 900 * e, wdth: 100 }) },
  light: { axis: "wght", look: (e) => ({ wght: 1000 - 900 * e, wdth: 100 }) },
  wide: { axis: "wdth", look: (e) => ({ wght: 650, wdth: 30 + 121 * e }) },
  narrow: { axis: "wdth", look: (e) => ({ wght: 650, wdth: 125 - 100 * e }) },
  lean: { axis: "slnt", look: (e) => ({ wght: 650, wdth: 100, slnt: -10 * e }) },
  grow: { axis: "wght", look: (e) => ({ wght: 100 + 800 * e, wdth: 50 + 70 * e }) },
  shrink: { axis: "wdth", look: (e) => ({ wght: 900 - 800 * e, wdth: 120 - 95 * e }) },
};

export type SaysItProps = { word: string; meaning: keyof typeof MEANINGS; at: number; dur?: number; size?: number; readout?: boolean; color?: string };

// The word does what it says, letter by letter: HEAVY gains weight, NARROW narrows, LEAN leans. With a readout, the axis value prints under it.
export const SaysIt: FC<SaysItProps> = ({ word, meaning, at, dur = 0.9, size = 160, readout = true, color = INK }) => {
  const { t } = useTime();
  const m = MEANINGS[meaning]!;
  const e = (i: number) => ramp(t, at + i * 2.5 * FR, dur, BACK_OUT);
  const shown = m.look(e(Math.floor(word.length / 2)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <VarWord text={word} size={size} color={color} axes={(i) => ({ ...m.look(e(i)), opacity: clamp01((t - at + 0.4) * 4) })} />
      {readout && <AxisReadout axes={shown} keys={[m.axis]} color={MUTED} style={{ opacity: ramp(t, at - 0.3, 0.3) }} />}
    </div>
  );
};

// ---------- BeatBreath (music-only) ----------

export type BeatCard = { text: string; at: Cue; accent?: boolean };

// Music-only cards inside <Track>: each card fills in on its cue, every kick sends a weight ripple through the letters, downbeats also widen them, and the section's energy sets how deep they breathe.
export const BeatBreath: FC<{ cards: BeatCard[]; size?: number; counter?: boolean; tone?: "paper" | "night" }> = ({ cards, size = 270, counter = true, tone = "night" }) => {
  const { t, clock, energy, pos } = useSong();
  const c = TONE[tone];
  const cues = cards.map((k) => clock.cue(k.at));
  let idx = 0;
  cues.forEach((q, k) => {
    if (t >= q) idx = k;
  });
  const card = cards[idx]!;
  const start = cues[idx]!;
  const next = cues[idx + 1];
  const look = (i: number): Look => {
    const lag = i * 0.035;
    const p = clock.pulse(t - lag, 0.24);
    const down = clock.pos(t - lag).beatInBar === 1 ? 1 : 0;
    const base: Look = { wght: 200 + 380 * energy + 420 * p * (0.35 + 0.65 * energy), wdth: 84 + (down ? 34 : 12) * p * (0.4 + 0.6 * energy), color: card.accent ? ACCENT : c.ink };
    const g = grow(t, start, i, base, { wght: 100, wdth: 25 }, FR);
    return next === undefined ? g : thin(t, next - 8 * FR, i, g);
  };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: M, top: 540 - size * 0.48 }}>
        <VarWord text={card.text} size={size} color={c.ink} axes={look} />
      </div>
      {counter && (
        <div style={{ position: "absolute", left: M, bottom: 110, display: "flex", alignItems: "baseline", gap: 30 }}>
          {[1, 2, 3, 4].map((b) => {
            const on = pos.beatInBar === b;
            const k = on ? Math.exp(-(pos.beatPhase * clock.spb) / 0.3) : 0;
            return <VarGlyph key={b} ch={String(b)} size={56} look={{ wght: 160 + 840 * k, wdth: 60 + 70 * k, color: on ? ACCENT : c.muted }} />;
          })}
          <div style={{ ...monoStyle(28), color: c.muted, marginLeft: 20 }}>{`BAR ${String(pos.bar).padStart(2, "0")} · ${clock.bpm} BPM`}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
