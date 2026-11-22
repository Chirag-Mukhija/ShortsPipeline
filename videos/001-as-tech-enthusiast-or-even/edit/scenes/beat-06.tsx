// Video 001, Beat 6 (4:53–6:11): the chain splits into tool names (scribbled out) and the thinking that held it together (coral), then the practice study's bars, the press clipping, the study-techniques page and the 64% laptop, diving into the docs book.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, fade, ramp, seg, useTime, type Rect, type Shot } from "@library/core";
import {
  At, CloudBoxes, GRAIN, Hand, NodeView, Packet, Robot, Sk, blobPts, curvePts, ellPts, linePts, rectPts, wr,
  type NodeLook, type P,
} from "@library/themes/hand-drawn";
import { NODES } from "./shared";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL, sans: SANS } = STYLE;

const START = 293.49;
const END = 371.33;
const WORLD = { w: 8400, h: 3300 };

// A polyline with in-between points, so the stroke's smoothing keeps sharp corners instead of looping round them.
const dense = (pts: P[], n = 4): P[] => [
  ...pts.slice(1).flatMap((b, i) => {
    const a = pts[i]!;
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as P);
  }),
  pts[pts.length - 1]!,
];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
// Numbers in the clean sans, as plain text: Hand's write-on clip guesses widths for handwriting and nicks wide figures.
const Num: FC<{ x: number; y: number; text: string; size: number; color?: string; opacity?: number }> = ({ x, y, text, size, color = INK, opacity = 1 }) =>
  opacity <= 0 ? null : (
    <text x={x} y={y} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={size} fill={color} opacity={opacity} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </text>
  );
// Write-on progress that follows the voice: [time, fraction of the text] keys from the narration's word starts.
const along = (t: number, keys: [number, number][]) =>
  interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ================= region A: the chain splits into tool names and the thinking under them =================
const CH = { dx: 440, dy: 320 };
const CHAIN = NODES.map((n) => ({ ...n, x: n.x + CH.dx, y: n.y + CH.dy }));
// Where each tool-name link lands in the left pile (x, y, tilt).
const PILE: [number, number, number][] = [[730, 800, -4], [1080, 825, 3], [735, 1035, 2], [1085, 1060, -3], [730, 1270, -2], [1080, 1290, 4]];
const T_SPLIT = 295.5;
const T_SCRIB = 299.25;
// The skills pile: the joining rings hang from a nail as one vertical chain.
const RP = { x: 2130, y0: 650, step: 74 };

// New piece: ScribbleOut, a fast zigzag crossing out whatever box it sits on.
const ScribbleOut: FC<{ w: number; h: number; p: number; seed: number }> = ({ w, h, p, seed }) => {
  const n = 9;
  const pts: P[] = Array.from({ length: n + 1 }, (_, j) => [-w / 2 + (w * j) / n, j % 2 ? h / 2 : -h / 2] as P);
  return <Sk pts={pts} p={p} w={5.5} color={INK} seed={seed} amp={3.2} ghost={false} />;
};

const ToolPile: FC = () => {
  const { t } = useTime();
  return (
    <g>
      {CHAIN.map((n, i) => {
        const u = ramp(t, T_SPLIT + i * 0.07, 0.85, INOUT);
        const [px, py, pr] = PILE[i]!;
        const x = lerp(n.x, px, u);
        const y = lerp(n.y, py, u) - Math.sin(Math.PI * u) * 110;
        const at = T_SCRIB + i * 0.17;
        const look: NodeLook = {
          draw: ramp(t, 293.2 + i * 0.07, 0.45, INOUT),
          label: [ramp(t, 293.4 + i * 0.07, 0.35), ramp(t, 293.5 + i * 0.07, 0.35)],
          ink: 1 - 0.62 * ramp(t, at + 0.25, 0.4),
          bold: 0,
        };
        // A small hop when the scribble hits it.
        const hop = -10 * Math.sin(Math.PI * ramp(t, at, 0.22));
        return (
          <g key={n.seed} transform={`translate(${x} ${y + hop}) rotate(${pr * u}) scale(${1 + 0.3 * u})`}>
            <NodeView n={{ ...n, x: 0, y: 0 }} look={look} />
            <ScribbleOut w={196} h={88} p={ramp(t, at, 0.22, Easing.linear)} seed={3100 + i} />
          </g>
        );
      })}
      <Hand x={905} y={650} text="Tool names" size={88} color={INK} p={wr(t, 298.48, "Tool names")} />
    </g>
  );
};

// The rings that joined the links: they leave the chain and hang as the skills pile, then redraw in coral.
const SkillChain: FC = () => {
  const { t } = useTime();
  const sway = 2.4 * Math.sin((t - 296.4) * 2.3) * Math.exp(-Math.max(0, t - 296.4) * 0.7) + 0.7 * Math.sin(t * 1.3);
  const settled = ramp(t, 296.2, 0.3);
  return (
    <g>
      {/* the straight bits of each joint snap and vanish when the chain splits */}
      {CHAIN.slice(1).map((b, i) => {
        const a = CHAIN[i]!;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const o = 1 - ramp(t, T_SPLIT - 0.05, 0.15);
        const p = ramp(t, 293.3 + i * 0.07, 0.35);
        return o > 0 ? (
          <g key={i} opacity={o}>
            <Sk pts={linePts(a.x + 111, a.y + 4, mx - 27, my, 3200 + i, 0.15, 4)} p={p} w={3.6} color={INK} seed={3200 + i} />
            <Sk pts={linePts(mx + 27, my, b.x - 111, b.y + 4, 3210 + i, 0.15, 4)} p={p} w={3.6} color={INK} seed={3210 + i} />
          </g>
        ) : null;
      })}
      {/* the nail it hangs from */}
      <g opacity={settled}>
        <Sk pts={ellPts(RP.x, RP.y0 - 64, 9, 9, 3220)} w={4} color={INK} seed={3220} ghost={false} />
        <Sk pts={linePts(RP.x - 26, RP.y0 - 78, RP.x + 26, RP.y0 - 80, 3221, 0.05, 3)} w={3} color={PENCIL} seed={3221} ghost={false} />
      </g>
      <g transform={`rotate(${sway * settled} ${RP.x} ${RP.y0 - 64})`}>
        {Array.from({ length: 10 }, (_, k) => {
          const i = Math.floor(k / 2);
          const a = CHAIN[i]!;
          const b = CHAIN[i + 1]!;
          const mx = (a.x + b.x) / 2 + (k % 2 ? 11 : -11);
          const my = (a.y + b.y) / 2;
          const u = ramp(t, T_SPLIT + 0.05 + k * 0.045, 0.9, INOUT);
          const x = lerp(mx, RP.x, u) + Math.sin(Math.PI * u) * 60;
          const y = lerp(my, RP.y0 + k * RP.step, u) - Math.sin(Math.PI * u) * 70;
          const rx = lerp(19, k % 2 ? 12 : 34, u);
          const ry = lerp(11, 50, u);
          const c = ramp(t, 301.0 + k * 0.06, 0.32);
          const pts = ellPts(x, y, rx, ry, 3230 + k);
          return (
            <g key={k}>
              <Sk pts={pts} p={ramp(t, 293.42 + i * 0.07 + (k % 2) * 0.08, 0.3)} w={3.8 + 1.4 * c} color={INK} opacity={1 - c} seed={3230 + k} />
              {c > 0 && <Sk pts={pts} p={c} w={5.4} color={ACCENT} seed={3230 + k} />}
            </g>
          );
        })}
      </g>
    </g>
  );
};

