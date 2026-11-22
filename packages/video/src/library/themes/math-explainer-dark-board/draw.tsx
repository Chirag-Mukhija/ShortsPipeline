// Board primitives: the gridded dark board, Create (stroke draw-on), FadeIn prose, surrounding rectangle, brace, Flash, arrows, dots and DecimalNumber.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { W, H } from "../../core/video";
import { clamp01, ramp, useTime } from "../../core/time";
import { fontCss, useFontsReady, type FontKind } from "./metrics";
import { BLUE, BOARD, BOARD_EDGE, INK, LIN, MATH, SMOOTH, STROKE, UNIT, YELLOW } from "./theme";

export const Stage: FC<{ children: ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

// The coordinate grid of the board, centred on the frame; `ox` pans it (for camera moves).
export const Grid: FC<{ ox?: number; oy?: number; focus?: [number, number]; strength?: number }> = ({ ox = 0, oy = 0, focus, strength = 1 }) => {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const mod = (v: number) => ((v % UNIT) + UNIT) % UNIT;
  const x0 = mod(W / 2 - ox) - UNIT, y0 = mod(H / 2 - oy) - UNIT;
  const xs = Array.from({ length: Math.ceil(W / UNIT) + 3 }, (_, i) => x0 + i * UNIT);
  const ys = Array.from({ length: Math.ceil(H / UNIT) + 3 }, (_, i) => y0 + i * UNIT);
  const [fx, fy] = focus ?? [W / 2, H / 2];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id={id} cx={fx} cy={fy} r={620} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BLUE} stopOpacity={0.2 * strength} />
          <stop offset="1" stopColor={BLUE} stopOpacity={0.085 * strength} />
        </radialGradient>
      </defs>
      <g stroke={BLUE} strokeOpacity={0.035 * strength} strokeWidth={1}>
        {xs.map((x) => <line key={`a${x}`} x1={x + UNIT / 2} y1={0} x2={x + UNIT / 2} y2={H} />)}
        {ys.map((y) => <line key={`b${y}`} x1={0} y1={y + UNIT / 2} x2={W} y2={y + UNIT / 2} />)}
      </g>
      <g stroke={`url(#${id})`} strokeWidth={1.6}>
        {xs.map((x) => <line key={`c${x}`} x1={x} y1={0} x2={x} y2={H} />)}
        {ys.map((y) => <line key={`d${y}`} x1={0} y1={y} x2={W} y2={y} />)}
      </g>
    </svg>
  );
};

