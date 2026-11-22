// Isometric type: block letters extruded along the iso axis, per-letter rise, per-word claim lines and the kicker tag every card shares.
import type { CSSProperties, FC } from "react";
import { Easing, interpolate } from "remotion";
import { FPS } from "../../core/video";
import { useTime } from "../../core/time";
import { BLUE, HEAD, INK, MONO } from "./theme";
import { C30 } from "./iso";

// Stacked text-shadows: a solid side face running down-right at the iso 30° angle, then a soft ground shadow.
export const extrude = (color: string, depth = 14) =>
  [
    ...Array.from({ length: depth }, (_, k) => `${((k + 1) * C30).toFixed(2)}px ${((k + 1) * 0.5).toFixed(2)}px 0 ${color}`),
    `${(depth * C30 + 8).toFixed(1)}px ${(depth * 0.5 + 16).toFixed(1)}px 22px rgba(27,35,64,0.20)`,
  ].join(", ");

const BACK = Easing.out(Easing.back(1.4));
const riseK = (t: number, at: number, frames = 16) =>
  interpolate((t - at) * FPS, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: BACK });

// Block letters that rise out of the ground one by one (2 f apart), each with its iso side face.
export const BlockWord: FC<{ text: string; at: number; size?: number; color?: string; side?: string; depth?: number; style?: CSSProperties; per?: number }> = ({ text, at, size = 220, color = INK, side = "#9DB0DC", depth, style, per = 2 }) => {
  const { t } = useTime();
  const dpt = depth ?? Math.round(size / 15);
  return (
    <div style={{ display: "flex", fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.02, color, whiteSpace: "pre", fontVariantNumeric: "tabular-nums", ...style }}>
      {[...text].map((ch, i) => {
        const k = riseK(t, at + (i * per) / FPS);
        const op = interpolate((t - at) * FPS - i * per, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ display: "inline-block", opacity: op, transform: `translateY(${(1 - k) * size * 0.32}px)`, textShadow: extrude(side, dpt) }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// A line of words that each pop up on their spoken time.
export type Word = { w: string; t: number; color?: string };
export const WordsUp: FC<{ words: Word[]; size?: number; color?: string; weight?: number; style?: CSSProperties; font?: string }> = ({ words, size = 72, color = INK, weight = 700, style, font = HEAD }) => {
  const { t } = useTime();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.26}px`, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.12, color, letterSpacing: -size * 0.015, ...style }}>
      {words.map((w, i) => {
        const k = riseK(t, w.t - 3 / FPS, 10);
        const op = interpolate(t, [w.t - 3 / FPS, w.t + 3 / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ display: "inline-block", opacity: op, color: w.color ?? color, transform: `translateY(${(1 - k) * 22}px)` }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

// Mono kicker with a small tile diamond: "CHAPTER 01 · THE REQUEST".
export const Kicker: FC<{ text: string; at: number; color?: string; size?: number }> = ({ text, at, color = BLUE, size = 30 }) => {
  const { t } = useTime();
  const p = interpolate(t, [at, at + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: p > 0 ? 1 : 0 }}>
      <span style={{ width: 16, height: 16, background: color, transform: `rotate(45deg) scale(${p})`, borderRadius: 3, flex: "none" }} />
      <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: size, letterSpacing: size * 0.12, color, clipPath: `inset(0 ${100 - p * 100}% 0 0)`, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

// Fade-and-rise for a block of copy (16 f, out-cubic).
export const riseStyle = (t: number, at: number, dist = 26): CSSProperties => {
  const k = interpolate(t, [at, at + 16 / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return { opacity: k, transform: `translateY(${(1 - k) * dist}px)` };
};
