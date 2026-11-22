// The density engine: samples a Field per cell every frame, applies per-cell effects (scramble, accent, hide), and draws it with one of eight mark renderers on a canvas.
import { useLayoutEffect, useRef, type CSSProperties, type FC } from "react";
import { useCurrentFrame } from "remotion";
import { W, H } from "../../core/video";
import { bayer, blue, hash, type Field } from "./field";
import { useFonts } from "./sources";
import { ADV, CELL, GROUND, MONO, NOISE, RAMP, RED, DIGITS, type Ground } from "./theme";

export type Mark = "ascii" | "digits" | "wall" | "bayer" | "blue" | "dots" | "hatch" | "scan";
export const MARKS: Mark[] = ["ascii", "digits", "wall", "bayer", "blue", "dots", "hatch", "scan"];

// What an effect may change in one cell: its density, how unsettled it is (0 locked … 1 pure noise), accent colour, opacity, or drop it.
export type CellFx = { d?: number; noise?: number; accent?: boolean; alpha?: number; hide?: boolean };
// x, y: cell centre in the canvas's px; i, j: column and row; d: the field's density there.
export type Fx = (x: number, y: number, i: number, j: number, d: number) => CellFx | null | undefined | void;

export type GlyphProps = {
  field: Field;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  mark?: Mark;
  // Column width in px (glyph marks) or square cell size (dot marks); each mark has its own default.
  cell?: number;
  ramp?: string;
  // Source text for the "wall" mark: real words whose opacity follows the picture.
  text?: string;
  ground?: Ground;
  ink?: string;
  accent?: string;
  bg?: string | null;
  // Idle life: share of cells flicking to a neighbour glyph each frame, and the +/- brightness of the slow column shimmer.
  flicker?: number;
  shimmer?: number;
  fx?: Fx | Fx[];
  seed?: number;
  // Density below this is blank paper.
  floor?: number;
  bold?: boolean;
  // Pin a cell corner to this canvas point so the lattice scales about it (zooms) instead of re-centring.
  anchor?: [number, number];
  style?: CSSProperties;
};

const DEFAULT_CELL: Record<Mark, number> = { ascii: CELL, digits: 14, wall: 10, bayer: 6, blue: 5, dots: 14, hatch: 12, scan: 8 };
export const cellSize = (mark: Mark, cell?: number) => {
  const cw = cell ?? DEFAULT_CELL[mark];
  const glyph = mark === "ascii" || mark === "digits" || mark === "wall";
  return { cw, ch: glyph ? Math.round(cw / ADV) : cw, glyph };
};

