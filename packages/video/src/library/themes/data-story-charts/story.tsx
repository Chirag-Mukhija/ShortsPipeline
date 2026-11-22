// Signature moves of the theme: the bar race, bars morphing into a dot plot, the time-cursor scrub with a region zoom, and the chapter plate that grows out of a data point.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { H, W } from "../../core/video";
import { clamp01, ramp, useTime } from "../../core/time";
import { AXIS_D, BAR_D, BAR_STAGGER, F, INOUT3, MARGIN, MONO, MORPH_D, NIGHT, OUT3, REORDER_D, SERIF, SIZE, TITLE, ZOOM_D, useTone } from "./theme";
import { Axis, Line, PulseRing, Txt, WithTone } from "./primitives";
import { clipPolyX, fmt, type Box, type Plot, type Pt } from "./scale";
import type { Bar, Series } from "./charts";

export type RacePeriod = { year: number; values: Record<string, number> };

// Ranks at an instant: 0 = biggest.
const ranksAt = (vals: Record<string, number>) => {
  const order = Object.keys(vals).sort((a, b) => vals[b]! - vals[a]!);
  return Object.fromEntries(order.map((k, i) => [k, i])) as Record<string, number>;
};

// Gridline steps that fade by on-screen spacing, so a growing scale never pops.
const raceTicks = (max: number, px: number) => {
  const e = Math.floor(Math.log10(max));
  const out = new Map<number, number>();
  for (let k = e - 2; k <= e; k++) {
    for (const m of [1, 2]) {
      const s = m * 10 ** k;
      const o = clamp01((s / max) * px / 110 - 1.2);
      if (o <= 0) continue;
      for (let v = s; v <= max; v += s) out.set(Math.round(v), Math.max(out.get(Math.round(v)) ?? 0, o));
    }
  }
  return [...out.entries()];
};

export type BarRaceProps = { box: Box; periods: RacePeriod[]; at: number; period?: number; top?: number; highlight?: string; valueFmt?: (v: number) => string };

// Ranked horizontal bars through time: values move linearly (honest speed), ranks re-sort with a smooth 20 f slide, the year ticks slowly in the corner.
export const BarRace: FC<BarRaceProps> = ({ box, periods, at, period = 0.8, top = 8, highlight, valueFmt = (v) => fmt(v) }) => {
  const { t } = useTime();
  const tone = useTone();
  const n = periods.length;
  const uAt = (tt: number) => Math.min(n - 1, Math.max(0, (tt - at) / period));
  const valsAt = (tt: number) => {
    const u = uAt(tt);
    const i = Math.min(n - 2, Math.floor(u));
    const k = u - i;
    const a = periods[i]!.values;
    const b = periods[i + 1]!.values;
    return Object.fromEntries(Object.keys(a).map((name) => [name, a[name]! + ((b[name] ?? 0) - a[name]!) * k])) as Record<string, number>;
  };
  // Rank is smoothed with a bell-weighted look-back over 20 f, which turns each swap into an eased slide while staying a pure function of time.
  const taps = 12;
  const smooth: Record<string, number> = {};
  let wsum = 0;
  for (let j = 0; j < taps; j++) {
    const w = Math.sin((Math.PI * (j + 0.5)) / taps) ** 2;
    const r = ranksAt(valsAt(t - (j * REORDER_D) / taps));
    for (const [name, rk] of Object.entries(r)) smooth[name] = (smooth[name] ?? 0) + rk * w;
    wsum += w;
  }
  const vals = valsAt(t);
  const max = Math.max(...Object.values(vals)) * 1.12;
  const rowH = box.h / top;
  const bh = rowH * 0.72;
  const u = uAt(t);
  const year = periods[0]!.year + (periods[n - 1]!.year - periods[0]!.year) * (u / (n - 1));
  const show = ramp(t, at - 0.5, 10 * F);
  return (
    <g opacity={show}>
      {raceTicks(max, box.w).map(([v, o]) => {
        const x = box.x + (v / max) * box.w;
        return (
          <g key={v} opacity={o}>
            <line x1={x} x2={x} y1={box.y - 16} y2={box.y + box.h} stroke={tone.grid} strokeWidth={2} />
            <Txt x={x} y={box.y - 30} anchor="middle" size={SIZE.small} color={tone.muted}>{valueFmt(v)}</Txt>
          </g>
        );
      })}
      <line x1={box.x} x2={box.x} y1={box.y - 16} y2={box.y + box.h} stroke={tone.ink} strokeWidth={2.5} />
      {Object.keys(vals).map((name) => {
        const rk = smooth[name]! / wsum;
        const vis = clamp01(top - 0.15 - rk);
        if (vis <= 0) return null;
        const y = box.y + rk * rowH + (rowH - bh) / 2;
        const isHi = name === highlight;
        const bw = (vals[name]! / max) * box.w;
        return (
          <g key={name} opacity={vis}>
            <rect x={box.x} y={y} width={bw} height={bh} fill={isHi ? tone.hi : tone.context} />
            <Txt x={box.x - 18} y={y + bh / 2 + 11} anchor="end" size={SIZE.label} weight={isHi ? 700 : 600} color={isHi ? tone.hi : tone.ink}>{name}</Txt>
            <Txt x={box.x + bw + 14} y={y + bh / 2 + 11} size={SIZE.label} weight={600} color={isHi ? tone.hi : tone.muted}>{valueFmt(Math.round(vals[name]!))}</Txt>
          </g>
        );
      })}
      <Txt x={box.x + box.w} y={box.y + box.h + 132} anchor="end" font={MONO} size={120} weight={500} color={tone.context}>{Math.floor(year + 1e-6)}</Txt>
      <line x1={box.x} x2={box.x + box.w - 330} y1={box.y + box.h + 92} y2={box.y + box.h + 92} stroke={tone.grid} strokeWidth={4} />
      <line x1={box.x} x2={box.x + (box.w - 330) * (u / (n - 1))} y1={box.y + box.h + 92} y2={box.y + box.h + 92} stroke={tone.ink} strokeWidth={4} />
      <circle cx={box.x + (box.w - 330) * (u / (n - 1))} cy={box.y + box.h + 92} r={8} fill={tone.ink} />
    </g>
  );
};

