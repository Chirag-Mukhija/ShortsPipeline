// The music signal every piece reads: spectrum at any song time (synthetic or real samples), bass, peak hold, energy curves and the visualizeAudio adapter.
import { random } from "remotion";
import { smoothSamples, synthSpectrum, useSong, type BeatClock, type Sampler, type Section } from "../../core/beat";
import { ENERGY } from "../../core/beat";
import { FPS } from "../../core/video";

export type { Sampler };

// Spectrum (bins low → high, 0..1) at song time t. Real samples win; otherwise the beat clock's synthetic spectrum.
export const spectrumAt = (clock: BeatClock, t: number, bins: number, samples?: Sampler, seed = 1, smooth = 2) =>
  samples ? smoothSamples(samples, Math.round(t * FPS), bins, smooth) : synthSpectrum(clock, t, bins, seed, smooth);

// The board's bass band (20–120 Hz) is the lowest ~8 % of a log spectrum; averaged, it drives the up-to-12 % scale.
export const bassOf = (spec: number[]) => {
  const n = Math.max(1, Math.round(spec.length * 0.08));
  let s = 0;
  for (let i = 0; i < n; i++) s += spec[i] ?? 0;
  return s / n;
};
export const highsOf = (spec: number[]) => {
  const a = Math.floor(spec.length * 0.6);
  let s = 0;
  for (let i = a; i < spec.length; i++) s += spec[i] ?? 0;
  return s / Math.max(1, spec.length - a);
};

// One hook for the common case: the current spectrum, its bass and the beat state.
export const useSignal = (bins: number, samples?: Sampler, seed = 1) => {
  const song = useSong();
  const spec = spectrumAt(song.clock, song.t, bins, samples, seed);
  return { ...song, spec, bass: bassOf(spec), highs: highsOf(spec) };
};

// Peak caps: the max of the last `hold` frames, falling linearly after it. Recomputed from the frame, no retained state.
export const peakHold = (clock: BeatClock, t: number, bins: number, samples?: Sampler, seed = 1, hold = 10, fall = 0.035) => {
  const out = new Array<number>(bins).fill(0);
  for (let k = 0; k <= hold; k += 2) {
    const s = spectrumAt(clock, t - k / FPS, bins, samples, seed, 1);
    for (let i = 0; i < bins; i++) out[i] = Math.max(out[i]!, s[i]! - k * fall * 0.5);
  }
  return out;
};

// A loudness curve with no audio file: section energies plus seeded beat-level variation, one value per `step` seconds.
// For a real track, extract RMS per frame offline (ffmpeg astats) to JSON and pass that array to EnergyEnvelope instead.
export const synthEnergyCurve = (sections: Section[], step = 0.25, seed = 3) => {
  const end = sections[sections.length - 1]?.end ?? 0;
  const n = Math.ceil(end / step);
  return Array.from({ length: n }, (_, i) => {
    const t = i * step;
    const s = sections.find((x) => t >= x.start && t < x.end) ?? sections[sections.length - 1]!;
    const e = s.energy ?? ENERGY[s.name];
    const wob = 0.75 + 0.25 * Math.sin(i * 0.9 + random(`ec${seed}`) * 6) * Math.sin(i * 0.23);
    return Math.min(1, e * wob * (0.85 + 0.3 * random(`ec${seed}-${i}`)));
  });
};
// Box-smoothing over ±k samples.
export const smoothCurve = (curve: number[], k: number) =>
  k <= 0 ? curve : curve.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let d = -k; d <= k; d++) {
      const v = curve[i + d];
      if (v !== undefined) {
        s += v;
        n++;
      }
    }
    return s / n;
  });

// visualizeAudio's shape, typed here so this theme needs no @remotion/media-utils dependency: pass the real function in.
export type VisualizeAudio<A> = (o: { audioData: A; frame: number; fps: number; numberOfSamples: number }) => number[];
// Real track → Sampler. visualizeAudio returns linear bins with the bass crowded into the first few, so they are
// re-read on a log scale and lifted with a soft gain curve to land in the same 0..1 range as the synthetic spectrum.
//   const audio = useAudioData(staticFile("track.mp3"));
//   <SpectrumBars samples={audio ? fromVisualizeAudio(visualizeAudio, audio) : undefined} />
export const fromVisualizeAudio = <A>(visualize: VisualizeAudio<A>, audioData: A, numberOfSamples = 256, gain = 4, fps = FPS): Sampler => (frame) => {
  const raw = visualize({ audioData, frame: Math.max(0, frame), fps, numberOfSamples });
  const n = raw.length;
  return Array.from({ length: 64 }, (_, i) => {
    const lo = Math.floor(Math.pow(n, i / 64));
    const hi = Math.max(lo + 1, Math.floor(Math.pow(n, (i + 1) / 64)));
    let m = 0;
    for (let j = lo; j < Math.min(hi, n); j++) m = Math.max(m, raw[j] ?? 0);
    return Math.min(1, Math.pow(m * gain, 0.6));
  });
};

// Seeded 0..1 stream for particle tables.
export const rnd = (seed: string | number, i: number, k = 0) => random(`ar-${seed}-${i}-${k}`);
