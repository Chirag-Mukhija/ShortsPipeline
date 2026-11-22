// The zoom engine: worlds nested inside each other's portals, a continuous depth camera with exponential scale, and PortalZoom for scenes that aren't nested.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { DIVE_IN, DIVE_LAND, EXPO_OUT } from "./theme";
import { InkDefs, ease, useSvgId } from "./ink";

// A portal is the hole the camera dives through, in its world's 1920×1080 units: centre, inscribed radius, and the clip path of the hole.
export type Portal = { x: number; y: number; r: number; shape: string };
// A world draws itself (with bleed well past the frame, since it is seen through a hole bigger than its frame), plus an optional
// Front drawn over the next world (lips, rims, glare). Its portal leads to the next world in the list.
export type World = { name: string; Back: FC; Front?: FC; portal: Portal };

// Half the screen diagonal plus a margin: a portal is zoomed until its inscribed circle covers the whole frame,
// so the hand-off to the next world is exact and no seam or outer pixel is ever visible.
const COVER = 1130;
export const portalK = (p: Portal) => COVER / p.r;

export type Move = { at: number; to: number; dur?: number };

// Depth along the dive: integer n = standing in world n; fractions are in transit. Each move eases from wherever the camera is.
// After every arrival the camera keeps pushing in slowly (about 1.02× over 2 s) so holds never freeze; the next move absorbs it.
export const depthAt = (t: number, moves: Move[], worlds: World[], from = 0) => {
  let d = from;
  for (const m of moves) {
    if (t < m.at) break;
    const dur = m.dur ?? 2.2 * Math.max(1, Math.abs(m.to - d)) ** 0.8;
    const inward = m.to > d;
    d += (m.to - d) * ease(t, m.at, dur, DIVE_LAND);
    const lvl = Math.floor(m.to);
    const k = portalK(worlds[((lvl % worlds.length) + worlds.length) % worlds.length]!.portal);
    if (inward) d += (Math.log(1.02) / Math.log(k)) * ease(t, m.at + dur, 2, EXPO_OUT);
  }
  return d;
};

// Total magnification at a depth, for "×2,744"-style counters.
export const zoomAt = (d: number, worlds: World[]) => {
  let z = 1;
  for (let i = 0; i < Math.floor(d); i++) z *= portalK(worlds[i % worlds.length]!.portal);
  return z * portalK(worlds[Math.floor(d) % worlds.length]!.portal) ** (d - Math.floor(d));
};

// Uniform scale s about the one fixed point Q that carries the portal centre to the screen centre exactly when s = k.
const camera = (p: Portal, f: number) => {
  const k = portalK(p);
  const s = k ** f;
  const qx = (k * p.x - W / 2) / (k - 1);
  const qy = (k * p.y - H / 2) / (k - 1);
  return `translate(${qx * (1 - s)} ${qy * (1 - s)}) scale(${s})`;
};

// Where the next world sits inside a portal: its frame centre on the portal centre, shrunk by 1/k.
const inside = (p: Portal) => `translate(${p.x} ${p.y}) scale(${1 / portalK(p)}) translate(${-W / 2} ${-H / 2})`;

const Level: FC<{ worlds: World[]; level: number; left: number; uid: string; loop: boolean }> = ({ worlds, level, left, uid, loop }) => {
  const n = worlds.length;
  const w = worlds[((level % n) + n) % n]!;
  const hasNext = left > 0 && (loop || level + 1 < n);
  const clip = `${uid}L${level}`;
  return (
    <g>
      <w.Back />
      {hasNext && (
        <>
          <defs>
            <clipPath id={clip}>
              <path d={w.portal.shape} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <g transform={inside(w.portal)}>
              <Level worlds={worlds} level={level + 1} left={left - 1} uid={uid} loop={loop} />
            </g>
          </g>
        </>
      )}
      {w.Front && <w.Front />}
    </g>
  );
};

// The continuous dive. Only three levels are ever drawn (the one you stand in and two inside it), each with plain numbers,
// so a dive through fifty worlds is as smooth and as cheap as one.
export const Dive: FC<{ worlds: World[]; moves: Move[]; from?: number; loop?: boolean; tilt?: number; ink?: boolean; depth?: number; style?: CSSProperties }> = ({
  worlds, moves, from = 0, loop = false, tilt = 2.2, ink = true, depth, style,
}) => {
  const { t } = useTime();
  const uid = useSvgId("ztw-dive");
  let d = depth ?? depthAt(t, moves, worlds, from);
  if (!loop) d = Math.min(Math.max(d, 0), worlds.length - 1);
  const level = Math.floor(d + 1e-9);
  const f = d - level;
  const w = worlds[((level % worlds.length) + worlds.length) % worlds.length]!;
  // 1–3° of roll that eases back to zero at every arrival; alternate levels roll the other way.
  const roll = tilt * Math.sin(Math.PI * f) * (level % 2 ? -1 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <defs>
        <InkDefs id={`${uid}ink`} amount={3} />
      </defs>
      <g filter={ink ? `url(#${uid}ink)` : undefined}>
        <g transform={`rotate(${roll} ${W / 2} ${H / 2})`}>
          <g transform={camera(w.portal, f)}>
            <Level worlds={worlds} level={level} left={2} uid={uid} loop={loop} />
          </g>
        </g>
      </g>
    </svg>
  );
};

// For scenes that aren't drawn nested (cards, HTML pieces): A scales about the pivot on the board's accelerating ease until its hole
// (radius `hole` px) covers the frame; B shows only inside that growing hole, dissolving in as it opens while it grows from 0.35× at the
// pivot to 1× at the centre. A stays fully opaque underneath, so no seam shows.
export const PortalZoom: FC<{ from: ReactNode; to: ReactNode; at: number; pivot: { x: number; y: number }; hole?: number; duration?: number }> = ({
  from, to, at, pivot, hole = 30, duration = 2.2,
}) => {
  const { t } = useTime();
  const p = ease(t, at, duration, DIVE_IN);
  const scale = Math.max(14, COVER / hole);
  const sA = scale ** p;
  const b = ease(t, at + duration * 0.3, duration * 0.7 + 0.5, EXPO_OUT);
  const s = 0.35 + 0.65 * b;
  const bx = (pivot.x - W / 2) * (1 - b);
  const by = (pivot.y - H / 2) * (1 - b);
  const r = hole * sA;
  return (
    <AbsoluteFill>
      {p < 1 && (
        <AbsoluteFill style={{ transformOrigin: `${pivot.x}px ${pivot.y}px`, transform: `scale(${sA}) rotate(${2.5 * Math.sin(Math.PI * p)}deg)` }}>{from}</AbsoluteFill>
      )}
      {p > 0.02 && (
        <AbsoluteFill style={{ clipPath: p < 1 && r < COVER ? `circle(${r}px at ${pivot.x}px ${pivot.y}px)` : undefined, opacity: ease(p, 0.04, 0.2) }}>
          <AbsoluteFill style={{ transform: `translate(${bx}px, ${by}px) scale(${s})` }}>{to}</AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
