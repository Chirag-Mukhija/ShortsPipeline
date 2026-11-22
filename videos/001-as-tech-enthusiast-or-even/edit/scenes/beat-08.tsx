// Video 001, Beat 8 (7:24–7:58): the hook question returns in the pencil's quote marks, the page turns to a fresh chain whose coral main link fills the gap, gathers the calendar, the robot and the parked ideas, and ends on a blank link with the pencil set down beside it.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, ramp, useTime, type Rect, type Shot } from "@library/core";
import {
  At, GRAIN, Hand, Robot, Sk, WordLine, cloudPts, curvePts, linePts, rectPts, rng, slicePts, smooth, wr,
  type P,
} from "@library/themes/hand-drawn";
import { STYLE } from "./style";

// Colours come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL } = STYLE;

const START = 444.19;
const END = 478.14;
// The page turn: page 1 lifts off its spine and the fresh chain page is under it, revealed on "But" (453.43).
const FLIP = 453.12;
const FLIP_D = 0.56;

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
// Write-on progress that follows the voice: [time, fraction of the text] keys from the narration's word starts.
const along = (t: number, keys: [number, number][]) =>
  interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
// A point moving through [time, x, y] keys, eased between each pair.
const track = (t: number, keys: [number, number, number][]): P => {
  const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.quad) };
  return [interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), o), interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[2]), o)];
};
// Damped pendulum for anything hung on a string: kicked on arrival, settles in ~1.5 s, never fully still.
const swing = (t: number, at: number, amp: number, ph = 0) => (t < at ? 0 : amp * Math.exp(-2.4 * (t - at)) * Math.cos(6.5 * (t - at)) + 1.1 * Math.sin(t * 1.6 + ph));
// Where a Hand line's write-on edge is, so the pencil can ride it (same width guess Hand uses for its clip).
const handEdge = (x: number, text: string, size: number, p: number) => {
  const est = text.length * size * 0.5 + 30;
  return x - est / 2 + est * p;
};

// A stadium (chain-link) outline: two straight sides and two round ends, drawn as one wobbly stroke that overshoots its start.
const stadium = (cx: number, cy: number, w: number, h: number, seed: number, n = 44, over = 0.05): P[] => {
  const r = h / 2;
  const a = Math.max(0, w / 2 - r);
  const L = 4 * a + 2 * Math.PI * r;
  const rr = rng(seed);
  const ph = rr() * 6;
  const s0 = rr() * L;
  return Array.from({ length: n + 1 }, (_, i) => {
    let s = (s0 + (L * (1 + over) * i) / n) % L;
    let x: number;
    let y: number;
    if (s < 2 * a) {
      x = -a + s;
      y = -r;
    } else if ((s -= 2 * a) < Math.PI * r) {
      const th = -Math.PI / 2 + s / r;
      x = a + Math.cos(th) * r;
      y = Math.sin(th) * r;
    } else if ((s -= Math.PI * r) < 2 * a) {
      x = a - s;
      y = r;
    } else {
      const th = Math.PI / 2 + (s - 2 * a) / r;
      x = -a + Math.cos(th) * r;
      y = Math.sin(th) * r;
    }
    const k = 1 + 0.018 * Math.sin(i * 0.7 + ph);
    return [cx + x * k, cy + y * k] as P;
  });
};

// ---------- new piece: Pencil, the creator's pencil with its tip at the origin (it opens and closes the beat) ----------
const Pencil: FC<{ x: number; y: number; o: number; angle?: number; s?: number; shadow?: number }> = ({ x, y, o, angle = -28, s = 0.9, shadow = 0 }) => {
  if (o <= 0) return null;
  const body: P[] = [[50, -17], [262, -17], [262, 17], [50, 17], [50, -17]];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`} opacity={o}>
      {shadow > 0 && <rect x={20} y={14} width={270} height={22} rx={11} fill={INK} opacity={0.1 * shadow} />}
      <polygon points="0,0 50,-17 262,-17 262,17 50,17" fill={PAPER} />
      <polygon points="0,0 15,-5 15,5" fill={INK} />
      <Sk pts={[[50, -17], [0, 0], [50, 17]]} w={3.6} color={INK} seed={8951} amp={0.8} ghost={false} />
      <Sk pts={body} w={3.6} color={INK} seed={8952} amp={1} />
      <Sk pts={linePts(60, 0, 228, 0, 8953, 0.01, 5)} w={2.4} color={PENCIL} seed={8953} ghost={false} />
      <Sk pts={linePts(228, -17, 228, 17, 8954, 0.02, 3)} w={3.2} color={INK} seed={8954} ghost={false} />
      <Sk pts={linePts(242, -17, 242, 17, 8955, 0.02, 3)} w={3.2} color={INK} seed={8955} ghost={false} />
      <polygon points="262,-17 286,-15 286,15 262,17" fill={ACCENT} opacity={0.85} />
      <Sk pts={[[262, -17], [286, -15], [286, 15], [262, 17]]} w={3.2} color={INK} seed={8956} amp={0.8} ghost={false} />
    </g>
  );
};

// ---------- new piece: QuoteMarks, a pair of big hand-drawn quote marks (open = 66, close = 99) ----------
const QuoteMarks: FC<{ x: number; y: number; p: number; open?: boolean; s?: number }> = ({ x, y, p, open = false, s = 1.7 }) => {
  if (p <= 0) return null;
  const comma = (dx: number, k: number, seed: number) => {
    const q = clamp01(p * 2 - k);
    if (q <= 0) return null;
    return (
      <g key={seed} transform={`translate(${dx} 0)`}>
        <circle cx={0} cy={0} r={13 * clamp01(q * 3)} fill={INK} />
        <Sk pts={curvePts(10, 4, 18, 30, -8, 50, 8)} p={clamp01(q * 1.4 - 0.3)} w={9} color={INK} seed={seed} amp={1.2} ghost={false} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${open ? 180 : 0})`}>
      {comma(open ? 22 : -22, 0, 8961)}
      {comma(open ? -22 : 22, 1, 8962)}
    </g>
  );
};

