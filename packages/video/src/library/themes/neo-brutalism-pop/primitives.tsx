// Neo-brutalism primitives: the frame-driven motion vocabulary (drop with squash, sticker pop, stepped idle, exit, jiggle, punch), the bordered box, the dropping card, the pop wrapper, the mono chip and the grid-paper field.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, spring } from "remotion";
import { FPS } from "../../core/video";
import { useTime } from "../../core/time";
import { BORDER, INK, MONO, PAPER, RADIUS, SHADOW, SKY, WHITE, border, hardShadow } from "./theme";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Cue times arrive in seconds (narration word times); the vocabulary is specified in frames.
export const fr = (s: number) => Math.round(s * FPS);
export const EXPO: (x: number) => number = Easing.inOut(Easing.exp);
export const useF = () => useTime().f;

// Card drop: spring (stiffness 220, damping 14) from 60 px up; it stretches while falling and squashes on the overshoot, and its shadow grows in 3 frames behind.
export const drop = (f: number, at: number, from = -60) => {
  const d = f - fr(at);
  if (d < 0) return { on: false, y: from, sx: 1, sy: 1, shadow: 0 };
  const cfg = { stiffness: 220, damping: 14, mass: 1 };
  const s = spring({ frame: d, fps: FPS, config: cfg });
  const over = Math.max(0, s - 1);
  const under = Math.max(0, 1 - s);
  const sh = Math.min(1, spring({ frame: d - 3, fps: FPS, config: cfg }));
  return { on: true, y: (1 - s) * from, sx: 1 + over * 0.45 - under * 0.04, sy: 1 - over * 0.6 + under * 0.08, shadow: d < 3 ? 0 : sh };
};

// Sticker pop: 0 → ~1.15 → 1 on a back-out(2) curve over 10 frames.
export const pop = (f: number, at: number, dur = 10) => {
  const d = f - fr(at);
  if (d < 0) return 0;
  return interpolate(d, [0, dur], [0, 1], { ...C, easing: Easing.out(Easing.back(2)) });
};

// Exit: scale to 0.9 while the shadow collapses, 6 frames ease-in, then a hard cut.
export const squashOut = (f: number, at?: number) => {
  if (at === undefined) return { gone: false, s: 1, k: 1 };
  const d = f - fr(at);
  const e = interpolate(d, [0, 6], [0, 1], { ...C, easing: Easing.in(Easing.cubic) });
  return { gone: d >= 6, s: 1 - 0.1 * e, k: 1 - e };
};

// Jiggle ±deg for n frames, flipping every 2 frames (stepped, never smoothed).
export const jiggle = (f: number, at: number, n = 6, deg = 2) => {
  const d = f - fr(at);
  if (d < 0 || d >= n) return 0;
  return Math.floor(d / 2) % 2 === 0 ? deg : -deg;
};

// The only camera move this theme allows: a 1.04 scale punch on a beat.
export const punch = (f: number, at: number) => interpolate(f - fr(at), [0, 2, 10], [1, 1.04, 1], { ...C, easing: Easing.out(Easing.quad) });

// Idle life: a slow 0.3°/s spin, a 6 px bob on a 90-frame sine, and stars stepping between 1 and 1.08 every 15 frames.
export const idle = (f: number, seed: number) => {
  const dir = random(`dir${seed}`) > 0.5 ? 1 : -1;
  return {
    rot: dir * 0.3 * (f / FPS),
    bob: 6 * Math.sin((2 * Math.PI * f) / 90 + random(`ph${seed}`) * 6.28),
    step: Math.floor(f / 15 + seed) % 2 === 0 ? 1 : 1.08,
  };
};

export type BoxProps = { bg?: string; shadow?: number; radius?: number; borderW?: number; style?: CSSProperties; children?: ReactNode };

// The basic surface: flat fill, 4 px black border, hard black shadow.
export const Box: FC<BoxProps> = ({ bg = WHITE, shadow = SHADOW, radius = RADIUS, borderW = BORDER, style, children }) => (
  <div style={{ position: "relative", boxSizing: "border-box", background: bg, border: border(borderW), borderRadius: radius, boxShadow: hardShadow(shadow), ...style }}>{children}</div>
);

export type CardProps = { at: number; x: number; y: number; w: number; h?: number; bg?: string; shadowSize?: number; radius?: number; rotate?: number; outAt?: number; style?: CSSProperties; children?: ReactNode };

// A bordered card that drops in at `at` with squash and a growing shadow; `outAt` squashes it out.
export const BrutalCard: FC<CardProps> = ({ at, x, y, w, h, bg = WHITE, shadowSize = SHADOW, radius = RADIUS, rotate = 0, outAt, style, children }) => {
  const f = useF();
  const d = drop(f, at);
  const out = squashOut(f, outAt);
  if (!d.on || out.gone) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateY(${d.y}px) rotate(${rotate}deg) scale(${d.sx * out.s}, ${d.sy * out.s})`, transformOrigin: "50% 100%" }}>
      <Box bg={bg} shadow={shadowSize * d.shadow * out.k} radius={radius} style={{ width: "100%", height: h === undefined ? undefined : "100%", ...style }}>
        {children}
      </Box>
    </div>
  );
};

// Pops anything in around its centre (x, y) at `at`.
export const Pop: FC<{ at: number; x: number; y: number; rotate?: number; dur?: number; children: ReactNode }> = ({ at, x, y, rotate = 0, dur, children }) => {
  const f = useF();
  const p = pop(f, at, dur);
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${p})` }}>{children}</div>;
};

// A tiny Space Mono label in a bordered chip: kickers, axis labels, "SOURCE".
export const Chip: FC<{ text: string; bg?: string; color?: string; size?: number; shadow?: number; style?: CSSProperties }> = ({ text, bg = WHITE, color = INK, size = 28, shadow = 0, style }) => (
  <div style={{ display: "inline-block", fontFamily: MONO, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: "0.04em", textTransform: "uppercase", color, background: bg, border: border(3), borderRadius: 6, padding: `${size * 0.32}px ${size * 0.5}px`, boxShadow: hardShadow(shadow), whiteSpace: "nowrap", ...style }}>
    {text}
  </div>
);

// Flat field with a faint square grid that drifts slowly down-right, so holds never freeze.
export const GridPaper: FC<{ tone?: "paper" | "sky"; bg?: string; cell?: number; alpha?: number }> = ({ tone = "paper", bg, cell = 64, alpha }) => {
  const f = useF();
  const line = `rgba(0,0,0,${alpha ?? (tone === "sky" ? 0.08 : 0.06)})`;
  const off = (f * 0.25) % cell;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg ?? (tone === "sky" ? SKY : PAPER),
        backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${off - 1}px ${off - 1}px`,
      }}
    />
  );
};

export const Paper: FC = () => <GridPaper tone="paper" />;