// The board: flat charcoal, a faint blue coordinate grid and one slow light wandering across it (idle life you barely notice).
export const Board: FC = () => {
  const { t } = useTime();
  const focus: [number, number] = [W / 2 + Math.sin(t * 0.13) * 620, H / 2 + Math.sin(t * 0.09 + 1.2) * 240];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 75% at 50% 46%, ${BOARD} 0%, ${BOARD} 52%, ${BOARD_EDGE} 100%)` }}>
      <Grid focus={focus} />
    </AbsoluteFill>
  );
};

// Create: a stroke drawing itself on (pathLength-normalised), optional fill fading in once drawn; `out` uncreates it.
export const Create: FC<{ d: string; at?: number; dur?: number; p?: number; color?: string; w?: number; fill?: string; fillOpacity?: number; out?: number; opacity?: number; cap?: "round" | "butt" }> = ({ d, at = 0, dur = 1, p, color = INK, w = STROKE, fill, fillOpacity = 1, out, opacity = 1, cap = "round" }) => {
  const { t } = useTime();
  const q = (p ?? ramp(t, at, dur, LIN)) - (out !== undefined ? ramp(t, out, 0.4, SMOOTH) : 0);
  if (q <= 0 || opacity <= 0) return null;
  const fo = fill ? fillOpacity * clamp01((q - 0.7) / 0.3) : 0;
  return (
    <g opacity={opacity}>
      {fill && fo > 0 && <path d={d} fill={fill} fillOpacity={fo} stroke="none" />}
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap={cap} strokeLinejoin="round" {...(q < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - q } : {})} />
    </g>
  );
};

export type TxtProps = { x: number; y: number; text: string; size?: number; at?: number; color?: string; anchor?: "start" | "middle" | "end"; font?: FontKind; out?: number; opacity?: number; spacing?: number; caps?: boolean; tabular?: boolean };

// FadeIn for supporting prose and labels: 12 frames, a short rise, then perfectly still.
export const Txt: FC<TxtProps> = ({ x, y, text, size = 40, at = 0, color = INK, anchor = "start", font = "sf", out, opacity = 1, spacing = 0, caps, tabular }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.4, SMOOTH) * (out !== undefined ? 1 - ramp(t, out, 0.4, SMOOTH) : 1);
  if (e <= 0) return null;
  const f = fontCss(font);
  return (
    <text x={x} y={y + (1 - ramp(t, at, 0.4, SMOOTH)) * 14} fontSize={size} fill={color} opacity={e * opacity} textAnchor={anchor} letterSpacing={spacing} style={{ textTransform: caps ? "uppercase" : undefined, fontVariantNumeric: tabular ? "tabular-nums" : undefined }} fontFamily={f.fontFamily} fontStyle={f.fontStyle} fontWeight={f.fontWeight}>
      {text}
    </text>
  );
};

export const rectD = (x0: number, y0: number, x1: number, y1: number) => `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1} Z`;

// SurroundingRectangle: sharp yellow box drawn round a term in 12 frames.
export const Surround: FC<{ x0: number; y0: number; x1: number; y1: number; at: number; color?: string; pad?: number; out?: number; w?: number }> = ({ x0, y0, x1, y1, at, color = YELLOW, pad = 14, out, w = 3 }) => (
  <Create d={rectD(x0 - pad, y0 - pad, x1 + pad, y1 + pad)} at={at} dur={0.4} color={color} w={w} out={out} cap="butt" />
);

// Brace: Manim's curly brace grown from its centre, pointing down (or up) at a span from x1 to x2.
export const Brace: FC<{ x1: number; x2: number; y: number; at: number; up?: boolean; color?: string; out?: number; depth?: number }> = ({ x1, x2, y, at, up, color = INK, out, depth = 30 }) => {
  const { t } = useTime();
  const g = ramp(t, at, 0.5, SMOOTH) * (out !== undefined ? 1 - ramp(t, out, 0.4, SMOOTH) : 1);
  if (g <= 0) return null;
  const s = up ? -1 : 1;
  const h = depth, m = (x1 + x2) / 2, r = Math.min(h / 2, (x2 - x1) / 4);
  const d = `M${x1} ${y} Q${x1} ${y + (s * h) / 2} ${x1 + r} ${y + (s * h) / 2} L${m - r} ${y + (s * h) / 2} Q${m} ${y + (s * h) / 2} ${m} ${y + s * h} Q${m} ${y + (s * h) / 2} ${m + r} ${y + (s * h) / 2} L${x2 - r} ${y + (s * h) / 2} Q${x2} ${y + (s * h) / 2} ${x2} ${y}`;
  return <path d={d} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={Math.min(1, g * 2)} transform={`translate(${m} 0) scale(${g} 1) translate(${-m} 0)`} />;
};

// Flash: short yellow rays shooting out of a point and vanishing.
export const Flash: FC<{ x: number; y: number; at: number; color?: string; r?: number; n?: number }> = ({ x, y, at, color = YELLOW, r = 34, n = 10 }) => {
  const { t } = useTime();
  const head = ramp(t, at, 0.3, SMOOTH), tail = ramp(t, at + 0.12, 0.3, SMOOTH);
  if (head <= 0 || tail >= 1) return null;
  return (
    <g stroke={color} strokeWidth={4} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const ra = r + tail * r * 1.3, rb = r + head * r * 1.3;
        return <line key={i} x1={x + Math.cos(a) * ra} y1={y + Math.sin(a) * ra} x2={x + Math.cos(a) * rb} y2={y + Math.sin(a) * rb} />;
      })}
    </g>
  );
};

// Arrow with Manim's filled triangular tip; p grows it from the tail.
export const Arrow: FC<{ x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; w?: number; tip?: number; opacity?: number }> = ({ x1, y1, x2, y2, p = 1, color = INK, w = 5, tip = 24, opacity = 1 }) => {
  if (p <= 0) return null;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
  const tp = Math.min(tip, len * p * 0.5);
  const bx = ex - ux * tp, by = ey - uy * tp;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={bx + ux * 1} y2={by + uy * 1} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M${ex} ${ey} L${bx - uy * tp * 0.5} ${by + ux * tp * 0.5} L${bx + uy * tp * 0.5} ${by - ux * tp * 0.5} Z`} fill={color} />
    </g>
  );
};

export const Dot: FC<{ x: number; y: number; r?: number; color?: string; opacity?: number; glow?: number }> = ({ x, y, r = 11, color = INK, opacity = 1, glow = 0 }) => (
  <g opacity={opacity}>
    {glow > 0 && <circle cx={x} cy={y} r={r * 2.6} fill={color} opacity={0.18 * glow} />}
    <circle cx={x} cy={y} r={r} fill={color} />
  </g>
);

// DecimalNumber: a number set in the maths font with fixed digits, so a counting value never jitters.
export const Decimal: FC<{ x: number; y: number; value: number; decimals?: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; opacity?: number; group?: boolean }> = ({ x, y, value, decimals = 0, size = 72, color = INK, anchor = "middle", opacity = 1, group = true }) => {
  const ready = useFontsReady();
  if (!ready) return null;
  const s = group ? value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value.toFixed(decimals);
  return (
    <text x={x} y={y} fontFamily={MATH} fontSize={size} fill={color} textAnchor={anchor} opacity={opacity} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
      {s}
    </text>
  );
};
