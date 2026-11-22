// Flat vector figures: the shape assembler, the icon set it builds (rocket, chip, server, globe, lock, doc, bolt, satellite, book), the two-primitive character with blink, breath and gesture states, and the rack tower for scale stories.
import { useId, type FC } from "react";
import { interpolate } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { AMBER, BACK, CORAL, MUTED, NIGHT, STAGGER_S, TEAL, VIOLET, shade, tint } from "./theme";
import { blink, breathe, popIn, squash, wobble } from "./primitives";

// ---------- shape assembler ----------
export type Part = {
  shape: "circle" | "rect" | "tri" | "path" | "ellipse";
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  d?: string;
  fill: string;
  grad?: boolean;
  rot?: number;
  o?: number;
  // Seconds after the assembler's cue; defaults to a 3-frame stagger by index.
  delay?: number;
  // Idle flicker on the y scale (flames, signals).
  flick?: boolean;
};

const PartShape: FC<{ part: Part; fill: string }> = ({ part: q, fill }) => {
  const w = q.w ?? 0;
  const h = q.h ?? 0;
  if (q.shape === "circle") return <circle r={q.r ?? w / 2} fill={fill} />;
  if (q.shape === "ellipse") return <ellipse rx={w / 2} ry={h / 2} fill={fill} />;
  if (q.shape === "rect") return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={q.r ?? 0} fill={fill} />;
  if (q.shape === "tri") return <path d={`M0 ${-h / 2} L${w / 2} ${h / 2} L${-w / 2} ${h / 2}Z`} fill={fill} strokeLinejoin="round" />;
  return <path d={q.d} fill={fill} />;
};

// Builds a figure from primitives: each part pops from its own centre with back-out(1.6), staggered 3 frames.
export const ShapeAssembler: FC<{ parts: Part[]; at: number; x?: number; y?: number; s?: number; stagger?: number; out?: number }> = ({ parts, at, x = 0, y = 0, s = 1, stagger = STAGGER_S, out }) => {
  const { t } = useTime();
  const id = useId().replace(/:/g, "");
  const gone = out !== undefined ? ramp(t, out, 0.3) : 0;
  if (gone >= 1) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * (1 - 0.1 * gone)})`} opacity={1 - gone}>
      <defs>
        {parts.map((q, i) =>
          q.grad === false ? null : (
            <linearGradient key={i} id={`${id}${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={tint(q.fill, 0.2)} />
              <stop offset="1" stopColor={shade(q.fill, 0.18)} />
            </linearGradient>
          ),
        )}
      </defs>
      {parts.map((q, i) => {
        const cue = at + (q.delay ?? i * stagger);
        const k = popIn(t, cue, 0.5);
        if (k <= 0) return null;
        const fl = q.flick ? 1 + 0.12 * Math.sin(t * 22 + i) + 0.06 * Math.sin(t * 37) : 1;
        return (
          <g key={i} transform={`translate(${q.x} ${q.y}) rotate(${q.rot ?? 0}) scale(${k} ${k * fl})`} opacity={(q.o ?? 1) * clamp01(k * 4)}>
            <PartShape part={q} fill={q.grad === false ? q.fill : `url(#${id}${i})`} />
          </g>
        );
      })}
    </g>
  );
};

