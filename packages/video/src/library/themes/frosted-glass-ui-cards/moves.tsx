// Glass moves: the frost wipe (a sheet of glass sweeps across and the scene changes behind it) and the exploded layer stack (an interface tilts into 3D and separates into labelled glass layers).
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { W, H } from "../../core/video";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { CYAN, INK, SANS, SOFT, rgba, sp } from "./theme";
import { FadeCtx, GlintBand, useRig } from "./glass";
import { FROST } from "./field";

// ---------- frost wipe ----------
// The sheet is 1.35 screens wide so that at the midpoint it covers the whole frame; the scenes swap there, hidden under 36 px of frost.
export const FrostWipe: FC<{ at: number; dur?: number; a: ReactNode; b: ReactNode }> = ({ at, dur = 1.1, a, b }) => {
  const { t } = useTime();
  const e = ramp(t, at, dur, INOUT);
  const SW = W * 1.35;
  const left = interpolate(e, [0, 1], [W + 60, -SW - 60]);
  const trail = interpolate(clamp01(e * 1.12 - 0.12), [0, 1], [W + 60, -SW - 60]) + SW - 40;
  // A short crossfade under full cover hides any layout jump between the two scenes.
  const mixB = ramp(t, at + dur * 0.44, dur * 0.12);
  const live = e > 0 && e < 1;
  return (
    <>
      {mixB < 1 && <AbsoluteFill style={mixB > 0 ? { opacity: 1 - mixB } : undefined}>{a}</AbsoluteFill>}
      {mixB > 0 && <AbsoluteFill style={mixB < 1 ? { opacity: mixB } : undefined}>{b}</AbsoluteFill>}
      {live && (
        <>
          {/* Trailing strip: a thinner, cooler pane a beat behind the main sheet, for depth. */}
          <div style={{ position: "absolute", top: -140, height: H + 280, left: trail, width: 260, borderRadius: 60, transform: "rotate(-6deg)", background: `linear-gradient(100deg, ${rgba(CYAN, 0.22)}, ${rgba(CYAN, 0.06)})`, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)", boxShadow: "inset 1.5px 0 0 rgba(255,255,255,0.6)" }} />
          <div
            style={{
              position: "absolute",
              top: -140,
              height: H + 280,
              left,
              width: SW,
              borderRadius: 80,
              transform: "rotate(-6deg)",
              backgroundImage: `${FROST}, linear-gradient(100deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.12) 18%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.16) 100%)`,
              backgroundSize: "220px 220px, 100% 100%",
              backdropFilter: "blur(36px) saturate(170%)",
              WebkitBackdropFilter: "blur(36px) saturate(170%)",
              boxShadow: "-40px 0 80px -20px rgba(10,5,40,0.5), inset 3px 0 0 rgba(255,255,255,0.85), inset 14px 0 30px -12px rgba(255,255,255,0.5)",
            }}
          >
            <GlintBand u={clamp01(e * 1.4 - 0.2)} strength={0.8} r={80} />
          </div>
        </>
      )}
    </>
  );
};

// ---------- exploded layer stack ----------
// `anchor` is the point on the layer (box-local px) its callout pins to; defaults to the right edge's middle.
export type StackLayer = { z: number; label: string; sub?: string; node: ReactNode; anchor?: [number, number] };

type V3 = [number, number, number];
const rotX = ([x, y, z]: V3, a: number): V3 => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotY = ([x, y, z]: V3, a: number): V3 => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotZ = ([x, y, z]: V3, a: number): V3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const D = Math.PI / 180;

// Same maths as the CSS transform below, so flat callouts can be pinned to points on tilted layers.
const project = (p: V3, rx: number, ry: number, rz: number, persp: number, s: number) => {
  const v = rotX(rotY(rotZ(p, rz * D), ry * D), rx * D);
  const k = persp / (persp - v[2] * s);
  return [v[0] * k * s, v[1] * k * s] as const;
};

export const LayerStack: FC<{ layers: StackLayer[]; x: number; y: number; w: number; h: number; at?: number; tiltAt: number; explodeAt: number; out?: number; tilt?: { rx: number; ry: number; rz: number }; labelX?: number; scale?: number }> = ({
  layers, x, y, w, h, at = 0, tiltAt, explodeAt, out, tilt = { rx: 48, ry: 0, rz: -30 }, labelX = 1500, scale = 1,
}) => {
  const { t } = useTime();
  const rig = useRig();
  const te = ramp(t, tiltAt, 1.1, INOUT);
  const ex = sp(t, explodeAt, { damping: 17, stiffness: 80, mass: 1 });
  const fadeOut = out === undefined ? 1 : 1 - ramp(t, out, 0.35);
  const rx = tilt.rx * te - rig.cy * 5;
  const ry = tilt.ry * te + rig.cx * 6;
  const rz = tilt.rz * te;
  const persp = 2600;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <>
      {layers.map((L, i) => {
        const appear = ramp(t, at + i * 0.12, 0.5, OUT);
        const z = L.z * ex;
        return (
          <FadeCtx.Provider key={i} value={appear * fadeOut}>
            <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transformOrigin: "50% 50%", transform: `perspective(${persp}px) scale(${scale}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translateZ(${z}px) translateY(${(1 - appear) * 30}px)` }}>{L.node}</div>
          </FadeCtx.Provider>
        );
      })}
      {/* Flat callouts pinned to each layer's right edge, drawn after the explode lands. */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {layers.map((L, i) => {
          const o = ramp(t, explodeAt + 0.5 + i * 0.15, 0.4) * fadeOut;
          if (o <= 0) return null;
          const [px, py] = project([(L.anchor?.[0] ?? w) - w / 2, (L.anchor?.[1] ?? h / 2) - h / 2, L.z * ex], rx, ry, rz, persp, scale);
          const ax = cx + px;
          const ay = cy + py;
          return (
            <g key={i} opacity={o}>
              <line x1={ax} y1={ay} x2={labelX - 20} y2={ay} stroke="rgba(255,255,255,0.55)" strokeWidth={2.5} strokeDasharray="3 9" strokeLinecap="round" />
              <circle cx={ax} cy={ay} r={9} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 8px ${CYAN})` }} />
            </g>
          );
        })}
      </svg>
      {layers.map((L, i) => {
        const o = ramp(t, explodeAt + 0.5 + i * 0.15, 0.4) * fadeOut;
        if (o <= 0) return null;
        const [, py] = project([(L.anchor?.[0] ?? w) - w / 2, (L.anchor?.[1] ?? h / 2) - h / 2, L.z * ex], rx, ry, rz, persp, scale);
        return (
          <div key={i} style={{ position: "absolute", left: labelX, top: cy + py - 44, height: 88, display: "flex", alignItems: "center", gap: 16, opacity: o, transform: `translateX(${(1 - o) * 20}px)`, padding: "0 28px", borderRadius: 44, background: "linear-gradient(170deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))", backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.6), 0 20px 40px -16px rgba(10,5,40,0.5)" }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: INK }}>{L.label}</span>
            {L.sub && <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: SOFT }}>{L.sub}</span>}
          </div>
        );
      })}
    </>
  );
};

