// Data-story primitives: the newsroom paper, the SVG stage, axes that draw on, series lines, pulse rings, the odometer count-up and the source line.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { H, W } from "../../core/video";
import { clamp01, ramp, useTime } from "../../core/time";
import { AXIS_D, F, LABEL, MARGIN, MONO, OUT3, OUTEXPO, PUNCH_D, SIZE, TNUM, ToneCtx, useTone, type Tone, PAPER } from "./theme";
import { fmt, pathOf, type Plot, type Pt } from "./scale";

// Paper with a faint data lattice; a slow diagonal swell passes through the dots so a held chart never freezes.
export const Paper: FC<{ tone?: Tone }> = ({ tone = PAPER }) => {
  const { t } = useTime();
  const step = 48;
  const dots: ReactNode[] = [];
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const wave = 0.5 + 0.5 * Math.sin((x + y) / 340 - t * 0.9);
      dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} opacity={0.05 + wave * wave * 0.07} />);
    }
  }
  return (
    <AbsoluteFill style={{ backgroundColor: tone.bg }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }} fill={tone.ink}>
        {dots}
      </svg>
    </AbsoluteFill>
  );
};

// Full-frame SVG in 1920×1080 coordinates; every chart piece draws inside one.
export const Stage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

type TxtProps = {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  font?: string;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  italic?: boolean;
  spacing?: string;
  dy?: number;
};

// SVG text with tabular numerals on by default, so values never jitter while they count.
export const Txt: FC<TxtProps> = ({ x, y, children, size = SIZE.label, weight = 500, color, font = LABEL, anchor = "start", opacity = 1, italic, spacing, dy = 0 }) => {
  const tone = useTone();
  if (opacity <= 0) return null;
  return (
    <text x={x} y={y + dy} fontFamily={font} fontSize={size} fontWeight={weight} fill={color ?? tone.ink} textAnchor={anchor} opacity={opacity} fontStyle={italic ? "italic" : undefined} letterSpacing={spacing} style={TNUM}>
      {children}
    </text>
  );
};

export type AxisProps = {
  pl: Plot;
  at: number;
  yTicks?: number[];
  yFmt?: (v: number) => string;
  // Shown after the top tick label only, the newsroom way of naming a unit.
  unit?: string;
  xTicks?: { v: number; label: string }[];
  opacity?: number;
};

// Baseline draws first (10 f), then the hairline grid sweeps in from the left one line per frame, then the labels settle.
export const Axis: FC<AxisProps> = ({ pl, at, yTicks = [], yFmt = (v) => fmt(v), unit, xTicks = [], opacity = 1 }) => {
  const { t } = useTime();
  const tone = useTone();
  const base = pl.sy(pl.yd[0]);
  const pb = ramp(t, at, AXIS_D, OUT3);
  const top = Math.max(...yTicks);
  return (
    <g opacity={opacity}>
      {yTicks.filter((v) => v !== pl.yd[0]).map((v, i) => {
        const p = ramp(t, at + (i + 2) * F, AXIS_D, OUT3);
        return <line key={v} x1={pl.x} x2={pl.x + pl.w * p} y1={pl.sy(v)} y2={pl.sy(v)} stroke={tone.grid} strokeWidth={2} />;
      })}
      {yTicks.map((v, i) => (
        <Txt key={v} x={pl.x - 20} y={pl.sy(v) + 10} anchor="end" size={SIZE.small} color={tone.muted} opacity={ramp(t, at + AXIS_D + i * F, 8 * F)}>
          {yFmt(v)}
          {unit && v === top ? <tspan fontWeight={500}>{` ${unit}`}</tspan> : null}
        </Txt>
      ))}
      <line x1={pl.x} x2={pl.x + pl.w * pb} y1={base} y2={base} stroke={tone.ink} strokeWidth={2.5} strokeLinecap="round" />
      {xTicks.map((k, i) => (
        <g key={k.label} opacity={ramp(t, at + AXIS_D * 0.6 + i * F, 8 * F)}>
          <line x1={pl.sx(k.v)} x2={pl.sx(k.v)} y1={base} y2={base + 10} stroke={tone.ink} strokeWidth={2} />
          <Txt x={pl.sx(k.v)} y={base + 48} anchor="middle" size={SIZE.small} color={tone.muted}>{k.label}</Txt>
        </g>
      ))}
    </g>
  );
};

