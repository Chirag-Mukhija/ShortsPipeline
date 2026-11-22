// Riso scene changes: the roller wipe that lays down the next colour field, and the paper feed that pulls a fresh sheet through.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { W, H } from "../../core/video";
import { PINK } from "./theme";
import { Plate, Svg, Page, hash, type Pt } from "./press";
import { Halftone, linearTone, RisoPaper } from "./halftone";

const FRINGE = 190;

// Where the roller's leading edge is (px) at frame f; it travels from off-left to off-right in `frames`.
export const rollerEdge = (f: number, fps: number, at: number, frames = 14) =>
  interpolate(f - at * fps, [0, frames], [-FRINGE - 60, W + FRINGE + 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

// The ragged leading edge: fixed per y, so the roller's ink line keeps its shape as it travels.
const edgePath = (e: number) => {
  const pts: Pt[] = [];
  for (let y = -40; y <= H + 40; y += 45) pts.push([e + (hash(y * 0.37) - 0.5) * 26, y]);
  return `M-80 -40 L${pts.map((p) => `${p[0].toFixed(1)} ${p[1]}`).join(" L")} L-80 ${H + 40} Z`;
};

// Roller wipe: an ink field sweeps left to right in 14 f with a wet, darker band at the roller and a halftone
// spray ahead of it. `before` is hidden under the field as it passes; `after` prints onto the new field.
export const RollerWipe: FC<{ at: number; ink?: string; frames?: number; before?: ReactNode; after?: ReactNode }> = ({ at, ink = PINK, frames = 14, before, after }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = rollerEdge(f, fps, at, frames);
  const done = e >= W + FRINGE;
  const started = f >= at * fps;
  return (
    <AbsoluteFill>
      {before && !done && <AbsoluteFill style={started ? { clipPath: `inset(0 0 0 ${Math.max(0, e)}px)` } : undefined}>{before}</AbsoluteFill>}
      <Page>
        <Svg>
          <Plate ink={ink} at={at} reg={0}>
            <path d={edgePath(e)} />
            {!done && <Halftone x={e} y={-20} w={FRINGE} h={H + 40} cell={16} ink={ink} tone={linearTone(e, 0, e + FRINGE, 0, 0.95, 0)} breathe={false} />}
          </Plate>
          {!done && (
            <Plate ink={ink} at={at} reg={0} opacity={0.5}>
              <path d={`M${e - 120} -40 H${e} V${H + 40} H${e - 120} Z`} />
              {Array.from({ length: 14 }, (_, i) => (
                <rect key={i} x={e - 120 - hash(i + 3) * 260} y={hash(i + 40) * H} width={120 + hash(i + 7) * 260} height={3 + hash(i + 11) * 5} />
              ))}
            </Plate>
          )}
        </Svg>
      </Page>
      {after && started && <AbsoluteFill style={done ? undefined : { clipPath: `inset(0 ${Math.max(0, W - e)}px 0 0)` }}>{after}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

// Paper feed: the printed sheet is pulled up and out of the frame, slightly skewed, as a fresh sheet feeds in under it.
export const PaperFeed: FC<{ at: number; frames?: number; before: ReactNode; after: ReactNode }> = ({ at, frames = 16, before, after }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(f - at * fps, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  if (p <= 0) return <AbsoluteFill>{before}</AbsoluteFill>;
  if (p >= 1) return <AbsoluteFill>{after}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${(1 - p) * H * 1.04}px) rotate(${(1 - p) * 1.2}deg)` }}>
        <RisoPaper />
        {after}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${-p * H * 1.04}px) rotate(${-p * 1.6}deg)`, boxShadow: "0 18px 40px rgba(60,40,20,0.25)" }}>
        <RisoPaper />
        {before}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
