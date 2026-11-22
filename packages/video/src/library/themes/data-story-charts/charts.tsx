// Core chart pieces: bars that grow and re-rank, reference lines, line charts with direct labels, callouts, shaded periods, A-vs-B with a ratio, small multiples and the heatmap.
import type { FC } from "react";
import { interpolate, interpolateColors } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { AXIS_D, BAR_D, BAR_STAGGER, CALLOUT_D, CONTEXT_D, CONTEXT_STAGGER, DIM, F, HI_D, INOUT3, MONO, OUT3, OUTEXPO, REORDER_D, SERIF, SIZE, useTone } from "./theme";
import { Axis, Line, PulseRing, Txt } from "./primitives";
import { fmt, plot, slicePoly, type Box, type Plot, type Pt } from "./scale";

export type Bar = { label: string; value: number };

export type BarGrowProps = {
  pl: Plot;
  data: Bar[];
  at: number;
  highlight?: number;
  // When the highlight bar turns from grey to the highlight colour (defaults to when it lands).
  hiAt?: number;
  // Re-rank: from `at` on, bars slide to these display slots (indices of data, left to right).
  order?: { at: number; by: number[] };
  // Bars under a value dim to context once the reference line has made its point.
  dimBelow?: { value: number; at: number };
  yTicks?: number[];
  yFmt?: (v: number) => string;
  unit?: string;
  valueFmt?: (v: number) => string;
};

// When bar i starts to grow, so callers can cue other things off it.
export const barStart = (at: number, i: number) => at + AXIS_D + 8 * F + i * BAR_STAGGER;

// Vertical bars rising from the baseline with a 3 f stagger, direct value labels, one highlight, an eased re-rank.
export const BarGrow: FC<BarGrowProps> = ({ pl, data, at, highlight, hiAt, order, dimBelow, yTicks = [], yFmt, unit, valueFmt = (v) => fmt(v) }) => {
  const { t } = useTime();
  const tone = useTone();
  const n = data.length;
  const slot = pl.w / n;
  const bw = Math.min(150, slot * 0.58);
  const base = pl.sy(pl.yd[0]);
  return (
    <g>
      <Axis pl={pl} at={at} yTicks={yTicks} yFmt={yFmt} unit={unit} />
      {data.map((d, i) => {
        const g = ramp(t, barStart(at, i), BAR_D, OUT3);
        if (g <= 0) return null;
        const to = order ? order.by.indexOf(i) : i;
        const mv = order ? ramp(t, order.at + Math.abs(to - i) * F, REORDER_D, INOUT3) : 0;
        const cx = pl.x + slot * (i + (to - i) * mv + 0.5);
        const top = pl.sy(d.value);
        const h = (base - top) * g;
        const isHi = i === highlight;
        const hp = isHi ? ramp(t, hiAt ?? barStart(at, i) + BAR_D * 0.6, 8 * F) : 0;
        const fill = interpolateColors(hp, [0, 1], [tone.context, tone.hi]);
        const dim = dimBelow && d.value < dimBelow.value && !isHi ? 1 - (1 - DIM - 0.1) * ramp(t, dimBelow.at, 10 * F) : 1;
        const lab = ramp(t, barStart(at, i) + BAR_D * 0.7, 8 * F);
        return (
          <g key={d.label} opacity={dim}>
            <rect x={cx - bw / 2} y={base - h} width={bw} height={Math.max(0, h)} fill={fill} />
            <Txt x={cx} y={base - h - 18} anchor="middle" size={isHi ? 40 : 34} weight={isHi ? 700 : 600} color={isHi && hp > 0.5 ? tone.hi : tone.ink} opacity={lab}>
              {valueFmt(d.value)}
            </Txt>
            <Txt x={cx} y={base + 46} anchor="middle" size={SIZE.label} weight={isHi ? 700 : 500} color={isHi ? tone.ink : tone.muted} opacity={ramp(t, at + AXIS_D, 10 * F)}>
              {d.label}
            </Txt>
          </g>
        );
      })}
    </g>
  );
};

