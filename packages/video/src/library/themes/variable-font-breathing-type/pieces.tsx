// Narrated pieces in letterform language: title card, spoken line with an inflating key word, axis list, weight stat, stacked-axis versus, soft quote, width chart and source label.
import type { CSSProperties, FC } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, EXPO_OUT, FR, INK, M, MUTED, RULE, SERIF } from "./theme";
import { VarWord, breathe, grow, growE, inflate, inflateE, mix, thin, type Look } from "./type";
import { fitWidth } from "./measure";
import { AxisSlider, Kicker, monoStyle } from "./paper";
import { W } from "../../core/video";

// A word as narration.json has it.
export type Spoken = { text: string; start: number; end: number };

// Which word each character belongs to, so one VarWord can carry a whole line and still treat words differently.
export const wordIndex = (text: string) => {
  let w = 0;
  return [...text].map((ch) => (ch === " " ? (w++, -1) : w));
};

// Entrance, idle breath and exit for one letter of a hero line: hairline in, breathing hold, thinning out.
const heroLook = (t: number, at: number, i: number, n: number, base: Look, out?: number): Look => {
  const settle = ramp(t, at + 0.9 + i * 2 * FR, 1.2, INOUT);
  const held: Look = { ...base, ...breathe(t, i, n, base, 0.55 * settle) };
  const look = grow(t, at, i, held);
  return out === undefined ? look : thin(t, out, i, look);
};

// The page's only camera: 1 → 1.04 over the hold, anchored at the left edge the type hangs from.
const drift = (t: number, at: number, hold = 6): CSSProperties => ({ transform: `scale(${1 + 0.04 * clamp01((t - at) / hold)})`, transformOrigin: "0% 50%" });

export type TitleCardProps = { lines: string[]; at: number; accent?: string; accentAt?: number; kicker?: string; out?: number; size?: number; y?: number };

