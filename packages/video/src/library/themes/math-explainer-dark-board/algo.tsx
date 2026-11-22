// Algorithm pieces in the board's language: an array sorting by compares and arc swaps, breadth-first search over a graph with its queue, and binary search on a number line the camera zooms into.
import type { FC } from "react";
import { interpolateColors } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { Brace, Create, Decimal, Flash, Surround, Txt, rectD } from "./draw";
import { Eq } from "./eq";
import { BLUE, DIM, GREEN, INK, MUTED, RED, SMOOTH, YELLOW } from "./theme";

// ---------- array sort ----------
export type SortOp = { kind: "compare" | "swap" | "sorted"; i: number; j?: number; at: number };

export const ArraySort: FC<{ values: number[]; ops: SortOp[]; x: number; y: number; at: number; cell?: number; gap?: number; swapDur?: number; counters?: boolean }> = ({ values, ops, x, y, at, cell = 130, gap = 26, swapDur = 0.7, counters = true }) => {
  const { t } = useTime();
  const n = values.length;
  const X0 = x - (n * cell + (n - 1) * gap) / 2;
  const slotX = (s: number) => X0 + s * (cell + gap) + cell / 2;
  // Replay swaps up to now: settled slots plus the pair currently in flight.
  const slots = values.map((_, i) => i);
  const pos = values.map((_, i) => ({ x: slotX(i), y }));
  let moving: { a: number; b: number; p: number; i: number; j: number } | null = null;
  for (const op of ops) {
    if (op.kind !== "swap" || t < op.at) continue;
    const p = ramp(t, op.at, swapDur, SMOOTH);
    const a = slots[op.i]!, b = slots[op.j!]!;
    if (p >= 1) {
      slots[op.i] = b;
      slots[op.j!] = a;
    } else moving = { a, b, p, i: op.i, j: op.j! };
  }
  slots.forEach((id, s) => (pos[id] = { x: slotX(s), y }));
  if (moving) {
    const { a, b, p, i, j } = moving;
    const h = (cell + gap) * 0.75 * Math.sin(Math.PI * p);
    pos[a] = { x: slotX(i) + (slotX(j) - slotX(i)) * p, y: y - h };
    pos[b] = { x: slotX(j) + (slotX(i) - slotX(j)) * p, y: y + h };
  }
  const sortedAt = new Map<number, number>();
  ops.filter((o) => o.kind === "sorted").forEach((o) => sortedAt.set(o.i, o.at));
  const compares = ops.filter((o) => o.kind === "compare" && t >= o.at).length;
  const swaps = ops.filter((o) => o.kind === "swap" && t >= o.at).length;
  const cur = ops.filter((o) => o.kind === "compare" && t >= o.at && t < o.at + 1.3).pop();
  return (
    <g>
      {values.map((_, s) => (
        <Txt key={`i${s}`} x={slotX(s)} y={y + cell / 2 + 50} text={String(s)} size={30} font="rm" color={MUTED} anchor="middle" at={at + 0.6} />
      ))}
      {values.map((v, id) => {
        const slot = slots.indexOf(id);
        const g = sortedAt.has(slot) ? ramp(t, sortedAt.get(slot)!, 0.4, SMOOTH) : 0;
        const col = interpolateColors(g, [0, 1], [INK, GREEN]);
        const { x: cx, y: cy } = pos[id]!;
        return (
          <g key={id}>
            <rect x={cx - cell / 2} y={cy - cell / 2} width={cell} height={cell} fill={GREEN} fillOpacity={0.16 * g} />
            <Create d={rectD(cx - cell / 2, cy - cell / 2, cx + cell / 2, cy + cell / 2)} at={at + id * 0.08} dur={0.6} color={col} w={3.5} cap="butt" />
            <Eq tex={String(v)} x={cx} y={cy + 22} size={66} at={at + 0.3 + id * 0.08} dur={0.6} color={col} />
          </g>
        );
      })}
      {cur && (() => {
        const a = slotX(cur.i), b = slotX(cur.j!);
        const va = values[slots[cur.i]!]!, vb = values[slots[cur.j!]!]!;
        return (
          <g>
            <Surround x0={Math.min(a, b) - cell / 2} y0={y - cell / 2} x1={Math.max(a, b) + cell / 2} y1={y + cell / 2} pad={12} at={cur.at} out={cur.at + 0.85} />
            <Eq tex={`${va} ${va > vb ? ">" : "<"} ${vb}`} x={(a + b) / 2} y={y - cell / 2 - (cell + gap) * 0.75 - 50} size={50} color={va > vb ? RED : GREEN} at={cur.at} fadeIn out={cur.at + 0.85} />
          </g>
        );
      })()}
      {counters && (
        <g opacity={ramp(t, at + 0.8, 0.4)}>
          <Txt x={x - 40} y={y + cell / 2 + 210} text="comparisons" size={34} color={MUTED} anchor="end" at={-1} />
          <Decimal x={x - 10} y={y + cell / 2 + 212} value={compares} size={50} anchor="start" color={YELLOW} />
          <Txt x={x + 200} y={y + cell / 2 + 210} text="swaps" size={34} color={MUTED} anchor="end" at={-1} />
          <Decimal x={x + 230} y={y + cell / 2 + 212} value={swaps} size={50} anchor="start" color={YELLOW} />
        </g>
      )}
    </g>
  );
};

