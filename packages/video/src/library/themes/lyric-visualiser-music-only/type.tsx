// Lyric type: word-by-word lines on beat cues, the beat-pulsing glow word, the lyric scroll for lists, and count-in beat dots.
import type { CSSProperties, FC } from "react";
import { Easing, interpolate } from "remotion";
import { INOUT, OUT, ramp } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { hits, useSong, type BeatClock, type Cue } from "./beat";
import { M, NIGHT, alpha, glow, holdFor, label, mix, voice, type Voice } from "./theme";

const IN = Easing.in(Easing.cubic);
// Lines land 2 f ahead of the beat so the settle reads on it; drops hit exactly on it.
export const LEAD = 2 / FPS;

// Entrance per voice: soft fade-up 24 → 0 px in 12 f, or (drop) a 6 f hit from 130 %.
export const wordIn = (t: number, at: number, v: Voice): CSSProperties => {
  if (v === "drop") {
    const e = ramp(t, at - 1 / FPS, 6 / FPS, OUT);
    return { opacity: Math.min(1, e * 2), transform: `scale(${1.3 - 0.3 * e})` };
  }
  const e = ramp(t, at - LEAD, 12 / FPS, OUT);
  return { opacity: e, transform: `translateY(${24 * (1 - e)}px)` };
};

// Exits: drift up 16 px in 10 f, or blur out to 8 px in 12 f.
export type Exit = "drift" | "blur";
export const lineOut = (t: number, at: number | undefined, kind: Exit = "drift"): CSSProperties => {
  if (at === undefined) return {};
  if (kind === "blur") {
    const e = ramp(t, at, 12 / FPS, IN);
    return { opacity: 1 - e, filter: e > 0 ? `blur(${8 * e}px)` : undefined };
  }
  const e = ramp(t, at, 10 / FPS, IN);
  return { opacity: 1 - e, transform: `translateY(${-16 * e}px)` };
};

