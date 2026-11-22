// One-shot test: Beats 1–2 of video 001 in the plan's hand-drawn iPad-sketch look, every move timed to the creator's recorded words. Built from the library's hand-drawn theme.
import type { FC } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useVideoConfig } from "remotion";
import { INOUT, POP, camAt, clamp01, fade, ramp, steps, useTime, type CamKey } from "../library/core";
import {
  At, Bulb, Chain, Chart, Checklist, CloudBoxes, HatchBar, Hand, Laptop, LinkView, MiniChain, NW, NetGraph, NodeView, PAPER, PENCIL, Packet, Paper,
  PlayBtn, QuestionEquals, Research, Robot, RotArrows, Runner, SANS, Sk, Stage, Stamp, Stations, WordLine,
  blobPts, chainMids, curvePts, linePts, rectPts, wr,
  type ChainNode, type LinkLook, type NodeLook, type P,
} from "../library/themes/hand-drawn";

export { FPS, W, H } from "../library/core";
// Beat 2's last word ends at 113.78 s and Beat 3 starts at 114.11 s (record/narration.json).
export const END_S = 114.0;

// The chain in story order (creator's call, 2026-11-14).
const NODES: ChainNode[] = [
  { label: ["Networking"], x: 185, y: 540, seed: 11 },
  { label: ["Custom", "Protocol"], x: 495, y: 524, seed: 23 },
  { label: ["Claude Code"], x: 805, y: 548, seed: 37 },
  { label: ["Backend"], x: 1115, y: 530, seed: 41 },
  { label: ["System", "Design"], x: 1425, y: 552, seed: 53 },
  { label: ["AWS /", "DevOps"], x: 1735, y: 534, seed: 67 },
];

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

// ---------- Beat 2, 0:40–1:25 — the chain again, zooming link by link through the story ----------
const INK_K: [number, number][][] = [
  [[0, 0.3], [42.9, 1], [49.3, 0.55]],
  [[0, 0.3], [49.3, 1], [56.9, 0.75], [65.5, 0]],
  [[0, 0.3], [54.4, 1], [58.6, 0.55]],
  [[0, 0.3], [59.7, 1], [62.0, 0.55]],
  [[0, 0.3], [62.0, 1], [67.6, 0.75], [76.3, 0]],
  [[0, 0.3], [72.4, 0.6], [74.2, 1]],
];
const BOLD_K: [number, number][][] = [
  [[0, 0], [42.9, 1], [49.3, 0]],
  [[0, 0], [49.3, 1], [54.4, 0], [56.9, 0.6], [58.4, 0]],
  [[0, 0], [54.4, 1], [58.6, 0]],
  [[0, 0], [59.7, 1], [62.0, 0]],
  [[0, 0], [62.0, 1], [67.1, 0]],
  [[0, 0], [74.2, 1], [77.6, 0]],
];
const CAM2: CamKey[] = [
  { t: 0, x: 960, y: 560, s: 1 },
  { t: 42.0, x: 345, y: 470, s: 1.9, d: 1.1 },
  { t: 51.6, x: 650, y: 450, s: 1.8, d: 1.0 },
  { t: 58.3, x: 1270, y: 450, s: 1.8, d: 1.0 },
  { t: 64.0, x: 960, y: 520, s: 1.0, d: 1.1 },
  { t: 66.9, x: 1590, y: 440, s: 1.7, d: 1.0 },
  { t: 77.2, x: 1080, y: 520, s: 0.85, d: 1.2 },
];
const MIDS = chainMids(NODES);