// ---------- icons as part lists (about 240 px across, centred on 0,0) ----------
export const HULL = "#E8ECFF";
export const ICONS = {
  rocket: (c = CORAL): Part[] => [
    { shape: "path", x: 0, y: 110, d: "M-26 0 Q0 -10 26 0 Q14 40 0 78 Q-14 40 -26 0Z", fill: AMBER, flick: true, delay: 0.42 },
    { shape: "path", x: 0, y: 115, d: "M-12 0 Q0 -6 12 0 Q6 22 0 40 Q-6 22 -12 0Z", fill: "#FFF1C9", flick: true, grad: false, delay: 0.45 },
    { shape: "rect", x: 0, y: 10, w: 92, h: 190, r: 46, fill: HULL },
    { shape: "path", x: 0, y: -60, d: "M-46 30 Q-40 -40 0 -78 Q40 -40 46 30Z", fill: c },
    { shape: "path", x: -58, y: 70, d: "M14 -50 L14 30 L-30 48 Q-36 0 14 -50Z", fill: c },
    { shape: "path", x: 58, y: 70, d: "M-14 -50 L-14 30 L30 48 Q36 0 -14 -50Z", fill: c },
    { shape: "circle", x: 0, y: 0, r: 28, fill: shade(c, 0.35) },
    { shape: "circle", x: 0, y: 0, r: 19, fill: TEAL },
    { shape: "rect", x: 0, y: 92, w: 70, h: 18, r: 9, fill: MUTED },
  ],
  chip: (c = VIOLET): Part[] => [
    ...[-48, -16, 16, 48].flatMap((o, i): Part[] => [
      { shape: "rect", x: o, y: -102, w: 16, h: 34, r: 6, fill: MUTED, delay: 0.25 + i * 0.03 },
      { shape: "rect", x: o, y: 102, w: 16, h: 34, r: 6, fill: MUTED, delay: 0.25 + i * 0.03 },
      { shape: "rect", x: -102, y: o, w: 34, h: 16, r: 6, fill: MUTED, delay: 0.3 + i * 0.03 },
      { shape: "rect", x: 102, y: o, w: 34, h: 16, r: 6, fill: MUTED, delay: 0.3 + i * 0.03 },
    ]),
    { shape: "rect", x: 0, y: 0, w: 178, h: 178, r: 30, fill: c, delay: 0 },
    { shape: "rect", x: 0, y: 0, w: 112, h: 112, r: 20, fill: shade(c, 0.35), delay: 0.1 },
    { shape: "circle", x: 0, y: 0, r: 30, fill: TEAL, delay: 0.2 },
    { shape: "circle", x: -60, y: -60, r: 8, fill: tint(c, 0.6), delay: 0.24, grad: false },
  ],
  server: (c = TEAL): Part[] =>
    [-80, 0, 80].flatMap((y, i): Part[] => [
      { shape: "rect", x: 0, y, w: 240, h: 66, r: 18, fill: i === 1 ? tint(MUTED, 0.2) : MUTED, delay: i * 0.1 },
      { shape: "circle", x: -88, y, r: 11, fill: i === 2 ? AMBER : c, delay: 0.3 + i * 0.05, grad: false },
      { shape: "circle", x: -56, y, r: 11, fill: c, o: 0.55, delay: 0.33 + i * 0.05, grad: false },
      { shape: "rect", x: 52, y, w: 96, h: 12, r: 6, fill: shade(MUTED, 0.4), delay: 0.36 + i * 0.05, grad: false },
    ]),
  globe: (c = TEAL): Part[] => [
    { shape: "circle", x: 0, y: 0, r: 120, fill: "#3D6BD8" },
    { shape: "path", x: -30, y: -40, d: "M-50 -10 Q-40 -50 0 -46 Q40 -40 36 -6 Q30 20 6 22 Q-20 40 -40 26 Q-60 10 -50 -10Z", fill: c },
    { shape: "path", x: 50, y: 50, d: "M-30 -10 Q-10 -36 20 -24 Q40 -6 26 20 Q6 40 -18 28 Q-40 10 -30 -10Z", fill: c },
    { shape: "ellipse", x: -60, y: 70, w: 40, h: 22, fill: c },
    { shape: "path", x: 0, y: 0, d: "M-120 0 A120 120 0 0 0 120 0 A120 40 0 0 1 -120 0Z", fill: NIGHT, o: 0.18, grad: false },
  ],
  lock: (c = AMBER): Part[] => [
    { shape: "path", x: 0, y: -60, d: "M-62 40 L-62 0 A62 62 0 0 1 62 0 L62 40 L32 40 L32 0 A32 32 0 0 0 -32 0 L-32 40Z", fill: tint(MUTED, 0.35) },
    { shape: "rect", x: 0, y: 40, w: 200, h: 160, r: 30, fill: c },
    { shape: "circle", x: 0, y: 24, r: 22, fill: shade(c, 0.55), grad: false },
    { shape: "rect", x: 0, y: 54, w: 18, h: 44, r: 9, fill: shade(c, 0.55), grad: false },
  ],
  doc: (c = TEAL): Part[] => [
    { shape: "path", x: 0, y: 0, d: "M-90 -120 L50 -120 L90 -80 L90 120 Q90 130 80 130 L-80 130 Q-90 130 -90 120Z", fill: HULL },
    { shape: "path", x: 0, y: 0, d: "M50 -120 L90 -80 L56 -80 Q50 -80 50 -86Z", fill: tint(MUTED, 0.3), grad: false },
    { shape: "rect", x: -10, y: -54, w: 120, h: 18, r: 9, fill: c, grad: false },
    { shape: "rect", x: 0, y: -6, w: 140, h: 14, r: 7, fill: tint(MUTED, 0.4), grad: false },
    { shape: "rect", x: 0, y: 30, w: 140, h: 14, r: 7, fill: tint(MUTED, 0.4), grad: false },
    { shape: "rect", x: -24, y: 66, w: 92, h: 14, r: 7, fill: tint(MUTED, 0.4), grad: false },
  ],
  bolt: (c = AMBER): Part[] => [{ shape: "path", x: 0, y: 0, d: "M20 -130 L-70 20 L-6 20 L-26 130 L70 -24 L6 -24Z", fill: c }],
  satellite: (c = VIOLET): Part[] => [
    { shape: "rect", x: -130, y: 0, w: 110, h: 64, r: 10, fill: "#3D6BD8" },
    { shape: "rect", x: 130, y: 0, w: 110, h: 64, r: 10, fill: "#3D6BD8" },
    { shape: "rect", x: 0, y: 0, w: 160, h: 12, r: 6, fill: MUTED, grad: false, delay: 0 },
    { shape: "rect", x: 0, y: 0, w: 92, h: 92, r: 20, fill: c },
    { shape: "path", x: 0, y: -66, d: "M-36 0 A36 36 0 0 1 36 0Z", fill: HULL },
    { shape: "circle", x: 0, y: -84, r: 9, fill: AMBER, grad: false },
    { shape: "circle", x: 0, y: 0, r: 18, fill: TEAL },
  ],
  book: (c = CORAL): Part[] => [
    { shape: "path", x: 0, y: 0, d: "M-110 -80 Q-55 -100 0 -76 L0 96 Q-55 72 -110 92Z", fill: c },
    { shape: "path", x: 0, y: 0, d: "M110 -80 Q55 -100 0 -76 L0 96 Q55 72 110 92Z", fill: tint(c, 0.15) },
    { shape: "rect", x: 0, y: 8, w: 8, h: 170, r: 4, fill: shade(c, 0.4), grad: false },
    { shape: "rect", x: -55, y: -30, w: 70, h: 10, r: 5, fill: HULL, o: 0.6, grad: false },
    { shape: "rect", x: 55, y: -30, w: 70, h: 10, r: 5, fill: HULL, o: 0.6, grad: false },
  ],
} satisfies Record<string, (c?: string) => Part[]>;
export type IconName = keyof typeof ICONS;

