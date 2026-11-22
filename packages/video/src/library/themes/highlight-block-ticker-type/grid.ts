// Pure layout and motion maths for the mono grid: word boxes (WordTargeter), row stacking, ticker entrances and exits, per-char typing and the hopping block's state.
import { H, W } from "../../core/video";
import { clamp01, ramp } from "../../core/time";
import { BRAND, CH, CYCLE, EXPO_OUT, FPS, IN_QUAD, M, colorStep } from "./theme";

export type Rect = { x: number; y: number; w: number; h: number };

// One run of mono text. `at` starts its entrance; `charAt` (seconds per char) overrides the uniform typing.
export type GridRow = {
  text: string;
  size: number;
  x: number;
  y: number;
  at: number;
  color?: string;
  weight?: number;
  out?: number;
  scroll?: boolean;
  type?: boolean;
  charAt?: number[];
  index?: string;
  // Dim repeat that runs on past the right edge, so a row reads as part of an endless tape.
  tail?: string;
  // Constant ticker drift in px per second (negative runs left).
  drift?: number;
};

export const cw = (size: number) => size * CH;
export const f2s = (frames: number) => frames / FPS;

export type WordSpan = { word: string; start: number; len: number };
export const wordsOf = (text: string): WordSpan[] => {
  const out: WordSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, len: m[0].length });
  return out;
};