// New piece: SplitBox, a square that breaks into four smaller ones ("break it down").
const SplitBox: FC<{ x: number; y: number; at: number; split: number }> = ({ x, y, at, split }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.35);
  const s = ramp(t, split, 0.35, Easing.out(Easing.back(2)));
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y})`}>
      {s <= 0 ? (
        <Sk pts={rectPts(-46, -46, 92, 92, 3301)} p={p} w={4.5} color={INK} seed={3301} />
      ) : (
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], k) => (
          <Sk key={k} pts={rectPts(dx! * (23 + 12 * s) - 21, dy! * (23 + 12 * s) - 21, 42, 42, 3302 + k)} w={4} color={INK} seed={3302 + k} ghost={false} />
        ))
      )}
    </g>
  );
};

// New piece: BrokenLink, one chain loop cracked in two with a pencil "?" over it ("why it broke").
const BrokenLink: FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.4);
  const gap = 8 + 10 * ramp(t, at + 0.3, 0.3, Easing.out(Easing.back(2.5)));
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(-12)`}>
      <Sk pts={curvePts(-gap, -30, -70, -34, -66, 0, 10).concat(curvePts(-66, 0, -62, 32, -gap, 30, 10).slice(1))} p={p} w={4.5} color={INK} seed={3311} />
      <Sk pts={curvePts(gap, -30, 70, -34, 66, 0, 10).concat(curvePts(66, 0, 62, 32, gap, 30, 10).slice(1))} p={p} w={4.5} color={INK} seed={3312} />
      <Sk pts={[[-2, -46], [6, -24], [-4, -6], [6, 14]]} p={ramp(t, at + 0.3, 0.2)} w={3} color={PENCIL} seed={3313} amp={1} ghost={false} />
      <Hand x={112} y={30} text="?" size={76} color={PENCIL} p={ramp(t, at + 0.45, 0.25)} />
    </g>
  );
};

// New piece: DebugScrap, the Beat 4 debugging bracket on a torn scrap, flying in and pinned to the skills pile.
const SCRAP = { x: 2600, y: 1250, w: 500, h: 250 };
const DebugScrap: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 306.85, 0.42, Easing.out(Easing.cubic));
  if (e <= 0) return null;
  const wig = 3 * Math.sin((t - 308.8) * 18) * Math.exp(-Math.max(0, t - 308.8) * 4) * (t > 308.8 ? 1 : 0);
  const x = SCRAP.x + 950 * (1 - e);
  const y = SCRAP.y - 260 * (1 - e) * (1 - e);
  const r = 4 + 26 * (1 - e) + wig;
  const pin = ramp(t, 307.27, 0.16, Easing.out(Easing.quad));
  const { w, h } = SCRAP;
  const B = 78;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-w / 2 + 10} y={-h / 2 + 14} width={w} height={h} fill={INK} opacity={0.07} />
      <path d={`M${-w / 2},${-h / 2} L${w / 2},${-h / 2 + 6} L${w / 2 - 6},${h / 2} L${w / 2 - 40},${h / 2 - 8} L${w / 2 - 90},${h / 2 + 4} L${-w / 2 + 4},${h / 2} Z`} fill={PAPER} />
      <Sk pts={dense([[-w / 2, -h / 2], [w / 2, -h / 2 + 6], [w / 2 - 6, h / 2], [w / 2 - 40, h / 2 - 8], [w / 2 - 90, h / 2 + 4], [-w / 2 + 4, h / 2], [-w / 2, -h / 2]], 3)} w={3.6} color={INK} seed={3321} amp={1.4} ghost={false} />
      {/* mini columns, the dashed level and the bracket over the gap */}
      {[[-196, 0.5, 3322], [-122, 0.67, 3323]].map(([cx, f, sd]) => (
        <g key={sd}>
          <Sk pts={rectPts(cx! - 26, B - 150, 52, 150, sd!)} w={3.2} color={PENCIL} seed={sd!} ghost={false} />
          {Array.from({ length: Math.floor((150 * f!) / 14) }, (_, k) => (
            <Sk key={k} pts={linePts(cx! - 22, B - 6 - k * 14, cx! + 22, B - 16 - k * 14, sd! * 10 + k, 0.02, 2)} w={2.6} color={INK} seed={sd! * 10 + k} ghost={false} amp={1} />
          ))}
        </g>
      ))}
      <Sk pts={linePts(-170, B - 75, -148, B - 75, 3324, 0.01, 3)} w={2.6} color={PENCIL} seed={3324} dash="5 6" />
      <Sk pts={[[-82, B - 100], [-90, B - 96], [-90, B - 90], [-98, B - 87], [-90, B - 84], [-90, B - 79], [-82, B - 75]]} w={3.6} color={INK} seed={3325} amp={0.6} ghost={false} />
      <Hand x={-40} y={-14} text="debugging" size={60} anchor="start" color={INK} p={wr(t, 307.15, "debugging")} />
      <Hand x={-40} y={58} text="gap" size={60} anchor="start" color={INK} p={wr(t, 307.55, "gap")} />
      {/* the pin */}
      {pin > 0 && (
        <g transform={`translate(0 ${-h / 2 + 18 - 40 * (1 - pin)})`} opacity={pin}>
          <circle r={17} fill={INK} />
          <Sk pts={ellPts(0, 0, 17, 17, 3326)} w={3.4} color={INK} seed={3326} ghost={false} />
          <circle cx={-5} cy={-5} r={4} fill={PAPER} opacity={0.7} />
        </g>
      )}
    </g>
  );
};

