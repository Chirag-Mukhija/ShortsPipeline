// The scripted pixel cursor that does the "camera work": keyed path in 3-frame steps, arrow/hand/hourglass/I-beam states and a square click ripple.
import type { FC } from "react";
import { useTime } from "../../core/time";
import { INK, PINK_HOT, WHITE, YELLOW } from "./theme";
import { ARROW, HAND, HOURGLASS_A, HOURGLASS_B, Pix } from "./pixels";
import { local, pathAt, quant, type Key } from "./motion";

export type CursorKind = "arrow" | "hand" | "wait" | "ibeam";

export type CursorProps = {
  keys: Key[];
  // Seconds of each click: a 3-frame press and an expanding square ripple at the tip.
  clicks?: number[];
  // Timeline of cursor states: [[seconds, kind], ...]; the first applies from the start.
  kinds?: [number, CursorKind][];
  at?: number;
  px?: number;
};

const IBeam: FC<{ px: number }> = ({ px }) => (
  <svg width={9 * px} height={20 * px} viewBox="0 0 9 20" shapeRendering="crispEdges" style={{ display: "block" }}>
    <g fill={WHITE}>
      <rect x={0} y={0} width={9} height={3} />
      <rect x={3} y={0} width={3} height={20} />
      <rect x={0} y={17} width={9} height={3} />
    </g>
    <g fill={INK}>
      <rect x={1} y={1} width={7} height={1} />
      <rect x={4} y={1} width={1} height={18} />
      <rect x={1} y={18} width={7} height={1} />
    </g>
  </svg>
);

export const FakeCursor: FC<CursorProps> = ({ keys, clicks = [], kinds = [[0, "arrow"]], at = 0, px = 4 }) => {
  const { f } = useTime();
  if (local(f, at) < 0) return null;
  const { x, y } = pathAt(f, keys);
  const t = f / 30;
  const kind = kinds.reduce<CursorKind>((k, [s, v]) => (t >= s ? v : k), kinds[0]?.[1] ?? "arrow");
  const down = clicks.some((c) => {
    const l = local(f, c);
    return l >= 0 && l < 3;
  });
  const sprite = kind === "hand" ? HAND : kind === "wait" ? (Math.floor(f / 15) % 2 ? HOURGLASS_B : HOURGLASS_A) : ARROW;
  // Hotspots: arrow tip top-left, finger tip of the hand, centre of the hourglass and I-beam.
  const hot = kind === "hand" ? { x: 4.5, y: 0 } : kind === "wait" ? { x: 5.5, y: 6.5 } : kind === "ibeam" ? { x: 4.5, y: 10 } : { x: 0, y: 0 };
  const nudge = down ? px : 0;
  return (
    <>
      {clicks.map((c, i) => {
        const l = local(f, c);
        if (l < 0 || l > 10) return null;
        const s = quant(l, 2);
        return [0, 1].map((ring) => {
          const r = 14 + s * 9 - ring * 16;
          if (r <= 6) return null;
          return <div key={`${i}-${ring}`} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, border: `${px}px solid ${ring ? YELLOW : PINK_HOT}`, boxSizing: "border-box", opacity: 1 - l / 11 }} />;
        });
      })}
      <div style={{ position: "absolute", left: x - hot.x * px + nudge, top: y - hot.y * px + nudge, filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.35))" }}>
        {kind === "ibeam" ? <IBeam px={px} /> : <Pix sprite={sprite} px={down ? px * 0.92 : px} />}
      </div>
    </>
  );
};
