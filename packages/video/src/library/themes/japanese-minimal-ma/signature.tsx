// Ma signature moments: the hanging scroll that unrolls a quote, the ensō cycle diagram, and the kasumi mist dissolve between scenes.
import { useId, type FC, type ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { clamp01, ramp } from "../../core/time";
import { W } from "../../core/video";
import { GREY, INDIGO, MIST, SHU, SLOW, SUMI, SUMI_SOFT } from "./theme";
import { ensoCtrl } from "./geometry";
import { Brush, Caps, Fill, Hanko, InkDot, Stage, Text, VerticalText, rise, sink, useMa } from "./primitives";

// ---------- hanging scroll ----------
export type HangingScrollProps = { lines: string[]; by?: string; meta?: string; at?: number; until?: number; x?: number; top?: number; width?: number; height?: number; seal?: boolean };

// A kakejiku hangs from its nail and unrolls downward; the quote appears as the paper passes it, and the seal is pressed last, low on the right.
export const HangingScroll: FC<HangingScrollProps> = ({ lines, by, meta, at = 0, until, x = 1240, top = 96, width = 560, height = 800, seal = true }) => {
  const { t } = useMa();
  const appear = rise(t, at - 0.6, 0.8) * (1 - sink(t, until));
  if (appear <= 0) return null;
  const e = ramp(t, at, 2.4, SLOW);
  const rodY = top + 46;
  const mTop = rodY + 7;
  const h = 34 + (height - 34) * e;
  const L = x - width / 2;
  const inner = { x: L + 46, y: mTop + 80, w: width - 92, h: height - 80 - 112 };
  const textTop = inner.y + 78;
  const sway = Math.sin((t - at) * 0.55) * 0.28;
  const lineAt = (i: number) => at + 1.0 + i * 0.4;
  const byAt = lineAt(lines.length) + 0.2;
  const sealAt = byAt + 0.9;
  const rod = (y: number, thick: number) => (
    <g>
      <rect x={L - 22} y={y} width={width + 44} height={thick} rx={thick / 2} fill={SUMI} />
      <circle cx={L - 24} cy={y + thick / 2} r={thick * 0.75} fill={SUMI} />
      <circle cx={L + width + 24} cy={y + thick / 2} r={thick * 0.75} fill={SUMI} />
    </g>
  );
  return (
    <Fill style={{ opacity: appear, transform: `rotate(${sway}deg)`, transformOrigin: `${x}px ${top}px` }}>
      <Stage>
        <path d={`M${L + width * 0.2},${rodY + 2} L${x},${top} L${L + width * 0.8},${rodY + 2}`} fill="none" stroke={SUMI_SOFT} strokeWidth={1.6} />
        <circle cx={x} cy={top} r={4} fill={SUMI} />
        <svg x={0} y={mTop} width={W} height={h} overflow="hidden">
          <g transform={`translate(0 ${-mTop})`}>
            <rect x={L} y={mTop} width={width} height={height} fill="#E6DFD0" />
            <rect x={L} y={mTop} width={width} height={height} fill="none" stroke="#CFC6B4" strokeWidth={1.2} />
            <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="#FBFAF6" />
            <rect x={inner.x} y={inner.y} width={inner.w} height={12} fill={INDIGO} />
            <rect x={inner.x} y={inner.y + inner.h - 8} width={inner.w} height={8} fill={INDIGO} />
            <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="none" stroke="#D6CFC0" strokeWidth={1} />
          </g>
        </svg>
        {rod(rodY - 6, 12)}
        {rod(mTop + h - 4, 16)}
      </Stage>
      <div style={{ position: "absolute", left: 0, top: mTop, width: W, height: Math.max(0, h - 16), overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: -mTop, width: W, height: 1080 }}>
          {lines.map((l, i) => (
            <Text key={i} x={inner.x + 48} y={textTop + i * 70} size={58} italic at={lineAt(i)} until={until}>
              {l}
            </Text>
          ))}
          {by && (
            <Caps x={inner.x + 50} y={textTop + lines.length * 70 + 56} at={byAt} until={until} tracking="0.14em">
              {by}
            </Caps>
          )}
          {meta && (
            <Caps x={inner.x + 50} y={textTop + lines.length * 70 + 100} at={byAt + 0.3} until={until} tracking="0.14em" color={SUMI_SOFT}>
              {meta}
            </Caps>
          )}
        </div>
      </div>
      {seal && (
        <Stage>
          <Hanko x={inner.x + inner.w - 74} y={inner.y + inner.h - 84} size={60} at={sealAt} until={until} />
        </Stage>
      )}
    </Fill>
  );
};

// ---------- ensō cycle ----------
export type EnsoStep = { label: string; at: number };

// A cycle or loop as a single ensō: one breath of the brush, then each stage of the loop lands round it on its word; the last carries the vermillion.
export const EnsoCycle: FC<{ steps: EnsoStep[]; at?: number; title?: string; cx?: number; cy?: number; r?: number; until?: number; accent?: boolean }> = ({ steps, at = 0, title, cx = 1160, cy = 540, r = 280, until, accent = true }) => {
  const { t } = useMa();
  const start = 2.2;
  const sweep = 5.75;
  const n = steps.length;
  return (
    <Fill>
      <Stage>
        <Brush ctrl={ensoCtrl(cx, cy, r, 12, start, sweep)} width={r * 0.17} at={at} d={2.2} until={until} seed={12} tail={0.3} dry={0.62} />
        {steps.map((s, i) => {
          const a = start + (sweep * (i + 0.5)) / n;
          const last = i === n - 1;
          return <InkDot key={i} x={cx + Math.cos(a) * (r + 62)} y={cy + Math.sin(a) * (r + 62)} r={11} at={s.at} d={0.7} until={until} color={last && accent ? SHU : SUMI} seed={20 + i} />;
        })}
      </Stage>
      {steps.map((s, i) => {
        const a = start + (sweep * (i + 0.5)) / n;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const px = cx + c * (r + 96);
        const py = cy + sn * (r + 96);
        const align = c > 0.3 ? "left" : c < -0.3 ? "right" : "center";
        const y = sn < -0.6 ? py - 62 : sn > 0.6 ? py : py - 31;
        const next = steps[i + 1];
        const past = next ? ramp(t, next.at, 0.9) : 0;
        return (
          <Text key={i} x={px} y={y} size={50} align={align} at={s.at + 0.1} until={until} color={past > 0.5 ? SUMI_SOFT : SUMI} opacity={1 - 0.25 * past}>
            {s.label}
          </Text>
        );
      })}
      {title && <VerticalText x={300} y={200} columns={[title]} size={34} at={at + 0.4} until={until} />}
    </Fill>
  );
};

// ---------- kasumi mist dissolve ----------
const BANDS = [
  { y: 250, h: 120, w: 1500, from: -1300, to: 1500, delay: 0 },
  { y: 470, h: 160, w: 1800, from: 1900, to: -1500, delay: 0.15 },
  { y: 700, h: 130, w: 1400, from: -1500, to: 1300, delay: 0.3 },
  { y: 880, h: 100, w: 1100, from: 2000, to: -900, delay: 0.45 },
];

// Kasumi: the bands of mist that divide scenes on Japanese screens drift across while the old scene fades in place, a breath of empty paper, then the new one rises.
export const Kasumi: FC<{ at: number; from: ReactNode; to: ReactNode; d?: number }> = ({ at, from, to, d = 2.6 }) => {
  const { t } = useMa();
  const id = `k${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const outO = 1 - ramp(t, at, 0.8, Easing.inOut(Easing.quad));
  const inE = rise(t, at + 1.4, 1.2);
  return (
    <Fill>
      {outO > 0 && <Fill style={{ opacity: outO }}>{from}</Fill>}
      {inE > 0 && <Fill style={{ opacity: inE, transform: `translateY(${(1 - inE) * 6}px)` }}>{to}</Fill>}
      <Stage>
        <defs>
          <filter id={id} x="-10%" y="-80%" width="120%" height="260%">
            <feGaussianBlur stdDeviation={4} />
          </filter>
        </defs>
        <linearGradient id={`${id}g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={MIST} stopOpacity={0} />
          <stop offset="0.07" stopColor={MIST} stopOpacity={0.95} />
          <stop offset="0.93" stopColor={MIST} stopOpacity={0.95} />
          <stop offset="1" stopColor={MIST} stopOpacity={0} />
        </linearGradient>
        {BANDS.map((b, i) => {
          const a0 = at - 0.5 + b.delay;
          const k = clamp01((t - a0) / (d + 0.8));
          if (k <= 0 || k >= 1) return null;
          const o = Math.sin(k * Math.PI);
          const x = interpolate(k, [0, 1], [b.from, b.to], { easing: Easing.inOut(Easing.sin) });
          // Suyari-gasumi: each band is a long bar with a thinner bar stepped onto it, like the mist on a folding screen.
          const pieces = [
            { x, y: b.y, w: b.w, h: b.h },
            { x: x + b.w * (i % 2 ? 0.08 : 0.42), y: b.y - b.h * 0.42, w: b.w * 0.5, h: b.h * 0.62 },
            { x: x + b.w * (i % 2 ? 0.5 : 0.12), y: b.y + b.h * 0.7, w: b.w * 0.36, h: b.h * 0.5 },
          ];
          return (
            <g key={i} opacity={o}>
              {pieces.map((q, j) => (
                <rect key={j} x={q.x} y={q.y} width={q.w} height={q.h} rx={q.h / 2} fill={`url(#${id}g)`} filter={`url(#${id})`} />
              ))}
              <rect x={x + b.w * 0.15} y={b.y + b.h - 1} width={b.w * 0.7} height={1.4} fill={GREY} opacity={0.35} />
            </g>
          );
        })}
      </Stage>
    </Fill>
  );
};

