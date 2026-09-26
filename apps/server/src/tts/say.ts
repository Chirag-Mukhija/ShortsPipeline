// Offline fallback using macOS `say` with an Indian English voice; word timings are estimated from the audio length.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateWordTimings } from "@clipforge/schema";
import { execOrThrow } from "../lib/exec";
import { probeDurationMs } from "../media/ffmpeg";
import type { SpeechResult, TtsProvider } from "./types";

function wordsPerMinute(rate: string): number {
  const percent = Number.parseFloat(rate.replace("%", ""));
  return Math.round(180 * (1 + (Number.isFinite(percent) ? percent : 0) / 100));
}

export class SayTts implements TtsProvider {
  readonly id = "say";

  constructor(
    readonly voice: string,
    private readonly rate: string,
  ) {}

  async synthesize(text: string): Promise<SpeechResult> {
    const dir = mkdtempSync(path.join(os.tmpdir(), "clipforge-say-"));
    try {
      const input = path.join(dir, "speech.txt");
      const aiff = path.join(dir, "speech.aiff");
      const mp3 = path.join(dir, "speech.mp3");
      writeFileSync(input, text);
      await execOrThrow("say", ["-v", this.voice, "-r", String(wordsPerMinute(this.rate)), "-o", aiff, "-f", input]);
      await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "24000", "-ac", "1", "-b:a", "96k", mp3]);
      const durationMs = await probeDurationMs(mp3);
      const boundaries = estimateWordTimings(text, durationMs, 40, 80);
      return { audio: readFileSync(mp3), boundaries };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
