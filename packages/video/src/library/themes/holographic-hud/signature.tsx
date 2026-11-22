// Holographic HUD signature moments: the flow table (cards standing on a perspective floor), the exploded hologram stack, the wire globe radar and the inverted incident alert.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FPS, H, W } from "../../core/video";
import { INOUT, ramp, useTime } from "../../core/time";
import { ALERT, CARBON, HEAD, HOLO, INK, LABEL_STYLE, MONO, MUTED, OK, PAPER, TONE, VIOLET, chroma, rgba, shadows, type Tone } from "./theme";
import { EXPO, flash, flickerIn, noise, pop, roll } from "./motion";
import { floorRing, project, type Cam } from "./space";
import { Emitter, HoloCard, Label, Readouts, ScrambleText, type ReadoutRow } from "./primitives";
import { GlitchSlice } from "./transitions";

const T = (frames: number) => frames / FPS;

// ---------- flow table ----------

// World height the node cards float at above their pads.
const STALK = 170;

export type FlowNode = { id: string; label: string; sub?: string; x: number; z: number; t: number; tone?: Tone };
export type FlowLink = { from: string; to: string; t: number };

// A diagram on a holo-table: pads light up on a perspective floor, node cards rise out of them on light stalks, links draw across the floor and packets run along them while the table slowly turns.
export const FlowFloor: FC<{ nodes: FlowNode[]; links: FlowLink[]; at?: number; plate?: [number, number, number, number] }> = ({ nodes, links, at = 0, plate = [-860, 860, -430, 460] }) => {
  const { t } = useTime();
  const cam: Cam = { h: 1250, d: 1500, f: 1500, cx: 960, cy: 580, yaw: Math.sin(t * 0.3) * 4 };
  const s0 = project({ ...cam, yaw: 0 }, 0, 0, 0).s;
  const [x0, x1, z0, z1] = plate;
  const plateIn = ramp(t, at, 0.8, EXPO);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const grid: ReactNode[] = [];
  for (let gx = x0; gx <= x1 + 1; gx += 100) {
    const a = project(cam, gx, 0, z0);
    const b = project(cam, gx, 0, z0 + (z1 - z0) * plateIn);
    grid.push(<line key={`gx${gx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rgba(HOLO, gx % 500 === 0 ? 0.22 : 0.09)} strokeWidth={1.2} />);
  }
  for (let gz = z0; gz <= z0 + (z1 - z0) * plateIn + 1; gz += 100) {
    const a = project(cam, x0, 0, gz);
    const b = project(cam, x1, 0, gz);
    grid.push(<line key={`gz${gz}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rgba(HOLO, 0.09)} strokeWidth={1.2} />);
  }
  const corners = [project(cam, x0, 0, z0), project(cam, x1, 0, z0), project(cam, x1, 0, z1), project(cam, x0, 0, z1)];
  const sorted = [...nodes].sort((a, b) => b.z - a.z);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <polygon points={corners.map((c) => `${c.x},${c.y}`).join(" ")} fill={rgba(HOLO, 0.04 * plateIn)} stroke={rgba(HOLO, 0.5)} strokeWidth={2} opacity={plateIn} />
        {grid}
        {links.map((l, i) => {
          const a = byId.get(l.from)!;
          const b = byId.get(l.to)!;
          const p = ramp(t, l.t, 0.5, INOUT);
          if (p <= 0) return null;
          const A = project(cam, a.x, 0, a.z);
          const B = project(cam, b.x + (a.x - b.x) * (1 - p), 0, b.z + (a.z - b.z) * (1 - p));
          const packets = p >= 1 ? [0, 0.5].map((ph) => {
            const u = ((t - l.t - 0.5) * 0.55 + ph) % 1;
            return [0, 0.03, 0.06].map((d, k) => {
              const uu = Math.max(0, u - d);
              const P = project(cam, a.x + (b.x - a.x) * uu, 0, a.z + (b.z - a.z) * uu);
              return <circle key={`${ph}-${k}`} cx={P.x} cy={P.y} r={(7 - k * 2) * (P.s / s0)} fill={k ? HOLO : INK} opacity={1 - k * 0.3} />;
            });
          }) : null;
          return (
            <g key={i}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={rgba(HOLO, 0.35)} strokeWidth={8} />
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={HOLO} strokeWidth={2.5} strokeDasharray="14 10" strokeDashoffset={-t * 60} />
              {packets}
            </g>
          );
        })}
        {nodes.map((n) => {
          const e = ramp(t, n.t - 0.15, 0.4, EXPO);
          if (e <= 0) return null;
          const col = TONE[n.tone ?? "holo"];
          const base = project(cam, n.x, 0, n.z);
          const top = project(cam, n.x, STALK, n.z);
          return (
            <g key={n.id}>
              <polygon points={floorRing(cam, n.x, n.z, 120 * e)} fill={rgba(col, 0.1)} stroke={rgba(col, 0.5)} strokeWidth={1.5} />
              <polygon points={floorRing(cam, n.x, n.z, 82 * e)} fill="none" stroke={col} strokeWidth={3} strokeDasharray="18 10" strokeDashoffset={-t * 40} />
              <polygon points={floorRing(cam, n.x, n.z, 26 * e)} fill={INK} opacity={0.9} />
              <line x1={base.x} y1={base.y} x2={top.x} y2={base.y + (top.y - base.y) * pop(t, n.t)} stroke={col} strokeWidth={2} strokeDasharray="3 5" />
            </g>
          );
        })}
      </svg>
      {sorted.map((n) => {
        if (t < n.t) return null;
        const col = TONE[n.tone ?? "holo"];
        const p = project(cam, n.x, STALK, n.z);
        const k = p.s / s0;
        const rise = Math.min(1.08, pop(t, n.t, 12, 170));
        const cw = 320;
        const ch = 118;
        return (
          <div key={n.id} style={{ position: "absolute", left: p.x - cw / 2, top: p.y - ch, width: cw, height: ch, transformOrigin: "50% 100%", transform: `scale(${k}, ${k * rise})`, opacity: flickerIn(t, n.t, n.x, 5) }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${rgba(col, 0.2)}, ${rgba(col, 0.07)})`, border: `1.5px solid ${rgba(col, 0.75)}`, clipPath: "polygon(18px 0, 100% 0, 100% 100%, 0 100%, 0 18px)" }} />
            <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: ch, background: col }} />
            <div style={{ position: "absolute", inset: 0, padding: "16px 20px 0 26px", display: "flex", flexDirection: "column", gap: 6 }}>
              <ScrambleText text={n.label} at={n.t + 0.12} cps={40} seed={n.label.length + 3} style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 40, color: INK, whiteSpace: "nowrap" }} />
              {n.sub && <ScrambleText text={n.sub} at={n.t + 0.3} cps={50} seed={n.sub.length} style={{ fontFamily: MONO, fontSize: 30, color: col, whiteSpace: "nowrap" }} />}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- exploded hologram ----------

export type StackLayer = { name: string; sub?: string };

const PlateArt: FC<{ i: number; lit: number; t: number }> = ({ i, lit, t }) => {
  const S = 420;
  const col = HOLO;
  const kind = i % 3;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute", inset: 0 }}>
      <path d={`M 30 0 H ${S} V ${S - 30} L ${S - 30} ${S} H 0 V 30 Z`} fill={rgba(col, 0.08 + lit * 0.12)} stroke={rgba(col, 0.75 + lit * 0.25)} strokeWidth={3} />
      {kind === 0 && (
        <g fill="none" stroke={rgba(col, 0.7)} strokeWidth={2}>
          {[150, 110, 70].map((r) => <rect key={r} x={S / 2 - r} y={S / 2 - r} width={r * 2} height={r * 2} />)}
          <rect x={S / 2 - 40} y={S / 2 - 40} width={80} height={80} fill={rgba(col, 0.45 + lit * 0.3)} />
          {[0, 1, 2, 3].map((k) => <line key={k} x1={S / 2} y1={S / 2 - 40} x2={S / 2} y2={20} transform={`rotate(${k * 90} ${S / 2} ${S / 2})`} />)}
        </g>
      )}
      {kind === 1 && (
        <g>
          {Array.from({ length: 36 }, (_, k) => {
            const on = noise(k + 5, Math.floor(t * 6)) > 0.55;
            return <rect key={k} x={60 + (k % 6) * 52} y={60 + Math.floor(k / 6) * 52} width={40} height={40} fill={on ? rgba(VIOLET, 0.75) : rgba(col, 0.12)} stroke={rgba(col, 0.5)} strokeWidth={1.5} />;
          })}
        </g>
      )}
      {kind === 2 && (
        <g>
          {Array.from({ length: 13 }, (_, k) => [0, 1, 2, 3].map((side) => <rect key={`${k}-${side}`} x={S / 2 - 6} y={8} width={12} height={26} fill={rgba(col, 0.8)} transform={`rotate(${side * 90} ${S / 2} ${S / 2}) translate(${(k - 6) * 24} 0)`} />))}
          <circle cx={S / 2} cy={S / 2} r={90} fill="none" stroke={OK} strokeWidth={3} strokeDasharray="40 14" transform={`rotate(${t * 30} ${S / 2} ${S / 2})`} />
          <circle cx={S / 2} cy={S / 2} r={50} fill={rgba(OK, 0.25)} stroke={OK} strokeWidth={2} />
        </g>
      )}
    </svg>
  );
};

// A hologram projected from a floor pad: plates of a system float as a slowly turning stack, explode apart on cue, and each layer is called out with a leader line and label as a scan band climbs through it.
export const HoloStack: FC<{ layers: StackLayer[]; at: number; explodeAt: number; cx?: number; cy?: number }> = ({ layers, at, explodeAt, cx = 720, cy = 540 }) => {
  const { t } = useTime();
  const n = layers.length;
  const on = ramp(t, at, 0.5, EXPO);
  const gap = 24 + ramp(t, explodeAt, 0.7, EXPO) * 120;
  const yaw = 30 + (t - at) * 16;
  const tilt = -26;
  const P = 1400;
  const poY = cy - 40;
  const offY = (i: number) => -(i - (n - 1) / 2) * gap;
  // Screen y of a plate centre after the tilt and perspective, so leaders hit the plates.
  const screenY = (i: number) => {
    const yl = offY(i);
    const a = (tilt * Math.PI) / 180;
    const yr = Math.cos(a) * yl;
    const zr = Math.sin(a) * yl;
    return poY + (cy + yr - poY) * (P / (P - zr));
  };
  const scanY = cy + 300 - (((t - at) * 240) % 640);
  const flick = noise(Math.floor(t * FPS), 3) > 0.96 ? 0.55 : 1;
  const labelX = 1200;
  const labelY = (i: number) => cy + (i - (n - 1) / 2) * -190;
  return (
    <AbsoluteFill>
      <Emitter x={cx} y={cy + 360} w={460} top={cy - 200} topW={640} on={on} seed={8} />
      <AbsoluteFill style={{ perspective: P, perspectiveOrigin: `${cx}px ${poY}px`, opacity: on * flick }}>
        <div style={{ position: "absolute", left: cx, top: cy, width: 0, height: 0, transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg) rotateY(${yaw}deg)` }}>
          {layers.map((_, i) => {
            const lit = Math.max(0, 1 - Math.abs(scanY - screenY(i)) / 50);
            return (
              <div key={i} style={{ position: "absolute", left: -210, top: -210, width: 420, height: 420, transform: `translateY(${offY(i)}px) rotateX(90deg) scale(${ramp(t, at + 0.2 + i * 0.12, 0.5, EXPO)})` }}>
                <PlateArt i={i} lit={lit} t={t} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: cx - 330, top: scanY - 30, width: 660, height: 60, background: `linear-gradient(180deg, transparent, ${rgba(HOLO, 0.22)}, transparent)`, opacity: on }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {layers.map((_, i) => {
          const la = explodeAt + 0.5 + (n - 1 - i) * 0.18;
          const p = ramp(t, la, 0.4, EXPO);
          if (p <= 0) return null;
          const sx = cx + 250;
          const sy = screenY(i);
          const ex = labelX - 30;
          const ey = labelY(i);
          const mx = sx + (ex - sx) * 0.45;
          return <path key={i} d={`M ${sx} ${sy} H ${mx} L ${ex} ${ey}`} fill="none" stroke={HOLO} strokeWidth={2} pathLength={1} strokeDasharray={`${p} 1`} />;
        })}
      </svg>
      {layers.map((l, i) => {
        const la = explodeAt + 0.6 + (n - 1 - i) * 0.18;
        if (t < la) return null;
        return (
          <div key={i} style={{ position: "absolute", left: labelX, top: labelY(i) - 46, opacity: flickerIn(t, la, i + 4, 4) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 30, color: HOLO }}>{`L${i + 1}`}</span>
              <ScrambleText text={l.name} at={la} cps={40} seed={i + 60} style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 52, color: INK }} />
            </div>
            {l.sub && <ScrambleText text={l.sub} at={la + 0.2} cps={60} seed={i + 70} style={{ ...LABEL_STYLE, letterSpacing: "0.06em", textTransform: "none", fontWeight: 600, fontSize: 32, color: MUTED, display: "block", marginTop: 4, marginLeft: 52 }} />}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- wire globe radar ----------

export type GlobeDot = { lat: number; lon: number; at: number; label?: string; tone?: Tone };

// Orthographic globe point: lon/lat in degrees after spin and tilt; z > 0 faces the viewer.
const globePt = (lat: number, lon: number, spin: number, tilt: number, R: number) => {
  const la = (lat * Math.PI) / 180;
  const lo = ((lon + spin) * Math.PI) / 180;
  const ti = (tilt * Math.PI) / 180;
  const x = R * Math.cos(la) * Math.sin(lo);
  const y0 = R * Math.sin(la);
  const z0 = R * Math.cos(la) * Math.cos(lo);
  return { x, y: y0 * Math.cos(ti) - z0 * Math.sin(ti), z: y0 * Math.sin(ti) + z0 * Math.cos(ti) };
};

// Split a polyline into the runs that face the viewer and the runs behind the globe.
const sidePaths = (pts: { x: number; y: number; z: number }[], cx: number, cy: number) => {
  let front = "";
  let back = "";
  pts.forEach((p, i) => {
    const prev = pts[i - 1];
    const cmd = (s: string, isFront: boolean) => `${s}${!prev || prev.z > 0 !== isFront ? "M" : "L"} ${(cx + p.x).toFixed(1)} ${(cy - p.y).toFixed(1)} `;
    if (p.z > 0) front = cmd(front, true);
    else back = cmd(back, false);
  });
  return { front, back };
};

// A wireframe globe turning inside a radar ring: nodes ping when they face us, arcs lift between them, and a sweep circles the rim.
export const WireGlobe: FC<{ dots: GlobeDot[]; arcs?: [number, number, number][]; at: number; cx?: number; cy?: number; R?: number; rows?: ReadoutRow[]; panelTitle?: string }> = ({ dots, arcs = [], at, cx = 700, cy = 540, R = 300, rows, panelTitle = "Network" }) => {
  const { t } = useTime();
  const spin = -110 + (t - at) * 14;
  const tilt = 22;
  const on = ramp(t, at, 0.8, EXPO);
  const r = R * (0.6 + 0.4 * on);
  const lines: { front: string; back: string }[] = [];
  for (let lon = 0; lon < 180; lon += 20) {
    const pts = Array.from({ length: 61 }, (_, i) => globePt(-90 + i * 6, lon, spin, tilt, r));
    const pts2 = Array.from({ length: 61 }, (_, i) => globePt(90 - i * 6, lon + 180, spin, tilt, r));
    lines.push(sidePaths([...pts, ...pts2], cx, cy));
  }
  for (let lat = -60; lat <= 60; lat += 20) lines.push(sidePaths(Array.from({ length: 73 }, (_, i) => globePt(lat, i * 5, spin, tilt, r)), cx, cy));
  const sweepA = (t - at) * 90;
  return (
    <AbsoluteFill style={{ opacity: on }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="hud-globe-core">
            <stop offset="0" stopColor={HOLO} stopOpacity="0.10" />
            <stop offset="1" stopColor={HOLO} stopOpacity="0.02" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="url(#hud-globe-core)" stroke={rgba(HOLO, 0.5)} strokeWidth={2} />
        {lines.map((l, i) => <path key={`b${i}`} d={l.back} fill="none" stroke={rgba(HOLO, 0.14)} strokeWidth={1.2} />)}
        {lines.map((l, i) => <path key={`f${i}`} d={l.front} fill="none" stroke={rgba(HOLO, 0.55)} strokeWidth={1.6} />)}
        <g transform={`translate(${cx} ${cy})`}>
          <circle r={R + 52} fill="none" stroke={rgba(HOLO, 0.25)} strokeWidth={1.5} />
          {Array.from({ length: 120 }, (_, i) => {
            const a = (i / 120) * Math.PI * 2;
            const L = i % 10 === 0 ? 16 : 7;
            return <line key={i} x1={Math.cos(a) * (R + 52)} y1={Math.sin(a) * (R + 52)} x2={Math.cos(a) * (R + 52 + L)} y2={Math.sin(a) * (R + 52 + L)} stroke={rgba(HOLO, i % 10 === 0 ? 0.7 : 0.3)} strokeWidth={1.5} />;
          })}
          {Array.from({ length: 14 }, (_, k) => {
            const a0 = ((sweepA - k * 3) * Math.PI) / 180;
            const a1 = ((sweepA - (k + 1) * 3) * Math.PI) / 180;
            const rr = R + 50;
            return <path key={k} d={`M 0 0 L ${Math.cos(a0) * rr} ${Math.sin(a0) * rr} A ${rr} ${rr} 0 0 0 ${Math.cos(a1) * rr} ${Math.sin(a1) * rr} Z`} fill={HOLO} opacity={0.28 * (1 - k / 14)} />;
          })}
          <line x1={0} y1={0} x2={Math.cos((sweepA * Math.PI) / 180) * (R + 70)} y2={Math.sin((sweepA * Math.PI) / 180) * (R + 70)} stroke={INK} strokeWidth={2} opacity={0.8} />
          <ellipse rx={R + 120} ry={(R + 120) * 0.28} fill="none" stroke={rgba(VIOLET, 0.55)} strokeWidth={2} strokeDasharray="6 10" transform="rotate(-14)" />
          {(() => {
            const a = (t - at) * 0.9;
            return <circle cx={Math.cos(a) * (R + 120)} cy={Math.sin(a) * (R + 120) * 0.28} r={8} fill={VIOLET} transform="rotate(-14)" />;
          })()}
        </g>
        {arcs.map(([i, j, a], k) => {
          const A = dots[i]!;
          const B = dots[j]!;
          const p = ramp(t, a, 0.8, INOUT);
          if (p <= 0) return null;
          const pts = Array.from({ length: 33 }, (_, s) => {
            const u = (s / 32) * p;
            const lift = 1 + 0.28 * Math.sin(Math.PI * (s / 32));
            const g = globePt(A.lat + (B.lat - A.lat) * u, A.lon + (B.lon - A.lon) * u, spin, tilt, r * lift);
            return g;
          });
          const d = sidePaths(pts, cx, cy);
          return (
            <g key={k}>
              <path d={d.back} fill="none" stroke={rgba(OK, 0.25)} strokeWidth={2} />
              <path d={d.front} fill="none" stroke={OK} strokeWidth={3} />
            </g>
          );
        })}
        {dots.map((d, i) => {
          if (t < d.at) return null;
          const g = globePt(d.lat, d.lon, spin, tilt, r);
          const col = TONE[d.tone ?? "holo"];
          const front = g.z > 0;
          const ping = ((t - d.at) * 0.8 + i * 0.3) % 1;
          return (
            <g key={i} opacity={front ? 1 : 0.3}>
              {front && <circle cx={cx + g.x} cy={cy - g.y} r={8 + ping * 40} fill="none" stroke={col} strokeWidth={2} opacity={1 - ping} />}
              <circle cx={cx + g.x} cy={cy - g.y} r={front ? 8 : 5} fill={front ? INK : col} stroke={col} strokeWidth={3} />
            </g>
          );
        })}
      </svg>
      {rows && (
        <HoloCard x={1450} y={540} w={540} h={rows.length * 96 + 120} at={at + 0.5} ry={-12} title={panelTitle} code="06" seed={21}>
          <Readouts rows={rows} width={472} size={38} />
        </HoloCard>
      )}
    </AbsoluteFill>
  );
};

// ---------- incident ----------

// The one big gesture: the HUD hard-cuts to its negative (light field, carbon ink), a red cross slams in, a huge vertical counter rolls and the incident card glitches into place.
export const IncidentAlert: FC<{ at: number; title: string; detail: string; code?: number; kind?: string; before?: ReactNode }> = ({ at, title, detail, code = 39, kind = "Incident", before }) => {
  const { t, f } = useTime();
  if (t < at) return <>{before}</>;
  const k = Math.floor((t - at) * FPS);
  const crossX = ramp(t, at + T(2), T(10), EXPO);
  const crossY = ramp(t, at + T(4), T(10), EXPO);
  const n = roll(t, at + T(3), code, 0.7, 0, 9);
  const num = n.text.padStart(4, "0");
  const fl = flash(t, at + T(3) + 0.7, 5);
  const cardP = pop(t, at + T(6), 11, 200);
  const blink = Math.floor(f / 10) % 2 === 0;
  const corner = (s: string, pos: Record<string, number>, delay: number) => (
    <div style={{ position: "absolute", ...pos, ...LABEL_STYLE, fontSize: 30, color: CARBON, opacity: flickerIn(t, at + delay, delay * 100, 4) }}>{s}</div>
  );
  return (
    <GlitchSlice at={at + T(2)} frames={6} strength={90} seed={13}>
      <AbsoluteFill style={{ background: PAPER }}>
        <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, ${rgba(CARBON, 0.05)} 0px, ${rgba(CARBON, 0.05)} 1px, transparent 1px, transparent 4px)` }} />
        <div style={{ position: "absolute", left: 1060 - 500, top: 540 - 70, width: 1000, height: 140, background: ALERT, transform: `rotate(45deg) scaleX(${crossX})` }} />
        <div style={{ position: "absolute", left: 1060 - 500, top: 540 - 70, width: 1000, height: 140, background: ALERT, transform: `rotate(-45deg) scaleX(${crossY})` }} />
        <div style={{ position: "absolute", left: 230, top: 540, transform: "translate(-50%, -50%) rotate(-90deg)", fontFamily: MONO, fontWeight: 600, fontSize: 290, lineHeight: 1, color: CARBON, letterSpacing: "-0.04em", textShadow: chroma(fl * 10) }}>{num}</div>
        <div style={{ position: "absolute", left: 420, top: 160, width: 2, height: 760, background: rgba(CARBON, 0.4) }} />
        {corner(`${kind} ${num}`, { left: 470, top: 110 }, 0.15)}
        {corner("Severity · High", { right: 110, top: 110 }, 0.25)}
        {corner(`Status · ${blink ? "Open" : "    "}`, { right: 110, bottom: 100 }, 0.35)}
        {corner("Auto-rollback · Armed", { left: 470, bottom: 100 }, 0.45)}
        {k >= 6 && (
          <div style={{ position: "absolute", left: 1060 - 440, top: 540 - 170, width: 880, height: 340, transform: `scale(${0.85 + 0.15 * Math.min(cardP, 1.05)})`, background: "#FFFFFF", border: `3px solid ${CARBON}`, clipPath: "polygon(28px 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%, 0 28px)", padding: "38px 48px", boxShadow: `14px 14px 0 ${CARBON}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 16, height: 16, background: ALERT, opacity: blink ? 1 : 0.3 }} />
              <Label size={32} color={ALERT}>{kind}</Label>
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 92, lineHeight: 1.05, color: CARBON, marginTop: 14, textShadow: shadows(chroma(1.5 + flash(t, at + T(6), 6) * 10)) }}>
              <ScrambleText text={title} at={at + T(8)} cps={34} seed={5} scrambleColor={ALERT} />
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 32, color: rgba(CARBON, 0.8), marginTop: 16 }}>
              <ScrambleText text={detail} at={at + 0.6} cps={50} seed={6} scrambleColor={ALERT} />
            </div>
          </div>
        )}
        {k < 2 && <AbsoluteFill style={{ background: "#FFFFFF" }} />}
      </AbsoluteFill>
    </GlitchSlice>
  );
};

