// Theme-free motivated transitions between two scenes (mask grow, whip, 3D card, light sweep, overlap, push-through, match cut, colour field), all pure functions of p.
import { useId, useMemo, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { getBoundingBox, getLength, getPointAtLength, interpolatePath, scalePath, translatePath } from "@remotion/paths";
import { clamp01, useTime, type Ease } from "./time";
import { revealStart } from "./cues";

// Every transition takes linear p (0..1) and applies its own default ease; pass `ease` to override.
// a is the outgoing scene, b the incoming one; both must be full-frame and keep moving by time on their own.
export type TransitionBase = { p: number; a: ReactNode; b: ReactNode; ease?: Ease };
export type Pt = { x: number; y: number };

// Default length, ease and reveal point (fraction of the duration at which b reads as arrived) per transition.
export const TRANSITION_SPECS = {
  maskGrow: { dur: 0.75, reveal: 0.5 },
  whip: { dur: 0.28, reveal: 0.5 },
  card3d: { dur: 0.75, reveal: 0.62 },
  lightSweep: { dur: 1.0, reveal: 0.5 },
  overlap: { dur: 0.9, reveal: 0.45 },
  pushThrough: { dur: 1.1, reveal: 0.5 },
  matchCut: { dur: 0.6, reveal: 0.5 },
  colourFlash: { dur: 0.8, reveal: 0.72 },
} as const;
export type TransitionKind = keyof typeof TRANSITION_SPECS;

// Start time so the transition's reveal point lands on a narration word or beat.
export const transitionStart = (cue: number, kind: TransitionKind, dur: number = TRANSITION_SPECS[kind].dur) => revealStart(cue, dur, TRANSITION_SPECS[kind].reveal);
// Linear p for a transition starting at `at` (seconds) lasting `dur`.
export const transitionP = (t: number, at: number, dur: number) => clamp01((t - at) / dur);
export const useTransitionP = (at: number, dur: number) => transitionP(useTime().t, at, dur);

const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const bump = (p: number) => Math.pow(Math.sin(Math.PI * clamp01(p)), 2);
const speed = (e: Ease, p: number, d = 0.004) => Math.abs(e(Math.min(1, p + d)) - e(Math.max(0, p - d))) / (2 * d);
// SVG ids from useId contain colons, which break url(#…) references.
const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

const Clip: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => <AbsoluteFill style={{ overflow: "hidden", ...style }}>{children}</AbsoluteFill>;

// A shape path recentred on (0,0) with its larger half-extent scaled to 100, plus the smallest boundary distance (so it can be grown until it covers).
const unitShape = (d: string) => {
  const bb = getBoundingBox(d);
  const half = Math.max(bb.width, bb.height) / 2 || 1;
  // scalePath scales about the bbox corner, not (0,0), so scale first and centre after.
  const scaled = scalePath(d, 100 / half, 100 / half);
  const sb = getBoundingBox(scaled);
  const centred = translatePath(scaled, -(sb.x1 + sb.x2) / 2, -(sb.y1 + sb.y2) / 2);
  const len = getLength(centred);
  let inner = 100;
  for (let i = 0; i < 180; i++) {
    const q = getPointAtLength(centred, (len * i) / 180);
    if (q) inner = Math.min(inner, Math.hypot(q.x, q.y));
  }
  return { d: centred, inner: Math.max(inner, 4) };
};

const coverRadius = (o: Pt, w: number, h: number) => Math.max(Math.hypot(o.x, o.y), Math.hypot(w - o.x, o.y), Math.hypot(o.x, h - o.y), Math.hypot(w - o.x, h - o.y));

// T5: b revealed by a shape growing from a motivated point in a (a dot, an icon, a logo hole). `shape` is "circle" or any SVG path d (e.g. makeStar(...).path).
export const MaskGrow: FC<TransitionBase & { origin?: Pt; shape?: "circle" | string; spin?: number; edge?: string; edgeWidth?: number; push?: number }> = ({
  p, a, b, ease = Easing.inOut(Easing.cubic), origin, shape = "circle", spin = 0, edge, edgeWidth = 10, push = 0.05,
}) => {
  const { width: w, height: h } = useVideoConfig();
  const o = origin ?? { x: w / 2, y: h / 2 };
  const id = useSvgId("mask");
  const unit = useMemo(() => (shape === "circle" ? null : unitShape(shape)), [shape]);
  if (p <= 0) return <Clip>{a}</Clip>;
  if (p >= 1) return <Clip>{b}</Clip>;
  const e = ease(p);
  const cover = coverRadius(o, w, h) * 1.03;
  // Scale grows with e² at the start so the shape is born small at its point, then sweeps the frame.
  const r = cover * (unit ? 100 / unit.inner : 1) * (0.15 * e + 0.85 * e * e);
  const s = r / 100;
  const rot = spin * e;
  const tf = `translate(${o.x} ${o.y}) rotate(${rot}) scale(${s})`;
  const aStyle: CSSProperties = { transform: `scale(${1 + push * e})`, transformOrigin: `${o.x}px ${o.y}px` };
  const bStyle: CSSProperties = { transform: `scale(${1 + push * 1.6 * (1 - e)})`, transformOrigin: `${o.x}px ${o.y}px` };
  return (
    <Clip>
      <AbsoluteFill style={aStyle}>{a}</AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {unit ? <path d={unit.d} transform={tf} /> : <circle cx={o.x} cy={o.y} r={r} />}
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>
        <AbsoluteFill style={bStyle}>{b}</AbsoluteFill>
      </AbsoluteFill>
      {edge ? (
        <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {unit ? (
            <path d={unit.d} transform={tf} fill="none" stroke={edge} strokeWidth={edgeWidth} vectorEffect="non-scaling-stroke" />
          ) : (
            <circle cx={o.x} cy={o.y} r={r} fill="none" stroke={edge} strokeWidth={edgeWidth} />
          )}
        </svg>
      ) : null}
    </Clip>
  );
};

export type Dir = "left" | "right" | "up" | "down";
const DIRV: Record<Dir, Pt> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

// T7: whip pan. Both scenes travel the same way as one strip; a directional SVG blur follows the speed and is unmounted at rest.
// `dir` is where the camera content moves (alternate it between uses); place between sentences.
export const Whip: FC<TransitionBase & { dir?: Dir; blur?: number; gap?: number }> = ({ p, a, b, ease = Easing.inOut(Easing.poly(4)), dir = "left", blur = 70, gap = 0 }) => {
  const { width: w, height: h } = useVideoConfig();
  const id = useSvgId("whip");
  if (p <= 0) return <Clip>{a}</Clip>;
  if (p >= 1) return <Clip>{b}</Clip>;
  const v = DIRV[dir];
  const span = (v.x ? w : h) + gap;
  const e = ease(p);
  const k = speed(ease, p) / speed(ease, 0.5);
  const along = blur * Math.min(1, k);
  const sx = v.x ? along : along * 0.08;
  const sy = v.x ? along * 0.08 : along;
  const off = (n: number) => `translate(${v.x * span * n}px, ${v.y * span * n}px)`;
  return (
    <Clip>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-70%" y="-70%" width="240%" height="240%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${sx} ${sy}`} edgeMode="duplicate" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: along > 0.5 ? `url(#${id})` : undefined }}>
        <AbsoluteFill style={{ transform: off(e) }}>{a}</AbsoluteFill>
        <AbsoluteFill style={{ transform: off(e - 1) }}>{b}</AbsoluteFill>
      </AbsoluteFill>
    </Clip>
  );
};

const WhipAtInner: FC<{ at: number; dur: number; a: ReactNode; b: ReactNode; dir: Dir; blur: number }> = ({ at, dur, ...rest }) => <Whip p={useTransitionP(at, dur)} {...rest} />;

// Whip timed by `at`/`dur` with real sub-frame motion blur from @remotion/motion-blur during the move (samples× render cost, only while moving).
export const WhipAt: FC<{ at: number; dur?: number; a: ReactNode; b: ReactNode; dir?: Dir; samples?: number; shutter?: number; blur?: number }> = ({
  at, dur = TRANSITION_SPECS.whip.dur, a, b, dir = "left", samples = 8, shutter = 220, blur = 28,
}) => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  const inner = <WhipAtInner at={at} dur={dur} a={a} b={b} dir={dir} blur={blur} />;
  const moving = t > at - 1 / fps && t < at + dur + 2 / fps;
  return moving ? <CameraMotionBlur samples={samples} shutterAngle={shutter}>{inner}</CameraMotionBlur> : inner;
};

// T2: a turns away into depth as a card while b comes forward from the other side and flattens into the frame.
export const Card3d: FC<TransitionBase & { bg?: string; dir?: 1 | -1; angle?: number; radius?: number; perspective?: number }> = ({
  p, a, b, ease, bg = "#0c0d10", dir = 1, angle = 38, radius = 40, perspective = 1400,
}) => {
  const { width: w } = useVideoConfig();
  if (p <= 0) return <Clip>{a}</Clip>;
  if (p >= 1) return <Clip>{b}</Clip>;
  const ea = (ease ?? Easing.inOut(Easing.cubic))(lin(p, 0, 0.62));
  const eb = (ease ?? Easing.out(Easing.cubic))(lin(p, 0.32, 1));
  const card = (r: number, shadow: number): CSSProperties => ({
    borderRadius: r,
    overflow: "hidden",
    boxShadow: `0 ${40 * shadow}px ${120 * shadow}px rgba(0,0,0,${0.55 * shadow})`,
    backfaceVisibility: "hidden",
  });
  const aT = `translateX(${-dir * w * 0.42 * ea}px) translateZ(${-520 * ea}px) rotateY(${dir * angle * 1.5 * ea}deg) scale(${1 - 0.12 * Math.min(1, ea * 2)})`;
  const bT = `translateX(${dir * w * 0.42 * (1 - eb)}px) translateZ(${-420 * (1 - eb)}px) rotateY(${-dir * angle * (1 - eb)}deg) scale(${0.88 + 0.12 * eb})`;
  return (
    <Clip style={{ backgroundColor: bg, perspective, perspectiveOrigin: "50% 50%" }}>
      <AbsoluteFill style={{ transform: aT, opacity: 1 - lin(ea, 0.7, 1), filter: `brightness(${1 - 0.45 * ea})`, ...card(radius * Math.min(1, ea * 3), Math.min(1, ea * 3)) }}>{a}</AbsoluteFill>
      {p > 0.32 ? (
        <AbsoluteFill style={{ transform: bT, opacity: lin(eb, 0, 0.3), filter: `brightness(${0.75 + 0.25 * eb})`, ...card(radius * (1 - lin(eb, 0.7, 1)), 1 - lin(eb, 0.6, 1)) }}>{b}</AbsoluteFill>
      ) : null}
    </Clip>
  );
};

// T4: a bright blurred light drifts across with a screen blend; the scenes cross under its peak so the cut is hidden in the glare.
export const LightSweep: FC<TransitionBase & { tint?: string; streak?: string; from?: Pt; to?: Pt; strength?: number }> = ({
  p, a, b, ease = Easing.inOut(Easing.sin), tint = "#fff1d8", streak = "#ffd9a8", from, to, strength = 1,
}) => {
  const { width: w, height: h } = useVideoConfig();
  if (p <= 0) return <Clip>{a}</Clip>;
  if (p >= 1) return <Clip>{b}</Clip>;
  const e = ease(p);
  const k = bump(p) * strength;
  const f = from ?? { x: -0.25 * w, y: -0.35 * h };
  const tt = to ?? { x: 1.2 * w, y: 1.2 * h };
  const cx = f.x + (tt.x - f.x) * e;
  const cy = f.y + (tt.y - f.y) * e;
  const mix = Easing.inOut(Easing.cubic)(lin(p, 0.4, 0.6));
  const expose: CSSProperties = { filter: `brightness(${1 + 0.8 * k}) saturate(${1 - 0.25 * k})` };
  const D = 2400;
  return (
    <Clip>
      <AbsoluteFill style={{ ...expose, opacity: 1 }}>{a}</AbsoluteFill>
      <AbsoluteFill style={{ ...expose, opacity: mix }}>{b}</AbsoluteFill>
      <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: cx - D / 2, top: cy - D / 2, width: D, height: D, borderRadius: "50%", background: `radial-gradient(circle, ${tint} 0%, ${tint}cc 22%, ${tint}00 62%)`, filter: "blur(64px)", opacity: Math.min(1, k * 1.15) }} />
        <div style={{ position: "absolute", left: -w * 0.5, top: cy - 60, width: w * 2, height: 120, background: `linear-gradient(90deg, ${streak}00, ${streak} 50%, ${streak}00)`, filter: "blur(28px)", opacity: 0.55 * k, transform: `rotate(${-18 + 10 * e}deg)` }} />
      </AbsoluteFill>
    </Clip>
  );
};

