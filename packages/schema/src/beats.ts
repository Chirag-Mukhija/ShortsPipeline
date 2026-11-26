// Finds a music track's beats from its samples (onset strength, then a tempo-locked best path through it), so a music-only cut can land on them. Pure arithmetic, no imports.

export type BeatGrid = { bpm: number; beats: number[]; downbeats: number[]; confidence: number };

const STEP = 0.01; // seconds per onset value, before rounding to whole samples
const TIGHTNESS = 100; // how strongly beats hold the tempo

// How much louder each 10 ms is than the one before, in a low and a full band, so both kicks and snares count.
function onsets(samples: Float32Array, rate: number): Float32Array {
  const hop = Math.round(rate * STEP);
  const n = Math.floor(samples.length / hop);
  const full = new Float32Array(n);
  const low = new Float32Array(n);
  const k = 1 - Math.exp((-2 * Math.PI * 150) / rate);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    let a = 0;
    let b = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) {
      const s = samples[j]!;
      lp += k * (s - lp);
      a += s * s;
      b += lp * lp;
    }
    full[i] = Math.log(1e-4 + a / hop);
    low[i] = Math.log(1e-4 + b / hop);
  }
  const out = new Float32Array(n);
  let mean = 0;
  for (let i = 2; i < n; i++) {
    out[i] = Math.max(0, full[i]! - full[i - 2]!) + Math.max(0, low[i]! - low[i - 2]!);
    mean += out[i]!;
  }
  mean /= n || 1;
  let spread = 0;
  for (const v of out) spread += (v - mean) ** 2;
  spread = Math.sqrt(spread / (n || 1)) || 1;
  for (let i = 0; i < n; i++) out[i] = out[i]! / spread;
  return out;
}

function tempo(env: Float32Array, HOP: number, hint?: number | null): number {
  const lo = hint ? hint * 0.96 : 60;
  const hi = hint ? hint * 1.04 : 180;
  let best = { bpm: hint ?? 120, score: -Infinity };
  for (let bpm = lo; bpm <= hi; bpm += 0.25) {
    const lag = 60 / bpm / HOP;
    let sum = 0;
    // Four multiples of the lag, interpolated, so the tempo is found finer than one 10 ms step.
    for (let m = 1; m <= 4; m++) {
      const at = lag * m;
      const base = Math.floor(at);
      const frac = at - base;
      let s = 0;
      for (let i = 0; i + base + 1 < env.length; i++) s += env[i]! * (env[i + base]! * (1 - frac) + env[i + base + 1]! * frac);
      sum += s / Math.max(1, env.length - base);
    }
    // Without a hint, prefer tempos near 110 so half and double time don't win by accident.
    const score = hint ? sum : sum * Math.exp(-0.5 * (Math.log2(bpm / 110) / 0.9) ** 2);
    if (score > best.score) best = { bpm, score };
  }
  return best.bpm;
}

export function detectBeats(samples: Float32Array, rate: number, hintBpm?: number | null): BeatGrid {
  // The real step: a whole number of samples. Using the nominal 10 ms instead drifts 0.2 s a minute at some rates.
  const HOP = Math.round(rate * STEP) / rate;
  const env = onsets(samples, rate);
  const n = env.length;
  if (n < 200) return { bpm: hintBpm ?? 0, beats: [], downbeats: [], confidence: 0 };
  const bpm = tempo(env, HOP, hintBpm);
  const period = 60 / bpm / HOP;
  const score = new Float32Array(n);
  const from = new Int32Array(n).fill(-1);
  const near = Math.round(period * 0.5);
  const far = Math.round(period * 2);
  for (let i = 0; i < n; i++) {
    let best = -Infinity;
    let arg = -1;
    for (let j = Math.max(0, i - far); j <= i - near; j++) {
      const v = score[j]! - TIGHTNESS * Math.log((i - j) / period) ** 2;
      if (v > best) {
        best = v;
        arg = j;
      }
    }
    score[i] = env[i]! + (arg >= 0 && best > 0 ? best : 0);
    from[i] = arg >= 0 && best > 0 ? arg : -1;
  }
  let end = n - 1;
  for (let i = Math.max(0, n - Math.round(period)); i < n; i++) if (score[i]! > score[end]!) end = i;
  const frames: number[] = [];
  for (let i = end; i >= 0; i = from[i]!) frames.unshift(i);

  const at = (i: number) => Math.max(env[i - 1] ?? 0, env[i] ?? 0, env[i + 1] ?? 0);
  // Confidence: the share of beats that keep steady time. A track with no clear pulse gives beats that wander.
  const gaps = frames.slice(1).map((f, i) => f - frames[i]!);
  const steady = gaps.filter((g) => Math.abs(g - period) <= Math.max(2, period * 0.05)).length / (gaps.length || 1);
  // The bar's first beat: of the four possible phases, the one whose beats hit hardest.
  let phase = 0;
  let strongest = -Infinity;
  for (let p = 0; p < 4; p++) {
    let s = 0;
    let c = 0;
    for (let i = p; i < frames.length; i += 4, c++) s += at(frames[i]!);
    if (c && s / c > strongest) {
      strongest = s / c;
      phase = p;
    }
  }
  const beats = frames.map((f) => +(f * HOP).toFixed(3));
  return { bpm: +bpm.toFixed(2), beats, downbeats: beats.filter((_, i) => i % 4 === phase), confidence: +steady.toFixed(2) };
}
