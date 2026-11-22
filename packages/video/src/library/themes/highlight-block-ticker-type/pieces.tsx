// Highlight block ticker pieces for a narrated explainer: hook stack, spoken keyword select, step table, rolling stat, versus table, quote, bar ticker, pipeline hop, source tape and the block-fill transition.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { W } from "../../core/video";
import { clamp01, useTime } from "../../core/time";
import { BLACK, BLUE, BRAND, CYCLE, DIM, EXPO_IO, EXPO_OUT, FPS, GREEN, GREY, M, RED, VIOLET, WHITE, colorStep } from "./theme";
import { FRAME, blockAt, cw, f2s, lerpRect, stack, typedCount, wordRect, wrapWords, type GridRow, type Rect, type StackLine } from "./grid";
import { Block, Cells, TypeGrid, type BlockHit } from "./type";

// A word from narration.json.
export type Spoken = { text: string; start: number; end: number };

const LEAD = f2s(3);
const hair = (y: number, x0 = M, x1 = W - M, color = DIM) => <div style={{ position: "absolute", left: x0, top: y, width: x1 - x0, height: 2, background: color }} />;
const lastTyped = (rows: GridRow[]) => Math.max(...rows.map((r) => r.at + f2s(r.text.length)));

// HookStack: 3–6 numbered rows tick in, one hero row larger; the block hops to each hit word and holds on the last.
export const HookStack: FC<{ lines: StackLine[]; at: number; hits: BlockHit[]; settle?: string; out?: number; off?: number; scan?: boolean; caret?: boolean; lift?: boolean }> = ({
  lines,
  at,
  hits,
  settle = BRAND,
  out,
  off,
  scan = true,
  caret = true,
  lift,
}) => {
  const rows = stack(lines, { at, out });
  return <TypeGrid rows={rows} blocks={[{ hits, settle, off }]} scan={scan ? lastTyped(rows) + 0.4 : undefined} caret={caret ? rows.length - 1 : undefined} lift={lift} />;
};

// SpokenSelect: narration words type in as they are spoken, wrapped to rows; the block jumps onto each key word on its spoken frame.
export const SpokenSelect: FC<{ words: Spoken[]; keys: { idx: number; color?: string }[]; size?: number; maxChars?: number; settle?: string; off?: number }> = ({
  words,
  keys,
  size = 120,
  maxChars,
  settle = BRAND,
  off,
}) => {
  const tagged = words.map((w, i) => ({ ...w, text: w.text.toUpperCase(), i }));
  const max = maxChars ?? Math.floor((W - M * 2 - 92) / cw(size));
  const groups = wrapWords(tagged, max);
  const rows = stack(
    groups.map((g) => ({ text: g.map((w) => w.text).join(" "), size })),
    { at: tagged[0]!.start - LEAD, gap: 0.1 },
  ).map((r, ri) => {
    const charAt: number[] = [];
    groups[ri]!.forEach((w, wi) => {
      if (wi) charAt.push(w.start - LEAD);
      for (let c = 0; c < w.text.length; c++) charAt.push(w.start - LEAD + f2s(c));
    });
    return { ...r, at: groups[ri]![0]!.start - LEAD, charAt, scroll: false };
  });
  const hits: BlockHit[] = keys.map((k) => {
    const ri = groups.findIndex((g) => g.some((w) => w.i === k.idx));
    const wi = groups[ri]!.findIndex((w) => w.i === k.idx);
    return { row: ri, word: wi, at: words[k.idx]!.start - LEAD, color: k.color };
  });
  return <TypeGrid rows={rows} blocks={[{ hits, settle, off }]} caret={rows.length - 1} />;
};

