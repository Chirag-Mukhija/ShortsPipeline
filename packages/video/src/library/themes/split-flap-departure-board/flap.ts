// Split-flap mechanics as pure functions of the frame: drums, the seeded per-cell step table, which flap is falling and how far, and the frame of every clack.
import { Easing, random } from "remotion";
import type { Tone } from "./theme";

// A drum is the fixed order of flaps on a module's wheel; cells only ever turn forward through it.
export const ALPHA = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-/'\"!?&+%#■▲▼";
// Number and clock modules on real boards carry only digits, so they reach their value fast.
export const NUM = " 0123456789";
// Countdown modules: the wheel is strung backwards with no blank, so turning forward counts down and 0 rolls straight to 9.
export const DOWN = "9876543210";
// Number modules that also carry separators, for values whose width changes.
export const NUMX = " 0123456789,.";

// One target for a cell: from frame `f` it turns toward `ch`. `land` makes `f` the frame it arrives on instead (music cues).
export type FlapKey = { f: number; ch: string; tone?: Tone; cap?: number; laps?: number; land?: boolean };
export type CellSpec = { keys: FlapKey[]; seed: number; drum?: string };

const EASE = Easing.out(Easing.quad);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const idx = (drum: string, c: string) => Math.max(0, [...drum].indexOf(c.toUpperCase()));

// The seeded table that keeps a row from flipping in lockstep: a 0–2 f start lag, 4–6 f per final flip, and 0–2 spare steps for capped re-scrambles.
export const cellTable = (seed: number) => ({
  lag: Math.floor(random(`sf-lag-${seed}`) * 3),
  step: 4 + Math.floor(random(`sf-step-${seed}`) * 3),
  spare: Math.floor(random(`sf-spare-${seed}`) * 3),
});

// Steps and duration for one key. Total steps are eased out-quad, so the drum whirrs first and the last flap takes exactly `step` frames.
const plan = (drum: string, from: string, key: FlapKey, seed: number) => {
  const n0 = drum.length;
  const a = idx(drum, from);
  const b = idx(drum, key.ch);
  const tab = cellTable(seed);
  let n = mod(b - a, n0) + (key.laps ?? 0) * n0;
  if (key.cap !== undefined && n > key.cap + tab.spare) n = key.cap + tab.spare;
  const dur = n === 0 ? 0 : tab.step * Math.sqrt(n);
  const start = key.land ? key.f - dur : key.f + tab.lag;
  return { from, b, n, dur, start };
};

// The k-th face shown on the way: real drums turn one flap at a time; capped runs start further along the wheel, which nobody can see.
const faceAt = (drum: string, p: { from: string; b: number; n: number }, k: number) => {
  const chars = [...drum];
  if (k <= 0) return p.from;
  return chars[mod(p.b - p.n + k, chars.length)]!;
};

export type FlapState = {
  cur: string;
  next: string;
  // 0..1 through the current flap: < 0.5 the old top half is falling, ≥ 0.5 the new bottom half is landing.
  u: number;
  flipping: boolean;
  curTone: Tone;
  nextTone: Tone;
  // Frames since the last flap landed, for the little rebound.
  since: number;
};

// Walks the keys in order; a key that starts while the previous run is still turning re-targets the drum from the face it has reached.
const runs = (spec: CellSpec) => {
  const drum = spec.drum ?? ALPHA;
  const out: { p: ReturnType<typeof plan>; end: number; tone?: Tone }[] = [];
  let ch = " ";
  spec.keys.forEach((key, j) => {
    const p = plan(drum, ch, key, spec.seed * 31 + j);
    const prev = out[out.length - 1];
    if (prev && p.start < prev.p.start + prev.p.dur) {
      prev.end = p.start;
      const k = Math.floor(prev.p.n * EASE(Math.max(0, (p.start - prev.p.start) / prev.p.dur)));
      ch = faceAt(drum, prev.p, k);
      Object.assign(p, plan(drum, ch, key, spec.seed * 31 + j));
    }
    out.push({ p, end: p.start + p.dur, tone: key.tone });
    ch = [...drum][p.b]!;
  });
  return { drum, list: out };
};

export const flapState = (spec: CellSpec, f: number): FlapState => {
  const { drum, list } = runs(spec);
  let ch = " ";
  let tone: Tone = spec.keys[0]?.tone ?? "ink";
  let since = 999;
  for (const r of list) {
    const { p } = r;
    if (f < p.start) break;
    const newTone = r.tone ?? tone;
    if (p.n > 0 && f < r.end) {
      const s = p.n * EASE((f - p.start) / p.dur);
      const k = Math.floor(s);
      return { cur: faceAt(drum, p, k), next: faceAt(drum, p, k + 1), u: s - k, flipping: true, curTone: k === 0 ? tone : newTone, nextTone: newTone, since: 999 };
    }
    ch = [...drum][p.b]!;
    tone = newTone;
    if (p.n > 0) since = f - r.end;
  }
  return { cur: ch, next: ch, u: 0, flipping: false, curTone: tone, nextTone: tone, since };
};

// Every frame (fractional) at which this cell's flaps land: the same plan that draws the cell, so sound and picture agree.
export const clackFrames = (spec: CellSpec): number[] => {
  const out: number[] = [];
  for (const { p, end } of runs(spec).list) {
    for (let i = 1; i <= p.n; i++) {
      const at = p.start + p.dur * (1 - Math.sqrt(1 - i / p.n));
      if (at <= end + 0.001) out.push(at);
    }
  }
  return out;
};

// Text helpers: pad or align a string into a fixed number of cells.
export const fit = (text: string, cols: number, align: "left" | "right" | "center" = "left") => {
  const t = [...text.toUpperCase()].slice(0, cols);
  const pad = cols - t.length;
  const l = align === "left" ? 0 : align === "right" ? pad : Math.floor(pad / 2);
  return [...Array(l).fill(" "), ...t, ...Array(pad - l).fill(" ")] as string[];
};

// Greedy word wrap into rows of `cols` cells.
export const wrap = (text: string, cols: number) => {
  const rows: string[] = [];
  let line = "";
  for (const w of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= cols) line += ` ${w}`;
    else {
      rows.push(line);
      line = w;
    }
  }
  if (line) rows.push(line);
  return rows;
};
