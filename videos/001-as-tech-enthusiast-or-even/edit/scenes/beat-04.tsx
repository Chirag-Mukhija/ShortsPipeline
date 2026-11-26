// Video 001, Beat 4 (2:55–4:11): the Anthropic trial on one sketch page: the setup, the disclosure note, the bars and how people used AI, the limits pad, and the stamped folder that contradicts it.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, ramp, seg, useTime, type Rect, type Shot } from "@library/core";
import {
  At, GRAIN, Hand, Laptop, Robot, Sk, Stamp, arcPts, blobPts, curvePts, ellPts, linePts, rectPts, wr, type P,
} from "@library/themes/hand-drawn";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL, hand: HANDF, sans: SANS } = STYLE;

const START = 175.31;
const END = 251.45;
const WORLD = { w: 7400, h: 3200 };

// A polyline with in-between points, so the stroke's smoothing keeps sharp corners instead of looping round them.
const dense = (pts: P[], n = 4): P[] => [
  ...pts.slice(1).flatMap((b, i) => {
    const a = pts[i]!;
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as P);
  }),
  pts[pts.length - 1]!,
];

// ---------- new piece: StickFig, a small stick person whose arms and lean can be posed ----------
type Arm = [number, number];
const StickFig: FC<{ x: number; y: number; p: number; s?: number; lean?: number; la?: Arm; ra?: Arm; color?: string; seed: number }> = ({ x, y, p, s = 1, lean = 0, la = [-16, -34], ra = [16, -34], color = INK, seed }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean}) scale(${s})`}>
      <Sk pts={ellPts(0, -76, 12, 12, seed)} p={seg(p, 0, 3)} w={3.6} color={color} seed={seed} ghost={false} />
      <Sk pts={linePts(0, -63, 0, -28, seed + 1, 0.04, 3)} p={seg(p, 1, 3)} w={3.6} color={color} seed={seed + 1} ghost={false} />
      {[[-14, 0], [14, 0]].map(([lx, ly], k) => (
        <Sk key={k} pts={[[0, -28], [lx!, ly!]]} p={seg(p, 2, 3)} w={3.6} color={color} seed={seed + 2 + k} ghost={false} amp={1} />
      ))}
      {[la, ra].map((a, k) => (
        <Sk key={`a${k}`} pts={[[0, -54], [a[0] * 0.55, (a[1] - 54) * 0.5], a]} p={seg(p, 2, 3)} w={3.6} color={color} seed={seed + 5 + k} ghost={false} amp={1} />
      ))}
    </g>
  );
};

// ---------- new piece: SpeechBubble, a wobbly bubble that pops with its tail pointing at the speaker ----------
const SpeechBubble: FC<{ x: number; y: number; w: number; h: number; text: string; at: number; tail: Arm; size?: number; color?: string; font?: string; seed: number }> = ({ x, y, w, h, text, at, tail, size = 48, color = INK, font = HANDF, seed }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.34, POP);
  if (e <= 0) return null;
  return (
    <At x={x} y={y} s={0.4 + 0.6 * e} o={clamp01(e * 3)}>
      <path d={`M${-w * 0.12},${h * 0.38} L${tail[0]},${tail[1]} L${w * 0.12},${h * 0.4} Z`} fill={PAPER} />
      <ellipse cx={0} cy={0} rx={w / 2} ry={h / 2} fill={PAPER} />
      <Sk pts={blobPts(0, 0, w, h, seed)} p={ramp(t, at, 0.3)} w={4} color={color} seed={seed} />
      <Sk pts={[[-w * 0.12, h * 0.44], tail, [w * 0.12, h * 0.46]]} p={ramp(t, at + 0.1, 0.2)} w={4} color={color} seed={seed + 1} amp={1} ghost={false} />
      <Hand x={0} y={size * 0.34} text={text} size={size} font={font} color={color} p={wr(t, at + 0.08, text)} />
    </At>
  );
};

// ---------- region 1: the study's setup (clipboard, 52 engineers, Trio, two groups, the quiz) ----------
const CLIP = { x: 1100, y: 1000, w: 560, h: 740 };
const HINGE = CLIP.y - CLIP.h / 2 + 12;

// New piece: FlipClipboard, a study clipboard whose cover flips up over the clip to show the sheet.
const FlipClipboard: FC = () => {
  const { t } = useTime();
  const L = CLIP.x - CLIP.w / 2;
  const T = CLIP.y - CLIP.h / 2;
  const a = Math.PI * ramp(t, 175.42, 0.62, INOUT);
  const c = Math.cos(a);
  const coverO = c > 0 ? 1 : clamp01(1 + c * 2.6);
  const lines = [380, 300, 400, 260, 340, 220];
  return (
    <g>
      <rect x={L + 8} y={T + 14} width={CLIP.w} height={CLIP.h} rx={22} fill={INK} opacity={0.06} />
      <rect x={L} y={T} width={CLIP.w} height={CLIP.h} rx={22} fill={PAPER} />
      <Sk pts={blobPts(CLIP.x, CLIP.y, CLIP.w, CLIP.h, 1401)} w={5.5} color={INK} seed={1401} />
      {/* the sheet */}
      <Sk pts={rectPts(L + 40, T + 70, CLIP.w - 80, CLIP.h - 110, 1402)} w={3.4} color={PENCIL} seed={1402} ghost={false} />
      <Hand x={CLIP.x} y={T + 170} text="Anthropic trial" size={64} color={INK} p={wr(t, 175.95, "Anthropic trial")} />
      <Sk pts={linePts(L + 90, T + 196, L + CLIP.w - 90, T + 192, 1403, 0.01, 8)} p={ramp(t, 176.6, 0.35)} w={4} color={INK} seed={1403} />
      {lines.map((len, k) => (
        <Sk key={k} pts={linePts(L + 90, T + 270 + k * 62, L + 90 + len, T + 270 + k * 62, 1410 + k, 0.01, 6)} p={ramp(t, 176.75 + k * 0.09, 0.3)} w={3.4} color={PENCIL} seed={1410 + k} ghost={false} />
      ))}
      {/* the cover, hinged at the clip */}
      {coverO > 0 && (
        <g transform={`translate(0 ${HINGE}) scale(1 ${c}) translate(0 ${-HINGE})`} opacity={coverO}>
          <rect x={L + 22} y={HINGE} width={CLIP.w - 44} height={CLIP.h - 40} rx={14} fill={PAPER} />
          <Sk pts={rectPts(L + 22, HINGE, CLIP.w - 44, CLIP.h - 40, 1420)} w={4} color={c > 0 ? INK : PENCIL} seed={1420} />
          {c > 0 && [0, 1, 2, 3].map((k) => (
            <Sk key={k} pts={linePts(L + 70 + k * 40, HINGE + 520, L + 160 + k * 40, HINGE + 430, 1425 + k, 0.03, 3)} w={3} color={PENCIL} seed={1425 + k} ghost={false} />
          ))}
        </g>
      )}
      {/* the clip */}
      <rect x={CLIP.x - 92} y={T - 26} width={184} height={62} rx={14} fill={PAPER} />
      <Sk pts={blobPts(CLIP.x, T + 5, 184, 62, 1430)} w={5} color={INK} seed={1430} />
      <Sk pts={ellPts(CLIP.x, T - 2, 26, 9, 1431)} w={3.6} color={INK} seed={1431} ghost={false} />
    </g>
  );
};

// New piece: TinyScale, a balance that tips one way, then the other ("weigh that however you want").
const TinyScale: FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.5);
  if (p <= 0) return null;
  const u = Math.max(0, t - at - 0.25);
  const tilt = 13 * Math.sin(u * 4.4) * Math.exp(-u * 0.55);
  const pan = (side: number) => {
    const r = (tilt * Math.PI) / 180;
    return [side * 92 * Math.cos(r), side * 92 * Math.sin(r)] as Arm;
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      <Sk pts={[[-50, 112], [0, 96], [50, 112]]} p={seg(p, 0, 3)} w={4.5} color={PENCIL} seed={1441} />
      <Sk pts={linePts(0, 98, 0, -10, 1442, 0.02, 4)} p={seg(p, 0, 3)} w={4.5} color={PENCIL} seed={1442} />
      <g transform={`rotate(${tilt})`}>
        <Sk pts={linePts(-96, 0, 96, 0, 1443, 0.02, 6)} p={seg(p, 1, 3)} w={4.5} color={PENCIL} seed={1443} />
      </g>
      {[-1, 1].map((side) => {
        const [px, py] = pan(side);
        return (
          <g key={side} transform={`translate(${px} ${py})`}>
            <Sk pts={[[-26, 44], [0, 0], [26, 44]]} p={seg(p, 2, 3)} w={3} color={PENCIL} seed={1445 + side} ghost={false} amp={1} />
            <Sk pts={arcPts(0, 44, 34, 16, 0, Math.PI, 10)} p={seg(p, 2, 3)} w={4} color={PENCIL} seed={1448 + side} ghost={false} />
          </g>
        );
      })}
      <Sk pts={ellPts(0, -10, 7, 7, 1450)} p={seg(p, 1, 3)} w={4} color={PENCIL} seed={1450} ghost={false} />
    </g>
  );
};

const CROWD = { x: 2500, rows: [700, 830, 960, 1090], cols: 13, dx: 72 };
const TAG = { x: 2500, y: 500 };
const BOOK = { x: 2500, y: 870 };
// The three middle figures of the front row hold the book up when it lands.
const HOLDERS = new Set([3 * 13 + 5, 3 * 13 + 6, 3 * 13 + 7, 2 * 13 + 4, 2 * 13 + 8]);

const Crowd: FC = () => {
  const { t } = useTime();
  const count = Math.round(52 * ramp(t, 177.4, 0.38, Easing.out(Easing.quad)));
  const tagIn = ramp(t, 177.38, 0.3, POP) * (1 - ramp(t, 179.7, 0.3, Easing.in(Easing.cubic)));
  const hold = ramp(t, 180.12, 0.25, POP);
  const dim = 1 - 0.55 * ramp(t, 182.9, 0.4);
  return (
    <g opacity={dim}>
      {Array.from({ length: 52 }, (_, i) => {
        const row = Math.floor(i / CROWD.cols);
        const col = i % CROWD.cols;
        const x = CROWD.x + (col - 6) * CROWD.dx;
        const up = HOLDERS.has(i) ? hold : 0;
        return (
          <StickFig
            key={i}
            x={x}
            y={CROWD.rows[row]!}
            p={ramp(t, 177.4 + row * 0.12 + col * 0.016, 0.28)}
            la={[-16 - 2 * up, -34 - 48 * up]}
            ra={[16 + 2 * up, -34 - 48 * up]}
            color={row % 2 ? INK : interpolateColors(0.25, [0, 1], [INK, PENCIL])}
            seed={1500 + i * 9}
          />
        );
      })}
      {/* headcount tag */}
      <At x={TAG.x} y={TAG.y} s={0.5 + 0.5 * tagIn} o={clamp01(tagIn * 3)}>
        <ellipse cx={0} cy={-6} rx={104} ry={66} fill={PAPER} />
        <Sk pts={blobPts(0, -6, 210, 132, 1490)} w={4.5} color={INK} seed={1490} />
        <Hand x={0} y={26} text={String(count)} size={92} font={SANS} color={INK} />
      </At>
      <Sk pts={linePts(TAG.x, TAG.y + 62, TAG.x, 600, 1491, 0.05, 3)} p={ramp(t, 177.6, 0.2)} w={3} color={PENCIL} seed={1491} ghost={false} dash="4 10" opacity={tagIn} />
      <Hand x={CROWD.x} y={1225} text="engineers, mostly junior" size={60} color={INK} p={wr(t, 178.25, "engineers, mostly junior")} opacity={1 - ramp(t, 182.7, 0.3)} />
    </g>
  );
};

// New piece: DropBook, a book that falls into the crowd's raised hands; a Python snake, then its title.
const DropBook: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 179.82, 0.42, Easing.bounce);
  if (t < 179.82) return null;
  const y = BOOK.y - 560 * (1 - e);
  const squash = 1 + 0.06 * Math.exp(-(t - 180.25) * 12) * (t > 180.25 ? 1 : 0);
  const rot = -8 + 5 * e;
  return (
    <g>
      <g transform={`translate(${BOOK.x} ${y}) rotate(${rot}) scale(${squash} ${1 / squash})`}>
        <rect x={-122} y={-148} width={244} height={296} rx={12} fill={PAPER} />
        <Sk pts={rectPts(-122, -148, 244, 296, 1601)} w={5} color={INK} seed={1601} />
        <Sk pts={linePts(-96, -146, -96, 146, 1602, 0.01, 6)} w={3.6} color={INK} seed={1602} ghost={false} />
        <Hand x={14} y={-50} text="Trio" size={84} color={INK} p={wr(t, 181.98, "Trio")} />
        {/* a little snake for Python */}
        <Sk pts={Array.from({ length: 14 }, (_, i) => [-50 + i * 9, 62 + Math.sin(i * 0.85) * 18] as P)} p={ramp(t, 180.72, 0.45)} w={5} color={INK} seed={1603} />
        <Sk pts={ellPts(72, 54, 9, 7, 1604)} p={ramp(t, 181.1, 0.2)} w={4} color={INK} seed={1604} ghost={false} />
      </g>
      <Hand x={2632} y={566} text="new Python library:" size={50} anchor="start" rotate={-3} color={PENCIL} p={wr(t, 180.5, "new Python library:")} />
      <Sk pts={curvePts(2650, 584, 2622, 640, 2600, 700)} p={ramp(t, 181.4, 0.3)} w={3.6} color={PENCIL} seed={1605} head />
    </g>
  );
};

// New piece: LaptopSeat, a person peeking over a laptop; the laptop's lines type themselves.
const LaptopSeat: FC<{ x: number; y: number; p: number; typed: (k: number) => number; seed: number }> = ({ x, y, p, typed, seed }) => (
  <g transform={`translate(${x} ${y}) scale(1.3) translate(${-x} ${-y})`}>
    <Sk pts={ellPts(x, y - 92, 20, 20, seed)} p={seg(p, 0, 2)} w={4.2} color={INK} seed={seed} ghost={false} />
    <Sk pts={curvePts(x - 16, y - 66, x - 112, y - 40, x - 96, y + 40, 8)} p={seg(p, 0, 2)} w={4} color={INK} seed={seed + 1} ghost={false} />
    <Sk pts={curvePts(x + 16, y - 66, x + 112, y - 40, x + 96, y + 40, 8)} p={seg(p, 0, 2)} w={4} color={INK} seed={seed + 2} ghost={false} />
    <rect x={x - 76} y={y - 62} width={152} height={98} fill={PAPER} />
    <At x={x} y={y}>
      <g transform="scale(0.52)">
        <Laptop p={seg(p, 1, 2)} typed={typed} />
      </g>
    </At>
  </g>
);

const SPLIT = { y: 1730, left: 2200, right: 2800 };
const QUIZ = { x: 3450, y: 1710 };

const Groups: FC = () => {
  const { t } = useTime();
  const sp = ramp(t, 183.02, 0.6, Easing.out(Easing.back(1.3)));
  const lx = SPLIT.left + (CROWD.x - SPLIT.left) * (1 - sp);
  const rx = SPLIT.right + (CROWD.x - SPLIT.right) * (1 - sp);
  const appear = ramp(t, 182.95, 0.45);
  return (
    <g>
      <LaptopSeat x={lx} y={SPLIT.y} p={appear} seed={1701} typed={(k) => clamp01((t - 184.55) * 7 - k * 0.8)} />
      <LaptopSeat x={rx} y={SPLIT.y} p={appear} seed={1711} typed={(k) => clamp01((t - 185.75) * 1.6 - k * 0.55)} />
      <SpeechBubble x={SPLIT.left + 140} y={SPLIT.y - 220} w={150} h={96} text="AI" at={184.3} tail={[-88, 78]} size={56} font={SANS} seed={1721} />
      <Hand x={SPLIT.left} y={SPLIT.y + 140} text="AI assistant" size={56} color={INK} p={wr(t, 184.55, "AI assistant")} />
      <Hand x={SPLIT.right} y={SPLIT.y + 140} text="by hand" size={56} color={INK} p={wr(t, 185.82, "by hand")} />
    </g>
  );
};

// New piece: QuizSheet, a tilted quiz page both groups' arrows run into.
const QuizSheet: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 187.55, 0.5);
  if (p <= 0 && t < 186.85) return null;
  return (
    <g>
      <Sk pts={curvePts(SPLIT.left + 40, SPLIT.y - 120, 2850, 1440, QUIZ.x - 175, QUIZ.y - 80, 22)} p={ramp(t, 186.85, 0.75, INOUT)} w={4.5} color={INK} seed={1731} head />
      <Sk pts={curvePts(SPLIT.right + 100, SPLIT.y - 10, 3080, 1790, QUIZ.x - 175, QUIZ.y + 30, 14)} p={ramp(t, 187.0, 0.6, INOUT)} w={4.5} color={INK} seed={1732} head />
      <g transform={`translate(${QUIZ.x} ${QUIZ.y}) rotate(4)`}>
        {p > 0 && <rect x={-140} y={-185} width={280} height={370} fill={PAPER} />}
        <Sk pts={rectPts(-140, -185, 280, 370, 1733)} p={p} w={4.5} color={INK} seed={1733} />
        <Hand x={0} y={-112} text="Quiz" size={64} color={INK} p={wr(t, 187.85, "Quiz")} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <Sk pts={ellPts(-88, -32 + k * 72, 14, 14, 1734 + k)} p={ramp(t, 188.0 + k * 0.1, 0.25)} w={3.6} color={INK} seed={1734 + k} ghost={false} />
            <Sk pts={linePts(-58, -32 + k * 72, 92 - k * 22, -32 + k * 72, 1738 + k, 0.02, 5)} p={ramp(t, 188.05 + k * 0.1, 0.3)} w={3.4} color={PENCIL} seed={1738 + k} ghost={false} />
          </g>
        ))}
      </g>
      <Hand x={QUIZ.x} y={QUIZ.y + 270} text="right after" size={54} color={PENCIL} rotate={-2} p={wr(t, 188.12, "right after")} />
    </g>
  );
};

// ---------- region 2: the results chart, which later splits by how people used AI ----------
const BASE = 1300;
const COLH = 800;
const COLW = 180;
const AIX = 4300;
const HBX = 4800;
const STOP = { x: 3850, y: 820, r: 92 };

const Hatch: FC<{ x: number; h: number; color: string; seed: number }> = ({ x, h, color, seed }) => {
  const gap = 17;
  const n = h < 14 ? 0 : Math.floor((h - 14) / gap) + 1;
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const y = BASE - 8 - k * gap;
        return <Sk key={k} pts={linePts(x - COLW / 2 + 10, y + 1, x + COLW / 2 - 10, y - 13, seed + k, 0.02, 3)} w={3} color={color} seed={seed + k} ghost={false} amp={1.4} />;
      })}
    </>
  );
};

// New piece: HatchColumn, a tall hand-drawn meter whose hatching rises to a share, with its number sitting on the fill.
const HatchColumn: FC<{ x: number; draw: number; fill: number; color: string; outline: string; tint?: number; rot?: number; drop?: number; oldFill?: number; oldColor?: string; seed: number; children?: ReactNode }> = ({ x, draw, fill, color, outline, tint = 0, rot = 0, drop = 0, oldFill = 0, oldColor = INK, seed, children }) => {
  if (draw <= 0) return null;
  const h = COLH * fill;
  return (
    <g transform={`rotate(${rot} ${x} ${BASE})`}>
      <rect x={x - COLW / 2} y={BASE - COLH} width={COLW} height={COLH} fill={PAPER} />
      {tint > 0 && h > 0 && <rect x={x - COLW / 2} y={BASE - h} width={COLW} height={h} fill={color} opacity={tint} />}
      {oldFill > 0 && drop < 1 && (
        <g transform={`translate(0 ${320 * drop * drop})`} opacity={1 - drop}>
          <Hatch x={x} h={COLH * oldFill} color={oldColor} seed={seed + 100} />
          <Sk pts={linePts(x - COLW / 2, BASE - COLH * oldFill, x + COLW / 2, BASE - COLH * oldFill, seed + 99, 0.01, 4)} w={4.5} color={oldColor} seed={seed + 99} ghost={false} />
        </g>
      )}
      <Hatch x={x} h={h} color={color} seed={seed + 10} />
      {h > 2 && <Sk pts={linePts(x - COLW / 2, BASE - h, x + COLW / 2, BASE - h, seed + 3, 0.01, 4)} w={4.5} color={color} seed={seed + 3} ghost={false} />}
      <Sk pts={rectPts(x - COLW / 2, BASE - COLH, COLW, COLH, seed)} p={draw} w={4.5} color={outline} seed={seed} />
      {children}
    </g>
  );
};

// New piece: Stopwatch, a sketched stopwatch whose hand ticks round, shading the time it covered.
const Stopwatch: FC<{ ink: string }> = ({ ink }) => {
  const { t } = useTime();
  const p = ramp(t, 204.25, 0.55);
  if (p <= 0) return null;
  const ticks = ramp(t, 205.55, 0.28, Easing.out(Easing.back(3))) + ramp(t, 205.98, 0.28, Easing.out(Easing.back(3)));
  const a = -Math.PI / 2 + (ticks * Math.PI) / 6;
  const wedge: P[] = [[0, 0], ...arcPts(0, 0, STOP.r - 14, STOP.r - 14, -Math.PI / 2, a, 10)];
  return (
    <g transform={`translate(${STOP.x} ${STOP.y})`}>
      <circle r={STOP.r} fill={PAPER} />
      {ticks > 0.02 && <path d={`M${wedge.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} Z`} fill={PENCIL} opacity={0.28} />}
      <Sk pts={ellPts(0, 0, STOP.r, STOP.r, 1801)} p={p} w={5} color={ink} seed={1801} />
      <Sk pts={rectPts(-15, -STOP.r - 30, 30, 24, 1802)} p={seg(p, 0.5, 1.5)} w={4} color={ink} seed={1802} ghost={false} />
      <Sk pts={linePts(STOP.r * 0.68, -STOP.r * 0.72, STOP.r * 0.86, -STOP.r * 0.92, 1803, 0.02, 3)} p={seg(p, 0.5, 1.5)} w={5} color={ink} seed={1803} ghost={false} />
      {Array.from({ length: 12 }, (_, k) => {
        const th = (k * Math.PI) / 6;
        return <Sk key={k} pts={linePts(Math.cos(th) * (STOP.r - 18), Math.sin(th) * (STOP.r - 18), Math.cos(th) * (STOP.r - 6), Math.sin(th) * (STOP.r - 6), 1810 + k, 0.02, 2)} p={p} w={3} color={PENCIL} seed={1810 + k} ghost={false} />;
      })}
      <Sk pts={linePts(0, 0, Math.cos(a) * (STOP.r - 22), Math.sin(a) * (STOP.r - 22), 1830, 0.01, 3)} p={p} w={5} color={ink} seed={1830} ghost={false} />
      <circle r={6} fill={ink} opacity={p} />
    </g>
  );
};

const Chart: FC = () => {
  const { t } = useTime();
  // Before the split: AI vs by hand. 209.4: shake; 209.85: the old hatching falls out; 210.15: the columns slide apart and recolour.
  const shake = t > 209.4 && t < 210.1 ? 4.5 * Math.sin((t - 209.4) * 46) * (1 - ramp(t, 209.4, 0.7)) : 0;
  const drop = ramp(t, 209.85, 0.45, Easing.in(Easing.quad));
  const apart = ramp(t, 210.15, 0.65, Easing.out(Easing.back(1.2)));
  const aiX = AIX - 150 * apart;
  const hbX = HBX + 750 * apart;
  const old = 1 - ramp(t, 209.3, 0.3);
  const aiFill = 0.5 * ramp(t, 196.95, 0.9, INOUT);
  const hbFill = 0.67 * ramp(t, 200.35, 0.88, INOUT);
  const greyFill = 0.36 * ramp(t, 211.6, 0.8, INOUT);
  const coralFill = 0.68 * ramp(t, 221.4, 0.9, INOUT);
  const split = t >= 209.85;
  const recolour = ramp(t, 210.2, 0.4);
  // The chart moves aside for the limits pad: text and bubbles clear, the shapes dim and stay as context.
  const aside = ramp(t, 223.7, 0.75, INOUT);
  const textO = 1 - ramp(t, 223.65, 0.35);
  const stopInk = interpolateColors(ramp(t, 208.15, 0.5), [0, 1], [INK, PENCIL]);
  const aiNum = Math.round(50 * ramp(t, 196.95, 0.9, INOUT));
  const hbNum = Math.round(67 * ramp(t, 200.35, 0.88, INOUT));
  const greyNum = Math.round(40 * ramp(t, 211.6, 0.8, INOUT));
  const coralNum = Math.round(65 * ramp(t, 221.4, 0.9, INOUT));
  // Sheets of work passed to the robot, faster and faster ("more and more").
  const passes = [[213.5, 0.8], [215.3, 0.55], [216.0, 0.45], [216.55, 0.4]] as const;
  const FIG = { x: 4440, y: 1300 };
  const BOT = { x: 4850, y: 1236 };
  const lean = 16 * ramp(t, 215.3, 1.7, INOUT);
  return (
    <g transform={`translate(${-350 * aside} 0)`} opacity={1 - 0.6 * aside}>
      <Sk pts={linePts(3980, BASE, 5700, BASE, 1840, 0.003, 30)} p={ramp(t, 195.95, 0.6)} w={4} color={INK} seed={1840} ghost={false} />

      {/* the AI column, then the grey "handed it over" column */}
      <HatchColumn
        x={aiX}
        draw={ramp(t, 196.0, 0.5)}
        fill={split ? greyFill : aiFill}
        color={split ? PENCIL : INK}
        outline={interpolateColors(recolour, [0, 1], [INK, PENCIL])}
        rot={shake}
        drop={drop}
        oldFill={split ? 0.5 : 0}
        seed={1850}
      />
      <HatchColumn
        x={hbX}
        draw={ramp(t, 196.15, 0.5)}
        fill={split ? coralFill : hbFill}
        color={split ? ACCENT : INK}
        outline={interpolateColors(recolour, [0, 1], [INK, ACCENT])}
        tint={split ? 0.1 : 0}
        rot={-shake}
        drop={drop}
        oldFill={split ? 0.67 : 0}
        seed={1950}
      />

      {/* before the split: numbers on the fills, labels under the baseline */}
      <g opacity={old}>
        {aiFill > 0.04 && <Hand x={AIX} y={BASE - COLH * aiFill - 26} text={`${aiNum}%`} size={64} font={SANS} color={INK} />}
        {hbFill > 0.04 && <Hand x={HBX} y={BASE - COLH * hbFill - 26} text={`${hbNum}%`} size={64} font={SANS} color={INK} />}
        <Hand x={AIX} y={BASE + 78} text="AI" size={62} color={INK} p={wr(t, 196.85, "AI")} />
        <Hand x={HBX} y={BASE + 78} text="by hand" size={62} color={INK} p={wr(t, 199.75, "by hand")} />
        {/* the gap, and where it was biggest */}
        <g opacity={1 - ramp(t, 204.0, 0.3)}>
        <Sk pts={linePts(AIX + COLW / 2 + 6, BASE - COLH * 0.5, HBX - COLW / 2 - 6, BASE - COLH * 0.5, 1860, 0.01, 6)} p={ramp(t, 202.05, 0.35)} w={3.4} color={PENCIL} seed={1860} dash="10 10" />
        <Sk
          pts={[[HBX - 112, BASE - COLH * 0.67], [HBX - 126, BASE - COLH * 0.67 + 10], [HBX - 126, BASE - COLH * 0.585 - 6], [HBX - 140, BASE - COLH * 0.585], [HBX - 126, BASE - COLH * 0.585 + 6], [HBX - 126, BASE - COLH * 0.5 - 10], [HBX - 112, BASE - COLH * 0.5]]}
          p={ramp(t, 202.35, 0.4)}
          w={4.5}
          color={INK}
          seed={1861}
          amp={1}
        />
          <Hand x={4545} y={612} text="biggest gap:" size={50} color={INK} p={wr(t, 202.62, "biggest gap:")} />
          <Hand x={4545} y={690} text="debugging" size={60} color={INK} p={wr(t, 203.52, "debugging")} />
          <Sk pts={curvePts(4425, 708, 4545, 698, 4668, 712, 10)} p={ramp(t, 204.0, 0.4, INOUT)} w={6} color={ACCENT} seed={1862} ghost={false} />
        </g>
        {/* about two minutes faster, but not significant */}
        <Stopwatch ink={stopInk} />
        <Sk pts={linePts(STOP.x + STOP.r + 6, STOP.y, AIX - COLW / 2 - 6, STOP.y + 4, 1870, 0.02, 4)} p={ramp(t, 204.6, 0.3)} w={3} color={PENCIL} seed={1870} dash="6 10" />
        <Hand x={STOP.x} y={STOP.y + 176} text="~2 min faster" size={54} color={stopInk} p={wr(t, 205.55, "~2 min faster")} />
        {t > 207.85 && (
          <g transform={`rotate(-4 ${STOP.x} ${STOP.y + 276})`}>
            <Sk pts={blobPts(STOP.x, STOP.y + 262, 360, 86, 1871)} p={ramp(t, 207.85, 0.4)} w={3.6} color={INK} seed={1871} />
            <Hand x={STOP.x} y={STOP.y + 279} text="not significant" size={50} color={INK} p={wr(t, 207.95, "not significant")} />
          </g>
        )}
      </g>

      {/* after the split: how the AI users used it */}
      {split && (
        <g opacity={textO}>
          {greyFill > 0 && (
            <>
              <Hand x={aiX} y={BASE - COLH * greyFill - 86} text="under" size={44} color={PENCIL} p={wr(t, 212.0, "under")} />
              <Hand x={aiX} y={BASE - COLH * greyFill - 26} text={`${greyNum}%`} size={64} font={SANS} color={INK} />
            </>
          )}
          <Hand x={aiX} y={BASE + 78} text="handed it over" size={58} color={INK} p={wr(t, 212.9, "handed it over")} />
          {coralFill > 0 && <Hand x={hbX} y={BASE - COLH * coralFill - 26} text={`${coralNum}%${t >= 223.3 ? "+" : ""}`} size={64} font={SANS} color={ACCENT} />}
          <Hand x={hbX + 112} y={BASE - COLH * 0.68 + 4} text="avg" size={46} anchor="start" color={PENCIL} p={wr(t, 221.95, "avg")} />
          <Hand x={hbX + 112} y={900} text="asked why" size={60} anchor="start" color={INK} p={wr(t, 218.2, "asked why")} />
          <Sk pts={curvePts(hbX + 104, 920, hbX + 210, 912, hbX + 352, 922, 10)} p={ramp(t, 222.9, 0.45, INOUT)} w={6} color={ACCENT} seed={1880} ghost={false} />
          <SpeechBubble x={hbX} y={385} w={210} h={112} text="why?" at={218.15} tail={[16, 108]} size={58} seed={1881} />
          <SpeechBubble x={hbX + 285} y={470} w={250} h={100} text="explain?" at={220.1} tail={[-100, 62]} size={50} seed={1883} />
        </g>
      )}

      {/* the hand-over: a person passes sheets of work to the robot */}
      {t >= 212.4 && (
        <g opacity={1 - 0.4 * aside}>
          <StickFig x={FIG.x} y={FIG.y} p={ramp(t, 212.45, 0.45)} s={1.9} lean={lean} la={[-14, -30]} ra={[30, -58]} color={INK} seed={1890} />
          <At x={BOT.x} y={BOT.y} s={2.2 * ramp(t, 212.65, 0.35, POP)}>
            <Robot p={ramp(t, 212.65, 0.6)} />
          </At>
          {passes.map(([at, d], k) => {
            const u = ramp(t, at, d, INOUT);
            if (t < at) return null;
            const x = interpolate(u, [0, 1], [FIG.x + 62, BOT.x + 132]);
            const y = interpolate(u, [0, 1], [FIG.y - 112, BOT.y + 24 - k * 11]) - Math.sin(u * Math.PI) * 150;
            return (
              <g key={k} transform={`translate(${x} ${y}) rotate(${-10 + 14 * u})`}>
                <rect x={-30} y={-38} width={60} height={76} fill={PAPER} />
                <Sk pts={rectPts(-30, -38, 60, 76, 1895 + k)} w={3.4} color={INK} seed={1895 + k} ghost={false} amp={1.2} />
                {[0, 1, 2].map((j) => (
                  <Sk key={j} pts={linePts(-18, -18 + j * 16, 18, -18 + j * 16, 1900 + k * 3 + j, 0.02, 3)} w={2.6} color={PENCIL} seed={1900 + k * 3 + j} ghost={false} amp={1} />
                ))}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};

// ---------- region 3: the limits pad, the sidebar chat, the broken cause arrow ----------
const PAD = { x: 6250, y: 950, w: 680, h: 1000 };
const ROWS = [800, 960];

// New piece: LimitsPad, a spiral notepad that slides in and ticks off its items as they're said.
const LimitsPad: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 223.72, 0.8, Easing.out(Easing.poly(4)));
  const dx = 1150 * (1 - e);
  const rot = 4 * (1 - e) - 1.2;
  const L = PAD.x - PAD.w / 2;
  const T = PAD.y - PAD.h / 2;
  const items = [
    { text: "52 people", at: 226.0, tick: 226.62 },
    { text: "quiz right after", at: 227.9, tick: 229.0 },
  ];
  return (
    <g transform={`translate(${dx} 0) rotate(${rot} ${PAD.x} ${PAD.y})`}>
      <rect x={L + 10} y={T + 16} width={PAD.w} height={PAD.h} rx={10} fill={INK} opacity={0.06} />
      <rect x={L} y={T} width={PAD.w} height={PAD.h} rx={10} fill={PAPER} />
      <Sk pts={rectPts(L, T, PAD.w, PAD.h, 2001)} w={5} color={INK} seed={2001} />
      {Array.from({ length: 9 }, (_, k) => (
        <Sk key={k} pts={ellPts(L + 70 + k * 67, T, 13, 24, 2010 + k)} w={4} color={INK} seed={2010 + k} ghost={false} />
      ))}
      <Hand x={PAD.x} y={T + 128} text="the limits" size={76} color={INK} p={wr(t, 224.3, "the limits")} />
      <Sk pts={linePts(PAD.x - 170, T + 150, PAD.x + 170, T + 146, 2020, 0.02, 8)} p={ramp(t, 224.9, 0.4)} w={4.5} color={INK} seed={2020} />
      {[...ROWS, 1120, 1280].map((y, k) => (
        <Sk key={k} pts={linePts(L + 50, y + 22, L + PAD.w - 50, y + 22, 2030 + k, 0.004, 10)} w={2.4} color={DOT} seed={2030 + k} ghost={false} amp={1} />
      ))}
      {items.map((it, k) => (
        <g key={k}>
          <Sk pts={rectPts(L + 70, ROWS[k]! - 40, 42, 42, 2040 + k)} p={ramp(t, it.at - 0.15, 0.3)} w={4} color={INK} seed={2040 + k} ghost={false} />
          <Hand x={L + 140} y={ROWS[k]!} text={it.text} size={60} anchor="start" color={INK} p={wr(t, it.at, it.text)} />
          <Sk pts={[[L + 74, ROWS[k]! - 22], [L + 92, ROWS[k]! - 2], [L + 126, ROWS[k]! - 60]]} p={ramp(t, it.tick, 0.25)} w={6} color={INK} seed={2045 + k} amp={1.2} />
        </g>
      ))}
    </g>
  );
};

const WIN = { x: 6100, y: 2080, w: 440, h: 290 };
const ABOT = { x: 6560, y: 2090 };

// New piece: SidebarChat, an editor window whose chat sidebar slides open beside the code.
const SidebarChat: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 229.75, 0.5);
  const side = ramp(t, 230.82, 0.4, Easing.out(Easing.back(1.4)));
  const L = WIN.x - WIN.w / 2;
  const T = WIN.y - WIN.h / 2;
  const divX = L + WIN.w - 160 * side;
  const code = [220, 160, 250, 120, 190];
  return (
    <g>
      <rect x={L} y={T} width={WIN.w} height={WIN.h} rx={12} fill={PAPER} opacity={p > 0 ? 1 : 0} />
      <Sk pts={rectPts(L, T, WIN.w, WIN.h, 2101)} p={p} w={4.5} color={INK} seed={2101} />
      <Sk pts={linePts(L, T + 44, L + WIN.w, T + 44, 2102, 0.01, 6)} p={ramp(t, 229.95, 0.3)} w={3.6} color={INK} seed={2102} ghost={false} />
      {[0, 1, 2].map((k) => (
        <Sk key={k} pts={ellPts(L + 26 + k * 24, T + 22, 6, 6, 2103 + k)} p={ramp(t, 230.0, 0.2)} w={3} color={PENCIL} seed={2103 + k} ghost={false} />
      ))}
      {code.map((len, k) => (
        <Sk key={k} pts={linePts(L + 28 + (k % 2) * 26, T + 82 + k * 40, Math.min(L + 28 + len, divX - 22), T + 82 + k * 40, 2110 + k, 0.01, 5)} p={ramp(t, 230.1 + k * 0.08, 0.25)} w={4} color={k === 2 ? PENCIL : INK} seed={2110 + k} ghost={false} />
      ))}
      {side > 0 && (
        <g>
          <rect x={divX} y={T + 46} width={L + WIN.w - divX - 3} height={WIN.h - 49} fill={PAPER} />
          <Sk pts={linePts(divX, T + 44, divX, T + WIN.h, 2120, 0.01, 5)} w={4} color={INK} seed={2120} ghost={false} />
          {[0, 1, 2].map((k) => {
            const b = ramp(t, 231.0 + k * 0.16, 0.3, POP);
            return b > 0 ? (
              <At key={k} x={divX + 80 + (k % 2 ? 10 : -6)} y={T + 92 + k * 62} s={b}>
                <Sk pts={blobPts(0, 0, 112, 40, 2121 + k)} w={3.4} color={k % 2 ? PENCIL : INK} seed={2121 + k} ghost={false} />
              </At>
            ) : null;
          })}
        </g>
      )}
      <Hand x={WIN.x} y={T - 44} text="sidebar assistant" size={56} color={INK} p={wr(t, 230.9, "sidebar assistant")} />
      {/* not an agent like Claude Code */}
      <At x={ABOT.x} y={ABOT.y} s={1.7 * ramp(t, 232.3, 0.35, POP)}>
        <Robot p={ramp(t, 232.3, 0.6)} />
      </At>
      <Sk pts={linePts(ABOT.x - 82, ABOT.y - 104, ABOT.x + 82, ABOT.y + 70, 2130, 0.04, 6)} p={ramp(t, 232.85, 0.18)} w={7} color={INK} seed={2130} />
      <Sk pts={linePts(ABOT.x + 82, ABOT.y - 104, ABOT.x - 82, ABOT.y + 70, 2131, 0.04, 6)} p={ramp(t, 233.05, 0.18)} w={7} color={INK} seed={2131} />
      <Hand x={ABOT.x} y={ABOT.y + 150} text="not an agent" size={56} color={INK} p={wr(t, 232.5, "not an agent")} />
      <Hand x={ABOT.x + 60} y={ABOT.y - 158} text="(what I use)" size={46} color={PENCIL} rotate={-4} p={wr(t, 234.85, "(what I use)")} />
      <Sk pts={curvePts(ABOT.x + 150, ABOT.y - 138, ABOT.x + 150, ABOT.y - 100, ABOT.x + 96, ABOT.y - 76, 8)} p={ramp(t, 235.4, 0.3)} w={3.6} color={PENCIL} seed={2132} head />
    </g>
  );
};

const ARW = { x1: 4290, x2: 4910, y: 2160, mid: 4600 };

// New piece: BrokenCause, an arrow from "how they used it" to "the scores" that cracks in the middle.
const BrokenCause: FC = () => {
  const { t } = useTime();
  const draw = ramp(t, 237.35, 1.1, INOUT);
  const brk = ramp(t, 239.5, 0.45, Easing.out(Easing.back(2)));
  const o = 1 - ramp(t, 244.9, 0.4, Easing.in(Easing.cubic));
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      {/* left: a person and the AI, i.e. how it was used */}
      <StickFig x={ARW.x1 - 190} y={ARW.y + 56} p={ramp(t, 236.4, 0.4)} s={1.05} la={[-14, -30]} ra={[26, -48]} color={INK} seed={2201} />
      <At x={ARW.x1 - 82} y={ARW.y + 14} s={1.05 * ramp(t, 236.5, 0.3, POP)}>
        <Robot p={ramp(t, 236.5, 0.5)} />
      </At>
      {/* right: the scores */}
      {[[-26, 70, PENCIL], [26, 130, INK]].map(([dx, h, col], k) => (
        <Sk key={k} pts={rectPts(ARW.x2 + 110 + (dx as number) - 20, ARW.y + 62 - (h as number), 40, h as number, 2210 + k)} p={ramp(t, 236.55 + k * 0.1, 0.35)} w={4} color={col as string} seed={2210 + k} ghost={false} />
      ))}
      <Sk pts={linePts(ARW.x2 + 62, ARW.y + 64, ARW.x2 + 168, ARW.y + 64, 2212, 0.01, 4)} p={ramp(t, 236.5, 0.3)} w={4} color={INK} seed={2212} ghost={false} />
      {/* the arrow, in two halves that droop apart when it breaks */}
      <g transform={`rotate(${9 * brk} ${ARW.x1} ${ARW.y})`}>
        <Sk pts={linePts(ARW.x1, ARW.y, ARW.mid - 10 * brk, ARW.y, 2220, 0.02, 8)} p={seg(draw, 0, 2)} w={6} color={INK} seed={2220} />
      </g>
      <g transform={`rotate(${-9 * brk} ${ARW.x2} ${ARW.y})`}>
        <Sk pts={linePts(ARW.mid + 10 * brk, ARW.y, ARW.x2, ARW.y, 2221, 0.02, 8)} p={seg(draw, 1, 2)} w={6} color={INK} seed={2221} head />
      </g>
      {brk > 0 && (
        <g opacity={clamp01(brk * 2)}>
          <Sk pts={[[ARW.mid - 6, ARW.y - 52], [ARW.mid + 10, ARW.y - 22], [ARW.mid - 10, ARW.y + 2], [ARW.mid + 8, ARW.y + 30], [ARW.mid - 4, ARW.y + 56]]} w={3.6} color={PENCIL} seed={2222} amp={1} ghost={false} />
          {[-0.9, 0, 0.9].map((a, k) => (
            <Sk key={k} pts={linePts(ARW.mid + Math.sin(a) * 40, ARW.y - 70 - Math.cos(a) * 6, ARW.mid + Math.sin(a) * 62, ARW.y - 96 - Math.cos(a) * 10, 2225 + k, 0.03, 2)} w={3.6} color={PENCIL} seed={2225 + k} ghost={false} />
          ))}
        </g>
      )}
      <Hand x={ARW.mid} y={ARW.y + 200} text="can't prove cause" size={60} color={INK} p={wr(t, 237.0, "can't prove cause")} />
    </g>
  );
};

// ---------- region 4: the robot and the pencil, then the folder that gets stamped again ----------
const BOTB = { x: 4330, y: 2690 };
const PEN = { x: 4820, y: 2690 };
const FOLD = { x: 5480, y: 2560, w: 440, h: 290 };
const USE = { y: 2950, x0: 4248 };

// New piece: StandingPencil, the creator's pencil standing upright beside the robot.
const StandingPencil: FC<{ p: number }> = ({ p }) => (
  <g>
    <polygon points="-28,-140 28,-140 28,100 0,160 -28,100" fill={PAPER} opacity={p > 0 ? 1 : 0} />
    <Sk pts={dense([[-28, 100], [-28, -140], [28, -140], [28, 100]])} p={seg(p, 0, 2)} w={4.5} color={INK} seed={2301} amp={1} />
    <Sk pts={dense([[-28, 100], [0, 160], [28, 100]], 3)} p={seg(p, 1, 2)} w={4.5} color={INK} seed={2302} amp={0.8} ghost={false} />
    <polygon points="-7,145 7,145 0,160" fill={INK} opacity={seg(p, 1, 2)} />
    <Sk pts={linePts(0, -120, 0, 86, 2303, 0.01, 6)} p={seg(p, 1, 2)} w={2.6} color={PENCIL} seed={2303} ghost={false} />
    {[-112, -96].map((y, k) => (
      <Sk key={k} pts={linePts(-28, y, 28, y, 2304 + k, 0.02, 3)} p={seg(p, 1, 2)} w={3.4} color={INK} seed={2304 + k} ghost={false} />
    ))}
    {[0, 1, 2].map((k) => (
      <Sk key={k} pts={linePts(-22 + k * 16, -136, -14 + k * 16, -118, 2310 + k, 0.02, 2)} p={seg(p, 1, 2)} w={2.6} color={PENCIL} seed={2310 + k} ghost={false} />
    ))}
  </g>
);

// New piece: ProjectFolder, a project folder with sheets peeking out and a ticked tab; tilts when it's contradicted.
const ProjectFolder: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 245.5, 0.6);
  if (p <= 0) return null;
  const sheets = ramp(t, 247.85, 0.5, Easing.out(Easing.back(1.6)));
  const tilt = -9 * ramp(t, 250.33, 0.5, Easing.out(Easing.back(2.2)));
  const hop = -26 * Math.sin(Math.PI * ramp(t, 250.33, 0.4));
  const { w, h } = FOLD;
  return (
    <g transform={`translate(${FOLD.x} ${FOLD.y + hop}) rotate(${tilt} ${-w / 2} ${h / 2})`}>
      <path d={`M${-w / 2},${-h / 2} L${-w / 2},${-h / 2 - 34} L${-w / 2 + 140},${-h / 2 - 34} L${-w / 2 + 166},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill={PAPER} />
      <Sk pts={dense([[-w / 2, h / 2], [-w / 2, -h / 2 - 34], [-w / 2 + 140, -h / 2 - 34], [-w / 2 + 166, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2 + 30, h / 2]])} p={seg(p, 0, 2)} w={5} color={INK} seed={2401} amp={1.6} />
      {[0, 1].map((k) => (
        <g key={k} transform={`translate(${-20 + k * 40} ${-48 * sheets - k * 8})`}>
          <rect x={-30} y={-h / 2 + 6} width={230} height={140} fill={PAPER} />
          <Sk pts={rectPts(-30, -h / 2 + 6, 230, 140, 2410 + k)} p={sheets} w={3.4} color={INK} seed={2410 + k} ghost={false} />
          {[0, 1].map((j) => (
            <Sk key={j} pts={linePts(-6, -h / 2 + 34 + j * 22, 160 - j * 40, -h / 2 + 34 + j * 22, 2415 + k * 2 + j, 0.02, 4)} p={sheets} w={2.6} color={PENCIL} seed={2415 + k * 2 + j} ghost={false} />
          ))}
        </g>
      ))}
      <path d={`M${-w / 2},${-h / 2 + 44} L${w / 2},${-h / 2 + 44} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill={PAPER} />
      <Sk pts={dense([[-w / 2, -h / 2 + 44], [w / 2, -h / 2 + 44], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2 + 44], [-w / 2 + 40, -h / 2 + 42]])} p={seg(p, 1, 2)} w={5} color={INK} seed={2420} amp={1.6} />
      <Sk pts={[[-w / 2 + 52, -h / 2 - 18], [-w / 2 + 68, -h / 2 - 4], [-w / 2 + 96, -h / 2 - 32]]} p={ramp(t, 248.55, 0.25)} w={5} color={INK} seed={2425} amp={1} />
      <Stamp x={0} y={56} text="MADE BY AGENTS" at={249.3} w={392} size={46} seed={2430} />
    </g>
  );
};

const Closing: FC = () => {
  const { t } = useTime();
  const worse = ramp(t, 241.7, 0.35);
  return (
    <g>
      <At x={PEN.x} y={PEN.y} s={ramp(t, 240.75, 0.35, POP)} r={4}>
        <StandingPencil p={ramp(t, 240.75, 0.6)} />
      </At>
      <At x={BOTB.x} y={BOTB.y} s={2.4 * ramp(t, 241.3, 0.35, POP)}>
        <Robot p={ramp(t, 241.3, 0.6)} />
      </At>
      {/* "not saying AI makes you worse": a down arrow, struck out */}
      <Sk pts={linePts(BOTB.x - 170, BOTB.y - 70, BOTB.x - 170, BOTB.y + 80, 2501, 0.03, 5)} p={worse} w={5} color={PENCIL} seed={2501} head />
      <Sk pts={linePts(BOTB.x - 218, BOTB.y + 30, BOTB.x - 122, BOTB.y - 20, 2502, 0.03, 4)} p={ramp(t, 242.02, 0.2)} w={6} color={INK} seed={2502} />
      <Hand x={USE.x0} y={USE.y} text="how you use it" size={74} anchor="start" color={INK} p={wr(t, 242.88, "how you use it")} />
      <Hand x={USE.x0 + 384} y={USE.y} text="matters" size={74} anchor="start" color={INK} p={wr(t, 244.3, "matters")} />
      <Sk pts={curvePts(USE.x0 - 6, USE.y + 22, USE.x0 + 190, USE.y + 12, USE.x0 + 372, USE.y + 24, 12)} p={ramp(t, 244.0, 0.45, INOUT)} w={7} color={ACCENT} seed={2503} ghost={false} />
      <ProjectFolder />
      <Hand x={FOLD.x + 80} y={FOLD.y - 232} text="(uncomfortable)" size={50} color={PENCIL} rotate={-4} p={wr(t, 246.5, "(uncomfortable)")} opacity={1 - ramp(t, 250.0, 0.3)} />
    </g>
  );
};

// ---------- the shot list: every move lands on a spoken word ----------
// A view by centre and scale (fill 1 of a frame-sized rect), so each framing is exact.
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });
const SHOTS: Shot[] = [
  // 1 "ran a trial on exactly this": mcu on the clipboard, creeping in as it flips open.
  { at: START, ...V(1100, 1000, 0.98) },
  { at: START, ...V(1100, 990, 1.14), move: "push", dur: 1.9 },
  // 2 "52 engineers, mostly juniors": pull back wide as the crowd draws on.
  { at: 177.42, ...V(1880, 880, 0.82), move: "pull", dur: 1.0 },
  // 3 "learned a new Python library called Trio": push onto the book.
  { at: 179.68, ...V(2630, 795, 1.45), move: "push", dur: 0.9 },
  // 4 "Some had an AI assistant. Some coded by hand": glide down to the two groups.
  { at: 182.82, ...V(2500, 1700, 1.2), move: "glide", dur: 0.8 },
  // 5 "Then everyone took a quiz": glide wider to take in the quiz sheet.
  { at: 186.6, ...V(2850, 1720, 0.95), move: "glide", dur: 0.8 },
  // 6 "Disclosure first": hard cut to the clipboard, the sticky note slaps on; slow creep while it's read.
  { at: 189.12, ...V(1060, 1010, 1.0), move: "cut" },
  { at: 189.4, ...V(1075, 1000, 1.07), move: "push", dur: 5.6 },
  // 7 "The AI group averaged 50%": out across the page, push onto the AI column (the note stays as a lower third).
  { at: 195.55, ...V(2700, 960, 0.55), move: "glide", dur: 0.6 },
  { at: 195.95, ...V(4300, 920, 1.0), move: "push", dur: 0.9 },
  // 8 "The hand coding group, 67%": glide to take both columns in.
  { at: 199.35, ...V(4560, 900, 0.85), move: "glide", dur: 0.8 },
  // 9 "The biggest gap was on debugging": push onto the bracket.
  { at: 201.9, ...V(4545, 760, 1.7), move: "push", dur: 0.8 },
  // 10 "about 2 minutes faster": pull back onto the stopwatch and the AI column.
  { at: 204.0, ...V(3980, 900, 1.35), move: "pull", dur: 1.0 },
  // 11 "Here's the part that matters to me": whip out wide as the bars shake loose.
  { at: 209.2, ...V(4800, 900, 0.72), move: "whip", dur: 0.32 },
  // 12 "handed the work to the AI": push onto the grey column and the hand-over.
  { at: 210.9, ...V(4470, 1060, 1.3), move: "push", dur: 1.0 },
  // 13 "asked conceptual questions": glide to the coral column under its bubbles.
  { at: 217.25, ...V(5650, 680, 1.35), move: "glide", dur: 0.8 },
  // 14 "Now the limits": pull wide as the pad slides in and the chart moves aside.
  { at: 223.6, ...V(5150, 950, 0.6), move: "pull", dur: 1.2 },
  // 15 "Small sample, and a quiz straight after": push onto the pad.
  { at: 225.85, ...V(6250, 820, 1.1), move: "push", dur: 1.0 },
  // 16 "a sidebar chat, not an agent": glide down to the window and the crossed-out robot.
  { at: 229.45, ...V(6320, 2050, 1.55), move: "glide", dur: 0.85 },
  // 17 "the study can't prove": hard cut to the cause arrow.
  { at: 236.2, ...V(4600, 2180, 1.25), move: "cut" },
  // 18 "So I'm not saying AI makes you worse": pull back to the robot and the pencil.
  { at: 240.5, ...V(4600, 2470, 0.95), move: "pull", dur: 1.1 },
  // 19 "most of what I finish is made by agents": push onto the folder, then ease out on "contradicting myself".
  { at: 245.4, ...V(5480, 2540, 1.65), move: "push", dur: 1.0 },
  { at: 250.3, ...V(4930, 2640, 1.0), move: "pull", dur: 1.1 },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

// New piece: DisclosureNote, a sticky note slapped onto the clipboard's corner that stays in the lower third (screen space) until the first result is in.
const NOTE = { x: 1440, y: 846, w: 560, h: 230 };
const DisclosureNote: FC = () => {
  const { t } = useTime();
  if (t < 189.12 || t > 199.8) return null;
  const slap = ramp(t, 189.12, 0.18, Easing.out(Easing.quad));
  const peel = ramp(t, 199.15, 0.5, Easing.in(Easing.cubic));
  const s = 1.45 - 0.45 * slap;
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <g transform={`translate(${NOTE.x + 120 * peel} ${NOTE.y + 420 * peel * peel}) rotate(${-4 + 28 * peel}) scale(${s})`} opacity={clamp01(slap * 2) * (1 - peel)}>
        <rect x={-NOTE.w / 2 + 10} y={-NOTE.h / 2 + 14} width={NOTE.w} height={NOTE.h} fill={INK} opacity={0.1 * slap} />
        <rect x={-NOTE.w / 2} y={-NOTE.h / 2} width={NOTE.w} height={NOTE.h} fill={PAPER} />
        <rect x={-NOTE.w / 2} y={-NOTE.h / 2} width={NOTE.w} height={NOTE.h} fill={ACCENT} opacity={0.14} />
        <Sk pts={rectPts(-NOTE.w / 2, -NOTE.h / 2, NOTE.w, NOTE.h, 2601)} w={3.6} color={INK} seed={2601} />
        <rect x={-70} y={-NOTE.h / 2 - 18} width={140} height={36} fill={PENCIL} opacity={0.3} transform="rotate(3)" />
        <Hand x={0} y={-14} text="Anthropic study." size={56} color={INK} p={wr(t, 190.42, "Anthropic study.")} />
        <Hand x={0} y={66} text="I use their product." size={56} color={INK} p={wr(t, 192.5, "I use their product.")} />
      </g>
    </svg>
  );
};

const Beat04: FC = () => {
  const { t } = useTime();
  // Half a frame of slack: the beat clip's first frame is START rounded to the frame grid, which can land just before START.
  if (t < START - 1 / 60 || t >= END) return null;
  // Small camera kicks on the two slaps (sticky note, stamp), outside the rig so they never fight the shot list.
  const kick = (at: number) => (t >= at && t < at + 0.5 ? Math.exp(-(t - at) * 12) * Math.sin((t - at) * 70) * 7 : 0);
  const k = kick(189.22) + kick(249.42);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{ transform: `translate(${k}px, ${-k * 0.6}px)` }}>
        <Camera world={WORLD} shots={SHOTS} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
          <Layer depth={1}>
            <PageWorld />
            <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              {t < 196.6 && (
                <>
                  <FlipClipboard />
                  <TinyScale x={1700} y={820} at={193.72} />
                  <Crowd />
                  <DropBook />
                  {t >= 182.9 && <Groups />}
                  <QuizSheet />
                </>
              )}
              {t >= 195.4 && t < 230.6 && <Chart />}
              {t >= 223.6 && t < 236.2 && <LimitsPad />}
              {t >= 229.6 && t < 236.2 && <SidebarChat />}
              {t >= 236.2 && <BrokenCause />}
              {t >= 240.5 && <Closing />}
            </svg>
          </Layer>
        </Camera>
        <DisclosureNote />
      </AbsoluteFill>
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}22 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default Beat04;
