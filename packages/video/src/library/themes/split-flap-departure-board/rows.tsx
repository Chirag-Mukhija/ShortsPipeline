// Rows of flaps: text, word-cued lines, numbers, status cells and the mm:ss countdown, each built as cell specs first so the click track can read the same timings.
import type { FC, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { CellView } from "./cell";
import { DOWN, NUMX, fit, flapState, type CellSpec, type FlapKey } from "./flap";
import { FPS, SLOT, pitch, rowWidth, type Tone } from "./theme";

export type Align = "left" | "right" | "center";
// A later dataset for the same row: `scramble` makes every printed cell run 3–5 random flaps first, the board's re-scramble.
export type Then = { at: number; text: string; tone?: Tone; tones?: (Tone | undefined)[]; scramble?: number; align?: Align };

export type RowOpts = {
  text: string;
  cols?: number;
  align?: Align;
  // Seconds. With `land`, the time every cell finishes on (a beat) instead of starts.
  at: number;
  land?: boolean;
  stagger?: number;
  tone?: Tone;
  tones?: (Tone | undefined)[];
  then?: Then[];
  // Seconds: flip back to blank in reverse stagger.
  out?: number;
  seed?: number;
  drum?: string;
  laps?: number;
  cap?: number;
};

export const rowSpecs = (o: RowOpts): CellSpec[] => {
  const cols = o.cols ?? [...o.text].length;
  const first = fit(o.text, cols, o.align);
  const stag = o.stagger ?? 2;
  const seed = o.seed ?? 1;
  const sets = [first, ...(o.then ?? []).map((t) => fit(t.text, cols, t.align ?? o.align))];
  return first.map((ch, i) => {
    const keys: FlapKey[] = [{ f: o.at * FPS + i * stag, ch, tone: o.tones?.[i] ?? o.tone, laps: o.laps, cap: o.cap, land: o.land }];
    (o.then ?? []).forEach((t, j) => {
      const prev = sets[j]![i]!;
      const next = sets[j + 1]![i]!;
      const busy = t.scramble !== undefined && (prev !== " " || next !== " ");
      keys.push({ f: t.at * FPS + i * stag, ch: next, tone: t.tones?.[i] ?? t.tone ?? o.tones?.[i] ?? o.tone, laps: busy ? 1 : undefined, cap: busy ? t.scramble : undefined, land: o.land });
    });
    if (o.out !== undefined) keys.push({ f: o.out * FPS + (cols - 1 - i) * stag, ch: " ", cap: 4 });
    return { keys, seed: seed * 97 + i, drum: o.drum };
  });
};

export type Place = { x: number; y: number; h: number; anchor?: Align; weight?: number; rail?: boolean };

// Left edge of a row of `cols` cells placed by its anchor.
export const rowLeft = (x: number, h: number, cols: number, anchor: Align = "left") =>
  anchor === "left" ? x : anchor === "center" ? x - rowWidth(h, cols) / 2 : x - rowWidth(h, cols);

// The recessed rail a row of cells is mounted in; it also hides the dormant board behind.
export const Rail: FC<{ x: number; y: number; h: number; cols: number }> = ({ x, y, h, cols }) => {
  const pad = Math.max(10, h * 0.12);
  return <div style={{ position: "absolute", left: x - pad, top: y - pad, width: rowWidth(h, cols) + pad * 2, height: h + pad * 2, background: SLOT, borderRadius: pad * 0.6, boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.04)" }} />;
};

export const FlapRow: FC<Place & { specs: CellSpec[] }> = ({ specs, x, y, h, anchor = "left", weight, rail = false }) => {
  const f = useCurrentFrame();
  const left = rowLeft(x, h, specs.length, anchor);
  return (
    <>
      {rail && <Rail x={left} y={y} h={h} cols={specs.length} />}
      {specs.map((s, i) => (
        <CellView key={i} s={flapState(s, f)} h={h} x={left + i * pitch(h)} y={y} weight={weight} />
      ))}
    </>
  );
};

// Text that flips in from blank: the board's basic word.
export const FlapText: FC<RowOpts & Place> = ({ x, y, h, anchor, weight, rail, ...o }) => <FlapRow specs={rowSpecs(o)} x={x} y={y} h={h} anchor={anchor} weight={weight} rail={rail} />;

// A line whose words flip in on their spoken word times; tone a word amber for the key claim.
export type CueWord = { w: string; t: number; tone?: Tone };
export const wordSpecs = (words: CueWord[], o: { cols?: number; align?: Align; stagger?: number; seed?: number; out?: number; land?: boolean } = {}): CellSpec[] => {
  const text = words.map((w) => w.w).join(" ");
  const cols = o.cols ?? [...text].length;
  const cells = fit(text, cols, o.align);
  const lead = cells.findIndex((c) => c !== " ");
  // Map every cell to the word it prints, so each word starts on its own cue.
  const owner: number[] = [];
  words.forEach((w, wi) => [...w.w, " "].forEach(() => owner.push(wi)));
  const stag = o.stagger ?? 2;
  return cells.map((ch, i) => {
    const wi = owner[i - Math.max(0, lead)] ?? words.length - 1;
    const w = words[Math.min(wi, words.length - 1)]!;
    const first = i - Math.max(0, lead) - owner.indexOf(wi);
    const keys: FlapKey[] = [{ f: w.t * FPS + Math.max(0, first) * stag, ch, tone: w.tone, land: o.land }];
    if (o.out !== undefined) keys.push({ f: o.out * FPS + (cols - 1 - i) * stag, ch: " ", cap: 4 });
    return { keys, seed: (o.seed ?? 3) * 97 + i };
  });
};
export const FlapWords: FC<Place & { words: CueWord[]; cols?: number; align?: Align; stagger?: number; seed?: number; out?: number; land?: boolean }> = ({ x, y, h, anchor, weight, rail, words, ...o }) => (
  <FlapRow specs={wordSpecs(words, o)} x={x} y={y} h={h} anchor={anchor} weight={weight} rail={rail} />
);

// Numbers on digit-only modules with separators: they reach their value in a handful of flaps, so the count reads as a count.
export const numSpecs = (o: { value: number; from?: number; cols?: number; at: number; tone?: Tone; seed?: number; stagger?: number; land?: boolean; out?: number }): CellSpec[] => {
  const to = o.value.toLocaleString("en-US");
  const cols = o.cols ?? to.length;
  const a = o.from !== undefined ? fit(o.from.toLocaleString("en-US"), cols, "right") : fit("", cols);
  const b = fit(to, cols, "right");
  const stag = o.stagger ?? 2;
  return b.map((ch, i) => {
    const keys: FlapKey[] = [];
    if (o.from !== undefined) keys.push({ f: -999, ch: a[i]! });
    // Lower digits get an extra lap so the right-hand end whirrs longest, like an odometer read on a board.
    keys.push({ f: o.at * FPS + i * stag, ch, tone: o.tone, laps: ch !== " " && i >= cols - 2 ? 1 : 0, land: o.land });
    if (o.out !== undefined) keys.push({ f: o.out * FPS + (cols - 1 - i) * stag, ch: " " });
    return { keys, seed: (o.seed ?? 5) * 97 + i, drum: NUMX };
  });
};
export const FlapNumber: FC<Place & Parameters<typeof numSpecs>[0]> = ({ x, y, h, anchor, weight, rail, ...o }) => <FlapRow specs={numSpecs(o)} x={x} y={y} h={h} anchor={anchor} weight={weight ?? 600} rail={rail} />;

// A status cell group that flips between states; the row it sits in can nudge on each change (see Nudge).
export type StatusStep = { at: number; text: string; tone: Tone };
export const statusSpecs = (steps: StatusStep[], cols: number, seed = 9, align: Align = "left"): CellSpec[] =>
  rowSpecs({ text: steps[0]!.text, cols, align, at: steps[0]!.at, tone: steps[0]!.tone, seed, then: steps.slice(1).map((s) => ({ at: s.at, text: s.text, tone: s.tone, scramble: 3 })) });
export const StatusBadge: FC<Place & { steps: StatusStep[]; cols: number; seed?: number; align?: Align }> = ({ steps, cols, seed, align, ...p }) => <FlapRow specs={statusSpecs(steps, cols, seed, align)} {...p} />;

// Emphasis: the row lifts 2 px and its shadow pulses for a few frames on each cue.
export const Nudge: FC<{ at: number[]; children: ReactNode }> = ({ at, children }) => {
  const f = useCurrentFrame();
  const e = at.reduce((m, a) => {
    const d = f - a * FPS;
    return d >= 0 && d < 14 ? Math.max(m, Math.sin((d / 14) * Math.PI)) : m;
  }, 0);
  return <div style={{ position: "absolute", inset: 0, transform: `translateY(${-2 * e}px)`, filter: e > 0.01 ? `drop-shadow(0 ${6 * e}px ${10 * e}px rgba(0,0,0,${0.7 * e}))` : undefined }}>{children}</div>;
};

// mm:ss on backwards-strung modules: each second turns the ones wheel by one flap, and 0 rolls to 9 without a blank.
export const countdownSpecs = (o: { from: number; at: number; seconds?: number; seed?: number }): CellSpec[] => {
  const n = Math.min(o.from, o.seconds ?? o.from);
  const fmt = (v: number) => {
    const m = Math.floor(Math.max(0, v) / 60);
    const s = Math.max(0, v) % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  const vals = Array.from({ length: n + 1 }, (_, k) => fmt(o.from - k));
  return [0, 1, 2, 3, 4].map((i) => {
    if (i === 2) return { keys: [{ f: o.at * FPS + 4, ch: ":" }], seed: (o.seed ?? 7) * 97 + i, drum: " :" };
    const keys: FlapKey[] = [{ f: o.at * FPS + i * 2, ch: vals[0]![i]!, tone: "amber" }];
    vals.forEach((v, k) => {
      if (k > 0 && v[i] !== vals[k - 1]![i]) keys.push({ f: (o.at + 1 + k - 1) * FPS + 1, ch: v[i]!, tone: "amber" });
    });
    return { keys, seed: (o.seed ?? 7) * 97 + i, drum: DOWN };
  });
};
export const FlapCountdown: FC<Place & { from: number; at: number; seconds?: number; seed?: number }> = ({ from, at, seconds, seed, ...p }) => (
  <FlapRow specs={countdownSpecs({ from, at, seconds, seed })} weight={600} {...p} />
);
