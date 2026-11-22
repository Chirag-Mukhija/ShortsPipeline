// Bauhaus primitives: the shape kit (circle, square, triangle, quarter, half, bar, ball), lowercase type, vertical labels, the cream ground with its idle machines, and the composition sway.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { W, H } from "../../core/video";
import { ramp, useTime } from "../../core/time";
import { BLACK, BLUE, CREAM, GEO, HAIR, MODULE, MONO, RED, YELLOW, fr } from "./theme";
import { detents, sway } from "./motion";

export type Kind = "circle" | "square" | "tri" | "quarter" | "half" | "bar";

// Outline of a kind inside a w × h box centred on 0,0. A quarter has its right angle bottom-left; a half sits on its flat side.
export const shapeD = (kind: Kind, w: number, h = w) => {
  const x0 = -w / 2;
  const y0 = -h / 2;
  switch (kind) {
    case "circle":
      return `M ${x0} 0 A ${w / 2} ${h / 2} 0 1 0 ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 0 ${x0} 0 Z`;
    case "tri":
      return `M 0 ${y0} L ${w / 2} ${h / 2} L ${x0} ${h / 2} Z`;
    case "quarter":
      return `M ${x0} ${h / 2} L ${x0} ${y0} A ${w} ${h} 0 0 1 ${w / 2} ${h / 2} Z`;
    case "half":
      return `M ${x0} ${h / 2} A ${w / 2} ${h} 0 0 1 ${w / 2} ${h / 2} Z`;
    default:
      return `M ${x0} ${y0} H ${w / 2} V ${h / 2} H ${x0} Z`;
  }
};

export type ShapeProps = {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  rot?: number;
  scale?: number;
  sx?: number;
  sy?: number;
  // Pivot for scale, relative to the centre: (-w/2, h/2) grows it out of its bottom-left corner.
  ox?: number;
  oy?: number;
  stroke?: string;
  sw?: number;
  opacity?: number;
  blend?: "multiply" | "normal";
};

