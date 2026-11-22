// Bento drawn art: the morphing glow blob, isometric wireframes that draw on and keep tracing, the spotlight card on a scripted cursor, and the hairline flow diagram.
import type { CSSProperties, FC, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { EXPO, HUE, MONO, MUTED, PANEL, SANS, TEXT, fr, hair, withAlpha } from "./theme";
import { Card, IconTile, appear, type IconName } from "./primitives";

// ---------- glow blob ----------
const colorAt = (t: number, keys: [number, string][]) => {
  let c = keys[0]![1];
  for (const [k, col] of keys.slice(1)) {
    if (t < k) break;
    c = interpolateColors(ramp(t, k, 0.5, INOUT), [0, 1], [c, col]);
  }
  return c;
};

// Smooth closed path through points (Catmull-Rom as cubic Béziers).
const closedSpline = (pts: [number, number][]) => {
  const n = pts.length;
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d + "Z";
};

// A huge blurred colour shape that slowly morphs and breathes; give it keys to change hue between features or scenes.
export const GlowBlob: FC<{ x: number; y: number; r: number; hue?: string; keys?: [number, string][]; at?: number; strength?: number; seed?: number }> = ({ x, y, r, hue = HUE.indigo, keys, at = 0, strength = 1, seed = 3 }) => {
  const { t } = useTime();
  const col = keys && keys.length ? colorAt(t, keys) : hue;
  const o = ramp(t, at, 0.8) * (0.82 + 0.18 * Math.sin(t * 1.6 + seed)) * strength;
  const S = r * 3.2;
  const blob = (rr: number, ph: number) =>
    closedSpline(
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const k = 1 + 0.14 * Math.sin(t * 0.7 + i * 1.9 + seed + ph) + 0.08 * Math.sin(t * 1.3 + i * 2.7 + ph);
        return [S / 2 + Math.cos(a) * rr * k, S / 2 + Math.sin(a) * rr * k * 0.82] as [number, number];
      }),
    );
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute", left: x - S / 2, top: y - S / 2, opacity: o, filter: `blur(${r * 0.32}px)`, pointerEvents: "none", overflow: "visible" }}>
      <path d={blob(r, 0)} fill={col} opacity={0.55} />
      <path d={blob(r * 0.55, 2)} fill={interpolateColors(0.35, [0, 1], [col, "#ffffff"])} opacity={0.35} />
    </svg>
  );
};

// ---------- isometric wireframes ----------
type V3 = [number, number, number];
type Part = { faces: V3[][]; marks?: V3[][]; hot?: boolean };
const iso = ([x, y, z]: V3): [number, number] => [(x - y) * 0.866, (x + y) * 0.5 - z];
const box = (x: number, y: number, z: number, w: number, d: number, h: number): V3[][] => [
  [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]],
  [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]],
  [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]],
];
const square = (cx: number, cy: number, z: number, s: number): V3[] => [[cx - s, cy - s, z], [cx + s, cy - s, z], [cx + s, cy + s, z], [cx - s, cy + s, z], [cx - s, cy - s, z]];