const RegionA: FC = () => {
  const { t } = useTime();
  return (
    <g>
      <SkillChain />
      <ToolPile />
      <Sk pts={linePts(1590, 600, 1600, 1300, 3330, 0.02, 10)} p={ramp(t, 296.75, 0.6, INOUT)} w={3} color={PENCIL} seed={3330} dash="4 16" />
      <Hand x={2240} y={700} text="Skills" size={96} anchor="start" color={INK} p={wr(t, 300.98, "Skills")} />
      <Hand x={2240} y={860} text="break it down" size={70} anchor="start" color={INK} p={wr(t, 303.02, "break it down")} />
      <SplitBox x={2790} y={838} at={303.3} split={303.68} />
      <Hand x={2240} y={1020} text="why it broke" size={70} anchor="start" color={INK} p={wr(t, 304.95, "why it broke")} />
      <BrokenLink x={2760} y={996} at={305.45} />
      <DebugScrap />
    </g>
  );
};

// ================= region B: "Does practice fix everything?" and the No stamp =================
const Q = { x: 820, y1: 2350, y2: 2510, qx: 1900, qy: 2400 };

// New piece: BigQuestion, an oversized pencil question mark drawn in one stroke plus its dot.
const BigQuestion: FC<{ p: number; o: number }> = ({ p, o }) => {
  const hook: P[] = [...curvePts(-80, -110, -60, -210, 30, -200, 10), ...curvePts(30, -200, 110, -170, 60, -80, 10).slice(1), ...curvePts(60, -80, 0, -40, 0, 30, 8).slice(1)];
  return (
    <g transform={`translate(${Q.qx} ${Q.qy})`} opacity={o}>
      <Sk pts={hook} p={seg(p, 0, 1.25)} w={11} color={INK} seed={3401} amp={2.6} />
      <Sk pts={ellPts(0, 100, 13, 13, 3402)} p={seg(p, 1, 1.25) * 4} w={9} color={INK} seed={3402} ghost={false} />
    </g>
  );
};

// New piece: NoStamp, a round coral rubber stamp that slams onto the question.
const NoStamp: FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.18, Easing.out(Easing.quad));
  if (e <= 0) return null;
  return (
    <At x={x} y={y} r={-14} s={1.8 - 0.8 * e} o={0.92 * e}>
      <Sk pts={ellPts(0, 0, 152, 144, 3411, 0.2, 30)} w={9} color={ACCENT} seed={3411} ghost={false} amp={3} />
      <Sk pts={ellPts(0, 0, 130, 122, 3412, 0.2, 30)} w={4} color={ACCENT} seed={3412} ghost={false} amp={3} />
      <Hand x={0} y={52} text="No." size={156} color={ACCENT} />
    </At>
  );
};

const RegionB: FC = () => {
  const { t } = useTime();
  const out = ramp(t, 312.75, 0.45);
  return (
    <g opacity={1 - out}>
      <Hand x={Q.x} y={Q.y1} text="Does practice" size={130} anchor="start" color={INK} p={along(t, [[309.82, 0], [310.15, 0.38], [310.6, 1]])} />
      <Hand x={Q.x} y={Q.y2} text="fix everything?" size={130} anchor="start" color={INK} p={along(t, [[310.55, 0], [310.82, 0.27], [311.45, 1]])} />
      <BigQuestion p={ramp(t, 309.78, 0.6, INOUT)} o={1 - 0.6 * ramp(t, 311.86, 0.2)} />
      <NoStamp x={Q.qx} y={Q.qy - 20} at={311.82} />
    </g>
  );
};

// ================= region C: the 88 studies, the five bars and the empty sixth slot, the press clipping =================
const STACK = { x: 2720, base: 2780 };
const BASE = 2780;
const COLH = 700;
const COLW = 190;

// New piece: PaperStack, sheets dropping onto a pile while a tag on top counts them.
const PaperStack: FC = () => {
  const { t } = useTime();
  const n = 14;
  const count = Math.round(88 * ramp(t, 313.12, 1.15, Easing.out(Easing.quad)));
  const top = STACK.base - 10 - n * 17;
  const tagIn = ramp(t, 313.05, 0.3, POP);
  // The tag and its labels leave as the camera heads for the bars; the pile stays as context.
  const labelsOut = 1 - ramp(t, 315.75, 0.3, Easing.in(Easing.cubic));
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const at = 313.0 + k * 0.085;
        const e = ramp(t, at, 0.2, Easing.in(Easing.quad));
        if (e <= 0) return null;
        const r = Math.sin(k * 2.3) * 2.4;
        const ox = Math.sin(k * 1.7) * 14;
        const y = STACK.base - 10 - k * 17 - 420 * (1 - e);
        return (
          <g key={k} transform={`translate(${STACK.x + ox} ${y}) rotate(${r * (2 - e)})`}>
            <rect x={-150} y={-8} width={300} height={16} fill={PAPER} />
            <Sk pts={rectPts(-150, -8, 300, 16, 3500 + k)} w={3} color={k % 3 ? INK : PENCIL} seed={3500 + k} ghost={false} amp={1.2} />
          </g>
        );
      })}
      <g opacity={labelsOut}>
      <Sk pts={linePts(STACK.x, top - 62, STACK.x, top - 8, 3520, 0.05, 3)} p={tagIn} w={3} color={PENCIL} seed={3520} dash="4 8" />
      <At x={STACK.x} y={top - 140} s={0.5 + 0.5 * tagIn} o={clamp01(tagIn * 3)}>
        <ellipse cx={0} cy={0} rx={118} ry={70} fill={PAPER} />
        <Sk pts={blobPts(0, 0, 236, 140, 3521)} w={4.5} color={INK} seed={3521} />
        <Num x={0} y={34} text={String(count)} size={96} />
      </At>
      <Hand x={STACK.x + 150} y={top - 120} text="studies" size={72} anchor="start" color={INK} p={wr(t, 314.5, "studies")} />
      <Hand x={STACK.x} y={top - 255} text="a meta-analysis" size={56} color={PENCIL} rotate={-2} p={wr(t, 313.3, "a meta-analysis")} />
      </g>
    </g>
  );
};

