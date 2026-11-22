// Signature moments only this theme does: the ticker picking a word (slot-style shuffle), a beat-locked wall of tapes for music-only videos, and select-and-retype of a word on camera.
import type { FC } from "react";
import { AbsoluteFill, random } from "remotion";
import { useSong } from "../../core/beat";
import { useTime } from "../../core/time";
import { CYCLE, DIM, FPS, GREEN, GREY, M, RED, WHITE, colorStep } from "./theme";
import { blockAt, cw, f2s, spanOf, stack, wordsOf, type GridRow, type Hit, type Rect, type Target } from "./grid";
import { Block, Cells, Tape, TypeGrid, tapeWordRect, type BlockHit } from "./type";

// WordPicker: the block shuffles between options, decelerating like a slot reel, and lands on the pick; the rest go grey.
export const WordPicker: FC<{ prompt: string; options: string[]; pick: number; at: number; shuffleAt: number; seed?: number; settle?: string; size?: number }> = ({
  prompt,
  options,
  pick,
  at,
  shuffleAt,
  seed = 1,
  settle = GREEN,
  size = 104,
}) => {
  const { t } = useTime();
  const gaps = [2, 2, 2, 2, 2, 2, 3, 3, 4, 5, 6, 8, 11];
  const total = options.length * size * 1.08 + 56 + 48;
  const top = (1080 - total) / 2;
  let when = shuffleAt;
  let prev = -1;
  const hits: BlockHit[] = gaps.map((g, k) => {
    const last = k === gaps.length - 1;
    let row = last ? pick : Math.floor(random(`pick-${seed}-${k}`) * options.length);
    if (!last && (row === prev || (k === gaps.length - 2 && row === pick))) row = (row + 1 + (row + 1 === pick ? 1 : 0)) % options.length;
    prev = row;
    const h = { row: row + 1, word: [0, 9] as [number, number], at: when };
    when += f2s(g);
    return h;
  });
  const land = hits[hits.length - 1]!.at;
  const opts = stack(
    options.map((o, i) => ({ text: o.toUpperCase(), size, color: t >= land && i !== pick ? GREY : WHITE })),
    { at, top: top + 104 },
  );
  const head: GridRow = { text: prompt.toUpperCase(), size: 56, x: opts[0]!.x, y: top, at: at - 0.15, scroll: false, color: WHITE, weight: 700 };
  return <TypeGrid rows={[head, ...opts]} blocks={[{ hits, settle, cycle: 12 }]} caret={0} />;
};

// The nearest real word (not a ▪ separator) on a tape to `targetX` at time t.
const nearestWord = (t: number, text: string, y: number, size: number, speed: number, targetX: number): Rect => {
  let best: Rect | null = null;
  for (const w of wordsOf(text)) {
    if (w.word === "▪") continue;
    const r = tapeWordRect(t, text, y, size, speed, { start: w.start, len: w.len }, targetX);
    if (!best || Math.abs(r.x + r.w / 2 - targetX) < Math.abs(best.x + best.w / 2 - targetX)) best = r;
  }
  return best!;
};