// Hook or chapter card: each line fills in from hairline as a wave of weight, the accent word inflates, then the whole card breathes.
export const TitleCard: FC<TitleCardProps> = ({ lines, at, accent, accentAt, kicker, out, size = 210, y = 250 }) => {
  const { t } = useTime();
  const env = accent ? inflateE(t, accentAt ?? at + 0.9, 0.45) : 0;
  return (
    <AbsoluteFill style={drift(t, at)}>
      {kicker && <Kicker text={kicker} at={at - 0.2} color={MUTED} style={{ position: "absolute", left: M + 6, top: y - 70, opacity: out === undefined ? 1 : 1 - ramp(t, out, 0.3) }} />}
      <div style={{ position: "absolute", left: M, top: y, display: "flex", flexDirection: "column", gap: size * 0.02 }}>
        {lines.map((line, li) => {
          const words = line.split(" ");
          const wi = wordIndex(line);
          const key = accent ? words.findIndex((w) => w.replace(/[^\w]/g, "") === accent) : -1;
          return (
            <VarWord
              key={li}
              text={line}
              size={size}
              axes={(i, n) => {
                const mine = wi[i] === key && key >= 0;
                const base: Look = { wght: 820, wdth: mine ? 100 : 100 - 14 * env };
                const look = heroLook(t, at + li * 0.28, i, n, base, out === undefined ? undefined : out + li * 0.08);
                return mine ? { ...inflate(look, env), color: ACCENT } : look;
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export type SpokenLineProps = { words: Spoken[]; keys?: number[]; breaks?: number[]; size?: number; out?: number; lead?: number; y?: number };

// The workhorse for narration: each word fills in from a hairline just before it's said; key words inflate in accent and their neighbours compress to make room.
export const SpokenLine: FC<SpokenLineProps> = ({ words, keys = [], breaks = [], size = 150, out, lead = 3 * FR, y }) => {
  const { t } = useTime();
  const envs = keys.map((k) => inflateE(t, words[k]!.start - lead, 0.4));
  const squash = Math.max(0, ...envs);
  const rows: number[][] = [];
  words.forEach((_, i) => {
    if (i === 0 || breaks.includes(i)) rows.push([]);
    rows[rows.length - 1]!.push(i);
  });
  return (
    <AbsoluteFill style={{ justifyContent: y === undefined ? "center" : "flex-start", paddingTop: y, paddingLeft: M, ...drift(t, words[0]?.start ?? 0, 8) }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: size * 0.24, alignItems: "baseline" }}>
          {row.map((wi) => {
            const w = words[wi]!;
            const k = keys.indexOf(wi);
            const env = k >= 0 ? envs[k]! : 0;
            return (
              <VarWord
                key={wi}
                text={w.text}
                size={size}
                axes={(i, n) => {
                  const base: Look = { wght: 560, wdth: 100 - (k >= 0 ? 0 : 16 * squash) };
                  let look = grow(t, w.start - lead, i, { ...base, ...breathe(t, i + wi * 3, n, base, 0.35 * ramp(t, w.end, 1)) }, undefined, 1.5 * FR);
                  if (k >= 0) look = { ...inflate(look, env, { dw: 340, dx: 22 }), color: env > 0 ? ACCENT : INK };
                  return out === undefined ? look : thin(t, out, i + wi, look);
                }}
              />
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export type ListItem = { label: string; at: number };

// Steps or a list where state is weight: the current item is heavy and wide, spent items thin and condense to grey, the next ones wait.
export const AxisList: FC<{ items: ListItem[]; title?: string; size?: number; y?: number; out?: number }> = ({ items, title, size = 132, y = 250, out }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      {title && <Kicker text={title} at={(items[0]?.at ?? 0) - 0.4} color={MUTED} style={{ position: "absolute", left: M + 6, top: y - 74 }} />}
      <div style={{ position: "absolute", left: M, top: y, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, r) => {
          const next = items[r + 1]?.at;
          const live = ramp(t, it.at, 0.3);
          return (
            <div key={r} style={{ display: "flex", alignItems: "baseline", gap: 34, opacity: t < it.at - 0.05 ? 0 : 1 }}>
              <div style={{ ...monoStyle(30, 600), width: 52, color: next !== undefined && t >= next ? MUTED : ACCENT, opacity: live }}>{String(r + 1).padStart(2, "0")}</div>
              <VarWord
                text={it.label}
                size={size}
                axes={(i, n) => {
                  const active: Look = { wght: 900, wdth: 122, color: INK };
                  const spent: Look = { wght: 210, wdth: 50, color: MUTED };
                  let look = grow(t, it.at, i, active);
                  if (next !== undefined) look = mix(look, spent, ramp(t, next + i * 1.5 * FR, 0.5, INOUT));
                  else look = { ...look, wght: (look.wght ?? 900) + 60 * Math.sin(2 * Math.PI * (t / 2.4 - i * 0.1)) * ramp(t, it.at + 0.8, 0.6) };
                  return out === undefined ? look : thin(t, out, i + r * 2, look);
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export type WeightStatProps = { value: number; at: number; max?: number; prefix?: string; suffix?: string; decimals?: number; label?: string; size?: number; out?: number };

// A number whose weight is its value: it counts up and thickens with it, so 90 % is visibly heavier than 9 %. The axis readout prints the proof.
export const WeightStat: FC<WeightStatProps> = ({ value, at, max, prefix = "", suffix = "", decimals = 0, label, size = 330, out }) => {
  const { t } = useTime();
  const top = max ?? value;
  // Each digit counts on a slight lag, so the weight arrives as a wave from the left.
  const vAt = (lag: number) => value * ramp(t, at - 0.2 + lag, 1.25, EXPO_OUT);
  const v = vAt(0);
  const txt = `${prefix}${v.toFixed(decimals)}`;
  const k = (lag: number) => clamp01(vAt(lag) / top);
  const punch = inflateE(t, at + 1.05, 0);
  const fade = out === undefined ? 1 : 1 - ramp(t, out, 0.4);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <div style={{ position: "absolute", left: M - 10, top: 180, display: "flex", alignItems: "baseline" }}>
        <VarWord text={txt} size={size} axes={(i) => ({ wght: 100 + 900 * k(i * 2 * FR), wdth: 62 + 48 * k(i * 2 * FR) + 8 * punch, opacity: clamp01((t - at + 0.3) * 4) })} />
        {suffix && <VarWord text={suffix} size={size * 0.5} color={ACCENT} axes={() => ({ wght: 100 + 800 * k(0.15), wdth: 80, opacity: clamp01((t - at - 0.2) * 4) })} />}
      </div>
      <AxisSlider axis="wght" value={100 + 900 * k(0)} min={100} max={1000} width={W - 2 * M} color={ACCENT} muted={MUTED} rule={RULE} style={{ position: "absolute", left: M, top: 180 + size * 1.0, opacity: ramp(t, at - 0.2, 0.3) }} />
      {label && (
        <div style={{ position: "absolute", left: M, top: 180 + size * 1.0 + 120 }}>
          <VarWord text={label} size={52} axes={(i) => grow(t, at + 1.3, i, { wght: 430, wdth: 100 }, { wght: 100, wdth: 80 }, FR)} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export type VersusProps = { a: string; b: string; at: number; winner?: 0 | 1; notes?: [string, string]; enter?: number; size?: number };

// A vs B as two stacked lines on opposed axes: while undecided one thickens as the other thins; on `at` the winner swells wide and heavy and the loser collapses to a hairline.
export const Versus: FC<VersusProps> = ({ a, b, at, winner = 0, notes, enter = 0.15, size = 230 }) => {
  const { t } = useTime();
  const lines = [a, b];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: M, top: 210, display: "flex", flexDirection: "column", gap: 34 }}>
        {lines.map((line, li) => {
          const sign = li === 0 ? 1 : -1;
          const win = li === winner;
          return (
            <div key={li} style={{ display: "flex", alignItems: "baseline", gap: 40 }}>
              <VarWord
                text={line}
                size={size}
                axes={(i) => {
                  const p = Math.sin(2 * Math.PI * (t / 2.4 - i * 0.06));
                  const loop: Look = { wght: 550 + 380 * sign * p, wdth: 92 - 38 * sign * p };
                  const verdict: Look = win ? { wght: 1000, wdth: 140, color: ACCENT } : { wght: 170, wdth: 40, color: MUTED };
                  return mix(grow(t, enter + li * 0.25, i, loop), verdict, ramp(t, at + i * 2 * FR, 0.6, OUT));
                }}
              />
              {notes && (
                <div style={{ ...monoStyle(30, 560), color: win ? INK : MUTED, opacity: ramp(t, at + 0.5, 0.4) }}>{notes[li]}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ ...monoStyle(30, 700), color: MUTED, position: "absolute", left: M + 4, top: 210 + size * 0.92, opacity: ramp(t, enter + 0.2, 0.3) * (1 - ramp(t, at, 0.4)) }}>vs.</div>
    </AbsoluteFill>
  );
};

export type PullQuoteProps = { lines: string[]; at: number; accent?: string; accentAt?: number; by?: string; size?: number };

// A quote in Fraunces whose SOFT axis breathes; the stressed word hardens (soft to sharp, light to heavy, wonky on) in accent.
export const PullQuote: FC<PullQuoteProps> = ({ lines, at, accent, accentAt, by, size = 108 }) => {
  const { t } = useTime();
  const hard = accent ? ramp(t, accentAt ?? at + 1.2, 0.5, OUT) : 0;
  let base = 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: M - 12, top: 110 }}>
        <VarWord text={"“"} size={300} family={SERIF} color={ACCENT} lineHeight={1} axes={() => ({ wght: interpolate(ramp(t, at - 0.2, 0.8, EXPO_OUT), [0, 1], [100, 700]), opsz: 144, SOFT: 50 + 50 * Math.sin(t * 2), WONK: 1 })} />
      </div>
      <div style={{ position: "absolute", left: M, top: 330, display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map((line, li) => {
          const wi = wordIndex(line);
          const key = accent ? line.split(" ").findIndex((w) => w.replace(/[^\w]/g, "") === accent) : -1;
          const off = base;
          base += line.length;
          return (
            <VarWord
              key={li}
              text={line}
              size={size}
              family={SERIF}
              lineHeight={1.12}
              track={-0.01}
              axes={(i) => {
                const g = growE(t, at + li * 0.35, i, 0.8 * FR, 18 * FR);
                const soft = 55 + 45 * Math.sin(2 * Math.PI * (t / 3.2 - (i + off) * 0.05));
                const look: Look = { wght: 300 + 60 * g, opsz: 72, SOFT: 100 - (100 - soft) * g, WONK: 0, opacity: clamp01(g * 3) };
                if (wi[i] === key && key >= 0) return { ...look, wght: 300 + 520 * hard, SOFT: soft * (1 - hard), WONK: hard > 0.5 ? 1 : 0, color: hard > 0.3 ? ACCENT : INK };
                return look;
              }}
            />
          );
        })}
      </div>
      {by && <Kicker text={by} at={at + 1.6} color={MUTED} style={{ position: "absolute", left: M + 4, top: 330 + lines.length * size * 1.12 + 40 }} />}
    </AbsoluteFill>
  );
};

export type ChartRow = { label: string; value: number; key?: boolean };

// A bar chart whose bars are the words: each label is stretched by its width axis to its value's length, with a hairline rule under it at the exact length.
export const WidthChart: FC<{ rows: ChartRow[]; at: number; title?: string; unit?: string; max?: number; length?: number; size?: number }> = ({ rows, at, title, unit = "", max, length = 960, size = 112 }) => {
  const { t } = useTime();
  const top = max ?? Math.max(...rows.map((r) => r.value));
  const row = size * 0.95 + 46;
  const y0 = 540 - (rows.length * row) / 2 + 30;
  return (
    <AbsoluteFill>
      {title && <Kicker text={title} at={at - 0.3} color={MUTED} style={{ position: "absolute", left: M + 4, top: y0 - 80 }} />}
      {rows.map((r, k) => {
        const e = ramp(t, at + k * 0.22, 1.1, EXPO_OUT);
        const target = (length * r.value) / top;
        const wght = r.key ? 860 : 380;
        const fit = fitWidth(r.label, size, Math.max(1, target * e), wght);
        const y = y0 + k * row;
        return (
          <div key={k} style={{ position: "absolute", left: M, top: y }}>
            <VarWord text={r.label} size={size} color={r.key ? ACCENT : INK} track={fit.track} axes={() => ({ wght, wdth: fit.wdth, opacity: clamp01(e * 6) })} />
            <div style={{ position: "absolute", left: 0, top: size * 0.9 + 8, height: r.key ? 6 : 3, width: target * e, background: r.key ? ACCENT : RULE }} />
            <div style={{ ...monoStyle(34, r.key ? 750 : 500), color: r.key ? ACCENT : MUTED, position: "absolute", left: target * e + fit.short + 28, top: size * 0.32, opacity: ramp(t, at + k * 0.22 + 0.7, 0.3) }}>
              {`${Math.round(r.value * e)}${unit}`}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export type SourceLabelProps = { title: string; detail?: string; at: number; out?: number; tag?: string };

// Lower third: an accent rule draws, the source title fills in from hairline, the mono detail settles under it.
export const SourceLabel: FC<SourceLabelProps> = ({ title, detail, at, out, tag = "SOURCE" }) => {
  const { t } = useTime();
  const gone = out === undefined ? 0 : ramp(t, out, 8 * FR);
  return (
    <AbsoluteFill style={{ opacity: 1 - gone }}>
      <div style={{ position: "absolute", left: M, bottom: 120, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ height: 5, width: 64 * ramp(t, at, 10 * FR), background: ACCENT }} />
          <Kicker text={tag} at={at + 0.05} color={ACCENT} size={28} />
        </div>
        <VarWord text={title} size={60} axes={(i, n) => grow(t, at + 0.12, i, breathe(t, i, n, { wght: 640, wdth: 96 }, 0.25 * ramp(t, at + 1, 1)), { wght: 100, wdth: 70 }, 1 * FR)} />
        {detail && <div style={{ ...monoStyle(28, 450), color: MUTED, opacity: ramp(t, at + 0.45, 0.35) }}>{detail}</div>}
      </div>
    </AbsoluteFill>
  );
};
