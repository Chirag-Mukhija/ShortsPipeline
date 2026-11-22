// Narrated-explainer pieces on the board: title card, key-word claim, algorithm steps, DecimalNumber stat, A-vs-B comparison, definition callout, source label, camera-pan transition, complexity curves and the matrix transform.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolateColors } from "remotion";
import { W } from "../../core/video";
import { ramp, useTime } from "../../core/time";
import { textWidth, useFontsReady } from "./metrics";
import { Create, Decimal, Dot, Flash, Grid, Stage, Surround, Txt, rectD } from "./draw";
import { Eq, useEqBox, type Mark } from "./eq";
import { Axes, DotGrid, LinearPlane, Plate, TrackerLine, plotEnd, toPx, Plot, type AxesSpec, type Mat2 } from "./plot";
import { BLUE, BOARD, BOARD_EDGE, GREEN, INK, MUTED, RED, SMOOTH, YELLOW } from "./theme";

const fadeOut = (t: number, out?: number) => (out !== undefined ? 1 - ramp(t, out, 0.4, SMOOTH) : 1);

// ---------- title card ----------
export const TitleCard: FC<{ title: string; kicker?: string; sub?: string; at: number; x?: number; y?: number; size?: number; out?: number; figure?: ReactNode }> = ({ title, kicker, sub, at, x = 160, y = 520, size = 104, out, figure }) => {
  const { t } = useTime();
  const box = useEqBox(title, x, size, "start");
  const end = box ? box.x1 : x + 900;
  const lineAt = at + 1.5;
  const dot = ramp(t, lineAt + 0.2, 1.4, SMOOTH);
  const o = fadeOut(t, out);
  return (
    <g opacity={o}>
      {kicker && <Txt x={x + 4} y={y - 150} text={kicker} size={32} color={BLUE} font="sfm" spacing={5} caps at={at} />}
      <Eq tex={title} x={x} y={y} size={size} anchor="start" at={at + 0.2} dur={1.6} colors={{ n: BLUE }} />
      <Create d={`M${x} ${y + 64} L${end} ${y + 64}`} at={lineAt} dur={0.7} color={MUTED} w={2} />
      {dot > 0 && <Dot x={x + (end - x) * dot} y={y + 64} r={9} color={YELLOW} glow={1} />}
      {sub && <Txt x={x + 4} y={y + 150} text={sub} size={44} color={MUTED} at={lineAt + 0.4} />}
      {figure}
    </g>
  );
};

// ---------- key-word claim ----------
export type ClaimWord = { w: string; t: number; key?: boolean; color?: string };

// Prose fades in word by word on the narration; key words turn yellow on their word and get a drawn box.
export const Claim: FC<{ words: ClaimWord[]; y: number; x?: number; size?: number; out?: number; boxKeys?: boolean }> = ({ words, y, x = W / 2, size = 76, out, boxKeys = true }) => {
  const ready = useFontsReady();
  const { t } = useTime();
  if (!ready) return null;
  const sp = textWidth(" ", size);
  const ws = words.map((w) => textWidth(w.w, size));
  // Boxed key words need air on both sides so the box never touches a neighbour.
  const gapAfter = (i: number) => (i === words.length - 1 ? 0 : sp + (boxKeys && (words[i]!.key || words[i + 1]!.key) ? size * 0.28 : 0));
  const total = ws.reduce((a, b, i) => a + b + gapAfter(i), 0);
  let cx = x - total / 2;
  const o = fadeOut(t, out);
  return (
    <g opacity={o}>
      {words.map((w, i) => {
        const x0 = cx;
        cx += ws[i]! + gapAfter(i);
        const c = w.key ? interpolateColors(ramp(t, w.t + 0.05, 0.27, SMOOTH), [0, 1], [INK, w.color ?? YELLOW]) : INK;
        return (
          <g key={i}>
            <Txt x={x0} y={y} text={w.w} size={size} color={c} at={w.t - 0.12} />
            {w.key && boxKeys && <Surround x0={x0} y0={y - size * 0.76} x1={x0 + ws[i]!} y1={y + size * 0.2} pad={14} at={w.t + 0.25} color={w.color ?? YELLOW} />}
          </g>
        );
      })}
    </g>
  );
};