// A dashed average or threshold line that rises from the baseline to its level, then names itself in the annotator's serif.
export const ReferenceLine: FC<{ pl: Plot; value: number; label: string; at: number; color?: string }> = ({ pl, value, label, at, color }) => {
  const { t } = useTime();
  const tone = useTone();
  const c = color ?? tone.ink;
  const p = ramp(t, at, 18 * F, OUT3);
  if (p <= 0) return null;
  const y = interpolate(p, [0, 1], [pl.sy(pl.yd[0]), pl.sy(value)]);
  const lab = ramp(t, at + 14 * F, 10 * F);
  return (
    <g opacity={Math.min(1, p * 2)}>
      <line x1={pl.x - 8} x2={pl.x + pl.w + 8} y1={y} y2={y} stroke={c} strokeWidth={3} strokeDasharray="12 10" strokeLinecap="round" />
      <g opacity={lab} transform={`translate(${(1 - lab) * -10} 0)`}>
        <Txt x={pl.x + pl.w + 26} y={y - 8} font={SERIF} italic size={SIZE.body} color={c}>{label}</Txt>
        <Txt x={pl.x + pl.w + 26} y={y + 34} size={SIZE.small} weight={600} color={tone.muted}>{fmt(value)}</Txt>
      </g>
    </g>
  );
};

export type Series = { label: string; data: Pt[]; hi?: boolean; labelDy?: number; color?: string };

export type LineChartProps = {
  pl: Plot;
  series: Series[];
  at: number;
  xTicks?: { v: number; label: string }[];
  yTicks?: number[];
  yFmt?: (v: number) => string;
  unit?: string;
  // The highlight series thickens from 5 to 8 px when the narrator leans on it.
  thickenAt?: number;
  dimContextAt?: number;
  pulse?: boolean;
};

// When each series of a LineChart finishes drawing: context lines first, the highlight last.
export const lineTimes = (at: number, series: Series[]) => {
  const ctx = series.filter((s) => !s.hi).length;
  const hiStart = at + AXIS_D + 6 * F + (ctx ? ctx * CONTEXT_STAGGER + CONTEXT_D : 0);
  return { hiStart, hiEnd: hiStart + HI_D };
};

// Axes, then grey context series staggered 2 f, then the highlight series in 30 f; every line labelled at its end, no legend.
export const LineChart: FC<LineChartProps> = ({ pl, series, at, xTicks, yTicks, yFmt, unit, thickenAt, dimContextAt, pulse = true }) => {
  const { t } = useTime();
  const tone = useTone();
  const { hiStart, hiEnd } = lineTimes(at, series);
  let ci = 0;
  const drawn = series.map((s) => {
    const start = s.hi ? hiStart : at + AXIS_D + 6 * F + ci++ * CONTEXT_STAGGER;
    const d = s.hi ? HI_D : CONTEXT_D;
    const p = ramp(t, start, d, OUT3);
    const pts = s.data.map(([x, y]) => [pl.sx(x), pl.sy(y)] as Pt);
    return { s, p, part: slicePoly(pts, p), end: pts[pts.length - 1]!, lab: ramp(t, start + d - 6 * F, 8 * F) };
  });
  const thick = thickenAt === undefined ? 0 : ramp(t, thickenAt, 8 * F);
  const dim = dimContextAt === undefined ? 1 : 1 - 0.55 * ramp(t, dimContextAt, 10 * F);
  return (
    <g>
      <Axis pl={pl} at={at} yTicks={yTicks} yFmt={yFmt} unit={unit} xTicks={xTicks} />
      {[...drawn.filter((d) => !d.s.hi), ...drawn.filter((d) => d.s.hi)].map(({ s, p, part, end, lab }) => {
        const col = s.color ?? (s.hi ? tone.hi : tone.context);
        const head = part[part.length - 1]!;
        return (
          <g key={s.label} opacity={s.hi ? 1 : dim}>
            <Line pts={part} color={col} w={s.hi ? 5 + 3 * thick : 4} />
            {s.hi && p > 0 && p < 1 ? <circle cx={head[0]} cy={head[1]} r={9} fill={col} /> : null}
            {s.hi && pulse ? <PulseRing x={end[0]} y={end[1]} at={hiEnd} color={col} /> : null}
            <Txt x={end[0] + (s.hi ? 30 : 18)} y={end[1] + 10 + (s.labelDy ?? 0)} size={s.hi ? 34 : SIZE.small} weight={s.hi ? 700 : 500} color={s.hi ? col : tone.muted} opacity={lab}>
              {s.label}
            </Txt>
          </g>
        );
      })}
    </g>
  );
};

