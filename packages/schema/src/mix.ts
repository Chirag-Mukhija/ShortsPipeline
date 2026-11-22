// The music-bed volume curve, shared by the Edit page's live player and the final export, so what the creator hears while editing is exactly what gets exported.
// Plain TypeScript with no imports, so Node can load it straight from the export script.

export type MixLevels = { voiceDb: number; musicDb: number; duckDb: number; musicOn: boolean; musicStart: number; fadeIn: number; fadeOut: number };
export type SpeechSpan = [start: number, end: number];

export const dbToGain = (db: number): number => Math.pow(10, db / 20);

// Turns narration words into speaking spans; pauses shorter than `bridge` seconds count as still speaking, so the music doesn't pump between words.
export function speechSpans(words: { start: number; end: number }[], bridge = 0.45): SpeechSpan[] {
  const spans: SpeechSpan[] = [];
  for (const w of [...words].sort((a, b) => a.start - b.start)) {
    const last = spans[spans.length - 1];
    if (last && w.start - last[1] <= bridge) last[1] = Math.max(last[1], w.end);
    else spans.push([w.start, w.end]);
  }
  return spans;
}

// Speaking spans from the narration's loudness peaks (10 per second, 0–1), the waveform the Edit page already has. Better than word timings, whose end times run on through pauses.
export function speechSpansFromPeaks(peaks: number[], perSecond = 10, threshold = 0.06, bridge = 0.35): SpeechSpan[] {
  const spans: SpeechSpan[] = [];
  peaks.forEach((v, i) => {
    if (v < threshold) return;
    const a = i / perSecond;
    const b = (i + 1) / perSecond;
    const last = spans[spans.length - 1];
    if (last && a - last[1] <= bridge) last[1] = b;
    else spans.push([a, b]);
  });
  return spans;
}

// How far into a dip the music is at time t: 1 while speaking, easing in just before speech (attack) and out after it (release).
export function duckAmount(spans: SpeechSpan[], t: number, attack = 0.12, release = 0.5): number {
  let amount = 0;
  for (const [a, b] of spans) {
    if (a - attack > t) break;
    if (t >= a && t <= b) return 1;
    if (t < a) amount = Math.max(amount, 1 - (a - t) / attack);
    else if (t - b < release) amount = Math.max(amount, 1 - (t - b) / release);
  }
  return amount;
}

// Linear gain for the music bed at video time t (fades, volume and the dip under the voice).
export function musicGainAt(t: number, duration: number, mix: MixLevels, spans: SpeechSpan[]): number {
  if (!mix.musicOn) return 0;
  const fadeIn = mix.fadeIn > 0 ? Math.min(1, t / mix.fadeIn) : 1;
  const fadeOut = mix.fadeOut > 0 ? Math.min(1, Math.max(0, (duration - t) / mix.fadeOut)) : 1;
  const dip = 1 - duckAmount(spans, t) * (1 - dbToGain(-mix.duckDb));
  return dbToGain(mix.musicDb) * fadeIn * fadeOut * dip;
}
