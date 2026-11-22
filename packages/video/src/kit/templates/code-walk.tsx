// Code walk: an editor surface where code types in or reveals line by line, an optional diff swaps old lines for new ones, then the camera walks the code, spotlighting line ranges on spoken words with hand-placed notes and arrows beside them.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const MAX_LINES = 14;
const MAX_COLS = 48;

// Tabs count as 4 columns; trailing blank lines and trailing spaces are dropped so the planner's string and the screen agree on line numbers.
const splitCode = (code: string) =>
  code
    .replace(/\r/g, "")
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => l.replace(/\t/g, "    ").replace(/\s+$/, ""));

const lineNo = z.number().int().min(1).max(MAX_LINES);

const focusSchema = z.object({
  lines: z.tuple([lineNo, lineNo]).describe("First and last line to spotlight, 1-based, counting every line of `code` (diff lines included); [4, 4] for one line"),
  note: z.string().max(32).optional().describe("Hand-written note beside the lines, ≤ 6 words, e.g. 'One lookup, not a loop'"),
  word: z.string().optional().describe("Spoken word the spotlight lands on"),
});

const schema = z
  .object({
    language: z.string().min(1).max(12).describe("Language, for colouring and the tab pill: python, js, ts, java, c, cpp, go, rust, sql, bash…"),
    file: z.string().max(22).optional().describe("File name in the editor tab, e.g. 'two_sum.py'"),
    code: z
      .string()
      .min(1)
      .max(800)
      .describe("The code, ≤ 14 lines × 48 columns (a tab counts as 4). Real code that runs; no line numbers. With a diff, write every line of both versions in order (old lines that go and new lines that come)"),
    reveal: z.enum(["type", "lines", "instant"]).default("type").describe("type: typed in with a caret (≤ ~8 lines reads best); lines: lines slide in one by one; instant: the code is there when the editor lands"),
    revealWord: z.string().optional().describe("Spoken word the typing or line reveal starts on"),
    diff: z
      .object({
        added: z.array(lineNo).max(MAX_LINES).default([]).describe("Lines (1-based, in `code`) that are new: hidden until the diff, then they open up and type in"),
        removed: z.array(lineNo).max(MAX_LINES).default([]).describe("Lines (1-based, in `code`) that go: struck through at the diff"),
        collapse: z.boolean().default(true).describe("true: struck lines then fold away so the final code reads clean; false: they stay, struck"),
        word: z.string().optional().describe("Spoken word the diff lands on"),
      })
      .optional()
      .describe("Turn the old version into the new one after the reveal, before the spotlights"),
    focus: z
      .array(focusSchema)
      .max(6)
      .default([])
      .describe("Spotlights in spoken order. Each needs ~1.8 s; the camera pushes to the first and glides between the rest, other lines dim"),
  })
  .superRefine((p, ctx) => {
    const lines = splitCode(p.code);
    const n = lines.length;
    if (n > MAX_LINES) ctx.addIssue({ code: "custom", message: `${n} lines; the editor holds ${MAX_LINES}`, path: ["code"] });
    lines.forEach((l, i) => {
      if (l.length > MAX_COLS) ctx.addIssue({ code: "custom", message: `Line ${i + 1} is ${l.length} columns; max ${MAX_COLS}`, path: ["code"] });
    });
    const added = new Set(p.diff?.added ?? []);
    const removed = new Set(p.diff?.removed ?? []);
    for (const [key, set] of [["added", added], ["removed", removed]] as const) {
      [...set].forEach((v) => {
        if (v > n) ctx.addIssue({ code: "custom", message: `Line ${v} is past the end (${n} lines)`, path: ["diff", key] });
      });
    }
    [...added].forEach((v) => {
      if (removed.has(v)) ctx.addIssue({ code: "custom", message: `Line ${v} is both added and removed`, path: ["diff"] });
    });
    if (n - added.size < 1) ctx.addIssue({ code: "custom", message: "At least one line must exist before the diff", path: ["diff", "added"] });
    p.focus.forEach((f, k) => {
      const [a, b] = f.lines;
      if (a > b) ctx.addIssue({ code: "custom", message: "First line comes after the last", path: ["focus", k, "lines"] });
      if (b > n) ctx.addIssue({ code: "custom", message: `Line ${b} is past the end (${n} lines)`, path: ["focus", k, "lines"] });
      if ((p.diff?.collapse ?? true) && f.lines.some((v) => removed.has(v)))
        ctx.addIssue({ code: "custom", message: "A spotlight can't land on a removed line once it folds away (set diff.collapse false)", path: ["focus", k, "lines"] });
    });
  });

