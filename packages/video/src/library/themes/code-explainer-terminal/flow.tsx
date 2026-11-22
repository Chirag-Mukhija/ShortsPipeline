// RequestFlow: service cards joined by dashed lanes, with request and response packets travelling between them and the receiving card pulsing on arrival.
import type { FC } from "react";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { BACK15, BG, BORDER, HEAD, MONO, MUTED, PANEL, TEXT, fr } from "./theme";
import { Monogram, Svg } from "./chrome";

export type FlowNode = { id: string; label: string; sub: string; logo: string; color: string; x: number; y: number; at: number };
export type Hop = { from: string; to: string; at: number; label: string; color: string; dur?: number };

const NW = 350;
const NH = 190;

// A lane from one card's edge to the other's; requests run above the centre line, replies below, so the two directions never overlap.
const lane = (a: FlowNode, b: FlowNode) => {
  const dir = Math.sign(b.x - a.x) || 1;
  const off = dir > 0 ? -30 : 30;
  return { x1: a.x + (dir * NW) / 2 + dir * 14, x2: b.x - (dir * NW) / 2 - dir * 14, y: (a.y + b.y) / 2 + off, dir };
};

export const RequestFlow: FC<{ nodes: FlowNode[]; hops: Hop[] }> = ({ nodes, hops }) => {
  const { t } = useTime();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const arrive = (h: Hop) => h.at + (h.dur ?? 0.6);
  return (
    <>
      <Svg>
        {hops.map((h, i) => {
          const a = byId[h.from]!;
          const b = byId[h.to]!;
          const l = lane(a, b);
          const p = ramp(t, h.at - 0.35, fr(9), INOUT);
          if (p <= 0) return null;
          const xe = l.x1 + (l.x2 - l.x1) * p;
          return (
            <g key={i} stroke={h.color} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85}>
              <line x1={l.x1} y1={l.y} x2={xe} y2={l.y} strokeDasharray="4 14" strokeDashoffset={-t * 60 * l.dir} />
              {p > 0.95 && <path d={`M${l.x2 - l.dir * 18} ${l.y - 12} L${l.x2} ${l.y} L${l.x2 - l.dir * 18} ${l.y + 12}`} strokeWidth={5} strokeLinejoin="round" />}
            </g>
          );
        })}
      </Svg>
      {nodes.map((n) => {
        const e = ramp(t, n.at, fr(16), BACK15);
        if (e <= 0) return null;
        const hit = Math.max(0, ...hops.filter((h) => h.to === n.id).map((h) => (t >= arrive(h) ? 1 - ramp(t, arrive(h), fr(14)) : 0)));
        const hitColor = [...hops].reverse().find((h) => h.to === n.id && t >= arrive(h))?.color ?? n.color;
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: n.x - NW / 2,
              top: n.y - NH / 2,
              width: NW,
              height: NH,
              borderRadius: 18,
              backgroundColor: PANEL,
              border: `2px solid ${hit > 0 ? hitColor : BORDER}`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 ${60 * hit}px ${hitColor}aa`,
              transform: `translateY(${(1 - e) * 40}px) scale(${1 + 0.05 * hit})`,
              opacity: clamp01(e * 2),
              padding: "26px 30px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Monogram text={n.logo} color={n.color} size={58} />
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 46, color: TEXT, letterSpacing: -1 }}>{n.label}</div>
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, color: MUTED }}>{n.sub}</div>
          </div>
        );
      })}
      {hops.map((h, i) => {
        const a = byId[h.from]!;
        const b = byId[h.to]!;
        const l = lane(a, b);
        const p = ramp(t, h.at, h.dur ?? 0.6, INOUT);
        if (t < h.at || t > arrive(h) + fr(3)) return null;
        const x = l.x1 + (l.x2 - l.x1) * p;
        // The dot rides the whole lane; its label follows but stays between the cards.
        const half = (h.label.length * 28 * 0.6 + 32) / 2;
        const lo = Math.min(l.x1, l.x2) + half;
        const hi = Math.max(l.x1, l.x2) - half;
        const lx = lo < hi ? Math.min(hi, Math.max(lo, x)) : (l.x1 + l.x2) / 2;
        return (
          <div key={`p${i}`}>
          <div style={{ position: "absolute", left: x - 11, top: l.y - 11, width: 22, height: 22, borderRadius: 11, backgroundColor: h.color, boxShadow: `0 0 22px ${h.color}, 0 0 6px #fff` }} />
          <div
            style={{
              position: "absolute",
              left: lx,
              top: l.y + (l.dir > 0 ? -46 : 46),
              transform: "translate(-50%, -50%)",
              padding: "8px 16px",
              borderRadius: 10,
              backgroundColor: h.color,
              color: BG,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 28,
              whiteSpace: "pre",
              boxShadow: `0 0 26px ${h.color}aa`,
            }}
          >
            {h.label}
          </div>
          </div>
        );
      })}
    </>
  );
};