export type ChartMorphProps = { box: Box; data: Bar[]; max: number; drawAt: number; at: number; highlight?: number; valueFmt?: (v: number) => string; ticks?: number[] };

// Shared marks: each bar shrinks, rounds and travels to become a dot on a sorted dot plot (27 f, in-out cubic, 1 f stagger); labels hand over halfway.
export const ChartMorph: FC<ChartMorphProps> = ({ box, data, max, drawAt, at, highlight, valueFmt = (v) => fmt(v), ticks = [] }) => {
  const { t } = useTime();
  const tone = useTone();
  const n = data.length;
  const slot = box.w / n;
  const bw = Math.min(140, slot * 0.56);
  const base = box.y + box.h;
  const sorted = data.map((_, i) => i).sort((a, b) => data[b]!.value - data[a]!.value);
  const labelW = 360;
  const x0 = box.x + labelW;
  const dw = box.w - labelW - 140;
  const rowH = box.h / n;
  const hand = ramp(t, at + 10 * F, 10 * F);
  const back = 1 - ramp(t, at, 8 * F);
  const axisB = ramp(t, at + MORPH_D - 8 * F, 12 * F, OUT3);
  return (
    <g>
      <line x1={box.x} x2={box.x + box.w * ramp(t, drawAt, AXIS_D, OUT3)} y1={base} y2={base} stroke={tone.ink} strokeWidth={2.5} opacity={back} />
      {axisB > 0 ? (
        <g opacity={axisB}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={x0 + (v / max) * dw} x2={x0 + (v / max) * dw} y1={box.y - 10} y2={base} stroke={v === 0 ? tone.ink : tone.grid} strokeWidth={v === 0 ? 2.5 : 2} />
              <Txt x={x0 + (v / max) * dw} y={box.y - 26} anchor="middle" size={SIZE.small} color={tone.muted}>{valueFmt(v)}</Txt>
            </g>
          ))}
        </g>
      ) : null}
      {data.map((d, i) => {
        const g = ramp(t, drawAt + AXIS_D + 6 * F + i * BAR_STAGGER, BAR_D, OUT3);
        if (g <= 0) return null;
        const e = ramp(t, at + i * F, MORPH_D, INOUT3);
        const row = sorted.indexOf(i);
        const isHi = i === highlight;
        const ax = box.x + slot * (i + 0.5);
        const ah = (d.value / max) * box.h * g;
        const bx = x0 + (d.value / max) * dw;
        const by = box.y + rowH * (row + 0.5);
        const size = 34;
        const rx = interpolate(e, [0, 1], [ax - bw / 2, bx - size / 2]);
        const ry = interpolate(e, [0, 1], [base - ah, by - size / 2]);
        const rw = interpolate(e, [0, 1], [bw, size]);
        const rh = interpolate(e, [0, 1], [ah, size]);
        const col = isHi ? tone.hi : e > 0.5 ? tone.ink : tone.context;
        const stem = ramp(t, at + MORPH_D + i * F, 12 * F, OUT3);
        return (
          <g key={d.label}>
            {stem > 0 ? <line x1={x0} x2={x0 + (bx - x0 - size / 2) * stem} y1={by} y2={by} stroke={isHi ? tone.hi : tone.context} strokeWidth={4} strokeLinecap="round" /> : null}
            <rect x={rx} y={ry} width={rw} height={Math.max(0, rh)} rx={interpolate(e, [0, 1], [0, size / 2])} fill={col} />
            <g opacity={back}>
              <Txt x={ax} y={base + 46} anchor="middle" size={SIZE.label} weight={isHi ? 700 : 500} color={isHi ? tone.ink : tone.muted} opacity={ramp(t, drawAt + AXIS_D, 10 * F)}>{d.label}</Txt>
              <Txt x={ax} y={base - ah - 18} anchor="middle" size={34} weight={isHi ? 700 : 600} color={isHi ? tone.hi : tone.ink} opacity={g >= 0.7 ? 1 : 0}>{valueFmt(d.value)}</Txt>
            </g>
            <g opacity={hand}>
              <Txt x={x0 - 36} y={by + 11} anchor="end" size={34} weight={isHi ? 700 : 500} color={isHi ? tone.hi : tone.ink}>{d.label}</Txt>
              <Txt x={bx + 32} y={by + 11} size={SIZE.label} weight={600} color={isHi ? tone.hi : tone.muted} opacity={stem}>{valueFmt(d.value)}</Txt>
            </g>
          </g>
        );
      })}
    </g>
  );
};