export const Shape: FC<ShapeProps> = ({ kind, x, y, w, h, fill = BLACK, rot = 0, scale = 1, sx = 1, sy = 1, ox = 0, oy = 0, stroke, sw = HAIR, opacity = 1, blend }) => {
  if (scale <= 0.001 || sx <= 0.001 || sy <= 0.001 || opacity <= 0) return null;
  const hh = h ?? (kind === "half" ? w / 2 : kind === "bar" ? w / 6 : w);
  return (
    <path
      d={shapeD(kind, w, hh)}
      transform={`translate(${x} ${y}) rotate(${rot}) translate(${ox} ${oy}) scale(${scale * sx} ${scale * sy}) translate(${-ox} ${-oy})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? sw / Math.max(0.2, scale) : undefined}
      opacity={opacity}
      style={blend ? { mixBlendMode: blend } : undefined}
    />
  );
};

// A circle with one quarter in a second colour, so rolling and turning read.
export const Ball: FC<{ x: number; y: number; r: number; fill?: string; mark?: string; rot?: number; scale?: number; ring?: boolean }> = ({ x, y, r, fill = BLACK, mark = YELLOW, rot = 0, scale = 1, ring }) =>
  scale <= 0.001 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <circle r={r} fill={fill} />
      <path d={`M 0 0 L 0 ${-r} A ${r} ${r} 0 0 1 ${r} 0 Z`} fill={mark} />
      {ring && <circle r={r} fill="none" stroke={BLACK} strokeWidth={HAIR} />}
    </g>
  );

// A full-frame SVG in frame coordinates; every piece draws inside one.
export const Stage: FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {children}
    </svg>
  </AbsoluteFill>
);

export type TxtProps = { x: number; y: number; size?: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; mono?: boolean; spacing?: number; opacity?: number; rot?: number; upper?: boolean; children: string };

// Lowercase geometric type by default; Space Mono for dates, numbers and captions.
export const Txt: FC<TxtProps> = ({ x, y, size = 48, weight = 700, fill = BLACK, anchor = "start", mono, spacing, opacity = 1, rot = 0, upper, children }) =>
  opacity <= 0 ? null : (
    <text
      x={x}
      y={y}
      transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
      fontFamily={mono ? MONO : GEO}
      fontWeight={mono ? Math.min(weight, 700) : weight}
      fontSize={size}
      fill={fill}
      textAnchor={anchor}
      letterSpacing={spacing ?? (mono ? 0.04 * size : -0.02 * size)}
      opacity={opacity}
    >
      {upper ? children.toUpperCase() : mono ? children : children.toLowerCase()}
    </text>
  );

// Secondary label running up the page (rotated -90°), drawing in from its foot behind a short black rule.
export const VLabel: FC<{ x: number; y: number; text: string; at: number; size?: number; fill?: string; mono?: boolean; rule?: string }> = ({ x, y, text, at, size = 30, fill = BLACK, mono = true, rule = RED }) => {
  const { t } = useTime();
  const id = `v${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const p = ramp(t, at, fr(10) + text.length * fr(0.8));
  if (p <= 0) return null;
  const len = text.length * size * (mono ? 0.66 : 0.56) + 20;
  return (
    <g transform={`rotate(-90 ${x} ${y})`}>
      <clipPath id={id}>
        <rect x={x} y={y - size * 1.2} width={len * p + 4} height={size * 1.6} />
      </clipPath>
      <rect x={x - 46} y={y - size * 0.42 - 3} width={34 * ramp(t, at, fr(8))} height={6} fill={rule} />
      <g clipPath={`url(#${id})`}>
        <Txt x={x} y={y} size={size} mono={mono} weight={mono ? 700 : 600} fill={fill}>
          {text}
        </Txt>
      </g>
    </g>
  );
};

// Whole-composition sway (camera): ±amp° over 6 s around the frame centre.
export const Sway: FC<{ amp?: number; children: ReactNode }> = ({ amp = 1.5, children }) => {
  const { t } = useTime();
  return <AbsoluteFill style={{ transform: `rotate(${sway(t, amp)}deg)` }}>{children}</AbsoluteFill>;
};

// The ground: cream paper with grain and a faint 120 px construction grid; idle machines live in the margins.
export const Ground: FC<{ machines?: boolean; grid?: boolean }> = ({ machines = true, grid = true }) => {
  const { t, f } = useTime();
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const swing = 20 * Math.sin((f / 120) * Math.PI * 2);
  // The corner triangle clicks round a third of a turn every 2 s instead of spinning smoothly.
  const turn = detents(t, Array.from({ length: 1 + Math.floor(t / 2) }, (_, i) => [i * 2, i * 120] as [number, number]));
  const march = (f * 1.5) % 160;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`${id}n`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0 0.04  1.4 0 0 0 -0.62" />
          </filter>
          <clipPath id={`${id}m`}>
            <rect x={96} y={1028} width={400} height={20} />
          </clipPath>
        </defs>
        {grid &&
          Array.from({ length: 15 }, (_, i) => <rect key={`x${i}`} x={(i + 1) * MODULE - 1} y={0} width={2} height={H} fill={BLACK} opacity={0.045} />).concat(
            Array.from({ length: 8 }, (_, i) => <rect key={`y${i}`} x={0} y={(i + 1) * MODULE - 1} width={W} height={2} fill={BLACK} opacity={0.045} />),
          )}
        <rect width={W} height={H} filter={`url(#${id}n)`} opacity={0.55} />
        {machines && (
          <>
            <g transform={`translate(1846 0) rotate(${swing})`}>
              <rect x={-1.5} y={0} width={3} height={150} fill={BLACK} />
              <circle cy={150} r={20} fill={BLUE} />
            </g>
            <Shape kind="tri" x={56} y={58} w={40} h={36} fill={RED} rot={turn} />
            <g clipPath={`url(#${id}m)`}>
              {Array.from({ length: 14 }, (_, i) => (
                <rect key={i} x={96 - 160 + i * 40 + march} y={1028} width={24} height={20} fill={[RED, YELLOW, BLUE, BLACK][i % 4]} />
              ))}
            </g>
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};
