// The arcade screen and its effects: night-sky background with twinkling stars, stepped mountains and brick ground, the CRT overlay, pixel wipes, the stepped iris, shake and blink.
import { useMemo, type FC, type ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { blinkOn, onN, shakeAt, since, stepP } from "./motion";
import { BG, CYAN, GROUND, GROUND_LT, INK, NIGHT, PINK, SHADE, YELLOW, snap } from "./theme";

const STAR_COLS = [INK, INK, INK, CYAN, YELLOW, PINK];

// Stars on the 8 px grid; each flips between a dot and a plus on its own 2-state step, so the sky twinkles without drifting.
export const Starfield: FC<{ n?: number; top?: number; bottom?: number; seed?: number }> = ({ n = 70, top = 40, bottom = 640, seed = 3 }) => {
  const { f } = useTime();
  const stars = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        x: snap(random(`sx${seed}${i}`) * (W - 32) + 16),
        y: snap(top + random(`sy${seed}${i}`) * (bottom - top)),
        c: STAR_COLS[Math.floor(random(`sc${seed}${i}`) * STAR_COLS.length)]!,
        big: random(`sb${seed}${i}`) > 0.62,
        period: 12 + Math.floor(random(`sp${seed}${i}`) * 4) * 6,
        phase: Math.floor(random(`sf${seed}${i}`) * 48),
      })),
    [n, top, bottom, seed],
  );
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
      {stars.map((s, i) => {
        const lit = Math.floor((f + s.phase) / s.period) % 2 === 0;
        return (
          <g key={i} fill={s.c} opacity={s.big ? 1 : 0.7}>
            <rect x={s.x} y={s.y} width={8} height={8} />
            {s.big && lit && (
              <>
                <rect x={s.x - 8} y={s.y} width={24} height={8} />
                <rect x={s.x} y={s.y - 8} width={8} height={24} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// A stepped mountain range: flat 32 px plateaus snapped to 8 px heights, with a lit left edge on every rise.
const Range: FC<{ base: number; amp: number; seed: number; fill: string; lit: string }> = ({ base, amp, seed, fill, lit }) => {
  const cols = useMemo(() => {
    const out: number[] = [];
    for (let x = 0; x < W; x += 32) {
      const u = x / W;
      const v = Math.sin(u * 9.1 + seed) * 0.5 + Math.sin(u * 23.7 + seed * 2.3) * 0.25 + random(`m${seed}${x}`) * 0.25;
      out.push(snap(base - amp * (0.5 + 0.5 * v)));
    }
    return out;
  }, [base, amp, seed]);
  return (
    <>
      {cols.map((top, i) => (
        <rect key={i} x={i * 32} y={top} width={32} height={H - top} fill={fill} />
      ))}
      {cols.map((top, i) => (i > 0 && top < cols[i - 1]! ? <rect key={`l${i}`} x={i * 32} y={top} width={8} height={cols[i - 1]! - top} fill={lit} /> : null))}
      {cols.map((top, i) => (
        <rect key={`t${i}`} x={i * 32} y={top} width={32} height={8} fill={lit} />
      ))}
    </>
  );
};

export const GROUND_Y = 1000;

// The arcade screen: night sky, a dithered horizon glow, two stepped ranges and a brick floor.
export const ArcadeScreen: FC<{ ground?: boolean; mountains?: boolean }> = ({ ground = true, mountains = true }) => (
  <AbsoluteFill style={{ background: BG }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
      <defs>
        <pattern id="pa-d25" width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill={NIGHT} />
        </pattern>
        <pattern id="pa-d50" width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill={NIGHT} />
          <rect x={8} y={8} width={8} height={8} fill={NIGHT} />
        </pattern>
        <pattern id="pa-d75" width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={16} height={16} fill={NIGHT} />
          <rect x={8} y={8} width={8} height={8} fill={BG} />
        </pattern>
        <pattern id="pa-brick" width={64} height={40} patternUnits="userSpaceOnUse">
          <rect width={64} height={40} fill={GROUND} />
          <rect y={16} width={64} height={4} fill={SHADE} />
          <rect y={36} width={64} height={4} fill={SHADE} />
          <rect x={28} width={4} height={16} fill={SHADE} />
          <rect x={60} y={20} width={4} height={16} fill={SHADE} />
          <rect x={4} y={0} width={20} height={4} fill={GROUND_LT} opacity={0.5} />
          <rect x={36} y={20} width={20} height={4} fill={GROUND_LT} opacity={0.5} />
        </pattern>
      </defs>
      {mountains && (
        <>
          <rect x={0} y={600} width={W} height={56} fill="url(#pa-d25)" />
          <rect x={0} y={656} width={W} height={56} fill="url(#pa-d50)" />
          <rect x={0} y={712} width={W} height={56} fill="url(#pa-d75)" />
          <rect x={0} y={768} width={W} height={H - 768} fill={NIGHT} />
        </>
      )}
    </svg>
    <Starfield />
    {mountains && (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
        <Range base={900} amp={200} seed={1.7} fill="#1C2556" lit={NIGHT} />
        <Range base={960} amp={110} seed={4.2} fill={GROUND} lit={GROUND_LT} />
      </svg>
    )}
    {ground && (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
        <rect x={0} y={GROUND_Y} width={W} height={H - GROUND_Y} fill="url(#pa-brick)" />
        <rect x={0} y={GROUND_Y} width={W} height={8} fill={GROUND_LT} />
        <rect x={0} y={GROUND_Y + 8} width={W} height={4} fill={SHADE} />
      </svg>
    )}
  </AbsoluteFill>
);

// The CRT glass, laid over a finished scene: 4 px scanlines and a soft dark vignette, both static so text stays readable.
export const CRT: FC<{ lines?: number; vignette?: number }> = ({ lines = 0.18, vignette = 0.4 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: `repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(5,7,26,${lines}) 2px, rgba(5,7,26,${lines}) 4px)` }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 62%, rgba(5,7,26,${vignette}) 100%)` }} />
  </AbsoluteFill>
);

export type WipeProps = { at: number; mode?: "cover" | "reveal"; kind?: "columns" | "dissolve"; cell?: number; d?: number; color?: string; seed?: number };

// Pixel transition. columns: each 120 px column stacks shut top to bottom, staggered 1 f per column. dissolve: seeded cells blink on (cover) or off (reveal) over d frames.
export const PixelWipe: FC<WipeProps> = ({ at, mode = "cover", kind = "columns", cell, d = 12, color = SHADE, seed = 7 }) => {
  const { f } = useTime();
  const lf = since(f, at);
  const size = cell ?? (kind === "columns" ? 120 : 60);
  const cols = Math.ceil(W / size);
  const rows = Math.ceil(H / size);
  if (lf < 0) return mode === "reveal" ? <AbsoluteFill style={{ background: color }} /> : null;
  const rects: ReactNode[] = [];
  if (kind === "columns") {
    for (let c = 0; c < cols; c++) {
      const k = Math.max(0, Math.min(rows, Math.floor((lf - c) * 1.5)));
      // Cover stacks cells down from the top; reveal clears them from the top in the same order.
      const [y0, n] = mode === "cover" ? [0, k] : [k, rows - k];
      if (n > 0) rects.push(<rect key={c} x={c * size} y={y0 * size} width={size} height={n * size} fill={color} />);
    }
  } else {
    const p = stepP(lf, d);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const thr = random(`pw${seed}-${r}-${c}`);
        const on = mode === "cover" ? thr < p : thr >= p;
        if (on) rects.push(<rect key={`${r}-${c}`} x={c * size} y={r * size} width={size} height={size} fill={color} />);
      }
  }
  if (!rects.length) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
};

// Frames a PixelWipe needs to finish.
export const wipeFrames = (kind: "columns" | "dissolve" = "columns", d = 12) => (kind === "columns" ? Math.ceil(W / 120) + 6 : d);

export type IrisProps = { at: number; d?: number; mode?: "close" | "open"; cx?: number; cy?: number; to?: number; from?: number; color?: string };

// Circle iris drawn as 8 px stair-stepped rows; the radius snaps to 8 px and changes on 2s. `from` starts a close from a smaller circle (a two-stage iris).
export const Iris: FC<IrisProps> = ({ at, d = 18, mode = "close", cx = W / 2, cy = H / 2, to = 0, from, color = SHADE }) => {
  const { f } = useTime();
  const lf = since(f, at);
  const full = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 16;
  const p = stepP(lf, d);
  const e = 1 - Math.pow(1 - p, 2);
  const wide = from ?? full;
  const r = snap(mode === "close" ? wide + (to - wide) * e : to + (wide - to) * e);
  if (lf < 0 && mode === "close") return null;
  if (r >= full) return null;
  const rects: ReactNode[] = [];
  for (let y = 0; y < H; y += 8) {
    const dy = y + 4 - cy;
    if (Math.abs(dy) >= r) {
      rects.push(<rect key={y} x={0} y={y} width={W} height={8} fill={color} />);
      continue;
    }
    const hw = snap(Math.sqrt(r * r - dy * dy));
    rects.push(<rect key={`a${y}`} x={0} y={y} width={Math.max(0, cx - hw)} height={8} fill={color} />);
    rects.push(<rect key={`b${y}`} x={cx + hw} y={y} width={Math.max(0, W - cx - hw)} height={8} fill={color} />);
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
};

// Stepped 4 px screen shake on each cue (seconds), 12 frames long.
export const Shake: FC<{ cues: number[]; d?: number; amp?: number; children: ReactNode }> = ({ cues, d = 12, amp = 4, children }) => {
  const { f } = useTime();
  let off = { x: 0, y: 0 };
  cues.forEach((c, i) => {
    const s = shakeAt(since(f, c), d, amp, i + 1);
    if (s.x || s.y) off = s;
  });
  return <AbsoluteFill style={{ transform: `translate(${off.x}px, ${off.y}px)` }}>{children}</AbsoluteFill>;
};

// Shows its children only on the "on" half of a blink (4 Hz default), from a cue onward.
export const Blink: FC<{ from?: number; hz?: number; children: ReactNode }> = ({ from = 0, hz = 4, children }) => {
  const { f } = useTime();
  const lf = since(f, from);
  if (lf < 0) return null;
  const period = Math.max(2, Math.round(30 / hz));
  return blinkOn(onN(lf, 1), period) ? <>{children}</> : null;
};
