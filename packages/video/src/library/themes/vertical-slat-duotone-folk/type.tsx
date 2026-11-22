// Slat type: the heavy wordmark woven from bars with a fringed comb edge that rises slice by slice, and reading text (lines, words, wide labels) that resolves from thin half-height slats into solid type.
import { Fragment, useId, type FC } from "react";
import { Easing } from "remotion";
import { W } from "../../core/video";
import { clamp01, ramp } from "../../core/time";
import { useLoom } from "./clock";
import { DUTY, LABEL, PERIOD, SERIF, TAN, TRACK, WIDE } from "./theme";

const sid = (raw: string) => `s${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
const EXPO_OUT = Easing.out(Easing.exp);
const IN = Easing.in(Easing.cubic);

export type SlatTypeProps = {
  text: string;
  x: number;
  // Baseline.
  y: number;
  size: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  period?: number;
  duty?: number;
  // Length of the comb teeth above and below the letters; `lift` makes them taller (the key-word emphasis).
  fringe?: number;
  lift?: number;
  // Slices rise out of an invisible slot from `at`, left to right across `spread` s; they drop away from `out`.
  at?: number;
  dur?: number;
  spread?: number;
  out?: number;
  slice?: number;
  // Music: slices hop on each beat in a wave that crosses the word in this many seconds.
  hop?: number;
  // Rough advance per letter in em, used only to size the slice range.
  em?: number;
  spacing?: number;
  // Force the word to exactly this width (SVG textLength), for wordmarks that must span the frame.
  fit?: number;
};

// A heavy word built from bars: woven core (bars with staggered weft gaps) plus comb teeth from vertically shifted copies on every 2nd and 3rd bar.
export const SlatType: FC<SlatTypeProps> = ({
  text, x, y, size, anchor = "start", color = TAN, period = PERIOD, duty = DUTY, fringe, lift = 0, at, dur = 0.55, spread = 0.75, out, slice = period * 2, hop = 0, em = 0.95, spacing = 0, fit,
}) => {
  const id = sid(useId());
  const { t, beatAt } = useLoom();
  const T = text.toUpperCase();
  const fr = (fringe ?? Math.max(4, size * 0.05)) * (1 + lift);
  const bw = Math.max(1, Math.round(period * duty));
  const est = fit ?? T.length * size * em + spacing * T.length;
  const len = fit ? { textLength: fit, lengthAdjust: "spacingAndGlyphs" as const } : {};
  const left = anchor === "start" ? x : anchor === "middle" ? x - est / 2 : x - est;
  const top = y - size * 0.74 - fr * 2 - 8;
  const slotH = y + fr * 2 + 8 - top;
  // Weft gaps: one 2 px break per bar per tile, staggered, with the tile scaled to the letter so strokes stay legible.
  const th = Math.max(24, Math.round(size * 0.42));
  const gaps = [0, 0.5, 0.25, 0.75].map((k) => Math.round(k * th));
  // Unbounded's cap height; teeth are clipped to the bands above it and below the baseline so they never fill counters or apertures.
  const cap = y - size * 0.72;
  const band = fr * 3 + 6;
  const glyphs = (
    <g fontFamily={WIDE} fontWeight={800} fontSize={size} textAnchor={anchor} letterSpacing={spacing}>
      <g clipPath={`url(#${id}f)`}>
        {[-1.7, 1.7].map((k) => (
          <text key={`c${k}`} {...len} x={x} y={y + fr * k} fill={`url(#${id}c)`}>{T}</text>
        ))}
        {[-1, 1].map((k) => (
          <text key={`b${k}`} {...len} x={x} y={y + fr * k} fill={`url(#${id}b)`}>{T}</text>
        ))}
      </g>
      <text {...len} x={x} y={y} fill={`url(#${id}a)`}>{T}</text>
    </g>
  );
  const defs = (
    <defs>
      <clipPath id={`${id}f`}>
        <rect x={-W} y={cap - band} width={W * 3} height={band} />
        <rect x={-W} y={y} width={W * 3} height={band} />
      </clipPath>
      <pattern id={`${id}a`} patternUnits="userSpaceOnUse" width={period * 4} height={th}>
        {gaps.map((g, k) => (
          <Fragment key={k}>
            {g > 0 && <rect x={k * period} y={0} width={bw} height={g} fill={color} />}
            <rect x={k * period} y={g + 2} width={bw} height={th - g - 2} fill={color} />
          </Fragment>
        ))}
      </pattern>
      <pattern id={`${id}b`} patternUnits="userSpaceOnUse" width={period * 2} height={8}>
        <rect x={0} width={bw} height={8} fill={color} />
      </pattern>
      <pattern id={`${id}c`} patternUnits="userSpaceOnUse" width={period * 3} height={8}>
        <rect x={period} width={bw} height={8} fill={color} />
      </pattern>
      <g id={`${id}w`}>{glyphs}</g>
    </defs>
  );
  const s0 = Math.max(0, Math.floor(left / slice) * slice);
  const s1 = Math.min(W, left + est + slice);
  const slices: { sx: number; dy: number }[] = [];
  let moving = false;
  let any = false;
  for (let sx = s0; sx < s1; sx += slice) {
    const u = clamp01((sx - left) / Math.max(1, est));
    const e = at === undefined ? 1 : ramp(t, at + spread * u, dur, EXPO_OUT);
    const o = out === undefined ? 0 : ramp(t, out + spread * 0.6 * u, dur * 0.8, IN);
    const b = hop > 0 ? beatAt(u * hop) : 0;
    const dy = (1 - e + o) * slotH - b * size * 0.09;
    if (dy !== 0) moving = true;
    if (dy < slotH) any = true;
    slices.push({ sx, dy });
  }
  if (!any) return <>{defs}</>;
  if (!moving) return (<>{defs}<use href={`#${id}w`} /></>);
  return (
    <>
      {defs}
      {slices.map(({ sx, dy }) =>
        dy >= slotH ? null : (
          <svg key={sx} x={sx} y={top - slotH * 0.2} width={slice} height={slotH * 1.2} overflow="hidden">
            <use href={`#${id}w`} x={-sx} y={-(top - slotH * 0.2) + dy} />
          </svg>
        ),
      )}
    </>
  );
};