// ---------- character ----------
export type CharState = "idle" | "point" | "wave" | "cheer" | "slump" | "talk";

// Arm angle in degrees from hanging straight down, positive = towards the facing side.
const armAngles = (state: CharState, d: number, t: number): [number, number] => {
  const idle: [number, number] = [14 + 3 * Math.sin(t * 1.6), -14 - 3 * Math.sin(t * 1.6 + 0.6)];
  if (d < 0 || state === "idle" || state === "talk") return state === "talk" && d >= 0 ? [30 + 14 * Math.sin(d * 5), idle[1]] : idle;
  // Anticipation (a small dip back) then the move with back-out overshoot, then damped settle.
  const go = (to: number, from: number) => {
    const ant = interpolate(d, [0, 0.12], [0, -10], { extrapolateRight: "clamp" });
    const k = interpolate(d, [0.12, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BACK });
    return from + ant * (1 - k) + (to - from) * k + wobble(d, 0.5, 4, 2.4, 5);
  };
  if (state === "point") return [go(98, idle[0]), idle[1]];
  if (state === "wave") return [go(150, idle[0]) + (d > 0.5 ? 16 * Math.sin((d - 0.5) * 9) : 0), idle[1]];
  if (state === "cheer") return [go(150, idle[0]), -go(150, -idle[1])];
  return [go(4, idle[0]), -go(4, -idle[1])];
};