const Hatch: FC<{ x: number; h: number; color: string; seed: number }> = ({ x, h, color, seed }) => {
  const gap = 16;
  const n = h < 12 ? 0 : Math.floor((h - 12) / gap) + 1;
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const y = BASE - 8 - k * gap;
        return <Sk key={k} pts={linePts(x - COLW / 2 + 10, y + 1, x + COLW / 2 - 10, y - 13, seed + k, 0.02, 3)} w={3} color={color} seed={seed + k} ghost={false} amp={1.4} />;
      })}
    </>
  );
};

// New piece: ShareBar, a full-height sketched column (all the differences) whose hatching fills to the share practice explained.
const ShareBar: FC<{ x: number; draw: number; fill: number; seed: number }> = ({ x, draw, fill, seed }) => {
  if (draw <= 0) return null;
  const h = COLH * fill;
  return (
    <g>
      <rect x={x - COLW / 2} y={BASE - COLH} width={COLW} height={COLH} fill={PAPER} />
      <Hatch x={x} h={h} color={INK} seed={seed + 10} />
      {h > 1.5 && <Sk pts={linePts(x - COLW / 2, BASE - h, x + COLW / 2, BASE - h, seed + 3, 0.01, 4)} w={h < 10 ? 6 : 4.5} color={INK} seed={seed + 3} ghost={false} />}
      <Sk pts={rectPts(x - COLW / 2, BASE - COLH, COLW, COLH, seed)} p={draw} w={4.5} color={INK} seed={seed} />
    </g>
  );
};

type Bar = { x: number; label: string; v: number; at: number; drop?: boolean };
const BARS: Bar[] = [
  { x: 3370, label: "games", v: 0.26, at: 316.1 },
  { x: 3700, label: "music", v: 0.21, at: 320.08 },
  { x: 4030, label: "sports", v: 0.18, at: 321.45 },
  { x: 4360, label: "education", v: 0.04, at: 323.05, drop: true },
  { x: 4690, label: "professions", v: 0.007, at: 324.6, drop: true },
];
const SLOT = { x: 5020 };
// The last two bars first rise to the sports level, then shrink to their own share.
const fillOf = (b: Bar, t: number) =>
  b.drop ? 0.18 * ramp(t, b.at, 0.22) - (0.18 - b.v) * ramp(t, b.at + 0.24, 0.42, Easing.out(Easing.back(1.4))) : b.v * ramp(t, b.at, 0.45, INOUT);

const ChartC: FC = () => {
  const { t } = useTime();
  const dim = 1 - 0.55 * ramp(t, 331.45, 0.4);
  const slotP = ramp(t, 326.6, 0.6);
  // The chart's words clear when the clipping lands, so nothing half-read pokes out from under it.
  const txt = 1 - ramp(t, 331.45, 0.35);
  return (
    <g opacity={dim}>
      <Sk pts={linePts(3190, BASE, 5220, BASE, 3600, 0.003, 30)} p={ramp(t, 315.2, 0.6)} w={4} color={INK} seed={3600} ghost={false} />
      <Hand x={3280} y={2030} text="explained by practice" size={54} anchor="start" color={PENCIL} rotate={-1.5} p={wr(t, 315.55, "explained by practice")} opacity={txt} />
      {BARS.map((b, i) => {
        const f = Math.max(0, fillOf(b, t));
        const h = COLH * f;
        const numO = b.drop ? ramp(t, b.at + 0.55, 0.2) : f > 0.01 ? 1 : 0;
        const num = b.drop ? (b.v < 0.01 ? "1%" : `${Math.round(b.v * 100)}%`) : `${Math.round(f * 100)}%`;
        return (
          <g key={b.label}>
            <ShareBar x={b.x} draw={ramp(t, 315.3 + i * 0.08, 0.45)} fill={f} seed={3610 + i * 40} />
            <Hand x={b.x} y={BASE + 76} text={b.label} size={56} color={INK} p={wr(t, b.at + 0.05, b.label)} opacity={txt} />
            {numO > 0 && <Num x={b.x} y={BASE - h - 26} text={num} size={64} opacity={numO * txt} />}
            {b.v < 0.01 && <Hand x={b.x} y={BASE - h - 96} text="under" size={46} color={PENCIL} p={wr(t, b.at + 0.4, "under")} opacity={txt} />}
          </g>
        );
      })}
      {/* the sports level carries on as a dashed guide, so the last two visibly shrink below it */}
      <Sk pts={linePts(4030 + COLW / 2, BASE - COLH * 0.18, 4690 + COLW / 2 + 20, BASE - COLH * 0.18, 3800, 0.005, 10)} p={ramp(t, 322.85, 0.5)} w={2.6} color={PENCIL} seed={3800} dash="6 10" />
      {/* the empty sixth slot: software engineering was never measured */}
      {slotP > 0 && (
        <g>
          <Sk pts={rectPts(SLOT.x - COLW / 2, BASE - COLH, COLW, COLH, 3810)} p={slotP} w={3.6} color={PENCIL} seed={3810} dash="14 12" />
          <Hand x={SLOT.x} y={BASE - COLH / 2 + 40} text="?" size={130} color={PENCIL} p={ramp(t, 328.4, 0.3)} />
          <Hand x={SLOT.x} y={BASE + 76} text="software" size={56} color={INK} p={wr(t, 326.75, "software")} opacity={txt} />
          <Hand x={SLOT.x} y={BASE + 134} text="engineering" size={56} color={INK} p={wr(t, 326.95, "engineering")} opacity={txt} />
          <Hand x={SLOT.x} y={2030} text="not included" size={58} color={INK} p={wr(t, 327.3, "not included")} opacity={txt} />
          <Sk pts={curvePts(SLOT.x - 150, 2052, SLOT.x, 2042, SLOT.x + 150, 2054, 10)} p={ramp(t, 328.0, 0.45, INOUT)} w={6} color={ACCENT} seed={3811} ghost={false} opacity={txt} />
        </g>
      )}
    </g>
  );
};