type Props = z.infer<typeof schema>;
type Kind = "kw" | "str" | "num" | "com" | "fn" | "deco" | "punc" | "id" | "ws";
type Tok = { text: string; kind: Kind };
type Shot = { s: number; x: number; y: number };

const KW = new Set(
  "and as assert async await break case catch class const continue def default defer del delete do elif else enum except export extends final finally fn for from func function go if impl implements import in interface is lambda let loop match mod mut new nil not of or package pass pub raise return select self static struct super switch this throw throws try type typeof use var void while with yield true false null None True False undefined int long float double char bool boolean str string public private protected"
    .split(" "),
);
const SQL_KW = new Set(
  "select from where join left right inner outer on group by order having limit insert into values update set delete create table index as and or not null is in distinct count sum avg min max union all case when then else end primary key asc desc".split(" "),
);

// A one-line tokenizer: enough colour to read code on video, not a parser (block comments and strings that span lines are not tracked).
const tokenize = (line: string, lang: string): Tok[] => {
  const hashC = /^(py|python|rb|ruby|sh|bash|shell|zsh|yaml|yml|r|toml|make|perl)$/.test(lang);
  const dashC = /^(sql|lua|haskell|hs)$/.test(lang);
  const sql = lang === "sql";
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    let m: RegExpMatchArray | null;
    let tok: Tok;
    if ((hashC && rest.startsWith("#")) || (dashC && rest.startsWith("--")) || (!hashC && !dashC && rest.startsWith("//"))) tok = { text: rest, kind: "com" };
    else if (!hashC && !dashC && (m = rest.match(/^\/\*.*?(\*\/|$)/))) tok = { text: m[0], kind: "com" };
    else if ((m = rest.match(/^\s+/))) tok = { text: m[0], kind: "ws" };
    else if ((m = rest.match(/^(["'`])(?:\\.|(?!\1).)*\1?/))) tok = { text: m[0], kind: "str" };
    else if ((m = rest.match(/^\d[\d_]*(\.\d+)?/))) tok = { text: m[0], kind: "num" };
    else if ((m = rest.match(/^@[A-Za-z_][\w.]*/))) tok = { text: m[0], kind: "deco" };
    else if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const w = m[0];
      const isKw = sql ? SQL_KW.has(w.toLowerCase()) : KW.has(w);
      const call = /^\s*\(/.test(line.slice(i + w.length));
      tok = { text: w, kind: isKw ? "kw" : call ? "fn" : "id" };
    } else tok = { text: rest[0]!, kind: "punc" };
    out.push(tok);
    i += tok.text.length;
  }
  return out;
};

// Greedy word wrap by an average glyph width; notes are short, so this only decides one line or two.
const greedy = (text: string, maxChars: number) => {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > maxChars) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
};
// Balanced: the narrowest width that keeps the same row count, so a two-line note never ends on one orphaned word.
const wrap = (text: string, maxChars: number) => {
  const rows = greedy(text, maxChars);
  let best = rows;
  for (let c = maxChars - 1; c >= 4 && rows.length > 1; c--) {
    const r = greedy(text, c);
    if (r.length !== rows.length) break;
    best = r;
  }
  return best;
};

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const TAB_H = 76;
const NOTE_W = 500;
const NOTE_GAP = 72;
// Average glyph width of the note font in em, for wrapping and arrow/underline lengths.
const NOTE_EM = 0.44;
const FS_MAX = 52;

const Walk: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const split = W < 1400;
  const lang = props.language.toLowerCase();
  const lines = splitCode(props.code);
  const n = lines.length;
  const toks = lines.map((l) => tokenize(l, lang));
  const indent = lines.map((l) => l.match(/^ */)![0].length);
  const focus = props.focus ?? [];

  const added = new Set((props.diff?.added ?? []).map((v) => v - 1));
  const removed = new Set((props.diff?.removed ?? []).map((v) => v - 1));
  const hasDiff = added.size + removed.size > 0;
  const collapse = props.diff?.collapse ?? true;

  // Pure time curves: `ease` for geometry evaluated at any moment, `pop` for entrances in the style's temperament.
  const ease = (at: number, dur: number, tau = t) =>
    !Number.isFinite(at) ? 0 : interpolate(tau, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const pop = (at: number, dur: number) => enter(style, frame, fps, at, dur);
  const settle = (at: number, dur: number) =>
    style.motion === "calm"
      ? interpolate(frame, [at * fps, (at + dur) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.18, 1.06) })
      : enter(style, frame, fps, at, dur);

  // ---- Timeline: editor lands, code reveals, the diff swaps lines, then the spotlights walk the code.
  const base = lines.map((_, i) => i).filter((i) => !added.has(i));
  const revealAt = props.reveal === "instant" ? 0.05 : Math.max(0.4, cueAt(cues, props.revealWord, 0.6) - 0.1);
  const typeLen = lines.map((l, i) => l.length - indent[i]!);
  const PAUSE = 0.05;
  const total = base.reduce((a, i) => a + typeLen[i]!, 0);
  const typeDur = Math.min(Math.max(0.8, total / 46 + base.length * PAUSE), Math.max(0.8, duration * 0.36));
  const cps = total / Math.max(0.2, typeDur - base.length * PAUSE);
  const lineStart = lines.map(() => 0);
  const lineDur = lines.map(() => 0.01);
  {
    let c = revealAt;
    for (const i of base) {
      lineStart[i] = c;
      lineDur[i] = Math.max(0.01, typeLen[i]! / cps);
      c += lineDur[i]! + PAUSE;
    }
  }
  const stagger = Math.min(0.09, 1.1 / Math.max(1, base.length));
  const readyAt = props.reveal === "type" ? revealAt + typeDur : props.reveal === "lines" ? revealAt + (base.length - 1) * stagger + 0.5 : 0.75;

  const diffAt = hasDiff ? Math.max(readyAt + 0.2, cueAt(cues, props.diff?.word, readyAt + 0.6) - 0.1) : Infinity;
  const SWAP_AT = 0.45;
  const SWAP = 0.6;
  const TYPE_AT = 0.8;
  const TYPE = 0.6;
  const diffEnd = hasDiff ? diffAt + TYPE_AT + TYPE : readyAt;

  const fStart = diffEnd + 0.25;
  const fEnd = Math.max(fStart, duration - 0.6 - 1.5);
  let prevAt = -Infinity;
  const fAt = focus.map((f, k) => {
    const fb = focus.length === 1 ? fStart : fStart + (k * (fEnd - fStart)) / (focus.length - 1);
    let at = cueAt(cues, f.word, fb + 0.12) - 0.12;
    at = Math.max(at, fStart - 0.25, prevAt + 1.2);
    at = Math.min(at, duration - 0.6 - 1.2);
    prevAt = at;
    return at;
  });
  const nextAt = (k: number) => (k + 1 < fAt.length ? fAt[k + 1]! : Infinity);

  // ---- Layout: the largest mono size (≤ 46 px) at which the longest line and the tallest state fit beside the notes column.
  const hasNotes = focus.some((f) => f.note);
  const M = split ? 40 : 96;
  const cols = Math.max(14, ...lines.map((l) => l.length));
  const digits = String(n).length;
  const nMax = Math.max(base.length, n - (collapse ? removed.size : 0));
  const noteFs = (split ? 40 : 46) * (hand ? 1.22 : 1);
  const noteLH = noteFs * 1.16;
  const noteWeight = hand ? 700 : style.display === style.body ? 600 : 400;

  const metrics = (fs: number) => {
    const charW = fs * 0.6;
    const LH = Math.round(fs * 1.55);
    const numFs = Math.max(26, Math.round(fs * 0.76));
    const gutterW = 30 + digits * numFs * 0.6 + 16 + charW + 18;
    const padR = Math.max(56, fs * 1.3);
    const editorW = Math.max(split ? 0 : 640, gutterW + cols * charW + padR);
    const padY = Math.round(fs * 0.7);
    const sNoteW = editorW - gutterW - 64 - padR * 0.5;
    const noteRows = focus.map((f) => (f.note ? wrap(f.note, Math.floor((split ? sNoteW : NOTE_W) / (noteFs * NOTE_EM))) : []));
    const gapH = noteRows.map((r) => (r.length && split ? r.length * noteLH + 40 : 0));
    const maxGap = Math.max(0, ...gapH);
    const panelH = TAB_H + padY * 2 + nMax * LH;
    return { fs, charW, LH, numFs, gutterW, padR, editorW, padY, noteRows, gapH, maxGap, panelH };
  };
  let mt = metrics(FS_MAX);
  for (let fs = FS_MAX; fs >= 26; fs--) {
    mt = metrics(fs);
    const fitW = split ? W - 2 * M : W - 2 * M - (hasNotes ? NOTE_GAP + NOTE_W : 0);
    const fitH = H - (split ? 88 : 140);
    if (mt.editorW <= fitW && mt.panelH + mt.maxGap <= fitH) break;
  }
  const { fs, charW, LH, numFs, gutterW, padR, editorW, padY, noteRows, gapH, maxGap } = mt;
  const groupW = editorW + (!split && hasNotes ? NOTE_GAP + NOTE_W : 0);
  // The editor sits centred until the first spotlight, then slides left to make room for the notes column.
  const groupX = (W - groupW) / 2;
  const slide = groupW > editorW && fAt.length ? settle(fAt[0]! - 0.55, 0.7) : 0;
  const edX = (W - editorW) / 2 + (groupX - (W - editorW) / 2) * slide;
  const codeX = edX + gutterW;
  const noteX = groupX + editorW + NOTE_GAP;
  const codeXFinal = groupX + gutterW;

  // Line heights (0–1 of a row) at any moment: added lines open at the diff, removed lines fold away.
  const swapP = (tau: number) => (hasDiff ? ease(diffAt + SWAP_AT, SWAP, tau) : 0);
  const gapOpen = (k: number, tau: number) => (gapH[k]! > 0 ? ease(fAt[k]! + 0.12, 0.5, tau) * (1 - ease(nextAt(k) - 0.05, 0.4, tau)) : 0);
  const geom = (tau: number) => {
    const sp = swapP(tau);
    const h = lines.map((_, i) => (added.has(i) ? sp : removed.has(i) && collapse ? 1 - sp : 1) * LH);
    const gap = lines.map(() => 0);
    if (split) focus.forEach((f, k) => (gap[f.lines[1] - 1] = gap[f.lines[1] - 1]! + gapH[k]! * gapOpen(k, tau)));
    const ys: number[] = [];
    let y = 0;
    lines.forEach((_, i) => {
      ys.push(y);
      y += h[i]! + gap[i]!;
    });
    const noGap = TAB_H + padY * 2 + h.reduce((a, b) => a + b, 0);
    const panelH = TAB_H + padY * 2 + y;
    const top = split ? Math.max(44, (H - noGap - maxGap) / 2) : (H - panelH) / 2;
    return { h, gap, ys, panelH, top, codeTop: top + TAB_H + padY };
  };
  const g = geom(t);
  const yStart = (gg: typeof g, f: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(f)));
    return gg.codeTop + gg.ys[i]! + gg.h[i]! * clamp01(f - i);
  };
  const yEnd = (gg: typeof g, f: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.ceil(f) - 1));
    return gg.codeTop + gg.ys[i]! + gg.h[i]! * clamp01(f - i);
  };
  const blockCols = (k: number) => Math.max(1, ...lines.slice(focus[k]!.lines[0] - 1, focus[k]!.lines[1]).map((l) => l.length));
  const noteH = (k: number) => noteRows[k]!.length * noteLH;

  // ---- Camera: settles from a slight push to the wide, pushes to the first spotlight, glides between the rest, pulls back at the end if there's room.
  const wide: Shot = { s: 1, x: W / 2, y: H / 2 };
  const clampX = (x: number, s: number) => Math.min(Math.max(x, W / 2 / s), W - W / 2 / s);
  const clampY = (y: number, s: number) => Math.min(Math.max(y, H / 2 / s), H - H / 2 / s);
  const shotFor = (k: number): Shot => {
    const gg = geom(fAt[k]! + 0.8);
    const [a, b] = focus[k]!.lines;
    const top = gg.codeTop + gg.ys[a - 1]!;
    const bot = gg.codeTop + gg.ys[b - 1]! + gg.h[b - 1]! + gg.gap[b - 1]!;
    if (split) {
      const s = Math.max(1, Math.min(1.16, (H * 0.8) / (bot - top), (W * 0.99) / editorW));
      return { s, x: clampX(W / 2, s), y: clampY(H / 2 + ((top + bot) / 2 - H / 2) * 0.9, s) };
    }
    const note = focus[k]!.note;
    const left = groupX - 24;
    const right = note ? noteX + Math.min(NOTE_W, Math.max(...noteRows[k]!.map((r) => r.length)) * noteFs * NOTE_EM) + 40 : codeXFinal + blockCols(k) * charW + 120;
    const mid = (top + bot) / 2;
    const nh = note ? noteH(k) + 40 : 0;
    const s = Math.max(1, Math.min(1.26, (W * 0.94) / (right - left), (H * 0.78) / Math.max(bot - top, nh)));
    return { s, x: clampX((left + right) / 2, s), y: clampY(H / 2 + (mid - H / 2) * 0.85, s) };
  };
  type Move = { a: number; b: number; to: Shot; ease: (x: number) => number };
  const pull = Easing.out(Easing.cubic);
  const moves: Move[] = [{ a: 0.05, b: 1.1, to: wide, ease: pull }];
  let lastEnd = 1.1;
  let last = wide;
  focus.forEach((_, k) => {
    const to = shotFor(k);
    const a = Math.max(lastEnd, fAt[k]! - 0.5);
    const b = Math.max(a + 0.45, fAt[k]! + 0.25);
    moves.push({ a, b, to, ease: sine });
    lastEnd = b;
    last = to;
  });
  if (focus.length && last.s > 1.001) {
    const b = duration - 0.6;
    const a = Math.max(lastEnd + 0.25, fAt[fAt.length - 1]! + 1.6, b - 1.2);
    if (b - a >= 0.6) moves.push({ a, b, to: wide, ease: pull });
  }
  let cam: Shot = { s: 1.06, x: W / 2, y: H / 2 };
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

  // ---- Spotlight: each line's weight rises when a spotlight covering it lands and falls when the next one takes over; the band glides between ranges.
  const fe = fAt.map((at) => settle(at, 0.45));
  const dimOn = fe.length ? fe[0]! : 0;
  const weight = (i: number) =>
    focus.reduce((acc, f, k) => (i >= f.lines[0] - 1 && i <= f.lines[1] - 1 ? acc + fe[k]! - (k + 1 < fe.length ? fe[k + 1]! : 0) : acc), 0);
  let bandLo = focus.length ? focus[0]!.lines[0] - 1 : 0;
  let bandHi = focus.length ? focus[0]!.lines[1] : 0;
  for (let k = 1; k < focus.length; k++) {
    const p = settle(fAt[k]!, 0.5);
    bandLo += (focus[k]!.lines[0] - 1 - bandLo) * p;
    bandHi += (focus[k]!.lines[1] - bandHi) * p;
  }
  const bandTop = yStart(g, bandLo) - 4;
  const bandBot = yEnd(g, bandHi) + 4;

  // ---- Look.
  const colour = (k: Kind) =>
    k === "kw"
      ? mix(style.accent, 84, style.ink)
      : k === "str"
        ? mix(style.accent2, 84, style.ink)
        : k === "num" || k === "deco"
          ? mix(style.accent2, 62, style.ink)
          : k === "com"
            ? style.muted
            : k === "punc"
              ? mix(style.ink, 66, style.muted)
              : style.ink;
  const panelIn = pop(0.05, 0.7);
  const boil = (k: number) => (hand ? (hash(k * 17 + Math.floor(t * 8)) - 0.5) * 7 : 0);
  const typed = (i: number) => {
    if (added.has(i)) return indent[i]! + Math.round(typeLen[i]! * clamp01((t - diffAt - TYPE_AT) / TYPE));
    if (props.reveal !== "type") return lines[i]!.length;
    if (t < lineStart[i]!) return 0;
    return indent[i]! + Math.round(typeLen[i]! * clamp01((t - lineStart[i]!) / lineDur[i]!));
  };
  const strike = hasDiff ? ease(diffAt, 0.35) : 0;
  const afterSwap = t >= diffAt + SWAP_AT + SWAP / 2;
  const present = (i: number) => (afterSwap ? !(removed.has(i) && collapse) && !(removed.has(i) && !collapse) : !added.has(i));
  const numbers = lines.map(() => 0);
  {
    let c = 0;
    lines.forEach((_, i) => {
      if (present(i)) numbers[i] = ++c;
    });
  }
  const addTint = hasDiff ? ease(diffAt + SWAP_AT, 0.4) * (1 - ease(diffEnd + 0.5, 0.7)) : 0;

  // Typing caret: rides the line being typed, blinks while waiting.
  const firstEvent = Math.min(diffAt, fAt[0] ?? Infinity, duration - 0.6);
  let caret: { x: number; y: number } | null = null;
  if (props.reveal === "type" && t < firstEvent) {
    const cur = [...base].reverse().find((i) => t >= lineStart[i]!) ?? base[0]!;
    caret = { x: codeX + Math.max(indent[cur]!, typed(cur)) * charW, y: g.codeTop + g.ys[cur]! };
  }
  const typing = t >= revealAt && t < readyAt;
  const caretOn = typing || Math.floor(t * 2.4) % 2 === 0;

  const radius = style.radius;
  const border = hand ? `3px solid ${style.ink}` : `1.5px solid ${mix(style.ink, 11)}`;

  const renderLine = (i: number) => {
    const c = typed(i);
    const out: ReactNode[] = [];
    let left = c;
    toks[i]!.forEach((tk, j) => {
      if (left <= 0) return;
      out.push(
        <span key={j} style={{ color: colour(tk.kind), fontStyle: tk.kind === "com" ? "italic" : undefined, fontWeight: tk.kind === "fn" || (tk.kind === "kw" && !hand) ? 600 : 400 }}>
          {tk.text.slice(0, left)}
        </span>,
      );
      left -= tk.text.length;
    });
    return out;
  };

  return (
    <AbsoluteFill style={{ background: `radial-gradient(130% 100% at 25% 10%, ${mix(style.surface, 62, style.bg)} 0%, ${style.bg} 72%)`, overflow: "hidden" }}>
      {/* Life layer: a slow accent glow and a dot grid at half parallax, so camera moves read as depth. */}
      <div
        style={{
          position: "absolute",
          width: W * 0.8,
          height: W * 0.8,
          left: W * 0.45 + 70 * Math.sin((2 * Math.PI * t) / 15),
          top: -H * 0.25 + 50 * Math.cos((2 * Math.PI * t) / 18),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${mix(style.accent, 9)} 0%, transparent 62%)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox * 0.45}px, ${oy * 0.45}px) scale(${1 + (s - 1) * 0.45})`, transformOrigin: "0 0" }}>
        <svg width={W * 3} height={H * 3} style={{ position: "absolute", left: -W, top: -H }}>
          <defs>
            <pattern id="kit-code-dots" width={48} height={48} patternUnits="userSpaceOnUse">
              <circle cx={24} cy={24} r={2} fill={style.muted} />
            </pattern>
          </defs>
          <rect width={W * 3} height={H * 3} fill="url(#kit-code-dots)" opacity={0.16 + 0.04 * Math.sin((2 * Math.PI * t) / 8)} />
        </svg>
      </div>

      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: panelIn, transform: `translateY(${(1 - panelIn) * 50}px) scale(${0.96 + 0.04 * panelIn})`, transformOrigin: "50% 50%" }}>
          {/* Editor panel. */}
          <div
            style={{
              position: "absolute",
              left: edX,
              top: g.top,
              width: editorW,
              height: g.panelH,
              borderRadius: radius,
              background: style.surface,
              border,
              boxSizing: "border-box",
              overflow: "hidden",
              boxShadow: `0 40px 90px rgba(0,0,0,${hand ? 0.08 : 0.22}), 0 8px 24px rgba(0,0,0,0.08)`,
            }}
          >
            <div style={{ height: TAB_H, display: "flex", alignItems: "center", background: mix(style.ink, 4, style.surface), borderBottom: `1.5px solid ${mix(style.ink, hand ? 30 : 9)}`, paddingLeft: 28, gap: 12 }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 16, height: 16, borderRadius: 8, background: mix(style.ink, 16), border: hand ? `2px solid ${style.ink}` : undefined, boxSizing: "border-box" }} />
              ))}
              {props.file ? (
                <div
                  style={{
                    marginLeft: 22,
                    height: TAB_H,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 26px",
                    background: style.surface,
                    borderLeft: `1.5px solid ${mix(style.ink, 9)}`,
                    borderRight: `1.5px solid ${mix(style.ink, 9)}`,
                    fontFamily: style.mono,
                    fontSize: 30,
                    color: style.ink,
                    boxShadow: `inset 0 3px 0 ${style.accent}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {props.file}
                </div>
              ) : null}
              <div style={{ flex: 1 }} />
              <div style={{ marginRight: 24, fontFamily: style.mono, fontSize: 30, color: style.muted, border: `1.5px solid ${mix(style.ink, 14)}`, borderRadius: 12, padding: "2px 14px", whiteSpace: "nowrap" }}>{lang}</div>
            </div>
          </div>

          {/* Spotlight band and gutter bar. */}
          {dimOn > 0.001 ? (
            <>
              <div style={{ position: "absolute", left: edX + 10, width: editorW - 20, top: bandTop, height: bandBot - bandTop, borderRadius: Math.min(12, radius * 0.6), background: mix(style.accent, 11), opacity: dimOn }} />
              <div style={{ position: "absolute", left: edX + 10, width: 7, top: bandTop, height: bandBot - bandTop, borderRadius: 4, background: style.accent, opacity: dimOn }} />
            </>
          ) : null}

          {/* Code lines. */}
          {lines.map((_, i) => {
            const h = g.h[i]!;
            if (h < 0.5) return null;
            const y = g.codeTop + g.ys[i]!;
            const k = base.indexOf(i);
            const inL = props.reveal === "lines" && !added.has(i) ? pop(revealAt + k * stagger, 0.45) : 1;
            const dim = 1 - dimOn * 0.68 * (1 - clamp01(weight(i)));
            const rem = removed.has(i) ? strike : 0;
            const add = added.has(i);
            const width = lines[i]!.length * charW;
            return (
              <div key={i} style={{ position: "absolute", left: edX, top: y, width: editorW, height: h, overflow: "hidden", opacity: dim * inL * (removed.has(i) && collapse ? 1 - swapP(t) * 0.6 : 1) }}>
                {add || rem > 0 ? <div style={{ position: "absolute", left: 10, right: 10, top: 0, height: LH, background: add ? mix(style.accent, 13 * addTint) : mix(style.accent2, 12 * rem) }} /> : null}
                <div style={{ position: "absolute", left: 0, top: 0, width: gutterW - charW - 34, height: LH, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: style.mono, fontSize: numFs, color: weight(i) > 0.5 ? style.ink : style.muted, opacity: 0.85 }}>
                  {numbers[i] ? numbers[i] : ""}
                </div>
                {add || rem > 0 ? (
                  <div style={{ position: "absolute", left: gutterW - charW - 18, top: 0, width: charW, height: LH, display: "flex", alignItems: "center", fontFamily: style.mono, fontWeight: 600, fontSize: fs, color: add ? style.accent : style.accent2, opacity: add ? clamp01(swapP(t) * 2) : rem }}>
                    {add ? "+" : "−"}
                  </div>
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    left: gutterW,
                    top: 0,
                    height: LH,
                    lineHeight: `${LH}px`,
                    fontFamily: style.mono,
                    fontSize: fs,
                    whiteSpace: "pre",
                    transform: `translateX(${(1 - inL) * -28}px)`,
                    opacity: rem ? 1 - rem * 0.45 : 1,
                  }}
                >
                  {renderLine(i)}
                </div>
                {rem > 0 ? <div style={{ position: "absolute", left: gutterW + indent[i]! * charW - 6, top: LH / 2 - 2, height: 4, borderRadius: 2, width: (width - indent[i]! * charW + 12) * rem, background: style.accent2 }} /> : null}
              </div>
            );
          })}

          {caret && caretOn ? <div style={{ position: "absolute", left: caret.x + 2, top: caret.y + LH * 0.14, width: Math.max(4, fs * 0.1), height: LH * 0.72, background: style.accent, borderRadius: 2 }} /> : null}

          {/* Notes: hand-placed beside the code (inline in split), an arrow drawn to the lines, words set down one by one, then an underline. */}
          {focus.map((f, k) => {
            const rows = noteRows[k]!;
            if (!rows.length) return null;
            const at = fAt[k]!;
            const out = ease(nextAt(k) - 0.1, 0.3);
            if (t < at + 0.15 || out >= 1) return null;
            const arrow = ease(at + 0.2, 0.45);
            const head = clamp01((arrow - 0.82) / 0.18);
            const wordsAt = at + 0.5;
            let wi = 0;
            const words = rows.map((r) => r.split(" ").map((w) => ({ w, i: wi++ })));
            const lastWord = wordsAt + (wi - 1) * 0.08 + 0.35;
            const ul = ease(lastWord + 0.1, 0.45);
            const rot = (hash(k * 3.7 + 1) - 0.5) * (hand ? 4 : 2.4);
            const lastRowW = Math.min((split ? editorW : NOTE_W) - 40, rows[rows.length - 1]!.length * noteFs * NOTE_EM);
            const [a, b] = f.lines;
            const blockTop = g.codeTop + g.ys[a - 1]!;
            const blockBot = g.codeTop + g.ys[b - 1]! + g.h[b - 1]!;
            const text = (
              <div style={{ transform: `rotate(${rot}deg)`, transformOrigin: "0 50%" }}>
                {words.map((row, r) => (
                  <div key={r} style={{ height: noteLH, lineHeight: `${noteLH}px`, whiteSpace: "nowrap", fontFamily: style.display, fontWeight: noteWeight, fontSize: noteFs, color: style.ink, letterSpacing: hand ? 0 : "-0.01em" }}>
                    {row.map(({ w, i }) => {
                      const e = pop(wordsAt + i * 0.08, 0.4);
                      return (
                        <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: e, transform: `translateY(${(1 - e) * 22}px)` }}>
                          {w}
                        </span>
                      );
                    })}
                  </div>
                ))}
                <svg width={lastRowW + 20} height={22} style={{ display: "block", overflow: "visible" }}>
                  <path
                    d={`M2 ${8 + boil(k + 9) * 0.3} Q${lastRowW / 2} ${hand ? 16 + boil(k + 3) * 0.4 : 12} ${lastRowW} ${hand ? 6 : 8}`}
                    stroke={style.accent}
                    strokeWidth={hand ? 6 : 5}
                    strokeLinecap="round"
                    fill="none"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - ul}
                    opacity={ul > 0.01 ? 1 : 0}
                  />
                </svg>
              </div>
            );

            if (split) {
              const gy = blockBot;
              const gh = gapH[k]! * gapOpen(k, t);
              const sx = codeX + 34;
              const sy = gy + 14 + noteLH * 0.5;
              const ex = codeX + 6;
              const ey = gy + 4;
              return (
                <div key={k} style={{ position: "absolute", left: edX, top: gy, width: editorW, height: gh, overflow: "hidden", opacity: 1 - out }}>
                  <svg width={editorW} height={gapH[k]!} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                    <path
                      d={`M${sx - edX} ${sy - gy} Q${ex - edX + boil(k)} ${sy - gy} ${ex - edX} ${ey - gy + 10}`}
                      stroke={style.accent}
                      strokeWidth={5}
                      strokeLinecap="round"
                      fill="none"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - arrow}
                      opacity={arrow > 0.01 ? 1 : 0}
                    />
                    <path d={`M${ex - edX - 11} ${ey - gy + 18} L${ex - edX} ${ey - gy + 4} L${ex - edX + 11} ${ey - gy + 18}`} stroke={style.accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={head} />
                  </svg>
                  <div style={{ position: "absolute", left: codeX - edX + 54, top: 14 }}>{text}</div>
                </div>
              );
            }

            const mid = (blockTop + blockBot) / 2;
            const nh = noteH(k);
            const ny = Math.min(Math.max(mid - nh / 2, 60), H - 90 - nh);
            const sx = noteX - 22;
            const sy = ny + noteLH * 0.55;
            const ex = codeX + blockCols(k) * charW + 30;
            const ey = mid;
            // The arrow comes in level with the lines, so it never crosses longer code above or below them.
            const cx = ex + (sx - ex) * 0.45 + boil(k + 1);
            const cy = ey + boil(k + 2);
            const ang = Math.atan2(ey - cy, ex - cx);
            const hp = (d: number) => `${ex - 24 * Math.cos(ang + d)} ${ey - 24 * Math.sin(ang + d)}`;
            return (
              <div key={k} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - out, transform: `translateY(${-16 * out}px)` }}>
                <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                  <path d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`} stroke={style.accent} strokeWidth={hand ? 6 : 5} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrow} opacity={arrow > 0.01 ? 1 : 0} />
                  <path d={`M${hp(0.5)} L${ex} ${ey} L${hp(-0.5)}`} stroke={style.accent} strokeWidth={hand ? 6 : 5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={head} />
                </svg>
                <div style={{ position: "absolute", left: noteX, top: ny, width: NOTE_W }}>{text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outside the rig: vignette. */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.16) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "code-walk",
  title: "Code walk",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Dev explainers that show real code: up to 14 lines × 48 columns in an editor window that types in (or reveals line by line), optionally turns an old version into a new one (struck lines fold away, new lines open and type in), then spotlights line ranges on spoken words. Each spotlight dims the rest, the camera pushes to it (then glides to the next), and a short hand-written note lands beside it with an arrow (inline under the lines in split). Colouring is simple: keywords, strings, numbers, comments. No media.",
  avoid:
    "Code longer than 14 lines (show the slice that matters), typing more than ~8 lines in under 4 s (use reveal 'lines'), more than one spotlight per ~1.8 s, notes that repeat the narration word for word, and pseudo-code passed off as a real language.",
  schema,
  example: {
    language: "python",
    file: "two_sum.py",
    code: [
      "def two_sum(nums, target):",
      "    seen = {}  # value -> index",
      "    for i, n in enumerate(nums):",
      "        for j in range(i):",
      "            if nums[j] + n == target:",
      "                return [j, i]",
      "        need = target - n",
      "        if need in seen:",
      "            return [seen[need], i]",
      "        seen[n] = i",
      "    return []",
    ].join("\n"),
    reveal: "type",
    revealWord: "slow",
    diff: { added: [2, 7, 8, 9, 10], removed: [4, 5, 6], collapse: true, word: "instead" },
    focus: [
      { lines: [2, 2], note: "Remember what you've seen", word: "remember" },
      { lines: [7, 9], note: "One lookup, not a loop", word: "partner" },
      { lines: [10, 10], note: "Store it after checking", word: "store" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.5, end: 0.8, word: "slow" },
    { at: 3.9, end: 4.3, word: "instead" },
    { at: 5.7, end: 6.1, word: "remember" },
    { at: 7.7, end: 8.1, word: "partner" },
    { at: 9.6, end: 9.9, word: "store" },
  ],
  seconds: { min: 4, max: 14, demo: 13 },
  mediaSlots: 0,
  credit: {
    name: "'What is Git explainer' by @Yunn260414 and 'Recursion explained in genres' by @emollick (prompt-motion.com)",
    url: "https://prompt-motion.com/yunn260414-60d996",
  },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Walk props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
