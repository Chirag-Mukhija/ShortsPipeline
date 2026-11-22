// Cut-paper collage icons: each one is two to five scissor-cut layers stacked with contact shadows, drawn in a 200×200 box.
import type { FC, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { CORE, CREAM, INK, MUSTARD, STEP, TEAL, TEAL_DK, TEAL_LT, TOMATO, TOMATO_DK } from "./theme";
import { Layer, Piece } from "./paper";
import { burst, cutCircle, cutEllipse, cutPoly, cutRect, cutRound, pathOf } from "./shapes";
import type { Pose } from "./stop";

const d = pathOf;

export const Bulb: FC<{ seed?: number }> = ({ seed = 1 }) => (
  <>
    <path d={d([...cutCircle(100, 82, 58, seed, 16)])} fill={MUSTARD} />
    <path d={d(cutPoly([[72, 118], [128, 118], [122, 146], [78, 146]], seed + 1, 2))} fill={MUSTARD} />
    <Layer d={d(cutRect(74, 146, 52, 14, seed + 2, 1.5))} fill={TEAL} />
    <Layer d={d(cutRect(78, 160, 44, 13, seed + 3, 1.5))} fill={TEAL_DK} />
    <Layer d={d(cutPoly([[90, 173], [110, 173], [104, 184], [96, 184]], seed + 4, 1))} fill={INK} />
    <Layer d={d(cutEllipse(80, 62, 12, 22, seed + 5, 10))} fill={CORE} o={0.85} />
    {[-60, -25, 25, 60].map((a, i) => {
      const r = ((a - 90) * Math.PI) / 180;
      const [cx, cy] = [100 + Math.cos(r) * 86, 82 + Math.sin(r) * 86];
      return <Layer key={i} d={d(cutPoly(([[cx - 5, cy - 14], [cx + 5, cy - 14], [cx + 4, cy + 14], [cx - 4, cy + 14]] as [number, number][]).map((q) => rot(q, [cx, cy], a)), seed + 10 + i, 1.2))} fill={TOMATO} />;
    })}
  </>
);

const rot = (p: [number, number], c: [number, number], deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const [x, y] = [p[0] - c[0], p[1] - c[1]];
  return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
};

export const Laptop: FC<{ seed?: number }> = ({ seed = 1 }) => (
  <>
    <path d={d(cutRound(28, 34, 144, 100, 10, seed))} fill={INK} />
    <path d={d(cutPoly([[16, 136], [184, 136], [196, 158], [4, 158]], seed + 1, 2))} fill={CREAM} />
    <Layer d={d(cutRect(40, 46, 120, 76, seed + 2, 2))} fill={TEAL} />
    <Layer d={d(cutRect(52, 60, 58, 9, seed + 3, 1))} fill={MUSTARD} />
    <Layer d={d(cutRect(52, 78, 82, 9, seed + 4, 1))} fill={CORE} />
    <Layer d={d(cutRect(64, 96, 46, 9, seed + 5, 1))} fill={TOMATO} />
    <Layer d={d(cutRect(84, 140, 32, 6, seed + 6, 1))} fill={TEAL_LT} />
  </>
);

// The flame is replaced every hold, like swapping cut pieces under the camera.
export const Rocket: FC<{ seed?: number }> = ({ seed = 1 }) => {
  const k = Math.floor(useCurrentFrame() / STEP) % 3;
  return (
    <>
      <path d={d(cutPoly([[100, 8], [130, 50], [134, 140], [66, 140], [70, 50]], seed, 2))} fill={CREAM} />
      <Layer d={d(cutPoly([[100, 8], [128, 48], [72, 48]], seed + 1, 1.5))} fill={TOMATO} />
      <Layer d={d(cutPoly([[66, 100], [40, 150], [72, 140]], seed + 2, 1.5))} fill={TOMATO} />
      <Layer d={d(cutPoly([[134, 100], [160, 150], [128, 140]], seed + 3, 1.5))} fill={TOMATO} />
      <Layer d={d(cutCircle(100, 86, 20, seed + 4, 12))} fill={TEAL_DK} />
      <Layer d={d(cutCircle(100, 86, 13, seed + 5, 10))} fill={TEAL_LT} />
      <Layer d={d(cutPoly([[76, 142], [124, 142], [112 + k * 2, 176 + k * 5], [100, 196 - k * 6], [88 - k * 2, 178 + k * 3]], seed + 6 + k, 2))} fill={MUSTARD} />
      <Layer d={d(cutPoly([[88, 142], [112, 142], [104, 162 + k * 4], [100, 172 - k * 3], [96, 160]], seed + 9 + k, 1.5))} fill={TOMATO} />
    </>
  );
};

export const PlayCard: FC<{ seed?: number }> = ({ seed = 1 }) => (
  <>
    <path d={d(cutRound(18, 40, 164, 118, 16, seed))} fill={TOMATO} />
    <Layer d={d(cutPoly([[82, 70], [82, 128], [130, 99]], seed + 1, 2))} fill={CORE} />
    <Layer d={d(cutRect(30, 140, 110, 7, seed + 2, 1))} fill={TOMATO_DK} />
  </>
);

export const Tick: FC<{ seed?: number; color?: string }> = ({ seed = 1, color = TOMATO }) => (
  <path d={d(cutPoly([[20, 104], [52, 74], [84, 108], [156, 30], [186, 60], [84, 168]], seed, 3))} fill={color} />
);

// Prize rosette: a pinked burst, a disc and two ribbon tails with V-cut ends.
export const Rosette: FC<{ seed?: number }> = ({ seed = 1 }) => (
  <>
    <path d={d(cutPoly([[70, 110], [98, 118], [74, 196], [62, 178], [44, 186]], seed + 1, 2))} fill={TEAL} />
    <path d={d(cutPoly([[130, 110], [102, 118], [126, 196], [138, 178], [156, 186]], seed + 2, 2))} fill={TEAL_DK} />
    <Layer d={d(burst(100, 84, 70, 56, 18, seed + 3))} fill={MUSTARD} />
    <Layer d={d(cutCircle(100, 84, 46, seed + 4, 16))} fill={TOMATO} />
    <Layer d={d(burst(100, 84, 22, 9, 5, seed + 5))} fill={CORE} />
  </>
);

// Wraps an icon as a PaperPiece of a given size.
export const Icon: FC<{ x: number; y: number; size?: number; z?: number; pose?: Partial<Pose>; r?: number; seed?: number; children: ReactNode }> = ({ x, y, size = 200, z = 1, pose, r, seed = 1, children }) => {
  const box = size * 1.1;
  return (
    <Piece x={x} y={y} w={box} h={box} z={z} pose={pose} r={r} seed={seed}>
      <g transform={`translate(${size * 0.05} ${size * 0.05}) scale(${size / 200})`}>{children}</g>
    </Piece>
  );
};