// New piece: PressClipping, a torn news clipping that drops in over the chart and gets taped down.
const CL = { x: 4200, y: 2400, w: 1240, h: 700 };
const PressClipping: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 331.45, 0.5, Easing.out(Easing.back(1.25)));
  if (e <= 0) return null;
  const { w, h } = CL;
  const L = -w / 2;
  const T = -h / 2;
  const torn: P[] = Array.from({ length: 25 }, (_, k) => [L + (w * k) / 24, h / 2 + (k % 2 ? 9 : -7) + Math.sin(k * 1.9) * 5] as P);
  const tape = ramp(t, 331.95, 0.18);
  const magicStrike = ramp(t, 340.32, 0.22);
  return (
    <g transform={`translate(${CL.x} ${CL.y - 900 * (1 - e)}) rotate(${-2 - 10 * (1 - e)})`}>
      <rect x={L + 14} y={T + 18} width={w} height={h} fill={INK} opacity={0.08} />
      <path d={`M${L},${T} L${-L},${T} ${torn.slice().reverse().map(([x, y]) => `L${x},${y}`).join(" ")} Z`} fill={PAPER} />
      <Sk pts={dense([[L, h / 2], [L, T], [-L, T], [-L, h / 2]], 5)} w={4} color={INK} seed={3901} amp={1.4} />
      <Sk pts={torn} w={3} color={INK} seed={3902} amp={1} ghost={false} />
      {/* tape at the two top corners */}
      {[[L + 60, -18], [-L - 60, 16]].map(([x, r], k) => (
        <rect key={k} x={x! - 75} y={T - 22} width={150} height={44} fill={PENCIL} opacity={0.3 * tape} transform={`rotate(${r} ${x} ${T})`} />
      ))}
      <Hand x={L + 60} y={T + 80} text="press release" size={52} anchor="start" color={PENCIL} p={wr(t, 331.9, "press release")} />
      {[0, 1].map((k) => (
        <Sk key={k} pts={linePts(-140, T + 52 + k * 34, 560 - k * 120, T + 52 + k * 34, 3910 + k, 0.004, 8)} p={ramp(t, 332.45 + k * 0.25, 0.5)} w={3} color={DOT} seed={3910 + k} ghost={false} amp={1} />
      ))}
      <Hand x={L + 60} y={T + 210} text="Not perfect," size={86} anchor="start" color={INK} p={wr(t, 334.35, "Not perfect,")} />
      <Hand x={L + 60} y={T + 320} text="but almost everyone" size={86} anchor="start" color={INK} p={wr(t, 336.05, "but almost everyone")} />
      <Hand x={L + 60} y={T + 430} text="better" size={86} anchor="start" color={INK} p={wr(t, 337.22, "better")} />
      <Sk pts={curvePts(L + 54, T + 452, L + 160, T + 444, L + 272, T + 456, 10)} p={ramp(t, 337.8, 0.4, INOUT)} w={5} color={INK} seed={3920} ghost={false} />
      {/* the bottom margin, where the creator scribbles his verdict */}
      <Sk pts={linePts(L + 40, T + 500, -L - 40, T + 500, 3921, 0.003, 10)} p={ramp(t, 338.0, 0.4)} w={2.6} color={PENCIL} seed={3921} dash="5 9" />
      <Hand x={L + 60} y={T + 610} text="helps" size={84} anchor="start" color={INK} p={wr(t, 338.52, "helps")} />
      <Sk pts={curvePts(L + 54, T + 634, L + 150, T + 624, L + 248, T + 636, 10)} p={ramp(t, 339.05, 0.4, INOUT)} w={6.5} color={ACCENT} seed={3922} ghost={false} />
      <Hand x={L + 440} y={T + 610} text="magic" size={78} anchor="start" color={PENCIL} p={wr(t, 339.9, "magic")} />
      <Sk pts={linePts(L + 424, T + 588, L + 620, T + 582, 3923, 0.03, 6)} p={magicStrike} w={4.5} color={INK} seed={3923} ghost={false} />
    </g>
  );
};

// ================= region D: the study-techniques page and the margin note =================
const PG = { x: 6450, y: 2325, w: 1200, h: 1250 };
const PL = PG.x - PG.w / 2;
const PT = PG.y - PG.h / 2;
const ROW = [2135, 2275];

// New piece: Student, a small stick figure hugging a school book.
const Student: FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => (
  <g transform={`translate(${x} ${y})`}>
    <Sk pts={ellPts(0, -150, 22, 22, 4001)} p={seg(p, 0, 3)} w={4} color={INK} seed={4001} ghost={false} />
    <Sk pts={linePts(0, -126, 0, -58, 4002, 0.03, 3)} p={seg(p, 1, 3)} w={4} color={INK} seed={4002} ghost={false} />
    <Sk pts={[[0, -58], [-22, 0]]} p={seg(p, 1, 3)} w={4} color={INK} seed={4003} ghost={false} amp={1} />
    <Sk pts={[[0, -58], [22, 0]]} p={seg(p, 1, 3)} w={4} color={INK} seed={4004} ghost={false} amp={1} />
    <Sk pts={[[0, -110], [-20, -86], [-4, -70]]} p={seg(p, 1, 3)} w={4} color={INK} seed={4005} ghost={false} amp={1} />
    <Sk pts={[[0, -110], [26, -94], [40, -100]]} p={seg(p, 1, 3)} w={4} color={INK} seed={4006} ghost={false} amp={1} />
    <g transform="rotate(-10 40 -100)">
      <rect x={14} y={-128} width={62} height={48} fill={PAPER} opacity={p > 0.6 ? 1 : 0} />
      <Sk pts={rectPts(14, -128, 62, 48, 4007)} p={seg(p, 2, 3)} w={4} color={INK} seed={4007} ghost={false} />
      <Sk pts={linePts(45, -128, 45, -80, 4008, 0.02, 3)} p={seg(p, 2, 3)} w={3} color={INK} seed={4008} ghost={false} />
    </g>
  </g>
);

