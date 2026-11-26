// Tests the beat finder on synthetic tracks: a click track at a known tempo and phase (with and without a hint), and noise that has no beat.
import { detectBeats } from "@clipforge/schema";
import { describe, expect, it } from "vitest";

const RATE = 11025;
// Deterministic noise, so the test never flickers.
function noise(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
}
function clicks(bpm: number, offset: number, seconds: number): Float32Array {
  const out = new Float32Array(RATE * seconds);
  const rnd = noise(7);
  for (let i = 0; i < out.length; i++) out[i] = rnd() * 0.01;
  for (let k = 0, t = offset; t < seconds - 0.1; k++, t = offset + (k * 60) / bpm) {
    const loud = k % 4 === 0 ? 0.9 : 0.5;
    for (let i = 0; i < RATE * 0.08; i++) out[Math.round(t * RATE) + i]! += loud * Math.exp(-i / (RATE * 0.02)) * Math.sin((2 * Math.PI * 90 * i) / RATE);
  }
  return out;
}

describe("detectBeats", () => {
  for (const [bpm, offset, hint] of [[120, 0.3, 120], [97, 0.21, undefined], [128, 0.5, 127]] as const) {
    it(`finds ${bpm} bpm${hint ? ` from a hint of ${hint}` : " on its own"}`, () => {
      const grid = detectBeats(clicks(bpm, offset, 30), RATE, hint);
      expect(Math.abs(grid.bpm - bpm)).toBeLessThan(1);
      const inner = grid.beats.filter((b) => b > 2 && b < 28);
      for (const b of inner) {
        const k = (b - offset) / (60 / bpm);
        expect(Math.abs(k - Math.round(k)) * (60 / bpm)).toBeLessThan(0.04);
      }
      expect(inner.length).toBeGreaterThan((26 * bpm) / 60 - 3);
      expect(grid.confidence).toBeGreaterThan(0.9);
      // The loud click of each bar is the downbeat.
      for (const d of grid.downbeats.filter((x) => x > 2 && x < 28)) expect(Math.round((d - offset) / (60 / bpm)) % 4).toBe(0);
    });
  }

  it("says so when there's no steady beat", () => {
    const rnd = noise(3);
    const grid = detectBeats(Float32Array.from({ length: RATE * 20 }, () => rnd() * 0.3), RATE);
    expect(grid.confidence).toBeLessThan(0.8);
    expect(detectBeats(new Float32Array(100), RATE).beats).toEqual([]);
  });
});