// BeatWall (music-only): endless tapes run in alternating directions; on every beat the block hops to the word passing a seeded spot,
// the hero row takes every downbeat, and the settle colour changes each bar. Wrap it in <Track spec>.
export type WallLine = { text: string; size: number; speed: number };
export const BeatWall: FC<{ lines: WallLine[]; hero?: number; top?: number; gap?: number }> = ({ lines, hero = Math.floor(lines.length / 2), top = 210, gap = 0.06 }) => {
  const { t, clock, pos } = useSong();
  const ys: number[] = [];
  lines.reduce((y, l) => (ys.push(y), y + l.size * (1 + gap)), top);
  const others = lines.map((_, i) => i).filter((i) => i !== hero);
  const rowFor = (beat: number) => ((beat % clock.sig) === 0 ? hero : others[(beat - Math.floor(beat / clock.sig) - 1) % others.length]!);
  const hitFor = (beat: number): Hit => {
    const r = rowFor(beat);
    const l = lines[r]!;
    const tx = 420 + random(`wall-${beat}`) * 1080;
    return { rect: nearestWord(t, l.text, ys[r]!, l.size, l.speed, tx), at: clock.beatSec(beat) };
  };
  const b = pos.beat;
  const hits = b < 0 ? [] : b === 0 ? [hitFor(0)] : [hitFor(b - 1), hitFor(b)];
  const state = blockAt(t, hits, { settle: CYCLE[(pos.bar - 1 + CYCLE.length * 4) % CYCLE.length], cycle: 8, seed: b * 2 });
  const under = state ? [state.rect] : [];
  const label = `BAR ${String(Math.max(1, pos.bar)).padStart(2, "0")}  ${"■".repeat(pos.beatInBar)}${"□".repeat(clock.sig - pos.beatInBar)}  ${clock.bpm} BPM`;
  return (
    <AbsoluteFill>
      {state && <Block rect={state.rect} color={state.color} />}
      {lines.map((l, i) => (
        <Tape key={i} text={l.text} y={ys[i]!} size={l.size} speed={l.speed} color={i === hero ? WHITE : "#CFCFCF"} weight={800} under={under} />
      ))}
      <Cells text={label} x={M} y={110} size={28} color={GREY} weight={500} />
    </AbsoluteFill>
  );
};

// SelectReplace: a word is selected a char per frame (shift-arrow style), flashes and goes red, then is retyped as the replacement under a green block.
// A find/replace bar above types along with it.
export const SelectReplace: FC<{ lines: string[]; row: number; word: Target; replacement: string; at: number; selectAt: number; replaceAt: number; size?: number }> = ({
  lines,
  row,
  word,
  replacement,
  at,
  selectAt,
  replaceAt,
  size = 150,
}) => {
  const { t } = useTime();
  const rows = stack(
    lines.map((l) => ({ text: l.toUpperCase(), size })),
    { at, gap: 0.1 },
  );
  const r = rows[row]!;
  const orig = r.text;
  const span = spanOf(orig, word);
  const old = orig.slice(span.start, span.start + span.len);
  const rep = replacement.toUpperCase();
  const c = cw(size);
  const pad = c * 0.2;
  let rect: Rect | null = null;
  let color = WHITE;
  if (t >= replaceAt) {
    const k = Math.min(rep.length, Math.floor((t - replaceAt) * FPS));
    r.text = orig.slice(0, span.start) + rep.slice(0, k) + orig.slice(span.start + span.len);
    const since = (t - replaceAt) * FPS;
    rect = { x: r.x + span.start * c - pad, y: r.y, w: k * c + pad * 2, h: size };
    color = since < rep.length + 10 ? colorStep(since, 2, 1) : GREEN;
  } else if (t >= selectAt) {
    const since = (t - selectAt) * FPS;
    const n = Math.min(span.len, Math.floor(since) + 1);
    rect = { x: r.x + span.start * c - pad, y: r.y, w: n * c + pad * (n === span.len ? 2 : 1), h: size };
    color = since < span.len + 10 ? colorStep(since, 2) : RED;
  }
  const barY = rows[0]!.y - 120;
  const bar: GridRow[] = [
    { text: `FIND    ${old}`, size: 36, x: r.x, y: barY, at: selectAt, scroll: false, color: GREY, weight: 700 },
    { text: `REPLACE ${rep}`, size: 36, x: r.x + 720, y: barY, at: replaceAt - 0.35, scroll: false, color: t >= replaceAt + f2s(rep.length) ? GREEN : GREY, weight: 700 },
  ];
  const typing = t >= replaceAt && t < replaceAt + f2s(rep.length + 1);
  return (
    <TypeGrid rows={[...rows, ...bar]} raw={rect ? [{ rect, color }] : []}>
      {typing && rect && <Block rect={{ x: rect.x + rect.w, y: r.y + size * 0.8, w: c * 0.8, h: size * 0.09 }} color={WHITE} />}
      {t >= selectAt && <Block rect={{ x: r.x, y: barY + 52, w: 1920 - r.x - M, h: 2 }} color={DIM} />}
    </TypeGrid>
  );
};
