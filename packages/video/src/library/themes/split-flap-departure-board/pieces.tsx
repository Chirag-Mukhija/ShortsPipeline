// Board pieces for a narrated explainer: the chapter title board, stat board, A-vs-B gates, passenger notice, source row, leaderboard, flap bar chart, calling-at route and countdown.
import type { FC } from "react";
import { useCurrentFrame } from "remotion";
import { H, W } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { BoardFrame, DepartureBoard, Lamp, blink, type Column } from "./board";
import { NUM, wrap } from "./flap";
import { FlapCountdown, FlapNumber, FlapRow, FlapText, rowSpecs, statusSpecs, Nudge, type StatusStep } from "./rows";
import { AMBER, DIM, FPS, M, PAINT, TONE, rowWidth, type Tone } from "./theme";

// Largest cell height whose row of `cols` fits `width`, capped.
export const fitH = (cols: number, width: number, cap: number) => Math.min(cap, Math.floor(width / (cols * 0.62 + (cols - 1) * 0.07)));

const Paint: FC<{ x: number; y: number; text: string; size?: number; color?: string; align?: "left" | "right" | "center"; w?: number; opacity?: number }> = ({ x, y, text, size = 30, color = AMBER, align = "left", w = 600, opacity = 1 }) => (
  <div style={{ position: "absolute", left: align === "left" ? x : align === "right" ? x - w : x - w / 2, top: y, width: w, textAlign: align, fontFamily: PAINT, fontWeight: 600, fontSize: size, letterSpacing: "0.16em", color, opacity, whiteSpace: "nowrap" }}>{text}</div>
);

// ---- Title board: the kicker flips, the big row shows CHAPTER NN, then re-flips to the title ----
export const FlapTitle: FC<{ kicker: string; title: string; chapter?: string; at: number; swapAt?: number; label?: string; sub?: string; status?: StatusStep[]; out?: number }> = ({ kicker, title, chapter, at, swapAt, label = "DEPARTURES", sub, status, out }) => {
  const lines = wrap(title, 13).slice(0, 2);
  const cols = Math.max(...lines.map((l) => l.length), chapter ? chapter.length : 0, 8);
  const innerW = W - 2 * M - 28 - 120;
  const h = fitH(cols, innerW, 210);
  const swap = swapAt ?? at + 1.7;
  const rowsH = lines.length * h + (lines.length - 1) * 22;
  const fw = rowWidth(h, cols) + 120 + 28;
  const fh = 70 + 28 + 40 + 72 + 44 + rowsH + 56;
  const x0 = 60;
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.2} label={label} sub={sub}>
      <FlapText text={kicker} at={at} x={x0} y={40} h={72} tone="amber" out={out} seed={11} />
      {status && <FlapRow specs={statusSpecs(status, 9, 12)} x={fw - 28 - x0} y={40} h={72} anchor="right" />}
      {lines.map((l, i) => (
        <FlapText key={i} x={x0} y={40 + 72 + 44 + i * (h + 22)} h={h} cols={cols} weight={600} seed={20 + i} out={out}
          text={i === 0 && chapter ? chapter : i === 0 ? l : ""} at={at + 0.35}
          then={i === 0 && chapter ? [{ at: swap, text: l, scramble: 4 }] : i > 0 ? [{ at: chapter ? swap + 0.1 : at + 0.5, text: l }] : undefined} />
      ))}
    </BoardFrame>
  );
};

// ---- Stat board: amber label, a big number on digit modules, a unit and a caption ----
export const StatBoard: FC<{ label: string; value: number; from?: number; unit?: string; caption?: string; at: number; tone?: Tone }> = ({ label, value, from, unit, caption, at, tone = "ink" }) => {
  const digits = Math.max(value.toLocaleString("en-US").length, from !== undefined ? from.toLocaleString("en-US").length : 0);
  const unitCols = unit ? [...unit].length : 0;
  const hu = 120;
  const hn = Math.min(250, fitH(digits, W - 2 * M - 180 - (unitCols ? rowWidth(hu, unitCols) + 40 : 0), 250));
  const numW = rowWidth(hn, digits) + (unitCols ? 40 + rowWidth(hu, unitCols) : 0);
  const capCols = caption ? caption.length : 0;
  const fw = Math.max(numW, rowWidth(72, label.length), rowWidth(60, capCols)) + 140 + 28;
  const fh = 28 + 40 + 72 + 40 + hn + (caption ? 40 + 60 : 0) + 56;
  const x0 = 70;
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.25}>
      <FlapText text={label} at={at} x={x0} y={40} h={72} tone="amber" seed={31} />
      <FlapNumber value={value} from={from} cols={digits} at={at + 0.3} x={x0} y={40 + 72 + 40} h={hn} tone={tone} seed={32} />
      {unit && <FlapText text={unit} at={at + 0.9} x={x0 + rowWidth(hn, digits) + 40} y={40 + 72 + 40 + hn - hu} h={hu} tone="amber" seed={33} />}
      {caption && <FlapText text={caption} at={at + 0.9} stagger={1} x={x0} y={40 + 72 + 40 + hn + 40} h={60} tone="dim" seed={34} />}
    </BoardFrame>
  );
};

