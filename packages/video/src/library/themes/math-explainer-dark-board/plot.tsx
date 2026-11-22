// Coordinate pieces: axes, function plots drawn at constant speed, a value-tracker dot, the 3b1b linear-transformation plane and a counting dot grid.
import type { FC, ReactNode } from "react";
import { interpolateColors, Easing } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { Arrow, Create, Dot, Txt } from "./draw";
import { Eq } from "./eq";
import { BLUE, BOARD, GREEN, INK, MUTED, RED, SMOOTH, UNIT, YELLOW } from "./theme";

const LINEAR = Easing.linear;

export type AxesSpec = { x: number; y: number; w: number; h: number; xr: [number, number]; yr: [number, number] };
export const toPx = (A: AxesSpec, vx: number, vy: number): [number, number] => [A.x + ((vx - A.xr[0]) / (A.xr[1] - A.xr[0])) * A.w, A.y - ((vy - A.yr[0]) / (A.yr[1] - A.yr[0])) * A.h];

// Axes drawn at constant speed with arrow tips, tick marks and tick numbers fading in after.
export const Axes: FC<{ A: AxesSpec; at: number; xTicks?: number[]; yTicks?: number[]; xLabel?: string; yLabel?: string; dur?: number }> = ({ A, at, xTicks = [], yTicks = [], xLabel, yLabel, dur = 0.8 }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, SMOOTH);
  return (
    <g>
      <Arrow x1={A.x - 10} y1={A.y} x2={A.x + A.w + 40} y2={A.y} p={p} w={3.5} tip={20} color={INK} />
      <Arrow x1={A.x} y1={A.y + 10} x2={A.x} y2={A.y - A.h - 40} p={p} w={3.5} tip={20} color={INK} />
      {xTicks.map((v, i) => {
        const [x] = toPx(A, v, 0);
        const o = ramp(t, at + dur * 0.6 + i * 0.03, 0.3);
        return (
          <g key={`x${v}`} opacity={o}>
            <line x1={x} y1={A.y - 10} x2={x} y2={A.y + 10} stroke={INK} strokeWidth={3} />
            <Txt x={x} y={A.y + 52} text={String(v)} size={30} font="rm" color={MUTED} anchor="middle" at={-1} />
          </g>
        );
      })}
      {yTicks.map((v, i) => {
        const [, y] = toPx(A, 0, v);
        const o = ramp(t, at + dur * 0.6 + i * 0.03, 0.3);
        return (
          <g key={`y${v}`} opacity={o}>
            <line x1={A.x - 10} y1={y} x2={A.x + 10} y2={y} stroke={INK} strokeWidth={3} />
            <Txt x={A.x - 24} y={y + 10} text={String(v)} size={30} font="rm" color={MUTED} anchor="end" at={-1} />
          </g>
        );
      })}
      {xLabel && <Eq tex={xLabel} x={A.x + A.w + 40} y={A.y + 62} size={46} anchor="middle" at={at + dur} fadeIn />}
      {yLabel && <Eq tex={yLabel} x={A.x + 30} y={A.y - A.h - 14} size={36} anchor="start" at={at + dur} fadeIn color={MUTED} />}
    </g>
  );
};

// Samples a function inside the axes; stops where it leaves the top so steep curves exit cleanly.
export const plotPts = (A: AxesSpec, fn: (x: number) => number, from = A.xr[0], to = A.xr[1], n = 220) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const vx = from + ((to - from) * i) / n;
    let vy = fn(vx);
    if (!Number.isFinite(vy)) continue;
    if (vy > A.yr[1]) {
      const prev = pts[pts.length - 1];
      if (prev) {
        const lo = vx - (to - from) / n;
        let a = lo, b = vx;
        for (let k = 0; k < 20; k++) {
          const m = (a + b) / 2;
          if (fn(m) > A.yr[1]) b = m;
          else a = m;
        }
        pts.push(toPx(A, a, A.yr[1]));
      }
      break;
    }
    vy = Math.max(A.yr[0], vy);
    pts.push(toPx(A, vx, vy));
  }
  return pts;
};
const ptsD = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

// A function graph drawn at constant speed (linear rate, as Manim draws axes and graphs).
export const Plot: FC<{ A: AxesSpec; fn: (x: number) => number; at: number; dur?: number; color?: string; w?: number; from?: number; to?: number; out?: number }> = ({ A, fn, at, dur = 1, color = BLUE, w = 4.5, from, to, out }) => {
  const { t } = useTime();
  return <Create d={ptsD(plotPts(A, fn, from, to))} p={ramp(t, at, dur, LINEAR)} color={color} w={w} out={out} />;
};

export const plotEnd = (A: AxesSpec, fn: (x: number) => number) => {
  const pts = plotPts(A, fn);
  return pts[pts.length - 1]!;
};

// ValueTracker made visible: a dashed drop line and a dot riding each curve at x = value.
export const TrackerLine: FC<{ A: AxesSpec; value: number; fns: { fn: (x: number) => number; color: string }[]; opacity?: number }> = ({ A, value, fns, opacity = 1 }) => {
  if (opacity <= 0) return null;
  const [x] = toPx(A, value, 0);
  return (
    <g opacity={opacity}>
      <line x1={x} y1={A.y} x2={x} y2={A.y - A.h} stroke={INK} strokeOpacity={0.5} strokeWidth={2.5} strokeDasharray="10 10" />
      {fns.map(({ fn, color }, i) => {
        const v = fn(value);
        if (v > A.yr[1] || v < A.yr[0]) return null;
        const [, y] = toPx(A, value, v);
        return <Dot key={i} x={x} y={y} r={10} color={color} glow={1} />;
      })}
    </g>
  );
};