// New piece: FlipPage, a notebook page that turns in from its left edge and is split into "rated high" and "rated low".
const FlipPage: FC = () => {
  const { t } = useTime();
  const k = ramp(t, 340.95, 0.6, Easing.out(Easing.cubic));
  if (k <= 0) return null;
  const sk = -14 * (1 - k);
  const ticks = [345.35, 346.65];
  const left = [
    { text: "test yourself", at: 344.72 },
    { text: "space it out", at: 345.98 },
  ];
  const right = [
    { text: "reread", at: 348.5, strike: 348.98 },
    { text: "highlight", at: 349.38, strike: 349.98 },
  ];
  return (
    <g>
      <g transform={`translate(${PL} ${PT}) skewY(${sk}) scale(${k} 1) translate(${-PL} ${-PT})`}>
        <rect x={PL + 12} y={PT + 16} width={PG.w} height={PG.h} rx={8} fill={INK} opacity={0.07} />
        <rect x={PL} y={PT} width={PG.w} height={PG.h} rx={8} fill={PAPER} />
        <Sk pts={rectPts(PL, PT, PG.w, PG.h, 4101)} w={4.5} color={INK} seed={4101} />
        {Array.from({ length: 8 }, (_, i) => (
          <Sk key={i} pts={ellPts(PL, PT + 110 + i * 150, 12, 22, 4102 + i)} w={3.6} color={INK} seed={4102 + i} ghost={false} />
        ))}
      </g>
      {k >= 1 && (
        <g>
          <Hand x={PG.x} y={1810} text="10 study techniques" size={84} color={INK} p={wr(t, 343.02, "10 study techniques")} />
          <Sk pts={linePts(PG.x, 1930, PG.x + 4, 2370, 4120, 0.01, 8)} p={ramp(t, 342.2, 0.45)} w={3.6} color={INK} seed={4120} />
          <Sk pts={linePts(PL + 60, 2400, PL + PG.w - 60, 2404, 4121, 0.004, 12)} p={ramp(t, 342.35, 0.5)} w={3} color={PENCIL} seed={4121} dash="5 10" />
          <Hand x={PG.x - 300} y={1985} text="rated high" size={60} color={INK} p={wr(t, 347.3, "rated high")} />
          <Hand x={PG.x + 300} y={1985} text="rated low" size={60} color={PENCIL} p={wr(t, 350.15, "rated low")} />
          {left.map((it, i) => (
            <g key={it.text}>
              <Sk pts={rectPts(PL + 70, ROW[i]! - 44, 46, 46, 4130 + i)} p={ramp(t, it.at - 0.1, 0.25)} w={4} color={ACCENT} seed={4130 + i} ghost={false} />
              <Sk pts={[[PL + 74, ROW[i]! - 24], [PL + 92, ROW[i]! - 2], [PL + 128, ROW[i]! - 66]]} p={ramp(t, ticks[i]!, 0.25)} w={6.5} color={ACCENT} seed={4135 + i} amp={1.2} />
              <Hand x={PL + 150} y={ROW[i]!} text={it.text} size={68} anchor="start" color={ACCENT} p={wr(t, it.at, it.text)} />
            </g>
          ))}
          {right.map((it, i) => (
            <g key={it.text}>
              <Hand x={PG.x + 90} y={ROW[i]!} text={it.text} size={68} anchor="start" color={PENCIL} p={wr(t, it.at, it.text)} />
              <Sk pts={linePts(PG.x + 76, ROW[i]! - 22, PG.x + 110 + it.text.length * 29, ROW[i]! - 28, 4140 + i, 0.03, 6)} p={ramp(t, it.strike, 0.25)} w={6} color={INK} seed={4140 + i} />
            </g>
          ))}
          {/* what the review studied, and where the creator stretches it */}
          <g transform="translate(6030 2770) scale(1.5) translate(-6030 -2770)">
            <Student x={6030} y={2770} p={ramp(t, 351.4, 0.6)} />
          </g>
          <Hand x={6190} y={2620} text="students" size={66} anchor="start" color={PENCIL} p={wr(t, 351.95, "students")} />
          <Hand x={PG.x} y={2880} text="my extension, not a result" size={64} color={PENCIL} rotate={-1.5} p={wr(t, 356.92, "my extension, not a result")} />
          <Sk pts={curvePts(6460, 2898, 6600, 2888, 6760, 2890, 10)} p={ramp(t, 358.35, 0.35, INOUT)} w={4.5} color={INK} seed={4150} ghost={false} />
        </g>
      )}
    </g>
  );
};

const Extension: FC = () => {
  const { t } = useTime();
  const cloudIn = ramp(t, 354.55, 0.35, POP);
  const pktIn = ramp(t, 355.85, 0.35, POP);
  return (
    <g>
      <Sk pts={curvePts(6330, 2560, 6900, 2330, 7330, 2420, 18)} p={ramp(t, 354.25, 0.5, INOUT)} w={4} color={PENCIL} seed={4201} dash="10 12" head />
      <Sk pts={curvePts(6330, 2600, 6900, 2760, 7340, 2690, 18)} p={ramp(t, 355.55, 0.5, INOUT)} w={4} color={PENCIL} seed={4202} dash="10 12" head />
      <At x={7530} y={2400} s={1.4 * cloudIn} o={clamp01(cloudIn * 3)}>
        <CloudBoxes p={ramp(t, 354.55, 0.6)} />
      </At>
      <Hand x={7530} y={2560} text="AWS" size={64} color={INK} p={wr(t, 354.62, "AWS")} />
      <At x={7530} y={2700} s={1.4 * pktIn} o={clamp01(pktIn * 3)}>
        <Packet p={ramp(t, 355.85, 0.6)} />
      </At>
      <Hand x={7530} y={2830} text="protocols" size={64} color={INK} p={wr(t, 355.95, "protocols")} />
    </g>
  );
};

// ================= region E: 64% on a laptop, 1% alone, the docs book =================
const LAP = { x: 6600, y: 950 };
const BOT = { x: 7350, y: 1070 };
const RING = { x: 7350, y: 690 };
const BOOK = { x: 7800, y: 1060, w: 230, h: 290 };

