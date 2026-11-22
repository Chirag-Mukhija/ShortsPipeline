// Annotations drawn over the collage: marker loops, arrows and underlines that boil at 12 fps, and the yellow highlighter that wipes behind a word.
import { type CSSProperties, type FC, type ReactNode } from "react";
import { Easing } from "remotion";
import { ramp, useTime } from "../../core/time";
import { RED, YELLOW } from "./theme";
import { arrowHead, boilIx, markerLoop, roughLine, smoothD, tornClip, type P } from "./rough";

const DRAW = Easing.inOut(Easing.quad);

// A felt-tip stroke drawn on with p (0..1), multiplied into the paper like real ink.
const Stroke: FC<{ pts: P[]; p: number; color: string; w: number; opacity?: number }> = ({ pts, p, color, w, opacity = 0.92 }) =>
  p <= 0 ? null : (
    <path d={smoothD(pts)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} style={{ mixBlendMode: "multiply" }} />
  );

export type MarkerCircleProps = { cx: number; cy: number; rx: number; ry: number; at: number; color?: string; w?: number; seed?: number; dur?: number };

// The marker loop around a point: draws on in 12 frames (board default), then boils.
export const MarkerCircle: FC<MarkerCircleProps> = ({ cx, cy, rx, ry, at, color = RED, w = 9, seed = 4, dur = 0.4 }) => {
  const { t } = useTime();
  return <Stroke pts={markerLoop(cx, cy, rx, ry, seed, boilIx(t))} p={ramp(t, at, dur, DRAW)} color={color} w={w} />;
};

// A hand-drawn arrow from (x1,y1) to (x2,y2); the head flicks on once the shaft lands.
export const MarkerArrow: FC<{ x1: number; y1: number; x2: number; y2: number; at: number; color?: string; w?: number; seed?: number; bow?: number }> = ({ x1, y1, x2, y2, at, color = RED, w = 8, seed = 8, bow = 0.12 }) => {
  const { t } = useTime();
  const pts = roughLine(x1, y1, x2, y2, seed, bow, boilIx(t));
  const head = ramp(t, at + 0.24, 0.1);
  return (
    <>
      <Stroke pts={pts} p={ramp(t, at, 0.28, DRAW)} color={color} w={w} />
      {arrowHead(pts, 30).map((h, i) => <Stroke key={i} pts={h} p={head} color={color} w={w} />)}
    </>
  );
};

// One or two quick strokes under a word.
export const MarkerUnderline: FC<{ x1: number; x2: number; y: number; at: number; color?: string; w?: number; seed?: number; double?: boolean }> = ({ x1, x2, y, at, color = RED, w = 8, seed = 12, double }) => {
  const { t } = useTime();
  const b = boilIx(t);
  return (
    <>
      <Stroke pts={roughLine(x1, y, x2, y - 4, seed, 0.015, b)} p={ramp(t, at, 0.25, DRAW)} color={color} w={w} />
      {double && <Stroke pts={roughLine(x1 + 18, y + 16, x2 - 10, y + 12, seed + 1, 0.02, b)} p={ramp(t, at + 0.2, 0.22, DRAW)} color={color} w={w * 0.8} />}
    </>
  );
};

// ---------- HTML-side marks, sized by the text they sit on ----------
// The highlighter swipe: a rough-ended yellow bar wipes left to right behind the words in 10 frames, slightly tilted.
export const Hi: FC<{ at: number; children: ReactNode; color?: string; seed?: number; style?: CSSProperties; dur?: number }> = ({ at, children, color = YELLOW, seed = 3, style, dur = 10 / 30 }) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, Easing.out(Easing.quad));
  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          right: "-0.12em",
          top: "0.2em",
          bottom: "0.02em",
          background: color,
          mixBlendMode: "multiply",
          transform: `rotate(-1.2deg) scaleX(${p})`,
          transformOrigin: "0 50%",
          clipPath: tornClip(seed, { left: 9, right: 12, top: 3, bottom: 3 }),
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

// A marker underline or loop sized to the word it wraps (HTML), for headlines.
export const Marked: FC<{ at: number; children: ReactNode; kind?: "underline" | "circle"; color?: string; seed?: number; w?: number }> = ({ at, children, kind = "underline", color = RED, seed = 21, w = 8 }) => {
  const { t } = useTime();
  const p = ramp(t, at, kind === "circle" ? 0.4 : 0.26, DRAW);
  const b = boilIx(t);
  const pts = kind === "circle" ? markerLoop(200, 50, 196, 54, seed, b) : roughLine(4, 92, 396, 86, seed, 0.02, b);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" style={{ position: "absolute", left: kind === "circle" ? "-12%" : "-2%", width: kind === "circle" ? "124%" : "104%", top: kind === "circle" ? "-6%" : "8%", height: kind === "circle" ? "112%" : "100%", overflow: "visible", pointerEvents: "none" }}>
        <path d={smoothD(pts)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" opacity={p > 0 ? 0.92 : 0} style={{ mixBlendMode: "multiply" }} />
      </svg>
    </span>
  );
};
