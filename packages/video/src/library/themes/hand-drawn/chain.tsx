// Hand-drawn chain: wobbly labelled links joined by interlocking loops; each link draws on, fades to pencil grey or goes bold on its own timeline.
import type { FC } from "react";
import { seg } from "../../core/time";
import { inkCol } from "./theme";
import { blobPts, ellPts, linePts } from "./geometry";
import { Hand, Sk } from "./primitives";

export type ChainNode = { label: string[]; x: number; y: number; seed: number };
// draw: outline progress · label: write-on per line · ink: 0 grey → 1 graphite · bold: thicker and slightly larger.
export type NodeLook = { draw: number; label: number[]; ink: number; bold: number };
export type LinkLook = { p: number; ink: number };

export const NW = 238;
export const NH = 130;

// Lays labels out left to right with a gentle up-down wobble, so a chain never sits on a ruler line.
export const chainLayout = (labels: string[][], { x0 = 185, step = 310, y = 540, wobble = [0, -16, 8, -10, 12, -6], seed = 11 } = {}): ChainNode[] =>
  labels.map((label, i) => ({ label, x: x0 + i * step, y: y + (wobble[i % wobble.length] ?? 0), seed: seed + i * 12 }));

export const NodeView: FC<{ n: ChainNode; look: NodeLook; dash?: string }> = ({ n, look, dash }) => {
  if (look.draw <= 0) return null;
  const col = inkCol(look.ink);
  const two = n.label.length > 1;
  return (
    <g transform={`translate(${n.x} ${n.y}) scale(${1 + 0.07 * look.bold})`} opacity={0.42 + 0.58 * look.ink}>
      <Sk pts={blobPts(0, 0, NW, NH, n.seed)} p={look.draw} w={3.4 + 2.8 * look.bold} color={col} seed={n.seed} dash={dash} />
      {n.label.map((l, k) => (
        <Hand key={k} x={0} y={two ? -6 + k * 42 : 14} text={l} size={two ? 42 : 44} p={look.label[k] ?? 0} color={col} />
      ))}
    </g>
  );
};

export const LinkView: FC<{ a: ChainNode; b: ChainNode; look: LinkLook; seed: number; dash?: string }> = ({ a, b, look, seed, dash }) => {
  if (look.p <= 0) return null;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const col = inkCol(look.ink);
  const s = (i: number) => seg(look.p, i, 4);
  return (
    <g opacity={0.42 + 0.58 * look.ink}>
      <Sk pts={linePts(a.x + NW / 2 - 8, a.y + 4, mx - 27, my, seed, 0.15, 4)} p={s(0)} w={3.6} color={col} seed={seed} dash={dash} />
      <Sk pts={ellPts(mx - 11, my, 19, 11, seed + 1)} p={s(1)} w={3.6} color={col} seed={seed + 1} dash={dash} />
      <Sk pts={ellPts(mx + 11, my, 19, 11, seed + 2)} p={s(2)} w={3.6} color={col} seed={seed + 2} dash={dash} />
      <Sk pts={linePts(mx + 27, my, b.x - NW / 2 + 8, b.y + 4, seed + 3, 0.15, 4)} p={s(3)} w={3.6} color={col} seed={seed + 3} dash={dash} />
    </g>
  );
};

export const Chain: FC<{ nodes: ChainNode[]; looks: NodeLook[]; links: LinkLook[] }> = ({ nodes, looks, links }) => (
  <>
    {links.map((l, i) => (nodes[i + 1] ? <LinkView key={`l${i}`} a={nodes[i]!} b={nodes[i + 1]!} look={l} seed={400 + i * 10} /> : null))}
    {nodes.map((n, i) => (looks[i] ? <NodeView key={n.seed} n={n} look={looks[i]!} /> : null))}
  </>
);

// Midpoints between neighbouring links: where play buttons, arrows or notes about a "switch" sit.
export const chainMids = (nodes: ChainNode[]) => nodes.slice(1).map((n, i) => [(nodes[i]!.x + n.x) / 2, (nodes[i]!.y + n.y) / 2] as [number, number]);
