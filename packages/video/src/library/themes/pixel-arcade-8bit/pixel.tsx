// Pixel primitives: crisp SVG sprites with frame stepping, the bitmap title font, Press Start 2P text with a hard shadow, notched pixel panels and grid placement.
import { useMemo, type CSSProperties, type FC, type ReactNode } from "react";
import { useTime } from "../../core/time";
import { GAP, bitWidth, glyphRuns, glyphW } from "./font";
import { INK, NIGHT, PX, SHADE, SPAL, snap } from "./theme";
import type { SpriteMap } from "./sprites";

// Absolute placement on the 1920x1080 canvas; ax/ay pick the anchor (0.5 = centre). Snapped so pixel art never lands on half pixels.
export const Place: FC<{ x: number; y: number; ax?: number; ay?: number; z?: number; style?: CSSProperties; children: ReactNode }> = ({ x, y, ax = 0.5, ay = 0.5, z, style, children }) => (
  <div style={{ position: "absolute", left: snap(x, 4), top: snap(y, 4), width: "max-content", transform: `translate(${-ax * 100}%, ${-ay * 100}%)`, zIndex: z, ...style }}>{children}</div>
);

type Cell = { x: number; y: number; w: number; c: string };
const spriteRuns = (map: SpriteMap): Cell[] => {
  const out: Cell[] = [];
  map.forEach((row, y) => {
    let start = 0;
    for (let i = 1; i <= row.length; i++) {
      if (row[i] !== row[start]) {
        if (row[start] !== ".") out.push({ x: start, y, w: i - start, c: row[start]! });
        start = i;
      }
    }
  });
  return out;
};

export type SpriteProps = { map: SpriteMap; px?: number; flip?: boolean; tint?: string; opacity?: number; style?: CSSProperties };

// One sprite pose at an integer pixel scale; `tint` repaints every pixel one colour (hit flash, silhouette).
export const Sprite: FC<SpriteProps> = ({ map, px = 8, flip, tint, opacity = 1, style }) => {
  const cells = useMemo(() => spriteRuns(map), [map]);
  const w = map[0]!.length;
  const h = map.length;
  return (
    <svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ display: "block", imageRendering: "pixelated", opacity, transform: flip ? "scaleX(-1)" : undefined, ...style }}>
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={1} fill={tint ?? SPAL[c.c] ?? "#f0f"} />
      ))}
    </svg>
  );
};

// A sprite that steps through its poses every `every` frames (6 = the board's 2-frame walk cycle).
export const SpriteAnim: FC<Omit<SpriteProps, "map"> & { frames: SpriteMap[]; every?: number; offset?: number }> = ({ frames, every = 6, offset = 0, ...rest }) => {
  const { f } = useTime();
  return <Sprite map={frames[Math.floor((f + offset) / every) % frames.length]!} {...rest} />;
};

export type CharLook = { dy?: number; s?: number; color?: string; shadow?: string | false; hide?: boolean };
export type BitTextProps = {
  text: string;
  px?: number;
  color?: string;
  // One colour per glyph row (7 rows), top to bottom, for banded arcade logos.
  bands?: string[];
  shadow?: string | false;
  outline?: string | false;
  bold?: boolean;
  ch?: (i: number) => CharLook;
  style?: CSSProperties;
};

// Outline and shadow thickness in glyph pixels: half a glyph pixel at big sizes so the 5x7 counters stay open.
const edgeFor = (px: number) => (px >= 10 ? 0.5 : 1);

