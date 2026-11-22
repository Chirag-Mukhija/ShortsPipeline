// The collage's physical stuff: the flickering paper desk, torn photo cutouts, torn HTML slips, tape strips, push pins and typewriter lines.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { W, H } from "../../core/video";
import { clamp01, useTime } from "../../core/time";
import { HARD_X, HARD_Y, INK, MUTED, PAPER, RED, SHADOW, SHEET, TYPE, hardShadow } from "./theme";
import { SETTLE, boilIx, noise1, polyD, q12, stepIn, tornClip, tornRect, type Edges } from "./rough";
import { Photo, type Subject, type Treatment } from "./plates";

// ---------- paper desk ----------
const tile = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
const grain = (seed: number) =>
  tile(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 1.6 -0.62'/></filter><rect width='320' height='320' filter='url(#n)'/></svg>`,
  );
const GRAINS = [grain(3), grain(11), grain(29)];
const MOTTLE = tile(
  `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.007' numOctaves='4' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.37  0 0 0 0 0.25  0 0 0 0.9 -0.32'/></filter><rect width='900' height='900' filter='url(#m)'/></svg>`,
);
const FIBRES = tile(
  `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.35' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.94  0 0 0 2.2 -1.3'/></filter><rect width='600' height='600' filter='url(#f)'/></svg>`,
);

// Newsprint desk with the Vox texture flicker: three grain tiles swap (and jump) at 8 fps; the mottling stays put.
export const PaperDesk: FC = () => {
  const { t } = useTime();
  const k = Math.floor(t * 8) % 3;
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: PAPER }} />
      <AbsoluteFill style={{ backgroundImage: MOTTLE, opacity: 0.55, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ backgroundImage: FIBRES, opacity: 0.5 }} />
      <AbsoluteFill style={{ backgroundImage: GRAINS[k], backgroundPosition: `${k * 97}px ${k * 61}px`, opacity: 0.9, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(70,52,30,0.22) 100%)" }} />
    </>
  );
};

// The same flicker as an overlay over anything (a full-frame photo, a plate card).
export const GrainOverlay: FC<{ opacity?: number }> = ({ opacity = 0.6 }) => {
  const { t } = useTime();
  const k = Math.floor(t * 8) % 3;
  return <AbsoluteFill style={{ backgroundImage: GRAINS[k], backgroundPosition: `${k * 97}px ${k * 61}px`, opacity, mixBlendMode: "multiply", pointerEvents: "none" }} />;
};

// ---------- tape and pins ----------
// Masking tape: translucent, zig-zag torn ends, a faint weave.
export const Tape: FC<{ x: number; y: number; w?: number; h?: number; r?: number; seed?: number; color?: string }> = ({ x, y, w = 150, h = 44, r = -4, seed = 1, color = "rgba(236,224,186,0.82)" }) => {
  const pts = tornRect(w, h, seed, { left: 6, right: 6, top: 0.8, bottom: 0.8 });
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) translate(${-w / 2} ${-h / 2})`}>
      <path d={polyD(pts)} fill={color} />
      {[0.3, 0.55, 0.8].map((v) => <line key={v} x1={8} y1={h * v} x2={w - 8} y2={h * v} stroke="#fff" strokeOpacity={0.22} strokeWidth={1.5} />)}
      <path d={polyD(pts)} fill="none" stroke="rgba(120,100,60,0.25)" strokeWidth={1} />
    </g>
  );
};

// A red push pin, popped in on the 12 fps clock.
export const Pin: FC<{ x: number; y: number; at?: number; color?: string }> = ({ x, y, at = -1, color = RED }) => {
  const { t } = useTime();
  const e = stepIn(t, at, 0.25, SETTLE);
  if (e <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${e})`}>
      <ellipse cx={7} cy={10} rx={15} ry={12} fill={SHADOW} />
      <circle r={16} fill={color} />
      <circle r={16} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
      <circle cx={-5} cy={-6} r={5} fill="#fff" opacity={0.6} />
    </g>
  );
};

// ---------- torn HTML slip ----------
export type SlipProps = { seed?: number; bg?: string; color?: string; edges?: Edges; rot?: number; style?: CSSProperties; children: ReactNode; shadow?: boolean };

// A strip of torn paper that sizes to its content: labels, ransom-note words, list rows, lower thirds.
export const Slip: FC<SlipProps> = ({ seed = 1, bg = SHEET, color = INK, edges = { left: 7, right: 7 }, rot = 0, style, children, shadow = true }) => (
  <div style={{ display: "inline-block", transform: `rotate(${rot}deg)`, filter: shadow ? hardShadow(0.7) : undefined }}>
    <div style={{ background: bg, color, clipPath: tornClip(seed, edges), padding: "10px 28px", ...style }}>{children}</div>
  </div>
);