// ---------- algorithm steps ----------
// Numbered steps written one by one; a yellow pointer marks the step being explained and the rest dim (Manim's fade_all_but).
export const StepsList: FC<{ title?: string; steps: string[]; at: number[]; active?: number[]; x?: number; y?: number; gap?: number; size?: number; out?: number }> = ({ title, steps, at, active = [], x = 200, y = 300, gap = 130, size = 54, out }) => {
  const { t } = useTime();
  const o = fadeOut(t, out);
  let cur = -1;
  active.forEach((a, i) => {
    if (t >= a) cur = i;
  });
  const prev = cur > 0 ? cur - 1 : 0;
  const mv = cur >= 0 ? ramp(t, active[cur]!, 0.4, SMOOTH) : 0;
  const py = y + (cur > 0 ? prev + (cur - prev) * mv : 0) * gap - size * 0.32;
  return (
    <g opacity={o}>
      {title && <Eq tex={`\\text{${title}}`} x={x - 60} y={y - 130} size={64} anchor="start" at={at[0]! - 0.8} />}
      {title && <Create d={`M${x - 60} ${y - 100} L${x + 520} ${y - 100}`} at={at[0]! - 0.2} dur={0.6} color={MUTED} w={2} />}
      {steps.map((s, i) => {
        const dim = cur >= 0 && i !== cur ? 1 - 0.6 * ramp(t, active[cur]!, 0.3, SMOOTH) : 1;
        return (
          <g key={i} opacity={dim}>
            <Eq tex={`${i + 1}.`} x={x} y={y + i * gap} size={size} anchor="start" at={at[i]!} dur={0.4} color={BLUE} />
            <Eq tex={s} x={x + size * 1.3} y={y + i * gap} size={size} anchor="start" at={at[i]! + 0.15} colors={{ lo: BLUE, hi: BLUE, mid: YELLOW }} />
          </g>
        );
      })}
      {cur >= 0 && <path d={`M${x - 30} ${py} L${x - 62} ${py - 18} L${x - 62} ${py + 18} Z`} fill={YELLOW} opacity={ramp(t, active[0]!, 0.3)} />}
    </g>
  );
};

// ---------- big number ----------
// DecimalNumber counting to its value (out-expo so the last digits settle slowly), with a lead equation and a quiet label.
export const BigStat: FC<{ lead?: string; value: number; from?: number; decimals?: number; at: number; dur?: number; label?: string; x?: number; y?: number; size?: number; color?: string; out?: number }> = ({ lead, value, from = 0, decimals = 0, at, dur = 1.4, label, x = W / 2, y = 600, size = 260, color = YELLOW, out }) => {
  const { t } = useTime();
  const start = lead ? at + 1.4 : at;
  // Normalised out-expo so the count lands exactly on the value.
  const r = ramp(t, start, dur, Easing.linear);
  const p = (1 - Math.pow(2, -10 * r)) / (1 - Math.pow(2, -10));
  const punch = 1 + 0.08 * Math.sin(Math.PI * ramp(t, start + dur, 0.2));
  const o = fadeOut(t, out);
  return (
    <g opacity={o}>
      {lead && <Eq tex={lead} x={x} y={y - size * 0.95} size={72} at={at} colors={{ n: BLUE }} />}
      {t >= start && (
        <g transform={`translate(${x} ${y - size * 0.35}) scale(${punch}) translate(${-x} ${-(y - size * 0.35)})`}>
          <Decimal x={x} y={y} value={from + (value - from) * p} decimals={decimals} size={size} color={color} opacity={ramp(t, start, 0.25)} />
        </g>
      )}
      <Flash x={x} y={y - size * 0.35} at={start + dur} r={size * 0.75} n={14} />
      {label && <Txt x={x} y={y + 120} text={label} size={46} color={MUTED} anchor="middle" at={start + dur + 0.3} />}
    </g>
  );
};

// ---------- A vs B ----------
export type CompareSide = { title: string; tex: string; rows: number; cols: number; color: string; count: number; unit?: string };