// New piece: ScreenLaptop, a large sketched laptop whose screen carries a counting number.
const ScreenLaptop: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 358.85, 0.5);
  if (p <= 0) return null;
  const n = Math.round(64 * ramp(t, 358.98, 0.58, Easing.out(Easing.quad)));
  const old = 1 - ramp(t, 368.6, 0.3);
  const { x, y } = LAP;
  return (
    <g>
      <rect x={x - 360} y={y - 310} width={720} height={450} rx={14} fill={PAPER} />
      <Sk pts={rectPts(x - 360, y - 310, 720, 450, 4301)} p={seg(p, 0, 2)} w={5} color={INK} seed={4301} />
      <Sk pts={rectPts(x - 330, y - 282, 660, 394, 4302)} p={seg(p, 0, 2)} w={2.6} color={PENCIL} seed={4302} ghost={false} />
      <path d={`M${x - 380},${y + 140} L${x + 380},${y + 140} L${x + 440},${y + 196} L${x - 440},${y + 196} Z`} fill={PAPER} opacity={seg(p, 1, 2) > 0 ? 1 : 0} />
      <Sk pts={dense([[x - 380, y + 140], [x + 380, y + 140], [x + 440, y + 196], [x - 440, y + 196], [x - 380, y + 140]], 3)} p={seg(p, 1, 2)} w={5} color={INK} seed={4303} amp={1.2} />
      <Sk pts={linePts(x - 60, y + 168, x + 60, y + 168, 4304, 0.02, 4)} p={seg(p, 1, 2)} w={3} color={PENCIL} seed={4304} ghost={false} />
      {t >= 358.98 && <Num x={x} y={y - 40} text={`${n}%`} size={230} />}
      <g opacity={old}>
        <Hand x={x} y={y + 72} text="up from 44%" size={62} color={PENCIL} p={wr(t, 363.0, "up from 44%")} />
      </g>
      {/* clears before the push to the ring, which would cut it at the frame's bottom edge */}
      <Hand x={x} y={y + 320} text="use AI to learn" size={76} color={INK} p={wr(t, 360.82, "use AI to learn")} opacity={1 - ramp(t, 366.0, 0.25)} />
    </g>
  );
};

// New piece: DocsBook, a book that slides in beside the robot; its cover swings open for the dive into Beat 7.
const DocsBook: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 368.85, 0.5, Easing.out(Easing.back(1.3)));
  if (e <= 0) return null;
  const { w, h } = BOOK;
  const x = BOOK.x + 700 * (1 - e);
  const open = ramp(t, 370.86, 0.22, Easing.inOut(Easing.quad));
  const cover = Math.cos(Math.PI * open);
  return (
    <g transform={`translate(${x} ${BOOK.y}) rotate(${-4 * (1 - open)})`}>
      {/* the first page, under the cover */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={PAPER} />
      {open > 0 && (
        <g>
          <Sk pts={rectPts(-w / 2, -h / 2, w, h, 4401)} w={4} color={INK} seed={4401} ghost={false} />
          {[0, 1, 2, 3, 4].map((k) => (
            <Sk key={k} pts={linePts(-w / 2 + 30, -h / 2 + 60 + k * 44, w / 2 - 30, -h / 2 + 60 + k * 44, 4402 + k, 0.004, 6)} w={2} color={DOT} seed={4402 + k} ghost={false} amp={0.8} />
          ))}
        </g>
      )}
      {/* the cover, hinged on the spine */}
      {cover > -0.98 && (
        <g transform={`translate(${-w / 2} 0) scale(${cover} 1) translate(${w / 2} 0)`}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={PAPER} />
          <Sk pts={rectPts(-w / 2, -h / 2, w, h, 4410)} w={5} color={INK} seed={4410} />
          <Sk pts={linePts(-w / 2 + 28, -h / 2 + 2, -w / 2 + 28, h / 2 - 2, 4411, 0.01, 6)} w={3.6} color={INK} seed={4411} ghost={false} />
          {cover > 0.2 && <Hand x={14} y={-30} text="docs" size={86} color={INK} p={wr(t, 369.45, "docs")} />}
          {cover > 0.2 && <Sk pts={linePts(-50, 40, 80, 40, 4412, 0.02, 4)} p={ramp(t, 369.7, 0.2)} w={3} color={PENCIL} seed={4412} ghost={false} />}
        </g>
      )}
    </g>
  );
};

const RegionE: FC = () => {
  const { t } = useTime();
  const botIn = ramp(t, 361.3, 0.35, POP);
  const old = 1 - ramp(t, 368.6, 0.3);
  return (
    <g>
      <ScreenLaptop />
      <At x={BOT.x} y={BOT.y} s={2.2 * botIn} o={clamp01(botIn * 3)}>
        <Robot p={ramp(t, 361.3, 0.6)} />
      </At>
      <Hand x={RING.x} y={RING.y - 92} text="only" size={54} color={PENCIL} p={wr(t, 366.62, "only")} opacity={old} />
      <At x={RING.x} y={RING.y} s={0.6 + 0.4 * ramp(t, 366.82, 0.3, POP)} o={ramp(t, 366.82, 0.12)}>
        <Num x={0} y={34} text="1%" size={124} />
      </At>
      <Hand x={RING.x} y={RING.y + 112} text="alone" size={70} color={INK} p={wr(t, 367.95, "alone")} />
      <Sk pts={ellPts(RING.x, RING.y + 10, 180, 150, 4501, 0.5, 26)} p={ramp(t, 368.2, 0.5, INOUT)} w={6.5} color={ACCENT} seed={4501} />
      <Hand x={(BOT.x + BOOK.x) / 2 + 10} y={BOOK.y + 30} text="+" size={110} color={INK} p={ramp(t, 369.25, 0.2)} />
      <Hand x={(BOT.x + BOOK.x) / 2} y={BOOK.y + 290} text="most pair it with docs" size={70} color={INK} p={wr(t, 368.98, "most pair it with docs")} />
      <DocsBook />
    </g>
  );
};

