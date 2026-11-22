// Signature paper scenes and transitions: the layered diorama with a stepped camera truck, a jointed cut-out puppet, the pulled sheet, the torn iris and the folding flap.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { FPS } from "../../core/video";
import { BRASS, CAM_STEP, CORE, CREAM, INK, MUSTARD, PEACH, STEP, TEAL, TEAL_DK, TEAL_LT, TOMATO, TOMATO_DK } from "./theme";
import { mix, poseAt, rng, slide, stepRamp, type Pose } from "./stop";
import { CutText, Layer, Piece, Sheet, Tape } from "./paper";
import { burst, cutCircle, cutEllipse, cutPoly, cutRound, hills, pathOf, tornCircle } from "./shapes";

// ---------- diorama ----------
const DW = 2320;
const DX = -200;
type Hill = { color: string; base: number; amp: number; waves: number; seed: number; factor: number };
const HILLS: Hill[] = [
  { color: TEAL_LT, base: 640, amp: 55, waves: 1.6, seed: 801, factor: 0.22 },
  { color: TEAL, base: 750, amp: 60, waves: 2.1, seed: 802, factor: 0.45 },
  { color: MUSTARD, base: 880, amp: 42, waves: 1.3, seed: 803, factor: 0.72 },
  { color: TOMATO, base: 1015, amp: 26, waves: 3.2, seed: 804, factor: 1 },
];

const cloud = (cx: number, cy: number, s: number, seed: number) =>
  [[-60, 10, 42], [-15, -18, 56], [40, -4, 46], [78, 16, 32], [10, 22, 44]].map(([dx, dy, r], i) => pathOf(cutCircle(cx + dx! * s, cy + dy! * s, r! * s, seed + i, 16)));

