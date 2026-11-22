// Equations on the board: Write (outline then fill, glyph by glyph), term marks (Indicate, box, colour, dim, underline) and the matching-term transform between lines.
import type { FC } from "react";
import { interpolateColors } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { fontCss, useFontsReady } from "./metrics";
import { cmdsToD, termBox, typeset, type Cmd, type Item, type Layout } from "./tex";
import { Create, Surround } from "./draw";
import { INK, LIN, SINE, SMOOTH, YELLOW, thereBack } from "./theme";

export type Anchor = "start" | "middle" | "end";
export type Mark = { term: string; at: number; kind?: "indicate" | "box" | "color" | "dim" | "underline"; color?: string; until?: number };
type St = { draw: number; fill: number; op: number; color: string; k?: number; cx?: number; cy?: number };

// Write's stagger: each glyph gets a window of the run; outline first, fill catching up.
export const writeState = (i: number, n: number, p: number) => {
  const win = Math.max(0.3, Math.min(0.7, 4 / Math.max(1, n)));
  const start = n <= 1 ? 0 : (i / (n - 1)) * (1 - win);
  const u = clamp01((p - start) / win);
  return { draw: clamp01(u / 0.65), fill: clamp01((u - 0.4) / 0.6) };
};
// 36–60 frames depending on length, as the board asks.
export const writeDur = (n: number) => Math.min(2, Math.max(1.2, 0.9 + n * 0.05));

const ItemView: FC<{ it: Item; px: number; py: number; fs: number; st: St; cmds?: Cmd[] }> = ({ it, px, py, fs, st, cmds }) => {
  if (st.op <= 0.002 || st.draw <= 0) return null;
  const tr = st.k && st.k !== 1 ? `translate(${st.cx} ${st.cy}) scale(${st.k}) translate(${-st.cx!} ${-st.cy!})` : undefined;
  if (it.kind === "glyph") {
    const f = fontCss(it.font);
    const L = fs * 10;
    const writing = st.draw < 1 || st.fill < 1;
    return (
      <text x={px} y={py} fontSize={fs} fontFamily={f.fontFamily} fontStyle={f.fontStyle} fontWeight={f.fontWeight} fill={st.color} fillOpacity={st.fill * st.op} transform={tr} style={{ fontVariantNumeric: "lining-nums" }}
        {...(writing ? { stroke: st.color, strokeOpacity: st.op * (1 - st.fill), strokeWidth: Math.max(1.2, fs * 0.022), strokeDasharray: `${L} ${L}`, strokeDashoffset: L * (1 - st.draw) } : {})}>
        {it.text}
      </text>
    );
  }
  return (
    <path d={cmdsToD(cmds ?? it.cmds, px, py, fs)} fill="none" stroke={st.color} strokeOpacity={st.op} strokeWidth={it.sw * fs} strokeLinecap="round" strokeLinejoin="round" transform={tr}
      {...(st.draw < 1 ? { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - st.draw } : {})} />
  );
};

export const colorOf = (it: Item, color: string, colors?: Record<string, string>) =>
  it.color ?? (it.term ? colors?.[it.term] : undefined) ?? (it.kind === "glyph" ? colors?.[it.text] : undefined) ?? color;

const marked = (m: Mark, it: Item) => m.term === "*" || m.term === it.term;

// Applies every active mark to one glyph's state.
const markState = (it: Item, st: St, t: number, marks: Mark[], L: Layout, X: number, Y: number, size: number): St => {
  let s = st;
  for (const m of marks) {
    if (!marked(m, it) || t < m.at) continue;
    const off = m.until !== undefined ? ramp(t, m.until, 0.3, SMOOTH) : 0;
    if (m.kind === "color") s = { ...s, color: interpolateColors(ramp(t, m.at, 0.27, SMOOTH) * (1 - off), [0, 1], [s.color, m.color ?? YELLOW]) };
    else if (m.kind === "dim") s = { ...s, op: s.op * (1 - 0.68 * ramp(t, m.at, 0.3, SMOOTH) * (1 - off)) };
    else if (!m.kind || m.kind === "indicate") {
      const k = thereBack(SMOOTH(ramp(t, m.at, 0.6, LIN)));
      const b = termBox(L, m.term === "*" ? undefined : m.term)!;
      s = { ...s, k: 1 + 0.2 * k, cx: X + ((b.x0 + b.x1) / 2) * size, cy: Y + ((b.y0 + b.y1) / 2) * size, color: interpolateColors(k, [0, 1], [s.color, m.color ?? YELLOW]) };
    }
  }
  return s;
};