// ================= page 1: the hook question comes back =================
const W1 = { w: 3200, h: 2200 };
const QL = { x: 640, y: 380 };
const Q_OPEN = { x: 1165, y: 640 };
const Q_CLOSE = { x: 2120, y: 1000 };
const NOTE = { x: 1600, y: 1590, size: 76, text: "(still sorting things out)", at: 449.85 };
const NOTHING = { x: 1600, y: 1770, size: 106, text: "Nothing is guaranteed.", at: 451.8 };

const QuestionPage: FC = () => {
  const { t } = useTime();
  const noteP = wr(t, NOTE.at, NOTE.text);
  // The pencil: drops in to draw the opening quote, rests in the corner while the words pop, draws the closing quote, then writes the note.
  const riding = t >= NOTE.at && t <= NOTE.at + 1.1;
  const noteEnd = handEdge(NOTE.x, NOTE.text, NOTE.size, 1);
  const [px, py] = riding
    ? [handEdge(NOTE.x, NOTE.text, NOTE.size, noteP), NOTE.y - 8]
    : track(t, [
        [444.19, 1500, 1050],
        [444.36, Q_OPEN.x - 30, Q_OPEN.y - 30],
        [444.85, Q_OPEN.x + 30, Q_OPEN.y + 10],
        [445.5, 790, 1300],
        [447.95, 790, 1300],
        [448.2, Q_CLOSE.x - 30, Q_CLOSE.y - 10],
        [448.55, Q_CLOSE.x + 25, Q_CLOSE.y + 40],
        [449.1, Q_CLOSE.x + 40, Q_CLOSE.y + 60],
        [449.8, handEdge(NOTE.x, NOTE.text, NOTE.size, 0), NOTE.y - 8],
        [450.96, noteEnd, NOTE.y - 8],
        [451.5, noteEnd + 260, NOTE.y - 240],
      ]);
  const writing = (t > 444.36 && t < 444.85) || (t > 448.2 && t < 448.55) || riding;
  const penO = clamp01((t - 444.19) / 0.12) * (1 - ramp(t, 451.1, 0.4, Easing.in(Easing.cubic)));
  return (
    <>
      <svg width={W1.w} height={W1.h} viewBox={`0 0 ${W1.w} ${W1.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <QuoteMarks x={Q_OPEN.x} y={Q_OPEN.y} p={ramp(t, 444.36, 0.5)} open />
        <QuoteMarks x={Q_CLOSE.x} y={Q_CLOSE.y} p={ramp(t, 448.2, 0.35)} />
        <Hand x={NOTE.x} y={NOTE.y} text={NOTE.text} size={NOTE.size} color={PENCIL} rotate={-1.5} p={noteP} />
        <Hand x={NOTHING.x} y={NOTHING.y} text={NOTHING.text} size={NOTHING.size} color={INK} p={wr(t, NOTHING.at, NOTHING.text)} />
        {/* a shaky graphite underline under "guaranteed": the coral stays for the main link */}
        <Sk
          pts={Array.from({ length: 19 }, (_, i) => [1650 + i * 27, 1803 + Math.sin(i * 1.9) * 7] as P)}
          p={ramp(t, 452.55, 0.45, INOUT)}
          w={4.5}
          color={INK}
          seed={8971}
          ghost={false}
        />
      </svg>
      {/* the question as Beat 1 asked it, word by word on the narration (transcript order fixed to "should I be") */}
      <div style={{ position: "absolute", left: QL.x, top: QL.y, width: 1920, height: 1080 }}>
        <WordLine y={300} size={124} mode="pop" color={INK} words={[{ w: "If", t: 446.03 }, { w: "AI", t: 446.25 }, { w: "can", t: 446.59 }, { w: "code,", t: 446.91 }]} />
        <WordLine y={460} size={124} mode="pop" color={INK} words={[{ w: "what", t: 447.33 }, { w: "should", t: 447.55 }, { w: "I", t: 447.73 }, { w: "be", t: 447.89 }]} />
        <WordLine y={690} size={124} mode="pop" color={INK} words={[{ w: "learning?", t: 448.07, accent: true, underline: true, scale: 1.95 }]} />
      </div>
      <svg width={W1.w} height={W1.h} viewBox={`0 0 ${W1.w} ${W1.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <Pencil x={px} y={py} o={penO} angle={-28 + (writing ? 5 * Math.sin(t * 24) : 0)} />
      </svg>
    </>
  );
};

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
// A view by centre and scale (fill 1 of a frame-sized rect), so each framing is exact.
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });

