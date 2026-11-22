// Array trace: a row of array cells driven by a real algorithm trace; named pointers glide cell to cell, pairs compare and swap (one hops over the other), cells get marked done, visited or found, a window shades the active range, and a running result line updates.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const MAX = 16;
const COLOURS = ["accent", "accent2", "ink"] as const;
const MARKS = ["done", "visited", "found", "window", "clear"] as const;

const index = z.number().int().min(0).max(MAX - 1);

const pointerSchema = z.object({
  name: z.string().min(1).max(6).describe("Pointer label as written in the code, e.g. 'i', 'j', 'left', 'mid'"),
  colour: z.enum(COLOURS).describe("accent for the main pointer, accent2 for the second, ink for a third"),
  at: z.number().int().min(-1).max(MAX).optional().describe("Index it starts on once the array has built (-1 or the array length = just outside it); leave out to bring it in on its first step"),
});

const markSchema = z.object({
  indices: z.array(index).max(MAX).describe("Cells it applies to. For 'window' the shaded range runs from the smallest to the largest index; an empty list hides the window"),
  as: z.enum(MARKS).describe("done: cell locked in (solid ink); visited: dimmed, ruled out; found: the answer (accent pop + ring); window: shade the active range; clear: remove done/visited/found from these cells"),
});

const stepSchema = z.object({
  word: z.string().optional().describe("Spoken word the step starts on (pointer moves land first, then compare, swap, marks and the note, in that order)"),
  set: z.record(z.string(), z.number().int().min(-1).max(MAX)).optional().describe("Pointer moves, e.g. { \"i\": 3, \"j\": 4 }; -1 or the array length parks a pointer just outside the array"),
  compare: z.tuple([index, index]).optional().describe("Two cells being compared: both light up with a link over them"),
  swap: z.tuple([index, index]).optional().describe("Swap the values in these two cells: the first hops over, the second slides under"),
  marks: z.array(markSchema).max(3).optional().describe("Marks applied after the swap, e.g. [{ indices: [5], as: 'done' }]"),
  note: z.string().max(24).optional().describe("New text for the running result line, e.g. 'max = 7' or '5 > 1, swap'; stays until a later note replaces it"),
});

const schema = z
  .object({
    title: z.string().max(36).optional().describe("One headline above the array, ≤ 6 words, e.g. 'One pass of bubble sort'"),
    titleWord: z.string().optional().describe("Spoken word the headline lands on"),
    values: z
      .array(z.union([z.number().int().min(-999).max(9999), z.string().min(1).max(4)]))
      .min(2)
      .max(MAX)
      .describe("The array, left to right: numbers or short strings (≤ 4 characters). Up to 16; past ~10 (or ~7 in split) the camera follows the action"),
    pointers: z.array(pointerSchema).max(4).describe("Named pointers, drawn as labelled arrows under the cells"),
    steps: z.array(stepSchema).min(1).max(14).describe("The trace, in spoken order, computed by real code so it is exactly right. Each step needs about 1 s (1.6 s with a swap)"),
  })
  .superRefine((p, ctx) => {
    const n = p.values.length;
    const names = new Set<string>();
    p.pointers.forEach((ptr, i) => {
      if (names.has(ptr.name)) ctx.addIssue({ code: "custom", message: `Duplicate pointer '${ptr.name}'`, path: ["pointers", i, "name"] });
      names.add(ptr.name);
      if (ptr.at !== undefined && ptr.at > n) ctx.addIssue({ code: "custom", message: `Pointer '${ptr.name}' starts past the end`, path: ["pointers", i, "at"] });
    });
    const cell = (v: number, path: (string | number)[]) => {
      if (v >= n) ctx.addIssue({ code: "custom", message: `Index ${v} is outside an array of ${n}`, path });
    };
    p.steps.forEach((s, i) => {
      for (const [name, v] of Object.entries(s.set ?? {})) {
        if (!names.has(name)) ctx.addIssue({ code: "custom", message: `Unknown pointer '${name}'`, path: ["steps", i, "set", name] });
        if (v > n) ctx.addIssue({ code: "custom", message: `Pointer '${name}' moved past the end`, path: ["steps", i, "set", name] });
      }
      for (const key of ["compare", "swap"] as const) {
        const pair = s[key];
        if (!pair) continue;
        pair.forEach((v, k) => cell(v, ["steps", i, key, k]));
        if (pair[0] === pair[1]) ctx.addIssue({ code: "custom", message: `${key} needs two different cells`, path: ["steps", i, key] });
      }
      s.marks?.forEach((m, k) => {
        m.indices.forEach((v, j) => cell(v, ["steps", i, "marks", k, "indices", j]));
        if (m.as !== "window" && m.indices.length === 0) ctx.addIssue({ code: "custom", message: `'${m.as}' needs at least one cell`, path: ["steps", i, "marks", k] });
      });
    });
  });