const MarkBoxes: FC<{ L: Layout; X: number; Y: number; size: number; marks: Mark[]; out?: number }> = ({ L, X, Y, size, marks, out }) => (
  <>
    {marks.map((m, i) => {
      if (m.kind !== "box" && m.kind !== "underline") return null;
      const b = termBox(L, m.term === "*" ? undefined : m.term);
      if (!b) return null;
      const x0 = X + b.x0 * size, x1 = X + b.x1 * size, y0 = Y + b.y0 * size, y1 = Y + b.y1 * size;
      const end = m.until ?? out;
      if (m.kind === "underline") return <Create key={i} d={`M${x0} ${y1 + size * 0.16} L${x1} ${y1 + size * 0.16}`} at={m.at} dur={0.4} color={m.color ?? YELLOW} w={4} out={end} />;
      return <Surround key={i} x0={x0} y0={y0} x1={x1} y1={y1} pad={size * 0.16} at={m.at} color={m.color ?? YELLOW} out={end} />;
    })}
  </>
);

export const anchorX = (L: Layout, x: number, size: number, anchor: Anchor) => x - L.w * size * (anchor === "start" ? 0 : anchor === "middle" ? 0.5 : 1);

export type EqProps = { tex: string; x: number; y: number; size?: number; anchor?: Anchor; at?: number; dur?: number; color?: string; colors?: Record<string, string>; marks?: Mark[]; out?: number; fadeIn?: boolean; opacity?: number };

// Write an equation (TeX-like string, see tex.ts) at a baseline; `colors` maps term ids or glyphs to colours, like Manim's tex_to_color_map.
export const Eq: FC<EqProps> = ({ tex, x, y, size = 72, anchor = "middle", at = 0, dur, color = INK, colors, marks = [], out, fadeIn, opacity = 1 }) => {
  const ready = useFontsReady();
  const { t } = useTime();
  if (!ready || t < at) return null;
  const L = typeset(tex);
  const X = anchorX(L, x, size, anchor);
  const n = L.items.length;
  const p = ramp(t, at, dur ?? writeDur(n), LIN);
  const fi = fadeIn ? ramp(t, at, 0.4, SMOOTH) : 1;
  const op = opacity * fi * (out !== undefined ? 1 - ramp(t, out, 0.4, SMOOTH) : 1);
  if (op <= 0) return null;
  return (
    <g>
      {L.items.map((it, i) => {
        const w = fadeIn ? { draw: 1, fill: 1 } : writeState(i, n, p);
        const st = markState(it, { ...w, op, color: colorOf(it, color, colors) }, t, marks, L, X, y, size);
        return <ItemView key={i} it={it} px={X + it.x * size} py={y + it.y * size + (1 - fi) * 12} fs={size * it.s} st={st} />;
      })}
      <MarkBoxes L={L} X={X} Y={y} size={size} marks={marks} out={out} />
    </g>
  );
};

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const sameShape = (a: Cmd[], b: Cmd[]) => a.length === b.length && a.every((c, i) => c[0] === b[i]![0]);
const lerpCmds = (a: Cmd[], b: Cmd[], p: number): Cmd[] => a.map((c, i) => [c[0], ...c.slice(1).map((v, j) => lerp(v as number, b[i]![j + 1] as number, p))] as Cmd);

export type EqStepsProps = { lines: string[]; at: number[]; x: number; y: number; size?: number; anchor?: Anchor; color?: string; colors?: Record<string, string>; marks?: Mark[]; dur?: number; out?: number };