// ---------- reading text that resolves from slats ----------
// level 0 = gone, ~0.3 = thin half-height stripes (the "flat grey" state), 1 = solid readable type.
const dutyOf = (level: number) => 0.14 + 0.86 * level;
const bandOf = (level: number) => 0.42 + 0.58 * level;

const LevelPattern: FC<{ id: string; level: number; period: number; lh: number; centre: number; color: string }> = ({ id, level, period, lh, centre, color }) => {
  const bw = Math.max(1, Math.round(period * dutyOf(level)));
  const band = lh * bandOf(level);
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={0} y={centre - lh / 2} width={period} height={lh}>
      <rect x={0} y={(lh - band) / 2} width={bw} height={band} fill={color} />
    </pattern>
  );
};

type TextLook = {
  x: number;
  y: number;
  size: number;
  lh?: number;
  font?: string;
  weight?: number;
  italic?: boolean;
  upper?: boolean;
  spacing?: string;
  color?: string;
  anchor?: "start" | "middle" | "end";
  period?: number;
  opacity?: number;
};

const levelFill = (id: string, level: number, color: string) => (level >= 0.999 ? color : `url(#${id})`);

export type SlatTextProps = TextLook & {
  lines: string[];
  // A time per line, or one time with `stagger` between lines.
  at?: number | number[];
  stagger?: number;
  dur?: number;
  // Where a line starts before it resolves: 0 = invisible, 0.3 = visible as thin stripes waiting its turn.
  from?: number;
  // Final level (e.g. 0.3 to dim a finished row); or `level` per line to drive it directly.
  to?: number;
  level?: number | number[];
};