type Props = z.infer<typeof schema>;
type Change = { at: number; dur: number; to: number };
type Shot = { s: number; x: number; y: number };

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Each change adds (to − previous) × its own progress, so a value stays continuous even when a new change starts before the last one has landed.
const track = (init: number, changes: Change[], prog: (at: number, dur: number) => number) => {
  let v = init;
  let prev = init;
  for (const c of changes) {
    v += (c.to - prev) * prog(c.at, c.dur);
    prev = c.to;
  }
  return v;
};

const SWAP = 0.75;
const MOVE = 0.5;
const LANE = 66;
const PILL = 56;
const TIP = 22;
const PF = 36;
// The camera's push on a found cell; the layout leaves room for it so the result line is never covered.
const PUSH = 1.12;

const Trace: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const { values, pointers, steps } = props;
  const n = values.length;
  const labels = values.map(String);
  const P = pointers.length;

  const settle = (at: number, dur: number) =>
    style.motion === "calm"
      ? interpolate(frame, [at * fps, (at + dur) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.18, 1.08) })
      : enter(style, frame, fps, at, dur);
  const smooth = (at: number, dur: number) => enter(calm, frame, fps, at, dur);

  // Build: cells rise in left to right, then the pointers drop in.
  const stagger = Math.min(0.07, 0.9 / n);
  const cellAt = (i: number) => 0.15 + i * stagger;
  const buildEnd = cellAt(n - 1) + 0.5;
  const ptrIntro = buildEnd - 0.1;

  // Inside one step, actions run in reading order: pointers land, then the pair lights, then the swap, then marks, then the note.
  const staged = steps.map((s) => {
    const hasSet = Object.keys(s.set ?? {}).length > 0;
    const pair = s.compare ?? s.swap;
    const cmpOff = hasSet ? 0.38 : 0;
    const swapOff = s.swap ? cmpOff + (s.compare ? 0.34 : 0.12) : cmpOff;
    const marks = s.marks ?? [];
    const markOff = s.swap ? swapOff + SWAP - 0.05 : s.compare ? cmpOff + 0.2 : cmpOff;
    const noteOff = marks.length ? markOff + 0.2 : s.swap ? swapOff + SWAP - 0.1 : s.compare ? cmpOff + 0.15 : hasSet ? 0.3 : 0;
    const dur = Math.max(0.3, hasSet ? MOVE : 0, pair ? cmpOff + 0.3 : 0, s.swap ? swapOff + SWAP : 0, marks.length ? markOff + 0.45 : 0, s.note ? noteOff + 0.4 : 0);
    return { ...s, hasSet, pair, marks, cmpOff, swapOff, markOff, noteOff, dur, at: 0 };
  });

  // Step times: the spoken word (a few frames early), else spread evenly over the free time; kept in order and settled 0.6 s before the end.
  const startF = buildEnd + 0.35;
  const lastDur = staged[staged.length - 1]!.dur;
  const endF = Math.max(startF, duration - 0.6 - lastDur);
  let prevAt = -Infinity;
  staged.forEach((s, i) => {
    const fb = staged.length === 1 ? startF : startF + (i * (endF - startF)) / (staged.length - 1);
    const at = cueAt(cues, s.word, fb + 0.1) - 0.1;
    s.at = Math.min(Math.max(at, buildEnd * 0.8, prevAt + 0.3), duration - 0.6 - s.dur);
    prevAt = s.at;
  });

  // Replay the trace into per-quantity change lists.
  const ptrIdx: (number | undefined)[] = pointers.map((p) => p.at);
  const firstIdx = pointers.map((p) => p.at ?? staged.map((s) => s.set?.[p.name]).find((v) => v !== undefined) ?? 0);
  const ptrStates: { at: number; idx: (number | undefined)[] }[] = [{ at: ptrIntro, idx: [...ptrIdx] }];
  const ptrX: Change[][] = pointers.map(() => []);
  const ptrOp: Change[][] = pointers.map((p) => (p.at !== undefined ? [{ at: ptrIntro, dur: 0.45, to: 1 }] : []));
  const occ = values.map((_, i) => i);
  const itemX: Change[][] = values.map(() => []);
  const itemSwaps: { at: number; over: boolean; from: number; to: number }[][] = values.map(() => []);
  const itemIdx: { at: number; idx: number }[][] = values.map(() => []);
  const wCmp: Change[][] = values.map(() => []);
  const wDone: Change[][] = values.map(() => []);
  const wVis: Change[][] = values.map(() => []);
  const wFound: Change[][] = values.map(() => []);
  const done = values.map(() => 0);
  const vis = values.map(() => 0);
  const found = values.map(() => 0);
  const cmpOn = values.map(() => 0);
  const win = { lo: [] as Change[], hi: [] as Change[], op: [] as Change[], init: [0, 0] as [number, number] };
  let winOn = 0;
  let winSet = false;
  const notes: { at: number; text: string }[] = [];
  const foundAt: { at: number; idx: number }[] = [];
  const links: { a: number; b: number; from: number; to: number; swapAt?: number }[] = [];
  const set = (list: Change[][], state: number[], i: number, to: number, at: number, dur: number) => {
    if (state[i] === to) return;
    list[i]!.push({ at, dur, to });
    state[i] = to;
  };

  staged.forEach((s, k) => {
    const next = staged[k + 1]?.at ?? duration + 1;
    // Pointers.
    if (s.hasSet) {
      for (const [name, v] of Object.entries(s.set ?? {})) {
        const p = pointers.findIndex((x) => x.name === name);
        if (p < 0) continue;
        if (ptrIdx[p] === undefined) ptrOp[p]!.push({ at: s.at, dur: 0.4, to: 1 });
        else if (ptrIdx[p] !== v) ptrX[p]!.push({ at: s.at, dur: MOVE, to: v });
        ptrIdx[p] = v;
      }
      ptrStates.push({ at: s.at, idx: [...ptrIdx] });
    }
    // Compare highlight: on from the compare until the next step starts.
    const cmpAt = s.at + s.cmpOff;
    values.forEach((_, i) => set(wCmp, cmpOn, i, s.pair && s.pair.includes(i) ? 1 : 0, s.pair?.includes(i) ? cmpAt : s.at, 0.3));
    if (s.pair) links.push({ a: s.pair[0], b: s.pair[1], from: cmpAt, to: next, swapAt: s.swap ? s.at + s.swapOff : undefined });
    // Swap: the item in the first cell hops over, the other slides under.
    if (s.swap) {
      const [a, b] = s.swap;
      const at = s.at + s.swapOff;
      const ia = occ[a]!;
      const ib = occ[b]!;
      itemX[ia]!.push({ at, dur: SWAP, to: b });
      itemX[ib]!.push({ at, dur: SWAP, to: a });
      itemSwaps[ia]!.push({ at, over: true, from: a, to: b });
      itemSwaps[ib]!.push({ at, over: false, from: b, to: a });
      itemIdx[ia]!.push({ at: at + SWAP / 2, idx: b });
      itemIdx[ib]!.push({ at: at + SWAP / 2, idx: a });
      occ[a] = ib;
      occ[b] = ia;
    }
    // Marks.
    const mAt = s.at + s.markOff;
    for (const m of s.marks) {
      if (m.as === "window") {
        if (m.indices.length === 0) {
          if (winOn) win.op.push({ at: mAt, dur: 0.35, to: 0 });
          winOn = 0;
          continue;
        }
        const lo = Math.min(...m.indices);
        const hi = Math.max(...m.indices);
        if (!winSet) win.init = [lo, hi];
        else {
          win.lo.push({ at: mAt, dur: 0.55, to: lo });
          win.hi.push({ at: mAt, dur: 0.55, to: hi });
        }
        winSet = true;
        if (!winOn) win.op.push({ at: mAt, dur: 0.45, to: 1 });
        winOn = 1;
        continue;
      }
      for (const i of m.indices) {
        if (m.as === "clear") {
          set(wDone, done, i, 0, mAt, 0.4);
          set(wVis, vis, i, 0, mAt, 0.4);
          set(wFound, found, i, 0, mAt, 0.4);
        } else {
          set(m.as === "done" ? wDone : m.as === "visited" ? wVis : wFound, m.as === "done" ? done : m.as === "visited" ? vis : found, i, 1, mAt, 0.45);
          if (m.as === "found") foundAt.push({ at: mAt, idx: i });
        }
      }
    }
    if (s.note) notes.push({ at: s.at + s.noteOff, text: s.note });
  });

  // Horizontal layout: cells fit the canvas while they stay readable (value text ≥ 42 px); otherwise the row runs wider than the frame and the camera follows the action.
  const side = Math.max(60, W * 0.06);
  const GAP = 0.14;
  const maxChars = Math.max(...labels.map((l) => l.length));
  const minCell = Math.max(96, 31.5 * maxChars);
  const fitCell = (W - side * 2) / (n + (n - 1) * GAP);

  // Pointer labels share a lane only when their pills can't touch; extra lanes stack downwards.
  const pillW = (name: string) => Math.max(76, name.length * PF * 0.6 + 40);
  const lanesFor = (idx: (number | undefined)[], pitch: number) => {
    const lanes = pointers.map(() => 0);
    const placed: { x: number; w: number; lane: number }[] = [];
    const order = pointers.map((_, k) => k).filter((k) => idx[k] !== undefined).sort((a, b) => idx[a]! - idx[b]! || a - b);
    for (const k of order) {
      const x = idx[k]! * pitch;
      const w = pillW(pointers[k]!.name);
      let lane = 0;
      while (placed.some((p) => p.lane === lane && Math.abs(p.x - x) < (p.w + w) / 2 + 12)) lane++;
      lanes[k] = lane;
      placed.push({ x, w, lane });
    }
    return lanes;
  };
  const maxLanes = (pitch: number) => (P ? Math.max(1, ...ptrStates.flatMap((st) => lanesFor(st.idx, pitch).map((l) => l + 1))) : 0);

  // Vertical layout: headline band, room for the hop over the row, pointer lanes and the result line, all with space for the found push.
  const capSize = narrow ? 56 : 72;
  const capLines = props.title ? Math.ceil((props.title.length * capSize * 0.52) / (W - side * 2)) : 0;
  const capTop = H * 0.075;
  const top = props.title ? capTop + capLines * capSize * 1.1 + 36 : H * 0.06;
  const hasNotes = notes.length > 0;
  const NF = narrow ? 46 : 54;
  const noteH = hasNotes ? NF * 1.2 + 36 : 0;
  const above = (c: number) => c / 2 + c * 1.12 + 6;
  const below = (c: number, L: number) => c / 2 + (L ? TIP + 34 + (L - 1) * LANE + PILL : 30);
  const need = (c: number, L: number) => above(c) + below(c, L) * PUSH + (hasNotes ? 40 + noteH : 0);
  let cell = Math.max(minCell, Math.min(narrow ? 150 : 200, fitCell));
  let lanes = maxLanes(cell * (1 + GAP));
  while (cell > minCell && top + need(cell, lanes) > H * 0.95) {
    cell -= 4;
    lanes = maxLanes(cell * (1 + GAP));
  }
  cell = Math.max(cell, minCell);
  const gap = cell * GAP;
  const pitch = cell + gap;
  // Centre what is on screen most of the time (indices down to the result line); the hop only needs its headroom kept clear of the headline.
  const blockUp = cell / 2 + 46;
  const blockDown = below(cell, lanes) * PUSH + (hasNotes ? 40 + noteH : 0);
  const rowY = Math.max(top + above(cell), (top + H * 0.97) / 2 - (blockDown - blockUp) / 2);
  const resultY = rowY + below(cell, lanes) * PUSH + 40;

  const arrW = n * cell + (n - 1) * gap;
  const fits = arrW <= W - 2 * Math.max(48, side * 0.6);
  const worldW = fits ? W : arrW + side * 2;
  const x0 = fits ? (W - arrW) / 2 : side;
  const xOf = (i: number) => x0 + i * pitch + cell / 2;
  const clampX = (x: number, s: number) => Math.min(Math.max(x, W / 2 / s), worldW - W / 2 / s);
  const clampY = (y: number, s: number) => Math.min(Math.max(y, H / 2 / s), H - H / 2 / s);

  // Lane changes ride with the pointer moves that cause them.
  const ptrLane: Change[][] = pointers.map(() => []);
  const laneNow = lanesFor(ptrStates[0]!.idx, pitch);
  const lane0 = [...laneNow];
  for (const st of ptrStates.slice(1)) {
    const ls = lanesFor(st.idx, pitch);
    ls.forEach((l, k) => {
      if (st.idx[k] === undefined) return;
      if (laneNow[k] !== l) ptrLane[k]!.push({ at: st.at, dur: MOVE, to: l });
      laneNow[k] = l;
    });
  }
  // A pointer that enters later starts in the lane it lands in.
  pointers.forEach((p, k) => {
    if (p.at !== undefined) return;
    const firstState = ptrStates.find((st) => st.idx[k] !== undefined);
    if (!firstState) return;
    const l = lanesFor(firstState.idx, pitch)[k]!;
    lane0[k] = l;
    ptrLane[k] = ptrLane[k]!.filter((c) => c.at > firstState.at);
  });

  // Camera: world = canvas at scale 1 when the row fits. Long rows pan to the active cells; a found cell gets one push, answered by a pull-back.
  const focusOf = (s: (typeof staged)[number]) => {
    const ids: number[] = [];
    for (const v of Object.values(s.set ?? {})) ids.push(Math.min(n - 1, Math.max(0, v)));
    if (s.pair) ids.push(...s.pair);
    for (const m of s.marks) if (m.as !== "window") ids.push(...m.indices);
    return ids;
  };
  const centre = (ids: number[]) => (xOf(Math.min(...ids)) + xOf(Math.max(...ids))) / 2;
  const initIds = ptrIdx.length ? pointers.map((p) => p.at).filter((v): v is number => v !== undefined).map((v) => Math.min(n - 1, Math.max(0, v))) : [];
  const firstFocus = initIds.length ? initIds : focusOf(staged[0]!).length ? focusOf(staged[0]!) : [0];
  const wide: Shot = fits ? { s: 1, x: W / 2, y: H / 2 } : { s: 1, x: clampX(centre(firstFocus), 1), y: H / 2 };
  const startShot: Shot = fits ? { s: 1.1, x: clampX(W / 2 * 0.6 + xOf(0) * 0.4, 1.1), y: clampY(rowY, 1.1) } : { s: 1.08, x: clampX(wide.x, 1.08), y: H / 2 };
  type Move = { a: number; b: number; to: Shot; ease: (x: number) => number };
  const pull = Easing.out(Easing.cubic);
  const moves: Move[] = [{ a: 0.1, b: Math.max(1, buildEnd), to: wide, ease: pull }];
  let last = wide;
  let lastEnd = Math.max(1, buildEnd);
  let actionsEnd = buildEnd;
  for (const s of staged) {
    const ids = focusOf(s);
    const fnd = s.marks.filter((m) => m.as === "found").flatMap((m) => m.indices);
    if (fits && fnd.length) {
      const to = { s: PUSH, x: clampX(centre(fnd), PUSH), y: clampY(rowY - (rowY - H / 2) / PUSH, PUSH) };
      const b = s.at + s.markOff - 0.02;
      const a = Math.max(lastEnd, b - 0.6);
      if (b - a > 0.25) {
        moves.push({ a, b, to, ease: sine });
        lastEnd = b;
        last = to;
      }
    } else if (!fits && ids.length) {
      const lo = xOf(Math.min(...ids)) - cell;
      const hi = xOf(Math.max(...ids)) + cell;
      if (lo < last.x - W / 2 || hi > last.x + W / 2) {
        const to = { s: 1, x: clampX((lo + hi) / 2, 1), y: H / 2 };
        const a = Math.max(lastEnd, s.at - 0.55);
        const b = Math.max(a + 0.5, s.at + 0.05);
        moves.push({ a, b, to, ease: sine });
        lastEnd = b;
        last = to;
      }
    }
    actionsEnd = Math.max(actionsEnd, s.at + s.dur);
  }
  if (last.s !== 1) {
    const b = duration - 0.6;
    const a = Math.min(b - 0.4, Math.max(lastEnd + 0.3, actionsEnd, b - 1.0));
    moves.push({ a, b, to: { ...wide, x: fits ? wide.x : last.x }, ease: pull });
  }
  let cam = startShot;
  for (const m of moves) {
    if (t >= m.b) {
      cam = m.to;
      continue;
    }
    if (t > m.a) {
      const p = m.ease((t - m.a) / (m.b - m.a));
      cam = { s: cam.s + (m.to.s - cam.s) * p, x: cam.x + (m.to.x - cam.x) * p, y: cam.y + (m.to.y - cam.y) * p };
    }
    break;
  }
  // Base drift keeps holds alive without reading as motion.
  const s = cam.s * (1 + 0.006 * Math.sin((2 * Math.PI * t) / 9));
  const ox = W / 2 - cam.x * s + 3 * Math.sin((2 * Math.PI * t) / 7.3);
  const oy = H / 2 - cam.y * s + 2 * Math.sin((2 * Math.PI * t) / 8.7 + 1);

  // Look.
  const radius = Math.min(style.radius * 0.9, cell * 0.2);
  const border = hand ? `3px solid ${style.ink}` : `2px solid ${mix(style.ink, 14)}`;
  const valueFont = Math.min(cell * 0.46, (cell * 0.8) / (maxChars * 0.6));
  const colourOf = (c: (typeof COLOURS)[number]) => style[c];
  const idxTop = rowY - cell / 2 - 16 - 30;
  const tipY = rowY + cell / 2 + TIP;

  // Window band.
  const winOp = clamp01(track(0, win.op, smooth));
  const wlo = track(win.init[0], win.lo, settle);
  const whi = track(win.init[1], win.hi, settle);
  const pad = Math.max(12, gap * 0.9);

  const cap = enter(style, frame, fps, Math.max(0, cueAt(cues, props.titleWord, 0.2) - 0.1), 0.8);

  // Running result line: the current note rolls in from below as the previous one leaves upwards.
  const curNote = [...notes].reverse().find((x) => x.at <= t);
  const prevNote = curNote ? notes[notes.indexOf(curNote) - 1] : undefined;
  const roll = curNote ? enter(style, frame, fps, curNote.at, 0.45) : 0;
  const noteBox = hasNotes ? enter(style, frame, fps, notes[0]!.at - 0.15, 0.5) : 0;
  const noteChars = Math.max(...notes.map((x) => x.text.length), 4);
  const noteW = Math.min(W - side * 2, noteChars * NF * 0.6 + 64 + NF * 0.9);

  const boil = (k: number) => (hand ? (hash(k * 13 + Math.floor(t * 8)) - 0.5) * 6 : 0);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 30% 15%, ${mix(style.surface, 70, style.bg)} 0%, ${style.bg} 70%)`, overflow: "hidden" }}>
      {/* Life layer: a slow accent2 glow and ruled lines at half parallax, so camera moves read as depth. */}
      <div
        style={{
          position: "absolute",
          width: W * 0.7,
          height: W * 0.7,
          left: W * 0.55 + 60 * Math.sin((2 * Math.PI * t) / 14),
          top: H * 0.35 + 40 * Math.cos((2 * Math.PI * t) / 17),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${mix(style.accent2, 10)} 0%, transparent 65%)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox * 0.5}px, ${oy * 0.5}px) scale(${1 + (s - 1) * 0.5})`, transformOrigin: "0 0" }}>
        <svg width={worldW + W * 2} height={H * 3} style={{ position: "absolute", left: -W, top: -H }}>
          <defs>
            <pattern id="kit-trace-rules" width={64} height={64} patternUnits="userSpaceOnUse">
              <path d="M0 63.5H64" stroke={style.muted} strokeWidth={1.5} />
              <path d="M32 58v11" stroke={style.muted} strokeWidth={1.5} />
            </pattern>
          </defs>
          <rect width={worldW + W * 2} height={H * 3} fill="url(#kit-trace-rules)" opacity={0.13 + 0.04 * Math.sin((2 * Math.PI * t) / 7)} />
        </svg>
      </div>

      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: worldW, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        {winOp > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: xOf(wlo) - cell / 2 - pad,
              top: rowY - cell / 2 - pad,
              width: (whi - wlo) * pitch + cell + pad * 2,
              height: cell + pad * 2,
              borderRadius: radius + pad * 0.6,
              background: mix(style.accent2, 15),
              border: `3px solid ${mix(style.accent2, 60)}`,
              boxSizing: "border-box",
              opacity: winOp,
              transform: `scaleY(${0.85 + 0.15 * winOp})`,
            }}
          />
        ) : null}

        {/* Slots and indices: the array's fixed places, visible when a value leaves its cell. */}
        {values.map((_, i) => {
          const a = enter(calm, frame, fps, cellAt(i), 0.5);
          return (
            <div key={`slot${i}`}>
              <div
                style={{
                  position: "absolute",
                  left: xOf(i) - cell / 2,
                  top: rowY - cell / 2,
                  width: cell,
                  height: cell,
                  borderRadius: radius,
                  border: `2px dashed ${mix(style.ink, 22)}`,
                  boxSizing: "border-box",
                  opacity: a,
                }}
              />
              <div style={{ position: "absolute", left: xOf(i) - 40, width: 80, top: idxTop, textAlign: "center", fontFamily: style.mono, fontSize: 30, lineHeight: "30px", color: style.muted, opacity: a }}>{i}</div>
            </div>
          );
        })}

        {/* Compare link: a dashed arc over the pair, which the hop then follows. */}
        <svg width={worldW} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {links.map((l, k) => {
            const on = smooth(l.from, 0.3) * (1 - smooth(l.to, 0.25)) * (l.swapAt !== undefined ? 1 - smooth(l.swapAt, 0.2) : 1);
            if (on <= 0.001) return null;
            const xa = xOf(l.a);
            const xb = xOf(l.b);
            const y = idxTop - 14;
            const h = cell * 0.35 + Math.abs(xb - xa) * 0.08 + boil(k);
            return (
              <path
                key={k}
                d={`M${xa} ${y} Q${(xa + xb) / 2} ${y - h * 2} ${xb} ${y}`}
                fill="none"
                stroke={style.accent}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="2 12"
                opacity={on}
              />
            );
          })}
        </svg>

        {/* Values: each is an item that can travel between slots. */}
        {values.map((_, id) => {
          const a = enter(style, frame, fps, cellAt(id) + 0.05, 0.5);
          const xi = track(id, itemX[id]!, smooth);
          const sw = itemSwaps[id]!.find((w) => t >= w.at && t < w.at + SWAP);
          const p = sw ? smooth(sw.at, SWAP) : 0;
          const lastSw = [...itemSwaps[id]!].reverse().find((w) => t >= w.at + SWAP);
          const land = lastSw ? bump(t - lastSw.at - SWAP, 0.28) : 0;
          const hop = sw?.over ? -cell * 1.12 * Math.sin(Math.PI * p) : 0;
          const dip = sw && !sw.over ? 1 - 0.14 * Math.sin(Math.PI * p) : 1;
          const at = [...itemIdx[id]!].reverse().find((x) => t >= x.at)?.idx ?? id;
          const c = clamp01(track(0, wCmp[at]!, smooth));
          const dn = clamp01(track(0, wDone[at]!, settle));
          const vs = clamp01(track(0, wVis[at]!, settle));
          const fd = clamp01(track(0, wFound[at]!, settle));
          const pop = Math.max(0, ...foundAt.filter((f) => f.idx === at).map((f) => bump(t - f.at, 0.38)));
          const bg = mix(style.accent, fd * 100, mix(style.ink, dn * 100, mix(style.bg, vs * 70, style.surface)));
          const ink = mix(style.bg, Math.max(fd, dn) * 100, mix(style.muted, vs * 100, style.ink));
          const rot = hand ? (hash(id * 7.3) - 0.5) * 2.4 : 0;
          const lift = -10 * c;
          return (
            <div
              key={`item${id}`}
              style={{
                position: "absolute",
                left: xOf(xi) - cell / 2,
                top: rowY - cell / 2 + hop + lift + (1 - a) * 26,
                width: cell,
                height: cell,
                zIndex: sw ? (sw.over ? 3 : 0) : 1,
                borderRadius: radius,
                border: dn > 0.5 || fd > 0.5 ? `2px solid transparent` : border,
                boxSizing: "border-box",
                background: bg,
                opacity: a,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `rotate(${rot}deg) scale(${(0.8 + 0.2 * a) * dip * (1 + 0.12 * pop)}, ${(0.8 + 0.2 * a) * dip * (1 + 0.12 * pop) * (1 - 0.07 * land)})`,
                transformOrigin: "50% 100%",
                boxShadow: `0 ${cell * 0.06 + (sw?.over ? 20 * Math.sin(Math.PI * p) : 0)}px ${cell * 0.18 + (sw?.over ? 30 * Math.sin(Math.PI * p) : 0)}px rgba(0,0,0,${0.1 + 0.06 * c}), 0 0 0 ${4 * c}px ${style.accent}, 0 0 ${40 * c}px ${mix(style.accent, 35 * c)}`,
              }}
            >
              <span style={{ fontFamily: style.mono, fontWeight: 600, fontSize: valueFont, color: ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{labels[id]}</span>
            </div>
          );
        })}

        {/* Found rings. */}
        {foundAt.map((f, k) => {
          const q = (t - f.at) / 0.6;
          if (q < 0 || q > 1) return null;
          const e = Easing.out(Easing.cubic)(q);
          return (
            <div
              key={`ring${k}`}
              style={{
                position: "absolute",
                left: xOf(f.idx) - cell / 2,
                top: rowY - cell / 2,
                width: cell,
                height: cell,
                borderRadius: radius,
                border: `4px solid ${style.accent}`,
                boxSizing: "border-box",
                opacity: 1 - q,
                transform: `scale(${1 + e * 0.45})`,
                zIndex: 4,
              }}
            />
          );
        })}

        {/* Pointers: arrows under the cells with their name in a pill; shared or crowded cells stack the pills in lanes. */}
        {pointers.map((ptr, k) => {
          const op = clamp01(track(0, ptrOp[k]!, smooth));
          if (op <= 0.001) return null;
          const xi = track(firstIdx[k]!, ptrX[k]!, settle);
          const lane = track(lane0[k]!, ptrLane[k]!, settle);
          const colour = colourOf(ptr.colour);
          const x = xOf(xi);
          const pillTop = tipY + 34 + lane * LANE;
          const w = pillW(ptr.name);
          const j = boil(k + 40);
          return (
            <div key={`ptr${k}`} style={{ position: "absolute", left: 0, top: 0, opacity: op, transform: `translateY(${(1 - op) * 24}px)`, zIndex: 5 - k }}>
              <svg width={worldW} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <path d={`M${x} ${tipY + 14} Q${x + j} ${(tipY + pillTop) / 2} ${x} ${pillTop + 2}`} stroke={colour} strokeWidth={5} strokeLinecap="round" fill="none" />
                {hand ? (
                  <path d={`M${x - 15} ${tipY + 19} L${x} ${tipY} L${x + 15} ${tipY + 19}`} stroke={colour} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ) : (
                  <path d={`M${x - 16} ${tipY + 20} L${x} ${tipY} L${x + 16} ${tipY + 20} Z`} fill={colour} />
                )}
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: x - w / 2,
                  top: pillTop,
                  width: w,
                  height: PILL,
                  borderRadius: Math.min(PILL / 2, style.radius * 1.2 + 4),
                  background: colour,
                  color: style.bg,
                  fontFamily: hand ? style.display : style.mono,
                  fontWeight: hand ? 700 : 600,
                  fontSize: hand ? PF * 1.2 : PF,
                  lineHeight: `${PILL}px`,
                  textAlign: "center",
                  boxShadow: `0 6px 18px ${mix(style.ink, 14)}`,
                }}
              >
                {ptr.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outside the rig: headline, running result line, vignette. */}
      {props.title ? (
        <div style={{ position: "absolute", left: side, top: capTop, width: W - side * 2, overflow: "hidden", paddingBottom: 8 }}>
          <div
            style={{
              fontFamily: style.display,
              fontWeight: hand ? 700 : 600,
              fontSize: hand ? capSize * 1.15 : capSize,
              lineHeight: 1.08,
              letterSpacing: hand ? 0 : "-0.015em",
              color: style.ink,
              transform: `translateY(${(1 - cap) * 115}%)`,
            }}
          >
            {props.title}
          </div>
        </div>
      ) : null}
      {hasNotes && noteBox > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: (W - noteW) / 2,
            top: resultY,
            width: noteW,
            height: noteH,
            borderRadius: Math.min(noteH / 2, style.radius + 6),
            background: mix(style.surface, 92, style.bg),
            border: hand ? `3px solid ${style.ink}` : `2px solid ${mix(style.ink, 12)}`,
            boxSizing: "border-box",
            boxShadow: `0 10px 30px ${mix(style.ink, 8)}`,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            gap: NF * 0.35,
            opacity: noteBox,
            transform: `translateY(${(1 - noteBox) * 30}px)`,
          }}
        >
          <span style={{ fontFamily: style.mono, fontWeight: 600, fontSize: NF, color: style.accent, lineHeight: 1 }}>›</span>
          <div style={{ position: "relative", flex: 1, height: NF * 1.2, overflow: "hidden" }}>
            {prevNote && roll < 1 ? (
              <div style={{ position: "absolute", left: 0, top: 0, fontFamily: style.mono, fontWeight: 600, fontSize: NF, lineHeight: `${NF * 1.2}px`, color: style.ink, whiteSpace: "nowrap", transform: `translateY(${-roll * 110}%)`, opacity: 1 - roll }}>
                {prevNote.text}
              </div>
            ) : null}
            {curNote ? (
              <div style={{ position: "absolute", left: 0, top: 0, fontFamily: style.mono, fontWeight: 600, fontSize: NF, lineHeight: `${NF * 1.2}px`, color: style.ink, whiteSpace: "nowrap", transform: `translateY(${(1 - roll) * 110}%)` }}>
                {curNote.text}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.16) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "array-trace",
  title: "Array trace",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "DSA walkthroughs on an array: up to 16 cells (numbers or ≤ 4-character strings) with up to 4 named pointers (i, j, left, right, mid…). Each step of a trace computed by real code lands on a spoken word: pointers glide to new cells, two cells compare, two values swap (one hops over the other), cells get marked done / visited / found, a window shades the active range (sliding window, binary-search bounds, unsorted part), and a running result line updates ('max = 7'). Rows longer than ~10 cells (~7 in split) run wider than the frame and the camera follows the action; a found cell gets one push. No media.",
  avoid:
    "More than ~8 steps in under 10 s (a step needs ~1 s, ~1.6 s with a swap), traces typed by hand instead of computed, 2-D grids, trees or linked lists (use another template), and arrays longer than 16 (show a slice).",
  schema,
  example: {
    title: "One pass of bubble sort",
    titleWord: "pass",
    values: [5, 1, 4, 2, 8, 3],
    pointers: [
      { name: "j", colour: "accent" },
      { name: "j+1", colour: "accent2" },
    ],
    steps: [
      { word: "start", set: { j: 0, "j+1": 1 }, marks: [{ indices: [0, 1, 2, 3, 4, 5], as: "window" }], note: "swaps = 0" },
      { word: "bigger", compare: [0, 1], swap: [0, 1], note: "swaps = 1" },
      { word: "again", set: { j: 1, "j+1": 2 }, compare: [1, 2], swap: [1, 2], note: "swaps = 2" },
      { word: "two", set: { j: 2, "j+1": 3 }, compare: [2, 3], swap: [2, 3], note: "swaps = 3" },
      { word: "eight", set: { j: 3, "j+1": 4 }, compare: [3, 4], note: "5 < 8, keep" },
      { word: "three", set: { j: 4, "j+1": 5 }, compare: [4, 5], swap: [4, 5], note: "swaps = 4" },
      { word: "home", marks: [{ indices: [5], as: "done" }, { indices: [0, 1, 2, 3, 4], as: "window" }], note: "8 is home" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.3, end: 0.6, word: "One" },
    { at: 0.6, end: 0.9, word: "pass" },
    { at: 1.6, end: 2.0, word: "start" },
    { at: 2.9, end: 3.3, word: "bigger" },
    { at: 4.6, end: 4.9, word: "again" },
    { at: 6.3, end: 6.6, word: "two" },
    { at: 8.0, end: 8.4, word: "eight" },
    { at: 9.3, end: 9.7, word: "three" },
    { at: 11.2, end: 11.6, word: "home" },
  ],
  seconds: { min: 4, max: 16, demo: 13 },
  mediaSlots: 0,
  credit: { name: "'What is Git explainer' by @Yunn260414 (prompt-motion.com), for clarity-first teaching", url: "https://prompt-motion.com/yunn260414-60d996" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Trace props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