// T9: overlapping choreography, as style functions for elements the caller lays out itself.
// Exit is fast (Easing.in quad, up, blur), entry is slower and firm (poly-4 out, from below); the two windows overlap.
export const overlapOut = (p: number, i = 0, n = 1, { end = 0.42, stagger = 0.03, dy = -70, blur = 24 }: { end?: number; stagger?: number; dy?: number; blur?: number } = {}): CSSProperties => {
  const len = Math.max(0.05, end - stagger * (n - 1));
  const e = Easing.in(Easing.quad)(lin(p, i * stagger, i * stagger + len));
  return { opacity: 1 - lin(e, 0.4, 1), transform: `translateY(${dy * e}px) scale(${1 - 0.1 * e})`, filter: e > 0.01 ? `blur(${blur * e}px)` : undefined };
};
export const overlapIn = (p: number, i = 0, n = 1, { start = 0.28, stagger = 0.07, dy = 60, blur = 18 }: { start?: number; stagger?: number; dy?: number; blur?: number } = {}): CSSProperties => {
  const len = Math.max(0.1, 1 - start - stagger * (n - 1));
  const raw = lin(p, start + i * stagger, start + i * stagger + len);
  const e = Easing.out(Easing.poly(4))(raw);
  return { opacity: lin(raw, 0, 0.35), transform: `translateY(${dy * (1 - e)}px) scaleY(${1 + 0.25 * (1 - e)})`, transformOrigin: "50% 100%", filter: e < 0.99 ? `blur(${blur * (1 - e)}px)` : undefined };
};

