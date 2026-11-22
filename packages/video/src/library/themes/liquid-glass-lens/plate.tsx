// GlassPlate: the drawn sunlit bamboo grove every lens refracts (depth layers, swaying leaves, light shafts, bokeh), with a slow camera drift and a dusk variant.
import { memo, type FC } from "react";
import { random } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";

export type Mood = "grove" | "dusk";

type Pal = { sky: string[]; sun: string; far: string[]; mid: string[]; near: string[]; leaf: string[]; lit: string; floor: string; shaft: string };
const PAL: Record<Mood, Pal> = {
  grove: {
    sky: ["#EEF2CC", "#BBD487", "#5F9443", "#1A381C"],
    sun: "#FFF4C4",
    far: ["#A9C68A", "#97B97A", "#BBD49C"],
    mid: ["#2F6429", "#94C866", "#3F7A33", "#21481F"],
    near: ["#10260F", "#4D8A35", "#1B3A19", "#0B1C0B"],
    leaf: ["#6DA445", "#8DC25A", "#4C8A3A", "#A7D46A"],
    lit: "#D9F08C",
    floor: "#0C2210",
    shaft: "#FFF8D6",
  },
  dusk: {
    sky: ["#F3C9A4", "#B98FB0", "#4E5E8E", "#141A33"],
    sun: "#FFD6A8",
    far: ["#8E8FB4", "#7C7EA6", "#A59EBF"],
    mid: ["#2A3360", "#8C8FC4", "#38457A", "#1A2148"],
    near: ["#0B0F24", "#3F4B86", "#151B3B", "#070A18"],
    leaf: ["#4D5E95", "#6C79B0", "#3B4A80", "#8B90C4"],
    lit: "#FFC8A0",
    floor: "#070A18",
    shaft: "#FFE0C2",
  },
};

type Stalk = { x: number; w: number; lean: number; nodes: number[]; tone: number };
const stalks = (n: number, seed: string, w0: number, w1: number, x0 = -40, x1 = W + 40): Stalk[] =>
  Array.from({ length: n }, (_, i) => {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const x = x0 + ((i + 0.15 + r("x") * 0.7) / n) * (x1 - x0);
    const step = 120 + r("s") * 90;
    const off = r("o") * step;
    const nodes: number[] = [];
    for (let y = off - step; y < H + step; y += step * (0.85 + r(`n${y}`) * 0.3)) nodes.push(y);
    return { x, w: w0 + r("w") * (w1 - w0), lean: (r("l") - 0.5) * 50, nodes, tone: r("t") };
  });

const FAR = stalks(30, "far", 9, 20);
const MID = stalks(13, "mid", 30, 54, 60, W - 60);
const NEAR: Stalk[] = [
  { x: 70, w: 118, lean: -14, nodes: [150, 430, 720, 1010], tone: 0.2 },
  { x: 404, w: 74, lean: 10, nodes: [60, 330, 620, 905], tone: 0.7 },
  { x: 1586, w: 88, lean: -8, nodes: [210, 500, 780, 1060], tone: 0.4 },
  { x: 1868, w: 132, lean: 16, nodes: [100, 380, 690, 960], tone: 0.9 },
];

type Leaf = { x: number; y: number; rot: number; len: number; wid: number; c: number; lit: boolean };
type Cluster = { x: number; y: number; leaves: Leaf[]; seed: number; s: number };
const CLUSTERS: Cluster[] = Array.from({ length: 30 }, (_, i) => {
  const r = (k: string) => random(`cl-${i}-${k}`);
  const top = i < 20;
  const x = (i % 20) * 101 + r("x") * 90 - 20;
  const y = top ? -20 + r("y") * 210 : 260 + r("y") * 480;
  const n = top ? 9 : 5;
  const leaves = Array.from({ length: n }, (_, k) => {
    const q = (s: string) => random(`lf-${i}-${k}-${s}`);
    return {
      x: (q("x") - 0.5) * 90,
      y: (q("y") - 0.5) * 50,
      rot: (top ? 20 : 30) + q("r") * 120 + (q("f") > 0.5 ? 180 : 0),
      len: 70 + q("l") * 70,
      wid: 11 + q("w") * 8,
      c: Math.floor(q("c") * 4),
      lit: q("lit") > 0.72,
    };
  });
  return { x, y, leaves, seed: i, s: top ? 1 : 0.8 };
});

const BOKEH = Array.from({ length: 34 }, (_, i) => {
  const r = (k: string) => random(`bk-${i}-${k}`);
  return { x: r("x") * W, y: r("y") * 620, r: 5 + r("r") * 18, ph: r("p") * 6.28, sp: 0.6 + r("s") * 1.2 };
});

const leafPath = (len: number, wid: number) =>
  `M0 0 C ${len * 0.25} ${-wid * 0.7} ${len * 0.7} ${-wid * 0.5} ${len} 0 C ${len * 0.7} ${wid * 0.5} ${len * 0.25} ${wid * 0.7} 0 0 Z`;