// Two columns split by a drawn line; each side counts its work as a grid of dots, so the gap is seen, not just stated.
export const Compare: FC<{ left: CompareSide; right: CompareSide; at: number; winner?: "left" | "right"; winAt?: number; gap?: number; out?: number }> = ({ left, right, at, winner, winAt = 1e9, gap = 50, out }) => {
  const { t } = useTime();
  const o = fadeOut(t, out);
  const side = (s: CompareSide, cx: number, a: number, win: boolean) => {
    const gx = cx - ((s.cols - 1) * gap) / 2;
    const cnt = ramp(t, a + 0.9, 1.0, Easing.out(Easing.cubic));
    const marks: Mark[] = win ? [{ term: "*", at: winAt, kind: "box", color: GREEN }] : [];
    return (
      <g>
        <Txt x={cx} y={205} text={s.title} size={44} color={MUTED} anchor="middle" at={a} />
        <Eq tex={s.tex} x={cx} y={305} size={76} at={a + 0.2} colors={{ n: s.color }} marks={marks} />
        <DotGrid x={gx} y={400} rows={s.rows} cols={s.cols} gap={gap} r={12} at={a + 0.9} dur={1.0} color={s.color} />
        {t >= a + 0.9 && <Decimal x={cx - 16} y={900} value={Math.round(s.count * cnt)} size={84} anchor="end" color={s.color} />}
        <Txt x={cx} y={898} text={s.unit ?? "comparisons"} size={38} color={MUTED} at={a + 1.6} />
      </g>
    );
  };
  return (
    <g opacity={o}>
      <Create d={`M${W / 2} 160 L${W / 2} 930`} at={at} dur={0.6} color={MUTED} w={2} />
      {side(left, W / 4 + 20, at + 0.2, winner === "left")}
      {side(right, (W * 3) / 4 - 20, at + 0.9, winner === "right")}
      <Eq tex={`\\text{n} = ${left.cols}`} x={W / 2} y={1010} size={40} color={MUTED} at={at + 2.2} fadeIn />
    </g>
  );
};

// ---------- definition / quote callout ----------
// A thin outlined box drawn round a definition, its label cut into the top edge; or a left rule for a quote.
export const Callout: FC<{ label: string; lines: string[]; x?: number; y?: number; w?: number; lineGap?: number; size?: number; at: number; color?: string; kind?: "box" | "rule"; by?: string; out?: number; colors?: Record<string, string> }> = ({ label, lines, x = 260, y = 300, w = 1400, lineGap = 120, size = 60, at, color = BLUE, kind = "box", by, out, colors }) => {
  const { t } = useTime();
  const h = 120 + lines.length * lineGap + (by ? 60 : 0);
  const lw = textWidth(label.toUpperCase(), 30, "sfm") + 5 * label.length + 32;
  const o = fadeOut(t, out);
  return (
    <g opacity={o}>
      {kind === "box" ? (
        <>
          <Create d={rectD(x, y, x + w, y + h)} at={at} dur={0.9} color={color} w={3} cap="butt" />
          <rect x={x + 28} y={y - 6} width={lw} height={12} fill={BOARD} opacity={ramp(t, at + 0.35, 0.2)} />
        </>
      ) : (
        <Create d={`M${x} ${y} L${x} ${y + h}`} at={at} dur={0.6} color={color} w={5} />
      )}
      <Txt x={x + 44} y={y + (kind === "box" ? 11 : 36)} text={label} size={30} color={color} font="sfm" spacing={5} caps at={at + 0.4} />
      {lines.map((l, i) => (
        <Eq key={i} tex={l} x={x + 64} y={y + 70 + (kind === "box" ? 40 : 60) + i * lineGap} size={size} anchor="start" at={at + 0.6 + i * 1.1} colors={colors} />
      ))}
      {by && <Txt x={x + w - 60} y={y + h - 40} text={`— ${by}`} size={36} color={MUTED} anchor="end" at={at + 0.8 + lines.length * 1.1} />}
    </g>
  );
};

// ---------- source label ----------
// Lower-left source line: a short blue rule draws, a small-caps label and the reference fade in after.
export const SourceLabel: FC<{ text: string; label?: string; at: number; x?: number; y?: number; out?: number }> = ({ text, label = "Source", at, x = 120, y = 960, out }) => {
  const { t } = useTime();
  return (
    <g opacity={fadeOut(t, out)}>
      <Create d={`M${x} ${y - 52} L${x + 56} ${y - 52}`} at={at} dur={0.3} color={BLUE} w={3} />
      <Txt x={x + 74} y={y - 42} text={label} size={28} color={BLUE} font="sfm" spacing={4} caps at={at + 0.15} />
      <Txt x={x} y={y + 6} text={text} size={34} color={INK} opacity={0.85} at={at + 0.3} />
    </g>
  );
};

