// Flat vector scene pieces: split compare with a sweeping divider, the lighting process chain, chapter card with circle wipe, zoom-through, scale compare and the "think of it as" metaphor morph.
import { type FC, type ReactNode } from "react";
import { AbsoluteFill, interpolate, interpolateColors } from "remotion";
import { H, W } from "../../core/video";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { camAt, type CamKey } from "../../core/camera";
import { AMBER, CORAL, HEAD, INK, LABEL, MIST, MUTED, NIGHT, TEAL, VIOLET, shade, tint } from "./theme";
import { At, GlowOrb, Pill, Stage, exitOut, popIn, pulse, wobble } from "./primitives";
import { ICONS, ShapeAssembler, type IconName } from "./figures";
import { SHAPES, align, lerpPts, polyD, resample, type P, type ShapeName } from "./geometry";

// ---------- split compare ----------
export type Side = { kicker: string; title: string; color: string; art: ReactNode };

// Before/after: "before" fills the frame, then a glowing divider sweeps in from the right to the centre and the "after" side is revealed in its own tint.
export const SplitCompare: FC<{ left: Side; right: Side; at: number; sweepAt: number; sweep?: number }> = ({ left, right, at, sweepAt, sweep = 0.8 }) => {
  const { t } = useTime();
  const e = ramp(t, sweepAt, sweep, INOUT);
  const divX = W + 40 - (W / 2 + 40) * e;
  // Before the sweep the left side owns the whole frame, so its content starts centred and slides to its half.
  const lx = interpolate(e, [0, 1], [W / 2, W / 4]);
  const handle = popIn(t, sweepAt + sweep * 0.7);
  const side = (s: Side, cx: number, cueAt: number) => (
    <>
      <div style={{ position: "absolute", left: cx - 440, width: 880, top: 140, textAlign: "center" }}>
        <div style={{ display: "inline-block", fontFamily: LABEL, fontWeight: 600, fontSize: 30, letterSpacing: "0.16em", color: NIGHT, background: s.color, borderRadius: 999, padding: "8px 24px", transform: `scale(${popIn(t, cueAt)})` }}>{s.kicker}</div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 76, color: INK, marginTop: 22, lineHeight: 1.05, opacity: ramp(t, cueAt + 0.1, 0.3), transform: `translateY(${(1 - ramp(t, cueAt + 0.1, 0.4, OUT)) * 30}px)` }}>{s.title}</div>
      </div>
      <Stage>
        <g transform={`translate(${cx} 0)`}>{s.art}</g>
      </Stage>
    </>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${Math.max(0, W - divX)}px 0 0)` }}>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${left.color}1f, ${left.color}08)` }} />
        {side(left, lx, at)}
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${divX}px)` }}>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${right.color}24, ${right.color}0a)` }} />
        {side(right, (W * 3) / 4, sweepAt + sweep * 0.6)}
      </AbsoluteFill>
      <Stage>
        <defs>
          <linearGradient id="fve-div" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={INK} stopOpacity={0} />
            <stop offset="0.2" stopColor={INK} stopOpacity={0.9} />
            <stop offset="0.8" stopColor={INK} stopOpacity={0.9} />
            <stop offset="1" stopColor={INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={divX - 18} y={0} width={36} height={H} fill={INK} opacity={0.06} />
        <rect x={divX - 3} y={0} width={6} height={H} fill="url(#fve-div)" />
        <g transform={`translate(${divX} 540) scale(${handle})`}>
          <circle r={50} fill={INK} />
          <path d="M-14 -16 L-30 0 L-14 16Z M14 -16 L30 0 L14 16Z" fill={NIGHT} />
        </g>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- process chain ----------
export type ChainStep = { label: string; t: number; icon: IconName; color?: string };

const qPoint = (a: P, c: P, b: P, u: number): P => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];