// StepTable: a numbered table of steps with a status column; the block steps down the names on cue, each settling in its own colour.
export const StepTable: FC<{ steps: string[]; at: number; cues: number[]; size?: number; title?: string }> = ({ steps, at, cues, size = 92, title }) => {
  const { t } = useTime();
  const pitch = size * 1.42;
  const top = (1080 - pitch * steps.length) / 2 + (title ? 30 : 0);
  const names: GridRow[] = steps.map((s, i) => ({ text: s.toUpperCase(), size, x: M + 92, y: top + i * pitch + (pitch - size) / 2, at: at + f2s(i * 3), index: String(i + 1).padStart(2, "0") }));
  const ss = 40;
  const status: GridRow[] = steps.map((_, i) => {
    const done = cues[i + 1] !== undefined && t >= cues[i + 1]!;
    const now = !done && t >= cues[i]!;
    const text = done ? "DONE" : now ? "◀ NOW" : "--";
    const since = done ? cues[i + 1]! : now ? cues[i]! : names[i]!.at;
    return { text, size: ss, x: W - M - text.length * cw(ss), y: names[i]!.y + (size - ss) / 2, at: since, scroll: false, color: done ? GREEN : now ? WHITE : GREY, weight: 700 };
  });
  const rows = [...names, ...status];
  if (title) rows.push({ text: title, size: 32, x: M, y: top - 70, at, scroll: false, color: GREY, weight: 500 });
  const hits = cues.map((c, i) => ({ row: i, word: [0, 9] as [number, number], at: c, color: CYCLE[(i + 2) % CYCLE.length] }));
  return (
    <TypeGrid rows={rows} blocks={[{ hits }]}>
      {steps.map((_, i) => (i ? <div key={i} style={{ opacity: t >= names[i]!.at ? 1 : 0 }}>{hair(top + i * pitch)}</div> : null))}
    </TypeGrid>
  );
};

// StatRoll: digits roll like a departure board (stepped, 2 f) and lock left to right, then the block slams over the number.
export const StatRoll: FC<{ value: string; unit?: string; above?: string; below?: string; at: number; size?: number; settle?: string }> = ({ value, unit, above, below, at, size = 340, settle = GREEN }) => {
  const { t, f } = useTime();
  const lockAt = (i: number) => at + 0.45 + i * 0.16;
  const rolled = [...value].map((ch, i) => (/\d/.test(ch) && t < lockAt(i) ? String((Math.floor(f / 2) * 7 + i * 3) % 10) : ch)).join("");
  const x = M + 92;
  const y = 330;
  const num: GridRow = { text: rolled, size, x, y, at, type: false };
  const rows: GridRow[] = [num];
  if (above) rows.push({ text: above, size: 40, x, y: y - 76, at: at - 0.2, scroll: false, color: GREY, weight: 700 });
  if (unit) rows.push({ text: unit, size: 120, x: x + value.length * cw(size) + cw(size) * 0.2 + 28, y: y + size - 120 - size * 0.12, at: lockAt(value.length - 1), color: WHITE });
  if (below) rows.push({ text: below, size: 48, x, y: y + size + 40, at: lockAt(value.length - 1) + 0.25, scroll: false, color: WHITE, weight: 700 });
  return <TypeGrid rows={rows} blocks={[{ hits: [{ row: 0, word: 0, at: lockAt(value.length - 1) + f2s(2) }], settle, cycle: 12 }]} />;
};

// VersusTable: two columns of values; the block picks the winning cell row by row, losers go grey, then it jumps to the winning header.
export const VersusTable: FC<{ a: string; b: string; rows: [string, string, string, "a" | "b"][]; at: number; cues: number[]; pick: number; winner: "a" | "b" }> = ({ a, b, rows: data, at, cues, pick, winner }) => {
  const { t } = useTime();
  const colA = 700;
  const colB = 1260;
  const hs = 120;
  const vs = 56;
  const head: GridRow[] = [
    { text: a, size: hs, x: colA, y: 170, at, color: pick <= t && winner === "b" ? GREY : WHITE },
    { text: b, size: hs, x: colB, y: 170, at: at + f2s(3), color: pick <= t && winner === "a" ? GREY : WHITE },
    { text: "VS", size: 40, x: colB - 110, y: 170 + hs - 52, at: at + f2s(2), scroll: false, color: GREY, weight: 700 },
  ];
  const body: GridRow[] = data.flatMap(([label, va, vb, win], i) => {
    const y = 420 + i * 130;
    const ra = at + 0.3 + i * 0.12;
    const decided = t >= cues[i]!;
    return [
      { text: label, size: 40, x: M, y: y + 8, at: ra, scroll: false, color: GREY, weight: 700 },
      { text: va, size: vs, x: colA, y, at: ra, color: decided && win === "b" ? GREY : WHITE },
      { text: vb, size: vs, x: colB, y, at: ra + f2s(2), color: decided && win === "a" ? GREY : WHITE },
    ];
  });
  const rows = [...head, ...body];
  const hits: BlockHit[] = [
    ...data.map(([, , , win], i) => ({ row: 3 + i * 3 + (win === "a" ? 1 : 2), word: [0, 9] as [number, number], at: cues[i]! })),
    { row: winner === "a" ? 0 : 1, word: 0, at: pick, color: RED },
  ];
  return (
    <TypeGrid rows={rows} blocks={[{ hits, settle: BLUE }]}>
      {data.map((_, i) => (
        <div key={i} style={{ opacity: t >= at + 0.3 + i * 0.12 ? 1 : 0 }}>{hair(395 + i * 130)}</div>
      ))}
    </TypeGrid>
  );
};

