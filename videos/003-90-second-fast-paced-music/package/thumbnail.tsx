// Video 003's thumbnail (package.md, pairing 1): the film's torn QR code, read lime up to the wound, modules flying out, "PARTLY MISSING". No face, by plan.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { STYLES } from "@kit/styles";
import { HOLE, inHole, MATRIX, SIZE } from "../edit/scenes/cut/qr";
import { THUMB_H, THUMB_W, type ThumbProps } from "../../../packages/video/src/thumb";

const VOID = "#0B0B0F";
const WHITE = "#FFFFFF";
const INK = "#111111";
const RED = "#FF3B2F";
const LIME = "#D7FF3A";
const FONT = STYLES["studio"]!.display;

const M = 20;
const QUIET = 2;
const N = SIZE + QUIET * 2;
const TILE = N * M;
const X = 530;
const Y = Math.round((THUMB_H - TILE) / 2);
const at = (r: number, c: number) => ({ x: X + (c + QUIET) * M, y: Y + (r + QUIET) * M });
const centreCol = HOLE.reduce((s, [, c]) => s + c, 0) / HOLE.length;
const centreRow = HOLE.reduce((s, [r]) => s + r, 0) / HOLE.length;
const SCAN = X + (centreCol + QUIET) * M;

const cells = (on: (r: number, c: number) => boolean) => {
  let d = "";
  for (let r = -QUIET; r < SIZE + QUIET; r++) for (let c = -QUIET; c < SIZE + QUIET; c++) {
    if (!on(r, c)) continue;
    const { x, y } = at(r, c);
    d += `M${x} ${y}h${M + 0.5}v${M + 0.5}h${-M - 0.5}z`;
  }
  return d;
};
const inCode = (r: number, c: number) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
const hole = (r: number, c: number) => inCode(r, c) && inHole(r, c);
const dark = (r: number, c: number) => inCode(r, c) && MATRIX[r]![c]!;
const tileCells = cells((r, c) => !hole(r, c));
const limeCells = cells((r, c) => !hole(r, c) && !dark(r, c) && at(r, c).x + M / 2 < SCAN);
const inkCells = cells((r, c) => dark(r, c) && !hole(r, c));

const hash = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// Loose modules thrown up and to the right of the wound.
const PIECES = Array.from({ length: 12 }, (_, i) => {
  const a = (-58 + i * 5.4 + hash(i, 3) * 12) * (Math.PI / 180);
  const d = 120 + 46 * i * (0.75 + 0.5 * hash(i, 1));
  return { x: X + (centreCol + QUIET) * M + Math.cos(a) * d, y: Y + (centreRow + QUIET) * M + Math.sin(a) * d, s: M + 4 + 16 * hash(i, 2), r: hash(i, 4) * 80 - 40, ink: hash(i, 5) < 0.35 };
}).filter((p) => p.x < THUMB_W - 20 && p.y > 16);

const edges = HOLE.flatMap(([r, c]) => {
  const { x, y } = at(r, c);
  return [
    [hole(r - 1, c), `M${x} ${y}h${M}`],
    [hole(r + 1, c), `M${x} ${y + M}h${M}`],
    [hole(r, c - 1), `M${x} ${y}v${M}`],
    [hole(r, c + 1), `M${x + M} ${y}v${M}`],
  ].flatMap(([inside, d]) => (inside ? [] : [d as string]));
}).join("");

const Thumbnail: FC<ThumbProps> = () => (
  <AbsoluteFill style={{ background: VOID, overflow: "hidden" }}>
    <svg width={THUMB_W} height={THUMB_H} style={{ position: "absolute", inset: 0 }}>
      <path d={tileCells} fill={WHITE} />
      <path d={limeCells} fill={LIME} />
      <path d={inkCells} fill={INK} />
      <path d={edges} fill="none" stroke={RED} strokeWidth={18} opacity={0.3} strokeLinecap="square" />
      <path d={edges} fill="none" stroke={RED} strokeWidth={7} strokeLinecap="square" />
      <rect x={SCAN - 5} y={Y - 26} width={10} height={TILE + 52} fill={LIME} />
      {PIECES.map((p, i) => (
        <rect key={i} x={p.x - p.s / 2} y={p.y - p.s / 2} width={p.s} height={p.s} fill={p.ink ? INK : WHITE} stroke={RED} strokeWidth={4} transform={`rotate(${p.r} ${p.x} ${p.y})`} />
      ))}
    </svg>
    <div style={{ position: "absolute", left: 40, bottom: 52, fontFamily: FONT, fontWeight: 900, fontVariationSettings: '"wght" 900', color: WHITE, fontSize: 112, lineHeight: 0.94, letterSpacing: "-0.05em" }}>
      <div>PARTLY</div>
      <div>MISSING</div>
    </div>
  </AbsoluteFill>
);

export default Thumbnail;
