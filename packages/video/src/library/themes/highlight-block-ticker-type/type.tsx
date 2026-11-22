// Highlight block ticker primitives: mono cells, the ticker row, row index, caret, dim scanner, the hopping highlight block and the TypeGrid (RowStack) that ties them together, plus the black tape background.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { W } from "../../core/video";
import { useTime } from "../../core/time";
import { BLACK, DIM, FAINT, FPS, GREY, M, MONO, WHITE, colorStep } from "./theme";
import { blockAt, cw, inside, rowDx, typedCount, wordRect, wordsOf, type BlockOpts, type GridRow, type Rect, type Target } from "./grid";

const TAIL = "#3A3A3A";

// Mono cells: every character in its own 0.6 em box, so text and blocks share one exact grid.
export const Cells: FC<{ text: string; shown?: number; x: number; y: number; size: number; color?: string; weight?: number; ink?: (i: number) => string | undefined; style?: CSSProperties }> = ({
  text,
  shown = text.length,
  x,
  y,
  size,
  color = WHITE,
  weight = 800,
  ink,
  style,
}) => {
  const c = cw(size);
  // Only the cells that can be on screen are rendered; long tapes would otherwise cost thousands of spans.
  const first = Math.max(0, Math.floor(-x / c) - 1);
  const last = Math.min(shown, Math.ceil((W - x) / c) + 1);
  const cells: ReactNode[] = [];
  for (let i = first; i < last; i++) {
    const ch = text[i]!;
    if (ch === " ") continue;
    cells.push(
      <span key={i} style={{ position: "absolute", left: i * c, top: 0, width: c, height: size, lineHeight: `${size}px`, textAlign: "center", color: ink?.(i) ?? color }}>
        {ch}
      </span>,
    );
  }
  return <div style={{ position: "absolute", left: x, top: y, height: size, fontFamily: MONO, fontWeight: weight, fontSize: size, whiteSpace: "pre", ...style }}>{cells}</div>;
};

// A flat sharp-cornered block: the only shape this theme draws.
export const Block: FC<{ rect: Rect; color: string; opacity?: number }> = ({ rect, color, opacity = 1 }) =>
  rect.w <= 0 ? null : <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: color, opacity }} />;

// RowIndex: tiny grey numerals in the left column, level with the row's cap height.
export const RowIndex: FC<{ row: GridRow; label: string; x?: number }> = ({ row, label, x = M }) => {
  const { t } = useTime();
  if (t < row.at) return null;
  const out = row.out === undefined ? 1 : t < row.out ? 1 : 0;
  return <Cells text={label} x={x} y={row.y + row.size * 0.13} size={28} color={GREY} weight={500} style={{ opacity: out }} />;
};

// Caret: an underscore that rides the typing head and blinks (stepped, 16 f period) once the row is typed.
export const Caret: FC<{ row: GridRow; color?: string }> = ({ row, color = WHITE }) => {
  const { t, f } = useTime();
  const n = typedCount(t, row);
  if (t < row.at) return null;
  const done = n >= row.text.length;
  if (done && Math.floor((f - row.at * FPS) / 8) % 2 === 1) return null;
  const c = cw(row.size);
  const x = row.x + rowDx(t, row) + n * c + c * 0.12;
  return <Block rect={{ x, y: row.y + row.size * 0.8, w: c * 0.8, h: Math.max(6, row.size * 0.09) }} color={color} />;
};

// TickerRow: one row that scrolls in from the right while typing a char per frame; chars under any of `under` invert to black.
export const TickerRow: FC<{ row: GridRow; under?: Rect[] }> = ({ row, under = [] }) => {
  const { t } = useTime();
  const n = typedCount(t, row);
  if (n <= 0) return null;
  const dx = rowDx(t, row);
  const c = cw(row.size);
  const x0 = row.x + dx;
  const cy = row.y + row.size / 2;
  const full = row.tail && n >= row.text.length ? row.text + row.tail : row.text;
  const shown = full === row.text ? n : n + Math.max(0, Math.floor((t - row.at) * FPS) - row.text.length) * 2;
  const ink = (i: number) => {
    const cx = x0 + (i + 0.5) * c;
    if (under.some((r) => inside(r, cx, cy))) return BLACK;
    return i >= row.text.length ? TAIL : undefined;
  };
  return <Cells text={full} shown={Math.min(full.length, shown)} x={x0} y={row.y} size={row.size} color={row.color ?? WHITE} weight={row.weight} ink={ink} />;
};

// ScanDim: a dim highlight walking every word of the stack left to right at one word per 4 f, with a short rest between passes.
export const scanRect = (t: number, rows: GridRow[], from: number, avoid: Rect[] = []): Rect | null => {
  if (t < from) return null;
  const all = rows.flatMap((r, ri) => (typedCount(t, r) >= r.text.length ? wordsOf(r.text).map((_, wi) => ({ ri, wi })) : []));
  if (!all.length) return null;
  const k = Math.floor(((t - from) * FPS) / 4) % (all.length + 8);
  const w = all[k];
  if (!w) return null;
  const rect = wordRect(rows[w.ri]!, w.wi, t);
  return avoid.some((a) => Math.abs(a.y - rect.y) < 2 && a.x < rect.x + rect.w && rect.x < a.x + a.w) ? null : rect;
};