// A round-capped data line; w thickens from 4 to 7 px for emphasis.
export const Line: FC<{ pts: Pt[]; color: string; w?: number; opacity?: number; dash?: string }> = ({ pts, color, w = 4, opacity = 1, dash }) =>
  pts.length < 2 || opacity <= 0 ? null : <path d={pathOf(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} strokeDasharray={dash} />;

// The idle life of a live data point: a ring that keeps breathing out from the last value.
export const PulseRing: FC<{ x: number; y: number; at: number; color?: string; r?: number }> = ({ x, y, at, color, r = 9 }) => {
  const { t } = useTime();
  const tone = useTone();
  const c = color ?? tone.hi;
  const on = ramp(t, at, 8 * F);
  if (on <= 0) return null;
  const period = 1.6;
  const ph = t > at ? ((t - at) % period) / period : 0;
  return (
    <g>
      <circle cx={x} cy={y} r={r + ph * r * 2.6} fill="none" stroke={c} strokeWidth={2.5} opacity={on * (1 - ph) * 0.55} />
      <circle cx={x} cy={y} r={r * (0.6 + 0.4 * on)} fill={c} stroke={tone.bg} strokeWidth={4} />
    </g>
  );
};

export type CountUpProps = {
  x: number;
  y: number;
  to: number;
  // The moment the final value lands: the spoken number.
  at: number;
  from?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  suffixColor?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
};

// An odometer: each digit is a 0–9 column that rolls; higher places only turn during a carry, leading places fade in as they appear.
export const CountUp: FC<CountUpProps> = ({ x, y, to, at, from = 0, dur = 1.2, decimals = 0, prefix = "", suffix = "", size = SIZE.number, color, suffixColor, anchor = "start", weight = 700 }) => {
  const { t } = useTime();
  const tone = useTone();
  const k = ramp(t, at - dur, dur, OUTEXPO);
  const v = from + (to - from) * k;
  const scaled = Math.abs(v) * 10 ** decimals;
  const template = fmt(Math.max(Math.abs(from), Math.abs(to)), decimals);
  const punch = 1 + 0.08 * Math.sin(Math.PI * clamp01((t - at) / PUNCH_D));
  const show = ramp(t, at - dur - 0.25, 0.25);
  const lh = 1.12;
  let place = template.replace(/[^0-9]/g, "").length;
  const parts = template.split("").map((ch, i) => {
    if (!/[0-9]/.test(ch)) {
      const vis = ch === "." ? 1 : clamp01((scaled / 10 ** place) * 1.5);
      return <span key={i} style={{ display: "inline-block", width: `${0.3 * vis}em`, overflow: "hidden", opacity: vis }}>{ch}</span>;
    }
    place -= 1;
    const s = scaled / 10 ** place;
    const baseDigit = Math.floor(s + 1e-6);
    // Each place turns only while the places below it are in the last quarter-unit before a carry, like a real odometer.
    const rem = scaled - baseDigit * 10 ** place;
    const roll = clamp01((rem - (10 ** place - 0.25)) * 4);
    const pos = (baseDigit % 10) + roll;
    const vis = place === 0 || place < decimals + 1 ? 1 : clamp01(s * 1.5);
    return (
      <span key={i} style={{ display: "inline-block", width: `${0.6 * vis}em`, textAlign: "center", height: `${lh}em`, overflow: "hidden", verticalAlign: "top", opacity: vis }}>
        <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${-pos * lh}em)` }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => <span key={j} style={{ height: `${lh}em`, lineHeight: `${lh}em` }}>{d}</span>)}
        </span>
      </span>
    );
  });
  const shift = anchor === "middle" ? "-50%" : anchor === "end" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${shift}, -50%) scale(${punch})`,
        transformOrigin: anchor === "start" ? "left center" : anchor === "end" ? "right center" : "center",
        fontFamily: LABEL,
        fontWeight: weight,
        fontSize: size,
        lineHeight: `${lh}em`,
        letterSpacing: "-0.03em",
        color: color ?? tone.ink,
        whiteSpace: "nowrap",
        opacity: show,
        display: "flex",
        ...TNUM,
      }}
    >
      {v < 0 ? "−" : ""}
      {prefix}
      {parts}
      <span style={{ color: suffixColor ?? color ?? tone.ink }}>{suffix}</span>
    </div>
  );
};

// Bottom-left source line: a hairline rule draws, then "Source:" and the citation fade in, 28 px muted.
export const SourceTag: FC<{ at: number; source: string; note?: string; x?: number; y?: number }> = ({ at, source, note, x = MARGIN, y = H - MARGIN }) => {
  const { t } = useTime();
  const tone = useTone();
  const rule = ramp(t, at, 12 * F, OUT3);
  const txt = ramp(t, at + 6 * F, 10 * F);
  const lift = (1 - txt) * 8;
  return (
    <div style={{ position: "absolute", left: x, bottom: H - y, fontFamily: LABEL, fontSize: SIZE.small, color: tone.muted, lineHeight: 1.35 }}>
      <div style={{ width: 120 * rule, height: 3, background: tone.ink, marginBottom: 16 }} />
      <div style={{ opacity: txt, transform: `translateY(${lift}px)` }}>
        <span style={{ fontWeight: 700, color: tone.ink }}>Source:</span> {source}
      </div>
      {note ? <div style={{ opacity: ramp(t, at + 12 * F, 10 * F), fontFamily: MONO, fontSize: SIZE.small, marginTop: 6, letterSpacing: "0.02em" }}>{note}</div> : null}
    </div>
  );
};

// Re-provides a tone to a subtree (e.g. a night inset on a chapter plate).
export const WithTone: FC<{ tone: Tone; children: ReactNode }> = ({ tone, children }) => <ToneCtx.Provider value={tone}>{children}</ToneCtx.Provider>;
