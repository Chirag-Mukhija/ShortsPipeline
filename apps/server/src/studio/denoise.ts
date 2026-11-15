// Background-noise cleanup for recorded takes: DeepFilterNet (a small speech model that runs on the Mac's CPU) when it's installed, ffmpeg's built-in FFT denoiser otherwise.
import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Cleanup, CleanupEngine } from "@clipforge/schema";
import { paths } from "../config";
import { execOrThrow } from "../lib/exec";

export type Level = Exclude<Cleanup, "off">;

export const cleanupEngine = (): CleanupEngine => (existsSync(paths.deepFilter) ? "deepfilternet" : "ffmpeg");

// Decision: an attenuation limit mixes a little of the room back in, so "gentle" never sounds underwater; "strong" takes out nearly everything.
const LIMIT_DB: Record<Level, number> = { gentle: 18, strong: 40 };
// Tuned on real takes from this room: gentle lowers the pauses about 4 dB, strong about 10 dB (the soft gate does most of that), speech untouched.
const FFMPEG: Record<Level, string> = {
  gentle: "highpass=f=80,afftdn=nr=12:nf=-50:tn=1",
  strong: "highpass=f=80,afftdn=nr=24:nf=-45:tn=1,agate=threshold=0.008:ratio=2:range=0.3:attack=10:release=250:knee=4",
};

// Writes a cleaned copy of a take with the same rate, format and exact length, so every word timing still lines up.
export async function cleanWav(src: string, dst: string, level: Level, engine: CleanupEngine, rate: number, duration: number): Promise<void> {
  const tmp = mkdtempSync(path.join(tmpdir(), "studio-clean-"));
  const part = `${dst}.part`;
  try {
    let input = src;
    let filter = `apad=whole_dur=${duration.toFixed(4)},atrim=end=${duration.toFixed(4)}`;
    if (engine === "deepfilternet") {
      // -D removes the model's lookahead delay, so the cleaned audio starts exactly where the original does.
      await execOrThrow(paths.deepFilter, ["-D", "-a", String(LIMIT_DB[level]), "-o", tmp, src], { timeoutMs: 10 * 60_000 });
      input = path.join(tmp, path.basename(src));
    } else {
      filter = `${FFMPEG[level]},${filter}`;
    }
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-af", filter, "-ac", "1", "-ar", String(rate), "-c:a", "pcm_s16le", "-f", "wav", part]);
    renameSync(part, dst);
  } finally {
    rmSync(part, { force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}