const VARIANTS: Record<IsoVariant, () => Part[]> = {
  // Stacked plates with a striped sun on top: a platform, a foundation, "built on".
  stack: () => {
    const parts: Part[] = Array.from({ length: 6 }, (_, i) => ({ faces: box(0, 0, i * 30, 220, 220, 14) }));
    const c: V3 = [110, 110, 5 * 30 + 14];
    const circle = Array.from({ length: 49 }, (_, k) => [c[0] + Math.cos((k / 48) * Math.PI * 2) * 72, c[1] + Math.sin((k / 48) * Math.PI * 2) * 72, c[2]] as V3);
    const chords = [12, 26, 40, 54].map((o) => {
      const hl = Math.sqrt(72 * 72 - o * o);
      const n = 0.7071;
      return [[c[0] + o * n - hl * n, c[1] + o * n + hl * n, c[2]], [c[0] + o * n + hl * n, c[1] + o * n - hl * n, c[2]]] as V3[];
    });
    parts[5] = { faces: parts[5]!.faces, marks: [circle, ...chords], hot: true };
    return parts;
  },
  // A cluster of cubes: modules, services, agents working side by side.
  cubes: () => {
    const s = 110;
    const g = s + 14;
    const at: V3[] = [[0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
    return at.map(([i, j, k], n) => ({ faces: box(i * g, j * g, k * g, s, s, s), marks: [square(i * g + s / 2, j * g + s / 2, k * g + s, 12)], hot: n === 1 }));
  },
  // Fins falling away in height: speed, momentum, things getting smaller.
  fins: () =>
    Array.from({ length: 11 }, (_, i) => ({ faces: box(i * 24, 0, 0, 8, 220, Math.max(36, 250 - i * 21)), hot: i === 0 })),
  // A 3×3 tray of tiles with the centre one raised: picking one option out of many.
  tiles: () => {
    const parts: Part[] = [];
    for (let s = 0; s <= 4; s++)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) if (i + j === s) parts.push({ faces: box(i * 84, j * 84, i === 1 && j === 1 ? 46 : 0, 72, 72, 12), hot: i === 1 && j === 1 });
    return parts;
  },
};
export type IsoVariant = "stack" | "cubes" | "fins" | "tiles";

const poly = (pts: V3[], close = true) => pts.map((p, i) => `${i ? "L" : "M"}${iso(p)[0].toFixed(1)} ${iso(p)[1].toFixed(1)}`).join(" ") + (close ? "Z" : "");

// Isometric line art that draws on back to front with stroke-dashoffset, then a light keeps tracing its hot edges on a loop.
export const IsoWireframe: FC<{ variant: IsoVariant; at: number; drawFrames?: number; size?: number; hue?: string; lit?: number; style?: CSSProperties }> = ({ variant, at, drawFrames = 45, size = 420, hue = HUE.indigo, lit = 0, style }) => {
  const { t, f } = useTime();
  const parts = VARIANTS[variant]();
  const all = parts.flatMap((p) => p.faces.flat().map(iso));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = 12;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2] as const;
  const d = fr(drawFrames);
  const stag = (d * 0.55) / parts.length;
  const stroke = hair(0.34 + 0.2 * lit);
  return (
    <svg viewBox={vb.join(" ")} width={size} height={(size * vb[3]) / vb[2]} style={{ overflow: "visible", ...style }}>
      {parts.map((part, i) => {
        const p = ramp(t, at + i * stag, d * 0.5, EXPO);
        if (p <= 0) return null;
        const drawn = ramp(t, at + d + 0.1, 0.4);
        return (
          <g key={i}>
            {part.faces.map((face, k) => (
              <path key={k} d={poly(face)} fill={PANEL} fillOpacity={clamp01(p * 1.2) * 0.96} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} strokeLinejoin="round" />
            ))}
            {part.marks?.map((m, k) => (
              <path key={`m${k}`} d={poly(m, false)} fill="none" stroke={part.hot ? withAlpha(hue, 0.5 + 0.5 * drawn) : stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ramp(t, at + i * stag + d * 0.3, d * 0.4)} />
            ))}
            {part.hot && drawn > 0 &&
              part.faces.map((face, k) => (
                <path key={`h${k}`} d={poly(face)} fill="none" stroke={hue} strokeWidth={2.2} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="0.14 0.86" strokeDashoffset={-((f / 75 + k * 0.33) % 1)} opacity={drawn} style={{ filter: `drop-shadow(0 0 4px ${hue})` }} />
              ))}
          </g>
        );
      })}
    </svg>
  );
};

// ---------- spotlight card ----------
export type CursorKey = { t: number; x: number; y: number };
const pathAt = (t: number, keys: CursorKey[]) => {
  let { x, y } = keys[0]!;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    const prev = keys[i - 1]!;
    if (t < prev.t) break;
    const e = ramp(t, prev.t, Math.max(0.01, k.t - prev.t), INOUT);
    x += (k.x - x) * e;
    y += (k.y - y) * e;
  }
  return { x, y };
};