// Stressed word: flips to accent for one beat, then settles to a softer accent; glows and grows 8 %.
const stressed = (t: number, at: number, clock: BeatClock, ink: string, accent: string) => {
  const c = interpolate(t, [at, at + 0.07, at + clock.spb, at + clock.spb + 0.35], [0, 1, 1, 0.72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { color: mix(ink, accent, c), scale: 1 + 0.08 * ramp(t, at, 8 / FPS, OUT), k: 1 + 1.4 * c };
};

export type Word = { text: string; at: Cue };
// A line as words with cue times, or one string revealed from `at` with a stagger (3 f by default, or one word per beat with stagger="beat").
export const splitWords = (clock: BeatClock, words: Word[] | string, at: Cue = 0, stagger: number | "beat" = 3 / FPS) =>
  typeof words === "string"
    ? words.split(/\s+/).filter(Boolean).map((text, i) => ({ text, at: clock.cue(at) + i * (stagger === "beat" ? clock.spb : stagger) }))
    : words.map((w) => ({ text: w.text, at: clock.cue(w.at) }));

export const LyricLine: FC<{
  words: Word[] | string;
  at?: Cue;
  stagger?: number | "beat";
  v?: Voice;
  size?: number;
  color?: string;
  accent?: string;
  stress?: number[];
  x?: number;
  y?: number;
  align?: "center" | "left";
  width?: number;
  // "auto" applies the music-only hold rule from the first word.
  out?: Cue | "auto";
  exit?: Exit;
  upper?: boolean;
  // Flow inside a parent block instead of being placed on the frame.
  inline?: boolean;
}> = ({ words, at, stagger, v = "emo", size = 120, color = NIGHT.ink, accent = NIGHT.accent, stress = [], x = M, y = H / 2, align = "center", width, out, exit = "drift", upper, inline }) => {
  const { t, clock } = useSong();
  const ws = splitWords(clock, words, at, stagger);
  const first = ws[0]?.at ?? 0;
  const outAt = out === "auto" ? first + holdFor(ws.length) : out === undefined ? undefined : clock.cue(out);
  const box: CSSProperties = inline
    ? { position: "relative", textAlign: align }
    : align === "center"
      ? { position: "absolute", left: M, right: M, top: y, transform: "translateY(-50%)", textAlign: "center" }
      : { position: "absolute", left: x, width: width ?? W - x - M, top: y, transform: "translateY(-50%)", textAlign: "left" };
  return (
    <div style={box}>
      <div style={{ ...voice(v, size), color, textTransform: upper ? "uppercase" : undefined, textWrap: "balance", ...lineOut(t, outAt, exit) }}>
        {ws.map((w, i) => {
          const st = stress.includes(i) ? stressed(t, w.at, clock, color, accent) : null;
          return (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...wordIn(t, w.at, v) }}>
              <span style={{ display: "inline-block", color: st?.color, transform: st ? `scale(${st.scale})` : undefined, textShadow: glow(st ? accent : color, st?.k ?? 1) }}>{w.text}</span>
              {i < ws.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// One key word that lands soft (blur-in) and then pulses its glow on every beat (or the given beats); letter-spacing breathes 0 → +20 px over a bar.
export const GlowText: FC<{
  text: string;
  at: Cue;
  v?: Voice;
  size?: number;
  color?: string;
  glowColor?: string;
  pulseBeats?: Cue[] | "every";
  breathe?: boolean;
  y?: number;
  out?: Cue;
  exit?: Exit;
}> = ({ text, at, v = "emo", size = 220, color = NIGHT.ink, glowColor = NIGHT.accent, pulseBeats = "every", breathe = true, y = H / 2, out, exit = "blur" }) => {
  const { t, clock, pulse, energy, pos } = useSong();
  const a = clock.cue(at);
  const e = ramp(t, a - LEAD, 18 / FPS, OUT);
  const k = t < a ? 0 : pulseBeats === "every" ? pulse * (0.4 + 0.6 * energy) : hits(t, pulseBeats.map(clock.cue));
  const ls = breathe ? (0.5 - 0.5 * Math.cos(pos.barPhase * Math.PI * 2)) * 20 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: "translateY(-50%)", textAlign: "center", ...lineOut(t, out === undefined ? undefined : clock.cue(out), exit) }}>
      <div
        style={{
          ...voice(v, size),
          color: mix(color, glowColor, 0.25 * k),
          display: "inline-block",
          letterSpacing: `${ls}px`,
          paddingLeft: ls,
          opacity: e,
          filter: e < 1 ? `blur(${10 * (1 - e)}px)` : undefined,
          transform: `scale(${(0.96 + 0.04 * e) * (1 + 0.035 * k)})`,
          textShadow: glow(glowColor, 1.4 + 2.4 * k),
        }}
      >
        {text}
      </div>
    </div>
  );
};

// The lyric scroll: one line active and bright, past lines float up dim and soft, the next line waits faintly a bar ahead. Lists, steps, verses.
export const LyricScroll: FC<{
  lines: { text: string; at: Cue; v?: Voice }[];
  x?: number;
  y?: number;
  size?: number;
  numbered?: boolean;
  accent?: string;
}> = ({ lines, x = M + 110, y = H * 0.56, size = 112, numbered = true, accent = NIGHT.accent }) => {
  const { t, clock } = useSong();
  const cues = lines.map((l) => clock.cue(l.at));
  const row = size * 1.32;
  // Fractional index of the active line: each cue eases the scroll one row over 14 f.
  const active = cues.slice(1).reduce((s, c) => s + ramp(t, c - 4 / FPS, 14 / FPS, INOUT), 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {lines.map((l, i) => {
        const d = i - active;
        const c = cues[i]!;
        const seen = ramp(t, c - LEAD, 12 / FPS, OUT);
        const preview = ramp(t, c - clock.spBar, 0.4, OUT) * 0.2;
        const o = d > 0.01 ? preview : d < -0.01 ? Math.max(0.12, 0.5 + 0.22 * d) : Math.max(preview, seen);
        const sc = d < 0 ? Math.max(0.72, 1 + 0.18 * d) : d > 0 ? 0.86 : 1;
        const blur = Math.min(4, Math.abs(d) * 1.6);
        const lit = d > -0.5 && d < 0.5 ? seen : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y + d * row * (d < 0 ? 0.82 : 1), transform: `translateY(-50%) scale(${sc})`, transformOrigin: "left center", opacity: o, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, whiteSpace: "nowrap" }}>
            {numbered && (
              <span style={{ ...label(30), position: "absolute", right: "100%", marginRight: 34, top: "50%", transform: "translateY(-50%)", color: lit > 0.5 ? accent : NIGHT.muted, letterSpacing: "0.12em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            <span style={{ ...voice(l.v ?? "emo", size), color: NIGHT.ink, textShadow: glow(lit > 0.5 ? accent : NIGHT.ink, 1 + 0.8 * lit), display: "inline-block", transform: `translateY(${24 * (1 - seen) * (d >= -0.5 ? 1 : 0)}px)` }}>{l.text}</span>
          </div>
        );
      })}
    </div>
  );
};

// Count-in dots: one lights per beat of the bar starting at `from`; the last one lights in accent.
// They fade out as the next bar lands, so the change they count in has the frame to itself.
export const BeatDots: FC<{ from: Cue; beats?: number; y?: number; size?: number; gap?: number; color?: string; accent?: string }> = ({ from, beats = 4, y = H * 0.7, size = 22, gap = 46, color = NIGHT.ink, accent = NIGHT.accent }) => {
  const { t, clock } = useSong();
  const a = clock.cue(from);
  const total = (beats - 1) * gap;
  const gone = ramp(t, a + beats * clock.spb - 2 / FPS, 8 / FPS, IN);
  if (gone >= 1) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - gone }}>
      {Array.from({ length: beats }, (_, i) => {
        const c = a + i * clock.spb;
        const on = ramp(t, c - 1 / FPS, 3 / FPS, OUT);
        const kick = t >= c ? Math.exp(-(t - c) / 0.14) : 0;
        const col = i === beats - 1 ? accent : color;
        return (
          <g key={i}>
            <circle cx={W / 2 - total / 2 + i * gap} cy={y} r={size / 2} fill="none" stroke={alpha(NIGHT.muted, 0.8)} strokeWidth={2} />
            <circle cx={W / 2 - total / 2 + i * gap} cy={y} r={(size / 2) * (on * (1 + 0.5 * kick))} fill={col} style={{ filter: `drop-shadow(0 0 ${8 + 14 * kick}px ${alpha(col, 0.8)})` }} />
          </g>
        );
      })}
    </svg>
  );
};
