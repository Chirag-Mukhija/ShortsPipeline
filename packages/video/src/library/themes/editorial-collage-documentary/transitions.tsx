// In-theme scene changes: the paper-rip wipe (the outgoing scene tears down a seeded jagged line and both halves pull apart) and the chapter plate it usually reveals.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { COND, INK, PLATE, RED, SERIF, SHEET, hardShadow } from "./theme";
import { noise1, q12, rng, type P } from "./rough";
import { GrainOverlay, TypeLine } from "./paper";

// The tear line from top to bottom: a slow wander plus fibrous jitter, around x = W/2.
const tearLine = (seed: number, amp = 70): P[] => {
  const n = noise1(seed);
  const r = rng(seed + 1);
  const N = 90;
  return Array.from({ length: N + 1 }, (_, i) => {
    const y = (i / N) * (H + 40) - 20;
    return [W / 2 + n(i / 14) * amp + (r() - 0.5) * 16, y] as P;
  });
};
const pts = (p: P[]) => p.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",");

// Rips `from` in two at `at`: the halves pull apart and tilt over `dur` on the 12 fps clock, each with a white torn
// fibre edge and a hard shadow, revealing `to` underneath. Before `at` only `from` shows; after, only `to`.
export const TornWipe: FC<{ at: number; dur?: number; from: ReactNode; to: ReactNode; seed?: number }> = ({ at, dur = 0.6, from, to, seed = 9 }) => {
  const { t } = useTime();
  if (t < at) return <AbsoluteFill>{from}</AbsoluteFill>;
  const e = ramp(q12(t), at, dur, Easing.in(Easing.cubic));
  if (e >= 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const line = tearLine(seed);
  const r = rng(seed * 3);
  const rimL = line.map(([x, y]) => [x - 6 - r() * 11, y] as P);
  const rimR = line.map(([x, y]) => [x + 5 + r() * 9, y] as P);
  const halves = [
    { clip: `polygon(-20px -20px, ${pts(line)}, -20px ${H + 20}px)`, edge: [...line, ...rimL.reverse()], dx: -1, rot: -4 },
    { clip: `polygon(${pts(line)}, ${W + 20}px ${H + 20}px, ${W + 20}px -20px)`, edge: [...line, ...rimR.reverse()], dx: 1, rot: 3 },
  ];
  // Both halves show white paper fibre along the tear, like a real rip through printed stock.
  return (
    <AbsoluteFill>
      <AbsoluteFill>{to}</AbsoluteFill>
      {halves.map((h, i) => (
        <AbsoluteFill key={i} style={{ transform: `translateX(${h.dx * e * 1150}px) translateY(${e * 60}px) rotate(${h.rot * e}deg)`, transformOrigin: `${i ? 100 : 0}% 100%`, filter: hardShadow(1.4) }}>
          <AbsoluteFill style={{ clipPath: h.clip }}>
            <AbsoluteFill>{from}</AbsoluteFill>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
              <path d={`M${h.edge.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`} fill={SHEET} />
            </svg>
          </AbsoluteFill>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// A full-frame chapter plate: coloured stock, a giant halftone-printed numeral, the chapter title and a typed kicker.
export const ChapterCard: FC<{ n: string; title: string; kicker?: string; kickerAt?: number; bg?: "plate" | "red" | "ink" }> = ({ n, title, kicker, kickerAt = 0.2, bg = "plate" }) => {
  const base = bg === "red" ? RED : bg === "ink" ? INK : PLATE;
  const dot = bg === "red" ? "rgba(21,21,21,0.55)" : "rgba(247,243,234,0.5)";
  return (
    <AbsoluteFill style={{ background: base }}>
      <div
        style={{
          position: "absolute", right: 60, top: -120, fontFamily: COND, fontWeight: 700, fontSize: 900, lineHeight: 1,
          background: `radial-gradient(${dot} 34%, transparent 38%) 0 0 / 14px 14px`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}
      >
        {n}
      </div>
      <div style={{ position: "absolute", left: 140, top: 560, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: COND, fontWeight: 600, fontSize: 40, letterSpacing: "0.2em", color: SHEET }}>
          <span style={{ display: "inline-block", width: 60, height: 6, background: bg === "red" ? INK : RED, verticalAlign: "middle", marginRight: 18 }} />
          PART {n}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, color: SHEET, maxWidth: 1300 }}>{title}</div>
        {kicker && <TypeLine text={kicker} at={kickerAt} size={42} color={SHEET} />}
      </div>
      <GrainOverlay opacity={0.9} />
    </AbsoluteFill>
  );
};