// Lines of type whose bars grow from thin half-height slats to full solid letters on their cue.
export const SlatText: FC<SlatTextProps> = ({
  lines, x, y, size, lh = size * 1.18, font = SERIF, weight = 500, italic = false, upper = false, spacing = "0em", color = TAN, anchor = "middle", period = PERIOD, opacity = 1,
  at = 0, stagger = 0.25, dur = 0.66, from = 0, to = 1, level,
}) => {
  const id = sid(useId());
  const { t } = useLoom();
  const centre = font === WIDE ? 0.37 : 0.33;
  return (
    <g opacity={opacity}>
      {lines.map((line, i) => {
        const a = Array.isArray(at) ? at[i] ?? at[at.length - 1] ?? 0 : at + i * stagger;
        const lv = level === undefined ? from + (to - from) * ramp(t, a, dur, Easing.inOut(Easing.cubic)) : Array.isArray(level) ? level[i] ?? 1 : level;
        if (lv <= 0.001) return null;
        const by = y + i * lh;
        const pid = `${id}l${i}`;
        return (
          <g key={i} opacity={Math.min(1, lv * 5)}>
            <defs>{lv < 0.999 && <LevelPattern id={pid} level={lv} period={period} lh={lh} centre={by - size * centre} color={color} />}</defs>
            <text x={x} y={by} fontFamily={font} fontWeight={weight} fontStyle={italic ? "italic" : "normal"} fontSize={size} textAnchor={anchor} letterSpacing={spacing} fill={levelFill(pid, lv, color)}>
              {upper ? line.toUpperCase() : line}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export type Word = { w: string; t: number; key?: boolean };

// One line resolved word by word on the narration's word times (tspans, so no text measuring); `key` words land in heavy wide caps.
export const SlatWords: FC<TextLook & { words: Word[]; from?: number; dur?: number; keyColor?: string }> = ({
  words, x, y, size, font = WIDE, weight = 500, italic = false, upper = true, spacing = "0.04em", color = TAN, keyColor, anchor = "middle", period = PERIOD, from = 0, dur = 0.4,
}) => {
  const id = sid(useId());
  const { t } = useLoom();
  const lh = size * 1.2;
  const centre = font === WIDE ? 0.37 : 0.33;
  const lv = words.map((w) => from + (1 - from) * ramp(t, w.t - 0.12, dur, Easing.out(Easing.cubic)));
  return (
    <g>
      <defs>
        {words.map((w, i) => (lv[i]! < 0.999 && lv[i]! > 0.001 ? <LevelPattern key={i} id={`${id}w${i}`} level={lv[i]!} period={period} lh={lh} centre={y - size * centre} color={w.key ? keyColor ?? color : color} /> : null))}
      </defs>
      <text x={x} y={y} fontFamily={font} fontWeight={weight} fontStyle={italic ? "italic" : "normal"} fontSize={size} textAnchor={anchor} letterSpacing={spacing}>
        {words.map((w, i) => (
          <tspan key={i} fontWeight={w.key ? 800 : weight} fill={lv[i]! <= 0.001 ? "transparent" : levelFill(`${id}w${i}`, lv[i]!, w.key ? keyColor ?? color : color)}>
            {(upper ? w.w.toUpperCase() : w.w) + (i < words.length - 1 ? " " : "")}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// The board's tiny wide caps for corners and labels, resolving like everything else.
export const Caps: FC<Omit<SlatTextProps, "font" | "upper" | "size"> & { size?: number }> = ({ size = LABEL, spacing = TRACK, anchor = "start", weight = 500, ...rest }) => (
  <SlatText size={size} font={WIDE} weight={weight} upper spacing={spacing} anchor={anchor} lh={size * 1.55} dur={0.45} stagger={0.12} {...rest} />
);
