// Isometric system scenes: a request flowing node to node, exploded layer stacks, district plates for camera glides, and the island that turns 90°.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { FPS } from "../../core/video";
import { useTime } from "../../core/time";
import { ACCENT, BLUE, CARD, INK, LABEL, MONO, RULE, SIGNAL, SUB, type ToneName } from "./theme";
import { bob, depthOf, ease, lPath, pathLen, proj, view, type View, type WP } from "./iso";
import { IsoBlock, IsoLabel, IsoPipe, IsoWorld, PacketDot, TilePulse } from "./primitives";
import { IsoBuilding, IsoDatabase, IsoLaptop, IsoPlate, IsoRack, OnFloor } from "./objects";

// ---------- flow ----------
export type NodeKind = "laptop" | "rack" | "building" | "db" | "block";
export type FlowNode = { kind: NodeKind; gx: number; gy: number; label: string; tag?: string; t: number; units?: number; floors?: number; tone?: ToneName };

// Footprint centre and height (grid units) of each node kind, so pipes, pulses and labels find it.
const shape = (n: FlowNode) => {
  switch (n.kind) {
    case "laptop": return { cx: n.gx + 0.7, cy: n.gy + 0.5, w: 1.4, d: 1, h: 1.0 };
    case "rack": return { cx: n.gx + 0.5, cy: n.gy + 0.5, w: 1, d: 1, h: (n.units ?? 5) * 0.39 };
    case "building": return { cx: n.gx + 1, cy: n.gy + 1, w: 2, d: 2, h: (n.floors ?? 3) * 0.62 + 1.0 };
    case "db": return { cx: n.gx + 0.65, cy: n.gy + 0.65, w: 1.3, d: 1.3, h: 1.3 };
    default: return { cx: n.gx + 0.6, cy: n.gy + 0.6, w: 1.2, d: 1.2, h: 1.2 };
  }
};

const NodeArt: FC<{ n: FlowNode; at: number; act: number }> = ({ n, at, act }) => {
  const a = { at, lift: act, glow: act };
  switch (n.kind) {
    case "laptop": return <IsoLaptop gx={n.gx} gy={n.gy} {...a} />;
    case "rack": return <IsoRack gx={n.gx} gy={n.gy} units={n.units ?? 5} ledSeed={Math.round(n.gx * 7 + n.gy)} {...a} />;
    case "building": return <IsoBuilding gx={n.gx} gy={n.gy} floors={n.floors ?? 3} seed={Math.round(n.gx + n.gy * 3)} {...a} />;
    case "db": return <IsoDatabase cx={n.gx + 0.65} cy={n.gy + 0.65} r={0.65} h={1.3} {...a} />;
    default: return <IsoBlock gx={n.gx} gy={n.gy} w={1.2} d={1.2} h={1.2} tone={n.tone ?? "white"} {...a} />;
  }
};

// "What happens when you press Enter": each node rises as it's named, a packet races in from the previous node, the active node lifts and glows on a pulsing tile.
export const IsoFlow: FC<{ nodes: FlowNode[]; view?: Partial<View>; cam?: string; idleAfter?: number; speed?: number }> = ({ nodes, view: vp, cam, idleAfter, speed = 10 }) => {
  const { t } = useTime();
  const v = view(vp ?? {});
  const S = nodes.map(shape);
  const paths = nodes.slice(1).map((_, i) => lPath([S[i]!.cx, S[i]!.cy], [S[i + 1]!.cx, S[i + 1]!.cy]));
  const travel = (p: WP[]) => (pathLen(p) * v.u) / speed / FPS;
  const order = nodes.map((_, i) => i).sort((a, b) => depthOf(v, S[a]!.cx, S[a]!.cy) - depthOf(v, S[b]!.cx, S[b]!.cy));
  const act = (i: number) => ease(t, nodes[i]!.t, 0.25) * (1 - ease(t, nodes[i + 1]?.t ?? Infinity, 0.25));
  return (
    <IsoWorld view={v} cam={cam}>
      {paths.map((p, i) => {
        const arrive = nodes[i + 1]!.t;
        const go = arrive - travel(p);
        return (
          <g key={`p${i}`}>
            <IsoPipe path={p} at={Math.min(go - 0.4, nodes[i]!.t + 0.3)} packets={idleAfter === undefined ? undefined : { count: 2, speed: 5, start: idleAfter, tone: "mint" }} active={ease(t, go, 0.2) * (1 - ease(t, arrive + 0.3, 0.4))} />
            <PacketDot path={p} z={0.1} start={go} speed={speed} tone="coral" size={0.34} />
          </g>
        );
      })}
      {nodes.map((n, i) => <TilePulse key={`t${i}`} gx={S[i]!.cx - S[i]!.w / 2} gy={S[i]!.cy - S[i]!.d / 2} w={S[i]!.w} d={S[i]!.d} at={n.t} until={nodes[i + 1]?.t} />)}
      {order.map((i) => <NodeArt key={`n${i}`} n={nodes[i]!} at={nodes[i]!.t - 0.2} act={act(i)} />)}
      {nodes.map((n, i) => <IsoLabel key={`l${i}`} x={S[i]!.cx} y={S[i]!.cy} z={S[i]!.h} text={n.label} tag={n.tag} at={n.t} lift={56} accent={act(i) > 0.5} led={t > (nodes[i + 1]?.t ?? Infinity) ? SIGNAL : ACCENT} />)}
    </IsoWorld>
  );
};