// The pointer arrow, drawn: white fill, dark rim.
export const Cursor: FC<{ x: number; y: number; press?: number }> = ({ x, y, press = 0 }) => (
  <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 4, transform: `scale(${1 - 0.12 * press})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))" }}>
    <path d="M5 3l14 8-6.2 1.6L10 19z" fill={TEXT} stroke="#0B0C0E" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

// A card whose radial light and border glow follow a scripted cursor path (card-local px), like hover on the web but timed.
export const SpotlightCard: FC<{ w: number; h: number; path: CursorKey[]; hue?: string; cursor?: boolean; lit?: number; children?: ReactNode; style?: CSSProperties }> = ({ w, h, path, hue = HUE.indigo, cursor = true, lit = 1, children, style }) => {
  const { t } = useTime();
  const { x, y } = pathAt(t, path);
  const ring = `radial-gradient(260px circle at ${x}px ${y}px, ${hair(0.55 * lit)}, transparent 70%)`;
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <Card w={w} h={h} lit={0.15 * lit}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(420px circle at ${x}px ${y}px, ${withAlpha(hue, 0.2 * lit)}, transparent 65%)` }} />
        {children}
      </Card>
      <div style={{ position: "absolute", inset: 0, borderRadius: 16, padding: 1, background: ring, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />
      {cursor && <Cursor x={x} y={y} />}
    </div>
  );
};

// ---------- flow diagram ----------
export type FlowNode = { id: string; label: string; sub?: string; icon: IconName; x: number; y: number; t: number; hue?: string };
export type FlowEdge = { from: string; to: string; t: number };

const elbow = (x1: number, y1: number, x2: number, y2: number, r = 22) => {
  if (Math.abs(y2 - y1) < 1) return `M${x1} ${y1} H${x2}`;
  const mx = (x1 + x2) / 2;
  const s = Math.sign(y2 - y1);
  const rr = Math.min(r, Math.abs(y2 - y1) / 2);
  return `M${x1} ${y1} H${mx - rr} Q${mx} ${y1} ${mx} ${y1 + s * rr} V${y2 - s * rr} Q${mx} ${y2} ${mx + rr} ${y2} H${x2}`;
};

// Nodes as small hairline cards joined by elbowed hairlines; each edge draws in, a hue pulse keeps travelling along it, and a node lights when it's named, then settles.
export const FlowDiagram: FC<{ nodes: FlowNode[]; edges: FlowEdge[]; nodeW?: number; nodeH?: number; hue?: string; hold?: number; style?: CSSProperties }> = ({ nodes, edges, nodeW = 330, nodeH = 128, hue = HUE.indigo, hold = 1.4, style }) => {
  const { t } = useTime();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lastT = Math.max(...nodes.map((n) => n.t));
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {edges.map((e, i) => {
          const a = byId.get(e.from)!;
          const b = byId.get(e.to)!;
          const d = elbow(a.x + nodeW / 2, a.y, b.x - nodeW / 2 - 6, b.y);
          const p = ramp(t, e.t, 0.45, EXPO);
          const live = ramp(t, e.t + 0.45, 0.3);
          const col = b.hue ?? hue;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={hair(0.22)} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
              {live > 0 && (
                <path d={d} fill="none" stroke={col} strokeWidth={3.5} strokeLinecap="round" pathLength={1} strokeDasharray="0.12 0.88" strokeDashoffset={-(((t - e.t) / 1.3) % 1)} opacity={live} style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
              )}
              <circle cx={b.x - nodeW / 2 - 6} cy={b.y} r={5} fill={TEXT} opacity={p >= 0.98 ? 0.8 : 0} />
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const a = appear(t, n.t - 0.25, { d: 18, y: 16 });
        const lit = ramp(t, n.t, fr(10)) * (n.t === lastT ? 1 : 1 - 0.65 * ramp(t, n.t + hold, 0.5));
        return (
          <div key={i} style={{ position: "absolute", left: n.x - nodeW / 2, top: n.y - nodeH / 2, ...a.style }}>
            <Card w={nodeW} h={nodeH} lit={lit} glow={n.hue ?? hue}>
              <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 20, padding: "0 22px" }}>
                <IconTile name={n.icon} hue={lit > 0.5 ? (n.hue ?? hue) : undefined} lit={lit} size={66} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: interpolateColors(lit, [0, 1], [MUTED, TEXT]), letterSpacing: "-0.015em" }}>{n.label}</span>
                  {n.sub && <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED, letterSpacing: "0.04em" }}>{n.sub}</span>}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