export type ScrubProps = {
  pl: Plot;
  series: Series[];
  at: number;
  dur: number;
  xFmt: (x: number) => string;
  yFmt?: (v: number) => string;
  xTicks?: { v: number; label: string }[];
  yTicks?: number[];
  unit?: string;
  // Region of interest in data x: the camera pushes in on it after the sweep.
  zoom?: { at: number; x0: number; x1: number; s?: number };
  children?: ReactNode;
};

// A time cursor sweeps the x axis at a constant pace, drawing the highlight line and reading its value; then the camera pushes in on the region that matters.
export const Scrub: FC<ScrubProps> = ({ pl, series, at, dur, xFmt, yFmt = (v) => fmt(v), xTicks, yTicks, unit, zoom, children }) => {
  const { t } = useTime();
  const tone = useTone();
  const u = clamp01((t - at) / dur);
  const cx = pl.x + pl.w * u;
  const dataX = pl.xd[0] + (pl.xd[1] - pl.xd[0]) * u;
  const hi = series.find((s) => s.hi) ?? series[0]!;
  const toPts = (s: Series) => s.data.map(([x, y]) => [pl.sx(x), pl.sy(y)] as Pt);
  const hiPts = toPts(hi);
  const drawn = clipPolyX(hiPts, cx);
  const head = drawn[drawn.length - 1] ?? hiPts[0]!;
  const val = pl.yd[0] + ((pl.y + pl.h - head[1]) / pl.h) * (pl.yd[1] - pl.yd[0]);
  const cur = ramp(t, at - 6 * F, 8 * F) * (1 - ramp(t, at + dur + 0.3, 10 * F));
  const e = zoom ? ramp(t, zoom.at, ZOOM_D, INOUT3) : 0;
  const view = { x: pl.x - 200, y: pl.y - 140, w: W - MARGIN - (pl.x - 200), h: pl.h + 230 };
  const zx = zoom ? (pl.sx(zoom.x0) + pl.sx(zoom.x1)) / 2 : view.x + view.w / 2;
  const zy = pl.y + pl.h / 2;
  const vx = view.x + view.w / 2;
  const vy = view.y + view.h / 2;
  const s = 1 + ((zoom?.s ?? 1.8) - 1) * e;
  const cam = `translate(${zx + (vx - zx) * e} ${zy + (vy - zy) * e}) scale(${s}) translate(${-zx} ${-zy})`;
  const clip = `dsc-view-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const chipW = 300;
  const chipX = Math.min(pl.x + pl.w - chipW / 2, Math.max(pl.x + chipW / 2, cx));
  return (
    <g clipPath={`url(#${clip})`}>
      <clipPath id={clip}>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} />
      </clipPath>
      <g transform={cam}>
        <Axis pl={pl} at={at - 1.0} yTicks={yTicks} yFmt={yFmt} unit={unit} xTicks={xTicks} />
        {series.filter((x) => x !== hi).map((x, i) => {
          const pts = toPts(x);
          const end = pts[pts.length - 1]!;
          return (
            <g key={x.label} opacity={ramp(t, at - 0.6 + i * 2 * F, 10 * F)}>
              <Line pts={pts} color={tone.context} w={4} />
              <Txt x={end[0] + 18} y={end[1] + 10 + (x.labelDy ?? 0)} size={SIZE.small} color={tone.muted}>{x.label}</Txt>
            </g>
          );
        })}
        {children}
        <Line pts={drawn} color={tone.hi} w={5.5} />
        {u >= 1 ? <PulseRing x={head[0]} y={head[1]} at={at + dur} /> : <circle cx={head[0]} cy={head[1]} r={9} fill={tone.hi} opacity={cur} />}
        {u >= 1 ? <Txt x={head[0] + 30} y={head[1] + 10 + (hi.labelDy ?? 0)} size={34} weight={700} color={tone.hi} opacity={ramp(t, at + dur, 8 * F)}>{hi.label}</Txt> : null}
        {cur > 0 ? (
          <g opacity={cur}>
            <line x1={cx} x2={cx} y1={pl.y - 20} y2={pl.y + pl.h} stroke={tone.ink} strokeWidth={2} />
            <rect x={chipX - chipW / 2} y={pl.y - 112} width={chipW} height={86} rx={8} fill={tone.ink} />
            <Txt x={chipX - chipW / 2 + 22} y={pl.y - 58} font={MONO} size={SIZE.small} color={tone.bg}>{xFmt(dataX)}</Txt>
            <Txt x={chipX + chipW / 2 - 22} y={pl.y - 56} anchor="end" size={38} weight={700} color={tone.bg}>{yFmt(val)}</Txt>
          </g>
        ) : null}
      </g>
    </g>
  );
};