// Text in the theme's own bitmap font, drawn as pixel runs in three passes (extruded shadow, outline, fill) so neighbours never cover each other.
export const BitText: FC<BitTextProps> = ({ text, px = 8, color = INK, bands, shadow = SHADE, outline = false, bold = true, ch, style }) => {
  const gw = glyphW(bold);
  const e = edgeFor(px);
  const pad = outline ? e : 0;
  const sh = shadow ? e : 0;
  const wU = bitWidth(text, bold) + pad * 2 + sh;
  const hU = 7 + pad * 2 + sh;
  const chars = [...text].map((c, i) => ({ c, i, look: ch?.(i) ?? {} })).filter((x) => !x.look.hide && x.c !== " ");
  // A run grown by `g` on every side is exactly that run's 8-way outline.
  const pass = (kind: "s" | "o" | "f") =>
    chars.map(({ c, i, look }) => {
      const runs = glyphRuns(c, bold);
      const ox = pad + i * (gw + GAP);
      const cx = ox + gw / 2;
      const cy = pad + 3.5;
      const s = look.s ?? 1;
      const shCol = look.shadow === undefined ? shadow : look.shadow;
      if (kind === "s" && !shCol) return null;
      const g = kind === "f" || !outline ? 0 : e;
      const d = kind === "s" ? e : 0;
      return (
        <g key={`${kind}${i}`} transform={`translate(${cx} ${cy + (look.dy ?? 0)}) scale(${s}) translate(${-cx} ${-cy})`}>
          {runs.map((r, j) => (
            <rect key={j} x={ox + r.x - g + d} y={pad + r.y - g + d} width={r.w + g * 2} height={1 + g * 2} fill={kind === "s" ? (shCol as string) : kind === "o" ? (outline as string) : look.color ?? bands?.[r.y] ?? color} />
          ))}
        </g>
      );
    });
  return (
    <svg width={wU * px} height={hU * px} viewBox={`0 0 ${wU} ${hU}`} shapeRendering="crispEdges" overflow="visible" style={{ display: "block", overflow: "visible", ...style }}>
      {pass("s")}
      {outline && pass("o")}
      {pass("f")}
    </svg>
  );
};

// Pixel width of a BitText at a scale, for layout.
export const bitPx = (text: string, px: number, opts: { outline?: boolean; shadow?: boolean } = {}) =>
  (bitWidth(text) + (opts.outline ? 2 * edgeFor(px) : 0) + (opts.shadow === false ? 0 : edgeFor(px))) * px;

export type PxTextProps = { text: string; size?: number; color?: string; shadow?: string | false; n?: number; lh?: number; align?: CSSProperties["textAlign"]; style?: CSSProperties };

// Press Start 2P with a hard shadow; `n` types it on without reflowing (untyped characters stay as invisible space).
export const PxText: FC<PxTextProps> = ({ text, size = 32, color = INK, shadow = SHADE, n, lh = 1.6, align, style }) => {
  const d = Math.max(4, snap(size / 8, 4));
  const k = n === undefined ? text.length : Math.max(0, Math.min(text.length, n));
  return (
    <div style={{ fontFamily: PX, fontSize: size, lineHeight: lh, color, textAlign: align, whiteSpace: "pre-wrap", textShadow: shadow ? `${d}px ${d}px 0 ${shadow}` : "none", ...style }}>
      <span>{text.slice(0, k)}</span>
      <span style={{ color: "transparent", textShadow: "none" }}>{text.slice(k)}</span>
    </div>
  );
};

const notch = (n: number) =>
  `polygon(${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px), 0 ${n}px, ${n}px ${n}px)`;

export type PanelProps = { x: number; y: number; w: number; h: number; border?: string; fill?: string; b?: number; drop?: boolean; style?: CSSProperties; children?: ReactNode };

// The theme's box: a thick border with notched pixel corners, a 4 px inner rule and a hard drop shadow.
export const Panel: FC<PanelProps> = ({ x, y, w, h, border = INK, fill = NIGHT, b = 8, drop = true, style, children }) => (
  <div style={{ position: "absolute", left: snap(x), top: snap(y), width: snap(w), height: snap(h), ...style }}>
    {drop && <div style={{ position: "absolute", inset: 0, transform: "translate(12px, 12px)", background: SHADE, clipPath: notch(b) }} />}
    <div style={{ position: "absolute", inset: 0, background: border, clipPath: notch(b) }} />
    <div style={{ position: "absolute", inset: b, background: fill }} />
    <div style={{ position: "absolute", inset: b + 8, border: `4px solid ${border}`, opacity: 0.22 }} />
    <div style={{ position: "absolute", inset: b, overflow: "hidden" }}>{children}</div>
  </div>
);
