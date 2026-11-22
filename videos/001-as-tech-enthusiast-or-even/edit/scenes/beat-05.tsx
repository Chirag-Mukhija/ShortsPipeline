// Video 001, Beat 5 (4:11–4:53): the chain greys out and one coral DSA thread runs under all of it; why it lasts, "my bet, not a fact", the practice footage hanging from the thread, then a paper turn.
import type { FC } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, getStaticFiles, interpolate, staticFile, useVideoConfig } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, ramp, seg, useTime, type Rect, type Shot } from "@library/core";
import {
  GRAIN, Hand, LinkView, NodeView, Paper, PlayBtn, Sk, blobPts, curvePts, ellPts, linePts, rectPts, smooth, wr,
  type LinkLook, type NodeLook, type P,
} from "@library/themes/hand-drawn";
import { NODES } from "./shared";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL, sans: SANS } = STYLE;

const START = 251.45;
const END = 293.49;
const WORLD = { w: 5200, h: 2800 };
// Visuals land a few frames before their word (the video's pacing).
const cue = (word: number) => word - STYLE.pacing.leadFrames / 30;

// A polyline with in-between points, so the stroke's smoothing keeps sharp corners instead of looping round them.
const dense = (pts: P[], n = 4): P[] => [
  ...pts.slice(1).flatMap((b, i) => {
    const a = pts[i]!;
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as P);
  }),
  pts[pts.length - 1]!,
];
// The point a stroke's head is at for progress p (same index-based slicing as the theme's strokes).
const along = (pts: P[], p: number): P => {
  const n = pts.length - 1;
  const f = clamp01(p) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const a = pts[i]!;
  const b = pts[i + 1]!;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
};
// A damped swing kicked at `at`, for things hanging on the thread.
const kickSwing = (t: number, at: number, amp: number, freq = 7, decay = 2.6) => (t > at ? amp * Math.exp(-decay * (t - at)) * Math.sin(freq * (t - at)) : 0);

// ---------- the world: the chain (story order), the coral thread hung under every link, its DSA tag ----------
const OFF = { x: 500, y: 600 };
const CN = NODES.map((n) => ({ ...n, x: n.x + OFF.x, y: n.y + OFF.y }));
const KNOT: P = [572, 1206];
const E: P = [2490, 1236];
// The thread hangs from the bottom of each link like a string between pins, so it reads as running under all of them.
const ANCH: P[] = [KNOT, ...CN.map((n) => [n.x, n.y + 68] as P), E];
const THREAD: P[] = [
  ...ANCH.slice(1).flatMap((b, i) => {
    const a = ANCH[i]!;
    const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 38));
    const sag = i === 0 || i === ANCH.length - 2 ? 24 : 56;
    return Array.from({ length: n }, (_, k) => {
      const u = k / n;
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + sag * Math.sin(Math.PI * u)] as P;
    });
  }),
  E,
];
const onThread = (x: number): P => THREAD.reduce((best, q) => (Math.abs(q[0] - x) < Math.abs(best[0] - x) ? q : best), THREAD[0]!);

// Link appearance order for the match cut: Claude Code first (it is where Beat 4's folder sat), then outward.
const ORDER = [2, 1, 3, 0, 4, 5];
const appearAt = (i: number) => 251.5 + (ORDER.indexOf(i) - 1) * 0.13;
const greyAt = (i: number) => cue(253.67) + i * 0.2;

const ChainBack: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = CN.map((n, i) => {
    const first = i === 2;
    const ap = appearAt(i);
    return {
      draw: first ? 1 : ramp(t, ap, 0.45, INOUT),
      label: [first ? 1 : wr(t, ap + 0.15, n.label[0]!), first ? 1 : wr(t, ap + 0.25, n.label[1] ?? "")],
      ink: 1 - ramp(t, greyAt(i), 0.45),
      bold: first ? 1 - ramp(t, 251.9, 0.5) : 0,
    };
  });
  const links: LinkLook[] = CN.slice(1).map((_, i) => ({
    p: ramp(t, Math.max(appearAt(i), appearAt(i + 1)) + 0.1, 0.4),
    ink: Math.min(looks[i]!.ink, looks[i + 1]!.ink),
  }));
  // Match cut: the first link starts at the folder's tilt and settles flat.
  const tilt = -9 * (1 - ramp(t, START, 0.55, Easing.out(Easing.back(2.2))));
  const n2 = CN[2]!;
  return (
    <g>
      {links.map((l, i) => <LinkView key={i} a={CN[i]!} b={CN[i + 1]!} look={l} seed={5000 + i * 10} />)}
      {CN.map((n, i) =>
        i === 2 ? (
          <g key={n.seed} transform={`rotate(${tilt} ${n2.x} ${n2.y})`}>
            <NodeView n={n} look={looks[i]!} />
          </g>
        ) : (
          <NodeView key={n.seed} n={n} look={looks[i]!} />
        ),
      )}
    </g>
  );
};