// ---- A vs B: two gates side by side; the verdict row flips each to its own status ----
export type Gate = { gate: string; word: string; rows: [string, string][]; verdict: StatusStep[] };
export const VersusBoard: FC<{ a: Gate; b: Gate; at: number }> = ({ a, b, at }) => {
  const f = useCurrentFrame();
  const fw = (W - 2 * M - 60) / 2;
  const innerW = fw - 28 - 80;
  const wordCols = Math.max(a.word.length, b.word.length, 5);
  const hw = fitH(wordCols, innerW, 150);
  const valCols = Math.max(...[...a.rows, ...b.rows].map((r) => r[1].length), 6);
  const hv = 62;
  const fh = 70 + 28 + 36 + hw + 36 + a.rows.length * (hv + 22) + 20 + 72 + 50;
  const y0 = (H - fh) / 2;
  const side = (g: Gate, i: number) => {
    const t0 = at + i * 0.35;
    const vy = 36 + hw + 36;
    const last = g.verdict[g.verdict.length - 1]!;
    return (
      <BoardFrame key={i} x={M + i * (fw + 60)} y={y0} w={fw} h={fh} at={t0 - 0.2} label={g.gate} sub={i === 0 ? "A" : "B"} seed={40 + i}>
        <FlapText text={g.word} cols={wordCols} at={t0 + 0.2} x={40} y={36} h={hw} weight={600} seed={41 + i * 10} />
        {g.rows.map(([k, v], ri) => (
          <div key={ri}>
            <Paint x={40} y={vy + ri * (hv + 22) + 12} text={k} color={DIM} size={32} w={innerW - rowWidth(hv, valCols) - 20} opacity={ramp(f / FPS, t0 + 0.6 + ri * 0.2, 0.3)} />
            <FlapText text={v} cols={valCols} align="right" at={t0 + 0.6 + ri * 0.2} x={40 + innerW} y={vy + ri * (hv + 22)} h={hv} anchor="right" seed={43 + i * 10 + ri} />
          </div>
        ))}
        <Nudge at={g.verdict.slice(1).map((s) => s.at)}>
          <Lamp x={52} y={vy + g.rows.length * (hv + 22) + 20 + 36} on={f >= last.at * FPS ? 1 : 0} tone={last.tone} r={11} />
          <FlapRow specs={statusSpecs(g.verdict, 10, 48 + i)} x={40 + innerW} y={vy + g.rows.length * (hv + 22) + 20} h={72} anchor="right" />
        </Nudge>
      </BoardFrame>
    );
  };
  return (
    <>
      {side(a, 0)}
      {side(b, 1)}
      <div style={{ position: "absolute", left: W / 2 - 40, top: H / 2 - 40, width: 80, height: 80, borderRadius: 40, background: "#0E0F11", border: `3px solid ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PAINT, fontWeight: 700, fontSize: 34, color: AMBER, opacity: ramp(f / FPS, at + 0.5, 0.3), boxShadow: "0 8px 24px rgba(0,0,0,0.8)" }}>VS</div>
    </>
  );
};

// ---- Passenger notice: a quote or callout wrapped onto the board row by row, with a painted attribution ----
export const NoticeBoard: FC<{ text: string; by?: string; at: number; label?: string; cols?: number; tone?: Tone }> = ({ text, by, at, label = "PASSENGER NOTICE", cols = 16, tone = "ink" }) => {
  const f = useCurrentFrame();
  const lines = wrap(text, cols).slice(0, 4);
  const h = fitH(cols, W - 2 * M - 28 - 140, 104);
  const gap = Math.round(h * 0.28);
  const fw = rowWidth(h, cols) + 140 + 28;
  const fh = 70 + 28 + 44 + lines.length * h + (lines.length - 1) * gap + (by ? 40 + 56 : 0) + 56;
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.25} label={label} sub="" seed={50}>
      <div style={{ position: "absolute", right: 46, top: -50 }}><Lamp x={0} y={0} on={blink(f, at * FPS)} r={10} /></div>
      {lines.map((l, i) => (
        <FlapText key={i} text={l} cols={cols} at={at + i * 0.3} x={70} y={44 + i * (h + gap)} h={h} tone={tone} seed={51 + i} />
      ))}
      {by && <FlapText text={by} at={at + lines.length * 0.3 + 0.3} x={fw - 28 - 70} y={44 + lines.length * (h + gap) - gap + 40} h={56} anchor="right" tone="amber" seed={58} />}
    </BoardFrame>
  );
};

// ---- Source row: a slim lower-third module with a painted SOURCE plate ----
export const SourceRow: FC<{ text: string; at: number; out?: number; tag?: string }> = ({ text, at, out, tag = "SOURCE" }) => {
  const f = useCurrentFrame();
  const h = 56;
  const cols = Math.min(30, text.length);
  const plate = 170;
  const fw = plate + rowWidth(h, cols) + 50 + 28;
  const fh = h + 40 + 28;
  const gone = out !== undefined ? ramp(f / FPS, out + 0.9, 0.25) : 0;
  return (
    <div style={{ opacity: 1 - gone }}>
      <BoardFrame x={M} y={H - M - fh} w={fw} h={fh} at={at - 0.15} glare={false} seed={60}>
        <div style={{ position: "absolute", left: 20, top: 20, width: plate - 30, height: h, background: AMBER, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PAINT, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: "#141414" }}>{tag}</div>
        <FlapText text={text} cols={cols} at={at + 0.1} x={plate} y={20} h={h} out={out} seed={61} />
      </BoardFrame>
    </div>
  );
};

// ---- Leaderboard: ranks re-sort by flipping names and scores in place, never by moving rows ----
export type Entry = { name: string; score: number };
export const Leaderboard: FC<{ title: string; before: Entry[]; after: Entry[]; at: number; resortAt: number; unit?: string }> = ({ title, before, after, at, resortAt, unit = "SCORE" }) => {
  const nameCols = Math.max(...[...before, ...after].map((e) => e.name.length), 8);
  const columns: Column[] = [
    { label: "POS", cols: 2, align: "right", tone: "amber", drum: NUM },
    { label: "NAME", cols: nameCols },
    { label: unit, cols: 5, align: "right" },
    { label: "", cols: 1 },
  ];
  const rankOf = (n: string) => before.findIndex((e) => e.name === n);
  const rows = before.map((e, i) => {
    const nx = after[i]!;
    const was = rankOf(nx.name);
    const trend = was < 0 || was === i ? "-" : was > i ? "▲" : "▼";
    const tt: Tone = trend === "▲" ? "green" : trend === "▼" ? "red" : "dim";
    return {
      cells: [String(i + 1), e.name, e.score.toLocaleString("en-US"), ""],
      then: [{ at: resortAt, cells: [String(i + 1), nx.name, nx.score.toLocaleString("en-US"), trend], tones: [undefined, i === 0 ? "amber" : undefined, undefined, tt] as (Tone | undefined)[] }],
      nudge: was !== i ? [resortAt + 0.9] : [],
    };
  });
  return <DepartureBoard columns={columns} rows={rows} h={78} at={at} title={title} sub="LIVE" scramble={3} focus={[{ row: 0, at: resortAt + 1 }]} />;
};

// ---- Flap bar chart: each bar is a row of cells flipping to solid blocks, left to right ----
export type Bar = { label: string; value: number; tone?: Tone };
export const FlapBars: FC<{ title: string; bars: Bar[]; at: number; max?: number; cells?: number; suffix?: string }> = ({ title, bars, at, max, cells = 14, suffix = "" }) => {
  const h = 64;
  const labelCols = Math.max(...bars.map((b) => b.label.length), 6);
  const valCols = Math.max(...bars.map((b) => (b.value + suffix).length), 3);
  const top = max ?? Math.max(...bars.map((b) => b.value));
  const gap = 26;
  const fw = rowWidth(h, labelCols) + 40 + rowWidth(h, cells) + 40 + rowWidth(h, valCols) + 140 + 28;
  const fh = 70 + 28 + 40 + bars.length * h + (bars.length - 1) * gap + 50;
  const xb = 70 + rowWidth(h, labelCols) + 40;
  const xv = xb + rowWidth(h, cells) + 40;
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.25} label={title} sub="" seed={70}>
      {bars.map((b, i) => {
        const t = at + 0.3 + i * 0.2;
        const n = Math.max(1, Math.round((b.value / top) * cells));
        return (
          <div key={i}>
            <FlapText text={b.label} cols={labelCols} at={t} x={70} y={40 + i * (h + gap)} h={h} tone="dim" seed={71 + i} />
            {/* Blocks grow left to right: 3 f per cell, short drums so each lands in a couple of flaps. */}
            <FlapRow specs={rowSpecs({ text: "■".repeat(n), cols: cells, at: t + 0.2, stagger: 3, tone: b.tone ?? "ink", seed: 80 + i, drum: " -■", laps: 1 })} x={xb} y={40 + i * (h + gap)} h={h} />
            <FlapText text={`${b.value}${suffix}`} cols={valCols} align="right" at={t + 0.4} x={xv} y={40 + i * (h + gap)} h={h} tone={b.tone ?? "ink"} seed={90 + i} />
          </div>
        );
      })}
    </BoardFrame>
  );
};

// ---- Calling at: a route line with stops; the train lamp travels and each reached stop re-flips amber ----
export const CallingAt: FC<{ stops: string[]; at: number; reach: number[]; title?: string; sub?: string }> = ({ stops, at, reach, title = "CALLING AT", sub = "" }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const fw = W - 2 * M;
  const innerW = fw - 28;
  const cols = Math.max(...stops.map((s) => s.length), 4);
  // Each stop owns an equal slot, so the longest label always fits between its neighbours.
  const slot = (innerW - 80) / stops.length;
  const h = fitH(cols, slot - 34, 66);
  const xs = stops.map((_, i) => 40 + slot * (i + 0.5));
  const lineY = 70;
  // The train glides between stops in 0.8 s, in-out, arriving on each stop's cue.
  let tx = xs[0]!;
  reach.forEach((r, i) => {
    if (i === 0) return;
    tx += (xs[i]! - xs[i - 1]!) * ramp(t, r - 0.8, 0.8, INOUT);
  });
  const drawn = ramp(t, at, 0.9, INOUT);
  const fh = 70 + 28 + lineY + 50 + h + 70;
  return (
    <BoardFrame x={M} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.25} label={title} sub={sub} seed={100}>
      <div style={{ position: "absolute", left: xs[0], top: lineY - 3, width: (xs[xs.length - 1]! - xs[0]!) * drawn, height: 6, background: "#3A3C41", borderRadius: 3 }} />
      <div style={{ position: "absolute", left: xs[0], top: lineY - 3, width: Math.max(0, tx - xs[0]!), height: 6, background: AMBER, borderRadius: 3 }} />
      {xs.map((x, i) => {
        const on = t >= (reach[i] ?? Infinity);
        const show = ramp(t, at + 0.2 + i * 0.15, 0.2);
        return <div key={i} style={{ position: "absolute", left: x - 14, top: lineY - 14, width: 28, height: 28, borderRadius: 14, background: on ? AMBER : "#16171A", border: `4px solid ${on ? AMBER : "#5B5E64"}`, boxSizing: "border-box", transform: `scale(${show})` }} />;
      })}
      <Lamp x={tx} y={lineY} on={t >= (reach[0] ?? Infinity) ? 1 : 0} r={16} />
      {stops.map((s, i) => (
        <FlapText key={i} text={s} align="center" at={at + 0.3 + i * 0.15} x={xs[i]!} y={lineY + 50} h={h} anchor="center" tone="ink" seed={110 + i}
          then={reach[i] !== undefined ? [{ at: reach[i]!, text: s, tone: "amber", scramble: 2, align: "center" }, ...(reach[i + 1] !== undefined ? [{ at: reach[i + 1]!, text: s, tone: "dim" as Tone, scramble: 1, align: "center" as const }] : [])] : undefined} />
      ))}
    </BoardFrame>
  );
};

// ---- Countdown board: DEPARTS IN mm:ss with a boarding lamp ----
export const CountdownBoard: FC<{ from: number; at: number; label?: string; sub?: string; status?: string; note?: string }> = ({ from, at, label = "DEPARTS IN", sub = "", status = "BOARDING", note }) => {
  const f = useCurrentFrame();
  const h = 240;
  const fw = rowWidth(h, 5) + 160 + 28;
  const fh = 70 + 28 + 40 + h + 40 + 70 + 50;
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} at={at - 0.25} label={label} sub={sub} seed={120}>
      <FlapCountdown from={from} at={at} x={80} y={40} h={h} />
      <Lamp x={96} y={40 + h + 40 + 35} on={blink(f, at * FPS + 20)} r={12} />
      <FlapText text={status} at={at + 0.5} x={130} y={40 + h + 40} h={70} tone="amber" seed={121} />
      {note && <Paint x={fw - 28 - 80} y={40 + h + 56} text={note} color={TONE.dim} size={32} align="right" w={360} />}
    </BoardFrame>
  );
};
