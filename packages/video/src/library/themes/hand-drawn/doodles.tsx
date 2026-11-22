// Hand-drawn doodles: small sketched icons (play button, bulb, robot, laptop, chart, cloud, checklist, runner…) drawn on with a progress value.
import type { FC } from "react";
import { seg } from "../../core/time";
import { useTime } from "../../core/time";
import { INK, PENCIL } from "./theme";
import { arcPts, blobPts, cloudPts, ellPts, linePts, rectPts, type P } from "./geometry";
import { Hand, Sk } from "./primitives";
// ---------- doodles (local coordinates around 0,0; p is draw progress) ----------
export const RotArrows: FC<{ r: number; p: number; seed: number }> = ({ r, p, seed }) => (
  <>
    <Sk pts={arcPts(0, 0, r, r, -2.9, -0.55)} p={seg(p, 0, 2)} w={5} seed={seed} head />
    <Sk pts={arcPts(0, 0, r, r, 0.25, 2.6)} p={seg(p, 1, 2)} w={5} seed={seed + 1} head />
  </>
);

export const Laptop: FC<{ p: number; typed: (k: number) => number }> = ({ p, typed }) => {
  const lens = [150, 110, 170, 90, 135];
  const ind = [0, 30, 30, 60, 0];
  return (
    <>
      <Sk pts={rectPts(-150, -120, 300, 190, 61)} p={seg(p, 0, 2)} w={5} seed={61} />
      <Sk pts={[[-165, 74], [0, 74], [165, 74], [182, 87], [200, 100], [0, 100], [-200, 100], [-182, 87], [-165, 74]]} p={seg(p, 1, 2)} w={5} seed={62} amp={1.2} />
      {lens.map((l, k) => (
        <Sk key={k} pts={linePts(-115 + ind[k]!, -88 + k * 30, -115 + ind[k]! + l, -88 + k * 30, 70 + k, 0.01, 6)} p={typed(k)} w={6} color={k === 2 ? PENCIL : INK} seed={70 + k} ghost={false} />
      ))}
    </>
  );
};

export const Robot: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={rectPts(-36, -30, 72, 58, 81)} p={seg(p, 0, 4)} w={4.5} seed={81} />
    <Sk pts={ellPts(-14, -6, 6, 6, 82)} p={seg(p, 1, 4)} w={5} seed={82} ghost={false} />
    <Sk pts={ellPts(14, -6, 6, 6, 83)} p={seg(p, 1, 4)} w={5} seed={83} ghost={false} />
    <Sk pts={linePts(-12, 14, 12, 14, 84, 0.1, 4)} p={seg(p, 2, 4)} w={4} seed={84} />
    <Sk pts={linePts(0, -30, 0, -48, 85, 0.05, 3)} p={seg(p, 3, 4)} w={4} seed={85} />
    <Sk pts={ellPts(0, -54, 6, 6, 86)} p={seg(p, 3, 4)} w={4} seed={86} ghost={false} />
  </>
);

export const PlayBtn: FC<{ p: number; seed: number }> = ({ p, seed }) => (
  <>
    <Sk pts={blobPts(0, 0, 124, 86, seed)} p={seg(p, 0, 2)} w={5} seed={seed} />
    <Sk pts={[[-14, -22], [24, 0], [-14, 22], [-14, -22], [-10, -18]]} p={seg(p, 1, 2)} w={5} seed={seed + 1} amp={1.5} />
  </>
);

export const Bulb: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={arcPts(0, -12, 34, 36, 2.2, 7.25, 20)} p={seg(p, 0, 3)} w={4.5} seed={91} />
    <Sk pts={linePts(-14, 26, 14, 26, 92, 0.05, 3)} p={seg(p, 1, 3)} w={4.5} seed={92} />
    <Sk pts={linePts(-10, 36, 10, 36, 93, 0.05, 3)} p={seg(p, 1, 3)} w={4.5} seed={93} />
    {[-2.4, -1.57, -0.74].map((a, k) => (
      <Sk key={k} pts={linePts(Math.cos(a) * 50, -12 + Math.sin(a) * 50, Math.cos(a) * 66, -12 + Math.sin(a) * 66, 94 + k, 0.05, 2)} p={seg(p, 2, 3)} w={4} seed={94 + k} ghost={false} />
    ))}
  </>
);

export const MiniChain: FC<{ p: number }> = ({ p }) => (
  <>
    {[-56, 0, 56].map((x, k) => (
      <Sk key={k} pts={ellPts(x, 0, 38, 22, 110 + k)} p={seg(p, k, 3)} w={5} seed={110 + k} />
    ))}
  </>
);

