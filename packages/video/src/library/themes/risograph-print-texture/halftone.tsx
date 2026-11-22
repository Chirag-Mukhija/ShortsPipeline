// Halftone screens and the paper: dot gradients whose radius maps a tone, flat dot-pattern fills, and the cream riso stock every scene sits on.
import { useId, type FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { W, H } from "../../core/video";
import { clamp01 } from "../../core/time";
import { BLACK, PAPER, SCREEN_ANGLE, YELLOW } from "./theme";
import { paperJitter } from "./press";

// ---------- tone functions (screen px → 0..1) ----------
export type Tone = (x: number, y: number) => number;
// Linear ramp across a line from (x0,y0) at tone a to (x1,y1) at tone b.
export const linearTone = (x0: number, y0: number, x1: number, y1: number, a = 1, b = 0): Tone => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
  return (x, y) => a + (b - a) * clamp01(((x - x0) * dx + (y - y0) * dy) / L);
};
// Radial: tone a at the centre falling to b at radius r.
export const radialTone = (cx: number, cy: number, r: number, a = 1, b = 0): Tone => (x, y) => a + (b - a) * clamp01(Math.hypot(x - cx, y - cy) / r);

export type HalftoneProps = {
  x: number; y: number; w: number; h: number;
  tone: Tone;
  // Lattice pitch in px; riso screens read best at 14–26 px on a 1080p frame.
  cell?: number;
  angle?: number;
  // The ink, used only to pick its screen angle when `angle` is not given; fill comes from the enclosing Plate.
  ink?: string;
  // 0..1 radius multiplier: grow the screen in, or shrink it out.
  grow?: number;
  // Idle life: dots breathe ±5 % in a slow wave.
  breathe?: boolean;
  clip?: string;
};

// A halftone gradient drawn dot by dot: area of each dot ∝ tone, on a lattice rotated to the ink's screen angle.
export const Halftone: FC<HalftoneProps> = ({ x, y, w, h, tone, cell = 18, angle, ink, grow = 1, breathe = true, clip }) => {
  const id = `ht${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const a = (((angle ?? (ink ? SCREEN_ANGLE[ink] : 45)) ?? 45) * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const cx = x + w / 2, cy = y + h / 2;
  const R = Math.hypot(w, h) / 2 + cell;
  const n = Math.ceil(R / cell);
  const dots: { x: number; y: number; r: number }[] = [];
  if (grow > 0) {
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const px = cx + i * cell * ca - j * cell * sa;
        const py = cy + i * cell * sa + j * cell * ca;
        if (px < x - cell || px > x + w + cell || py < y - cell || py > y + h + cell) continue;
        const v = clamp01(tone(px, py));
        if (v <= 0.01) continue;
        const b = breathe ? 1 + 0.05 * Math.sin(t * Math.PI + px * 0.006 + py * 0.004) : 1;
        const r = cell * 0.62 * Math.sqrt(v) * grow * b;
        if (r < 0.6) continue;
        dots.push({ x: px, y: py, r });
      }
    }
  }
  return (
    <g clipPath={clip ? `url(#${id})` : undefined}>
      {clip && (
        <clipPath id={id}>
          <path d={clip} clipRule="evenodd" />
        </clipPath>
      )}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(2)} />
      ))}
    </g>
  );
};

// A flat tint as a pattern fill (for text and shapes): tone 0..1 at a given pitch and angle. Put it in <defs> and fill with url(#id).
export const DotPattern: FC<{ id: string; color: string; tone?: number; cell?: number; angle?: number }> = ({ id, color, tone = 0.5, cell = 12, angle = 15 }) => (
  <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
    <circle cx={cell / 2} cy={cell / 2} r={cell * 0.62 * Math.sqrt(clamp01(tone))} fill={color} />
  </pattern>
);

// ---------- the stock ----------
const CORNER = 46;
// Crop marks at the trim and registration targets on the side margins, the furniture of a press sheet.
const SheetMarks: FC<{ opacity: number }> = ({ opacity }) => {
  const L = 54, g = 18;
  const corners: [number, number, number, number][] = [[CORNER, CORNER, 1, 1], [W - CORNER, CORNER, -1, 1], [CORNER, H - CORNER, 1, -1], [W - CORNER, H - CORNER, -1, -1]];
  const target = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <circle cx={x} cy={y} r={13} fill="none" strokeWidth={2} />
      <line x1={x - 22} y1={y} x2={x + 22} y2={y} strokeWidth={2} />
      <line x1={x} y1={y - 22} x2={x} y2={y + 22} strokeWidth={2} />
    </g>
  );
  return (
    <g stroke={BLACK} opacity={opacity} fill="none">
      {corners.map(([x, y, sx, sy], i) => (
        <g key={i} strokeWidth={2}>
          <line x1={x - sx * g} y1={y + sy * g} x2={x - sx * g + sx * -L} y2={y + sy * g} />
          <line x1={x + sx * g} y1={y - sy * g} x2={x + sx * g} y2={y - sy * g + sy * -L} />
        </g>
      ))}
      {target(CORNER, H / 2)}
      {target(W - CORNER, H / 2)}
    </g>
  );
};

// Cream riso stock: fibre streaks, sparse specks, a vignette of uneven drum pressure, sheet marks,
// and (optional) a pale yellow halftone bleeding in from a corner whose dots breathe.
export const RisoPaper: FC<{ marks?: boolean; corner?: boolean; color?: string }> = ({ marks = true, corner = true, color = PAPER }) => {
  const f = useCurrentFrame();
  const [jx, jy] = paperJitter(f);
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="riso-paper-fibre" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.16" numOctaves={2} seed={4} result="fb" />
            <feColorMatrix in="fb" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.27  0 0 0 1.6 -0.78" />
          </filter>
          <filter id="riso-paper-tooth" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={8} result="th" />
            <feColorMatrix in="th" type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.33  0 0 0 0 0.22  0 0 0 1.2 -0.5" />
          </filter>
          <filter id="riso-paper-speck" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={1} seed={9} result="sp" />
            <feColorMatrix in="sp" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  14 0 0 0 -10.4" />
          </filter>
          <radialGradient id="riso-paper-vig" cx="50%" cy="48%" r="75%">
            <stop offset="55%" stopColor="#7a6440" stopOpacity={0} />
            <stop offset="100%" stopColor="#7a6440" stopOpacity={0.16} />
          </radialGradient>
        </defs>
        <g transform={`translate(${jx} ${jy})`}>
          <rect x={-4} y={-4} width={W + 8} height={H + 8} filter="url(#riso-paper-fibre)" opacity={0.28} />
          <rect x={-4} y={-4} width={W + 8} height={H + 8} filter="url(#riso-paper-tooth)" opacity={0.3} />
          <rect x={-4} y={-4} width={W + 8} height={H + 8} filter="url(#riso-paper-speck)" opacity={0.7} />
          {corner && (
            <g fill={YELLOW} style={{ mixBlendMode: "multiply" }} opacity={0.9}>
              <Halftone x={W - 470} y={0} w={470} h={340} cell={20} ink={YELLOW} tone={radialTone(W + 30, -50, 470, 0.75, 0)} />
            </g>
          )}
          {marks && <SheetMarks opacity={0.4} />}
        </g>
        <rect width={W} height={H} fill="url(#riso-paper-vig)" />
      </svg>
    </AbsoluteFill>
  );
};