// TermTransform (Manim's TransformMatchingTex): each line becomes the next; glyphs that persist slide to their new place, the rest fade out or in.
export const EqSteps: FC<EqStepsProps> = ({ lines, at, x, y, size = 72, anchor = "middle", color = INK, colors, marks = [], dur = 1.1, out }) => {
  const ready = useFontsReady();
  const { t } = useTime();
  if (!ready || t < at[0]!) return null;
  let k = 0;
  at.forEach((a, i) => {
    if (t >= a && i < lines.length) k = i;
  });
  const p = k === 0 ? 1 : ramp(t, at[k]!, dur, SINE);
  if (k === 0 || p >= 1) return <Eq tex={lines[k]!} x={x} y={y} size={size} anchor={anchor} at={k === 0 ? at[0] : -10} dur={k === 0 ? undefined : 0.01} color={color} colors={colors} marks={marks} out={out} />;
  const A = typeset(lines[k - 1]!), B = typeset(lines[k]!);
  const XA = anchorX(A, x, size, anchor), XB = anchorX(B, x, size, anchor);
  const bByKey = new Map(B.items.map((b) => [b.key, b]));
  const aKeys = new Set(A.items.map((a) => a.key));
  const pairs = A.items.filter((a) => bByKey.has(a.key)).map((a) => [a, bByKey.get(a.key)!] as const);
  const dx = pairs.length ? pairs.reduce((s, [a, b]) => s + (XB + b.x * size - (XA + a.x * size)), 0) / pairs.length : 0;
  const full = { draw: 1, fill: 1, op: 1 };
  const out1 = 1 - clamp01(p / 0.5), in1 = clamp01((p - 0.5) / 0.5);
  return (
    <g>
      {A.items.map((a, i) => {
        const ca = markState(a, { ...full, color: colorOf(a, color, colors) }, t, marks, A, XA, y, size);
        const b = bByKey.get(a.key);
        if (!b) return <ItemView key={`a${i}`} it={a} px={XA + a.x * size + dx * p} py={y + a.y * size} fs={size * a.s} st={{ ...ca, op: out1 }} />;
        const cb = colorOf(b, color, colors);
        const px = lerp(XA + a.x * size, XB + b.x * size, p), py = lerp(y + a.y * size, y + b.y * size, p), fs = lerp(a.s, b.s, p) * size;
        const col = interpolateColors(p, [0, 1], [ca.color, cb]);
        if (a.kind === "path" && b.kind === "path" && sameShape(a.cmds, b.cmds)) {
          const cmds = lerpCmds(a.cmds.map((c) => [c[0], ...c.slice(1).map((v) => ((v as number) * a.s * size) / fs)] as Cmd), b.cmds.map((c) => [c[0], ...c.slice(1).map((v) => ((v as number) * b.s * size) / fs)] as Cmd), p);
          return <ItemView key={`a${i}`} it={a} px={px} py={py} fs={fs} st={{ ...full, color: col }} cmds={cmds} />;
        }
        if (a.kind === "glyph" && b.kind === "glyph" && a.text === b.text) return <ItemView key={`a${i}`} it={b} px={px} py={py} fs={fs} st={{ ...full, color: col }} />;
        return (
          <g key={`a${i}`}>
            <ItemView it={a} px={px} py={py} fs={fs} st={{ ...full, op: 1 - p, color: col }} />
            <ItemView it={b} px={px} py={py} fs={fs} st={{ ...full, op: p, color: col }} />
          </g>
        );
      })}
      {B.items.filter((b) => !aKeys.has(b.key)).map((b, i) => (
        <ItemView key={`b${i}`} it={b} px={XB + b.x * size - dx * (1 - p)} py={y + b.y * size} fs={size * b.s} st={{ ...full, op: in1, color: colorOf(b, color, colors) }} />
      ))}
    </g>
  );
};

// Layout plus anchored origin, for pieces that place braces or labels against an equation's terms.
export const useEqBox = (tex: string, x: number, size: number, anchor: Anchor = "middle", term?: string) => {
  const ready = useFontsReady();
  if (!ready) return null;
  const L = typeset(tex);
  const X = anchorX(L, x, size, anchor);
  const b = termBox(L, term);
  return b ? { x0: X + b.x0 * size, x1: X + b.x1 * size, y0: b.y0 * size, y1: b.y1 * size, w: L.w * size } : null;
};

