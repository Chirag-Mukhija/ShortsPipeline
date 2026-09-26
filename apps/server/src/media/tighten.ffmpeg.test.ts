// Integration test for jump-cut pacing against real ffmpeg: long pauses shrink and the MP3 re-encodes cleanly.
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { execOrThrow } from "../lib/exec";
import { probeDurationMs } from "./ffmpeg";
import { applyCuts, detectSilences, planCuts } from "./tighten";

const dir = mkdtempSync(path.join(os.tmpdir(), "clipforge-tighten-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("applyCuts", () => {
  it("shortens interior pauses in a 24 kHz mono MP3 without encoder errors", async () => {
    const file = path.join(dir, "speech.mp3");
    const tone = "0.5*sin(2*PI*440*t)";
    await execOrThrow("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `aevalsrc='if(lt(t,1.013)+between(t,2.071,3.337)+gt(t,4.419),${tone},0)':d=5.2:s=24000`,
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "96k",
      file,
    ]);
    const before = await probeDurationMs(file);
    const cuts = planCuts(await detectSilences(file), before / 1000, 0.3);
    expect(cuts).toHaveLength(2);
    await applyCuts(file, cuts);
    const after = await probeDurationMs(file);
    const removed = cuts.reduce((sum, cut) => sum + (cut.end - cut.start) * 1000, 0);
    expect(Math.abs(before - removed - after)).toBeLessThan(80);
  });

  it("re-encodes real Edge speech whose cut points once broke the MP3 encoder", async () => {
    const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "speech-with-pauses.mp3");
    const file = path.join(dir, "edge.mp3");
    copyFileSync(fixture, file);
    const before = await probeDurationMs(file);
    const cuts = planCuts(await detectSilences(file), before / 1000, 0.3);
    expect(cuts.length).toBeGreaterThan(0);
    await applyCuts(file, cuts);
    const after = await probeDurationMs(file);
    expect(after).toBeLessThan(before);
    const pauses = await detectSilences(file, -40, 0.25);
    const interior = pauses.filter((pause) => pause.start > 0.05 && pause.end < (after - 80) / 1000);
    expect(interior.map((pause) => pause.end - pause.start).every((length) => length < 0.4)).toBe(true);
  });
});
