// Music-only pieces on the core beat clock: a density field that breathes with the kick and changes mark renderer on every downbeat, and the serif cue card held by the word-count rule.
import type { FC } from "react";
import { holdFor, useSong } from "../../core/beat";
import { clamp01, ramp, useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { place, type Field, type Pic } from "./field";
import { GlyphCanvas, type Mark } from "./grid";
import { Headline, Mono, type Word } from "./primitives";
import { GROUND, M, type Ground } from "./theme";

const CELLS: Partial<Record<Mark, number>> = { ascii: 12, dots: 16, bayer: 6, hatch: 14, scan: 9, blue: 5, digits: 14 };

// Rings ride outward one per beat around an optional picture; the kick swells the whole field, energy feeds the shimmer and the noise,
// and the renderer cuts to the next mark on each bar's downbeat (a hard cut on the "one" is the music-only transition).
export const BeatField: FC<{ pic?: Pic; marks?: Mark[]; ground?: Ground; accentBars?: number[]; label?: boolean }> = ({ pic, marks = ["ascii", "dots", "bayer", "hatch"], ground = "paper", accentBars = [], label = true }) => {
  const { t, pulse, energy, pos, clock } = useSong();
  const g = GROUND[ground];
  const inner = pic ? place(pic, W, H, 0.62) : null;
  const ringPhase = (t - clock.off) / clock.spb;
  const field: Field = (x, y) => {
    const r = Math.hypot(x - W / 2, y - H / 2) / 520;
    const rings = 0.5 + 0.5 * Math.cos(2 * Math.PI * (r * 3.2 - ringPhase));
    const env = clamp01(1.15 - r) * (0.35 + 0.45 * energy + 0.35 * pulse);
    const base = rings * env;
    const p = inner ? inner(x, y) : 0;
    return Math.max(base * (1 - Math.min(1, p * 3)), p * (0.85 + 0.15 * pulse));
  };
  const mark = marks[(pos.bar - 1) % marks.length]!;
  const accent = accentBars.includes(pos.bar);
  return (
    <>
      <GlyphCanvas
        field={field}
        mark={mark}
        cell={CELLS[mark]}
        ground={ground}
        shimmer={0.04 + 0.1 * energy}
        flicker={0.02 + 0.06 * energy}
        fx={[(x, y) => ({ noise: 0.12 * pulse * energy, accent: accent && Math.hypot(x - W / 2, y - H / 2) < 330 })]}
      />
      {label && (
        <div style={{ position: "absolute", left: M, top: M - 30 }}>
          <Mono color={g.soft}>{`bar ${String(pos.bar).padStart(2, "0")} · beat ${pos.beatInBar} · ${mark}`}</Mono>
        </div>
      )}
    </>
  );
};

// A music-only text card: the line decodes on its cue, holds 1.5 s + 0.3 s a word, then scrambles away. A boxed ground sits behind it so it reads over any field.
export const CueCard: FC<{ words: Word[]; at: number; ground?: Ground; size?: number; y?: number }> = ({ words, at, ground = "paper", size = 104, y = 440 }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const out = at + holdFor(words.length) + 0.4;
  if (t < at || t > out + 0.5) return null;
  const k = 1 - ramp(t, out, 0.4);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 40, height: size * 1.05 + 80, background: g.bg, opacity: 0.9 * k }} />
      <Headline words={words.map((w, i) => ({ ...w, t: Math.max(w.t, at + i * 0.08) }))} y={y} size={size} align="center" ground={ground} style={{ opacity: k }} />
    </>
  );
};

