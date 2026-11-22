// Kinetic type primitives: the void/colour-block surface with film grain, flash frames, a phrase push-in, word placement, and the core text moves (WordHit, MaskRise, EchoTrail).
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useTime } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { BLOCK, M, MUTED, voice, type Bg, type Voice } from "./theme";
import { EXPO, IN, emph, exit, flashOn, snap, span } from "./motion";

// ---------- surface ----------

// 2 % film grain: fractal noise re-seeded every 2 frames (15 fps), the way real grain dances.
export const Grain: FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const seed = Math.floor(useCurrentFrame() / 2) % 24;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      <filter id={`ktf-grain-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
      </filter>
      <rect width={W} height={H} filter={`url(#ktf-grain-${seed})`} />
    </svg>
  );
};

// A ghost word in outline that bleeds off the frame and slowly drifts in tracking: the idle life behind a hold.
export const Ghost: FC<{ text: string; color?: string; size?: number; y?: number; opacity?: number }> = ({ text, color = MUTED, size = 520, y = 760, opacity = 0.32 }) => {
  const { t } = useTime();
  return (
    <div
      style={{
        position: "absolute",
        left: M - 40 - t * 6,
        top: y - size / 2,
        whiteSpace: "nowrap",
        ...voice("hit", size),
        letterSpacing: `${-0.045 + 0.0012 * t}em`,
        color: "transparent",
        WebkitTextStroke: `2px ${color}`,
        opacity,
      }}
    >
      {text}
    </div>
  );
};

// The film's frame: flat colour (void by default), optional outline ghost word, and grain. No gradients.
export const Void: FC<{ bg?: Bg; ghost?: string; grain?: number }> = ({ bg = "void", ghost, grain }) => (
  <AbsoluteFill style={{ backgroundColor: BLOCK[bg].bg, overflow: "hidden" }}>
    {ghost && <Ghost text={ghost} color={BLOCK[bg].muted} />}
    <Grain opacity={grain ?? (bg === "void" ? 0.07 : 0.05)} />
  </AbsoluteFill>
);

// A full-frame flash for `frames` frames at `at` (the punctuation on a hard cut).
export const Flash: FC<{ at: number; frames?: number; color?: string }> = ({ at, frames = 2, color = "#FFFFFF" }) => {
  const { t } = useTime();
  return flashOn(t, at, frames) ? <AbsoluteFill style={{ backgroundColor: color }} /> : null;
};

