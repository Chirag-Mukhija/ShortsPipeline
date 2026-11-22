// Hand-drawn pieces: timed, reusable moments (a slammed stamp, a hatched progress bar, "A =? B", a three-station map) that take their cue times as props.
import type { FC, ReactNode } from "react";
import { Easing } from "remotion";
import { POP, clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, INK, PENCIL, inkCol } from "./theme";
import { curvePts, ellPts, linePts, rectPts } from "./geometry";
import { At, Hand, Sk, wr } from "./primitives";

// A rubber stamp that slams down at `at` (s): scales from 1.7 to 1 in 0.22 s and lands slightly see-through.
export const Stamp: FC<{ x: number; y: number; text: string; at: number; r?: number; w?: number; size?: number; seed?: number }> = ({ x, y, text, at, r = -7, w = 450, size = 46, seed = 841 }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.22, Easing.out(Easing.quad));
  return (
    <At x={x} y={y} r={r} s={1.7 - 0.7 * e} o={e * 0.92}>
      <Sk pts={rectPts(-w / 2, -46, w, 92, seed)} w={5} seed={seed} ghost={false} />
      <Sk pts={rectPts(-w / 2 + 10, -37, w - 20, 74, seed + 1)} w={2.5} seed={seed + 1} ghost={false} />
      <Hand x={0} y={17} text={text} size={size} spacing={2} />
    </At>
  );
};

// A sketched progress bar whose hatching fills to `fill` (0–1) starting at `at`; `ink` greys it out as the topic fades.
export const HatchBar: FC<{ x: number; y: number; w?: number; fill: number; at: number; ink?: number; label?: string; seed?: number }> = ({ x, y, w = 180, fill, at, ink = 1, label, seed = 711 }) => {
  const { t } = useTime();
  const hatches = Math.round((w / 10) * fill);
  return (
    <g opacity={0.45 + 0.55 * ink}>
      <Sk pts={rectPts(x - w / 2, y, w, 22, seed)} p={ramp(t, at, 0.5)} w={3.6} color={inkCol(ink)} seed={seed} ghost={false} />
      {Array.from({ length: hatches }, (_, k) => (
        <Sk key={k} pts={linePts(x - w / 2 + 5 + k * 10, y + 20, x - w / 2 + 15 + k * 10, y + 2, seed + 9 + k, 0.02, 2)} p={ramp(t, at + 0.2 + k * 0.07, 0.15)} w={3} color={inkCol(ink)} seed={seed + 9 + k} ghost={false} />
      ))}
      {label && <Hand x={x} y={y + 66} text={label} size={38} color={PENCIL} p={wr(t, at + 0.15, label)} />}
    </g>
  );
};

// "left =? right": the left word writes on, an equals sign draws, a question mark lands on it, then the right word writes on.
export const QuestionEquals: FC<{ left: string; right: string; at: { left: number; eq: number; q: number; right: number }; y?: number; opacity?: number; rightColor?: string; size?: number }> = ({ left, right, at, y = 600, opacity = 1, rightColor = ACCENT, size = 124 }) => {
  const { t } = useTime();
  return (
    <>
      <Hand x={620} y={y} text={left} size={size} p={wr(t, at.left, left.replace(/[“”"]/g, ""))} opacity={opacity} />
      <Sk pts={linePts(920, y - 40, 1000, y - 42, 891, 0.04, 4)} p={ramp(t, at.eq, 0.2)} w={7} seed={891} opacity={opacity} />
      <Sk pts={linePts(920, y - 8, 1000, y - 10, 892, 0.04, 4)} p={ramp(t, at.eq + 0.15, 0.2)} w={7} seed={892} opacity={opacity} />
      <Hand x={962} y={y - 100} text="?" size={110} p={ramp(t, at.q, 0.3)} opacity={opacity} />
      <Hand x={1300} y={y} text={right} size={size} color={rightColor} p={wr(t, at.right, right)} opacity={opacity} />
    </>
  );
};

export type Station = { x: number; t: number; label: string; icon: (p: number) => ReactNode };

// A row of circled stations joined by dotted arrows: a video's map, an agenda, a three-step process.
export const Stations: FC<{ stations: Station[]; y?: number; labelY?: number; seed?: number }> = ({ stations, y = 600, labelY = 790, seed = 601 }) => {
  const { t } = useTime();
  return (
    <>
      {stations.slice(1).map((s, k) => {
        const a = stations[k]!;
        const x1 = a.x + 130;
        const x2 = s.x - 130;
        return (
          <Sk key={`p${k}`} pts={curvePts(x1, y, (x1 + x2) / 2, y + (k % 2 ? 50 : -40), x2, y, 18)} p={ramp(t, s.t - (k ? 0.98 : 0.56), k ? 0.7 : 0.55)} w={4} color={PENCIL} seed={seed + k} dash="2 14" ghost={false} head />
        );
      })}
      {stations.map((s, k) => {
        const a = ramp(t, s.t - 0.1, 0.4, POP);
        return (
          <g key={k}>
            <At x={s.x} y={y} s={0.6 + 0.4 * a} o={clamp01(a * 3)}>
              <Sk pts={ellPts(0, 0, 118, 112, seed + 9 + k)} p={ramp(t, s.t - 0.1, 0.55)} w={4.5} seed={seed + 9 + k} color={INK} />
              {s.icon(ramp(t, s.t + 0.05, 0.7))}
            </At>
            <Hand x={s.x} y={labelY} text={s.label} size={56} p={wr(t, s.t + 0.1, s.label)} />
          </g>
        );
      })}
    </>
  );
};
