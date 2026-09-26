// ffmpeg and ffprobe helpers: durations, final loudness normalization and a procedurally generated, license-free SFX kit.
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { SfxName } from "@clipforge/schema";
import { execOrThrow } from "../lib/exec";

export async function probeDurationMs(file: string): Promise<number> {
  const { stdout } = await execOrThrow("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`Could not read duration of ${path.basename(file)}`);
  return Math.round(seconds * 1000);
}

export async function normalizeLoudness(input: string, output: string): Promise<void> {
  await execOrThrow(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      input,
      "-c:v",
      "copy",
      "-af",
      "loudnorm=I=-14:TP=-1.5:LRA=11",
      "-ar",
      "48000",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      output,
    ],
    { timeoutMs: 5 * 60_000 },
  );
}

const SFX_SOURCES: Record<SfxName, { source: string; filter: string }> = {
  whoosh: {
    source: "anoisesrc=d=0.55:c=pink:r=44100:a=0.6",
    filter: "highpass=f=450,lowpass=f=5200,afade=t=in:st=0:d=0.24,afade=t=out:st=0.24:d=0.31,volume=1.4",
  },
  pop: {
    source: "aevalsrc=0.8*sin(2*PI*(380+1700*exp(-28*t))*t)*exp(-20*t):d=0.2:s=44100",
    filter: "volume=1.0",
  },
  slam: {
    source: "aevalsrc=0.9*sin(2*PI*52*t)*exp(-5.5*t)+0.4*(2*random(0)-1)*exp(-24*t):d=0.8:s=44100",
    filter: "lowpass=f=1400,volume=1.3",
  },
  ding: {
    source:
      "aevalsrc=0.45*sin(2*PI*1318*t)*exp(-4.5*t)+0.25*sin(2*PI*1975*t)*exp(-6.5*t)+0.12*sin(2*PI*2637*t)*exp(-8*t):d=1.1:s=44100",
    filter: "volume=0.9",
  },
};

export async function ensureSfxLibrary(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  for (const [name, { source, filter }] of Object.entries(SFX_SOURCES)) {
    const file = path.join(dir, `${name}.wav`);
    if (existsSync(file)) continue;
    await execOrThrow("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      source,
      "-af",
      filter,
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      file,
    ]);
  }
}