export type CalloutProps = {
  // Anchor in screen coordinates (use pl.sx / pl.sy to place it on a data point).
  x: number;
  y: number;
  at: number;
  text: string;
  kicker?: string;
  side?: "left" | "right";
  dx?: number;
  dy?: number;
};

// The annotator's voice: a ring on the data point, a leader line that draws in 12 f, then a mono kicker and a serif note.
export const Callout: FC<CalloutProps> = ({ x, y, at, text, kicker, side = "right", dx = 90, dy = -150 }) => {
  const { t } = useTime();
  const tone = useTone();
  const ring = ramp(t, at - 4 * F, 8 * F, OUTEXPO);
  if (ring <= 0) return null;
  const s = side === "right" ? 1 : -1;
  const r = 15;
  const endP: Pt = [x + s * dx, y + dy];
  // dy = 0 draws a straight leader out of the side of the ring; otherwise it rises (or drops) first, then turns.
  const path: Pt[] = dy === 0 ? [[x + s * r, y], endP] : [[x, y + Math.sign(dy) * r], [x, y + dy], endP];
  const lead = slicePoly(path, ramp(t, at, CALLOUT_D, OUT3));
  const txt = ramp(t, at + CALLOUT_D * 0.75, 10 * F);
  const tx = endP[0] + s * 18;
  const anchor = side === "right" ? "start" : "end";
  const lines = text.split("\n");
  const ty = endP[1] + (kicker ? 22 : 0) - ((lines.length - 1) * 46) / 2 + 12;
  return (
    <g>
      <circle cx={x} cy={y} r={r * ring} fill="none" stroke={tone.ink} strokeWidth={3} />
      <Line pts={lead} color={tone.ink} w={2.5} />
      <g opacity={txt} transform={`translate(${s * (1 - txt) * 12} 0)`}>
        {kicker ? <Txt x={tx} y={ty - 50} anchor={anchor} font={MONO} size={SIZE.small} color={tone.muted} spacing="0.04em">{kicker.toUpperCase()}</Txt> : null}
        {lines.map((l, i) => (
          <Txt key={i} x={tx} y={ty + i * 46} anchor={anchor} font={SERIF} italic size={SIZE.body} color={tone.ink}>{l}</Txt>
        ))}
      </g>
    </g>
  );
};

// A shaded period behind the lines ("after the price cut") that sweeps left to right, with a mono label at its top.
export const Band: FC<{ pl: Plot; x0: number; x1: number; at: number; label?: string }> = ({ pl, x0, x1, at, label }) => {
  const { t } = useTime();
  const tone = useTone();
  const p = ramp(t, at, 18 * F, OUT3);
  if (p <= 0) return null;
  const a = pl.sx(x0);
  const w = (pl.sx(x1) - a) * p;
  return (
    <g>
      <rect x={a} y={pl.y - 10} width={w} height={pl.h + 10} fill={tone.hi} opacity={0.09} />
      <line x1={a} x2={a} y1={pl.y - 10} y2={pl.y + pl.h} stroke={tone.hi} strokeWidth={2} strokeDasharray="4 8" opacity={p} />
      {label ? <Txt x={a + 16} y={pl.y + 26} font={MONO} size={SIZE.small} color={tone.hi} opacity={ramp(t, at + 10 * F, 8 * F)} spacing="0.04em">{label.toUpperCase()}</Txt> : null}
    </g>
  );
};

export type VersusProps = {
  x: number;
  y: number;
  w: number;
  a: { label: string; value: number };
  b: { label: string; value: number };
  at: { a: number; b: number; ratio: number };
  // Which side carries the highlight: the one the story is about.
  hi?: "a" | "b";
  valueFmt?: (v: number) => string;
  ratioText?: string;
  ratioNote?: string;
};