// ---------- exploded layers ----------
export type Layer = { label: string; tag?: string; tone: ToneName; art?: "chips" | "grid" | "bars" | "nodes" };

const LayerArt: FC<{ art: Layer["art"]; z: number; s: number }> = ({ art, z, s }) => {
  if (art === "chips")
    return (
      <>
        {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <IsoBlock key={`${r}${c}`} gx={0.45 + c * (s - 0.9) / 3 + 0.08} gy={0.45 + r * (s - 0.9) / 3 + 0.08} w={(s - 0.9) / 3 - 0.16} d={(s - 0.9) / 3 - 0.16} z={z} h={0.22} tone={r === 1 && c === 1 ? "coral" : "white"} shadow={false} />))}
      </>
    );
  if (art === "bars")
    return (
      <>
        {[0.35, 0.6, 0.25, 0.45].map((hh, i) => <IsoBlock key={i} gx={0.55 + i * 0.8} gy={1.6} w={0.5} d={1.0} z={z} h={hh} tone={i === 1 ? "mint" : "white"} shadow={false} />)}
      </>
    );
  if (art === "nodes") {
    const P: WP[] = [[0.9, 0.9], [s - 0.9, 1.3], [1.5, s - 0.9], [s - 1.0, s - 1.0]];
    return (
      <OnFloor x={0} y={0} z={z}>
        <g stroke="#FFFFFF" strokeWidth={0.07} strokeLinecap="round" opacity={0.9}>
          <line x1={P[0]![0]} y1={P[0]![1]} x2={P[1]![0]} y2={P[1]![1]} />
          <line x1={P[0]![0]} y1={P[0]![1]} x2={P[2]![0]} y2={P[2]![1]} />
          <line x1={P[1]![0]} y1={P[1]![1]} x2={P[3]![0]} y2={P[3]![1]} />
          <line x1={P[2]![0]} y1={P[2]![1]} x2={P[3]![0]} y2={P[3]![1]} />
        </g>
        {P.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.22} fill={i === 3 ? ACCENT : "#FFFFFF"} />)}
      </OnFloor>
    );
  }
  return (
    <OnFloor x={0} y={0} z={z}>
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={0.4 + c * (s - 0.8) / 4 + 0.06} y={0.4 + r * (s - 0.8) / 4 + 0.06} width={(s - 0.8) / 4 - 0.12} height={(s - 0.8) / 4 - 0.12} rx={0.06} fill={(r * 4 + c) % 5 === 2 ? BLUE : "#FFFFFF"} opacity={0.85} />))}
    </OnFloor>
  );
};