// QuoteSelect: a quote typed across big mono rows behind a colour-cycling quote block; the highlight lands on its key words; grey attribution row.
export const QuoteSelect: FC<{ lines: string[]; by: string; at: number; keys: { row: number; word: number | string; at: number; color?: string }[]; size?: number; settle?: string }> = ({
  lines,
  by,
  at,
  keys,
  size = 130,
  settle = VIOLET,
}) => {
  const { t } = useTime();
  const rows = stack(
    lines.map((l) => ({ text: l.toUpperCase(), size })),
    { at, x: M + 120, index: false, gap: 0.1 },
  );
  const last = rows[rows.length - 1]!;
  rows.push({ text: by.toUpperCase(), size: 40, x: M + 120, y: last.y + size + 56, at: lastTyped(rows) + 0.2, scroll: false, color: GREY, weight: 700 });
  const since = (t - at) * FPS;
  const qb: Rect = { x: M, y: rows[0]!.y, w: cw(size) * 1.15, h: size * (1 - 0.9 * clamp01(1 - since / 4)) };
  return (
    <TypeGrid rows={rows} blocks={[{ hits: keys, settle }]} caret={rows.length - 1}>
      {t >= at && (
        <>
          <Block rect={qb} color={since < 12 ? colorStep(since, 2, 3) : WHITE} />
          <Cells text={'"'} x={M + (qb.w - cw(size)) / 2} y={rows[0]!.y + size * 0.12} size={size} color={BLACK} />
        </>
      )}
    </TypeGrid>
  );
};

// BarTicker: a tabular bar chart; each bar lights one segment per frame with a colour-cycling head, then its value types in and the top row gets the block.
export const BarTicker: FC<{ title?: string; bars: { label: string; value: number }[]; at: number; max?: number; seg?: number }> = ({ title, bars, at, max, seg = 52 }) => {
  const { t } = useTime();
  const top = Math.max(...bars.map((b) => b.value));
  const scale = (max ?? top) > 20 ? 20 / (max ?? top) : 1;
  const ls = 48;
  const labelW = Math.max(...bars.map((b) => b.label.length)) * cw(ls);
  const x0 = M + labelW + 48;
  const pitch = 104;
  const y0 = (1080 - pitch * bars.length) / 2 + 40;
  const start = (i: number) => at + 0.3 + i * 0.22;
  const segs = (i: number) => Math.round(bars[i]!.value * scale);
  const doneAt = (i: number) => start(i) + f2s(segs(i));
  const rows: GridRow[] = bars.flatMap((b, i) => {
    const y = y0 + i * pitch;
    return [
      { text: b.label.toUpperCase(), size: ls, x: M, y, at: at + f2s(i * 3), color: WHITE },
      { text: String(b.value), size: ls, x: x0 + segs(i) * (seg + 8) + 16, y, at: doneAt(i), scroll: false, color: CYCLE[i % CYCLE.length] },
    ];
  });
  if (title) rows.push({ text: title.toUpperCase(), size: 32, x: M, y: y0 - 90, at, scroll: false, color: GREY, weight: 500 });
  const best = bars.findIndex((b) => b.value === top);
  const end = Math.max(...bars.map((_, i) => doneAt(i))) + 0.2;
  return (
    <TypeGrid rows={rows} blocks={[{ hits: [{ row: best * 2, word: [0, 9], at: end }], settle: WHITE }]}>
      {bars.map((_, i) => {
        const lit = Math.max(0, Math.min(segs(i), Math.floor((t - start(i)) * FPS) + 1));
        return Array.from({ length: lit }, (_, k) => {
          const head = k === lit - 1 && lit < segs(i);
          const flash = (t - start(i)) * FPS - k;
          return <Block key={`${i}-${k}`} rect={{ x: x0 + k * (seg + 8), y: y0 + i * pitch + 2, w: seg, h: ls - 4 }} color={head || flash < 6 ? colorStep(flash, 2, k) : CYCLE[i % CYCLE.length]!} />;
        });
      })}
    </TypeGrid>
  );
};

