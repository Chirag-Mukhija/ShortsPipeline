// Terminal pieces: a TerminalSession that types commands and prints their output line by line, and InstallSteps, a CLI-style checklist with spinners and a block progress bar.
import type { FC } from "react";
import { POP, clamp01, ramp, useTime } from "../../core/time";
import { BLUE, BORDER, GREEN, MONO, MUTED, ORANGE, PURPLE, RED, TEXT, YELLOW, fr } from "./theme";
import { tokenize } from "./syntax";
import { Caret, Glyph, Toks, Win, typed } from "./chrome";

export type OutLine = string | { s: string; c: string };
export type Cmd = { cmd: string; at: number; out?: OutLine[] };

const PAD = 26;

// Output colouring by prefix, so scripts stay plain strings: "ok"/"+" green, "error"/"x" red, "warn" yellow, "->" blue.
const outColor = (s: string) =>
  /^(ok|\+|added|done|ready)/i.test(s) ? GREEN : /^(error|x |fail|-)/i.test(s) ? RED : /^warn/i.test(s) ? YELLOW : /^(->|http|info)/i.test(s) ? BLUE : "#C9D1D9";

type Row = { kind: "prompt"; i: number; show: number } | { kind: "out"; line: OutLine; show: number };

// Commands type at `cps` (default 2 chars a frame) from their `at`; Enter lands 0.2 s after, then output prints a line every 3 frames and the view jumps up like a real terminal once it fills.
export const TerminalSession: FC<{ x: number; y: number; w: number; h: number; script: Cmd[]; cps?: number; size?: number; title?: string; cwd?: string; enter?: number; exit?: number }> = ({
  x,
  y,
  w,
  h,
  script,
  cps = 60,
  size = 36,
  title = "zsh",
  cwd = "~/app",
  enter,
  exit,
}) => {
  const { t } = useTime();
  const lh = Math.round(size * 1.6);
  const rowsFit = Math.floor((h - 58 - PAD * 2) / lh);
  const rows: Row[] = [];
  let prevEnd = (script[0]?.at ?? 0) - 0.25;
  script.forEach((c, i) => {
    rows.push({ kind: "prompt", i, show: Math.min(c.at, prevEnd + 0.15) });
    const end = c.at + c.cmd.length / cps + 0.2;
    (c.out ?? []).forEach((line, j) => rows.push({ kind: "out", line, show: end + j * fr(3) }));
    prevEnd = end + Math.max(0, (c.out?.length ?? 0) - 1) * fr(3);
  });
  rows.push({ kind: "prompt", i: -1, show: prevEnd + 0.15 });
  const visible = rows.filter((r) => t >= r.show);
  const scroll = Math.max(0, visible.length - rowsFit);
  const lastPrompt = [...visible].reverse().find((r) => r.kind === "prompt");
  return (
    <Win x={x} y={y} w={w} h={h} title={title} enter={enter ?? (script[0]?.at ?? 0) - 0.4} exit={exit} bodyStyle={{ backgroundColor: "#0B0E14" }}>
      {visible.slice(scroll).map((r, k) => {
        const top = PAD + k * lh;
        const base = { position: "absolute" as const, left: 30, right: 30, top, height: lh, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontWeight: 500, fontSize: size, whiteSpace: "pre" as const };
        if (r.kind === "out") {
          const s = typeof r.line === "string" ? r.line : r.line.s;
          const c = typeof r.line === "string" ? outColor(s) : r.line.c;
          return (
            <div key={k} style={{ ...base, color: c, paddingLeft: 4 }}>
              {s}
            </div>
          );
        }
        const c = r.i >= 0 ? script[r.i]! : undefined;
        const n = c ? Math.min(c.cmd.length, typed(t, c.at, cps)) : 0;
        const typing = !!c && n < c.cmd.length;
        const isLast = r === lastPrompt;
        return (
          <div key={k} style={base}>
            <span style={{ color: BLUE, fontWeight: 700 }}>{cwd}</span>
            <Glyph kind="chevron" size={size} color={c && n >= c.cmd.length && t > c.at + c.cmd.length / cps + 0.2 ? GREEN : PURPLE} />
            <span>
              {c && <Toks toks={tokenize(c.cmd.slice(0, n), "sh")} />}
              {isLast && <Caret size={size} typing={typing} color={TEXT} block />}
            </span>
          </div>
        );
      })}
    </Win>
  );
};

export type Step = { text: string; at: number; done?: number; note?: string };

// A CLI checklist: each step types in at `at` with a spinner, flips to a drawn green check at `done`, and a block progress bar fills underneath.
export const InstallSteps: FC<{ x: number; y: number; w: number; steps: Step[]; title?: string; size?: number; enter?: number }> = ({ x, y, w, steps, title = "steps.sh", size = 42, enter }) => {
  const { t } = useTime();
  const lh = Math.round(size * 1.75);
  const h = 58 + PAD * 2 + steps.length * lh + 110;
  const doneCount = steps.reduce((a, s) => a + (s.done !== undefined ? ramp(t, s.done, fr(8)) : 0), 0);
  const cells = 24;
  const filled = (doneCount / steps.length) * cells;
  return (
    <Win x={x} y={y} w={w} h={h} title={title} enter={enter ?? (steps[0]?.at ?? 0) - 0.4}>
      {steps.map((s, i) => {
        if (t < s.at) return null;
        const n = typed(t, s.at, 60);
        const done = s.done !== undefined && t >= s.done;
        const pop = s.done !== undefined ? ramp(t, s.done, fr(8), POP) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 34, right: 34, top: PAD + i * lh, height: lh, display: "flex", alignItems: "center", gap: 22, fontFamily: MONO, fontWeight: 500, fontSize: size, whiteSpace: "pre" }}>
            <span style={{ color: MUTED, fontSize: size * 0.8 }}>{`[${i + 1}/${steps.length}]`}</span>
            <span style={{ width: size * 0.9, display: "flex", justifyContent: "center", transform: done ? `scale(${0.6 + 0.4 * pop})` : undefined }}>
              {done ? <Glyph kind="check" size={size * 1.1} color={GREEN} p={clamp01(pop * 1.4)} /> : <Glyph kind="spin" size={size} color={ORANGE} />}
            </span>
            <span style={{ color: done ? TEXT : "#C9D1D9", fontWeight: done ? 700 : 500 }}>{s.text.slice(0, n)}</span>
            {s.note && done && <span style={{ marginLeft: "auto", color: MUTED, fontSize: size * 0.75, opacity: clamp01(pop) }}>{s.note}</span>}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 34, right: 34, bottom: 40, display: "flex", alignItems: "center", gap: 20, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: MUTED }}>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {Array.from({ length: cells }, (_, c) => (
            <div key={c} style={{ flex: 1, height: 30, borderRadius: 3, backgroundColor: c < Math.floor(filled + 0.001) ? ORANGE : BORDER, boxShadow: c < filled ? `0 0 10px ${ORANGE}88` : undefined }} />
          ))}
        </div>
        <span style={{ width: 110, textAlign: "right", color: doneCount >= steps.length - 0.01 ? GREEN : TEXT }}>{Math.round((doneCount / steps.length) * 100)}%</span>
      </div>
    </Win>
  );
};