// ---------- the shot list: every move lands on a spoken word ----------
// A view by centre and scale (fill 1 of a frame-sized rect), so each framing is exact.
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });
const SHOTS: Shot[] = [
  // 1 "noticed about the chain": creep in while it draws, then pull wide as the links slide apart.
  { at: START, ...V(1400, 860, 0.98) },
  { at: 293.6, ...V(1400, 860, 1.06), move: "push", dur: 1.7 },
  { at: 295.45, ...V(1430, 980, 0.9), move: "pull", dur: 1.1 },
  // 2 "the tool names kept changing": glide onto the left pile.
  { at: 297.95, ...V(905, 960, 1.2), move: "glide", dur: 0.6 },
  // 3 "The thinking underneath didn't": glide to the hanging rings.
  { at: 300.5, ...V(2260, 960, 1.05), move: "glide", dur: 0.6 },
  // 4 "Breaking a problem down": push onto the skills pile.
  { at: 302.8, ...V(2500, 880, 1.5), move: "push", dur: 0.6 },
  // 5 "the debugging gap": pull back as the scrap flies in, then lean on it for "stuck with me".
  { at: 306.3, ...V(2400, 1000, 1.05), move: "pull", dur: 0.8 },
  { at: 308.7, ...V(2560, 1150, 1.4), move: "push", dur: 0.8 },
  // 6 "Does practice fix everything?": hard cut to the question, a slow creep until the stamp.
  { at: 309.75, ...V(1430, 2420, 1.24), move: "cut" },
  { at: 309.76, ...V(1440, 2420, 1.3), move: "push", dur: 2.1 },
  // 7 "A meta-analysis of 88 studies": pull out onto the paper pile.
  { at: 312.7, ...V(2900, 2480, 1.2), move: "pull", dur: 1.0 },
  // 8 "26% ... in games": push onto the games bar.
  { at: 315.8, ...V(3470, 2610, 1.6), move: "push", dur: 0.65 },
  // 9 "21% in music, 18% in sports": glide along the bars.
  { at: 319.95, ...V(3870, 2560, 1.35), move: "glide", dur: 0.6 },
  // 10 "4% in education, and under 1%": glide on to the shrinking pair.
  { at: 323.0, ...V(4520, 2620, 1.55), move: "glide", dur: 0.55 },
  // 11 "Software engineering wasn't one of the areas": pull wide on the whole chart and the empty slot.
  { at: 326.5, ...V(4170, 2450, 0.84), move: "pull", dur: 1.0 },
  // 12 "the study's press release summed it up": push onto the clipping, creeping while it is read.
  { at: 330.55, ...V(4200, 2400, 1.22), move: "push", dur: 1.0 },
  { at: 333.7, ...V(4170, 2410, 1.3), move: "push", dur: 3.8 },
  // 13 "So practice helps. It isn't magic": glide down to the margin.
  { at: 337.85, ...V(4060, 2520, 1.5), move: "glide", dur: 0.6 },
  // 14 "So what does help?": whip across to the page as it turns in.
  { at: 340.7, ...V(6100, 2330, 0.78), move: "whip", dur: 0.3 },
  // 15 "testing yourself and spacing out": push onto the left column.
  { at: 344.4, ...V(6160, 2275, 1.45), move: "push", dur: 0.6 },
  // 16 "rereading and highlighting rated low": glide back to see both columns.
  { at: 348.3, ...V(6450, 2275, 1.25), move: "glide", dur: 0.55 },
  // 17 "Mostly students ... AWS or protocols is my extension": push to the student, glide to the stretch, push onto the note.
  { at: 351.2, ...V(6180, 2665, 1.55), move: "push", dur: 0.6 },
  { at: 354.2, ...V(6900, 2770, 1.2), move: "glide", dur: 0.7 },
  { at: 356.7, ...V(6480, 2810, 1.55), move: "push", dur: 0.6 },
  // 18 "64% of developers use AI to learn": pull up to the laptop, then glide in for "up from 44%".
  { at: 358.6, ...V(6880, 980, 1.05), move: "pull", dur: 0.85 },
  { at: 362.8, ...V(6640, 960, 1.22), move: "glide", dur: 0.9 },
  // 19 "only 1% use it alone": push across to the ring.
  { at: 366.25, ...V(6910, 850, 1.36), move: "push", dur: 0.6 },
  // 20 "Most pair it with ... documentation": pull to see the pair, then dive into the book's page.
  { at: 368.5, ...V(7250, 1000, 0.98), move: "pull", dur: 0.9 },
  { at: 370.9, ...V(BOOK.x, BOOK.y, 20), move: "push", dur: 0.43, ease: Easing.in(Easing.cubic) },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

// A tiny source line in the corner (screen space), never zoomed by the camera.
const Source: FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const { t } = useTime();
  const o = fade(t, from, to, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 96, top: 84, opacity: o, fontFamily: SANS, fontWeight: 600, fontSize: 30, color: INK, padding: "6px 16px", background: PAPER, borderRadius: 8, boxShadow: `0 0 0 2px ${PENCIL}` }}>
      {text}
    </div>
  );
};

const Beat06: FC = () => {
  const { t } = useTime();
  if (t < START || t >= END) return null;
  // Small camera kicks on the pin, the stamp and the tape, outside the rig so they never fight the shot list.
  const kick = (at: number, a = 7) => (t >= at && t < at + 0.5 ? Math.exp(-(t - at) * 12) * Math.sin((t - at) * 70) * a : 0);
  const k = kick(307.33, 5) + kick(311.88, 10) + kick(331.95, 4);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{ transform: `translate(${k}px, ${-k * 0.6}px)` }}>
        <Camera world={WORLD} shots={SHOTS} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
          <Layer depth={1}>
            <PageWorld />
            <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              {t < 309.75 && <RegionA />}
              {t >= 309.7 && t < 313.6 && <RegionB />}
              {t >= 312.6 && t < 330.6 && <PaperStack />}
              {t >= 315.1 && t < 344.5 && <ChartC />}
              {t >= 331.4 && t < 344.5 && <PressClipping />}
              {t >= 340.9 && t < 359.7 && <FlipPage />}
              {t >= 354.2 && t < 359.7 && <Extension />}
              {t >= 358.8 && <RegionE />}
            </svg>
          </Layer>
        </Camera>
      </AbsoluteFill>
      <Source text="Macnamara et al. 2014 · 88 studies" from={316.2} to={330.5} />
      <Source text="Stack Overflow, March 2026" from={359.3} to={370.85} />
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}22 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default Beat06;
