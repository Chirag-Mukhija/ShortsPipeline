// Ma primitives: the clock (narration or song), slow enter/leave, text blocks, vertical columns, hairlines, the loaded brush, ink dots, the hanko seal and the scene breath.
import { createContext, useContext, useId, type CSSProperties, type FC, type ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { Track, useSong, type Cue, type TrackSpec } from "../../core/beat";
import { W, H } from "../../core/video";
import { clamp01, ramp } from "../../core/time";
import { DRAW_S, DRIFT, ENTER_S, EXIT_S, LABEL, SERIF, SHU, SLOW, SUMI, SUMI_SOFT, TRACK_CAPS, WASHI, WASHI_DEEP } from "./theme";
import { brush, linePath, type P } from "./geometry";

// ---------- clock ----------
const Music = createContext(false);

// Wrap a music-only scene in <MaSong>: core's <Track> plus a flag, so narrated scenes never breathe to a phantom tempo.
export const MaSong: FC<{ spec: TrackSpec; from?: number; children: ReactNode }> = ({ spec, from, children }) => (
  <Track spec={spec} from={from}>
    <Music.Provider value>{children}</Music.Provider>
  </Track>
);

// Every piece reads time here: narration seconds normally, song seconds inside <MaSong> (cues may then be { bar, beat }).
export const useMa = () => {
  const s = useSong();
  const music = useContext(Music);
  return { t: s.t, f: s.f, music, cue: (c: Cue) => s.clock.cue(c), clock: s.clock, pulse: music ? s.pulse : 0, energy: music ? s.energy : 0.4, pos: s.pos };
};

// ---------- slow in, still out ----------
export const rise = (t: number, at: number, d = ENTER_S) => ramp(t, at, d, SLOW);
export const sink = (t: number, until?: number, d = EXIT_S) => (until === undefined ? 0 : ramp(t, until - d, d, Easing.inOut(Easing.quad)));
// The board's entrance: fade with a 6 px drift that settles; the exit fades in place.
export const enter = (t: number, at: number, until?: number, d = ENTER_S, dy = DRIFT): CSSProperties => {
  const e = rise(t, at, d);
  return { opacity: e * (1 - sink(t, until)), transform: `translateY(${(1 - e) * dy}px)` };
};
// Emphasis: when the seal lands everything else dims 10 %.
export const hush = (t: number, at?: number) => (at === undefined ? 1 : 1 - 0.1 * ramp(t, at, 0.27));
// Board idle: a thin line breathes between 0.6 and 1 on a 120-frame sine.
export const breathe = (t: number, phase = 0) => 0.8 + 0.2 * Math.sin((t / 4) * Math.PI * 2 + phase);

// ---------- staging ----------
export const Stage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

export type TextProps = {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  at?: number;
  until?: number;
  align?: "left" | "center" | "right";
  font?: string;
  italic?: boolean;
  weight?: number;
  color?: string;
  caps?: boolean;
  tracking?: string;
  opacity?: number;
  d?: number;
  style?: CSSProperties;
};

// A positioned text block; y is the top of the first line, x its left, centre or right edge.
export const Text: FC<TextProps> = ({ x, y, children, size = 56, at = 0, until, align = "left", font = SERIF, italic, weight = 300, color = SUMI, caps, tracking, opacity = 1, d, style }) => {
  const { t } = useMa();
  const e = enter(t, at, until, d);
  const shift = align === "left" ? "0" : align === "center" ? "-50%" : "-100%";
  if ((e.opacity as number) <= 0 || opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${shift}) ${e.transform}`,
        opacity: (e.opacity as number) * opacity,
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        textTransform: caps ? "uppercase" : undefined,
        letterSpacing: tracking ?? (caps ? TRACK_CAPS : "0.01em"),
        lineHeight: 1.18,
        color,
        textAlign: align,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Small tracked capitals: folios, labels, sources. 28 px is the floor.
export const Caps: FC<Omit<TextProps, "font" | "caps">> = (p) => <Text font={LABEL} weight={400} size={28} color={SUMI_SOFT} caps {...p} />;

// ---------- vertical text ----------
export type VerticalTextProps = {
  x: number;
  y: number;
  columns: string[];
  at?: number;
  until?: number;
  size?: number;
  // upright stacks letters like a shop sign (short words); sideways turns the line 90° like a book spine (phrases).
  upright?: boolean;
  stagger?: number;
  font?: string;
  weight?: number;
  color?: string;
  tracking?: number;
  gap?: number;
  times?: number[];
};

// Columns read top to bottom, first column on the right, each character fading in with a short drift down the column.
export const VerticalText: FC<VerticalTextProps> = ({ x, y, columns, at = 0, until, size = 40, upright = false, stagger = 0.05, font = LABEL, weight = 400, color = SUMI_SOFT, tracking = 0.3, gap, times }) => {
  const { t } = useMa();
  const out = 1 - sink(t, until);
  if (out <= 0) return null;
  const colGap = gap ?? size * (upright ? 1.9 : 2.1);
  let k = 0;
  return (
    <>
      {columns.map((col, ci) => {
        const chars = [...col];
        const start = times?.[ci] ?? at + k * stagger;
        const items = chars.map((ch, i) => {
          const e = rise(t, start + i * stagger, 0.7);
          return { ch, e };
        });
        k += chars.length + 3;
        return (
          <div
            key={ci}
            style={{
              position: "absolute",
              left: x - ci * colGap,
              top: y,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              writingMode: upright ? undefined : "vertical-rl",
              fontFamily: font,
              fontSize: size,
              fontWeight: weight,
              color,
              opacity: out,
              letterSpacing: upright ? 0 : `${tracking}em`,
              lineHeight: 1,
              whiteSpace: "pre",
            }}
          >
            {upright ? (
              items.map(({ ch, e }, i) => (
                <span key={i} style={{ display: "block", height: ch === " " ? size * 0.6 : size * (1 + tracking), opacity: e, transform: `translateY(${(1 - e) * -DRIFT}px)` }}>
                  {ch === " " ? "" : ch}
                </span>
              ))
            ) : (
              <div>
                {items.map(({ ch, e }, i) => (
                  <span key={i} style={{ display: "inline-block", opacity: e, transform: `translateY(${(1 - e) * -DRIFT}px)` }}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

// ---------- lines ----------
export type HairlineProps = { pts: P[]; at?: number; d?: number; until?: number; w?: number; color?: string; breath?: boolean; opacity?: number; dash?: string };

// A 1.5 px rule that draws itself (40 f by default) and may breathe while it holds.
export const Hairline: FC<HairlineProps> = ({ pts, at = 0, d = DRAW_S, until, w = 1.6, color = SUMI, breath, opacity = 1, dash }) => {
  const { t } = useMa();
  const p = rise(t, at, d);
  const o = opacity * (1 - sink(t, until)) * (breath ? breathe(t, pts[0]![0] * 0.01) : 1);
  if (p <= 0 || o <= 0) return null;
  return (
    <path
      d={linePath(pts)}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeDasharray={dash ?? "1 1"}
      strokeDashoffset={dash ? undefined : 1 - p}
      opacity={dash ? o * p : o}
    />
  );
};

export const InkFilter: FC<{ id: string; scale?: number; freq?: number; seed?: number }> = ({ id, scale = 5, freq = 0.04, seed = 3 }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

export type BrushProps = { ctrl: P[]; width?: number; at?: number; d?: number; until?: number; seed?: number; color?: string; opacity?: number; attack?: number; tail?: number; dry?: number };

// A loaded sumi brush stroke: soft bleed underneath, ragged edges, dry streaks in the tail.
export const Brush: FC<BrushProps> = ({ ctrl, width = 28, at = 0, d = DRAW_S, until, seed = 1, color = SUMI, opacity = 0.94, attack, tail, dry }) => {
  const { t } = useMa();
  const id = `b${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Brushes start fast and slow as the ink runs out.
  const p = ramp(t, at, d, Easing.bezier(0.3, 0.1, 0.35, 1));
  const o = opacity * (1 - sink(t, until));
  if (p <= 0 || o <= 0) return null;
  const b = brush(ctrl, width, p, seed, { attack, tail, dry });
  return (
    <g opacity={o}>
      <defs>
        <InkFilter id={`${id}e`} scale={Math.max(2.5, width * 0.09)} freq={0.035} seed={seed} />
        <clipPath id={`${id}c`}>
          <path d={b.body} />
        </clipPath>
        <filter id={`${id}s`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={Math.max(2, width * 0.12)} />
        </filter>
      </defs>
      <path d={b.body} fill={color} opacity={0.14} filter={`url(#${id}s)`} transform="translate(1 2)" />
      <g filter={`url(#${id}e)`}>
        <path d={b.body} fill={color} />
        <g clipPath={`url(#${id}c)`}>
          {b.streaks.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={WASHI_DEEP} strokeWidth={s.w} opacity={s.o * 0.9} strokeDasharray={s.dash} strokeLinecap="round" />
          ))}
        </g>
      </g>
    </g>
  );
};

// ---------- ink dot ----------
export type InkDotProps = { x: number; y: number; r: number; at?: number; d?: number; until?: number; color?: string; wash?: number; seed?: number };

// Ink touching wet paper: spreads fast then slower (diffusion), a soft bleed ring, and keeps creeping a little while it holds.
export const InkDot: FC<InkDotProps> = ({ x, y, r, at = 0, d = 1.4, until, color = SUMI, wash = 1, seed = 2 }) => {
  const { t } = useMa();
  const id = `d${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (t < at) return null;
  const k = clamp01((t - at) / d);
  const spread = Math.sqrt(k) * (0.6 + 0.4 * k) + 0.03 * Math.log1p(Math.max(0, t - at - d));
  const rr = Math.max(0.5, r * spread);
  const o = Math.min(1, (t - at) * 8) * (1 - sink(t, until)) * wash;
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={color} stopOpacity={wash < 0.5 ? 0.7 : 1} />
          <stop offset="0.7" stopColor={color} stopOpacity={wash < 0.5 ? 0.78 : 0.95} />
          {/* Pigment gathers at a drying edge, so a wash gets a darker rim before it fades. */}
          <stop offset="0.9" stopColor={color} stopOpacity={wash < 0.5 ? 1 : 0.7} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
        <InkFilter id={`${id}f`} scale={Math.max(3, rr * 0.08)} freq={0.012 + 0.9 / Math.max(rr, 20)} seed={seed} />
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={rr * 0.12 + 2} />
        </filter>
      </defs>
      <circle cx={x} cy={y} r={rr * 1.22} fill={color} opacity={0.1} filter={`url(#${id}b)`} />
      <circle cx={x} cy={y} r={rr} fill={`url(#${id}g)`} filter={`url(#${id}f)`} />
    </g>
  );
};

// ---------- hanko ----------
// 間 (ma: the interval, the space between) cut in seal style on a 100-unit grid: the gate 門 around the sun 日.
const MA_GLYPH = [
  "M14,10 V92", "M14,10 H42 V40 H14", "M14,25 H42",
  "M58,10 H86 V90 L80,92", "M58,10 V40 H86", "M58,25 H86",
  "M36,52 H64 V86 H36 Z", "M36,69 H64",
];

export type HankoProps = { x: number; y: number; size?: number; at?: number; until?: number; text?: string; rotate?: number; seed?: number };

// The vermillion seal punch: lands at 1.15 scale and settles to 1 in 8 frames, leaving a faint wet halo. Text swaps the 間 for Latin initials.
export const Hanko: FC<HankoProps> = ({ x, y, size = 120, at = 0, until, text, rotate = -3, seed = 7 }) => {
  const { t } = useMa();
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (t < at - 0.02) return null;
  const land = ramp(t, at, 0.27, Easing.out(Easing.quad));
  const s = interpolate(land, [0, 1], [1.15, 1]);
  const o = Math.min(1, (t - at + 0.02) * 12) * (1 - sink(t, until));
  const halo = ramp(t, at, 0.9, Easing.out(Easing.cubic));
  const u = size / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s * u})`} opacity={o}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency={0.09} numOctaves={2} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.2} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency={0.5} numOctaves={1} seed={seed + 4} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.45" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      </defs>
      <rect x={-50 - 8 * halo} y={-50 - 8 * halo} width={100 + 16 * halo} height={100 + 16 * halo} rx={6} fill={SHU} opacity={0.1 * (1 - halo * 0.6)} />
      <g filter={`url(#${id})`}>
        <rect x={-50} y={-50} width={100} height={100} rx={5} fill={SHU} />
        {text ? (
          <text x={0} y={text.length > 1 ? 13 : 16} textAnchor="middle" fontFamily={SERIF} fontWeight={500} fontSize={text.length > 1 ? 44 : 64} fill={WASHI} letterSpacing={2}>
            {text}
          </text>
        ) : (
          <g transform="translate(-50 -50)" fill="none" stroke={WASHI} strokeWidth={7.5} strokeLinecap="square" strokeLinejoin="miter">
            {MA_GLYPH.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        )}
      </g>
    </g>
  );
};

// ---------- the breath ----------
// Board camera: an imperceptible push 1.00 → 1.02 over 150 f, easing back on long holds so it never stops.
export const drift = (t: number, from = 0) => 1 + 0.02 * (0.5 - 0.5 * Math.cos(((t - from) / 5) * Math.PI));

// Holds a scene inside its window: slow 6 px fade in, a 24 f still fade out, and the slow camera push in between.
export const BreathHold: FC<{ at?: number; until?: number; origin?: string; children: ReactNode }> = ({ at = 0, until, origin = "50% 60%", children }) => {
  const { t } = useMa();
  const e = enter(t, at, until);
  if ((e.opacity as number) <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, ...e }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${drift(t, at)})`, transformOrigin: origin }}>{children}</div>
    </div>
  );
};

export const Fill: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>;