export type ChapterPlateProps = {
  at: number;
  // The data point the plate grows out of, in screen coordinates.
  from: { x: number; y: number };
  color: string;
  number: string;
  date: string;
  title: string;
  dek?: string;
  // A night-toned inset drawn in a 700×560 box (its own coordinates), animated once when the plate lands.
  inset?: ReactNode;
  outAt?: number;
  children?: ReactNode;
};

// Chapter change: the last data point swells into a flat colour field; the issue number, a lowercase title and a dark inset chart deal in 3 f apart.
export const ChapterPlate: FC<ChapterPlateProps> = ({ at, from, color, number, date, title, dek, inset, outAt, children }) => {
  const { t } = useTime();
  const full = Math.hypot(Math.max(from.x, W - from.x), Math.max(from.y, H - from.y)) + 20;
  const grow = ramp(t, at, 26 * F, INOUT3);
  const shrink = outAt === undefined ? 0 : ramp(t, outAt, 20 * F, INOUT3);
  const r = 12 + (full - 12) * grow * (1 - shrink);
  const land = at + 18 * F;
  const deal = (i: number) => ramp(t, land + i * 3 * F, 12 * F, OUT3);
  const ink = "#1A1A1A";
  const item = (i: number) => ({ opacity: deal(i), transform: `translateY(${(1 - deal(i)) * 26}px)` });
  return (
    <AbsoluteFill>
      {children}
      {grow > 0 ? (
        <AbsoluteFill style={{ backgroundColor: color, clipPath: `circle(${r}px at ${from.x}px ${from.y}px)` }}>
          <div style={{ position: "absolute", left: 96, top: 120, width: 820, color: ink }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: MONO, fontSize: 32, letterSpacing: "0.04em", ...item(0) }}>
              <span style={{ border: `3px solid ${ink}`, borderRadius: 40, padding: "6px 22px" }}>{number}</span>
              <span>{date.toUpperCase()}</span>
            </div>
            <div style={{ marginTop: 200, fontFamily: TITLE, fontWeight: 700, fontSize: 150, lineHeight: 0.98, letterSpacing: "-0.04em", textTransform: "lowercase", ...item(1) }}>{title}</div>
            {dek ? <div style={{ marginTop: 34, fontFamily: SERIF, fontSize: 46, lineHeight: 1.3, maxWidth: 740, ...item(2) }}>{dek}</div> : null}
          </div>
          {inset ? (
            <div style={{ position: "absolute", right: 96, top: 230, width: 760, height: 620, background: NIGHT.bg, ...item(3) }}>
              <WithTone tone={NIGHT}>
                <svg width={760} height={620} viewBox="0 0 760 620" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{inset}</svg>
              </WithTone>
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// A whole-scene dim for exits that keep context: the board's "dim to 20 %, remove only on chapter change".
export const Dim: FC<{ at: number; to?: number; children: ReactNode }> = ({ at, to = 0.2, children }) => {
  const { t } = useTime();
  return <g opacity={1 - (1 - to) * ramp(t, at, 10 * F)}>{children}</g>;
};