const StalkShape: FC<{ s: Stalk; fill: string; node: string; ring: string; nodeW: number }> = ({ s, fill, node, ring, nodeW }) => {
  const top = -40, bot = H + 40;
  const tx = s.x + s.lean, bx = s.x - s.lean;
  const at = (y: number) => tx + ((bx - tx) * (y - top)) / (bot - top);
  return (
    <g>
      <path d={`M${tx - s.w / 2} ${top} L${tx + s.w / 2} ${top} L${bx + s.w / 2} ${bot} L${bx - s.w / 2} ${bot} Z`} fill={fill} />
      {s.nodes.map((y, i) => (
        <g key={i}>
          <rect x={at(y) - s.w / 2 - 1} y={y - nodeW} width={s.w + 2} height={nodeW * 2.2} rx={nodeW} fill={ring} />
          <rect x={at(y) - s.w / 2} y={y} width={s.w} height={Math.max(1.5, nodeW * 0.6)} fill={node} />
        </g>
      ))}
    </g>
  );
};

// The plate is pure geometry plus two numbers, so memoising it keeps every lens's copy of it cheap to reconcile.
const PlateArt: FC<{ mood: Mood; tq: number; drift: number }> = memo(({ mood, tq, drift }) => {
  const p = PAL[mood];
  const t = tq / 30;
  const g = `lg-${mood}`;
  return (
    <g transform={`translate(${W / 2} ${H / 2}) scale(${drift}) translate(${-W / 2} ${-H / 2})`}>
      <defs>
        <linearGradient id={`${g}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.33" stopColor={p.sky[1]} />
          <stop offset="0.72" stopColor={p.sky[2]} />
          <stop offset="1" stopColor={p.sky[3]} />
        </linearGradient>
        <radialGradient id={`${g}-sun`} cx="0.78" cy="0.12" r="0.55">
          <stop offset="0" stopColor={p.sun} stopOpacity="0.8" />
          <stop offset="0.4" stopColor={p.sun} stopOpacity="0.25" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-mid`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.mid[0]} />
          <stop offset="0.32" stopColor={p.mid[1]} />
          <stop offset="0.6" stopColor={p.mid[2]} />
          <stop offset="1" stopColor={p.mid[3]} />
        </linearGradient>
        <linearGradient id={`${g}-near`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.near[0]} />
          <stop offset="0.3" stopColor={p.near[1]} />
          <stop offset="0.55" stopColor={p.near[2]} />
          <stop offset="1" stopColor={p.near[3]} />
        </linearGradient>
        <linearGradient id={`${g}-shaft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.shaft} stopOpacity="0.5" />
          <stop offset="1" stopColor={p.shaft} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${g}-bk`}>
          <stop offset="0" stopColor={p.sun} stopOpacity="0.95" />
          <stop offset="0.6" stopColor={p.sun} stopOpacity="0.45" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.floor} stopOpacity="0" />
          <stop offset="1" stopColor={p.floor} stopOpacity="0.92" />
        </linearGradient>
        <radialGradient id={`${g}-vig`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect x={-60} y={-60} width={W + 120} height={H + 120} fill={`url(#${g}-sky)`} />
      <rect x={-60} y={-60} width={W + 120} height={H + 120} fill={`url(#${g}-sun)`} />
      {FAR.map((s, i) => (
        <g key={i} opacity={0.55 + s.tone * 0.35}>
          <StalkShape s={s} fill={p.far[i % 3]!} node={p.mid[3]!} ring={p.far[2]!} nodeW={1.6} />
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 1500 - i * 230;
        const o = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7);
        return <path key={i} d={`M${x} -40 L${x + 70 + i * 10} -40 L${x - 520 + i * 40} ${H} L${x - 700 + i * 30} ${H} Z`} fill={`url(#${g}-shaft)`} opacity={0.25 + 0.25 * o} />;
      })}
      {MID.map((s, i) => (
        <StalkShape key={i} s={s} fill={`url(#${g}-mid)`} node={p.near[3]!} ring={p.mid[1]!} nodeW={2.6} />
      ))}
      {CLUSTERS.map((c) => {
        const sway = Math.sin(t * 0.9 + c.seed * 1.3) * 4 + Math.sin(t * 2.1 + c.seed) * 1.2;
        return (
          <g key={c.seed} transform={`translate(${c.x} ${c.y}) rotate(${sway}) scale(${c.s})`}>
            {c.leaves.map((l, k) => (
              <path key={k} d={leafPath(l.len, l.wid)} transform={`translate(${l.x} ${l.y}) rotate(${l.rot})`} fill={l.lit ? p.lit : p.leaf[l.c]!} opacity={0.95} />
            ))}
          </g>
        );
      })}
      {BOKEH.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${g}-bk)`} opacity={0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * b.sp + b.ph))} />
      ))}
      {NEAR.map((s, i) => (
        <StalkShape key={i} s={s} fill={`url(#${g}-near)`} node={p.near[3]!} ring={p.near[1]!} nodeW={4} />
      ))}
      <rect x={-60} y={720} width={W + 120} height={H - 660} fill={`url(#${g}-floor)`} />
      <rect x={-60} y={-60} width={W + 120} height={H + 120} fill={`url(#${g}-vig)`} />
    </g>
  );
});

// Plate drift: 1.5 % over 8 s and back, so the picture slides under glass that stays put.
export const plateDrift = (t: number) => 1 + 0.015 * (0.5 - 0.5 * Math.cos((t * Math.PI) / 8));

// The plate as SVG content in frame coordinates, for scenes and for each lens's refracted copy.
export const PlateSvg: FC<{ mood?: Mood }> = ({ mood = "grove" }) => {
  const { t, f } = useTime();
  return <PlateArt mood={mood} tq={f} drift={plateDrift(t)} />;
};

export const GlassPlate: FC<{ mood?: Mood }> = ({ mood = "grove" }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
    <PlateSvg mood={mood} />
  </svg>
);