// ---------- the linear-transformation plane ----------
export type Mat2 = [[number, number], [number, number]];

// The plane under a matrix eased in from the identity: grid, axes, basis vectors î (green) and ĵ (red), optional vectors.
export const LinearPlane: FC<{
  M: Mat2; at: number; apply: number; dur?: number; ox?: number; oy?: number; unit?: number; vectors?: { v: [number, number]; color: string; label?: string }[]; extent?: number; children?: ReactNode;
}> = ({ M, at, apply, dur = 2, ox = W / 2, oy = H / 2, unit = UNIT, vectors = [], extent = 16, children }) => {
  const { t } = useTime();
  const p = ramp(t, apply, dur, SMOOTH);
  const m = [[1 + (M[0][0] - 1) * p, M[0][1] * p], [M[1][0] * p, 1 + (M[1][1] - 1) * p]];
  const tp = (x: number, y: number): [number, number] => [ox + (m[0]![0]! * x + m[0]![1]! * y) * unit, oy - (m[1]![0]! * x + m[1]![1]! * y) * unit];
  const E = extent;
  const lines: { a: [number, number]; b: [number, number]; kind: "axis" | "main" | "half"; d: number }[] = [];
  for (let k = -E * 2; k <= E * 2; k++) {
    const v = k / 2;
    const kind = k === 0 ? "axis" : k % 2 === 0 ? "main" : "half";
    lines.push({ a: tp(v, -E), b: tp(v, E), kind, d: Math.abs(v) });
    lines.push({ a: tp(-E, v), b: tp(E, v), kind, d: Math.abs(v) });
  }
  const basis = [
    { v: [1, 0] as [number, number], color: GREEN, label: "\\mathrm{î}" },
    { v: [0, 1] as [number, number], color: RED, label: "\\mathrm{ĵ}" },
  ];
  const all = [...vectors, ...basis];
  return (
    <g>
      {lines.map((l, i) => {
        // Lines draw from the centre outward, nearest first.
        const lp = ramp(t, at + Math.min(l.d, 8) * 0.06, 0.7, SMOOTH);
        if (lp <= 0) return null;
        const mx = (l.a[0] + l.b[0]) / 2, my = (l.a[1] + l.b[1]) / 2;
        const ax = mx + (l.a[0] - mx) * lp, ay = my + (l.a[1] - my) * lp, bx = mx + (l.b[0] - mx) * lp, by = my + (l.b[1] - my) * lp;
        const style = l.kind === "axis" ? { stroke: INK, w: 3, o: 0.9 } : l.kind === "main" ? { stroke: BLUE, w: 2.2, o: 0.75 } : { stroke: BLUE, w: 1.2, o: 0.28 };
        return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={style.stroke} strokeWidth={style.w} strokeOpacity={style.o} />;
      })}
      {children}
      {all.map((b, i) => {
        const g = ramp(t, at + 0.9 + i * 0.15, 0.5, SMOOTH);
        const [x2, y2] = tp(b.v[0], b.v[1]);
        const len = Math.hypot(x2 - ox, y2 - oy) || 1;
        const lx = x2 + ((x2 - ox) / len) * 44, ly = y2 + ((y2 - oy) / len) * 44 + 16;
        return (
          <g key={i}>
            <Arrow x1={ox} y1={oy} x2={x2} y2={y2} p={g} color={b.color} w={6} tip={26} />
            {b.label && <Eq tex={b.label} x={lx} y={ly} size={54} color={b.color} at={at + 1.2 + i * 0.15} fadeIn />}
          </g>
        );
      })}
      <circle cx={ox} cy={oy} r={7} fill={INK} opacity={ramp(t, at + 0.6, 0.3)} />
    </g>
  );
};

// A plate under labels that sit on the plane, like Manim's background rectangle.
export const Plate: FC<{ x: number; y: number; w: number; h: number; at: number }> = ({ x, y, w, h, at }) => {
  const { t } = useTime();
  return <rect x={x} y={y} width={w} height={h} fill={BOARD} fillOpacity={0.9 * ramp(t, at, 0.4)} />;
};

// ---------- dot grid for counting ----------
export const DotGrid: FC<{ x: number; y: number; rows: number; cols: number; gap?: number; r?: number; at: number; dur?: number; color?: string; hi?: (i: number, j: number) => boolean; hiAt?: number; hiColor?: string; dimOthers?: boolean }> = ({ x, y, rows, cols, gap = 56, r = 13, at, dur = 0.9, color = BLUE, hi, hiAt = 1e9, hiColor = YELLOW, dimOthers }) => {
  const { t } = useTime();
  const n = rows * cols;
  const h = ramp(t, hiAt, 0.4, SMOOTH);
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const i = Math.floor(k / cols), j = k % cols;
        // Stagger along the anti-diagonal, so the grid fills like a wave from the corner.
        const s = clamp01(ramp(t, at + ((i + j) / Math.max(1, rows + cols - 2)) * dur, 0.3, Easing.out(Easing.back(2))));
        const isHi = hi?.(i, j) ?? false;
        const col = isHi ? interpolateColors(h, [0, 1], [color, hiColor]) : color;
        const o = !isHi && dimOthers ? 1 - 0.6 * h : 1;
        return s > 0 ? <circle key={k} cx={x + j * gap} cy={y + i * gap} r={r * s} fill={col} opacity={o} /> : null;
      })}
    </g>
  );
};