const SHOTS1: Shot[] = [
  // 1 "So, what's my answer": born close on the pencil drawing the opening quote, then pull back as the question pops.
  { at: START, ...V(1250, 690, 2.0) },
  { at: START + 0.01, ...V(1265, 680, 2.12), move: "push", dur: 1.4 },
  { at: 445.7, ...V(1600, 880, 1.12), move: "pull", dur: 1.4 },
  { at: 447.2, ...V(1600, 890, 1.19), move: "push", dur: 1.8 },
  // 2 "Honestly, I'm still sorting things out": push down onto the pencil note, creep through "Nothing is guaranteed".
  { at: 449.15, ...V(1600, 1690, 1.4), move: "push", dur: 0.85 },
  { at: 451.6, ...V(1600, 1700, 1.47), move: "push", dur: 1.8 },
];

// ================= page 2: the fresh chain =================
const W2 = { w: 4800, h: 2600 };
const M = { x: 2400, y: 1080 };
const RING = { w: 900, h: 440, iw: 700, ih: 250 };
const BOT = M.y + RING.h / 2;
// The old chain on either side of the gap: face-on links alternate with edge-on ones, each threaded through its neighbour.
const LINKS = [170, 460, 750, 1040, 1330, 1620, 1910, 2890, 3180, 3470].map((x, i) => ({ x, face: i % 2 === 1 && i < 7 ? true : i === 8, seed: 8100 + i * 7 }));
const BLANK = { x: 3760 };

// New piece: SketchLink, one chain link in pencil, face-on (an oval loop with its hole) or edge-on (a flat bar).
const SketchLink: FC<{ x: number; face: boolean; seed: number; p: number; ink: number; dash?: string; w?: number }> = ({ x, face, seed, p, ink, dash, w = 4 }) => {
  if (p <= 0) return null;
  const col = interpolateColors(ink, [0, 0.5, 1], [DOT, PENCIL, INK]);
  return face ? (
    <g>
      <Sk pts={stadium(x, M.y, 360, 200, seed)} p={p} w={w} color={col} seed={seed} dash={dash} />
      <Sk pts={stadium(x, M.y, 240, 84, seed + 1)} p={clamp01(p * 1.2 - 0.2)} w={w * 0.85} color={col} seed={seed + 1} dash={dash} ghost={false} />
    </g>
  ) : (
    <g>
      <path d={smooth(stadium(x, M.y, 360, 60, seed, 30, 0))} fill={PAPER} opacity={p >= 1 ? 1 : 0} />
      <Sk pts={stadium(x, M.y, 360, 60, seed, 30)} p={p} w={w} color={col} seed={seed} dash={dash} />
      <Sk pts={linePts(x - 130, M.y, x + 130, M.y, seed + 2, 0.01, 6)} p={clamp01(p * 1.2 - 0.2)} w={w * 0.7} color={col} seed={seed + 2} ghost={false} />
    </g>
  );
};

const OldChain: FC = () => {
  const { t } = useTime();
  return (
    <>
      {LINKS.map((l, i) => {
        // Draws outward from the gap, as if the page was sketched around the missing link.
        const d = Math.abs(l.x - M.x);
        const p = ramp(t, 453.3 + d * 0.00045, 0.45, INOUT);
        // "leaving others behind": the far-left links fade; "a chain like mine": a dark pass sweeps left to right.
        const behind = l.x < 1400 ? ramp(t, 466.7 + (1400 - l.x) * 0.0006, 0.5) : 0;
        const sweep = ramp(t, 473.35 + l.x * 0.00018, 0.35);
        const ink = 0.5 - 0.3 * behind + (0.85 - 0.5 + 0.3 * behind) * sweep;
        return <SketchLink key={l.seed} x={l.x} face={l.face} seed={l.seed} p={p} ink={ink} />;
      })}
    </>
  );
};