// A block spec for TypeGrid: hops to (row, word) targets at their cue times.
export type BlockHit = { row: number; word: Target; at: number; color?: string };
export type BlockSpec = BlockOpts & { hits: BlockHit[] };

export const useBlocks = (rows: GridRow[], blocks: BlockSpec[]) => {
  const { t } = useTime();
  return blocks.map((b) => blockAt(t, b.hits.map((h) => ({ rect: wordRect(rows[h.row]!, h.word, t), at: h.at, color: h.color })), b));
};

// TypeGrid / RowStack: draws rows, their indices, the dim scanner, every highlight block and the caret, inverting text under blocks.
export const TypeGrid: FC<{ rows: GridRow[]; blocks?: BlockSpec[]; raw?: { rect: Rect; color: string }[]; scan?: number; caret?: number; lift?: boolean; children?: ReactNode }> = ({
  rows,
  blocks = [],
  raw = [],
  scan,
  caret,
  lift,
  children,
}) => {
  const { t } = useTime();
  const states = useBlocks(rows, blocks);
  const solid = [...states.filter((s): s is NonNullable<typeof s> => !!s).map((s) => ({ rect: s.rect, color: s.color })), ...raw];
  const rects = solid.map((s) => s.rect);
  const dim = scan === undefined ? null : scanRect(t, rows, scan, rects);
  // Optional camera: the whole stack drifts up 40 px every 120 f.
  const drift = lift ? -t * 10 : 0;
  return (
    <AbsoluteFill style={{ transform: `translateY(${drift}px)` }}>
      {dim && <Block rect={dim} color={DIM} />}
      {solid.map((s, i) => (
        <Block key={i} rect={s.rect} color={s.color} />
      ))}
      {rows.map((r, i) => (
        <TickerRow key={i} row={r} under={rects} />
      ))}
      {rows.map((r, i) => (r.index ? <RowIndex key={i} row={r} label={r.index} /> : null))}
      {caret !== undefined && rows[caret] && <Caret row={rows[caret]!} />}
      {children}
    </AbsoluteFill>
  );
};

// Tape: an endless repeating ticker strip, cropped by the frame, drifting at `speed` px/s.
export const Tape: FC<{ text: string; y: number; size: number; speed?: number; color?: string; weight?: number; x?: number; under?: Rect[] }> = ({ text, y, size, speed = -60, color = GREY, weight = 700, x = 0, under = [] }) => {
  const { t } = useTime();
  const c = cw(size);
  const period = text.length * c;
  const reps = Math.ceil(W / period) + 2;
  const off = ((((t * speed) % period) + period) % period) - period;
  const x0 = x + off;
  const full = text.repeat(reps);
  const cy = y + size / 2;
  return <Cells text={full} x={x0} y={y} size={size} color={color} weight={weight} ink={(i) => (under.some((r) => inside(r, x0 + (i + 0.5) * c, cy)) ? BLACK : undefined)} />;
};

// Tape geometry for pinning a block to a word as it scrolls past: the box of the word copy nearest to `targetX`.
export const tapeWordRect = (t: number, text: string, y: number, size: number, speed: number, word: Target, targetX: number, x = 0): Rect => {
  const c = cw(size);
  const period = text.length * c;
  const off = ((((t * speed) % period) + period) % period) - period;
  const base = wordRect({ text, size, x: x + off, y, at: 0, scroll: false }, word);
  const k = Math.round((targetX - (base.x + base.w / 2)) / period);
  return { ...base, x: base.x + k * period };
};

// Background: flat black with faint row rules and a dim tape along the bottom edge whose scanner hops a word every 4 f.
export const TickerBlack: FC<{ rules?: boolean; tape?: boolean }> = ({ rules = true, tape = true }) => {
  const { t, f } = useTime();
  const text = "HIGHLIGHT ▪ BLOCK ▪ TICKER ▪ TYPE ▪ SELECT ▪ CYCLE ▪ ";
  const size = 28;
  const y = 1080 - 30 - size;
  const ws = wordsOf(text).filter((w) => w.word !== "▪");
  const k = Math.floor(f / 4) % ws.length;
  const speed = -40;
  const hot = tapeWordRect(t, text, y, size, speed, { start: ws[k]!.start, len: ws[k]!.len }, 280 + (k % 3) * 120);
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      {rules &&
        Array.from({ length: 9 }, (_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 120 * (i + 1) - 1, height: 1, background: FAINT }} />)}
      {tape && (
        <>
          <Block rect={hot} color={colorStep(f, 4, 0)} opacity={0.22} />
          <Tape text={text} y={y} size={size} speed={speed} color="#333333" />
        </>
      )}
    </AbsoluteFill>
  );
};