// An upright card to the right of an anchor with a horizontal leader (for stacks, where labels hang sideways).
const SideLabel: FC<{ ax: number; ay: number; x: number; text: string; tag?: string; p: number; accent?: boolean }> = ({ ax, ay, x, text, tag, p, accent }) => {
  if (p <= 0) return null;
  const lead = Math.min(1, p * 1.6);
  const card = Math.max(0, Math.min(1, p * 1.6 - 0.6));
  return (
    <g>
      <line x1={ax} y1={ay} x2={ax + (x - ax) * lead} y2={ay} stroke={INK} strokeOpacity={0.45} strokeWidth={2.5} strokeDasharray="2 9" strokeLinecap="round" />
      <circle cx={ax} cy={ay} r={6} fill={CARD} stroke={INK} strokeWidth={2.5} />
      <foreignObject x={x} y={ay - 150} width={720} height={300}>
        <div style={{ height: 300, display: "flex", alignItems: "center" }}>
          <div style={{ opacity: card, transform: `translateX(${(1 - card) * -16}px)`, display: "flex", alignItems: "center", gap: 14, padding: "12px 22px 12px 18px", background: accent ? INK : CARD, color: accent ? "#FFFFFF" : INK, border: `2px solid ${accent ? INK : RULE}`, borderRadius: 14, boxShadow: "0 12px 26px rgba(27,35,64,0.14)", fontFamily: LABEL, fontWeight: 700, fontSize: 36, whiteSpace: "nowrap" }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, background: accent ? ACCENT : BLUE, transform: "rotate(45deg)" }} />
            <span>{text}</span>
            {tag && <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: accent ? "#AFC0EE" : SUB, marginLeft: 6 }}>{tag}</span>}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

// Stacked plates that assemble bottom-up, then float apart (24 f) with dashed corner guides; labels slide out sideways; one layer can be pulled into focus.
export const ExplodedLayers: FC<{ layers: Layer[]; at: number; explode?: number; spread?: number; focus?: { i: number; t: number }; view?: Partial<View>; labelX?: number }> = ({ layers, at, explode, spread = 2.2, focus, view: vp, labelX = 1100 }) => {
  const { t } = useTime();
  const s = 4.2;
  const ph = 0.26;
  const v = view({ u: 60, ox: 720, oy: 800, cx: s / 2, cy: s / 2, ...vp });
  const ex = explode ?? at + layers.length * 0.12 + 0.5;
  const zs = layers.map((_, i) => {
    const e = ease(t, ex + (i * 2) / FPS, 24 / FPS);
    const f = focus && focus.i === i ? ease(t, focus.t, 0.4, Easing.out(Easing.back(1.6))) * 0.4 : 0;
    return i * (0.32 + spread * e) + f + (e >= 1 ? bob(t, i * 1.3, 2) / v.u : 0);
  });
  const corners: WP[] = [[s, 0], [s, s], [0, s]];
  return (
    <IsoWorld view={v}>
      {layers.map((L, i) => {
        const z = zs[i]!;
        const foc = focus && focus.i === i ? ease(t, focus.t, 0.3) : 0;
        const next = zs[i + 1];
        return (
          <g key={i}>
            <IsoBlock gx={0} gy={0} w={s} d={s} z={z} h={ph} tone={L.tone} at={at + i * 0.12} shadow={i === 0} glow={foc} />
            {t > at + i * 0.12 + 0.45 && <LayerArt art={L.art} z={z + ph} s={s} />}
            {next !== undefined && ease(t, ex, 0.3) > 0 &&
              corners.map(([cx, cy], k) => {
                const a = proj(v, cx, cy, z + ph);
                const b = proj(v, cx, cy, next);
                return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeOpacity={0.3 * ease(t, ex, 0.3)} strokeWidth={2} strokeDasharray="3 9" strokeLinecap="round" />;
              })}
          </g>
        );
      })}
      {layers.map((L, i) => {
        const [ax, ay] = proj(v, s, 0, zs[i]! + ph / 2);
        return <SideLabel key={`l${i}`} ax={ax + 10} ay={ay} x={labelX} text={L.label} tag={L.tag} p={ease(t, ex + 0.35 + i * 0.12, 0.45)} accent={!!focus && focus.i === i && t >= focus.t} />;
      })}
    </IsoWorld>
  );
};

// ---------- districts ----------
// A district: a plate of world with a name card on its back corner; districts sit apart on the grid with whitespace between them.
export const District: FC<{ gx: number; gy: number; w: number; d: number; name: string; tag?: string; at?: number; children?: ReactNode; tone?: ToneName }> = ({ gx, gy, w, d, name, tag, at, children, tone = "white" }) => (
  <>
    <IsoPlate gx={gx} gy={gy} w={w} d={d} at={at} tone={tone}>{children}</IsoPlate>
    <IsoLabel x={gx + 0.3} y={gy + 0.3} z={0.35} text={name} tag={tag} at={at === undefined ? undefined : at + 0.3} lift={150} />
  </>
);

