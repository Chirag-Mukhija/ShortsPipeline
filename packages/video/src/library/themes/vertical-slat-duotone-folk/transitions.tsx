// Slat transitions: the venetian-blind wipe that retracts every column to reveal what's behind, and the louvre flip that turns each slat over from one section (dark) to the other (sand).
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { FPS, W, H } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { hash, useLoom } from "./clock";

type Rect = [number, number, number, number];

// Clips children to one rect per column; skips the clip entirely when every column is fully open or fully shut.
export const ColumnClip: FC<{ period: number; rect: (i: number, x: number) => Rect | null; children: ReactNode }> = ({ period, rect, children }) => {
  const id = `k${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const n = Math.ceil(W / period);
  const rects: Rect[] = [];
  let full = true;
  for (let i = 0; i < n; i++) {
    const r = rect(i, i * period);
    if (!r || r[2] <= 0.2 || r[3] <= 0.2) {
      full = false;
      continue;
    }
    if (r[1] > 0.5 || r[3] < H - 0.5 || r[2] < period - 0.01) full = false;
    rects.push(r);
  }
  if (!rects.length) return null;
  if (full) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {rects.map(([x, y, w, h], k) => (
              <rect key={k} x={x} y={y} width={w} height={h} />
            ))}
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const EXPO = Easing.inOut(Easing.exp);

export type BlindWipeProps = {
  at: number;
  front: ReactNode;
  back: ReactNode;
  // Column width in px and the delay per column in frames (the board's x * 0.05 f, per bar).
  period?: number;
  delayPerBar?: number;
  dur?: number;
  // Which edge the bars retract from: "bottom" lifts like a blind, "top" drops.
  from?: "bottom" | "top";
  // Optional time the blinds close again over the back layer.
  close?: number;
};

// Venetian-blind wipe: each column of the front layer retracts in height (24 f, expo in-out), left to right, exposing the back layer.
export const BlindWipe: FC<BlindWipeProps> = ({ at, front, back, period = 12, delayPerBar = 0.2, dur = 0.8, from = "bottom", close }) => {
  const { t } = useLoom();
  const e = (i: number) => {
    const d = (i * delayPerBar) / FPS + hash(i, 77) * 0.07;
    const open = ramp(t, at + d, dur, EXPO);
    return close === undefined ? open : open - ramp(t, close + d, dur, EXPO);
  };
  return (
    <AbsoluteFill>
      <AbsoluteFill>{back}</AbsoluteFill>
      <ColumnClip period={period} rect={(i, x) => {
        const k = e(i);
        if (k >= 0.999) return null;
        const hgt = H * (1 - k);
        return from === "bottom" ? [x, 0, period, hgt] : [x, H - hgt, period, hgt];
      }}>
        {front}
      </ColumnClip>
    </AbsoluteFill>
  );
};

export type LouvreFlipProps = {
  at: number;
  a: ReactNode;
  b: ReactNode;
  period?: number;
  // Seconds for the flip to cross the frame, and for one louvre to turn.
  spread?: number;
  dur?: number;
  // Px the outgoing scene scrolls up (and the incoming one arrives from below) during the flip; only for scenes that bleed past the frame by this much.
  scroll?: number;
};

// Tone invert as a louvre: every slat narrows to an edge and turns over into the other section, staggered left to right with a little weave jitter.
export const LouvreFlip: FC<LouvreFlipProps> = ({ at, a, b, period = 24, spread = 0.9, dur = 0.32, scroll = 0 }) => {
  const { t } = useLoom();
  const n = Math.ceil(W / period);
  const phi = (i: number) => ramp(t, at + spread * (i / n) + hash(i, 41) * 0.12, dur, INOUT);
  const g = ramp(t, at, spread + dur + 0.12, INOUT);
  return (
    <AbsoluteFill>
      <ColumnClip period={period} rect={(i, x) => {
        const p = phi(i);
        if (p >= 0.5) return null;
        const w = period * (1 - 2 * p);
        return [x + (period - w) / 2, 0, w, H];
      }}>
        <AbsoluteFill style={{ transform: `translateY(${-scroll * g}px)` }}>{a}</AbsoluteFill>
      </ColumnClip>
      <ColumnClip period={period} rect={(i, x) => {
        const p = phi(i);
        if (p < 0.5) return null;
        const w = period * (2 * p - 1);
        return [x + (period - w) / 2, 0, w, H];
      }}>
        <AbsoluteFill style={{ transform: `translateY(${scroll * (1 - g)}px)` }}>{b}</AbsoluteFill>
      </ColumnClip>
    </AbsoluteFill>
  );
};