export type CharacterProps = { x: number; y: number; s?: number; color?: string; at?: number; state?: CharState; stateAt?: number; facing?: 1 | -1; seed?: number; o?: number };

// Two-primitive character (pill body + round head) with legs, arms, an antenna that lags behind every move, a 3-frame blink and 1% breathing.
export const FlatCharacter: FC<CharacterProps> = ({ x, y, s = 1, color = TEAL, at = 0, state = "idle", stateAt = 0, facing = 1, seed = 1, o = 1 }) => {
  const { t, f } = useTime();
  const id = useId().replace(/:/g, "");
  const k = popIn(t, at, 0.55);
  if (k <= 0 || o <= 0) return null;
  const d = t - stateAt;
  const sq = squash(t, at, 0.16);
  const slump = state === "slump" ? ramp(t, stateAt, 0.5) : 0;
  const cheer = state === "cheer" ? ramp(t, stateAt, 0.3) : 0;
  const hop = state === "cheer" && d > 0 ? Math.abs(Math.sin(d * 7)) * 22 * Math.exp(-d * 1.2) : 0;
  const br = breathe(t, seed, 0.012);
  const [front, back] = armAngles(state, d, t);
  const sway = Math.sin(t * 1.3 + seed) * 4;
  const antenna = sway + wobble(t, at + 0.1, 26, 2.2, 3.5) + (state !== "idle" ? wobble(t, stateAt + 0.12, 18, 2.4, 3.5) : 0) - slump * 30;
  const eye = blink(f, seed) * (1 - 0.55 * slump);
  const talk = state === "talk" && d > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(d * 11) * Math.sin(d * 3.7 + 1)) : 0;
  const bodyC = color;
  const limb = shade(color, 0.28);
  const arm = (ang: number, sx: number, behind: boolean) => {
    const a = (ang * Math.PI) / 180;
    const ex = sx + Math.sin(a) * 74 * facing;
    const ey = -150 + Math.cos(a) * 74;
    return (
      <g opacity={behind ? 0.85 : 1}>
        <path d={`M${sx} -150 L${ex} ${ey}`} stroke={behind ? shade(color, 0.42) : limb} strokeWidth={22} strokeLinecap="round" />
        <circle cx={ex} cy={ey} r={15} fill={behind ? shade(color, 0.42) : tint(color, 0.15)} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y - hop}) scale(${s * k})`} opacity={o}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint(bodyC, 0.2)} />
          <stop offset="1" stopColor={shade(bodyC, 0.2)} />
        </linearGradient>
      </defs>
      <ellipse cx={0} cy={hop + 4} rx={78 - hop * 0.6} ry={14} fill={NIGHT} opacity={0.35} />
      <g transform={`scale(${sq.sx} ${sq.sy * br * (1 - slump * 0.05)})`}>
        {arm(back, -48 * facing, true)}
        <rect x={-42} y={-58} width={30} height={60} rx={15} fill={limb} />
        <rect x={12} y={-58} width={30} height={60} rx={15} fill={limb} />
        <rect x={-62} y={-200} width={124} height={160} rx={60} fill={`url(#${id}b)`} />
        <rect x={-38} y={-150} width={76} height={70} rx={30} fill={tint(bodyC, 0.35)} opacity={0.35} />
        <g transform={`translate(0 ${slump * 12}) rotate(${slump * -6 * facing + cheer * 4 * facing} 0 -210)`}>
          <g transform={`rotate(${antenna} 0 -290)`}>
            <path d="M0 -290 L0 -340" stroke={limb} strokeWidth={8} strokeLinecap="round" />
            <circle cx={0} cy={-346} r={13} fill={state === "cheer" ? AMBER : CORAL} />
          </g>
          <circle cx={0} cy={-240} r={64} fill={`url(#${id}b)`} />
          {[-24, 24].map((ex) => (
            <g key={ex} transform={`translate(${ex + 10 * facing} -248) scale(1 ${eye})`}>
              <ellipse rx={14} ry={18} fill="#FFFFFF" />
              <circle cx={5 * facing} cy={2} r={9} fill={NIGHT} />
              <circle cx={5 * facing + 3} cy={-3} r={3} fill="#FFFFFF" />
            </g>
          ))}
          {talk > 0 ? (
            <ellipse cx={10 * facing} cy={-212} rx={14} ry={4 + 10 * talk} fill={NIGHT} />
          ) : slump > 0.5 ? (
            <path d={`M${10 * facing - 14} -206 Q${10 * facing} -216 ${10 * facing + 14} -206`} stroke={NIGHT} strokeWidth={6} strokeLinecap="round" fill="none" />
          ) : (
            <path d={`M${10 * facing - 16} -216 Q${10 * facing} ${-200 + cheer * 8} ${10 * facing + 16} -216 ${cheer > 0 ? "Z" : ""}`} stroke={NIGHT} strokeWidth={6} strokeLinecap="round" fill={cheer > 0 ? NIGHT : "none"} />
          )}
          <circle cx={-34 + 10 * facing} cy={-220} r={9} fill={CORAL} opacity={0.35} />
          <circle cx={34 + 10 * facing} cy={-220} r={9} fill={CORAL} opacity={0.35} />
        </g>
        {arm(front, 48 * facing, false)}
      </g>
    </g>
  );
};