export const GlyphCanvas: FC<GlyphProps> = ({
  field, x = 0, y = 0, w = W, h = H, mark = "ascii", cell, ramp, text = "", ground = "paper", ink, accent = RED, bg = null,
  flicker = 0.04, shimmer = 0.06, fx, seed = 0, floor = 0.04, bold = false, anchor, style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  const ready = useFonts();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    const inkC = ink ?? GROUND[ground].ink;
    const { cw, ch, glyph } = cellSize(mark, cell);
    const ox = anchor ? anchor[0] - Math.ceil(anchor[0] / cw) * cw : (w - Math.floor(w / cw) * cw) / 2;
    const oy = anchor ? anchor[1] - Math.ceil(anchor[1] / ch) * ch : (h - Math.floor(h / ch) * ch) / 2;
    const cols = anchor ? Math.ceil((w - ox) / cw) : Math.floor(w / cw);
    const rows = anchor ? Math.ceil((h - oy) / ch) : Math.floor(h / ch);
    const fxs = fx ? (Array.isArray(fx) ? fx : [fx]) : [];
    const t = f / 30;
    // Unsettled cells re-roll 12 times a second (every 2.5 f), per the board.
    const step = Math.floor(f / 2.5);
    const chars = ramp ?? (mark === "digits" ? DIGITS : RAMP);
    const L = chars.length - 1;
    if (glyph) {
      ctx.font = `${bold ? 700 : 400} ${ch}px "${MONO}"`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
    }
    const paths = new Map<string, Path2D>();
    const pathFor = (key: string) => {
      let p = paths.get(key);
      if (!p) paths.set(key, (p = new Path2D()));
      return p;
    };
    let lastFill = "";
    let lastAlpha = 1;
    for (let j = 0; j < rows; j++) {
      const cy = oy + (j + 0.5) * ch;
      for (let i = 0; i < cols; i++) {
        const cx = ox + (i + 0.5) * cw;
        let d = field(cx, cy);
        let acc = false;
        let alpha = 1;
        let noisy = false;
        let n = 0;
        for (const e of fxs) {
          const r = e(cx, cy, i, j, d);
          if (!r) continue;
          if (r.hide) {
            d = -1;
            break;
          }
          if (r.d !== undefined) d = r.d;
          if (r.noise !== undefined) n = Math.max(n, r.noise);
          if (r.accent) acc = true;
          if (r.alpha !== undefined) alpha *= r.alpha;
        }
        if (d < 0 || alpha <= 0.01) continue;
        if (shimmer) d *= 1 + shimmer * Math.sin(i * 0.18 - t * 1.4);
        if (n > 0) {
          const presence = d < floor ? 0.5 : 1;
          if (hash(i, j, step * 31 + seed) < n * presence) {
            noisy = true;
            d = 0.25 + 0.75 * hash(i, j, step * 17 + seed + 3);
          }
        }
        if (!noisy && flicker && d >= floor && hash(i, j, f * 7 + seed + 11) < flicker) d += (hash(i, j, f + 5) < 0.5 ? -1 : 1) / Math.max(4, L);
        if (d < floor) continue;
        if (d > 1) d = 1;
        const col = acc ? accent : inkC;
        if (glyph) {
          let c: string;
          let a = alpha;
          if (noisy) c = NOISE[Math.floor(hash(i, j, step * 13 + seed + 7) * NOISE.length)]!;
          else if (mark === "wall") {
            c = text[(j * cols + i) % Math.max(1, text.length)] ?? " ";
            // The wall keeps every letter of the source text; the picture lives in their opacity, stepped so it reads as print, not a blur.
            a *= Math.round(d * 5) / 5;
          } else {
            const k = Math.round(d * L);
            if (k <= 0) continue;
            c = chars[k]!;
          }
          if (c === " " || a <= 0.01) continue;
          if (col !== lastFill) ctx.fillStyle = lastFill = col;
          if (a !== lastAlpha) ctx.globalAlpha = lastAlpha = a;
          ctx.fillText(c, cx, cy + ch * 0.04);
          continue;
        }
        const key = `${col}|${alpha.toFixed(2)}`;
        const x0 = cx - cw / 2;
        const y0 = cy - ch / 2;
        if (mark === "bayer" || mark === "blue") {
          if (d > (mark === "bayer" ? bayer(i, j) : blue(i, j))) pathFor(key).rect(x0, y0, cw, ch);
        } else if (mark === "dots") {
          const r = (cw / 2) * Math.sqrt(d) * 1.1;
          if (r < 0.6) continue;
          const p = pathFor(key);
          p.moveTo(cx + r, cy);
          p.arc(cx, cy, r, 0, Math.PI * 2);
        } else if (mark === "scan") {
          const bh = Math.round(d * ch * 0.92);
          if (bh >= 1) pathFor(key).rect(x0, cy - bh / 2, cw, bh);
        } else {
          // Hatch: one 45° stroke per cell, joined into long diagonals by its neighbours; dark cells add the cross stroke.
          const lw = Math.max(0.5, Math.round(d * cw * 0.42 * 2) / 2);
          const p = pathFor(`${key}|${lw}`);
          p.moveTo(x0, y0 + ch);
          p.lineTo(x0 + cw, y0);
          if (d > 0.62) {
            const p2 = pathFor(`${key}|${Math.max(0.5, Math.round((d - 0.62) * cw * 0.9 * 2) / 2)}`);
            p2.moveTo(x0, y0);
            p2.lineTo(x0 + cw, y0 + ch);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const [key, p] of paths) {
      const [col, a, lw] = key.split("|");
      ctx.globalAlpha = Number(a);
      if (lw) {
        ctx.strokeStyle = col!;
        ctx.lineWidth = Number(lw);
        ctx.lineCap = "square";
        ctx.stroke(p);
      } else {
        ctx.fillStyle = col!;
        ctx.fill(p);
      }
    }
    ctx.globalAlpha = 1;
  });
  return <canvas ref={ref} data-ready={ready} width={w} height={h} style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }} />;
};