// Nodes joined by arcing arrows: each arrow draws on, a glowing packet rides it, and the node lights up (muted → accent, pulse, glow doubles) on its spoken step.
export const ProcessChain: FC<{ steps: ChainStep[]; y?: number; x0?: number; x1?: number; r?: number }> = ({ steps, y = 470, x0 = 300, x1 = 1620, r = 92 }) => {
  const { t } = useTime();
  const colors = [TEAL, VIOLET, CORAL, AMBER, TEAL];
  const xs = steps.map((_, i) => x0 + ((x1 - x0) * i) / Math.max(1, steps.length - 1));
  return (
    <>
      <Stage>
        {steps.slice(1).map((s, i) => {
          const a: P = [xs[i]! + r + 18, y];
          const b: P = [xs[i + 1]! - r - 30, y];
          const c: P = [(a[0] + b[0]) / 2, y - 110];
          const start = s.t - 0.7;
          const draw = ramp(t, start, 0.45, OUT);
          const ride = ramp(t, start + 0.15, 0.55, INOUT);
          const len = 520;
          const lit = colors[(i + 1) % colors.length]!;
          const pkt = qPoint(a, c, b, ride);
          const tip = qPoint(a, c, b, 0.97);
          const ang = (Math.atan2(b[1] - tip[1], b[0] - tip[0]) * 180) / Math.PI;
          return draw > 0 ? (
            <g key={i}>
              <path d={`M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} fill="none" stroke={MIST} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - draw)} opacity={0.55} />
              <g transform={`translate(${b[0] + 8} ${b[1]}) rotate(${ang}) scale(${popIn(t, start + 0.4, 0.3)})`}>
                <path d="M-6 -16 L18 0 L-6 16 Q0 0 -6 -16Z" fill={MIST} opacity={0.8} />
              </g>
              {ride > 0 && ride < 1 && <GlowOrb x={pkt[0]} y={pkt[1]} r={14} color={lit} shadow={false} glow={1.6} />}
            </g>
          ) : null;
        })}
        {steps.map((s, i) => {
          const c = s.color ?? colors[i % colors.length]!;
          const lit = ramp(t, s.t, 0.25);
          const col = interpolateColors(lit, [0, 1], [MUTED, c]);
          return (
            <g key={i}>
              <GlowOrb x={xs[i]!} y={y} r={r} color={col} p={popIn(t, Math.min(steps[0]!.t - 0.4 + i * 0.1, s.t - 0.4))} glow={0.3 + lit * 0.9} emphAt={s.t} seed={i + 3} />
              <At x={xs[i]!} y={y} s={0.42 * pulse(t, s.t)} o={0.45 + 0.55 * lit}>
                <ShapeAssembler parts={ICONS[s.icon](lit > 0.5 ? shade(c, 0.45) : shade(MUTED, 0.3))} at={Math.min(steps[0]!.t - 0.3 + i * 0.1, s.t - 0.3)} stagger={0.03} />
              </At>
            </g>
          );
        })}
      </Stage>
      {steps.map((s, i) => {
        const lit = ramp(t, s.t, 0.3);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i]! - 200, width: 400, top: y + r + 54, textAlign: "center", fontFamily: LABEL, fontWeight: 600, fontSize: 42, color: interpolateColors(lit, [0, 1], [MIST, INK]), opacity: 0.45 + 0.55 * lit, transform: `scale(${1 + 0.06 * (pulse(t, s.t) - 1) / 0.08})` }}>
            {s.label}
          </div>
        );
      })}
    </>
  );
};

// ---------- chapter card + circle wipe ----------
// Chapter card: a numbered orb and the title slide in from the left on back-out, the title's bar grows under it.
export const ChapterCard: FC<{ n: number; title: string; kicker?: string; at: number; color?: string; out?: number; y?: number }> = ({ n, title, kicker = "CHAPTER", at, color = AMBER, out, y = 540 }) => {
  const { t } = useTime();
  const k = interpolate(t, [at, at + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - (1 - x) ** 3 * (1 - 2.2 * x * (1 - x)) });
  const k2 = ramp(t, at + 0.13, 0.6, OUT);
  const ex = exitOut(t, out);
  const bar = ramp(t, at + 0.45, 0.33, OUT);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: ex.o }}>
      <Stage>
        <GlowOrb x={-200 + k * 620} y={y} r={150} color={color} p={1} seed={7} emphAt={at + 0.6} />
        <text x={-200 + k * 620} y={y + 4} textAnchor="middle" dominantBaseline="middle" fontFamily={HEAD} fontWeight={700} fontSize={170} fill={NIGHT} opacity={0.85} transform={`rotate(${wobble(t, at + 0.5, 5)} ${-200 + k * 620} ${y})`}>
          {n}
        </text>
      </Stage>
      <div style={{ position: "absolute", left: 640, top: y, transform: `translate(${(1 - k2) * -120}px, -50%)`, opacity: clamp01(k2 * 2) }}>
        <div style={{ fontFamily: LABEL, fontWeight: 600, fontSize: 34, letterSpacing: "0.2em", color: tint(color, 0.3) }}>
          {kicker} {String(n).padStart(2, "0")}
        </div>
        <div style={{ position: "relative", display: "inline-block", fontFamily: HEAD, fontWeight: 700, fontSize: 118, color: INK, lineHeight: 1.08, marginTop: 6 }}>
          {title}
          <div style={{ position: "absolute", left: 0, bottom: -10, width: "40%", height: 12, borderRadius: 6, background: color, transform: `scaleX(${bar})`, transformOrigin: "0% 50%", boxShadow: `0 0 24px ${color}` }} />
        </div>
      </div>
    </div>
  );
};

// A circle grows from (x, y) until it covers the frame (20 frames, in-out-cubic); whatever is inside it becomes the next scene.
// A glowing rim rides the edge so the growing circle reads as the orb itself expanding.
export const CircleWipe: FC<{ x: number; y: number; at: number; dur?: number; r0?: number; rim?: string; children: ReactNode }> = ({ x, y, at, dur = 0.67, r0 = 0, rim = AMBER, children }) => {
  const { t } = useTime();
  const e = ramp(t, at, dur, INOUT);
  if (e <= 0) return null;
  const cover = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 20;
  const r = r0 + (cover - r0) * e;
  return (
    <>
      <AbsoluteFill style={{ clipPath: `circle(${r}px at ${x}px ${y}px)` }}>{children}</AbsoluteFill>
      {e < 1 && (
        <Stage>
          <circle cx={x} cy={y} r={r} fill="none" stroke={rim} strokeWidth={28} opacity={0.25 * (1 - e)} />
          <circle cx={x} cy={y} r={r} fill="none" stroke={rim} strokeWidth={8} opacity={0.9 * (1 - e * 0.6)} />
        </Stage>
      )}
    </>
  );
};

// ---------- zoom-through ----------
// The camera dives into a small element (x, y, r) until it fills the frame; the next scene is already living inside it and takes over as the background.
export const ZoomThrough: FC<{ x: number; y: number; r: number; at: number; dur?: number; from: ReactNode; to: ReactNode }> = ({ x, y, r, at, dur = 0.9, from, to }) => {
  const { t } = useTime();
  const e = ramp(t, at, dur, (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2));
  const cover = Math.hypot(W / 2, H / 2) + 30;
  // Scale grows exponentially so the dive feels like constant speed through space.
  const s = Math.exp(Math.log(cover / r) * e);
  const cx = x + (W / 2 - x) * e;
  const cy = y + (H / 2 - y) * e;
  const inside = ramp(t, at + dur * 0.35, dur * 0.5);
  return (
    <AbsoluteFill>
      {e < 1 && (
        <AbsoluteFill style={{ transform: `translate(${cx - x}px, ${cy - y}px) scale(${s})`, transformOrigin: `${x}px ${y}px`, filter: e > 0 && e < 1 ? `blur(${Math.sin(e * Math.PI) * 3}px)` : undefined }}>{from}</AbsoluteFill>
      )}
      {inside > 0 && (
        <AbsoluteFill style={{ clipPath: e < 1 ? `circle(${r * s}px at ${cx}px ${cy}px)` : undefined, opacity: inside }}>
          <AbsoluteFill style={{ transform: `scale(${0.6 + 0.4 * e})`, transformOrigin: `${cx}px ${cy}px` }}>{to}</AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------- scale compare ----------
// Starts tight on a tiny object, then pulls out to reveal the huge one beside it; scale contrast is the story.
export const ScaleCompare: FC<{ small: ReactNode; big: ReactNode; smallAt: [number, number]; at: number; dur?: number; zoom?: number; ground?: number; children?: ReactNode }> = ({ small, big, smallAt, at, dur = 1.6, zoom = 3.4, ground = 860, children }) => {
  const { t } = useTime();
  const keys: CamKey[] = [
    { t: 0, x: smallAt[0], y: smallAt[1], s: zoom },
    { t: at, x: W / 2, y: H / 2, s: 1, d: dur },
  ];
  return (
    <Stage>
      <g transform={camAt(t, keys)}>
        <rect x={-400} y={ground} width={W + 800} height={4} rx={2} fill={MIST} opacity={0.35} />
        <rect x={-400} y={ground + 4} width={W + 800} height={600} fill={NIGHT} opacity={0.18} />
        {big}
        {small}
        {children}
      </g>
    </Stage>
  );
};

// ---------- metaphor morph ----------
const outlineOf = (s: ShapeName | P[]) => resample(typeof s === "string" ? SHAPES[s]() : s);

// "Think of it as…": one flat shape morphs into another (equal point counts, aligned starts), the colour shifts, it squashes mid-morph and each name swaps as its pill.
export const MetaphorMorph: FC<{ from: ShapeName | P[]; to: ShapeName | P[]; x?: number; y?: number; s?: number; appearAt: number; at: number; dur?: number; fromColor?: string; toColor?: string; fromLabel?: string; toLabel?: string; inside?: ReactNode }> = ({
  from,
  to,
  x = 960,
  y = 470,
  s = 1,
  appearAt,
  at,
  dur = 0.8,
  fromColor = TEAL,
  toColor = VIOLET,
  fromLabel,
  toLabel,
  inside,
}) => {
  const { t } = useTime();
  const a = outlineOf(from);
  const b = align(a, outlineOf(to));
  const m = ramp(t, at, dur, INOUT);
  const pts = lerpPts(a, b, m);
  const d = polyD(pts);
  const col = interpolateColors(m, [0, 1], [fromColor, toColor]);
  const k = popIn(t, appearAt, 0.6);
  const mid = Math.sin(m * Math.PI);
  const sx = 1 + 0.07 * mid + wobble(t, at + dur, 0.05, 3, 6);
  const sy = 1 - 0.07 * mid - wobble(t, at + dur, 0.05, 3, 6);
  const fl = 0.85 + 0.15 * Math.sin(t * Math.PI);
  const shadowSteps = 14;
  if (k <= 0) return null;
  return (
    <>
      <Stage>
        <defs>
          <linearGradient id="fve-morph" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tint(col, 0.22)} />
            <stop offset="1" stopColor={shade(col, 0.25)} />
          </linearGradient>
          <filter id="fve-morph-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={40} />
          </filter>
        </defs>
        <g transform={`translate(${x} ${y}) scale(${s * k * sx} ${s * k * sy})`}>
          {Array.from({ length: shadowSteps }, (_, i) => (
            <path key={i} d={d} transform={`translate(${(i + 1) * 14} ${(i + 1) * 14})`} fill={NIGHT} opacity={0.05 * (1 - i / shadowSteps)} />
          ))}
          <path d={d} fill={col} opacity={0.38 * fl} filter="url(#fve-morph-glow)" />
          <path d={d} fill="url(#fve-morph)" />
          <path d={d} fill="#FFFFFF" opacity={0.1} transform="translate(-10 -12) scale(0.86)" />
          {inside && <g opacity={ramp(t, at + dur * 0.8, 0.3)}>{inside}</g>}
        </g>
      </Stage>
      {fromLabel && <Pill x={x} y={y + 300 * s} text={fromLabel} at={appearAt + 0.3} out={at - 0.1} color={fromColor} size={42} />}
      {toLabel && <Pill x={x} y={y + 300 * s} text={toLabel} at={at + dur * 0.75} color={toColor} size={42} />}
    </>
  );
};