// Two bars drawn to scale, then the gap between them as a dashed ghost, then a ratio badge only once both are on screen.
export const Versus: FC<VersusProps> = ({ x, y, w, a, b, at, hi = "b", valueFmt = (v) => fmt(v), ratioText, ratioNote }) => {
  const { t } = useTime();
  const tone = useTone();
  const max = Math.max(a.value, b.value);
  const bh = 84;
  const rowGap = 210;
  const rows = [
    { ...a, k: "a" as const, ty: at.a, yy: y },
    { ...b, k: "b" as const, ty: at.b, yy: y + rowGap },
  ];
  const big = a.value >= b.value ? rows[0]! : rows[1]!;
  const small = big === rows[0] ? rows[1]! : rows[0]!;
  const gap = ramp(t, at.ratio - 8 * F, 14 * F, OUT3);
  const badge = ramp(t, at.ratio + 4 * F, 10 * F, OUTEXPO);
  const r = max / Math.min(a.value, b.value);
  const shown = ratioText ?? `${fmt(r, r < 10 ? 1 : 0)}×`;
  const sw = (small.value / max) * w;
  const bx = x + w + 40;
  const by = small.yy + bh / 2;
  return (
    <g>
      <line x1={x} x2={x} y1={y - 8} y2={y + rowGap + bh + 20} stroke={tone.ink} strokeWidth={2.5} opacity={ramp(t, Math.min(at.a, at.b) - 10 * F, AXIS_D)} />
      {rows.map((row) => {
        const p = ramp(t, row.ty, 24 * F, OUT3);
        const isHi = row.k === hi;
        const bw = (row.value / max) * w * p;
        return (
          <g key={row.k} opacity={ramp(t, row.ty - 6 * F, 6 * F)}>
            <Txt x={x} y={row.yy - 24} size={SIZE.body} weight={600} color={isHi ? tone.ink : tone.muted}>{row.label}</Txt>
            <rect x={x} y={row.yy} width={bw} height={bh} fill={isHi ? tone.hi : tone.context} />
            <Txt x={x + bw + 20} y={row.yy + bh / 2 + 16} size={46} weight={700} color={isHi ? tone.hi : tone.ink} opacity={ramp(t, row.ty + 16 * F, 8 * F)}>{valueFmt(row.value)}</Txt>
          </g>
        );
      })}
      {gap > 0 ? (
        <g>
          <rect x={x + sw} y={small.yy + 2} width={(w - sw) * gap} height={bh - 4} fill="none" stroke={tone.muted} strokeWidth={2.5} strokeDasharray="10 8" />
          <line x1={x + w} x2={x + w} y1={big.yy + bh + 6} y2={small.yy - 6} stroke={tone.muted} strokeWidth={2} strokeDasharray="4 6" opacity={gap} />
        </g>
      ) : null}
      {badge > 0 ? (
        <g transform={`translate(${bx} ${by}) scale(${0.6 + 0.4 * badge})`} opacity={clamp01(badge * 2)}>
          <rect x={0} y={-50} width={84 + shown.length * 44} height={100} rx={50} fill={tone.hi} />
          <Txt x={42 + (shown.length * 44) / 2} y={22} anchor="middle" size={66} weight={700} color={tone.onHi}>{shown}</Txt>
        </g>
      ) : null}
      {ratioNote ? <Txt x={bx + 12} y={by + 104} font={SERIF} italic size={SIZE.body} opacity={ramp(t, at.ratio + 12 * F, 10 * F)}>{ratioNote}</Txt> : null}
    </g>
  );
};

export type Multiple = { label: string; values: number[]; hi?: boolean };

// Small multiples: panels deal in with a 4 f stagger; each shows every other series as a faint ghost behind its own line.
export const SmallMultiples: FC<{ box: Box; series: Multiple[]; cols?: number; at: number; yMax?: number; valueFmt?: (v: number) => string }> = ({ box, series, cols = 3, at, yMax, valueFmt = (v) => fmt(v) }) => {
  const { t } = useTime();
  const tone = useTone();
  const rows = Math.ceil(series.length / cols);
  const gx = 64;
  const gy = 70;
  const pw = (box.w - gx * (cols - 1)) / cols;
  const ph = (box.h - gy * (rows - 1)) / rows;
  const top = yMax ?? Math.max(...series.flatMap((s) => s.values)) * 1.08;
  return (
    <g>
      {series.map((s, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const px = box.x + c * (pw + gx);
        const py = box.y + r * (ph + gy);
        const start = at + i * 4 * F;
        const show = ramp(t, start, 8 * F, OUT3);
        if (show <= 0) return null;
        const inner = plot({ x: px, y: py + 70, w: pw - 20, h: ph - 90 }, [0, s.values.length - 1], [0, top]);
        const toPts = (vals: number[]) => vals.map((v, k) => [inner.sx(k), inner.sy(v)] as Pt);
        const p = ramp(t, start + 6 * F, 20 * F, OUT3);
        const own = toPts(s.values);
        const head = own[own.length - 1]!;
        const col = s.hi ? tone.hi : tone.ink;
        return (
          <g key={s.label} opacity={show} transform={`translate(0 ${(1 - show) * 14})`}>
            <Txt x={px} y={py + 30} size={32} weight={700} color={s.hi ? tone.hi : tone.ink}>{s.label}</Txt>
            <Txt x={px + pw - 20} y={py + 30} anchor="end" size={32} weight={600} color={s.hi ? tone.hi : tone.muted} opacity={ramp(t, start + 22 * F, 8 * F)}>{valueFmt(s.values[s.values.length - 1]!)}</Txt>
            <line x1={inner.x} x2={inner.x + inner.w} y1={inner.y + inner.h} y2={inner.y + inner.h} stroke={tone.ink} strokeWidth={2} />
            <line x1={inner.x} x2={inner.x + inner.w} y1={inner.sy(top / 2)} y2={inner.sy(top / 2)} stroke={tone.grid} strokeWidth={2} />
            {series.filter((o) => o !== s).map((o) => <Line key={o.label} pts={toPts(o.values)} color={tone.context} w={2.5} opacity={0.55} />)}
            <Line pts={slicePoly(own, p)} color={col} w={s.hi ? 6 : 4.5} />
            {p >= 1 ? <circle cx={head[0]} cy={head[1]} r={8} fill={col} /> : null}
          </g>
        );
      })}
    </g>
  );
};