// ---------- big objects ----------
// A towering server block for scale stories: rows of rack units whose LEDs blink on seeded rhythms, with a long shadow and a soft top glow.
export const RackTower: FC<{ x: number; y: number; w: number; h: number; color?: string; at: number; rows?: number }> = ({ x, y, w, h, color = TEAL, at, rows = 9 }) => {
  const { t, f } = useTime();
  const id = useId().replace(/:/g, "");
  const k = popIn(t, at, 0.7);
  if (k <= 0) return null;
  const rh = h / rows;
  const d = 0.75 * h;
  return (
    <g transform={`translate(${x + w / 2} ${y + h}) scale(${k}) translate(${-x - w / 2} ${-y - h})`}>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint(MUTED, 0.12)} />
          <stop offset="1" stopColor={shade(MUTED, 0.35)} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={NIGHT} stopOpacity={0.45} />
          <stop offset="0.7" stopColor={NIGHT} stopOpacity={0} />
        </linearGradient>
      <path d={`M${x + w} ${y} L${x + w + d} ${y + d} L${x + w + d} ${y + h} L${x + w} ${y + h}Z`} fill={`url(#${id}s)`} />
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={color} stopOpacity={0.22} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x + w / 2} cy={y + h * 0.35} rx={w * 1.1} ry={h * 0.75} fill={`url(#${id}g)`} />
      <rect x={x} y={y} width={w} height={h} rx={28} fill={`url(#${id}t)`} />
      {Array.from({ length: rows }, (_, r) => {
        const ry = y + r * rh + rh * 0.18;
        return (
          <g key={r} opacity={clamp01(popIn(t, at + 0.25 + r * 0.05) * 2)}>
            <rect x={x + 28} y={ry} width={w - 56} height={rh * 0.64} rx={14} fill={shade(MUTED, 0.55)} />
            {Array.from({ length: 6 }, (_, c) => {
              const seed = r * 13 + c * 7;
              const on = (Math.floor(f / (8 + (seed % 9))) + seed) % 4 !== 0;
              return <circle key={c} cx={x + 64 + c * 34} cy={ry + rh * 0.32} r={8} fill={c === 5 ? AMBER : color} opacity={on ? 0.95 : 0.25} />;
            })}
            <rect x={x + w - 210} y={ry + rh * 0.32 - 6} width={150} height={12} rx={6} fill={MUTED} />
          </g>
        );
      })}
    </g>
  );
};
