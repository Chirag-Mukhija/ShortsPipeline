// Jump-cut pacing: shortens long pauses inside a voice clip and remaps word timings onto the tightened audio.
import { renameSync } from "node:fs";
import type { TimedWord } from "@clipforge/schema";
import { exec, execOrThrow } from "../lib/exec";

export type Interval = { start: number; end: number };

export async function detectSilences(file: string, noiseDb = -40, minSeconds = 0.2): Promise<Interval[]> {
  const { stderr } = await exec("ffmpeg", [
    "-hide_banner",
    "-i",
    file,
    "-af",
    `silencedetect=noise=${noiseDb}dB:d=${minSeconds}`,
    "-f",
    "null",
    "-",
  ]);
  const silences: Interval[] = [];
  let open: number | null = null;
  for (const line of stderr.split("\n")) {
    const start = line.match(/silence_start: ([\d.]+)/);
    const end = line.match(/silence_end: ([\d.]+)/);
    if (start?.[1]) open = Number.parseFloat(start[1]);
    if (end?.[1] && open !== null) {
      silences.push({ start: open, end: Number.parseFloat(end[1]) });
      open = null;
    }
  }
  return silences;
}

export function planCuts(silences: Interval[], durationSeconds: number, maxGapSeconds: number): Interval[] {
  return silences
    .filter((s) => s.start > 0.05 && s.end < durationSeconds - 0.05 && s.end - s.start > maxGapSeconds)
    .map((s) => ({ start: s.start + maxGapSeconds / 2, end: s.end - maxGapSeconds / 2 }));
}

export function remapMs(ms: number, cuts: Interval[]): number {
  let removed = 0;
  for (const cut of cuts) {
    const start = cut.start * 1000;
    const end = cut.end * 1000;
    if (ms >= end) removed += end - start;
    else if (ms > start) return Math.round(start - removed);
  }
  return Math.round(ms - removed);
}

export function remapWords(words: TimedWord[], cuts: Interval[]): TimedWord[] {
  return words.map((word) => ({ text: word.text, startMs: remapMs(word.startMs, cuts), endMs: remapMs(word.endMs, cuts) }));
}

export async function applyCuts(file: string, cuts: Interval[]): Promise<void> {
  if (cuts.length === 0) return;
  const keeps: Interval[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    keeps.push({ start: cursor, end: cut.start });
    cursor = cut.end;
  }
  const segments = keeps.map((keep, i) => `[0:a]atrim=start=${keep.start}:end=${keep.end},asetpts=PTS-STARTPTS[k${i}]`);
  segments.push(`[0:a]atrim=start=${cursor},asetpts=PTS-STARTPTS[k${keeps.length}]`);
  const labels = Array.from({ length: keeps.length + 1 }, (_, i) => `[k${i}]`).join("");
  // Decision: re-chunk into fresh frames after concat; trimmed frames can lack the buffer padding libmp3lame requires.
  const graph = `${segments.join(";")};${labels}concat=n=${keeps.length + 1}:v=0:a=1,asetnsamples=n=1152:p=0[out]`;
  const temporary = `${file}.tight.mp3`;
  await execOrThrow("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    file,
    "-filter_complex",
    graph,
    "-map",
    "[out]",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    temporary,
  ]);
  renameSync(temporary, file);
}