const Chain2: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = NODES.map((n, i) => ({
    draw: ramp(t, 39.6 + i * 0.14, 0.55, INOUT),
    label: [ramp(t, 39.9 + i * 0.14, 0.4), ramp(t, 40.0 + i * 0.14, 0.4)],
    ink: steps(t, INK_K[i]!),
    bold: steps(t, BOLD_K[i]!, 0.35),
  }));
  const links: LinkLook[] = NODES.slice(1).map((_, i) => ({ p: ramp(t, 39.75 + i * 0.14, 0.5), ink: Math.max(looks[i]!.ink, looks[i + 1]!.ink) * 0.85 }));
  const out = ramp(t, 84.35, 0.55, Easing.in(Easing.cubic));
  const next = NODES[5]!;
  const ghostNode: ChainNode = { label: ["?"], x: 2045, y: 546, seed: 79 };
  const pulse = 1 + 0.06 * Math.sin(t * 7);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 10}px)`, transform: `translateX(${-out * 220}px)` }}>
      <Stage>
        <g transform={camAt(t, CAM2)}>
          <Chain nodes={NODES} looks={looks} links={links} />

          {/* Networking → "your mind goes that way" → build something */}
          <At x={185} y={350} o={fade(t, 43.3, 51.6)}>
            <NetGraph p={ramp(t, 43.3, 0.8)} />
          </At>
          <Sk pts={curvePts(255, 320, 380, 250, 470, 440)} p={ramp(t, 45.7, 0.8, INOUT)} w={4} seed={701} head opacity={fade(t, 45.7, 51.6)} />
          <Hand x={330} y={232} text="build something!" size={46} rotate={-4} p={wr(t, 48.1, "build something!")} opacity={fade(t, 48, 51.6)} />
          <At x={640} y={345} o={fade(t, 49.5, 51.9)}>
            <Packet p={ramp(t, 49.55, 0.7)} />
          </At>

          {/* Halfway: the bar stays half full for the rest of the beat */}
          <HatchBar x={495} y={614} fill={0.5} at={50.8} ink={looks[1]!.ink} label="halfway" />

          {/* A video pops up → a new use case → Claude Code */}
          <At x={650} y={300} s={ramp(t, 52.0, 0.35, POP)} o={fade(t, 52.0, 56.6)}>
            <PlayBtn p={ramp(t, 52.0, 0.5)} seed={731} />
          </At>
          <At x={810} y={300} s={ramp(t, 53.65, 0.35, POP)} o={fade(t, 53.65, 56.6)}>
            <Bulb p={ramp(t, 53.65, 0.6)} />
          </At>
          <Hand x={810} y={218} text="new use case" size={38} color={PENCIL} p={wr(t, 53.8, "new use case")} opacity={fade(t, 53.7, 56.6)} />
          <Sk pts={curvePts(700, 350, 780, 380, 790, 470)} p={ramp(t, 54.4, 0.4)} w={4} seed={741} head opacity={fade(t, 54.4, 56.6)} />
          <Hand x={905} y={655} text="bought it ✓" size={38} color={PENCIL} rotate={5} p={wr(t, 55.6, "bought it ✓")} opacity={fade(t, 55.6, 63.8)} />
          <Sk pts={curvePts(560, 450, 650, 370, 760, 460)} p={ramp(t, 56.85, 0.5)} w={4.5} seed={751} head head2 opacity={fade(t, 56.8, 58.4)} />
          <Hand x={650} y={330} text="both at once" size={48} p={wr(t, 57.0, "both at once")} opacity={fade(t, 56.9, 58.4)} />

          {/* Backend → jump → system design */}
          <Sk pts={curvePts(1160, 462, 1270, 320, 1385, 470)} p={ramp(t, 61.5, 0.6, INOUT)} w={4.5} seed={761} dash="16 12" ghost={false} head opacity={fade(t, 61.4, 64.2)} />
          <Hand x={1270} y={330} text="jump!" size={50} rotate={-6} p={wr(t, 61.6, "jump!")} opacity={fade(t, 61.5, 64.2)} />
          <Hand x={495} y={430} text="faded out" size={44} color={PENCIL} rotate={-5} p={wr(t, 65.7, "faded out")} opacity={fade(t, 65.6, 76.9)} />

          {/* Another video: 1 → 1,000,000 users on AWS */}
          <At x={1290} y={300} s={ramp(t, 67.7, 0.35, POP)} o={fade(t, 67.7, 77.1)}>
            <PlayBtn p={ramp(t, 67.7, 0.5)} seed={771} />
          </At>
          <At x={1580} y={270} o={fade(t, 68.6, 77.1)}>
            <Chart p={ramp(t, 68.7, 2.0, INOUT)} />
          </At>
          <Hand x={1580} y={402} text="1 → 1,000,000 users" size={30} font={SANS} weight={700} p={wr(t, 68.75, "1 → 1,000,000 users")} opacity={fade(t, 68.7, 77.1)} />
          <At x={1890} y={280} s={ramp(t, 71.6, 0.35, POP)} o={fade(t, 71.6, 77.1)}>
            <CloudBoxes p={ramp(t, 71.6, 0.8)} />
          </At>
          <Hand x={1890} y={392} text="AWS services" size={40} color={PENCIL} p={wr(t, 72.3, "AWS services")} opacity={fade(t, 72.2, 77.1)} />
          <Hand x={1425} y={680} text="fading out too" size={44} color={PENCIL} rotate={4} p={wr(t, 76.3, "fading out too")} opacity={fade(t, 76.2, 84.4)} />

          {/* Every switch started the same way */}
          {MIDS.map(([x, y], i) => (
            <At key={i} x={x} y={y - 130} s={0.62 * ramp(t, 78.2 + i * 0.24, 0.35, POP)}>
              <PlayBtn p={ramp(t, 78.2 + i * 0.24, 0.45)} seed={781 + i * 3} />
            </At>
          ))}
          <Hand x={1080} y={250} text="a video, or a new use case." size={64} p={ramp(t, 79.9, 1.4, Easing.inOut(Easing.quad))} />
          <Hand x={1080} y={810} text="nothing planned." size={64} p={wr(t, 81.45, "nothing planned.")} />

          {/* ...and the next video is always right there */}
          <LinkView a={next} b={ghostNode} look={{ p: ramp(t, 82.55, 0.45), ink: 0.6 }} seed={791} dash="10 10" />
          <NodeView n={ghostNode} look={{ draw: ramp(t, 82.75, 0.6), label: [ramp(t, 83.2, 0.3)], ink: 0.6, bold: 0 }} dash="14 12" />
          <At x={2045} y={410} s={ramp(t, 83.0, 0.35, POP) * pulse}>
            <PlayBtn p={ramp(t, 83.0, 0.45)} seed={795} />
          </At>
        </g>
      </Stage>
      <Stage>
        <Hand x={120} y={150} text="how it actually went" size={64} anchor="start" p={wr(t, 40.82, "how it actually went")} opacity={1 - ramp(t, 42.2, 0.4)} />
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- Beat 2, 1:25–1:50 — the admission ----------
const Admit: FC = () => {
  const { t } = useTime();
  const inn = ramp(t, 84.6, 0.4);
  const dim = ramp(t, 104.2, 0.5, INOUT);
  const out = ramp(t, 109.45, 0.5, Easing.in(Easing.cubic));
  const runX = interpolate(t, [97.9, 100.0], [1440, 1690], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill style={{ opacity: inn * (1 - out), filter: `blur(${out * 10}px)` }}>
      <AbsoluteFill style={{ opacity: 1 - 0.85 * dim, filter: `blur(${dim * 5}px)` }}>
        <Stage>
          <Hand x={130} y={170} text="the part I have to admit" size={70} anchor="start" p={wr(t, 84.85, "the part I have to admit")} />
          <Sk pts={linePts(130, 196, 760, 190, 801, 0.01, 10)} p={ramp(t, 85.9, 0.5)} w={4.5} seed={801} />

          {/* something substantial → relief → finished by agents */}
          <Sk pts={rectPts(330, 400, 600, 330, 811)} p={ramp(t, 86.6, 0.7)} w={5} seed={811} />
          <Sk pts={rectPts(370, 438, 46, 46, 812)} p={ramp(t, 86.9, 0.35)} w={4.5} seed={812} ghost={false} />
          <Hand x={440} y={476} text="something substantial" size={54} anchor="start" p={wr(t, 87.3, "something substantial")} />
          {[0, 1, 2].map((k) => (
            <Sk key={k} pts={linePts(380, 545 + k * 40, 380 + [460, 380, 420][k]!, 545 + k * 40, 815 + k, 0.02, 6)} p={ramp(t, 88.0 + k * 0.2, 0.4)} w={4} color={PENCIL} seed={815 + k} ghost={false} />
          ))}
          <Hand x={1010} y={380} text="phew~" size={58} rotate={-8} color={PENCIL} p={wr(t, 90.0, "phew~")} />
          {[-0.9, -0.4, 0.1].map((a, k) => (
            <Sk key={k} pts={linePts(1010 + Math.cos(a - 1.3) * 80, 360 + Math.sin(a - 1.3) * 80, 1010 + Math.cos(a - 1.3) * 104, 360 + Math.sin(a - 1.3) * 104, 821 + k, 0.03, 2)} p={ramp(t, 90.5 + k * 0.08, 0.2)} w={4} color={PENCIL} seed={821 + k} ghost={false} />
          ))}
          <Sk pts={[[378, 462], [392, 478], [426, 424]]} p={ramp(t, 94.85, 0.3)} w={6} seed={831} amp={1.2} />
          <Stamp x={640} y={655} text="MADE BY AGENTS" at={93.75} />
          <At x={1000} y={660} s={0.8 * ramp(t, 93.4, 0.35, POP)}>
            <Robot p={ramp(t, 93.4, 0.6)} />
          </At>

          {/* running from the hard work, and going back is uphill */}
          <Sk pts={rectPts(1170, 420, 250, 140, 851)} p={ramp(t, 98.4, 0.45)} w={7} seed={851} />
          <Hand x={1295} y={505} text="hard work" size={56} p={wr(t, 98.6, "hard work")} />
          <At x={runX} y={560} o={ramp(t, 97.8, 0.3)}>
            <Runner p={ramp(t, 97.8, 0.4)} />
          </At>
          <Sk pts={blobPts(1720, 660, 190, 84, 861)} p={ramp(t, 99.9, 0.5)} w={3.5} color={PENCIL} seed={861} />
          <Hand x={1720} y={672} text="next thing" size={38} color={PENCIL} p={wr(t, 100.1, "next thing")} />
          <Sk
            pts={Array.from({ length: 16 }, (_, i) => {
              const u = i / 15;
              return [1640 - u * 420, 448 - u * 137 - 26 + Math.sin(u * 22) * 5] as P;
            })}
            p={interpolate(t, [101.05, 101.9, 102.6, 103.7], [0, 0.45, 0.55, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            w={5}
            seed={881}
            head
          />
          <Hand x={1420} y={262} text="going back = hard" size={50} rotate={-4} p={wr(t, 102.9, "going back = hard")} />
        </Stage>
      </AbsoluteFill>

      {/* "finished" =? learning */}
      <Stage>
        <QuestionEquals left={"“finished”"} right="learning" at={{ left: 105.3, eq: 106.5, q: 107.35, right: 108.85 }} opacity={dim} />
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- Beat 2, 1:50–1:54 — some of it carried over ----------
const Carry: FC = () => {
  const { t } = useTime();
  const looks: NodeLook[] = NODES.map((_, i) => ({ draw: ramp(t, 109.7 + i * 0.1, 0.5, INOUT), label: [ramp(t, 109.9 + i * 0.1, 0.3), ramp(t, 110 + i * 0.1, 0.3)], ink: 0.45, bold: 0 }));
  const links: LinkLook[] = NODES.slice(1).map((_, i) => ({ p: ramp(t, 109.85 + i * 0.1, 0.4), ink: 0.45 }));
  const zoom = interpolate(t, [109.7, 114], [1.0, 1.035]);
  return (
    <AbsoluteFill>
      <Stage>
        <g transform={camAt(t, [{ t: 0, x: 960, y: 580, s: zoom }])}>
          <Chain nodes={NODES} looks={looks} links={links} />
          {MIDS.map(([mx], i) => {
            const a = NODES[i]!;
            const b = NODES[i + 1]!;
            return <Sk key={i} pts={curvePts(a.x + 20, a.y + 72, mx, 730, b.x - 20, b.y + 72, 18)} p={ramp(t, 112.05 + i * 0.2, 0.5)} w={5} seed={901 + i} dash="2 13" ghost={false} head />;
          })}
          <Hand x={960} y={860} text="some of it carried over" size={64} p={wr(t, 112.2, "some of it carried over")} />
        </g>
      </Stage>
    </AbsoluteFill>
  );
};

export const Beats12: FC = () => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <Paper />
      <Audio src={staticFile("narration.wav")} volume={(f) => interpolate(f / fps, [END_S - 0.2, END_S], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      {t < 8.4 && <Hook />}
      {t >= 7.9 && t < 26.2 && <Chain1 />}
      {t >= 25.2 && t < 39 && <Question />}
      {t >= 39.4 && t < 85 && <Chain2 />}
      {t >= 84.6 && t < 110.2 && <Admit />}
      {t >= 109.6 && <Carry />}
    </AbsoluteFill>
  );
};
