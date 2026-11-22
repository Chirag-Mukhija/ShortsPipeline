// Holographic HUD transitions: seeded glitch-slice displacement and the scan wipe that swaps scenes behind a bright travelling line.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FPS, H, W } from "../../core/video";
import { INOUT, ramp, useTime } from "../../core/time";
import { ALERT, HOLO, INK, LABEL_STYLE, MONO, rgba } from "./theme";
import { noise } from "./motion";

// For `frames` frames after `at`, the layer is cut into horizontal strips that jump sideways by seeded amounts; otherwise it renders untouched.
export const GlitchSlice: FC<{ at: number; frames?: number; strength?: number; strips?: number; seed?: number; children: ReactNode }> = ({ at, frames = 6, strength = 60, strips = 9, seed = 1, children }) => {
  const { t, f } = useTime();
  const k = Math.floor((t - at) * FPS);
  if (k < 0 || k >= frames) return <>{children}</>;
  // Strip edges re-roll every frame, so the cut never repeats.
  const cuts = Array.from({ length: strips - 1 }, (_, i) => noise(seed + f, i)).sort((a, b) => a - b);
  const edges = [0, ...cuts, 1];
  const decay = 1 - k / frames;
  return (
    <AbsoluteFill>
      {edges.slice(0, -1).map((e0, i) => {
        const e1 = edges[i + 1]!;
        const dx = (noise(seed * 3 + f, i) - 0.5) * 2 * strength * decay * (noise(seed + f, i + 50) > 0.4 ? 1 : 0.1);
        return (
          <AbsoluteFill key={i} style={{ clipPath: `inset(${e0 * 100}% 0 ${(1 - e1) * 100}% 0)`, transform: `translateX(${dx}px)` }}>
            {children}
          </AbsoluteFill>
        );
      })}
      {[0, 1].map((j) => (
        <div key={j} style={{ position: "absolute", left: 0, top: noise(seed + f, 90 + j) * H, width: W, height: 2 + noise(seed + f, 95 + j) * 6, background: j ? rgba(ALERT, 0.6) : rgba(HOLO, 0.7) }} />
      ))}
    </AbsoluteFill>
  );
};

// A bright vertical line crosses the frame; the incoming scene is already behind it, and lands with a short glitch.
export const ScanWipe: FC<{ at: number; dur?: number; from: ReactNode; to: ReactNode; glitch?: boolean; label?: string }> = ({ at, dur = 0.6, from, to, glitch = true, label = "Scan" }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, INOUT);
  if (p <= 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  const x = -60 + p * (W + 120);
  const incoming = glitch ? <GlitchSlice at={at + dur - 2 / FPS} frames={6} strength={36} seed={7}>{to}</GlitchSlice> : to;
  if (p >= 1) return <AbsoluteFill>{incoming}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x}px)` }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${W - x}px 0 0)` }}>{incoming}</AbsoluteFill>
      <div style={{ position: "absolute", left: x - 220, top: 0, width: 220, height: H, background: `linear-gradient(90deg, transparent, ${rgba(HOLO, 0.16)})` }} />
      <div style={{ position: "absolute", left: x - 2, top: 0, width: 4, height: H, background: INK, boxShadow: `0 0 28px 8px ${rgba(HOLO, 0.75)}` }} />
      <svg style={{ position: "absolute", left: x - 30, top: 0, overflow: "visible" }} width={30} height={H}>
        {Array.from({ length: 55 }, (_, i) => (
          <line key={i} x1={30 - (i % 5 === 0 ? 22 : 10)} y1={i * 20} x2={28} y2={i * 20} stroke={rgba(HOLO, 0.8)} strokeWidth={1.5} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: x + 18, top: 120, display: "flex", gap: 10, alignItems: "baseline", whiteSpace: "nowrap" }}>
        <span style={{ ...LABEL_STYLE, fontSize: 28, color: HOLO }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 28, color: INK, fontVariantNumeric: "tabular-nums" }}>{`${String(Math.round(p * 100)).padStart(3, "0")}%`}</span>
      </div>
    </AbsoluteFill>
  );
};