// Sequential scale for the heatmap: warm paper grey through apricot to the highlight and a burnt end.
export const heatColor = (k: number) => interpolateColors(clamp01(k), [0, 0.35, 0.7, 1], ["#EFEBE3", "#F5C2A6", "#E4572E", "#9C2F14"]);

export type HeatmapProps = {
  x: number;
  y: number;
  cell: [number, number];
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  at: number;
  // Only every n-th column label is printed, so labels stay at 28 px or more.
  colEvery?: number;
  legend?: [string, string];
};

// Cells reveal along the diagonal one frame apart, each settling from a small grey tile into its colour; a gradient legend reads low to high.
export const Heatmap: FC<HeatmapProps> = ({ x, y, cell, matrix, rowLabels, colLabels, at, colEvery = 2, legend = ["fewer", "more"] }) => {
  const { t } = useTime();
  const tone = useTone();
  const [cw, ch] = cell;
  const max = Math.max(...matrix.flat());
  const cols = matrix[0]?.length ?? 0;
  const lab = ramp(t, at, 10 * F);
  const lgY = y + matrix.length * ch + 90;
  return (
    <g>
      <defs>
        <linearGradient id="dsc-heat" x1="0" x2="1" y1="0" y2="0">
          {[0, 0.35, 0.7, 1].map((k) => <stop key={k} offset={k} stopColor={heatColor(k)} />)}
        </linearGradient>
      </defs>
      {rowLabels.map((l, r) => <Txt key={l} x={x - 22} y={y + r * ch + ch / 2 + 10} anchor="end" size={SIZE.small} color={tone.muted} opacity={lab}>{l}</Txt>)}
      {colLabels.map((l, c) => (c % colEvery === 0 ? <Txt key={l} x={x + c * cw + cw / 2} y={y - 22} anchor="middle" size={SIZE.small} color={tone.muted} opacity={lab}>{l}</Txt> : null))}
      {matrix.map((row, r) =>
        row.map((v, c) => {
          const p = ramp(t, at + 8 * F + (r + c) * F, 10 * F, OUT3);
          if (p <= 0) return null;
          const k = v / max;
          const s = 0.5 + 0.5 * p;
          const cx = x + c * cw + cw / 2;
          const cy = y + r * ch + ch / 2;
          return <rect key={`${r}-${c}`} x={cx - ((cw - 4) * s) / 2} y={cy - ((ch - 4) * s) / 2} width={(cw - 4) * s} height={(ch - 4) * s} rx={3} fill={interpolateColors(p, [0, 1], [tone.grid, heatColor(k)])} />;
        }),
      )}
      <g opacity={ramp(t, at + (matrix.length + cols) * F + 6 * F, 10 * F)}>
        <Txt x={x} y={lgY + 10} size={SIZE.small} color={tone.muted}>{legend[0]}</Txt>
        <rect x={x + 110} y={lgY - 12} width={360} height={24} fill="url(#dsc-heat)" />
        <Txt x={x + 490} y={lgY + 10} size={SIZE.small} color={tone.muted}>{legend[1]}</Txt>
      </g>
    </g>
  );
};

