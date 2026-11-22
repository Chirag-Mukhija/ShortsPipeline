// Video 001, Beat 1 (0:00–0:39): the hook on one big sketch page, a fast camera whipping, punching and gliding between the doodles, the chain, the question and the map.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, ramp, useTime, type Point, type Rect, type Shot } from "@library/core";
import {
  At, Chain, Checklist, GRAIN, Hand, Laptop, MiniChain, NW, Paper,
  Research, Robot, RotArrows, Sk, Stations, WordLine, curvePts, ellPts, linePts, wr,
  type LinkLook, type NodeLook, type P } from "@library/themes/hand-drawn";
import { NODES } from "./shared";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL } = STYLE;

// One page, three regions: A = the hook doodles, B = the chain (right of A), C = the question and the map (below B).
const WORLD = { w: 4900, h: 3500 };
const A = { x: 240, y: 360 };
const B = { x: 2500, y: 300 };
const C = { x: 2500, y: 1750 };
const END = 39.2;

// ---------- new piece: PencilTip, the creator's pencil riding the end of the line it is drawing ----------
const PencilTip: FC<{ x: number; y: number; o: number; angle?: number; s?: number }> = ({ x, y, o, angle = -28, s = 0.8 }) => {
  if (o <= 0) return null;
  const body: P[] = [[50, -17], [262, -17], [262, 17], [50, 17], [50, -17]];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`} opacity={o}>
      <polygon points="0,0 50,-17 262,-17 262,17 50,17" fill={PAPER} />
      <polygon points="0,0 15,-5 15,5" fill={INK} />
      <Sk pts={[[50, -17], [0, 0], [50, 17]]} w={3.6} seed={951} amp={0.8} ghost={false} />
      <Sk pts={body} w={3.6} seed={952} amp={1} />
      <Sk pts={linePts(60, 0, 228, 0, 953, 0.01, 5)} w={2.4} color={PENCIL} seed={953} ghost={false} />
      <Sk pts={linePts(228, -17, 228, 17, 954, 0.02, 3)} w={3.2} seed={954} ghost={false} />
      <Sk pts={linePts(242, -17, 242, 17, 955, 0.02, 3)} w={3.2} seed={955} ghost={false} />
      <polygon points="262,-17 286,-15 286,15 262,17" fill={ACCENT} opacity={0.85} />
      <Sk pts={[[262, -17], [286, -15], [286, 15], [262, 17]]} w={3.2} seed={956} amp={0.8} ghost={false} />
    </g>
  );
};

// ---------- new piece: SwingTag, a hang tag that drops on its string and swings to rest ----------
const SwingTag: FC<{ x: number; y: number; at: number; children: ReactNode }> = ({ x, y, at, children }) => {
  const { t } = useTime();
  if (t < at) return null;
  const drop = ramp(t, at, 0.4, Easing.out(Easing.back(2.2)));
  const tau = t - at;
  // Damped pendulum: starts kicked to one side, settles in about 1.5 s; never fully still so the hold breathes.
  const swing = 24 * Math.exp(-2.4 * tau) * Math.cos(6.5 * tau) + 1.2 * Math.sin(t * 1.7);
  const len = 70 * drop;
  const tag: P[] = [...linePts(-82, 112, -40, 72, 961, 0.02, 3), ...linePts(-40, 72, 40, 72, 962, 0.02, 3), ...linePts(40, 72, 82, 112, 963, 0.02, 3),
    ...linePts(82, 112, 82, 300, 964, 0.02, 5), ...linePts(82, 300, -82, 300, 965, 0.02, 5), ...linePts(-82, 300, -82, 112, 966, 0.02, 5)];
  return (
    <g transform={`translate(${x} ${y}) rotate(${swing})`}>
      <Sk pts={linePts(0, 0, 0, len + 26, 967, 0.06, 4)} w={3} color={PENCIL} seed={967} ghost={false} />
      <g transform={`translate(0 ${len - 70})`} opacity={clamp01(drop * 3)}>
        <polygon points="-82,112 -40,72 40,72 82,112 82,300 -82,300" fill={PAPER} />
        <Sk pts={tag} p={ramp(t, at, 0.45)} w={4.5} seed={961} />
        <Sk pts={ellPts(0, 96, 11, 11, 968)} p={ramp(t, at + 0.1, 0.3)} w={3.6} seed={968} ghost={false} />
        <At x={0} y={205} s={1.45}>{children}</At>
      </g>
    </g>
  );
};

// ---------- region A: switching tech, AI writes your code, the first question ----------
const HookDoodles: FC = () => {
  const { t } = useTime();
  return (
    <>
      <Hand x={A.x + 470} y={A.y + 300} text="switching tech" size={80} p={wr(t, 0.92, "switching tech")} />
      <At x={A.x + 470} y={A.y + 455} r={t * 95}>
        <RotArrows r={80} p={ramp(t, -0.25, 0.7)} seed={3} />
      </At>
      <Hand x={A.x + 1430} y={A.y + 300} text="AI writes your code" size={80} p={wr(t, 2.38, "AI writes your code")} />
      <At x={A.x + 1430} y={A.y + 470}>
        <Laptop p={ramp(t, 1.9, 0.6)} typed={(k) => clamp01((t - 3.05) * 2.4 - k * 0.6)} />
      </At>
      <Hand x={A.x + 470} y={A.y + 655} text="(I don't stop either)" size={52} color={PENCIL} rotate={-4} p={wr(t, 6.3, "(I don't stop either)")} />
      <Sk pts={curvePts(A.x + 640, A.y + 612, A.x + 690, A.y + 520, A.x + 572, A.y + 470)} p={ramp(t, 6.95, 0.4)} w={4} color={PENCIL} seed={9} head />
    </>
  );
};

// ---------- region B: the chain draws on as each name is said, the pencil leading the timeline ----------
const T_NODE = [10.48, 11.42, 12.6, 14.34, 15.22, 16.24];
const BN = NODES.map((n) => ({ ...n, x: n.x + B.x, y: n.y + B.y }));
const LINE = { x1: B.x + 80, y1: B.y + 700, x2: B.x + 1855, y2: B.y + 694 };
const TAG = { x: B.x + 1450, y: B.y + 697 };

const ChainWorld: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = BN.map((n, i) => {
    const tn = T_NODE[i]!;
    const next = T_NODE[i + 1];
    return {
      draw: ramp(t, tn - 0.32, 0.6, INOUT),
      label: [wr(t, tn - 0.05, n.label[0]!), i === 5 ? wr(t, 17.08, "DevOps") : wr(t, tn + 0.15, n.label[1] ?? "")],
      ink: next === undefined ? 1 : 1 - ramp(t, next, 0.5),
      bold: ramp(t, tn, 0.3) * (next === undefined ? 1 - ramp(t, 18.6, 0.6) : 1 - ramp(t, next, 0.4)),
    };
  });
  const links: LinkLook[] = BN.slice(1).map((_, i) => ({ p: ramp(t, T_NODE[i + 1]! - 0.5, 0.4), ink: looks[i + 1]!.ink }));
  const edges = BN.map((n) => n.x + NW / 2);
  const endX = interpolate(t, [9.2, 10.8, 11.75, 12.95, 14.65, 15.55, 17.4], [LINE.x1, ...edges], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineP = (endX - LINE.x1) / (LINE.x2 - LINE.x1);
  const penY = LINE.y1 + ((LINE.y2 - LINE.y1) * lineP) - 3;
  // The pencil drops onto the page on "So", rides the line, and lifts off when the chain is complete.
  const penIn = ramp(t, 7.95, 0.35, POP);
  const penOut = ramp(t, 17.45, 0.45, Easing.in(Easing.cubic));
  return (
    <>
      <Sk pts={linePts(LINE.x1, LINE.y1, LINE.x2, LINE.y2, 501, 0.004, 40)} p={lineP} w={3.5} color={PENCIL} seed={501} head ghost={false} />
      <Hand x={B.x + 88} y={B.y + 760} text="a few months" size={46} anchor="start" color={PENCIL} rotate={-1.5} p={wr(t, 9.18, "a few months")} opacity={1 - ramp(t, 18.5, 0.4)} />
      <Chain nodes={BN} looks={looks} links={links} />
      <Hand x={B.x + 960} y={B.y + 900} text="most of what I finished..." size={62} p={wr(t, 19.02, "most of what I finished...")} />
      <Hand x={B.x + 960} y={B.y + 1030} text="an agent wrote it." size={62} p={wr(t, 22.6, "an agent wrote it.")} />
      <SwingTag x={TAG.x} y={TAG.y} at={23.5}>
        <Robot p={ramp(t, 23.56, 0.6)} />
      </SwingTag>
      <PencilTip x={endX + penOut * 90} y={penY - 140 * (1 - penIn) - penOut * 260} o={clamp01(penIn * 2) * (1 - penOut)} angle={-28 + 5 * Math.sin(t * 22) * ramp(t, 9.2, 0.2) * (1 - ramp(t, 17.3, 0.2))} />
    </>
  );
};

// ---------- region C: the question pops word by word, then the three stops of the video ----------
const QY = [300, 460, 695];
const MapWorld: FC = () => {
  const { t } = useTime();
  const st = [
    { x: C.x + 430, t: 31.16, label: "the chain", icon: (p: number) => <MiniChain p={p} /> },
    { x: C.x + 960, t: 32.46, label: "the research", icon: (p: number) => <Research p={p} /> },
    { x: C.x + 1490, t: 34.28, label: "what I'm doing", icon: (p: number) => <Checklist p={p} /> },
  ];
  return (
    <>
      <Stations stations={st} y={C.y + 1120} labelY={C.y + 1310} />
      <Hand x={C.x + 1490} y={C.y + 1425} text="(still sorting it out myself)" size={48} color={PENCIL} rotate={-3} p={wr(t, 36.42, "(still sorting it out myself)")} />
    </>
  );
};

const QuestionWords: FC = () => (
  <div style={{ position: "absolute", left: C.x, top: C.y, width: 1920, height: 1080 }}>
    <WordLine y={QY[0]!} size={124} mode="pop" words={[{ w: "If", t: 25.48 }, { w: "AI", t: 25.7 }, { w: "can", t: 25.88 }, { w: "write", t: 26.12 }, { w: "code,", t: 26.46 }]} />
    <WordLine y={QY[1]!} size={124} mode="pop" words={[{ w: "what", t: 27.14 }, { w: "should", t: 27.36 }, { w: "I", t: 27.52 }, { w: "be", t: 27.64 }]} />
    <WordLine y={QY[2]!} size={124} mode="pop" words={[{ w: "learning?", t: 27.76, accent: true, underline: true, scale: 1.95 }]} />
  </div>
);

const HookQuestion: FC = () => (
  <div style={{ position: "absolute", left: A.x, top: A.y, width: 1920, height: 1080 }}>
    <WordLine y={830} size={104} mode="write" words={[{ w: "what", t: 4.45 }, { w: "are", t: 4.95 }, { w: "you", t: 5.13 }, { w: "even", t: 5.23 }, { w: "learning?", t: 5.47, underline: true }]} />
  </div>
);

// ---------- the shot list: every move lands on a spoken word ----------
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const pt = (x: number, y: number, r: number): Point => ({ x, y, r });
// A view by centre and scale (fill 1 of a frame-sized rect).
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });
const nodeR = (i: number) => R(BN[i]!.x - 300, 740, 600, 300);
const SHOTS: Shot[] = [
  // "If you keep switching tech": born on the spinning arrows, creeping in, then snapping back to reveal the words.
  { at: 0, target: pt(A.x + 470, A.y + 455, 130), size: 0.78 },
  { at: 0.02, size: 0.95, move: "push", dur: 0.72 },
  { at: 0.76, target: R(A.x + 160, A.y + 220, 620, 340), size: "cu", move: "pull", dur: 0.45 },
  // "and AI writes your code": whip right to the laptop, punch into the screen as the code types itself.
  { at: 1.56, target: R(A.x + 1070, A.y + 220, 720, 370), size: "cu", move: "whip", dur: 0.3 },
  { at: 3.08, target: R(A.x + 1280, A.y + 350, 300, 190), size: 0.72, move: "punch", dur: 0.3 },
  // "what are you even learning?": pull back to the whole page, then a small punch on "learning".
  { at: 4.02, target: R(A.x + 140, A.y + 210, 1640, 700), size: 0.9, move: "pull", dur: 0.5 },
  { at: 5.34, target: R(A.x + 320, A.y + 720, 1280, 180), size: 0.85, move: "punch", dur: 0.3 },
  // "I don't stop either": glide back to the arrows for the aside, creep in while its arrow draws.
  { at: 6.1, target: R(A.x + 150, A.y + 235, 640, 460), size: 0.76, move: "glide", dur: 0.45 },
  { at: 6.95, size: 0.84, move: "push", dur: 0.8 },
  // "So basically": whip to the start of the timeline, creep in while the pencil waits and "a few months" writes.
  { at: 7.78, target: R(B.x + 40, B.y + 460, 520, 360), size: "cu", move: "whip", dur: 0.32 },
  { at: 8.2, size: 0.86, move: "push", dur: 1.6 },
  // Each link: push, glide, snap, wide glide, glide, glide, punch: the camera rides the pencil along the chain.
  { at: 10.04, target: nodeR(0), size: "cu", move: "push", dur: 0.45 },
  { at: 11.04, target: nodeR(1), size: "cu", move: "glide", dur: 0.4 },
  { at: 12.24, target: nodeR(2), size: 0.88, move: "punch", dur: 0.32 },
  { at: 13.94, target: R((BN[2]!.x + BN[3]!.x) / 2 - 450, 740, 900, 300), size: 0.75, move: "glide", dur: 0.45 },
  { at: 14.86, target: nodeR(4), size: "cu", move: "glide", dur: 0.4 },
  { at: 15.86, target: nodeR(5), size: "cu", move: "glide", dur: 0.4 },
  { at: 16.98, size: 0.9, move: "punch", dur: 0.3 },
  // "And honestly": fast pull back to the whole chain.
  { at: 17.44, target: R(B.x + 40, 740, 1840, 340), size: 0.92, move: "pull", dur: 0.9 },
  // "most of what I finished": push down onto the line, punch on "finished".
  { at: 18.88, ...V(B.x + 960, 1250, 1.6), move: "push", dur: 0.8 },
  { at: 21.34, ...V(B.x + 960, 1205, 1.92), move: "punch", dur: 0.3 },
  // "an agent wrote it": glide to take in the tag, punch as it drops on "agent", pull back to the whole chain.
  // These three views keep their top edge just under the links, so no half-cut label sits on the frame edge.
  { at: 22.28, ...V(B.x + 1090, 1286, 1.54), move: "glide", dur: 0.45 },
  { at: 23.46, ...V(B.x + 1130, 1219, 1.9), move: "punch", dur: 0.3 },
  { at: 24.2, target: R(B.x + 40, 740, 1840, 600), size: 0.92, move: "pull", dur: 0.7 },
  // "So, if AI can write code": whip down, the chain flies up out of frame and blurs; settle on each line.
  { at: 25.0, target: R(C.x + 380, C.y + 200, 1160, 200), size: 0.8, move: "whip", dur: 0.36 },
  { at: 26.86, target: R(C.x + 380, C.y + 200, 1160, 380), size: 0.85, move: "glide", dur: 0.4 },
  { at: 27.52, target: R(C.x + 500, C.y + 430, 920, 480), size: 0.85, move: "punch", dur: 0.3 },
  // "That's what this video is for": pull back so the whole question holds and reads.
  { at: 28.4, target: R(C.x + 340, C.y + 200, 1240, 700), size: 0.88, move: "pull", dur: 0.8 },
  { at: 29.3, size: 0.92, move: "push", dur: 1.1 },
  // "walk you through the chain, research, what I'm doing": whip down to the first stop, glide along the dotted path.
  { at: 30.5, target: R(C.x + 230, C.y + 970, 400, 400), size: 0.75, move: "whip", dur: 0.34 },
  { at: 31.85, target: R(C.x + 760, C.y + 970, 400, 400), size: 0.75, move: "glide", dur: 0.6 },
  { at: 33.34, target: R(C.x + 1290, C.y + 970, 400, 400), size: 0.75, move: "glide", dur: 0.75 },
  // Pull back to the map, push onto the aside, then whip back into the chain the next beat walks through.
  { at: 35.1, target: R(C.x + 120, C.y + 200, 1700, 1260), size: 0.92, move: "pull", dur: 1.0 },
  { at: 36.22, ...V(C.x + 1300, C.y + 1225, 1.71), move: "push", dur: 0.6 },
  { at: 38.36, target: R(C.x + 230, C.y + 970, 400, 400), size: 0.75, move: "whip", dur: 0.34 },
  { at: 38.72, target: pt(C.x + 430, C.y + 1120, 80), size: 0.95, move: "push", dur: 0.48 },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

const Beat01: FC = () => {
  const { t } = useTime();
  if (t < 0 || t >= END) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Camera world={WORLD} shots={SHOTS} breath={1.6} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
        <Layer depth={1}>
          <PageWorld />
          <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {t < 8.6 && <HookDoodles />}
            {t >= 7.7 && t < 25.6 && <ChainWorld />}
            {t >= 24.9 && <MapWorld />}
          </svg>
          {t >= 4.3 && t < 8.6 && <HookQuestion />}
          {t >= 25.3 && <QuestionWords />}
        </Layer>
      </Camera>
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(90,70,40,0.13) 100%)", pointerEvents: "none" }} />
      {/* Hand-off: the dive into the chain settles on clean paper, the first frame of beat 2. */}
      <AbsoluteFill style={{ opacity: ramp(t, 38.84, 0.26, Easing.in(Easing.quad)) }}>
        <Paper />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default Beat01;
