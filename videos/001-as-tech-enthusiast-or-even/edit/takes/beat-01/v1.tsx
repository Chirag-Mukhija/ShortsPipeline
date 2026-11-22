// Video 001, Beat 1 (0:00–0:39): the hook, the chain drawing on as each topic is named, and the question becoming the video's map. From the one-shot benchmark.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { INOUT, POP, camAt, clamp01, ramp, useTime } from "@library/core";
import {
  At, Chain, Checklist, Hand, Laptop, MiniChain, NW, PENCIL, Paper,
  Research, Robot, RotArrows, Sk, Stage, Stations, WordLine,
  curvePts, linePts, wr,
  type LinkLook, type NodeLook } from "@library/themes/hand-drawn";
import { NODES } from "./shared";

// ---------- Beat 1, 0:00–0:08 — the hook question, before the chain ----------
const Hook: FC = () => {
  const { t } = useTime();
  const out = ramp(t, 7.75, 0.5, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 10}px)`, transform: `translateY(${-out * 40}px)` }}>
      <Stage>
        <Hand x={470} y={300} text="switching tech" size={80} p={wr(t, 1.0, "switching tech")} />
        <At x={470} y={455} r={t * 55}>
          <RotArrows r={80} p={ramp(t, 1.3, 0.7)} seed={3} />
        </At>
        <Hand x={1430} y={300} text="AI writes your code" size={80} p={wr(t, 2.45, "AI writes your code")} />
        <At x={1430} y={470}>
          <Laptop p={ramp(t, 2.5, 0.6)} typed={(k) => clamp01((t - 3.0) * 2.2 - k * 0.6)} />
        </At>
        <Hand x={470} y={655} text="(I don't stop either)" size={52} color={PENCIL} rotate={-4} p={wr(t, 6.33, "(I don't stop either)")} />
        <Sk pts={curvePts(640, 612, 690, 520, 572, 470)} p={ramp(t, 7.0, 0.4)} w={4} color={PENCIL} seed={9} head />
      </Stage>
      <WordLine
        y={830}
        size={104}
        mode="write"
        words={[
          { w: "what", t: 4.47 },
          { w: "are", t: 4.97 },
          { w: "you", t: 5.15 },
          { w: "even", t: 5.25 },
          { w: "learning?", t: 5.49, underline: true },
        ]}
      />
    </AbsoluteFill>
  );
};

// ---------- Beat 1, 0:08–0:25 — the chain draws on as each name is said ----------
const T_NODE = [10.48, 11.42, 12.6, 14.34, 15.22, 16.24];
const RIGHT_EDGES = NODES.map((n) => n.x + NW / 2);

const Chain1: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = NODES.map((n, i) => {
    const tn = T_NODE[i]!;
    const next = T_NODE[i + 1];
    return {
      draw: ramp(t, tn - 0.32, 0.6, INOUT),
      label: [wr(t, tn - 0.05, n.label[0]!), i === 5 ? wr(t, 17.12, "DevOps") : wr(t, tn + 0.15, n.label[1] ?? "")],
      ink: next === undefined ? 1 : 1 - ramp(t, next, 0.5),
      bold: ramp(t, tn, 0.3) * (next === undefined ? 1 - ramp(t, 18.6, 0.6) : 1 - ramp(t, next, 0.4)),
    };
  });
  const links: LinkLook[] = NODES.slice(1).map((_, i) => ({ p: ramp(t, T_NODE[i + 1]! - 0.5, 0.4), ink: looks[i + 1]!.ink }));
  const endX = interpolate(t, [9.2, 10.8, 11.75, 12.95, 14.65, 15.55, 17.4], [80, ...RIGHT_EDGES], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = ramp(t, 25.16, 0.75, Easing.in(Easing.cubic));
  const zoom = interpolate(t, [8, 25], [0.97, 1.04]);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 18}px)`, transform: `translateY(${-out * 320}px)` }}>
      <Stage>
        <g transform={camAt(t, [{ t: 0, x: 960, y: 590, s: zoom }])}>
          <Sk pts={linePts(80, 700, 1855, 694, 501, 0.004, 40)} p={(endX - 80) / (1855 - 80)} w={3.5} color={PENCIL} seed={501} head ghost={false} />
          <Hand x={88} y={760} text="a few months" size={46} anchor="start" color={PENCIL} rotate={-1.5} p={wr(t, 9.2, "a few months")} />
          <Chain nodes={NODES} looks={looks} links={links} />
          <Hand x={960} y={870} text="most of what I finished..." size={62} p={wr(t, 19.05, "most of what I finished...")} />
          <At x={760} y={936} s={0.85 * ramp(t, 23.55, 0.35, POP)}>
            <Robot p={ramp(t, 23.55, 0.6)} />
          </At>
          <Hand x={820} y={960} text="an agent wrote it." size={62} anchor="start" p={wr(t, 22.6, "an agent wrote it.")} />
        </g>
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- Beat 1, 0:25–0:38 — the question pops in word by word, then becomes the video's map ----------
const Question: FC = () => {
  const { t } = useTime();
  const up = ramp(t, 28.85, 0.75, INOUT);
  const out = ramp(t, 38.35, 0.5, Easing.in(Easing.cubic));
  const st = [
    { x: 430, t: 31.16, label: "the chain", icon: (p: number) => <MiniChain p={p} /> },
    { x: 960, t: 32.46, label: "the research", icon: (p: number) => <Research p={p} /> },
    { x: 1490, t: 34.28, label: "what I'm doing", icon: (p: number) => <Checklist p={p} /> },
  ];
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 10}px)` }}>
      <AbsoluteFill style={{ transform: `translateY(${-365 * up}px) scale(${1 - 0.56 * up})`, transformOrigin: "50% 50%" }}>
        <WordLine
          y={340}
          size={124}
          mode="pop"
          words={[
            { w: "If", t: 25.52 },
            { w: "AI", t: 25.74 },
            { w: "can", t: 25.92 },
            { w: "write", t: 26.16 },
            { w: "code,", t: 26.5 },
          ]}
        />
        <WordLine
          y={500}
          size={124}
          mode="pop"
          words={[
            { w: "what", t: 27.18 },
            { w: "should", t: 27.4 },
            { w: "I", t: 27.56 },
            { w: "be", t: 27.68 },
          ]}
        />
        <WordLine y={735} size={124} mode="pop" words={[{ w: "learning?", t: 27.82, accent: true, underline: true, scale: 1.95 }]} />
      </AbsoluteFill>
      <Stage>
        <Stations stations={st} />
        <Hand x={1490} y={880} text="(still sorting it out myself)" size={46} color={PENCIL} rotate={-3} p={wr(t, 36.45, "(still sorting it out myself)")} />
      </Stage>
    </AbsoluteFill>
  );
};

// Background stays on for the whole beat; each scene shows itself only in its own time window.
const Beat01: FC = () => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <Paper />
      {t < 8.4 && <Hook />}
      {t >= 7.9 && t < 26.2 && <Chain1 />}
      {t >= 25.2 && t < 39 && <Question />}
    </AbsoluteFill>
  );
};

export default Beat01;
