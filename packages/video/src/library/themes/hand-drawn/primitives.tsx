// Hand-drawn primitives: the boiling pencil stroke, write-on handwriting, word lines that pop or write, the dot-grid paper and SVG staging helpers.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolateColors, useCurrentFrame } from "remotion";
import { W, H } from "../../core/video";
import { INOUT, POP, clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, DOT, HAND, INK, PAPER } from "./theme";
import { curvePts, headFor, jitter, rng, slicePts, smooth, type P } from "./geometry";

// Boil: the jitter re-rolls every 4 frames (7.5 fps), the classic hand-drawn "alive" line.
export const useBoil = () => Math.floor(useCurrentFrame() / 4) % 3;

// Write-on speed scales with the text, like a hand writing it.
export const wr = (t: number, at: number, text: string) =>
  ramp(t, at, Math.min(1.1, Math.max(0.28, text.length * 0.045)), Easing.inOut(Easing.quad));
export type SkProps = { pts: P[]; p?: number; w?: number; color?: string; opacity?: number; seed?: number; amp?: number; ghost?: boolean; dash?: string; head?: boolean; head2?: boolean; scaleFree?: boolean };

// A pencil stroke: a main line plus a fainter second pass, re-jittered on every boil step.
export const Sk: FC<SkProps> = ({ pts, p = 1, w = 4, color = INK, opacity = 1, seed = 1, amp = 2.2, ghost = true, dash, head, head2, scaleFree }) => {
  const boil = useBoil();
  if (p <= 0 || opacity <= 0) return null;
  const part = slicePts(pts, p);
  const main = jitter(part, boil, seed, amp);
  const extra = { vectorEffect: scaleFree ? ("non-scaling-stroke" as const) : undefined };
  const heads = [...(head && p > 0.05 ? headFor(main, false, w * 4.5) : []), ...(head2 && p > 0.05 ? headFor(main, true, w * 4.5) : [])];
  return (
    <g opacity={opacity} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path d={smooth(main)} strokeWidth={w} strokeDasharray={dash} {...extra} />
      {ghost && !dash && <path d={smooth(jitter(part, boil, seed + 101, amp * 1.8))} strokeWidth={w * 0.45} opacity={0.4} {...extra} />}
      {heads.map((h, i) => (
        <path key={i} d={smooth(jitter(h, boil, seed + 7 + i, amp * 0.6))} strokeWidth={w} {...extra} />
      ))}
    </g>
  );
};

export type HandProps = { x: number; y: number; text: string; size?: number; p?: number; anchor?: "start" | "middle" | "end"; color?: string; opacity?: number; rotate?: number; font?: string; weight?: number; spacing?: number };

// Handwritten text that writes on left to right and breathes slightly with the boil.
export const Hand: FC<HandProps> = ({ x, y, text, size = 48, p = 1, anchor = "middle", color = INK, opacity = 1, rotate = 0, font = HAND, weight = 700, spacing = 0 }) => {
  const id = `c${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const boil = useBoil();
  if (p <= 0 || opacity <= 0) return null;
  const est = text.length * size * (font === HAND ? 0.5 : 0.62) + 30;
  const left = anchor === "start" ? x - 14 : anchor === "middle" ? x - est / 2 : x - est;
  const r = rng(boil * 13 + text.length * 7);
  const dx = (r() - 0.5) * 1.4;
  const dy = (r() - 0.5) * 1.4;
  const dr = (r() - 0.5) * 0.5;
  return (
    <g transform={`rotate(${rotate + dr} ${x} ${y}) translate(${dx} ${dy})`} opacity={opacity}>
      <clipPath id={id}>
        <rect x={left} y={y - size * 1.3} width={est * p} height={size * 2} />
      </clipPath>
      <text x={x} y={y} clipPath={`url(#${id})`} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={color} letterSpacing={spacing}>
        {text}
      </text>
    </g>
  );
};

export const Stage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

export const At: FC<{ x: number; y: number; s?: number; r?: number; o?: number; children: ReactNode }> = ({ x, y, s = 1, r = 0, o = 1, children }) =>
  o <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
      {children}
    </g>
  );

// ---------- paper ----------
export const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2  0 0 0 0 0.18  0 0 0 0 0.15  0 0 0 0.55 0'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>`,
)}")`;

// Off-white paper with the iPad's dot grid, so the frame reads as the creator's sketch page.
export const Paper: FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(90,70,40,0.13) 100%)" }} />
  </>
);

// ---------- word lines (HTML, so each word sits exactly where the font puts it) ----------
export type Word = { w: string; t: number; accent?: boolean; underline?: boolean; scale?: number };

export const Underline: FC<{ p: number; color: string; seed: number }> = ({ p, color, seed }) => (
  <svg viewBox="0 0 400 40" preserveAspectRatio="none" style={{ position: "absolute", left: "-4%", width: "108%", bottom: "-0.12em", height: "0.32em", overflow: "visible" }}>
    <Sk pts={curvePts(4, 26, 200, 8, 396, 22, 20)} p={p} w={7} color={color} seed={seed} amp={2} scaleFree />
  </svg>
);

export const WordLine: FC<{ words: Word[]; y: number; size: number; mode: "pop" | "write"; color?: string }> = ({ words, y, size, mode, color = INK }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y - size * 0.62, display: "flex", justifyContent: "center", alignItems: "baseline", gap: size * 0.26, fontFamily: HAND, fontWeight: 700, fontSize: size, lineHeight: 1.1, color }}>
      {words.map((wd, i) => {
        const big = wd.scale ?? 1;
        const appear = mode === "pop" ? ramp(t, wd.t - 0.04, big > 1 ? 0.42 : 0.26, big > 1 ? Easing.out(Easing.back(3.2)) : POP) : wr(t, wd.t - 0.03, wd.w);
        const tint = wd.accent ? interpolateColors(ramp(t, wd.t + 0.12, 0.35), [0, 1], [color, ACCENT]) : color;
        const scale = mode === "pop" ? 0.25 + 0.75 * appear : 1;
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              fontSize: size * big,
              color: tint,
              opacity: mode === "pop" ? clamp01(appear * 4) : 1,
              transform: `scale(${scale})`,
              transformOrigin: "50% 70%",
              // Caveat's strokes overhang the span box, so the clip runs 15% past it on the right.
              clipPath: mode === "write" && appear < 1 ? `inset(-30% ${(1 - appear) * 115 - 15}% -40% -10%)` : undefined,
            }}
          >
            {wd.w}
            {wd.underline && <Underline p={ramp(t, wd.t + 0.2, 0.45, INOUT)} color={tint} seed={300 + i} />}
          </span>
        );
      })}
    </div>
  );
};
