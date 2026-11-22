// The pointer layer: a crisp macOS arrow that rides the spring path, squeezes on click, drifts 1–2 px at rest, plus click ripples and the soft glow outline on the clicked target.
import type { FC } from "react";
import { Easing, interpolate } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { ACCENT } from "./theme";
import type { Pt, Rect } from "./motion";

// Press envelope for one click: sinks over 3 f before t, releases over 5 f after.
const pressAt = (t: number, clicks: number[]) =>
  clicks.reduce((m, c) => Math.max(m, interpolate(t, [c - 0.1, c, c + 0.17], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), 0);

export type CursorProps = {
  p: Pt;
  // Click times (s), so the arrow squeezes on each one.
  clicks?: number[];
  size?: number;
  // Fades the pointer in from this time (s).
  at?: number;
  hidden?: number;
  style?: "arrow" | "hand";
};

export const Cursor: FC<CursorProps> = ({ p, clicks = [], size = 46, at, hidden = 0, style = "arrow" }) => {
  const { t } = useTime();
  const press = pressAt(t, clicks);
  // Micro-drift so a resting pointer still breathes; 1–2 px only.
  const dx = Math.sin(t * 1.7) * 1.2 + Math.sin(t * 3.1 + 1) * 0.5;
  const dy = Math.cos(t * 1.3) * 1.0;
  const op = (at === undefined ? 1 : ramp(t, at, 0.2)) * (1 - hidden);
  if (op <= 0) return null;
  const k = size / 24;
  return (
    <div style={{ position: "absolute", left: p.x + dx, top: p.y + dy, width: 0, height: 0, opacity: op, transform: `scale(${1 - press * 0.16})`, transformOrigin: "0 0" }}>
      <svg width={30 * k} height={30 * k} viewBox="-3 -3 30 30" style={{ position: "absolute", left: -3 * k, top: -3 * k, overflow: "visible", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}>
        {style === "arrow" ? (
          <path d="M1 1 L1 18.5 L5.4 14.4 L8.4 21.2 L11.5 19.9 L8.6 13.2 L14.6 13.2 Z" fill="#111114" stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round" />
        ) : (
          <path d="M7 11 V3.6 a1.6 1.6 0 0 1 3.2 0 V10 V8.6 a1.6 1.6 0 0 1 3.2 0 V10.4 a1.6 1.6 0 0 1 3.2 0 V11.6 a1.6 1.6 0 0 1 3.2 0 V16 c0 3.6 -2.4 6 -6 6 h-1.6 c-2.2 0 -3.6 -1 -4.8 -2.6 L3 14.4 a1.7 1.7 0 0 1 2.7 -2 Z" fill="#FFFFFF" stroke="#111114" strokeWidth={1.4} strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
};

// Ripple per click: a ring growing 0 → 40 px while fading 0.5 → 0 over 14 f, a white halo for dark UIs and an accent core for light ones.
export const ClickRipple: FC<{ clicks: (Pt & { t: number })[]; radius?: number; color?: string }> = ({ clicks, radius = 40, color = ACCENT }) => {
  const { t } = useTime();
  return (
    <>
      {clicks.map((c, i) => {
        const a = (t - c.t) / (14 / 30);
        if (a < 0 || a > 1.3) return null;
        const e = Easing.out(Easing.cubic)(clamp01(a));
        const e2 = Easing.out(Easing.cubic)(clamp01((a - 0.2) / 1.1));
        const r = 6 + radius * e;
        const R = 6 + radius * 1.5 * e2;
        return (
          <svg key={i} width={1} height={1} style={{ position: "absolute", left: c.x, top: c.y, overflow: "visible" }}>
            <circle r={r} fill={color} opacity={0.28 * (1 - clamp01(a))} />
            <circle r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.5 * (1 - clamp01(a))} strokeWidth={6} />
            <circle r={r} fill="none" stroke={color} strokeOpacity={0.75 * (1 - clamp01(a))} strokeWidth={2.5} />
            <circle r={R} fill="none" stroke={color} strokeOpacity={0.35 * (1 - clamp01(a - 0.2))} strokeWidth={1.5} />
          </svg>
        );
      })}
    </>
  );
};

// The clicked element's soft glow outline: in a few frames before the click, holds, then lets go.
export const TargetGlow: FC<{ rect: Rect; at: number; hold?: number; radius?: number; color?: string }> = ({ rect, at, hold = 0.9, radius = 16, color = ACCENT }) => {
  const { t } = useTime();
  const p = Math.min(ramp(t, at - 0.25, 0.25), 1 - ramp(t, at + hold, 0.35));
  if (p <= 0) return null;
  const g = 6 + 4 * p;
  return (
    <div style={{ position: "absolute", left: rect.x - g, top: rect.y - g, width: rect.w + g * 2, height: rect.h + g * 2, borderRadius: radius + g, border: `3px solid ${color}`, opacity: p, boxShadow: `0 0 24px 4px ${color}66, inset 0 0 14px ${color}33` }} />
  );
};
