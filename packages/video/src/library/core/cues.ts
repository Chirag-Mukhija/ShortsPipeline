// Theme-free rhythm cues: narration words to seconds, reveal alignment, a beat pulse on the shared beat clock, and impact/shake envelopes.
import { random } from "remotion";
import { useSong, type BeatClock } from "./beat";
import { FPS } from "./video";

// One word of record/narration.json (extra fields such as idx and beat are allowed).
export type NarrationWord = { text: string; start: number; end: number; idx?: number; beat?: number };

// "Tech," and "tech" match; digits, dots inside numbers, % and $ survive so "7.8%" still matches.
export const normWord = (s: string) =>
  s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\p{N}.%$']+/gu, "").replace(/^[.']+|[.']+$/g, "");

export type CueOpts = { nth?: number; offset?: number; edge?: "start" | "end"; after?: number };

// Seconds of the nth (1-based) occurrence of a word or phrase; a phrase matches consecutive words.
// Throws when the cue is missing, so a re-recorded take with different words fails loudly instead of drifting.
export const cueWord = (words: NarrationWord[], text: string, nth: number | CueOpts = 1): number => {
  const o: CueOpts = typeof nth === "number" ? { nth } : nth;
  const want = text.split(/\s+/).map(normWord).filter(Boolean);
  if (!want.length) throw new Error(`cueWord: empty cue "${text}"`);
  let seen = 0;
  for (let i = 0; i + want.length <= words.length; i++) {
    if (o.after !== undefined && words[i]!.start < o.after) continue;
    if (want.every((w, j) => normWord(words[i + j]!.text) === w)) {
      seen++;
      if (seen === (o.nth ?? 1)) {
        const hit = o.edge === "end" ? words[i + want.length - 1]!.end : words[i]!.start;
        return hit + (o.offset ?? 0);
      }
    }
  }
  throw new Error(`cueWord: "${text}" #${o.nth ?? 1} not found in narration (${seen} found)`);
};

// The words spoken between two times, e.g. one beat's words for a <Caption>.
export const wordsBetween = (words: NarrationWord[], from: number, to: number) => words.filter((w) => w.end > from && w.start < to);

// When to start a transition or reveal of length durationS so its reveal point lands on the cue.
// Default 0.58: an ease-in-out move is perceived as arrived at ~90 % displacement, not at p = 1.
export const revealStart = (cueTime: number, durationS: number, revealPoint = 0.58) => cueTime - revealPoint * durationS;

// Picture early, never late: round a cue down to the frame at or before it.
export const cueFrame = (sec: number, fps = FPS) => Math.floor(sec * fps + 1e-6);

// Nearest grid point; division 1 = quarter notes, 0.5 = eighths, `clock.sig` = bars.
export const snapToBeat = (t: number, clock: BeatClock, division = 1) => {
  const step = clock.spb * division;
  return clock.off + Math.round((t - clock.off) / step) * step;
};

// Whole-screen "alive" pulse: +amount scale on every grid point with e^(-rate·t) decay (~0.12 s at 25).
// Read inside a <Track>; `every` is in beats (1 quarter, 0.5 eighth, 4 bar).
export const useBeatPulse = ({ amount = 0.012, rate = 25, every = 1, downbeatOnly = false }: { amount?: number; rate?: number; every?: number; downbeatOnly?: boolean } = {}) => {
  const { t, clock, pos, energy } = useSong();
  const step = clock.spb * every;
  const since = t - clock.off;
  let k = since < 0 ? 0 : Math.exp(-rate * (((since % step) + step) % step));
  if (downbeatOnly && pos.beatInBar !== 1) k = 0;
  const scale = 1 + amount * k;
  return { k, scale, energy, transform: `scale(${scale})` };
};

// Impact envelope: 1 at `at`, easing to 0 over `dur` (20 frames by default); max over several cues; 0 before.
export const impact = (t: number, at: number | number[], dur = 20 / FPS) => {
  const ats = Array.isArray(at) ? at : [at];
  let k = 0;
  for (const a of ats) {
    if (t < a) continue;
    const u = (t - a) / dur;
    if (u < 1) k = Math.max(k, (1 - u) * (1 - u));
  }
  return k;
};

// Camera hit for both outgoing and incoming layers: scale 1+scale → 1, plus an optional seeded high-frequency shake in px.
export const impactTransform = (t: number, at: number | number[], { scale = 0.03, shake = 0, dur = 20 / FPS, seed = 1 }: { scale?: number; shake?: number; dur?: number; seed?: number } = {}) => {
  const k = impact(t, at, dur);
  if (!k) return "none";
  const ph = random(`shake-${seed}`) * 6.28;
  const x = shake * k * Math.sin(t * 71 + ph);
  const y = shake * k * Math.cos(t * 53 + ph * 1.7);
  return `translate(${x}px, ${y}px) scale(${1 + scale * k})`;
};
