// Theme-free beat clock for music-only videos: a BPM grid as seconds and frame tables, the intro/build/peak/breathe/out energy arc, a synthetic spectrum, and <Track> so every piece moves to the same music.
import { createContext, useContext, type FC, type ReactNode } from "react";
import { random } from "remotion";
import { INOUT, ramp, useTime } from "./time";
import { FPS } from "./video";

// The studio's music-only energy arc (.claude/skills/studio/music-only.md).
export type SectionName = "intro" | "build" | "peak" | "breathe" | "out";

// Text-card hold rule for music-only videos: 1.5 s + 0.3 s per word, at most 12 words, rounded up to half a second.
export const MAX_WORDS = 12;
export const holdFor = (words: number) => Math.ceil((1.5 + 0.3 * Math.min(words, MAX_WORDS)) * 2) / 2;

export type Section = { name: SectionName; start: number; end: number; energy?: number; label?: string };
export type TrackSpec = { bpm: number; offsetSec?: number; signature?: number; sections?: Section[] };

// Default intensity per section name; a section's own `energy` overrides it.
export const ENERGY: Record<SectionName, number> = { intro: 0.25, build: 0.55, peak: 1, breathe: 0.35, out: 0.15 };

// A cue is song seconds, or a DAW-style position: bar and beat both count from 1.
export type Cue = number | { bar: number; beat?: number };

export const beatClock = (spec: TrackSpec) => {
  const sig = spec.signature ?? 4;
  const off = spec.offsetSec ?? 0;
  const spb = 60 / spec.bpm;
  const spBar = spb * sig;
  const sections = spec.sections ?? [];
  const beatSec = (i: number) => off + i * spb;
  const barSec = (bar: number, beat = 1) => off + ((bar - 1) * sig + (beat - 1)) * spb;
  const cue = (c: Cue) => (typeof c === "number" ? c : barSec(c.bar, c.beat ?? 1));
  const pos = (t: number) => {
    const b = (t - off) / spb;
    const i = Math.floor(b);
    return { beat: i, beatPhase: b - i, bar: Math.floor(i / sig) + 1, beatInBar: (((i % sig) + sig) % sig) + 1, barPhase: (((b / sig) % 1) + 1) % 1 };
  };
  // Kick envelope: 1 on each beat decaying over ~decay s; off-downbeats hit at 60 %.
  const pulse = (t: number, decay = 0.12) => {
    if (t < off) return 0;
    const p = pos(t);
    const k = Math.exp(-(p.beatPhase * spb) / decay);
    return p.beatInBar === 1 ? k : k * 0.6;
  };
  // Same envelope on the off-beat 8ths, for hats and sparkle.
  const eighth = (t: number, decay = 0.05) => {
    if (t < off) return 0;
    const h = (((t - off) / spb) * 2) % 1;
    return h > 0.5 ? 0 : Math.exp(-(h * spb) / 2 / decay) * (Math.floor(((t - off) / spb) * 2) % 2 ? 1 : 0.4);
  };
  const sectionAt = (t: number) => sections.find((s) => t >= s.start && t < s.end) ?? (t < (sections[0]?.start ?? 0) ? sections[0] : sections[sections.length - 1]);
  const sectionIndex = (t: number) => Math.max(0, sections.findIndex((s) => s === sectionAt(t)));
  // Energy eases across each boundary over half a bar, so motion amplitude never jumps.
  const energy = (t: number) => {
    const first = sections[0];
    if (!first) return 0.6;
    let v = first.energy ?? ENERGY[first.name];
    for (const s of sections.slice(1)) {
      const e = s.energy ?? ENERGY[s.name];
      v += (e - v) * ramp(t, s.start - spBar / 4, spBar / 2, INOUT);
    }
    return v;
  };
  // Frame tables for the edit: every beat and bar start up to `bars`, plus section starts.
  const table = (bars: number) => ({
    beats: Array.from({ length: bars * sig }, (_, i) => Math.round(beatSec(i) * FPS)),
    bars: Array.from({ length: bars }, (_, i) => Math.round(barSec(i + 1) * FPS)),
    sections: sections.map((s) => ({ name: s.name, frame: Math.round(s.start * FPS) })),
  });
  return { bpm: spec.bpm, sig, off, spb, spBar, sections, beatSec, barSec, cue, pos, pulse, eighth, sectionAt, sectionIndex, energy, table };
};
export type BeatClock = ReturnType<typeof beatClock>;

type TrackValue = { clock: BeatClock; from: number };
const Ctx = createContext<TrackValue>({ clock: beatClock({ bpm: 120 }), from: 0 });

// `from` is the song time at this sequence's frame 0, so pieces inside a <Sequence> still take song-time cues.
export const Track: FC<{ spec: TrackSpec; from?: number; children: ReactNode }> = ({ spec, from = 0, children }) => (
  <Ctx.Provider value={{ clock: beatClock(spec), from }}>{children}</Ctx.Provider>
);
export const useClock = () => useContext(Ctx).clock;

// Song time for the current frame, and the beat state every piece reads.
export const useSong = () => {
  const { t: local } = useTime();
  const { clock, from } = useContext(Ctx);
  const t = local + from;
  return { t, f: Math.round(t * FPS), clock, pulse: clock.pulse(t), energy: clock.energy(t), pos: clock.pos(t) };
};

// Envelope that peaks at each listed cue and decays; for pulses on chosen beats rather than every beat.
export const hits = (t: number, at: number[], decay = 0.18) => at.reduce((m, c) => (t >= c ? Math.max(m, Math.exp(-(t - c) / decay)) : m), 0);

// A spectrum with no audio file: bass follows the kick, highs follow the 8ths, and a seeded shimmer keeps it alive.
// Bins run low → high, values 0..1, averaged over `smooth` frames either side (the board's 3–5 f smoothing).
export const synthSpectrum = (clock: BeatClock, t: number, bins: number, seed = 1, smooth = 2) => {
  const out = new Array<number>(bins).fill(0);
  for (let d = -smooth; d <= smooth; d++) {
    const tt = t + d / FPS;
    const kick = clock.pulse(tt, 0.16);
    const hat = clock.eighth(tt);
    const e = clock.energy(tt);
    for (let i = 0; i < bins; i++) {
      const u = i / Math.max(1, bins - 1);
      const ph = random(`sp${seed}-${i}`) * Math.PI * 2;
      const shimmer = 0.5 + 0.5 * Math.sin(tt * (1.3 + u * 5.1) + ph);
      const v = (0.25 + 0.75 * e) * (kick * Math.pow(1 - u, 1.6) * 0.95 + hat * Math.pow(u, 1.2) * 0.55 + shimmer * (0.18 + 0.2 * (1 - u)));
      out[i]! += Math.min(1, v) / (smooth * 2 + 1);
    }
  }
  return out;
};

// Real audio: pass a per-frame sampler (e.g. visualizeAudio over useAudioData) and it gets the same smoothing.
export type Sampler = (frame: number) => number[];
export const smoothSamples = (sampler: Sampler, f: number, bins: number, smooth = 2) => {
  const out = new Array<number>(bins).fill(0);
  for (let d = -smooth; d <= smooth; d++) {
    const s = sampler(f + d);
    for (let i = 0; i < bins; i++) out[i]! += (s[Math.floor((i / bins) * s.length)] ?? 0) / (smooth * 2 + 1);
  }
  return out;
};