// ---------- turn ----------
export type TurnItem = { kind: "block" | "rack" | "building" | "db"; x: number; y: number; w?: number; d?: number; h?: number; tone?: ToneName; units?: number; floors?: number; style?: "tower" | "flat"; label?: string };

// The island turns a quarter (36 f, expo-out) to show its other side: faces swap shading, painter's order re-sorts every frame, labels stay upright.
export const IsoTurnTable: FC<{ items: TurnItem[]; size?: number; at: number; turns?: number; view?: Partial<View>; enter?: number }> = ({ items, size = 5, at, turns = 1, view: vp, enter }) => {
  const { t } = useTime();
  const rot = turns * (Math.PI / 2) * ease(t, at, 36 / FPS, Easing.out(Easing.exp));
  const v = view({ u: 76, ox: 960, oy: 600, cx: size / 2, cy: size / 2, ...vp, rot });
  const c = (it: TurnItem): WP => (it.kind === "db" ? [it.x, it.y] : [it.x + (it.w ?? 1) / 2, it.y + (it.d ?? 1) / 2]);
  const sorted = [...items].sort((a, b) => depthOf(v, ...c(a)) - depthOf(v, ...c(b)));
  const top = (it: TurnItem) => (it.kind === "rack" ? (it.units ?? 4) * 0.39 : it.kind === "building" ? (it.floors ?? 3) * 0.62 + (it.style === "flat" ? 0.2 : 0.9) : it.kind === "db" ? (it.h ?? 1.2) : it.h ?? 1);
  return (
    <IsoWorld view={v}>
      <g transform={`translate(0 ${bob(t, 0, 3)})`}>
        <IsoPlate gx={0} gy={0} w={size} d={size} h={0.45} at={enter}>
          {sorted.map((it, i) => {
            const a = enter === undefined ? undefined : enter + 0.25 + i * 0.07;
            if (it.kind === "rack") return <IsoRack key={i} gx={it.x} gy={it.y} w={it.w} d={it.d} units={it.units ?? 4} at={a} ledSeed={i + 3} />;
            if (it.kind === "building") return <IsoBuilding key={i} gx={it.x} gy={it.y} w={it.w ?? 2} d={it.d ?? 2} floors={it.floors ?? 3} style={it.style ?? "tower"} tone={it.tone ?? "white"} at={a} seed={i + 11} />;
            if (it.kind === "db") return <IsoDatabase key={i} cx={it.x} cy={it.y} r={(it.w ?? 1.2) / 2} h={it.h ?? 1.2} tone={it.tone ?? "blue"} at={a} />;
            return <IsoBlock key={i} gx={it.x} gy={it.y} w={it.w ?? 1} d={it.d ?? 1} h={it.h ?? 1} tone={it.tone ?? "sky"} at={a} />;
          })}
          {items.map((it, i) => (it.label ? <IsoLabel key={`l${i}`} x={c(it)[0]} y={c(it)[1]} z={top(it)} text={it.label} at={enter === undefined ? undefined : enter + 0.7 + i * 0.1} lift={60} /> : null))}
        </IsoPlate>
      </g>
    </IsoWorld>
  );
};

export const FlowBadge: FC<{ text: string; at: number }> = ({ text, at }) => {
  const { t } = useTime();
  const k = ease(t, at, 0.35, Easing.out(Easing.back(1.6)));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 110, display: "flex", alignItems: "center", gap: 16, opacity: Math.min(1, k * 2), transform: `translateY(${(1 - k) * 16}px)` }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 30, color: "#FFFFFF", background: INK, padding: "8px 16px", borderRadius: 10 }}>⏎</span>
        <span style={{ fontFamily: LABEL, fontWeight: 800, fontSize: 48, color: INK }}>{text}</span>
        <span style={{ width: 14, height: 14, background: SIGNAL, borderRadius: 3, transform: "rotate(45deg)" }} />
      </div>
    </AbsoluteFill>
  );
};