// ---------- breadth-first search ----------
export type GNode = { id: string; x: number; y: number };

const bfs = (nodes: GNode[], edges: [string, string][], start: string) => {
  const adj = new Map(nodes.map((n) => [n.id, [] as string[]]));
  edges.forEach(([a, b]) => {
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  });
  const order: string[] = [];
  const parent = new Map<string, string>();
  const queue = [start];
  const seen = new Set([start]);
  const snaps: string[][] = [[...queue]];
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of adj.get(u)!) {
      if (seen.has(v)) continue;
      seen.add(v);
      parent.set(v, u);
      queue.push(v);
    }
    snaps.push([...queue]);
  }
  return { order, parent, snaps };
};

export const GraphBFS: FC<{ nodes: GNode[]; edges: [string, string][]; start: string; at: number; visitAt: number; step?: number; r?: number; queue?: { x: number; y: number } }> = ({ nodes, edges, start, at, visitAt, step = 0.8, r = 46, queue }) => {
  const { t } = useTime();
  const { order, parent, snaps } = bfs(nodes, edges, start);
  const vt = (id: string) => visitAt + order.indexOf(id) * step;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const k = order.filter((id) => t >= vt(id)).length;
  // Queue slots ease from the previous snapshot to the current one.
  const qp = k === 0 ? 1 : ramp(t, visitAt + (k - 1) * step, 0.45, SMOOTH);
  const prevQ = snaps[Math.max(0, k - 1)]!, curQ = snaps[k]!;
  const qCell = 82;
  return (
    <g>
      {edges.map(([a, b], i) => {
        const A = byId.get(a)!, B = byId.get(b)!;
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
        const tree = parent.get(b) === a ? [A, B] : parent.get(a) === b ? [B, A] : null;
        const from = tree?.[0], to = tree?.[1];
        const tAt = to ? vt(from!.id) : 1e9;
        const fx = from ? from.x : A.x, fy = from ? from.y : A.y, txx = to ? to.x : B.x, tyy = to ? to.y : B.y;
        const sx = to ? (txx - fx) / len : ux, sy = to ? (tyy - fy) / len : uy;
        const d = `M${fx + sx * r} ${fy + sy * r} L${txx - sx * r} ${tyy - sy * r}`;
        return (
          <g key={i}>
            <Create d={d} at={at + 0.4 + i * 0.06} dur={0.5} color={INK} w={3} opacity={0.55} />
            {to && <Create d={d} at={tAt + 0.1} dur={0.4} color={YELLOW} w={5} />}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const v = vt(n.id);
        const disc = parent.has(n.id) ? vt(parent.get(n.id)!) + 0.35 : n.id === start ? visitAt - 0.3 : 1e9;
        const isCur = t >= v && t < v + step;
        const visited = ramp(t, v + step * 0.8, 0.3, SMOOTH);
        const inQ = ramp(t, disc, 0.3, SMOOTH);
        const stroke = isCur ? YELLOW : interpolateColors(Math.max(inQ, visited), [0, 1], [INK, BLUE]);
        const idx = order.indexOf(n.id);
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} fill={BLUE} fillOpacity={0.4 * visited + (isCur ? 0.15 : 0)} />
            <Create d={`M${n.x} ${n.y - r} A${r} ${r} 0 1 1 ${n.x - 0.01} ${n.y - r}`} at={at + i * 0.07} dur={0.5} color={stroke} w={isCur ? 5 : 3.5} />
            <Eq tex={`\\mathrm{${n.id}}`} x={n.x} y={n.y + 18} size={52} at={at + 0.2 + i * 0.07} dur={0.5} />
            <Flash x={n.x} y={n.y} at={v} r={r + 8} />
            <Eq tex={String(idx + 1)} x={n.x + r * 0.95} y={n.y - r * 0.85} size={36} anchor="start" color={YELLOW} at={v + 0.1} fadeIn />
          </g>
        );
      })}
      {queue && (
        <g opacity={ramp(t, visitAt - 0.4, 0.4)}>
          <Txt x={queue.x - 30} y={queue.y + 12} text="queue" size={36} color={MUTED} anchor="end" at={-1} />
          <Create d={`M${queue.x} ${queue.y - qCell / 2} L${queue.x + qCell * 7} ${queue.y - qCell / 2} M${queue.x} ${queue.y + qCell / 2} L${queue.x + qCell * 7} ${queue.y + qCell / 2}`} p={1} color={DIM} w={2.5} />
          {[...new Set([...prevQ, ...curQ])].map((id) => {
            const a = prevQ.indexOf(id), b = curQ.indexOf(id);
            const sa = a < 0 ? b : a, sb = b < 0 ? a - 1 : b;
            const s = sa + (sb - sa) * qp;
            const o = a < 0 ? qp : b < 0 ? 1 - qp : 1;
            const cx = queue.x + qCell / 2 + s * qCell;
            return o > 0 ? (
              <g key={id} opacity={o}>
                <rect x={cx - qCell / 2 + 6} y={queue.y - qCell / 2 + 6} width={qCell - 12} height={qCell - 12} fill="none" stroke={BLUE} strokeWidth={3} />
                <Eq tex={`\\mathrm{${id}}`} x={cx} y={queue.y + 16} size={44} at={-1} dur={0.01} color={INK} />
              </g>
            ) : null;
          })}
        </g>
      )}
    </g>
  );
};