// The gap waits as a dashed outline, then the thick coral main link draws into it on "One main thing".
const MainLink: FC = () => {
  const { t } = useTime();
  const outer = stadium(M.x, M.y, RING.w, RING.h, 8201, 56);
  const inner = stadium(M.x, M.y, RING.iw, RING.ih, 8202, 44);
  const band = `${smooth(stadium(M.x, M.y, RING.w, RING.h, 8203, 56, 0))} Z ${smooth(stadium(M.x, M.y, RING.iw, RING.ih, 8204, 44, 0))} Z`;
  const gap = ramp(t, 453.35, 0.5) * (1 - ramp(t, 455.4, 0.35));
  const pOut = ramp(t, 455.22, 0.5, INOUT);
  const pIn = ramp(t, 455.5, 0.4, INOUT);
  const fill = ramp(t, 455.75, 0.4);
  // "That's the answer": one thick re-inking pulse.
  const k = t >= 469.35 ? Math.exp(-(t - 469.35) * 4) * Math.sin(Math.min(Math.PI, (t - 469.35) * 10)) : 0;
  return (
    <g>
      {gap > 0 && <Sk pts={outer} p={gap} w={3.4} color={PENCIL} seed={8205} dash="14 14" />}
      <g transform={`translate(${M.x} ${M.y}) scale(${1 + 0.04 * k}) translate(${-M.x} ${-M.y})`}>
        {fill > 0 && <path d={band} fill={ACCENT} fillRule="evenodd" opacity={0.16 * fill} />}
        <Sk pts={outer} p={pOut} w={12 + 6 * k} color={ACCENT} seed={8201} amp={2.6} />
        <Sk pts={inner} p={pIn} w={8 + 4 * k} color={ACCENT} seed={8202} amp={2.4} />
      </g>
    </g>
  );
};

// Small, real, finished: three boxes inside the main link tick on as they are said.
const TICKS = [
  { dx: -215, label: "small", box: 456.38, tick: 456.55 },
  { dx: 0, label: "real", box: 457.08, tick: 457.3 },
  { dx: 215, label: "finished", box: 458.95, tick: 459.12 },
];
const Finished: FC = () => {
  const { t } = useTime();
  const labelsO = 1 - ramp(t, 459.65, 0.3, Easing.in(Easing.cubic));
  return (
    <>
      {TICKS.map((k, i) => {
        const x = M.x + k.dx;
        const y = M.y - 30;
        const click = ramp(t, k.tick, 0.22, Easing.out(Easing.back(3)));
        const s = 1 + 0.14 * Math.sin(Math.PI * click);
        return (
          <g key={k.label}>
            <g transform={`translate(${x} ${y}) scale(${s})`}>
              <Sk pts={rectPts(-30, -30, 60, 60, 8300 + i)} p={ramp(t, k.box, 0.25)} w={4.5} color={INK} seed={8300 + i} ghost={false} />
              <Sk pts={[[-24, -4], [-6, 18], [30, -42]]} p={ramp(t, k.tick, 0.2)} w={7} color={INK} seed={8310 + i} amp={1.2} ghost={false} />
            </g>
            <Hand x={x} y={M.y + 80} text={k.label} size={58} color={INK} p={wr(t, k.box + 0.05, k.label)} opacity={labelsO} />
          </g>
        );
      })}
    </>
  );
};