// ---------- transition: the camera pans across the board ----------
// The board (and its grid) slides a full frame so the next idea sits on fresh board; content travels with the camera.
export const ScenePan: FC<{ at: number; from: ReactNode; to: ReactNode; dur?: number; dir?: 1 | -1 }> = ({ at, from, to, dur = 1.1, dir = 1 }) => {
  const { t } = useTime();
  const e = ramp(t, at, dur, Easing.inOut(Easing.cubic));
  const off = e * W * dir;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 75% at 50% 46%, ${BOARD} 0%, ${BOARD} 52%, ${BOARD_EDGE} 100%)` }}>
      <Grid ox={off} />
      <Stage>
        {e < 1 && <g transform={`translate(${-off} 0)`}>{from}</g>}
        {e > 0 && <g transform={`translate(${W * dir - off} 0)`}>{to}</g>}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- complexity curves ----------
const log2 = (x: number) => (x <= 0 ? 0 : Math.log2(x));
export const CURVES = [
  { tex: "O(1)", fn: () => 1, color: MUTED },
  { tex: "O(\\log n)", fn: (x: number) => log2(x), color: GREEN },
  { tex: "O(n)", fn: (x: number) => x, color: BLUE },
  { tex: "O(n \\log n)", fn: (x: number) => x * log2(x), color: YELLOW },
  { tex: "O(n^2)", fn: (x: number) => x * x, color: RED },
];

// Big-O growth: axes, then each curve drawn at constant speed with its label at the end, then a tracker sweeping n.
export const ComplexityCurves: FC<{ at: number; step?: number; sweepAt?: number; A?: AxesSpec; title?: string }> = ({ at, step = 0.7, sweepAt, A = { x: 240, y: 900, w: 1080, h: 680, xr: [0, 10], yr: [0, 20] }, title = "How the work grows with n" }) => {
  const { t } = useTime();
  const sw = sweepAt ?? at + 1.2 + CURVES.length * step + 0.4;
  const val = 1 + 8.5 * ramp(t, sw, 2.2, SMOOTH);
  return (
    <g>
      <Txt x={A.x - 60} y={110} text={title} size={46} color={INK} at={at} />
      <Axes A={A} at={at} xTicks={[2, 4, 6, 8, 10]} yTicks={[5, 10, 15, 20]} xLabel="n" yLabel="\sf{steps}" />
      {CURVES.map((c, i) => {
        const a = at + 1.0 + i * step;
        const [ex, ey] = plotEnd(A, c.fn);
        const top = ey <= A.y - A.h + 1;
        return (
          <g key={c.tex}>
            <Plot A={A} fn={c.fn} at={a} dur={step * 1.3} color={c.color} from={c.fn === CURVES[1]!.fn ? 0.05 : 0} />
            <Eq tex={c.tex} x={ex + (top ? 18 : 30)} y={ey + (top ? 30 : 15)} size={46} anchor="start" color={c.color} at={a + step * 1.1} dur={0.6} />
          </g>
        );
      })}
      <TrackerLine A={A} value={val} fns={CURVES.map(({ fn, color }) => ({ fn, color }))} opacity={ramp(t, sw - 0.3, 0.3)} />
      <g opacity={ramp(t, sw - 0.3, 0.3)}>
        <Eq tex="n =" x={toPx(A, val, 0)[0] - 8} y={A.y - A.h - 36} size={40} anchor="end" at={-1} dur={0.01} color={MUTED} />
        <Decimal x={toPx(A, val, 0)[0] + 4} y={A.y - A.h - 36} value={val} decimals={1} size={40} anchor="start" color={INK} />
      </g>
    </g>
  );
};

// ---------- matrix transform ----------
// 3b1b's signature: the matrix is written top-left, the plane bends under it, and each column lights up with the basis vector it became.
export const MatrixTransform: FC<{ M: Mat2; at: number; apply: number; dur?: number; vector?: [number, number] }> = ({ M, at, apply, dur = 2.2, vector }) => {
  const f = (v: number) => (v < 0 ? `-${-v}` : `${v}`);
  const tex = `\\mat{\\term{c1}{\\c{green}{${f(M[0][0])}}} & \\term{c2}{\\c{red}{${f(M[0][1])}}} \\\\ \\term{c1}{\\c{green}{${f(M[1][0])}}} & \\term{c2}{\\c{red}{${f(M[1][1])}}}}`;
  const done = apply + dur;
  return (
    <g>
      <LinearPlane M={M} at={at} apply={apply} dur={dur} vectors={vector ? [{ v: vector, color: YELLOW }] : []} />
      <Plate x={96} y={96} w={330} h={250} at={at + 0.4} />
      <Eq tex={tex} x={260} y={240} size={76} at={at + 0.5} marks={[{ term: "c1", at: done + 0.3 }, { term: "c2", at: done + 1.0 }]} />
    </g>
  );
};