// ---------- binary search on a zooming number line ----------
const searchSteps = (n: number, target: number) => {
  const out: { lo: number; hi: number; mid: number }[] = [];
  let lo = 0, hi = n - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    out.push({ lo, hi, mid });
    if (mid === target) break;
    if (mid < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return out;
};

// The camera follows the shrinking interval, so ticks spread out as the search closes in; labels stay the same size.
export const BinarySearch: FC<{ n: number; target: number; y: number; at: number; step?: number; x0?: number; x1?: number }> = ({ n, target, y, at, step = 1.7, x0 = 150, x1 = 1770 }) => {
  const { t } = useTime();
  const S = searchSteps(n, target);
  const st = (k: number) => at + 1.2 + k * step;
  const k = S.filter((_, i) => t >= st(i)).length - 1;
  // Interval after each step's comparison (it narrows 0.7 s after the mid is picked).
  const after = S.map((s, i) => (i === S.length - 1 ? { lo: s.mid, hi: s.mid } : s.mid < target ? { lo: s.mid + 1, hi: s.hi } : { lo: s.lo, hi: s.mid - 1 }));
  let lo = 0, hi = n - 1;
  let cLo = -0.8, cHi = n - 0.2;
  S.forEach((_, i) => {
    const e = ramp(t, st(i) + 0.7, 0.6, SMOOTH);
    const nlo = after[i]!.lo, nhi = after[i]!.hi;
    lo += (nlo - lo) * e;
    hi += (nhi - hi) * e;
    const span = Math.max(9, nhi - nlo + 3);
    const mid = (nlo + nhi) / 2;
    const ec = ramp(t, st(i) + 0.95, 0.9, SMOOTH);
    cLo += (mid - span / 2 - cLo) * ec;
    cHi += (mid + span / 2 - cHi) * ec;
  });
  const ppu = (x1 - x0) / (cHi - cLo);
  const sx = (v: number) => x0 + (v - cLo) * ppu;
  const lineIn = ramp(t, at, 0.8, SMOOTH);
  const visible = Array.from({ length: n }, (_, v) => v).filter((v) => sx(v) > x0 - 20 && sx(v) < x1 + 20);
  const lblOp = (v: number) => {
    const every = v % 8 === 0 ? 8 : v % 4 === 0 ? 4 : v % 2 === 0 ? 2 : 1;
    return clamp01((ppu * every - 70) / 40);
  };
  const cur = k >= 0 ? S[k] : null;
  const found = ramp(t, st(S.length - 1) + 0.5, 0.4, SMOOTH);
  return (
    <g>
      <line x1={x0 - 40 + (1 - lineIn) * (x1 - x0) / 2} y1={y} x2={x1 + 40 - (1 - lineIn) * (x1 - x0) / 2} y2={y} stroke={INK} strokeWidth={3.5} />
      <rect x={sx(lo - 0.5)} y={y - 34} width={Math.max(0, (hi - lo + 1) * ppu)} height={68} fill={BLUE} fillOpacity={0.16 * ramp(t, at + 0.9, 0.4)} stroke={BLUE} strokeWidth={2.5} strokeOpacity={ramp(t, at + 0.9, 0.4)} />
      {visible.map((v) => {
        const inside = v >= lo - 0.01 && v <= hi + 0.01;
        const o = ramp(t, at + 0.3 + (v / n) * 0.6, 0.3) * (inside ? 1 : 0.3);
        return (
          <g key={v} opacity={o}>
            <line x1={sx(v)} y1={y - 14} x2={sx(v)} y2={y + 14} stroke={INK} strokeWidth={3} />
            <Txt x={sx(v)} y={y + 66} text={String(v)} size={32} font="rm" color={INK} anchor="middle" at={-1} opacity={lblOp(v)} />
          </g>
        );
      })}
      <Brace x1={sx(lo - 0.5)} x2={sx(hi + 0.5)} y={y + 96} at={at + 1.0} color={MUTED} />
      <Txt x={(sx(lo - 0.5) + sx(hi + 0.5)) / 2} y={y + 178} text={`${Math.round(hi - lo + 1)} left`} size={38} color={MUTED} anchor="middle" at={at + 1.2} />
      {cur && (() => {
        const px = sx(cur.mid);
        const done = k === S.length - 1;
        const col = done ? interpolateColors(found, [0, 1], [YELLOW, GREEN]) : YELLOW;
        const cmp = done ? "=" : cur.mid < target ? "<" : ">";
        return (
          <g>
            <path d={`M${px} ${y - 46} L${px - 18} ${y - 80} L${px + 18} ${y - 80} Z`} fill={col} />
            <Eq key={k} tex={`\\text{mid} = ${cur.mid}`} x={px} y={y - 112} size={46} color={col} at={st(k)} fadeIn />
            <Eq key={`c${k}`} tex={`${cur.mid} ${cmp} ${target}`} x={px} y={y - 176} size={46} color={done ? GREEN : cmp === "<" ? BLUE : RED} at={st(k) + 0.35} fadeIn />
            <Flash x={px} y={y - 64} at={st(k)} r={30} color={col} />
          </g>
        );
      })()}
      <Eq tex={`\\text{target} = ${target}`} x={x0} y={170} size={56} anchor="start" at={at + 0.4} colors={{ [String(target)]: YELLOW }} />
      <g opacity={ramp(t, at + 1.0, 0.4)}>
        <Txt x={x1} y={168} text="step" size={40} color={MUTED} anchor="end" at={-1} />
      </g>
      <Decimal x={x1} y={240} value={Math.max(0, k + 1)} size={72} anchor="end" color={YELLOW} opacity={ramp(t, at + 1.0, 0.4)} />
      <Eq tex={`\\log_2 ${n} = ${Math.log2(n).toFixed(0)}`} x={x1} y={y + 330} size={52} anchor="end" at={st(S.length - 1) + 0.6} marks={[{ term: "*", at: st(S.length - 1) + 1.4, kind: "underline", color: GREEN }]} />
    </g>
  );
};