// Overlap with whole layers: each item of a and b is a full-frame layer whose content the caller positions absolutely; `stage` stays underneath.
export const Overlap: FC<{ p: number; a: ReactNode[]; b: ReactNode[]; stage?: ReactNode }> = ({ p, a, b, stage }) => (
  <Clip>
    {stage}
    {p < 1 ? a.map((n, i) => <AbsoluteFill key={`a${i}`} style={overlapOut(p, i, a.length)}>{n}</AbsoluteFill>) : null}
    {p > 0 ? b.map((n, i) => <AbsoluteFill key={`b${i}`} style={overlapIn(p, i, b.length)}>{n}</AbsoluteFill>) : null}
  </Clip>
);

// T1: the camera dives into a point of a (a screen, a hole, a logo) and b is born large and settles.
// `aFront` is an optional nearer layer of a that rushes past faster (parallax depth); `fill` is the colour inside the hole that covers the swap.
export const PushThrough: FC<TransitionBase & { origin?: Pt; depth?: number; swap?: number; aFront?: ReactNode; fill?: string }> = ({
  p, a, b, ease, origin, depth = 10, swap = 0.5, aFront, fill,
}) => {
  const { width: w, height: h } = useVideoConfig();
  const o = origin ?? { x: w / 2, y: h / 2 };
  if (p <= 0) return <Clip>{a}{aFront ? <AbsoluteFill>{aFront}</AbsoluteFill> : null}</Clip>;
  if (p >= 1) return <Clip>{b}</Clip>;
  const ea = (ease ?? Easing.in(Easing.cubic))(lin(p, 0, swap));
  const eb = Easing.out(Easing.cubic)(lin(p, swap, 1));
  const sA = Math.exp(Math.log(depth) * ea);
  const sF = Math.exp(Math.log(depth * 2.2) * ea);
  const fillK = fill ? Math.min(lin(ea, 0.7, 1), 1 - lin(eb, 0, 0.35)) : 0;
  const origin0 = `${o.x}px ${o.y}px`;
  return (
    <Clip>
      {p < swap ? (
        <>
          <AbsoluteFill style={{ transform: `scale(${sA})`, transformOrigin: origin0, filter: ea > 0.5 ? `blur(${(ea - 0.5) * 14}px)` : undefined }}>{a}</AbsoluteFill>
          {aFront ? <AbsoluteFill style={{ transform: `scale(${sF})`, transformOrigin: origin0, opacity: 1 - lin(ea, 0.45, 0.8) }}>{aFront}</AbsoluteFill> : null}
        </>
      ) : (
        <AbsoluteFill style={{ transform: `scale(${1.5 - 0.5 * eb})`, filter: eb < 0.95 ? `blur(${10 * (1 - eb)}px)` : undefined, opacity: fill ? 1 : lin(eb, 0, 0.25) }}>{b}</AbsoluteFill>
      )}
      {fillK > 0 ? <AbsoluteFill style={{ backgroundColor: fill, opacity: fillK }} /> : null}
    </Clip>
  );
};

