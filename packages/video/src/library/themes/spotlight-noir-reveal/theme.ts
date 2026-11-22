// Spotlight noir tokens: the near-black room, barely-there unlit ink, warm tungsten light, the fonts, and the light's own clock (pendulum, flicker, switch on/off, hand jitter, keyed beam paths).
import { random } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexMono";
import { FPS } from "../../core/video";
import { INOUT, ramp, type Ease } from "../../core/time";

export const SERIF = loadPlayfair("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily;
loadPlayfair("italic", { weights: ["700", "800"], subsets: ["latin"] });
export const CAPS = loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadPlex("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;

export const NIGHT = "#07080B";
export const UNLIT = "#1D2026";
export const LIT = "#F4F1E8";
export const CONE = "#FFF3D1";
export const ACCENT = "#E8B04A";
export const ALARM = "#FF4D4D";
// Dark metal for lamp shades and fixtures: just above the room so silhouettes read against it.
export const METAL = "#16181D";
export const EDGE = "#3A3D45";

// The unlit copy of every lit thing sits at this opacity: #F4F1E8 at 10 % over the room lands near the board's #1D2026.
export const DIM = 0.1;

export const TAU = Math.PI * 2;

// Swinging lamp: amplitude in px, period in seconds.
export const pendulum = (t: number, amp: number, period = 5, phase = 0) => amp * Math.sin((TAU * t) / period + phase);

// The board's idle micro-jitter (sin(f*0.9)*3 px), plus a slower drift so a held beam never looks pinned.
export const jitter = (t: number, seed = 0, amp = 3) => {
  const f = t * FPS;
  return { dx: Math.sin(f * 0.9 + seed) * amp * 0.6 + Math.sin(t * 1.7 + seed * 3) * amp, dy: Math.cos(f * 0.73 + seed * 2) * amp * 0.5 + Math.sin(t * 1.3 + seed) * amp * 0.7 };
};

// A torch held by a hand: slow sway plus a small tremor.
export const hand = (t: number, seed = 0, amp = 7) => ({
  dx: Math.sin(t * 1.9 + seed) * amp * 0.7 + Math.sin(t * 5.3 + seed * 2) * amp * 0.3,
  dy: Math.sin(t * 1.4 + seed * 4) * amp * 0.6 + Math.sin(t * 6.1 + seed) * amp * 0.25,
});

// Tungsten hum: almost always 1, with seeded dips now and then (the "occasional lamp flicker").
export const flicker = (t: number, seed = 1, odds = 0.04) => {
  const k = Math.floor((t * FPS) / 2);
  const hum = 1 - 0.025 * (0.5 + 0.5 * Math.sin(t * 9.1 + seed));
  return random(`fl${seed}-${k}`) < odds ? hum * (0.5 + 0.35 * random(`fd${seed}-${k}`)) : hum;
};

// Frame-by-frame stutter tables: a lamp catching, and a lamp dying.
const ON = [
  [0.9, 0.1, 0.0, 0.75, 0.2, 1, 0.55, 1],
  [0.4, 1, 0.05, 0.0, 0.9, 0.3, 1],
  [1, 0.0, 0.6, 1, 0.15, 1],
];
const OFF = [1, 0.35, 1, 0.8, 0.1, 0.95, 0.4, 0.0];

// 0 before `at`, then the stutter, then steady (with the hum).
export const switchOn = (t: number, at: number, seed = 0) => {
  if (t < at) return 0;
  const seq = ON[Math.abs(seed) % ON.length]!;
  const f = Math.floor((t - at) * FPS);
  return f < seq.length ? seq[f]! : flicker(t, seed + 11);
};

// Steady until `at`, the dying stutter, then `to` (0 = black).
export const switchOff = (t: number, at: number, to = 0) => {
  if (t < at) return 1;
  const f = Math.floor((t - at) * FPS);
  return f < OFF.length ? to + (1 - to) * OFF[f]! : to;
};

// Keyed beam path: each key is where the beam ARRIVES at time t (a cue lands a few frames before its word); it travels over d seconds.
export type BeamKey = { t: number; x: number; y: number; r?: number; d?: number };
export const beamAt = (t: number, keys: BeamKey[], d = 0.4, e: Ease = INOUT) => {
  const k0 = keys[0]!;
  let x = k0.x;
  let y = k0.y;
  let r = k0.r ?? 260;
  for (const k of keys.slice(1)) {
    const dd = k.d ?? d;
    if (t < k.t - dd) break;
    const p = ramp(t, k.t - dd, dd, e);
    x += (k.x - x) * p;
    y += (k.y - y) * p;
    r += ((k.r ?? r) - r) * p;
  }
  return { x, y, r };
};

// Count-up with an out-expo settle, so the last digits arrive slowly.
export const countUp = (t: number, at: number, value: number, d = 1) => value * ramp(t, at, d, (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)));