// ---------- photo cutout ----------
export type Entry = "drop" | "left" | "right" | "pop" | "none";
export type CutoutProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  seed?: number;
  at?: number;
  from?: Entry;
  src?: string;
  subject?: Subject;
  treatment?: Treatment;
  tape?: "top" | "corners" | "none";
  // Which sides are torn rather than scissor-cut, as px amplitude.
  edges?: Edges;
  rim?: number;
  // Ken Burns push across the demo or beat: [startS, endS, amount].
  push?: [number, number, number];
  focus?: [number, number];
  // Custom content instead of a photo (a document, a chart), drawn in 0..w, 0..h.
  children?: ReactNode;
  out?: number;
  wobble?: number;
};

// A photo cut out of a magazine: paper rim, torn or scissored edges, hard 6 px shadow, tilt, tape. Drops in on 12 fps steps
// with a 1–2° rotation settle, and idles with a half-degree wobble.
export const Cutout: FC<CutoutProps> = ({
  x, y, w, h, rot = 0, seed = 1, at = 0, from = "drop", src, subject, treatment, tape = "top", edges = { top: 2, right: 2, bottom: 9, left: 2 }, rim = 9, push, focus, children, out, wobble = 0.5,
}) => {
  const { t } = useTime();
  const cid = `cut${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const e = from === "none" ? 1 : stepIn(t, at, 0.4);
  if (e <= 0) return null;
  const s = from === "pop" ? stepIn(t, at, 0.3, SETTLE) : 1;
  const settle = stepIn(t, at, 0.55, SETTLE);
  const dx = from === "left" ? -(1 - e) * 700 : from === "right" ? (1 - e) * 700 : 0;
  const dy = from === "drop" ? -(1 - e) * 120 : 0;
  const o = out === undefined ? 0 : stepIn(t, out, 0.27);
  const wob = Math.sin(q12(t) * 1.4 + seed) * wobble;
  const outer = tornRect(w, h, seed, edges);
  const inner = tornRect(w - rim * 2, h - rim * 2, seed + 5, { top: 1, right: 1, bottom: 1, left: 1 });
  const z = push ? 1 + push[2] * clamp01((t - push[0]) / (push[1] - push[0])) : 1;
  const pad = 40;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2 - pad,
        top: y - h / 2 - pad,
        width: w + pad * 2,
        height: h + pad * 2,
        transform: `translate(${dx + o * 1400}px, ${dy}px) rotate(${rot + (1 - settle) * 5 + wob}deg) scale(${s})`,
      }}
    >
      <svg width={w + pad * 2} height={h + pad * 2} style={{ overflow: "visible" }}>
        <g transform={`translate(${pad} ${pad})`}>
          <path d={polyD(outer)} fill={SHADOW} transform={`translate(${HARD_X} ${HARD_Y})`} />
          <path d={polyD(outer)} fill={SHEET} />
          <clipPath id={cid}>
            <path d={polyD(inner)} transform={`translate(${rim} ${rim})`} />
          </clipPath>
          <g clipPath={`url(#${cid})`}>
            <g transform={`translate(${rim} ${rim})`}>
              {children ?? <Photo w={w - rim * 2} h={h - rim * 2} src={src} subject={subject} treatment={treatment} zoom={z} focus={focus} />}
            </g>
          </g>
          {tape === "top" && <Tape x={w / 2} y={-4} r={-3 + (seed % 5)} seed={seed + 2} />}
          {tape === "corners" && (
            <>
              <Tape x={14} y={10} r={-38} w={120} seed={seed + 3} />
              <Tape x={w - 14} y={h - 10} r={-38} w={120} seed={seed + 4} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

// ---------- typewriter ----------
// Typed text: characters appear on the 12 fps clock (3 per tick by default), with a blinking block cursor while typing.
export const TypeLine: FC<{ text: string; at: number; size?: number; color?: string; cps?: number; style?: CSSProperties; cursor?: boolean }> = ({ text, at, size = 40, color = INK, cps = 30, style, cursor = true }) => {
  const { t } = useTime();
  const n = Math.max(0, Math.min(text.length, Math.floor((q12(t) - at) * cps)));
  const typing = t >= at && n < text.length + 4;
  return (
    <div style={{ fontFamily: TYPE, fontSize: size, color, whiteSpace: "pre", lineHeight: 1.25, ...style }}>
      <span>{text.slice(0, n)}</span>
      {cursor && typing && Math.floor(t * 4) % 2 === 0 && <span style={{ display: "inline-block", width: "0.5em", height: "0.9em", marginRight: "-0.5em", verticalAlign: "-0.1em", background: color, opacity: 0.7 }} />}
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </div>
  );
};

// Small typed caption for sources and figure numbers: "SOURCE — The Daily Ledger, 2019".
export const Caption: FC<{ children: ReactNode; size?: number; color?: string; style?: CSSProperties }> = ({ children, size = 30, color = MUTED, style }) => (
  <div style={{ fontFamily: TYPE, fontSize: size, color, letterSpacing: 0.5, ...style }}>{children}</div>
);

// Wobble that boils on the 12 fps clock: small translate jitter for annotations and stamps.
export const useBoilJitter = (seed: number, amp = 1.2) => {
  const { t } = useTime();
  const n = noise1(seed);
  const b = boilIx(t);
  return { dx: n(b * 3.1) * amp, dy: n(b * 3.1 + 11) * amp };
};

export const FullStage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);
