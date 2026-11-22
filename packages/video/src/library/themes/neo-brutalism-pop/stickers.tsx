// Neo-brutalism stickers: flat outlined stars, sparks, sunbursts, clover blobs, asterisks and thick coins, plus StickerBurst which crops them around the frame edge with a pop and idle spin.
import type { FC } from "react";
import { random } from "remotion";
import { H, W } from "../../core/video";
import { GREEN, INK, SHOUT } from "./theme";
import { idle, pop, useF } from "./primitives";

export type StickerShape = "star" | "spark" | "burst" | "blob" | "asterisk" | "coin";

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;

// Tips joined by quadratic curves pulled in towards the centre: the concave, spiky star of the reference.
const curvedStar = (n: number, R: number, pull: number) => {
  const a0 = -Math.PI / 2;
  let d = `M ${pt(R, a0)}`;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * 2 * Math.PI) / n;
    const b = a0 + ((i + 1) * 2 * Math.PI) / n;
    d += ` Q ${pt(R * pull, (a + b) / 2)} ${pt(R, b)}`;
  }
  return `${d} Z`;
};

const sawStar = (n: number, R: number, inner: number) => {
  const pts = Array.from({ length: n * 2 }, (_, i) => pt(i % 2 ? R * inner : R, -Math.PI / 2 + (i * Math.PI) / n));
  return `M ${pts.join(" L ")} Z`;
};

const blobPath = (R: number, seed: number) => {
  const lobes = 3 + Math.floor(random(`lobes${seed}`) * 2);
  const ph = random(`bph${seed}`) * 6.28;
  const pts = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * 2 * Math.PI;
    return pt(R * (0.74 + 0.26 * Math.cos(lobes * a + ph)), a);
  });
  return `M ${pts.join(" L ")} Z`;
};

// One sticker drawn around (0, 0) with radius r; strokes stay 4 px at any size.
export const StickerSvg: FC<{ shape: StickerShape; r: number; color: string; seed?: number; glyph?: string }> = ({ shape, r, color, seed = 1, glyph = "$" }) => {
  const sw = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  if (shape === "star") return <path d={curvedStar(5, r, 0.18)} fill={color} {...sw} />;
  if (shape === "spark") return <path d={curvedStar(4, r, 0.06)} fill={color} {...sw} />;
  if (shape === "burst") return <path d={sawStar(16, r, 0.7)} fill={color} {...sw} />;
  if (shape === "blob") return <path d={blobPath(r, seed)} fill={color} {...sw} />;
  if (shape === "asterisk") {
    // Black wide bars under accent narrow bars read as one outlined union, with no seams where the bars cross.
    const bars = [0, 60, 120].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x1: -r * Math.cos(a), y1: -r * Math.sin(a), x2: r * Math.cos(a), y2: r * Math.sin(a) };
    });
    const bw = r * 0.34;
    return (
      <g strokeLinecap="round">
        {bars.map((b, i) => <line key={`o${i}`} {...b} stroke={INK} strokeWidth={bw + 8} />)}
        {bars.map((b, i) => <line key={`i${i}`} {...b} stroke={color} strokeWidth={bw} />)}
      </g>
    );
  }
  // Coin: a thick disc seen at a tilt, edge first, face on top, with a chunky glyph.
  const ry = r * 0.62;
  const depth = r * 0.22;
  return (
    <g>
      <ellipse cx={0} cy={depth} rx={r} ry={ry} fill={color} {...sw} />
      <rect x={-r} y={0} width={r * 2} height={depth} fill={color} />
      <line x1={-r} y1={0} x2={-r} y2={depth} stroke={INK} strokeWidth={4} />
      <line x1={r} y1={0} x2={r} y2={depth} stroke={INK} strokeWidth={4} />
      <ellipse cx={0} cy={0} rx={r} ry={ry} fill={color} {...sw} />
      <text x={0} y={ry * 0.36} textAnchor="middle" fontFamily={SHOUT} fontSize={r * 1.05} fill={INK} transform={`scale(1 ${ry / r + 0.15})`}>
        {glyph}
      </text>
    </g>
  );
};

export type StickerItem = { shape: StickerShape; x: number; y: number; r: number; color: string; rot?: number; seed?: number; glyph?: string };

// A positioned sticker that pops at `at` and then idles (slow spin, 6 px bob, stars step-scale).
export const StickerAt: FC<{ item: StickerItem; at: number }> = ({ item, at }) => {
  const f = useF();
  const p = pop(f, at);
  if (p <= 0) return null;
  const seed = item.seed ?? 1;
  const id = idle(f, seed);
  const stepScale = item.shape === "star" || item.shape === "spark" || item.shape === "burst" ? id.step : 1;
  return (
    <g transform={`translate(${item.x} ${item.y + id.bob}) rotate(${(item.rot ?? 0) + id.rot}) scale(${p * stepScale})`}>
      <StickerSvg shape={item.shape} r={item.r} color={item.color} seed={seed} glyph={item.glyph} />
    </g>
  );
};

// A sticker as an inline element (e.g. the burst beside a keyword); size is its box in px.
export const Sticker: FC<{ shape: StickerShape; size: number; color: string; at?: number; seed?: number; rot?: number; glyph?: string }> = ({ shape, size, color, at = 0, seed = 1, rot = 0, glyph }) => (
  <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{ overflow: "visible", display: "inline-block", verticalAlign: "middle" }}>
    <StickerAt at={at} item={{ shape, x: 0, y: 0, r: size / 2 - 4, color, rot, seed, glyph }} />
  </svg>
);

// Seeded placements around the frame edge, each partly cropped by it; corners and the centre stay clear.
export const edgeLayout = (n: number, shapes: StickerShape[], palette: string[], seed = 1): StickerItem[] => {
  const per = 2 * (W + H);
  const start = random(`start${seed}`) * per;
  return Array.from({ length: n }, (_, i) => {
    const u = (start + ((i + 0.5 + (random(`j${seed}-${i}`) - 0.5) * 0.5) * per) / n) % per;
    const r = 58 + random(`r${seed}-${i}`) * 52;
    const inset = r * (0.15 + random(`in${seed}-${i}`) * 0.35);
    let x: number;
    let y: number;
    if (u < W) [x, y] = [u, inset];
    else if (u < W + H) [x, y] = [W - inset, u - W];
    else if (u < 2 * W + H) [x, y] = [W - (u - W - H), H - inset];
    else [x, y] = [inset, H - (u - 2 * W - H)];
    x = Math.min(W - inset, Math.max(inset, x));
    y = Math.min(H - inset, Math.max(inset, y));
    return { shape: shapes[i % shapes.length]!, x, y, r, color: palette[i % palette.length]!, rot: random(`rot${seed}-${i}`) * 60 - 30, seed: seed * 31 + i };
  });
};

// Stickers placed around the frame edge, popping in with a 3-frame stagger from `at`, then idling. Pass `items` to place them by hand.
export const StickerBurst: FC<{ shapes?: StickerShape[]; palette?: string[]; seed?: number; count?: number; at?: number; items?: StickerItem[] }> = ({
  shapes = ["star", "blob", "spark", "burst"],
  palette = [GREEN],
  seed = 1,
  count = 8,
  at = 0,
  items,
}) => {
  const list = items ?? edgeLayout(count, shapes, palette, seed);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {list.map((it, i) => <StickerAt key={i} item={it} at={at + (i * 3) / 30} />)}
    </svg>
  );
};
