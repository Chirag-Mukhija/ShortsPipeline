// Loom clock and seeds: narration seconds or a music beat grid through core's Track, plus the cheap integer hash and value noise the slat renderer calls per cell.
import { createContext, useContext, type FC, type ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Track, useSong, type TrackSpec } from "../../core/beat";

const Music = createContext(false);

// Wrap a music-only scene in <Woven>: core's <Track> plus a flag, so narrated scenes never pulse to a phantom default tempo.
export const Woven: FC<{ spec: TrackSpec; from?: number; children: ReactNode }> = ({ spec, from, children }) => (
  <Track spec={spec} from={from}>
    <Music.Provider value>{children}</Music.Provider>
  </Track>
);

// Every piece reads time here: song seconds inside <Woven>, plain seconds otherwise. `beatAt(dt)` is the kick envelope dt seconds ago, for waves that travel across the slats.
export const useLoom = () => {
  const s = useSong();
  const music = useContext(Music);
  return {
    t: s.t,
    f: useCurrentFrame(),
    music,
    pulse: music ? s.pulse : 0,
    energy: music ? s.energy : 0.4,
    beat: music ? s.pos.beat : -1,
    spb: s.clock.spb,
    clock: s.clock,
    beatAt: (dt: number) => (music ? s.clock.pulse(s.t - dt, 0.22) : 0),
  };
};

// Integer hash → [0, 1). The renderer calls this ~100k times a frame, so it avoids remotion's string-seeded random.
export const hash = (a: number, b = 0, c = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const fadeC = (x: number) => x * x * (3 - 2 * x);
// Smooth value noise in [0, 1] on a unit lattice.
export const noise = (x: number, y: number, seed = 0) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fadeC(x - xi);
  const v = fadeC(y - yi);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// 4×4 Bayer thresholds: the ordered dither that gives stepped pixel edges where tones meet.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (i: number, j: number) => (BAYER[(j & 3) * 4 + (i & 3)]! + 0.5) / 16;