const bare = (s: string) => s.toUpperCase().replace(/[^A-Z0-9%$#+]/g, "");

// Which characters a target covers: a word index, a word by its letters, a [from, to] word range, or a raw {start, len} char span.
export type Target = number | string | [number, number] | { start: number; len: number };
export const spanOf = (text: string, target: Target): { start: number; len: number } => {
  if (typeof target === "object" && !Array.isArray(target)) return target;
  const ws = wordsOf(text);
  if (Array.isArray(target)) {
    const a = ws[target[0]] ?? ws[0]!;
    const b = ws[target[1]] ?? ws[ws.length - 1]!;
    return { start: a.start, len: b.start + b.len - a.start };
  }
  if (typeof target === "number") return ws[target] ?? ws[0]!;
  const w = ws.find((x) => bare(x.word) === bare(target)) ?? ws.find((x) => bare(x.word).includes(bare(target))) ?? ws[0]!;
  return w;
};

export const rowWidth = (r: Pick<GridRow, "text" | "size">) => r.text.length * cw(r.size);

// Ticker entrance from the right (600 px, 20 f expo-out), constant drift, and the 10 f in-quad exit off the left edge.
export const rowDx = (t: number, r: GridRow) => {
  let dx = r.scroll === false ? 0 : (1 - ramp(t, r.at, f2s(20), EXPO_OUT)) * 600;
  if (r.drift) dx += r.drift * Math.max(0, t - r.at);
  if (r.out !== undefined) dx -= ramp(t, r.out, f2s(10), IN_QUAD) * (r.x + rowWidth(r) + 80);
  return dx;
};

// How many characters are showing: one per frame from `at`, or each at its own `charAt` time.
export const typedCount = (t: number, r: GridRow) => {
  if (t < r.at) return 0;
  if (r.charAt) return r.charAt.filter((c) => t >= c).length;
  if (r.type === false) return r.text.length;
  return Math.min(r.text.length, Math.floor((t - r.at) * FPS) + 1);
};

// WordTargeter: the exact box of a target on a row at time t, padded a fifth of a cell so the block hugs the word.
export const wordRect = (r: GridRow, target: Target, t?: number): Rect => {
  const s = spanOf(r.text, target);
  const c = cw(r.size);
  const pad = c * 0.2;
  const dx = t === undefined ? 0 : rowDx(t, r);
  return { x: r.x + dx + s.start * c - pad, y: r.y, w: s.len * c + pad * 2, h: r.size };
};

// RowStack layout: rows stacked edge to edge (gap in em), 3 f stagger, numbered 01.., centred vertically unless `top` is given.
export type StackLine = { text: string; size: number; color?: string; tail?: string; weight?: number };
export const stack = (lines: StackLine[], { at, x = M + 92, top, gap = 0.08, stagger = 3, out, index = true }: { at: number; x?: number; top?: number; gap?: number; stagger?: number; out?: number; index?: boolean }): GridRow[] => {
  const pitch = lines.map((l) => l.size * (1 + gap));
  const total = pitch.reduce((a, b) => a + b, 0) - lines[lines.length - 1]!.size * gap;
  let y = top ?? Math.round((H - total) / 2);
  const n = lines.length;
  return lines.map((l, i) => {
    const row: GridRow = {
      ...l,
      x,
      y,
      at: at + f2s(i * stagger),
      out: out === undefined ? undefined : out + f2s((n - 1 - i) * stagger),
      index: index ? String(i + 1).padStart(2, "0") : undefined,
    };
    y += pitch[i]!;
    return row;
  });
};

// Wrap spoken words into rows no wider than maxChars; returns the words of each row.
export const wrapWords = <T extends { text: string }>(words: T[], maxChars: number) => {
  const rows: T[][] = [[]];
  let len = 0;
  for (const w of words) {
    const add = (len ? 1 : 0) + w.text.length;
    if (len && len + add > maxChars) {
      rows.push([]);
      len = 0;
    }
    rows[rows.length - 1]!.push(w);
    len += (len ? 1 : 0) + w.text.length;
  }
  return rows;
};

// HighlightBlock state: one block hops through `hits`. Leading edge lands in 3 f, trailing edge follows in 6 f,
// it flashes through the palette every 2 f for `cycle` frames after each hop, then settles.
export type Hit = { rect: Rect; at: number; color?: string };
export type BlockOpts = { off?: number; settle?: string; cycle?: number; step?: number; seed?: number; palette?: string[] };
export type BlockState = { rect: Rect; color: string; index: number; since: number };

export const blockAt = (t: number, hits: Hit[], { off, settle = BRAND, cycle = 10, step = 2, seed = 0, palette = CYCLE }: BlockOpts = {}): BlockState | null => {
  let idx = -1;
  for (let i = 0; i < hits.length; i++) if (t >= hits[i]!.at) idx = i;
  if (idx < 0) return null;
  const h = hits[idx]!;
  const since = (t - h.at) * FPS;
  const lead = EXPO_OUT(clamp01(since / 3));
  const trail = EXPO_OUT(clamp01(since / 6));
  let L: number;
  let R: number;
  let y = h.rect.y;
  let hh = h.rect.h;
  if (idx === 0) {
    L = h.rect.x;
    R = h.rect.x + h.rect.w * lead;
  } else {
    const p = hits[idx - 1]!.rect;
    const toRight = h.rect.x + h.rect.w / 2 >= p.x + p.w / 2;
    L = p.x + (h.rect.x - p.x) * (toRight ? trail : lead);
    R = p.x + p.w + (h.rect.x + h.rect.w - p.x - p.w) * (toRight ? lead : trail);
    y = p.y + (h.rect.y - p.y) * lead;
    hh = p.h + (h.rect.h - p.h) * lead;
  }
  if (off !== undefined && t >= off) {
    const g = IN_QUAD(clamp01(((t - off) * FPS) / 4));
    if (g >= 1) return null;
    L += (R - L) * g;
  }
  const color = since < cycle ? colorStep(since, step, idx * 2 + seed, palette) : h.color ?? settle;
  return { rect: { x: L, y, w: Math.max(0, R - L), h: hh }, color, index: idx, since };
};

export const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Full-frame rect a little past every edge, the end state of a BlockFill.
export const FRAME: Rect = { x: -8, y: -8, w: W + 16, h: H + 16 };
export const lerpRect = (a: Rect, b: Rect, e: number): Rect => ({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e });