// PaperBackdrop as a diorama: sky, four torn hill layers and props, slid up from below back-first, then a camera truck on twos where near layers travel further.
export const Diorama: FC<{ at?: number; truck?: number; truckAt?: number; truckDur?: number; title?: string; titleAt?: number }> = ({ at = 0, truck = 180, truckAt = at + 1.4, truckDur = 3, title, titleAt = at + 1.1 }) => {
  const { t, f } = useTime();
  const cam = stepRamp(t, truckAt, truckDur, CAM_STEP) * truck;
  const bob = (k: number) => Math.sin(Math.floor(f / STEP) * 0.7 + k) * 4;
  const sunTurn = Math.floor(f / (STEP * 2)) * 3;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Piece x={960} y={540} w={1920} h={1080} z={0} seed={800} still grain={0.8}>
        <rect x={0} y={0} width={1920} height={1080} fill={CREAM} />
      </Piece>
      <Piece x={1640 - cam * 0.08} y={210} w={330} h={330} z={0.6} seed={805} pose={slide(t, at, [0, -500], 4)}>
        <g transform={`rotate(${sunTurn} 165 165)`}><path d={pathOf(burst(165, 165, 150, 108, 14, 805))} fill={MUSTARD} /></g>
        <Layer d={pathOf(cutCircle(165, 165, 92, 806, 22))} fill={TOMATO} />
      </Piece>
      {[[330, 180, 1, 807], [1080, 120, 0.8, 813]].map(([cx, cy, s, sd], i) => (
        <Piece key={i} x={cx! - cam * 0.12 + Math.floor(f / (STEP * 4)) * 2} y={cy! + bob(i)} w={300 * s!} h={170 * s!} z={0.8} seed={sd!} pose={slide(t, at + 0.15 + i * 0.1, [0, -420], 4)}>
          {cloud(150 * s!, 95 * s!, s!, sd!).map((d, k) => <path key={k} d={d} fill={CORE} />)}
        </Piece>
      ))}
      {title && <CutText text={title} x={760 - cam * 0.15} y={360} size={120} color={INK} seed={830} at={titleAt} tilt={4} z={1} />}
      {HILLS.map((h, k) => {
        const g = hills(0, DW, h.base, 1080, h.seed, h.amp, h.waves);
        const pose = slide(t, at + 0.3 + k * 0.2, [0, 520], 5);
        return (
          <Piece key={k} x={DX + DW / 2 - cam * h.factor} y={540} w={DW} h={1080} z={0.7 + k * 0.75} seed={h.seed} still pose={pose} grain={0.8}>
            <path d={g.core} fill={CORE} />
            <path d={g.paper} fill={h.color} />
            {k === 1 && [380, 640, 1500, 1720].map((x, i) => {
              const y = g.top(x);
              return <Layer key={i} d={pathOf(cutPoly([[x, y - 120 - i * 8], [x + 44, y + 6], [x - 44, y + 6]], 840 + i, 2))} fill={TEAL_DK} />;
            })}
            {k === 2 && (
              <>
                {[520, 760].map((x, i) => {
                  const y = g.top(x);
                  return (
                    <g key={i}>
                      <Layer d={pathOf(cutPoly([[x - 5, y + 6], [x + 5, y + 6], [x + 4, y - 70], [x - 4, y - 70]], 850 + i, 1))} fill={INK} />
                      <Layer d={pathOf(cutCircle(x, y - 92, 40 - i * 6, 852 + i, 14))} fill={TOMATO} />
                    </g>
                  );
                })}
                {(() => {
                  const x = 1480;
                  const y = g.top(x) + 10;
                  return (
                    <g>
                      <Layer d={pathOf(cutPoly([[x - 70, y], [x + 70, y], [x + 70, y - 100], [x - 70, y - 100]], 860, 2))} fill={CREAM} />
                      <Layer d={pathOf(cutPoly([[x - 92, y - 96], [x, y - 176], [x + 92, y - 96]], 861, 2))} fill={TOMATO_DK} />
                      <Layer d={pathOf(cutPoly([[x - 16, y], [x + 16, y], [x + 16, y - 52], [x - 16, y - 52]], 862, 1))} fill={INK} />
                      <Layer d={pathOf(cutPoly([[x + 30, y - 72], [x + 56, y - 72], [x + 56, y - 46], [x + 30, y - 46]], 863, 1))} fill={MUSTARD} />
                    </g>
                  );
                })()}
              </>
            )}
          </Piece>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- puppet ----------
export type PuppetPose = { tilt: number; head: number; shL: number; elL: number; shR: number; elR: number; hipL: number; hipR: number; y: number; wave?: boolean };
export const POSES: Record<"idle" | "wave" | "point" | "cheer", PuppetPose> = {
  idle: { tilt: 0, head: 0, shL: 10, elL: 6, shR: 10, elR: 6, hipL: 4, hipR: 4, y: 0 },
  wave: { tilt: -2, head: -7, shL: 12, elL: 8, shR: 140, elR: 10, hipL: 4, hipR: 3, y: 0, wave: true },
  point: { tilt: 3, head: 8, shL: 14, elL: 10, shR: 92, elR: -4, hipL: 2, hipR: 7, y: 0 },
  cheer: { tilt: 0, head: -4, shL: 150, elL: 18, shR: 150, elR: 18, hipL: 10, hipR: 10, y: -16 },
};
export type PuppetKey = { t: number; pose: keyof typeof POSES | PuppetPose };

// Between keys the joints move linearly in held steps (no in-betweening curves); a wave swaps the forearm every hold.
const posePuppet = (t: number, f: number, keys: PuppetKey[]): PuppetPose => {
  const get = (k: PuppetKey) => (typeof k.pose === "string" ? POSES[k.pose] : k.pose);
  let p = get(keys[0]!);
  for (const k of keys.slice(1)) {
    if (t < k.t) break;
    const u = stepRamp(t, k.t, 0.3, STEP);
    const q = get(k);
    const lerp = (a: number, b: number) => a + (b - a) * u;
    p = { tilt: lerp(p.tilt, q.tilt), head: lerp(p.head, q.head), shL: lerp(p.shL, q.shL), elL: lerp(p.elL, q.elL), shR: lerp(p.shR, q.shR), elR: lerp(p.elR, q.elR), hipL: lerp(p.hipL, q.hipL), hipR: lerp(p.hipR, q.hipR), y: lerp(p.y, q.y), wave: u >= 1 ? q.wave : p.wave };
  }
  if (p.wave) p = { ...p, elR: p.elR + (Math.floor(f / STEP) % 2 ? 26 : -18) };
  return p;
};

const Pin: FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <circle cx={x} cy={y} r={8} fill={BRASS} />
    <circle cx={x - 2.5} cy={y - 2.5} r={3} fill="#F4DE9A" />
  </g>
);

// CutoutCharacter: head, torso, arms and legs cut separately and joined with brass split pins, posed by keyframes.
export const Puppet: FC<{ x: number; y: number; keys: PuppetKey[]; s?: number; at?: number; seed?: number; sweater?: string; trousers?: string }> = ({ x, y, keys, s = 1, at = -1, seed = 900, sweater = TOMATO, trousers = TEAL }) => {
  const { t, f } = useTime();
  const p = posePuppet(t, f, keys);
  const enter: Pose = mix(slide(t, at, [0, 700], 4));
  const blink = rng(Math.floor(t * FPS / STEP) + seed)() > 0.93;
  const arm = (side: -1 | 1, sh: number, el: number) => {
    const sx = 210 + side * 62;
    const sy = 278;
    const a = -side * sh;
    const e = -side * el;
    return (
      <g transform={`rotate(${a} ${sx} ${sy})`}>
        <Layer d={pathOf(cutRound(sx - 22, sy - 16, 44, 116, 18, seed + 10 + side, 1.5))} fill={sweater} />
        <g transform={`rotate(${e} ${sx} ${sy + 92})`}>
          <Layer d={pathOf(cutRound(sx - 19, sy + 76, 38, 104, 16, seed + 20 + side, 1.5))} fill={sweater} />
          <Layer d={pathOf(cutCircle(sx, sy + 190, 22, seed + 30 + side, 12))} fill={PEACH} />
          <Pin x={sx} y={sy + 92} />
        </g>
        <Pin x={sx} y={sy} />
      </g>
    );
  };
  const leg = (side: -1 | 1, hip: number) => {
    const hx = 210 + side * 34;
    const hy = 468;
    return (
      <g transform={`rotate(${-side * hip} ${hx} ${hy})`}>
        <Layer d={pathOf(cutRound(hx - 26, hy - 18, 52, 180, 10, seed + 40 + side, 1.5))} fill={trousers} />
        <Layer d={pathOf(cutRound(hx - 30 + side * 12, hy + 150, 64, 34, 14, seed + 50 + side, 1.5))} fill={INK} />
        <Pin x={hx} y={hy} />
      </g>
    );
  };
  return (
    <Piece x={x} y={y} w={540 * s} h={720 * s} z={1.4} seed={seed} pose={enter} rough={1.4}>
      <g transform={`scale(${s}) translate(60 ${p.y + 10})`}>
        {leg(-1, p.hipL)}
        {leg(1, p.hipR)}
        <g transform={`rotate(${p.tilt} 210 470)`}>
          <Layer d={pathOf(cutPoly([[150, 262], [270, 262], [292, 300], [286, 484], [134, 484], [128, 300]], seed + 1, 2))} fill={sweater} />
          <Layer d={pathOf(cutPoly([[134, 420], [286, 420], [287, 446], [133, 446]], seed + 2, 1.5))} fill={MUSTARD} />
          <g transform={`rotate(${p.head} 210 258)`}>
            <Layer d={pathOf(cutPoly([[192, 230], [228, 230], [230, 270], [190, 270]], seed + 3, 1))} fill={PEACH} />
            <Layer d={pathOf(cutCircle(210, 168, 84, seed + 4, 26))} fill={PEACH} />
            <Layer d={pathOf(cutPoly([[124, 170], [128, 120], [160, 88], [210, 78], [262, 90], [292, 124], [296, 168], [272, 132], [246, 142], [226, 122], [196, 140], [168, 124], [146, 150]], seed + 5, 2))} fill={INK} />
            {blink ? (
              <>
                <Layer d={pathOf(cutPoly([[172, 178], [196, 178], [196, 183], [172, 183]], seed + 6, 0.5))} fill={INK} />
                <Layer d={pathOf(cutPoly([[224, 178], [248, 178], [248, 183], [224, 183]], seed + 7, 0.5))} fill={INK} />
              </>
            ) : (
              <>
                <Layer d={pathOf(cutEllipse(184, 178, 9, 12, seed + 6, 10))} fill={INK} />
                <Layer d={pathOf(cutEllipse(236, 178, 9, 12, seed + 7, 10))} fill={INK} />
              </>
            )}
            <Layer d={pathOf(cutCircle(160, 206, 13, seed + 8, 10))} fill={TOMATO} o={0.55} />
            <Layer d={pathOf(cutCircle(260, 206, 13, seed + 9, 10))} fill={TOMATO} o={0.55} />
            <Layer d={pathOf(cutPoly([[192, 212], [228, 212], [222, 228], [210, 233], [198, 228]], seed + 11, 1.2))} fill={TOMATO_DK} />
          </g>
          <Pin x={210} y={258} />
          {arm(-1, p.shL, p.elL)}
          {arm(1, p.shR, p.elR)}
        </g>
      </g>
    </Piece>
  );
};

// ---------- transitions ----------
// The frame at which a SheetPull fully covers the screen: swap the scene underneath here.
export const pullCover = (at: number) => at + (6 * STEP) / FPS;

// Sheet pull: a big torn sheet is dragged across in six exposures, rests one, and drags off the other side. Optional tape label rides on it.
export const SheetPull: FC<{ at: number; color?: string; dir?: "left" | "right"; label?: string; seed?: number }> = ({ at, color = TEAL, dir = "left", label, seed = 950 }) => {
  const { t } = useTime();
  const i = poseAt(t, at, 14, STEP);
  if (i < 0 || i >= 13) return null;
  const sgn = dir === "left" ? 1 : -1;
  const u = i <= 6 ? 1 - i / 6 : -(i - 7) / 6;
  const x = 960 + sgn * u * 2500;
  const r = i === 6 || i === 7 ? 0 : (i % 2 ? 2 : -2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Sheet x={x} y={540} w={2300} h={1500} sides="lr" amp={14} color={color} seed={seed} r={r} z={3} still grain={0.9} />
      {label && i >= 4 && i <= 9 && <Tape x={x} y={540} text={label} size={56} h={96} r={-3} seed={seed + 1} />}
    </AbsoluteFill>
  );
};

// PaperIris: a hole torn in a sheet that opens (or closes) on twos, white core round the tear, casting its shadow inward.
export const PaperIris: FC<{ at: number; dur?: number; from?: number; to?: number; cx?: number; cy?: number; color?: string; seed?: number; children?: ReactNode }> = ({ at, dur = 0.8, from = 0, to = 1300, cx = 960, cy = 540, color = INK, seed = 970, children }) => {
  const { t } = useTime();
  const rad = from + (to - from) * stepRamp(t, at, dur, CAM_STEP);
  if (rad > 1250) return null;
  const outer = "M-60 -60H1980V1140H-60Z";
  const g = rad > 4 ? tornCircle(cx, cy, rad, seed, 6 + rad * 0.006, 9, true) : null;
  return (
    <Piece x={960} y={540} w={1920} h={1080} z={2.6} seed={seed} still grain={color === INK ? 0.4 : 0.8}>
      <path d={g ? `${outer}${g.core}` : outer} fill={CORE} fillRule="evenodd" />
      <path d={g ? `${outer}${g.paper}` : outer} fill={color} fillRule="evenodd" />
      {children}
    </Piece>
  );
};

// PaperFold: the lower flap of a card, hinged across its middle, folds up toward the camera on twos and lands over the top half, shading as it turns.
export const FlapReveal: FC<{ x?: number; y?: number; w?: number; h?: number; at: number; dur?: number; top?: ReactNode; front: ReactNode; back?: ReactNode; under: ReactNode; flapColor?: string; backColor?: string; baseColor?: string; seed?: number }> = ({
  x = 960, y = 560, w = 1200, h = 640, at, dur = 0.7, top, front, back, under, flapColor = TEAL, backColor = TEAL_DK, baseColor = CREAM, seed = 980,
}) => {
  const { t } = useTime();
  const th = stepRamp(t, at, dur, CAM_STEP) * 178;
  const shade = Math.sin((th * Math.PI) / 180) * 0.35;
  const half = h / 2;
  const pad = 20;
  const face: CSSProperties = { position: "absolute", inset: 0, backfaceVisibility: "hidden" };
  const flap = (color: string, print: ReactNode, sides: string, k: number, dim: number) => (
    <div style={{ position: "absolute", inset: 0, filter: `brightness(${(1 - dim).toFixed(3)})` }}>
      <Sheet x={w / 2 + pad} y={half / 2 + pad} w={w} h={half} sides={sides} amp={7} color={color} seed={seed + k} z={1.4} still print={print} />
    </div>
  );
  return (
    <>
      <Sheet x={x} y={y} w={w} h={h} sides="" color={baseColor} seed={seed} z={1}
        print={
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: half }}>{top}</div>
            <div style={{ position: "absolute", left: 0, right: 0, top: half, height: half }}>{under}</div>
          </>
        } />
      <div style={{ position: "absolute", left: x - w / 2 - pad, top: y - pad, width: w + pad * 2, height: half + pad * 2, perspective: 2400, perspectiveOrigin: `50% ${pad}px` }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `50% ${pad}px`, transform: `rotateX(${th}deg)`, transformStyle: "preserve-3d" }}>
          <div style={face}>{flap(flapColor, front, "b", 1, shade)}</div>
          <div style={{ ...face, transform: "rotateX(180deg)", transformOrigin: "50% 50%" }}>{flap(backColor, back, "t", 2, shade * 0.5)}</div>
        </div>
      </div>
    </>
  );
};
