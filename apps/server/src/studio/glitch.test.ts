// Tests mic-glitch detection (clicks and dropouts in a take) and that noise cleanup keeps a take's exact length and rate.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ClickDetector, findClicks, glitchSpans } from "@clipforge/schema";
import { cleanWav } from "./denoise";
import { wavHeader } from "./record";

const RATE = 44100;

// A voice-ish signal: a few harmonics with a slow loudness swell, plus a little noise.
function voice(seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
    out[i] = swell * (0.25 * Math.sin(2 * Math.PI * 180 * t) + 0.12 * Math.sin(2 * Math.PI * 360 * t) + 0.05 * Math.sin(2 * Math.PI * 900 * t)) + (Math.random() - 0.5) * 0.01;
  }
  return out;
}

// What a glitching USB mic does: the signal drops to nothing for a few milliseconds, then snaps back.
function dropouts(samples: Float32Array, from: number, to: number, every: number): Float32Array {
  const out = samples.slice();
  for (let t = from; t < to; t += every) {
    const at = Math.round(t * RATE);
    out.fill(0, at, at + 120);
  }
  return out;
}

describe("mic glitches", () => {
  it("finds nothing in clean speech", () => {
    const clean = voice(6);
    expect(findClicks(clean, RATE).length).toBeLessThanOrEqual(1);
    expect(glitchSpans(findClicks(clean, RATE), 6)).toEqual([]);
  });

  it("marks the stretch where the mic kept dropping out", () => {
    const bad = dropouts(voice(6), 2, 3.5, 0.13);
    const spans = glitchSpans(findClicks(bad, RATE), 6);
    expect(spans).toHaveLength(1);
    expect(spans[0]![0]).toBeGreaterThan(1.6);
    expect(spans[0]![0]).toBeLessThan(2.2);
    expect(spans[0]![1]).toBeGreaterThan(3.3);
    expect(spans[0]![1]).toBeLessThan(3.8);
  });

  it("ignores one stray click", () => {
    expect(glitchSpans([1.2], 6)).toEqual([]);
    expect(glitchSpans([1.2, 4, 5.5], 6)).toEqual([]);
    expect(glitchSpans([1.2, 1.5, 1.9, 5], 6)).toEqual([[1.05, 2.05]]);
  });

  it("finds the same clicks streamed in small chunks as in one go", () => {
    const bad = dropouts(voice(3), 0.5, 2, 0.2);
    const detector = new ClickDetector();
    const streamed: number[] = [];
    for (let i = 0; i < bad.length; i += 128) streamed.push(...detector.push(bad.subarray(i, i + 128)));
    expect(streamed.map((at) => at / RATE)).toEqual(findClicks(bad, RATE));
  });
});

describe("noise cleanup", () => {
  it("keeps the take's rate and exact length with ffmpeg's denoiser", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "clean-test-"));
    try {
      const samples = voice(2.5);
      const pcm = Buffer.alloc(samples.length * 2);
      samples.forEach((v, i) => pcm.writeInt16LE(Math.round(v * 32767), i * 2));
      const src = path.join(dir, "take.wav");
      const dst = path.join(dir, "take.clean.wav");
      writeFileSync(src, Buffer.concat([wavHeader(pcm.length, RATE), pcm]));
      await cleanWav(src, dst, "strong", "ffmpeg", RATE, samples.length / RATE);
      const out = readFileSync(dst);
      expect(out.toString("ascii", 0, 4)).toBe("RIFF");
      expect(out.readUInt32LE(24)).toBe(RATE);
      const data = out.indexOf("data");
      const frames = out.readUInt32LE(data + 4) / 2;
      expect(Math.abs(frames - samples.length)).toBeLessThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