// ---------- new piece: SketchDie, a pencil die that tumbles in and bounces to rest ("improve your odds") ----------
const PIPS: Record<number, [number, number][]> = {
  3: [[-1, -1], [0, 0], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};
const SketchDie: FC<{ x: number; y: number; land: number; size?: number }> = ({ x, y, land, size = 100 }) => {
  const { t } = useTime();
  const t0 = land - 0.42;
  if (t < t0) return null;
  const u = t - t0;
  // Fall, then two shrinking bounces, landing on the word.
  const dy = u < 0.26 ? -320 * (1 - (u / 0.26) ** 2) : u < 0.42 ? -70 * Math.sin((Math.PI * (u - 0.26)) / 0.16) : u < 0.52 ? -16 * Math.sin((Math.PI * (u - 0.42)) / 0.1) : 0;
  const dx = 240 * (1 - ramp(t, t0, 0.5, Easing.out(Easing.quad)));
  const rot = 230 * (1 - ramp(t, t0, 0.55, Easing.out(Easing.cubic))) - 4;
  const face = u < 0.26 ? 3 : u < 0.42 ? 5 : 6;
  const h = size / 2;
  return (
    <g>
      <ellipse cx={x} cy={y + h + 10} rx={h * (0.9 + dy / 900)} ry={9} fill={INK} opacity={0.08} />
      <g transform={`translate(${x + dx} ${y + dy}) rotate(${rot})`}>
        <rect x={-h} y={-h} width={size} height={size} rx={18} fill={PAPER} />
        <Sk pts={stadium(0, 0, size, size * 0.98, 8401, 32, 0.08).map(([a, b]) => [a * 1, b] as P)} w={5} color={INK} seed={8401} amp={1.6} />
        {PIPS[face]!.map(([a, b], k) => (
          <circle key={k} cx={a * h * 0.52} cy={b * h * 0.52} r={size * 0.075} fill={INK} />
        ))}
      </g>
    </g>
  );
};

// ---------- new piece: Hanger, anything hung on a thin graphite string that drops and swings to rest ----------
const Hanger: FC<{ ax: number; ay: number; len: number; at: number; ph?: number; amp?: number; children: ReactNode }> = ({ ax, ay, len, at, ph = 0, amp = 14, children }) => {
  const { t } = useTime();
  if (t < at) return null;
  const drop = ramp(t, at, 0.42, Easing.out(Easing.back(2)));
  const l = len * (0.35 + 0.65 * drop);
  return (
    <g transform={`rotate(${swing(t, at + 0.2, amp, ph)} ${ax} ${ay})`}>
      <Sk pts={linePts(ax, ay, ax, ay + l, 8500 + Math.round(ax), 0.03, 4)} p={ramp(t, at, 0.2)} w={2.8} color={PENCIL} seed={8500 + Math.round(ax)} ghost={false} />
      <g transform={`translate(${ax} ${ay + l})`} opacity={clamp01(drop * 3)}>
        {children}
      </g>
    </g>
  );
};

// ---------- new piece: CalendarStrip, a week of days hung from the main link; ticks spaced out across it ----------
const CAL = { x: 2050, y: M.y + 430, cw: 82, n: 7 };
const CAL_TICKS = [
  { cell: 0, at: 459.88 },
  { cell: 2, at: 460.82 },
  { cell: 6, at: 461.22 },
];
const CalendarStrip: FC = () => {
  const { t } = useTime();
  const at = 459.75;
  if (t < at) return null;
  const drop = ramp(t, at, 0.42, Easing.out(Easing.back(1.8)));
  const W = CAL.cw * CAL.n;
  const L = CAL.x - W / 2;
  const top = CAL.y - 120 * (1 - drop);
  const sw = swing(t, at + 0.2, 6, 1.3);
  const cx = (i: number) => L + CAL.cw * (i + 0.5);
  const labelO = 1 - ramp(t, 463.85, 0.3, Easing.in(Easing.cubic));
  return (
    <g transform={`rotate(${sw} ${M.x - 155} ${BOT})`}>
      {/* two strings from the main link's bottom to the strip's corners, like a hung sign */}
      <Sk pts={linePts(M.x - 210, BOT - 4, L + 6, top, 8601, 0.02, 5)} p={ramp(t, at, 0.25)} w={2.8} color={PENCIL} seed={8601} ghost={false} />
      <Sk pts={linePts(M.x - 100, BOT - 4, L + W - 6, top, 8602, 0.02, 5)} p={ramp(t, at, 0.25)} w={2.8} color={PENCIL} seed={8602} ghost={false} />
      <g opacity={clamp01(drop * 3)}>
        <rect x={L} y={top} width={W} height={140} fill={PAPER} />
        <Sk pts={rectPts(L, top, W, 140, 8603)} p={ramp(t, at, 0.35)} w={4.5} color={INK} seed={8603} />
        <Sk pts={linePts(L, top + 34, L + W, top + 34, 8604, 0.005, 8)} p={ramp(t, at + 0.1, 0.3)} w={3.4} color={INK} seed={8604} ghost={false} />
        {Array.from({ length: CAL.n - 1 }, (_, i) => (
          <Sk key={i} pts={linePts(L + CAL.cw * (i + 1), top + 34, L + CAL.cw * (i + 1), top + 140, 8610 + i, 0.02, 3)} p={ramp(t, at + 0.12 + i * 0.03, 0.2)} w={2.8} color={PENCIL} seed={8610 + i} ghost={false} />
        ))}
        {/* header hatching, the calendar's "binding" */}
        {Array.from({ length: 14 }, (_, i) => (
          <Sk key={`h${i}`} pts={linePts(L + 14 + i * 40, top + 30, L + 34 + i * 40, top + 6, 8620 + i, 0.02, 2)} p={ramp(t, at + 0.15, 0.25)} w={2.4} color={PENCIL} seed={8620 + i} ghost={false} />
        ))}
        {CAL_TICKS.map((k, i) => (
          <Sk key={k.cell} pts={[[cx(k.cell) - 22, top + 86], [cx(k.cell) - 6, top + 106], [cx(k.cell) + 24, top + 54]]} p={ramp(t, k.at, 0.2)} w={7} color={INK} seed={8630 + i} amp={1.2} ghost={false} />
        ))}
        {/* "space it out": hops between the ticked days */}
        <Sk pts={curvePts(cx(0), top + 150, (cx(0) + cx(2)) / 2, top + 215, cx(2), top + 150, 12)} p={ramp(t, 460.85, 0.35, INOUT)} w={3.4} color={PENCIL} seed={8640} dash="8 9" head />
        <Sk pts={curvePts(cx(2), top + 150, (cx(2) + cx(6)) / 2, top + 240, cx(6), top + 150, 16)} p={ramp(t, 461.25, 0.4, INOUT)} w={3.4} color={PENCIL} seed={8641} dash="8 9" head />
        <Hand x={CAL.x} y={top + 290} text="test, space it out" size={66} color={INK} p={along(t, [[459.88, 0], [460.3, 0.3], [460.85, 0.3], [461.5, 1]])} opacity={labelO} />
      </g>
    </g>
  );
};

// The robot hangs by its antenna and asks "why?" in a bubble.
const ROBO = { ax: 2620, len: 190, s: 2.4 };
const RobotWhy: FC = () => {
  const { t } = useTime();
  const at = 461.7;
  const bubble = ramp(t, 462.25, 0.35, POP) * (1 - ramp(t, 468.1, 0.3, Easing.in(Easing.cubic)));
  const labelO = 1 - ramp(t, 463.85, 0.3, Easing.in(Easing.cubic));
  return (
    <Hanger ax={ROBO.ax} ay={BOT - 4} len={ROBO.len} at={at} ph={2.1} amp={10}>
      <g transform={`translate(0 ${60 * ROBO.s}) scale(${ROBO.s})`}>
        <Robot p={ramp(t, at + 0.05, 0.6)} />
      </g>
      {bubble > 0 && (
        <At x={235} y={-20} s={bubble} o={clamp01(bubble * 3)}>
          <ellipse cx={0} cy={0} rx={128} ry={80} fill={PAPER} />
          <Sk pts={cloudPts(0, 0, 118, 72, 8701)} w={4} color={INK} seed={8701} />
          <Sk pts={[[-86, 50], [-128, 108], [-50, 68]]} w={4} color={INK} seed={8702} amp={1} ghost={false} />
          <Hand x={0} y={24} text="why?" size={74} color={INK} />
        </At>
      )}
      <Hand x={10} y={330} text="explain, not do" size={66} color={INK} p={wr(t, 462.4, "explain, not do")} opacity={labelO} />
    </Hanger>
  );
};

// ---------- new piece: ParkedTag, a small grey side-link on a long thin string with the parked idea on its tag ----------
const ParkedTag: FC<{ ax: number; ay: number; ex: number; ey: number; at: number; text: string; seed: number }> = ({ ax, ay, ex, ey, at, text, seed }) => {
  const { t } = useTime();
  if (t < at) return null;
  const sp = ramp(t, at, 0.35, INOUT);
  const drop = ramp(t, at + 0.25, 0.4, Easing.out(Easing.back(2)));
  const w = Math.max(230, text.length * 39 + 80);
  const sw = swing(t, at + 0.45, 12, seed);
  const string = curvePts(ax, ay, (ax + ex) / 2, Math.max(ay, ey) - 30, ex, ey, 16);
  return (
    <g>
      <Sk pts={string} p={sp} w={2.6} color={PENCIL} seed={seed} ghost={false} />
      {drop > 0 && (
        <g transform={`translate(${ex} ${ey}) rotate(${sw})`} opacity={clamp01(drop * 3)}>
          <Sk pts={stadium(0, 26, 56, 92, seed + 1, 26)} w={4} color={PENCIL} seed={seed + 1} />
          <g transform={`translate(0 ${70 * drop})`}>
            <rect x={-w / 2} y={0} width={w} height={120} rx={10} fill={PAPER} />
            <Sk pts={rectPts(-w / 2, 0, w, 120, seed + 2)} w={4} color={PENCIL} seed={seed + 2} />
            <Hand x={0} y={84} text={text} size={78} color={INK} p={wr(t, at + 0.3, text)} />
          </g>
        </g>
      )}
    </g>
  );
};

// ---------- new piece: ScribbleOut, a fast zigzag crossing out a word ----------
const ScribbleOut: FC<{ x: number; y: number; w: number; h: number; p: number; seed: number }> = ({ x, y, w, h, p, seed }) => {
  const n = 9;
  const pts: P[] = Array.from({ length: n + 1 }, (_, j) => [x - w / 2 + (w * j) / n, y + (j % 2 ? h / 2 : -h / 2)] as P);
  return <Sk pts={pts} p={p} w={5.5} color={INK} seed={seed} amp={3} ghost={false} />;
};

// The ending: the chain's next link is drawn open and left blank, then the pencil is set down beside it.
const BlankLink: FC = () => {
  const { t } = useTime();
  const outer = stadium(BLANK.x, M.y, 360, 200, 8801, 40, 0);
  const p = 0.84 * ramp(t, 474.05, 0.85, INOUT);
  const pin = 0.78 * ramp(t, 474.55, 0.4, INOUT);
  // The pencil rides the outline as it draws, lifts, and is laid down on the page.
  const tip = slicePts(outer, Math.max(0.001, p / 1)).slice(-1)[0]!;
  const drawing = t >= 474.05 && t <= 474.95;
  const [lx, ly] = track(t, [
    [474.95, tip[0], tip[1]],
    [475.25, BLANK.x + 120, M.y + 90],
    [475.7, BLANK.x - 60, M.y + 260],
  ]);
  const enter = track(t, [
    [473.65, BLANK.x + 520, M.y - 420],
    [474.05, outer[0]![0], outer[0]![1]],
  ]);
  const [px, py] = t < 474.05 ? enter : drawing ? tip : [lx, ly];
  const set = ramp(t, 475.25, 0.45, Easing.out(Easing.quad));
  // A small bounce as it lands, then it rolls a hair and rests.
  const land = t >= 475.7 ? Math.exp(-(t - 475.7) * 7) * Math.sin((t - 475.7) * 26) : 0;
  const roll = 6 * ramp(t, 475.75, 1.6, Easing.out(Easing.cubic));
  const angle = lerp(-28 + (drawing ? 5 * Math.sin(t * 24) : 0), -8, set) + 2 * land;
  return (
    <g>
      <Sk pts={outer} p={p} w={4} color={PENCIL} seed={8801} dash="16 12" />
      <Sk pts={stadium(BLANK.x, M.y, 240, 84, 8802, 30, 0)} p={pin} w={3.4} color={PENCIL} seed={8802} dash="12 10" ghost={false} />
      <Pencil x={px + roll} y={py - 10 * land} o={ramp(t, 473.65, 0.15)} angle={angle} s={1.3 + 0.15 * (1 - set) * (t > 474.95 ? 1 : 0)} shadow={set} />
    </g>
  );
};

const CTA = { x: 3540, y: 820, size: 132, text: "Where are you on yours?", at: 475.4 };

const ChainPage: FC = () => {
  const { t } = useTime();
  const top = (a: number, b: number) => (1 - ramp(t, b, 0.3, Easing.in(Easing.cubic))) * (t >= a ? 1 : 0);
  const ctaEdge = handEdge(CTA.x, CTA.text, CTA.size, 1);
  return (
    <svg width={W2.w} height={W2.h} viewBox={`0 0 ${W2.w} ${W2.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {/* shot 3: "But you can improve your odds" */}
      {t < 455.6 && (
        <>
          <Hand x={2330} y={600} text="you can improve your odds" size={132} color={INK} p={along(t, [[453.6, 0], [453.85, 0.28], [454.45, 1]])} opacity={top(453.4, 455.1)} />
          <SketchDie x={3300} y={555} land={454.42} size={130} />
        </>
      )}
      <OldChain />
      {/* the parked ideas, hung off the main link on long thin strings */}
      <ParkedTag ax={M.x - 400} ay={M.y + 130} ex={1330} ey={1610} at={464.15} text="AWS" seed={8901} />
      <ParkedTag ax={M.x + 400} ay={M.y + 130} ex={3330} ey={1630} at={464.75} text="new protocol idea" seed={8911} />
      <CalendarStrip />
      <RobotWhy />
      <MainLink />
      <Finished />
      {t < 459.9 && <Hand x={M.x} y={800} text="one main thing" size={92} color={INK} p={wr(t, 455.4, "one main thing")} opacity={top(455.3, 459.6)} />}
      {/* shot 6 */}
      <Hand x={M.x} y={650} text="park new ideas" size={140} color={INK} p={wr(t, 464.12, "park new ideas")} opacity={top(464.1, 468.05)} />
      {/* shot 7: "Not a tool name, a way of learning" */}
      <g opacity={top(470.6, 473.1)}>
        <Hand x={1985} y={770} text="tool name" size={86} color={PENCIL} p={wr(t, 470.72, "tool name")} />
        <ScribbleOut x={1985} y={742} w={330} h={64} p={ramp(t, 471.42, 0.24, Easing.linear)} seed={8951} />
        <Sk pts={curvePts(2165, 742, 2215, 722, 2280, 740, 8)} p={ramp(t, 471.8, 0.25)} w={4} color={INK} seed={8952} head ghost={false} />
      </g>
      <g opacity={top(472.0, 474.95)}>
        <Hand x={2322} y={770} text="a way of learning" size={94} anchor="start" color={INK} p={wr(t, 472.03, "a way of learning")} />
        <Sk pts={curvePts(2650, 798, 2810, 786, 2990, 800, 12)} p={ramp(t, 472.95, 0.4, INOUT)} w={6.5} color={ACCENT} seed={8953} ghost={false} />
      </g>
      {/* shot 8 */}
      <Hand x={CTA.x} y={CTA.y} text={CTA.text} size={CTA.size} color={INK} p={wr(t, CTA.at, CTA.text)} />
      {/* Hand's width guess runs long for Caveat, so the underline sits well inside the estimated right edge, under "yours". */}
      <Sk pts={curvePts(ctaEdge - 560, CTA.y + 34, ctaEdge - 420, CTA.y + 24, ctaEdge - 270, CTA.y + 36, 12)} p={ramp(t, 476.55, 0.4, INOUT)} w={6.5} color={ACCENT} seed={8954} ghost={false} />
      <BlankLink />
    </svg>
  );
};

const SHOTS2: Shot[] = [
  // 3 "But you can improve your odds": the turned page shows the fresh chain wide, creeping while the line writes.
  { at: FLIP, ...V(2400, 900, 0.74) },
  { at: FLIP + 0.3, ...V(2400, 910, 0.79), move: "push", dur: 1.6 },
  // 4 "One main thing. Small, real things you finish": push onto the gap as the coral link draws, creep while the ticks land.
  { at: 455.05, ...V(M.x, 1045, 1.45), move: "push", dur: 0.6 },
  { at: 455.8, ...V(M.x, 1050, 1.52), move: "push", dur: 3.6 },
  // 5 "Test yourself, space it out. Ask AI to explain": glide down to the calendar, then across to the robot.
  { at: 459.68, ...V(2150, 1620, 1.3), move: "glide", dur: 0.7 },
  { at: 461.5, ...V(2420, 1630, 1.15), move: "glide", dur: 0.7 },
  // 6 "Park the new ideas": pull back wide to take in the whole mobile.
  { at: 463.95, ...V(2400, 1310, 0.66), move: "pull", dur: 1.3 },
  // 7 "That's the answer I promised you": slow push onto the main link.
  { at: 468.1, ...V(M.x, 1010, 1.1), move: "push", dur: 2.8 },
  // 8 "If you've got a chain like mine": pull back along the chain to its open end, then keep easing out to the last frame.
  { at: 473.1, ...V(3000, 1260, 0.66), move: "pull", dur: 2.0 },
  { at: 475.3, ...V(3010, 1265, 0.63), move: "pull", dur: 2.8 },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC<{ w: number; h: number }> = ({ w, h }) => (
  <AbsoluteFill style={{ width: w, height: h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

const Beat08: FC = () => {
  const { t } = useTime();
  if (t < START || t >= END) return null;
  const flip = ramp(t, FLIP, FLIP_D, Easing.inOut(Easing.cubic));
  const angle = flip * 104;
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {t >= FLIP - 0.05 && (
        <AbsoluteFill>
          <Camera world={W2} shots={SHOTS2} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
            <Layer depth={1}>
              <PageWorld w={W2.w} h={W2.h} />
              <ChainPage />
            </Layer>
          </Camera>
          {/* the lifted page's shadow on the fresh one */}
          {flip < 1 && <AbsoluteFill style={{ background: `linear-gradient(90deg, ${INK} 0%, transparent ${30 + 70 * flip}%)`, opacity: 0.22 * (1 - flip) }} />}
        </AbsoluteFill>
      )}
      {angle < 90 && (
        <AbsoluteFill style={{ transformOrigin: "0% 50%", transform: `perspective(2600px) rotateY(${-angle}deg)` }}>
          <AbsoluteFill style={{ backgroundColor: PAPER }}>
            <Camera world={W1} shots={SHOTS1} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
              <Layer depth={1}>
                <PageWorld w={W1.w} h={W1.h} />
                <QuestionPage />
              </Layer>
            </Camera>
          </AbsoluteFill>
          {/* the turning page darkens as it tips away from the light, with a soft edge along its spine */}
          <AbsoluteFill style={{ background: `linear-gradient(90deg, ${INK} 0%, transparent 18%)`, opacity: 0.18 * flip }} />
          <AbsoluteFill style={{ backgroundColor: INK, opacity: 0.2 * flip }} />
        </AbsoluteFill>
      )}
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}22 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default Beat08;