// One end of a match cut: any SVG path, its centre in px, its larger dimension in px, fill and rotation.
export type MatchShape = { d: string; x: number; y: number; size: number; fill: string; rotate?: number };

// T10: the shared shape carries the cut. It moves, scales, recolours and morphs from a's shape into b's while the scenes hard-cut behind it at `cut`.
// Render a and b WITHOUT the shared shape: MatchCut draws it on every frame (keep it mounted at p = 0 / 1 for the holds around the cut).
export const MatchCut: FC<TransitionBase & { from: MatchShape; to: MatchShape; cut?: number; shadow?: string }> = ({
  p, a, b, ease = Easing.inOut(Easing.cubic), from, to, cut = 0.5, shadow,
}) => {
  const { width: w, height: h } = useVideoConfig();
  const ua = useMemo(() => unitShape(from.d).d, [from.d]);
  const ub = useMemo(() => unitShape(to.d).d, [to.d]);
  const e = ease(clamp01(p));
  const d = e <= 0 ? ua : e >= 1 ? ub : interpolatePath(e, ua, ub);
  const x = interpolate(e, [0, 1], [from.x, to.x]);
  const y = interpolate(e, [0, 1], [from.y, to.y]);
  const s = interpolate(e, [0, 1], [from.size, to.size]) / 200;
  const r = interpolate(e, [0, 1], [from.rotate ?? 0, to.rotate ?? 0]);
  // Colour flips across the cut itself; a slow RGB blend between two hues reads as mud.
  const fill = interpolateColors(lin(clamp01(p), cut - 0.1, cut + 0.1), [0, 1], [from.fill, to.fill]);
  // The shape swells slightly mid-move so it reads as travelling towards the lens.
  const lift = 1 + 0.12 * bump(p);
  return (
    <Clip>
      {p < cut ? a : b}
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {shadow ? <path d={d} transform={`translate(${x + 14 * lift} ${y + 26 * lift}) rotate(${r}) scale(${s * lift})`} fill={shadow} opacity={0.35} style={{ filter: "blur(18px)" }} /> : null}
        <path d={d} transform={`translate(${x} ${y}) rotate(${r}) scale(${s * lift})`} fill={fill} />
      </svg>
    </Clip>
  );
};