export const Research: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={rectPts(-62, -66, 96, 124, 121)} p={seg(p, 0, 3)} w={4.5} seed={121} />
    {[0, 1, 2, 3].map((k) => (
      <Sk key={k} pts={linePts(-46, -40 + k * 22, k === 3 ? -10 : 18, -40 + k * 22, 125 + k, 0.03, 4)} p={seg(p, 1, 3)} w={4} color={PENCIL} seed={125 + k} ghost={false} />
    ))}
    <Sk pts={ellPts(24, 22, 32, 32, 131)} p={seg(p, 2, 3)} w={5} seed={131} />
    <Sk pts={linePts(48, 46, 78, 78, 132, 0.03, 3)} p={seg(p, 2, 3)} w={7} seed={132} />
  </>
);

export const Checklist: FC<{ p: number }> = ({ p }) => (
  <>
    {[0, 1, 2].map((k) => (
      <g key={k}>
        <Sk pts={rectPts(-62, -50 + k * 40, 26, 26, 141 + k)} p={seg(p, k, 3)} w={4} seed={141 + k} ghost={false} />
        <Sk pts={linePts(-22, -37 + k * 40, 50 - k * 14, -37 + k * 40, 145 + k, 0.04, 4)} p={seg(p, k, 3)} w={4} color={PENCIL} seed={145 + k} ghost={false} />
      </g>
    ))}
  </>
);

export const NetGraph: FC<{ p: number }> = ({ p }) => {
  const n: P[] = [[-64, 10], [10, -40], [62, 26], [-6, 50]];
  return (
    <>
      {[[0, 1], [1, 2], [2, 3], [3, 0], [1, 3]].map(([a, b], k) => (
        <Sk key={k} pts={linePts(n[a!]![0], n[a!]![1], n[b!]![0], n[b!]![1], 150 + k, 0.05, 4)} p={seg(p, 1, 2)} w={3.5} color={PENCIL} seed={150 + k} ghost={false} />
      ))}
      {n.map(([x, y], k) => (
        <Sk key={k} pts={ellPts(x, y, 15, 15, 160 + k)} p={seg(p, 0, 2)} w={4.5} seed={160 + k} />
      ))}
    </>
  );
};

export const Packet: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={rectPts(-84, -30, 168, 60, 171)} p={seg(p, 0, 2)} w={4.5} seed={171} />
    <Sk pts={linePts(-26, -30, -26, 30, 172, 0.03, 3)} p={seg(p, 1, 2)} w={4} seed={172} />
    <Hand x={-55} y={10} text="HDR" size={28} p={seg(p, 1, 2)} />
    <Hand x={30} y={10} text="DATA" size={28} p={seg(p, 1, 2)} />
  </>
);

export const Chart: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={linePts(-100, -80, -100, 70, 181, 0.01, 4)} p={seg(p, 0, 2)} w={4} seed={181} />
    <Sk pts={linePts(-100, 70, 110, 70, 182, 0.01, 4)} p={seg(p, 0, 2)} w={4} seed={182} />
    <Sk pts={Array.from({ length: 13 }, (_, i) => [-92 + i * 17, 62 - Math.pow(i / 12, 3.2) * 140] as P)} p={seg(p, 1, 2)} w={6} seed={183} head />
  </>
);

export const CloudBoxes: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={cloudPts(0, 0, 110, 62, 191)} p={seg(p, 0, 2)} w={4.5} seed={191} />
    {[[-52, -12], [-6, -22], [40, -10], [-22, 22], [24, 20]].map(([x, y], k) => (
      <Sk key={k} pts={rectPts(x! - 13, y! - 11, 26, 22, 193 + k)} p={seg(p, 1, 2)} w={3.5} seed={193 + k} ghost={false} />
    ))}
  </>
);

// Two poses swapped every 5 frames: enough to read as running, still clearly a doodle.
export const Runner: FC<{ p: number }> = ({ p }) => {
  const { f } = useTime();
  const a = Math.floor(f / 5) % 2 === 0;
  const legs: P[][] = a
    ? [[[4, -8], [-14, 18], [-30, 34]], [[4, -8], [24, 16], [34, 40]]]
    : [[[4, -8], [-4, 18], [8, 42]], [[4, -8], [18, 14], [4, 36]]];
  const arms: P[][] = a
    ? [[[2, -44], [-22, -30], [-30, -12]], [[2, -44], [24, -36], [38, -50]]]
    : [[[2, -44], [22, -28], [30, -12]], [[2, -44], [-18, -38], [-30, -52]]];
  return (
    <>
      <Sk pts={ellPts(0, -70, 14, 14, 201)} p={p} w={5} seed={201} ghost={false} />
      <Sk pts={linePts(0, -56, 4, -8, 202, 0.05, 3)} p={p} w={5} seed={202} ghost={false} />
      {[...legs, ...arms].map((l, k) => (
        <Sk key={k} pts={l} p={p} w={5} seed={203 + k} ghost={false} amp={1.2} />
      ))}
      {[-34, -10, 14].map((y, k) => (
        <Sk key={`m${k}`} pts={linePts(-48, y, -82 - k * 8, y, 210 + k, 0.02, 2)} p={p} w={3.5} color={PENCIL} seed={210 + k} ghost={false} />
      ))}
    </>
  );
};