// PipelineHop: one row of stages joined by > marks; the block hops stage to stage and each stage's output file below lights in its colour.
export const PipelineHop: FC<{ stages: { name: string; out: string }[]; at: number; cues: number[]; size?: number }> = ({ stages, at, cues, size = 84 }) => {
  const { t } = useTime();
  const text = stages.map((s) => s.name.toUpperCase()).join(" > ");
  const c = cw(size);
  const x = M;
  const y = 430;
  const row: GridRow = { text, size, x, y, at };
  const cols: number[] = [];
  stages.reduce((col, s) => (cols.push(col), col + s.name.length + 3), 0);
  const colour = (i: number) => CYCLE[(i + 1) % CYCLE.length]!;
  const below: GridRow[] = stages.map((s, i) => ({ text: s.out, size: 36, x: x + cols[i]! * c, y: y + size + 40, at: at + 0.4 + i * 0.1, scroll: false, color: t >= cues[i]! + f2s(10) ? colour(i) : GREY, weight: 700 }));
  const above: GridRow[] = stages.map((_, i) => ({ text: `0${i + 1}`, size: 32, x: x + cols[i]! * c, y: y - 64, at: at + i * 0.1, scroll: false, color: t >= cues[i]! ? WHITE : GREY, weight: 500 }));
  const hits = cues.map((cue, i) => ({ row: 0, word: i * 2, at: cue, color: colour(i) }));
  return <TypeGrid rows={[row, ...below, ...above]} blocks={[{ hits }]} />;
};

// SourceTape: a lower-third ticker strip; a SOURCE block flashes in, then the source text types and slowly tickers left, cropped by the frame.
export const SourceTape: FC<{ label?: string; text: string; at: number; y?: number; size?: number; settle?: string; speed?: number; hold?: number }> = ({ label = "SOURCE", text, at, y = 860, size = 40, settle = BLUE, speed = 40, hold = 2.5 }) => {
  const { t } = useTime();
  const c = cw(size);
  const wipe = EXPO_OUT(clamp01(((t - at) * FPS) / 14));
  const lab: GridRow = { text: label, size, x: M + c * 0.4, y: y + 24, at: at + f2s(2), scroll: false };
  const block = blockAt(t, [{ rect: wordRect(lab, 0), at: at + f2s(2) }], { settle, cycle: 12 });
  const left = M + (label.length + 1.6) * c;
  const body = `${text.toUpperCase()}  ▪  `;
  const period = body.length * c;
  const scrollX = -((Math.max(0, t - at - hold) * speed) % period);
  const typed = Math.max(0, Math.floor((t - at - 0.2) * FPS));
  const full = body.repeat(Math.ceil(W / period) + 2);
  if (t < at) return null;
  return (
    <AbsoluteFill>
      <Block rect={{ x: 0, y, w: W * wipe, h: 2 }} color={WHITE} />
      <Block rect={{ x: 0, y: y + size + 46, w: W * wipe, h: 2 }} color={DIM} />
      {block && <Block rect={{ ...block.rect, y: y + 16, h: size + 16 }} color={block.color} />}
      <Cells text={label} x={lab.x} y={lab.y} size={size} color={BLACK} shown={typedCount(t, lab)} />
      <div style={{ position: "absolute", left, top: y + 24, width: W - left, height: size, overflow: "hidden" }}>
        <Cells text={full} shown={Math.min(full.length, typed)} x={scrollX} y={0} size={size} color={WHITE} weight={700} />
      </div>
    </AbsoluteFill>
  );
};

// BlockFill: the held block expands to fill the frame (12 f expo in-out) and becomes the next scene's background; children are that scene.
export const BlockFill: FC<{ from: Rect; at: number; color: string; children?: ReactNode }> = ({ from, at, color, children }) => {
  const { t } = useTime();
  if (t < at) return null;
  // Easing.exp never quite reaches 1, so "filled" is judged on the raw progress.
  const p = clamp01(((t - at) * FPS) / 12);
  return (
    <AbsoluteFill>
      <Block rect={p >= 1 ? FRAME : lerpRect(from, FRAME, EXPO_IO(p))} color={color} />
      {p >= 1 && <AbsoluteFill>{children}</AbsoluteFill>}
    </AbsoluteFill>
  );
};