// T11: a full-bleed chapter colour field wipes in on a slanted edge with a thin lead band, holds (optionally with `mid`, e.g. a chapter label),
// then either passes on through to uncover b, or stays as b's background (`stay`, b drawn transparent over it).
export const ColourFlash: FC<TransitionBase & { color: string; lead?: string; dir?: "left" | "right"; stay?: boolean; mid?: ReactNode; slant?: number; band?: number }> = ({
  p, a, b, ease = Easing.out(Easing.exp), color, lead, dir = "left", stay = false, mid, slant = 90, band = 70,
}) => {
  const { width: w, height: h } = useVideoConfig();
  if (p <= 0) return <Clip>{a}</Clip>;
  if (p >= 1 && !stay) return <Clip>{b}</Clip>;
  const inE = ease(lin(p, 0, 0.32));
  const outE = stay ? 0 : Easing.in(Easing.cubic)(lin(p, 0.64, 1));
  const span = w + 2 * slant + band;
  // Field spans [tail, head] along x (in the "from left" frame); the band rides just ahead of the head on entry and behind the tail on exit.
  const head = -slant + span * inE;
  const tail = -slant - band + span * outE;
  const poly = (x0: number, x1: number) => {
    const pts = [[x0 + slant, 0], [x1 + slant, 0], [x1 - slant, h], [x0 - slant, h]].map(([x, y]) => (dir === "left" ? [x!, y!] : [w - x!, y!]));
    return `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
  };
  const showB = stay ? p >= 0.32 : p >= 0.64;
  const aShift = (dir === "left" ? 1 : -1) * 40 * inE;
  return (
    <Clip>
      {showB ? (
        stay ? null : <AbsoluteFill style={{ transform: `scale(${1.04 - 0.04 * outE})` }}>{b}</AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ transform: `translateX(${aShift}px)` }}>{a}</AbsoluteFill>
      )}
      <AbsoluteFill style={{ backgroundColor: color, clipPath: poly(Math.max(tail + band, -slant - band), head) }}>
        {mid ? <AbsoluteFill style={{ opacity: lin(p, 0.12, 0.3) * (1 - lin(p, 0.6, 0.7)), transform: `translateY(${24 * (1 - Easing.out(Easing.cubic)(lin(p, 0.12, 0.4)))}px)` }}>{mid}</AbsoluteFill> : null}
      </AbsoluteFill>
      {lead ? <AbsoluteFill style={{ backgroundColor: lead, clipPath: inE < 1 ? poly(head, head + band) : poly(tail, tail + band) }} /> : null}
      {stay && showB ? <AbsoluteFill>{b}</AbsoluteFill> : null}
    </Clip>
  );
};