// One push-in across a phrase (3–8 %), eased so it starts and ends still.
export const Push: FC<{ from: number; to: number; amount?: number; children: ReactNode; origin?: string }> = ({ from, to, amount = 0.05, children, origin = "50% 50%" }) => {
  const { t } = useTime();
  const s = 1 + amount * interpolate(t, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

// ---------- placement ----------

export type Align = "left" | "center" | "right";
const ANCHOR: Record<Align, string> = { left: "0%", center: "-50%", right: "-100%" };

// Places a line of type with (x, y) at its anchor; with line-height 1 the box centre sits on Inter's cap centre.
export const Spot: FC<{ x: number; y: number; align?: Align; style?: CSSProperties; transform?: string; origin?: string; children: ReactNode }> = ({ x, y, align = "center", style, transform = "", origin, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      whiteSpace: "nowrap",
      transform: `translate(${ANCHOR[align]}, -50%) ${transform}`,
      transformOrigin: origin ?? (align === "left" ? "0% 50%" : align === "right" ? "100% 50%" : "50% 50%"),
      ...style,
    }}
  >
    {children}
  </div>
);

// Variable-weight style for Inter: the browser picks the nearest loaded face and the axis does the rest.
export const wght = (w: number): CSSProperties => ({ fontWeight: Math.min(900, Math.max(300, Math.round(w / 100) * 100)), fontVariationSettings: `"wght" ${w.toFixed(1)}` });

// ---------- WordHit ----------

export type Exit = "left" | "right" | "up" | "down" | "cut";
export type Pose = { o: number; s: number; x: number; y: number };

export type WordHitProps = {
  text: string;
  // Spoken start of the word (s); the snap leads it by 3 f.
  at: number;
  x?: number;
  y?: number;
  size?: number;
  v?: Voice;
  align?: Align;
  color?: string;
  // Turns to `accent` and punches 100 → 130 → 110 % at `emphAt` (the stressed syllable).
  emphAt?: number;
  accent?: string;
  // Weight morph [from, to] (Inter only), played over 8 f at `emphAt` (or at the hit if there is no emphasis).
  weight?: [number, number];
  out?: number;
  exitTo?: Exit;
  // Outline echoes lagging 3 f behind, at 30 %.
  echo?: number;
  style?: CSSProperties;
};

const slideOff = (e: number, to: Exit) => {
  const d = e * (W + 400);
  return to === "left" ? { x: -d, y: 0 } : to === "right" ? { x: d, y: 0 } : to === "up" ? { x: 0, y: -e * (H + 200) } : to === "down" ? { x: 0, y: e * (H + 200) } : { x: 0, y: 0 };
};

export const hitPose = (tt: number, p: { at: number; size: number; emphAt?: number; out?: number; exitTo?: Exit }): Pose => {
  const sn = snap(tt, p.at);
  const em = p.emphAt === undefined ? 1 : emph(tt, p.emphAt);
  let o = sn.o;
  let x = 0;
  let y = sn.y * p.size;
  if (p.out !== undefined && tt >= p.out) {
    if ((p.exitTo ?? "left") === "cut") o = 0;
    else {
      const off = slideOff(exit(tt, p.out), p.exitTo ?? "left");
      x += off.x;
      y += off.y;
    }
  }
  return { o, s: sn.s * em, x, y };
};

// One word that snaps in on its spoken time, can punch and turn accent on the stressed syllable, and leaves by sliding off or cutting.
export const WordHit: FC<WordHitProps> = ({ text, at, x = 960, y = 540, size = 240, v = "hit", align = "center", color = "#FFFFFF", emphAt, accent, weight, out, exitTo = "left", echo = 0, style }) => {
  const { t } = useTime();
  const pose = (tt: number) => hitPose(tt, { at, size, emphAt, out, exitTo });
  const morphAt = emphAt ?? at;
  const w = weight ? interpolate(t, [morphAt, morphAt + 8 / FPS], weight, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : undefined;
  const tint = accent && emphAt !== undefined && t >= emphAt ? accent : color;
  const base: CSSProperties = { ...voice(v, size), ...(w !== undefined ? wght(w) : {}), ...style };
  const draw = (p: Pose, k: number) =>
    p.o <= 0 ? null : (
      <Spot
        key={k}
        x={x + p.x}
        y={y + p.y}
        align={align}
        transform={`scale(${p.s})`}
        style={{ ...base, opacity: k === 0 ? p.o : p.o * 0.3, color: k === 0 ? tint : "transparent", WebkitTextStroke: k === 0 ? undefined : `2px ${tint}` }}
      >
        {text}
      </Spot>
    );
  return (
    <>
      {Array.from({ length: echo }, (_, i) => draw(pose(t - ((echo - i) * 3) / FPS), echo - i))}
      {draw(pose(t), 0)}
    </>
  );
};

// ---------- MaskRise ----------

export type MaskRiseProps = {
  lines: string[];
  at: number;
  by?: "lines" | "words" | "chars";
  // Frames between units and per unit (A1: lines 2/24, words 2/18, chars 0.3/12).
  stagger?: number;
  dur?: number;
  out?: number;
  style?: CSSProperties;
  // Per-unit style override, e.g. colour one word.
  unitStyle?: (index: number, unit: string) => CSSProperties | undefined;
  lineGap?: string;
};

const DEFAULTS = { lines: [2, 24], words: [2, 18], chars: [0.6, 12] } as const;

// Lines, words or letters rising from behind an invisible floor (out-expo), and dropping back out of it on exit.
export const MaskRise: FC<MaskRiseProps> = ({ lines, at, by = "words", stagger, dur, out, style, unitStyle, lineGap = "0em" }) => {
  const { t } = useTime();
  const st = stagger ?? DEFAULTS[by][0];
  const du = dur ?? DEFAULTS[by][1];
  let n = 0;
  return (
    <div style={style}>
      {lines.map((line, li) => {
        const units = by === "lines" ? [line] : by === "words" ? line.split(" ") : [...line];
        return (
          <div key={li} style={{ display: "block", whiteSpace: "nowrap", marginTop: li ? lineGap : 0 }}>
            {units.map((u, ui) => {
              const i = n++;
              const p = span(t, at + (i * st) / FPS, du, EXPO);
              const e = out === undefined ? 0 : interpolate(t, [out + (i * st * 0.5) / FPS, out + (i * st * 0.5 + 8) / FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: IN });
              return (
                <span key={ui}>
                  {by === "words" && ui > 0 ? " " : ""}
                  <span style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.15em", marginBottom: "-0.15em", paddingTop: "0.05em", marginTop: "-0.05em", verticalAlign: "top" }}>
                    <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 115 - e * 115}%)`, ...unitStyle?.(i, u) }}>{u === " " ? " " : u}</span>
                  </span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ---------- EchoTrail ----------

export type EchoKey = { t: number; x: number; y: number; s?: number };

export type EchoTrailProps = {
  text: string;
  keys: EchoKey[];
  count?: number;
  // Frames each echo lags behind the one in front.
  lag?: number;
  // Offset each echo keeps when the word is still (px per layer), so a hold reads as a stack.
  rest?: [number, number];
  size?: number;
  v?: Voice;
  color?: string;
  echoColor?: string;
  align?: Align;
};

const poseAt = (tt: number, keys: EchoKey[]) => {
  let { x, y, s = 1 } = keys[0]!;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    const prev = keys[i - 1]!;
    if (tt <= prev.t) break;
    const e = interpolate(tt, [prev.t, k.t], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO });
    x = prev.x + (k.x - prev.x) * e;
    y = prev.y + (k.y - prev.y) * e;
    s = (prev.s ?? 1) + ((k.s ?? 1) - (prev.s ?? 1)) * e;
  }
  return { x, y, s };
};

// Stroke-only copies trailing a moving word, each `lag` frames late; on a hold they fan out by `rest` into an outline stack.
export const EchoTrail: FC<EchoTrailProps> = ({ text, keys, count = 4, lag = 3, rest = [0, 0], size = 220, v = "hit", color = "#FFFFFF", echoColor, align = "center" }) => {
  const { t } = useTime();
  const first = keys[0]!.t;
  const settle = interpolate(t, [keys[keys.length - 1]!.t, keys[keys.length - 1]!.t + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO });
  const layers = Array.from({ length: count + 1 }, (_, i) => count - i);
  return (
    <>
      {layers.map((k) => {
        const tt = t - (k * lag) / FPS;
        if (tt < first) return null;
        const p = poseAt(tt, keys);
        const echo = k > 0;
        return (
          <Spot
            key={k}
            x={p.x + rest[0] * k * settle}
            y={p.y + rest[1] * k * settle}
            align={align}
            transform={`scale(${p.s})`}
            style={{ ...voice(v, size), color: echo ? "transparent" : color, WebkitTextStroke: echo ? `2px ${echoColor ?? color}` : undefined, opacity: echo ? 0.3 + 0.25 * (1 - k / count) * settle : 1 }}
          >
            {text}
          </Spot>
        );
      })}
    </>
  );
};