// ---------- new piece: PencilNib, a pencil whose tip rides the head of a line it is drawing ----------
const PencilNib: FC<{ x: number; y: number; o: number; angle?: number; lead?: string; s?: number }> = ({ x, y, o, angle = -58, lead = INK, s = 1 }) => {
  if (o <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`} opacity={o}>
      <polygon points="0,0 46,-16 250,-16 250,16 46,16" fill={PAPER} />
      <polygon points="0,0 16,-6 16,6" fill={lead} />
      <Sk pts={[[46, -16], [0, 0], [46, 16]]} w={3.6} color={INK} seed={5901} amp={0.8} ghost={false} />
      <Sk pts={[[46, -16], [250, -16], [250, 16], [46, 16], [46, -16]]} w={3.6} color={INK} seed={5902} amp={1} />
      <Sk pts={linePts(58, -5, 236, -5, 5903, 0.01, 5)} w={2.2} color={PENCIL} seed={5903} ghost={false} />
      <Sk pts={linePts(58, 6, 236, 6, 5904, 0.01, 5)} w={2.2} color={PENCIL} seed={5904} ghost={false} />
      <polygon points="250,-16 276,-14 276,14 250,16" fill={PENCIL} opacity={0.5} />
      <Sk pts={[[250, -16], [276, -14], [276, 14], [250, 16]]} w={3.2} color={INK} seed={5905} amp={0.8} ghost={false} />
    </g>
  );
};

// ---------- new piece: CoralThread, a thick coral thread tied in a knot at the first link, drawn under the greyed chain ----------
const THREAD_AT = 254.72;
const THREAD_DUR = 0.88;
const CoralThread: FC = () => {
  const { t } = useTime();
  if (t < THREAD_AT - 0.12) return null;
  const p = ramp(t, THREAD_AT, THREAD_DUR, Easing.inOut(Easing.quad));
  const head = along(THREAD, p);
  // It glows softly once it lands on the tag, and more in the closing pull-back.
  const glow = ramp(t, 255.8, 0.6) * (0.16 + ramp(t, 289.9, 0.8) * (0.2 + 0.08 * Math.sin(t * 3.4)));
  const nibO = ramp(t, THREAD_AT - 0.12, 0.15) * (1 - ramp(t, THREAD_AT + THREAD_DUR - 0.02, 0.22));
  // "since the start": a bead of coral runs back along the thread to the knot, the camera following it.
  const back = ramp(t, 258.2, 1.1, Easing.inOut(Easing.sin));
  const bead = along(THREAD, 1 - back);
  const beadO = t >= 258.2 ? clamp01((t - 258.2) * 6) * (1 - ramp(t, 259.35, 0.3)) : 0;
  const ring = ramp(t, 259.28, 0.6);
  return (
    <g>
      <defs>
        <filter id="b5glow" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      {glow > 0 && <path d={smooth(THREAD)} fill="none" stroke={ACCENT} strokeWidth={40} strokeLinecap="round" opacity={glow} filter="url(#b5glow)" />}
      {/* the knot at the first link, two loose tails */}
      <Sk pts={ellPts(KNOT[0] - 16, KNOT[1], 22, 16, 5101)} p={ramp(t, THREAD_AT - 0.1, 0.16)} w={7} color={ACCENT} seed={5101} ghost={false} />
      <Sk pts={curvePts(KNOT[0] - 34, KNOT[1] + 8, KNOT[0] - 70, KNOT[1] + 30, KNOT[0] - 84, KNOT[1] + 70, 6)} p={ramp(t, THREAD_AT - 0.05, 0.14)} w={6} color={ACCENT} seed={5102} ghost={false} />
      <Sk pts={curvePts(KNOT[0] - 28, KNOT[1] + 12, KNOT[0] - 40, KNOT[1] + 50, KNOT[0] - 30, KNOT[1] + 84, 6)} p={ramp(t, THREAD_AT - 0.02, 0.14)} w={6} color={ACCENT} seed={5103} ghost={false} />
      <Sk pts={THREAD} p={p} w={11} color={ACCENT} seed={5104} amp={1.6} />
      <PencilNib x={head[0]} y={head[1] - 4} o={nibO} lead={ACCENT} angle={-40 + 6 * Math.sin(t * 20)} s={0.9} />
      {beadO > 0 && (
        <g opacity={beadO}>
          <circle cx={bead[0]} cy={bead[1]} r={17} fill={ACCENT} />
          <circle cx={bead[0]} cy={bead[1]} r={30} fill={ACCENT} opacity={0.18} />
        </g>
      )}
      {ring > 0 && ring < 1 && <Sk pts={ellPts(KNOT[0] - 16, KNOT[1], 30 + 70 * ring, 24 + 52 * ring, 5105)} w={5} color={ACCENT} seed={5105} opacity={1 - ring} ghost={false} />}
    </g>
  );
};

// ---------- new piece: BetChip, a sketched poker chip with coral notches: the creator's bet ----------
const BetChip: FC<{ p: number; seed: number }> = ({ p, seed }) => (
  <>
    <circle r={58} fill={PAPER} opacity={p > 0 ? 1 : 0} />
    {Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4 + 0.2;
      return (
        <path
          key={k}
          d={`M${Math.cos(a - 0.17) * 40},${Math.sin(a - 0.17) * 40} L${Math.cos(a - 0.15) * 57},${Math.sin(a - 0.15) * 57} L${Math.cos(a + 0.15) * 57},${Math.sin(a + 0.15) * 57} L${Math.cos(a + 0.17) * 40},${Math.sin(a + 0.17) * 40} Z`}
          fill={ACCENT}
          opacity={seg(p, 2, 3)}
        />
      );
    })}
    <Sk pts={ellPts(0, 0, 58, 58, seed)} p={seg(p, 0, 3)} w={5} color={INK} seed={seed} />
    <Sk pts={ellPts(0, 0, 38, 38, seed + 1)} p={seg(p, 1, 3)} w={3.4} color={INK} seed={seed + 1} ghost={false} />
    {[-12, 0, 12].map((d, k) => (
      <Sk key={k} pts={linePts(-14 + d, 12, 2 + d, -12, seed + 2 + k, 0.02, 2)} p={seg(p, 2, 3)} w={2.6} color={PENCIL} seed={seed + 2 + k} ghost={false} amp={1} />
    ))}
  </>
);

// ---------- new piece: DsaTag, a luggage tag hanging off the thread's end; "DSA" slams on, a bet chip drops onto it ----------
const SLAM = cue(255.97);
const CHIP_AT = cue(271.34) - 0.16;
const TAG_PTS: P[] = dense([[-170, 86], [-128, 44], [128, 44], [170, 86], [170, 270], [-170, 270], [-170, 86], [-150, 66]], 4);
const DsaTag: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 255.42, 0.38);
  if (p <= 0) return null;
  const swing = 1.1 * Math.sin(t * 1.3) + kickSwing(t, SLAM, 7) + kickSwing(t, CHIP_AT + 0.16, 6) + 4 * Math.sin((t - 287.45) * 5.5) * ramp(t, 287.45, 0.3) * (1 - ramp(t, 289.2, 0.6));
  const slam = interpolate(t, [SLAM, SLAM + 0.1, SLAM + 0.2], [1.7, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slamO = clamp01((t - SLAM) / 0.05);
  const shock = ramp(t, SLAM + 0.04, 0.3) * (1 - ramp(t, SLAM + 0.5, 0.3));
  // The chip falls, bounces, then rests at a tilt; it wobbles on "nothing guarantees it".
  const drop = ramp(t, CHIP_AT, 0.45, Easing.bounce);
  const wob = 11 * Math.sin((t - 287.45) * 8) * ramp(t, 287.45, 0.3) * (1 - ramp(t, 289.25, 0.5));
  return (
    <g transform={`translate(${E[0]} ${E[1]}) rotate(${swing})`}>
      <Sk pts={linePts(0, 0, 0, 62, 5201, 0.05, 3)} p={p} w={5} color={ACCENT} seed={5201} ghost={false} />
      <polygon points="-170,86 -128,44 128,44 170,86 170,270 -170,270" fill={PAPER} opacity={clamp01(p * 3)} />
      <Sk pts={TAG_PTS} p={p} w={5.5} color={INK} seed={5202} amp={1.4} />
      <Sk pts={ellPts(0, 72, 11, 11, 5203)} p={ramp(t, 255.6, 0.2)} w={4} color={INK} seed={5203} ghost={false} />
      {slamO > 0 && (
        <g transform={`translate(-45 190) scale(${slam})`} opacity={slamO}>
          <Hand x={0} y={38} text="DSA" size={124} color={ACCENT} />
        </g>
      )}
      {/* impact lines burst out of both sides of the tag on the slam */}
      {shock > 0 &&
        [-1, 1].flatMap((side) =>
          [-0.5, 0, 0.5].map((a, k) => (
            <Sk key={`${side}${k}`} pts={linePts(side * 200, 160 + a * 60, side * (200 + 80 * Math.cos(a)), 160 + a * 170, 5204 + k + (side > 0 ? 3 : 0), 0.03, 2)} w={5} color={INK} seed={5204 + k + (side > 0 ? 3 : 0)} opacity={shock} ghost={false} />
          )),
        )}
      {t >= CHIP_AT && (
        <g transform={`translate(118 ${100 - 560 * (1 - drop)}) rotate(${-14 + 14 * (1 - drop) + wob})`}>
          <BetChip p={ramp(t, CHIP_AT, 0.3)} seed={5210} />
        </g>
      )}
    </g>
  );
};

// The words around the tag: its full name, then the bet and its caveats (pencil = the creator's honest aside).
const TagWords: FC = () => {
  const { t } = useTime();
  const x = E[0];
  const fadeAll = 1 - ramp(t, 290.5, 0.35);
  return (
    <g>
      <Hand x={x} y={1578} text="data structures & algorithms" size={58} color={INK} p={wr(t, cue(256.83), "data structures & algorithms")} opacity={1 - ramp(t, 258.55, 0.3)} />
      {t >= 270.9 && (
        <g opacity={fadeAll}>
          <Hand x={x} y={1590} text="my bet," size={78} color={INK} p={wr(t, cue(271.2), "my bet,")} />
          <Hand x={x + 10} y={1676} text="not a fact" size={62} color={PENCIL} rotate={-2} p={wr(t, cue(272.0), "not a fact")} opacity={1 - ramp(t, 287.3, 0.3)} />
          <Hand x={x + 10} y={1676} text="nothing guarantees it" size={62} color={PENCIL} rotate={-2} p={wr(t, 287.78, "nothing guarantees it")} />
        </g>
      )}
    </g>
  );
};

// ---------- new piece: TapeMeasure, a tape measure from today that pulls out year by year ----------
const TAPE = { cx: 2830, cy: 1390, x0: 2940, step: 220, h: 62 };
const tapeYears = (t: number) =>
  interpolate(t, [261.8, 263.95, cue(264.35), cue(264.97), cue(264.97) + 0.25], [0, 4, 5, 6, 6.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) -
  0.12 * ramp(t, cue(264.97) + 0.25, 0.3, INOUT);
const TapeMeasure: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 260.55, 0.5);
  const o = 1 - ramp(t, 289.6, 0.45);
  if (p <= 0 || o <= 0) return null;
  const yrs = tapeYears(t);
  const endX = TAPE.x0 + yrs * TAPE.step;
  const top = TAPE.cy - TAPE.h / 2;
  const bot = TAPE.cy + TAPE.h / 2;
  const minor = Array.from({ length: 6 * 4 + 1 }, (_, k) => k).filter((k) => TAPE.x0 + (k * TAPE.step) / 4 < endX - 6);
  const b5 = TAPE.x0 + 5 * TAPE.step;
  const b6 = TAPE.x0 + 6 * TAPE.step;
  const yb = top - 16;
  const mid = (b5 + b6) / 2;
  return (
    <g opacity={o}>
      {/* the tape */}
      {endX > TAPE.x0 - 20 && (
        <>
          <rect x={TAPE.x0 - 20} y={top} width={endX - TAPE.x0 + 26} height={TAPE.h} fill={PAPER} />
          <Sk pts={dense([[TAPE.x0 - 20, top], [endX, top], [endX, bot], [TAPE.x0 - 20, bot]], 6)} w={4.5} color={INK} seed={5301} amp={1.2} />
          {minor.map((k) => {
            const x = TAPE.x0 + (k * TAPE.step) / 4;
            const big = k % 4 === 0;
            return <Sk key={k} pts={linePts(x, top + 2, x, top + (big ? 30 : 14), 5310 + k, 0.02, 2)} w={big ? 4 : 2.6} color={big ? INK : PENCIL} seed={5310 + k} ghost={false} amp={0.8} />;
          })}
          {[1, 2, 3, 4, 5, 6].map((k) =>
            TAPE.x0 + k * TAPE.step < endX - 6 ? <Hand key={k} x={TAPE.x0 + k * TAPE.step + 22} y={bot - 8} text={String(k)} size={34} font={SANS} weight={600} color={INK} /> : null,
          )}
          <Sk pts={linePts(endX, top - 14, endX, bot + 10, 5340, 0.02, 3)} w={7} color={INK} seed={5340} ghost={false} />
        </>
      )}
      {/* the case */}
      <path d={`M${TAPE.cx - 92},${TAPE.cy - 92} h184 v184 h-184 Z`} fill={PAPER} opacity={p > 0.2 ? 1 : 0} />
      <Sk pts={blobPts(TAPE.cx, TAPE.cy, 190, 190, 5350)} p={p} w={5.5} color={INK} seed={5350} />
      <Sk pts={ellPts(TAPE.cx, TAPE.cy, 56, 56, 5351)} p={seg(p, 0.4, 1.4)} w={4} color={INK} seed={5351} ghost={false} />
      <Sk pts={ellPts(TAPE.cx, TAPE.cy, 12, 12, 5352)} p={seg(p, 0.6, 1.6)} w={4} color={INK} seed={5352} ghost={false} />
      <Sk pts={rectPts(TAPE.cx - 26, TAPE.cy - 118, 52, 22, 5353)} p={seg(p, 0.6, 1.6)} w={3.6} color={INK} seed={5353} ghost={false} />
      {/* "I believe: 5–6 more years", cleared once the camera has moved on so the tag shot stays clean */}
      <g opacity={1 - ramp(t, 266.3, 0.3)}>
        <Hand x={TAPE.cx} y={TAPE.cy + 150} text="today" size={44} color={PENCIL} p={wr(t, 261.55, "today")} />
        <Hand x={3010} y={1250} text="I believe:" size={62} color={PENCIL} rotate={-3} p={wr(t, cue(261.15), "I believe:")} />
        <Sk pts={[[b5, yb], [b5 + 6, yb - 16], [mid - 14, yb - 18], [mid, yb - 36], [mid + 14, yb - 18], [b6 - 6, yb - 16], [b6, yb]]} p={ramp(t, cue(264.35), 0.6, INOUT)} w={5} color={INK} seed={5360} amp={1.2} />
        <Hand x={mid + 22} y={1240} text="5–6" size={84} anchor="end" font={SANS} weight={700} color={INK} p={ramp(t, cue(264.35), 0.3)} />
        <Hand x={mid + 42} y={1240} text="more years" size={92} anchor="start" color={INK} p={wr(t, cue(264.35) + 0.25, "more years")} />
      </g>
    </g>
  );
};

// ---------- new piece: CheckSheet, a sheet that ticks off what DSA checks, then a magnifier inspects it ----------
const SHEET = { x: 4200, y: 2030, w: 760, h: 600 };
const SL = SHEET.x - SHEET.w / 2;
const ST = SHEET.y - SHEET.h / 2;
const ROWS = [ST + 290, ST + 430];
const Magnifier: FC<{ p: number }> = ({ p }) => (
  <>
    <circle r={112} fill={PAPER} opacity={0.18} />
    <Sk pts={ellPts(0, 0, 112, 112, 5401)} p={seg(p, 0, 2)} w={6} color={INK} seed={5401} />
    <Sk pts={arcPts2(0, 0, 82, -2.6, -1.7)} p={seg(p, 1, 2)} w={4} color={PENCIL} seed={5402} ghost={false} />
    <Sk pts={linePts(80, 80, 186, 186, 5403, 0.02, 4)} p={seg(p, 1, 2)} w={14} color={INK} seed={5403} ghost={false} />
  </>
);
// A short arc (local), used for the lens glint.
function arcPts2(cx: number, cy: number, r: number, a0: number, a1: number): P[] {
  return Array.from({ length: 9 }, (_, i) => [cx + Math.cos(a0 + ((a1 - a0) * i) / 8) * r, cy + Math.sin(a0 + ((a1 - a0) * i) / 8) * r] as P);
}
const CheckSheet: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 265.55, 0.55);
  const o = 1 - ramp(t, 289.6, 0.45);
  if (p <= 0 || o <= 0) return null;
  const items = [
    { text: "thinking process", at: cue(267.37), tick: cue(267.61) },
    { text: "problem solving", at: cue(268.43), tick: cue(268.95) },
  ];
  const mg = ramp(t, cue(270.11) - 0.4, 0.4, Easing.out(Easing.back(1.3)));
  const look = ramp(t, cue(270.11) + 0.05, 0.4);
  const mx = interpolate(mg, [0, 1], [SHEET.x + 640, SL + 108]) + 10 * Math.sin((t - 270) * 3.2) * look;
  const my = interpolate(mg, [0, 1], [SHEET.y + 360, (ROWS[0]! + ROWS[1]!) / 2 - 28]) + 7 * Math.cos((t - 270) * 3.2) * look;
  return (
    <g opacity={o}>
      <g transform={`rotate(1.5 ${SHEET.x} ${SHEET.y})`}>
        <rect x={SL + 12} y={ST + 16} width={SHEET.w} height={SHEET.h} fill={INK} opacity={0.06 * p} />
        <path d={`M${SL},${ST} h${SHEET.w - 70} l70,70 v${SHEET.h - 70} h${-SHEET.w} Z`} fill={PAPER} opacity={p > 0.1 ? 1 : 0} />
        <Sk pts={dense([[SL, ST], [SL + SHEET.w - 70, ST], [SL + SHEET.w, ST + 70], [SL + SHEET.w, ST + SHEET.h], [SL, ST + SHEET.h], [SL, ST + 4]], 5)} p={p} w={5} color={INK} seed={5410} amp={1.4} />
        <Sk pts={[[SL + SHEET.w - 70, ST], [SL + SHEET.w - 70, ST + 70], [SL + SHEET.w, ST + 70]]} p={seg(p, 0.6, 1.6)} w={3.6} color={INK} seed={5411} amp={1} ghost={false} />
        <Hand x={SHEET.x - 20} y={ST + 128} text="how thinking gets checked" size={56} color={INK} p={wr(t, cue(266.79), "how thinking gets checked")} />
        <Sk pts={linePts(SL + 60, ST + 160, SL + SHEET.w - 110, ST + 156, 5412, 0.01, 10)} p={ramp(t, cue(266.79) + 0.9, 0.4)} w={3.6} color={PENCIL} seed={5412} ghost={false} />
        {items.map((it, k) => (
          <g key={k}>
            <Sk pts={rectPts(SL + 76, ROWS[k]! - 46, 50, 50, 5420 + k)} p={ramp(t, it.at - 0.2, 0.3)} w={4.5} color={INK} seed={5420 + k} ghost={false} />
            <Hand x={SL + 160} y={ROWS[k]!} text={it.text} size={62} anchor="start" color={INK} p={wr(t, it.at, it.text)} />
            <Sk pts={[[SL + 80, ROWS[k]! - 26], [SL + 100, ROWS[k]! - 2], [SL + 138, ROWS[k]! - 68]]} p={ramp(t, it.tick, 0.25)} w={7} color={INK} seed={5425 + k} amp={1.2} />
          </g>
        ))}
        {[ST + 520].map((y, k) => (
          <Sk key={k} pts={linePts(SL + 76, y, SL + SHEET.w - 120, y, 5430 + k, 0.004, 10)} p={p} w={2.4} color={DOT} seed={5430 + k} ghost={false} amp={1} />
        ))}
      </g>
      {mg > 0 && (
        <g transform={`translate(${mx} ${my}) rotate(${-8 + 8 * mg})`}>
          <Magnifier p={ramp(t, cue(270.11) - 0.4, 0.35)} />
        </g>
      )}
    </g>
  );
};

// ---------- new piece: PencilNote, a margin note written by a pencil under the thread; "sure about" underlined in coral ----------
const NOTE = { x: 790, y1: 1540, y2: 1630, s1: 66, s2: 60 };
const L1 = "what I'm sure about,";
const L2 = "not proven";
const headX = (text: string, size: number, p: number) => NOTE.x - 14 + (text.length * size * 0.5 + 30) * p;
const PencilNote: FC = () => {
  const { t } = useTime();
  const a1 = cue(275.0);
  const a2 = cue(276.16);
  const o = 1 - ramp(t, 289.6, 0.45);
  if (t < a1 - 0.4 || o <= 0) return null;
  const p1 = wr(t, a1, L1);
  const p2 = wr(t, a2, L2);
  const onL2 = t >= a2 - 0.05;
  const px = onL2 ? headX(L2, NOTE.s2, p2) : headX(L1, NOTE.s1, p1);
  const py = onL2 ? NOTE.y2 - 12 : NOTE.y1 - 12;
  const nibO = ramp(t, a1 - 0.35, 0.25) * (1 - ramp(t, a2 + 0.7, 0.3));
  return (
    <g opacity={o}>
      <Hand x={NOTE.x} y={NOTE.y1} text={L1} size={NOTE.s1} anchor="start" color={INK} p={p1} />
      <Sk pts={curvePts(1070, NOTE.y1 + 18, 1210, NOTE.y1 + 8, 1352, NOTE.y1 + 20, 12)} p={ramp(t, 275.98, 0.4, INOUT)} w={7} color={ACCENT} seed={5501} ghost={false} />
      <Hand x={NOTE.x} y={NOTE.y2} text={L2} size={NOTE.s2} anchor="start" color={PENCIL} p={p2} />
      <PencilNib x={px} y={py + Math.sin(t * 26) * 3} o={nibO} angle={-58} s={0.85} />
    </g>
  );
};

// ---------- new piece: SignBoard, a "go learn DSA" placard that gets scribbled out word by word, then topples ----------
const SIGN = { x: 1300, y: 520, w: 720, h: 250, base: 945 };
const SignBoard: FC = () => {
  const { t } = useTime();
  if (t < 277.55 || t > 282.6) return null;
  const pop = ramp(t, 277.6, 0.38, POP);
  const fall = ramp(t, 281.8, 0.55, Easing.in(Easing.quad));
  const L = SIGN.x - SIGN.w / 2;
  const T = SIGN.y - SIGN.h / 2;
  // The scribble crosses each word as it is said: "not" ... "go" ... "learn" ... "DSA".
  const sp = interpolate(t, [cue(280.31), cue(280.73) + 0.1, cue(281.29) + 0.1, cue(281.51) + 0.25], [0, 0.3, 0.68, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zig: P[] = Array.from({ length: 23 }, (_, k) => [L + 70 + (k * (SIGN.w - 140)) / 22 + (k % 3) * 6, SIGN.y + (k % 2 ? 62 : -48) + (k % 4) * 4] as P);
  const shake = t > 281.55 && t < 282 ? 3 * Math.sin((t - 281.55) * 60) * (1 - ramp(t, 281.55, 0.4)) : 0;
  return (
    <g transform={`rotate(${84 * fall + shake} ${SIGN.x} ${SIGN.base}) translate(${SIGN.x} ${SIGN.base}) scale(${0.6 + 0.4 * pop}) translate(${-SIGN.x} ${-SIGN.base})`} opacity={clamp01(pop * 3) * (1 - ramp(t, 282.25, 0.25))}>
      <Sk pts={linePts(SIGN.x - 120, SIGN.base + 6, SIGN.x + 120, SIGN.base + 2, 5601, 0.02, 6)} w={4} color={PENCIL} seed={5601} ghost={false} />
      {[-90, -64, 70, 96].map((d, k) => (
        <Sk key={k} pts={linePts(SIGN.x + d, SIGN.base + 2, SIGN.x + d + 8, SIGN.base - 18, 5602 + k, 0.03, 2)} w={3} color={PENCIL} seed={5602 + k} ghost={false} />
      ))}
      <rect x={SIGN.x - 16} y={T + SIGN.h} width={32} height={SIGN.base - T - SIGN.h} fill={PAPER} />
      <Sk pts={linePts(SIGN.x - 16, T + SIGN.h, SIGN.x - 16, SIGN.base, 5610, 0.01, 6)} w={4.5} color={INK} seed={5610} ghost={false} />
      <Sk pts={linePts(SIGN.x + 16, T + SIGN.h, SIGN.x + 16, SIGN.base, 5611, 0.01, 6)} w={4.5} color={INK} seed={5611} ghost={false} />
      <rect x={L + 10} y={T + 14} width={SIGN.w} height={SIGN.h} fill={INK} opacity={0.06} />
      <rect x={L} y={T} width={SIGN.w} height={SIGN.h} fill={PAPER} />
      <Sk pts={rectPts(L, T, SIGN.w, SIGN.h, 5612)} w={6} color={INK} seed={5612} />
      {[[L + 30, T + 30], [SIGN.x + SIGN.w / 2 - 30, T + 30]].map(([x, y], k) => (
        <Sk key={k} pts={ellPts(x!, y!, 7, 7, 5613 + k)} w={3.4} color={INK} seed={5613 + k} ghost={false} />
      ))}
      <Hand x={SIGN.x} y={SIGN.y + 36} text="go learn DSA" size={104} color={INK} p={wr(t, 277.85, "go learn DSA")} />
      {/* shout lines, the guru voice */}
      {[-1, 1].flatMap((side) =>
        [-0.45, 0, 0.45].map((a, k) => {
          const cx = SIGN.x + side * (SIGN.w / 2 + 40);
          const dx = side * Math.cos(a);
          const dy = Math.sin(a);
          return <Sk key={`${side}${k}`} pts={linePts(cx + dx * 10, SIGN.y + dy * 40, cx + dx * 70, SIGN.y + dy * 90, 5620 + k + (side > 0 ? 5 : 0), 0.03, 2)} p={ramp(t, 278.45 + k * 0.06, 0.2)} w={4.5} color={INK} seed={5620 + k + (side > 0 ? 5 : 0)} ghost={false} />;
        }),
      )}
      <Sk pts={zig} p={sp} w={10} color={INK} seed={5630} amp={3} />
    </g>
  );
};

// ---------- footage fs-01: the creator's DSA practice in a sketched frame hung from the coral thread ----------
const FR = { x: 1900, y: 1990, w: 880, h: 495 };
const HOOKS: [P, P] = [onThread(1560), onThread(2235)];
const FS01 = "media/fs-01.mov";
const FS_AT = 282.0;
const HangingFrame: FC = () => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  // It clears as the camera leaves for the tag, so its strings never cross the caption there.
  const o = 1 - ramp(t, 287.62, 0.3);
  if (t < 281.85 || o <= 0) return null;
  // getStaticFiles lists the bundle's public folder; a missing file means the slot is still empty.
  const has = (() => {
    try {
      return getStaticFiles().some((f) => f.name === FS01);
    } catch {
      return false;
    }
  })();
  const drop = ramp(t, 281.85, 0.5, Easing.out(Easing.back(1.5)));
  const dy = -760 * (1 - drop);
  const land = 282.3;
  const rot = (t > land ? 3.2 * Math.exp(-2 * (t - land)) * Math.sin(6 * (t - land)) : 0) + 0.35 * Math.sin(t * 1.1);
  const r = (rot * Math.PI) / 180;
  const corner = (sx: number): P => {
    const lx = sx * (FR.w / 2 - 40);
    const ly = -FR.h / 2;
    return [FR.x + lx * Math.cos(r) - ly * Math.sin(r), FR.y + dy + lx * Math.sin(r) + ly * Math.cos(r)];
  };
  const zoom = 1 + 0.06 * ramp(t, FS_AT, 5.3, Easing.inOut(Easing.sin));
  const iw = FR.w - 44;
  const ih = FR.h - 44;
  return (
    <g opacity={o}>
      <Sk pts={[HOOKS[0], corner(-1)]} w={4.5} color={ACCENT} seed={5701} amp={1} ghost={false} />
      <Sk pts={[HOOKS[1], corner(1)]} w={4.5} color={ACCENT} seed={5702} amp={1} ghost={false} />
      <g transform={`translate(${FR.x} ${FR.y + dy}) rotate(${rot})`}>
        <rect x={-FR.w / 2 + 14} y={-FR.h / 2 + 18} width={FR.w} height={FR.h} fill={INK} opacity={0.08} />
        <rect x={-FR.w / 2} y={-FR.h / 2} width={FR.w} height={FR.h} fill={PAPER} />
        {has ? (
          <foreignObject x={-iw / 2} y={-ih / 2} width={iw} height={ih}>
            <div style={{ width: iw, height: ih, overflow: "hidden", position: "relative", backgroundColor: PAPER }}>
              <Sequence from={Math.round(FS_AT * fps)} layout="none">
                <OffthreadVideo
                  src={staticFile(FS01)}
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, filter: "sepia(0.22) saturate(0.82) contrast(1.04)" }}
                />
              </Sequence>
              {/* Paper multiplied over the screen recording so it sits in the sketchbook's warm light. */}
              <div style={{ position: "absolute", inset: 0, backgroundColor: PAPER, mixBlendMode: "multiply", opacity: 0.45 }} />
            </div>
          </foreignObject>
        ) : (
          <g>
            <rect x={-iw / 2} y={-ih / 2} width={iw} height={ih} fill={DOT} opacity={0.32} />
            <Sk pts={rectPts(-iw / 2 + 10, -ih / 2 + 10, iw - 20, ih - 20, 5710)} w={3} color={PENCIL} seed={5710} dash="14 12" />
            <g transform={`translate(0 -78) scale(${1.25 * zoom})`}>
              <PlayBtn p={ramp(t, 282.2, 0.5)} seed={5711} />
            </g>
            <Hand x={0} y={60} text="fs-01: your DSA practice" size={54} color={INK} p={wr(t, 282.35, "fs-01: your DSA practice")} />
            <Hand x={0} y={128} text="screen recording, waiting for footage" size={38} color={PENCIL} p={wr(t, 282.7, "screen recording, waiting for footage")} />
          </g>
        )}
        <Sk pts={rectPts(-FR.w / 2, -FR.h / 2, FR.w, FR.h, 5720)} w={7} color={INK} seed={5720} />
        <Sk pts={rectPts(-iw / 2, -ih / 2, iw, ih, 5721)} w={3} color={INK} seed={5721} ghost={false} />
        {[-1, 1].map((sx) => (
          <Sk key={sx} pts={ellPts(sx * (FR.w / 2 - 40), -FR.h / 2 + 2, 9, 9, 5722 + sx)} w={4} color={INK} seed={5723 + sx} ghost={false} />
        ))}
      </g>
    </g>
  );
};

// "since the start", written under the knot once the camera has followed the thread back.
const SinceStart: FC = () => {
  const { t } = useTime();
  const o = 1 - ramp(t, 260.7, 0.3);
  if (t < 258.8 || o <= 0) return null;
  return (
    <g opacity={o}>
      <Hand x={720} y={1438} text="since the start" size={70} color={INK} p={wr(t, 258.95, "since the start")} />
      <Sk pts={curvePts(540, 1388, 470, 1320, 540, 1262, 10)} p={ramp(t, 259.45, 0.35)} w={4} color={PENCIL} seed={5801} head />
    </g>
  );
};

// The closing line, written over the greyed chain.
const Closing: FC = () => {
  const { t } = useTime();
  const at = cue(290.95);
  if (t < at) return null;
  return (
    <g>
      <Hand x={1580} y={880} text="what I'd bet on" size={112} color={INK} p={wr(t, at, "what I'd bet on")} />
      <Sk pts={curvePts(1640, 908, 1760, 896, 1900, 912, 12)} p={ramp(t, at + 1.05, 0.45, INOUT)} w={8} color={ACCENT} seed={5811} ghost={false} />
    </g>
  );
};

// ---------- the shot list: every move lands on a spoken word ----------
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
// A view by centre and scale (fill 1 of a frame-sized rect), so each framing is exact.
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });
const SHOTS: Shot[] = [
  // s01 "Out of the whole chain": match cut, born on the Claude Code link where Beat 4's stamped folder sat; pull back as the chain returns, creep while it greys.
  { at: START, ...V(1025, 1200, 1.93) },
  { at: 251.5, ...V(1520, 1215, 0.88), move: "pull", dur: 1.3 },
  { at: 253.0, ...V(1480, 1215, 0.93), move: "push", dur: 2.4 },
  // s02 "DSA. Data structures and algorithms": punch onto the tag as the thread slams into it.
  { at: 255.55, ...V(2400, 1400, 1.7), move: "punch", dur: 0.3 },
  // s03 "stuck with it since the start": glide back along the thread with the bead to the knot.
  { at: 258.2, ...V(1000, 1300, 1.15), move: "glide", dur: 1.15 },
  // s04 "I believe it'll stay relevant… five or six years": push onto the tape measure, then glide out with the tape as it pulls.
  { at: 260.2, ...V(3060, 1330, 1.45), move: "push", dur: 1.0 },
  { at: 262.3, ...V(3655, 1300, 0.95), move: "glide", dur: 1.4 },
  // s05 "how someone's thinking process… gets checked": glide down onto the sheet, punch as the magnifier lands.
  { at: 265.55, ...V(4200, 2030, 1.45), move: "glide", dur: 0.8 },
  { at: 269.8, ...V(4130, 2060, 1.62), move: "punch", dur: 0.3 },
  // s06 "That's my bet": pull back to the tag as the chip drops.
  { at: 270.6, ...V(2560, 1460, 1.2), move: "pull", dur: 1.0 },
  // s07 "what I'm sure about, not what's proven": push onto the pencil note under the thread.
  { at: 274.2, ...V(1120, 1580, 1.6), move: "push", dur: 0.9 },
  // s08 "not 'go learn DSA'": hard cut in tight on the sign, ease back while it is scribbled out.
  { at: 277.6, ...V(1300, 585, 1.74), move: "cut" },
  { at: 277.65, ...V(1300, 600, 1.55), move: "pull", dur: 2.4 },
  // s09 "out of everything I touched": push down onto the practice footage hanging from the thread.
  { at: 281.95, ...V(1900, 1990, 1.85), move: "push", dur: 0.9 },
  // s10 "Nothing guarantees it": glide back to the tag, the chip wobbling.
  { at: 287.3, ...V(2490, 1470, 1.3), move: "glide", dur: 0.8 },
  // s11 "what I'd bet on": pull back to the whole chain over its glowing thread, then a slow push into the page turn.
  { at: 289.6, ...V(1603, 1170, 0.78), move: "pull", dur: 1.6 },
  { at: 291.3, ...V(1603, 1165, 0.805), move: "push", dur: 1.5 },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

const Page5: FC = () => {
  const { t } = useTime();
  // Small camera kicks on the two impacts (the DSA slam, the chip landing), outside the rig so they never fight the shot list.
  const kick = (at: number) => (t >= at && t < at + 0.5 ? Math.exp(-(t - at) * 12) * Math.sin((t - at) * 70) * 7 : 0);
  const k = kick(SLAM) + kick(CHIP_AT + 0.16);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{ transform: `translate(${k}px, ${-k * 0.6}px)` }}>
        <Camera world={WORLD} shots={SHOTS} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
          <Layer depth={1}>
            <PageWorld />
            <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <SignBoard />
              <TapeMeasure />
              <CheckSheet />
              <PencilNote />
              <SinceStart />
              <CoralThread />
              <ChainBack />
              <HangingFrame />
              <DsaTag />
              <TagWords />
              <Closing />
            </svg>
          </Layer>
        </Camera>
      </AbsoluteFill>
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}22 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ---------- new piece: PaperTurn, the sketchbook page lifts from its right edge and turns over onto a clean page (5→6, used once) ----------
const TURN_AT = 292.82;
const TURN_DUR = 0.62;
const Beat05: FC = () => {
  const { t } = useTime();
  if (t < START || t >= END) return null;
  const turn = ramp(t, TURN_AT, TURN_DUR, Easing.in(Easing.quad));
  if (turn <= 0) return <Page5 />;
  const ang = 92 * turn;
  const lift = Math.sin((ang * Math.PI) / 180);
  return (
    <AbsoluteFill>
      <Paper />
      {/* the turning page's shadow on the next page, deepest near the spine */}
      <AbsoluteFill style={{ background: `linear-gradient(to right, ${INK}55 0%, ${INK}00 ${18 + 50 * (1 - lift)}%)`, opacity: lift }} />
      {ang < 90 && (
        <AbsoluteFill style={{ transformOrigin: "0% 50%", transform: `perspective(3800px) rotateY(${-ang}deg)`, backfaceVisibility: "hidden" }}>
          <Page5 />
          <AbsoluteFill style={{ background: `linear-gradient(to left, ${INK}66 0%, ${INK}00 45%)`, opacity: lift * 0.8 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export default Beat05;
