// Cuts and hits: the 6-frame RGB-split GlitchCut, the PunchIn camera on emphasised words, and SfxTrack, which places a sound effect on every visual hit.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { H, W } from "../../core/video";
import { INOUT, ramp, useTime } from "../../core/time";
import { BG, BLUE, ORANGE, RED, rng } from "./theme";

// One colour channel of a scene: the scene multiplied by a pure channel colour inside its own isolated group.
const Channel: FC<{ color: string; dx: number; children: ReactNode }> = ({ color, dx, children }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", transform: `translateX(${dx}px)` }}>
    <AbsoluteFill style={{ isolation: "isolate", backgroundColor: BG }}>
      {children}
      <AbsoluteFill style={{ backgroundColor: color, mixBlendMode: "multiply" }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

// A hard cut from `from` to `to` at `at` (s), dressed as a glitch: for `frames` frames centred on the cut the picture splits into R, G and B copies and horizontal slices jump sideways, re-rolled every 2 frames.
export const GlitchCut: FC<{ at: number; from: ReactNode; to: ReactNode; frames?: number; seed?: number; strength?: number }> = ({ at, from, to, frames = 6, seed = 3, strength = 1 }) => {
  const { t } = useTime();
  const start = at - frames / 2 / 30;
  const k = Math.floor((t - start) * 30 + 1e-6);
  if (k < 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (k >= frames) return <AbsoluteFill>{to}</AbsoluteFill>;
  const scene = k < frames / 2 ? from : to;
  // Strongest on the cut frame itself, easing off either side.
  const peak = 1 - Math.abs(k + 0.5 - frames / 2) / (frames / 2);
  const r = rng(seed * 131 + Math.floor(k / 2));
  const split = (14 + 26 * peak) * strength;
  const bands: { top: number; h: number; dx: number }[] = [];
  let y = 0;
  while (y < H) {
    const h = Math.min(H - y, 40 + r() * 200);
    bands.push({ top: y, h, dx: r() < 0.45 ? (r() - 0.5) * 2 * (60 + 160 * peak) * strength : 0 });
    y += h;
  }
  const bars = Array.from({ length: 3 }, () => ({ y: r() * H, h: 3 + r() * 10, c: [ORANGE, BLUE, RED][Math.floor(r() * 3)]! }));
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {bands.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: 0, top: b.top, width: W, height: b.h, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: -b.top, width: W, height: H, transform: `translateX(${b.dx}px)`, isolation: "isolate", backgroundColor: "#000" }}>
            <Channel color="#FF0000" dx={split}>{scene}</Channel>
            <Channel color="#00FF00" dx={0}>{scene}</Channel>
            <Channel color="#0000FF" dx={-split}>{scene}</Channel>
          </div>
        </div>
      ))}
      {bars.map((b, i) => (
        <div key={`b${i}`} style={{ position: "absolute", left: 0, right: 0, top: b.y, height: b.h, backgroundColor: b.c, opacity: 0.8, mixBlendMode: "screen" }} />
      ))}
    </AbsoluteFill>
  );
};

export type Punch = { at: number; scale?: number; x?: number; y?: number };

// Camera punch-in scale at t: 6 frames in, 12 frames hold, 6 frames out, 8–12 % by default.
export const punchAt = (t: number, hits: Punch[]) => {
  let s = 1;
  let ox = W / 2;
  let oy = H / 2;
  for (const h of hits) {
    const e = ramp(t, h.at - 3 / 30, 6 / 30, INOUT) * (1 - ramp(t, h.at + 15 / 30, 6 / 30, INOUT));
    const v = 1 + ((h.scale ?? 1.1) - 1) * e;
    if (v > s) {
      s = v;
      ox = h.x ?? ox;
      oy = h.y ?? oy;
    }
  }
  return { s, ox, oy };
};

// Wraps a scene and punches in toward (x, y) on each hit.
export const PunchIn: FC<{ hits: Punch[]; children: ReactNode }> = ({ hits, children }) => {
  const { t } = useTime();
  const { s, ox, oy } = punchAt(t, hits);
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</AbsoluteFill>;
};

export type SfxHit = { at: number; src: string; volume?: number };

// Every visual hit can carry a sound: list them once and this lays one <Audio> per hit at its frame, so the whoosh lines up with the pop.
export const SfxTrack: FC<{ hits: SfxHit[] }> = ({ hits }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {hits.map((h, i) => (
        <Sequence key={i} from={Math.round(h.at * fps)} layout="none">
          <Audio src={h.src} volume={h.volume ?? 0.6} />
        </Sequence>
      ))}
    </>
  );
};
