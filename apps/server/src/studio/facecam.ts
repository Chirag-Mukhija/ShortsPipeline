// Face cam for the record stage: turns a take's uploaded camera file into a steady 30 fps clip, finds its exact offset from the voice take by matching the two audio copies, and cuts the exported face cam with the same edits as the voice.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execOrThrow } from "../lib/exec";

export type CamInfo = { offset: number; width: number; height: number; synced: boolean };

const FPS = 30;
// Loudness envelope rate for syncing: 100 values a second, so the offset is found to 10 ms (a third of a frame).
const ENV_RATE = 100;
const MAX_LAG_SECONDS = 3;

async function probe(file: string, entries: string): Promise<string> {
  const { stdout } = await execOrThrow("ffprobe", ["-v", "error", ...entries.split(" "), "-of", "json", file]);
  return stdout;
}

function pcm16(file: string): { rate: number; samples: Int16Array } {
  const buf = readFileSync(file);
  // Find the "data" chunk instead of assuming a 44-byte header: ffmpeg writes a LIST chunk first.
  let at = 12;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "data") {
      const end = Math.min(buf.length, at + 8 + size);
      const data = buf.buffer.slice(buf.byteOffset + at + 8, buf.byteOffset + end - ((end - at - 8) % 2));
      return { rate: buf.readUInt32LE(24), samples: new Int16Array(data) };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error(`no audio data in ${path.basename(file)}`);
}

// RMS per 10 ms, then normalised (zero mean, unit spread) so loud and quiet copies of the same speech line up.
function envelope({ rate, samples }: { rate: number; samples: Int16Array }): Float32Array {
  const hop = Math.max(1, Math.round(rate / ENV_RATE));
  const n = Math.floor(samples.length / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) sum += samples[j]! * samples[j]!;
    env[i] = Math.sqrt(sum / hop);
  }
  let mean = 0;
  for (const v of env) mean += v;
  mean /= n || 1;
  let spread = 0;
  for (const v of env) spread += (v - mean) ** 2;
  spread = Math.sqrt(spread / (n || 1)) || 1;
  for (let i = 0; i < n; i++) env[i] = (env[i]! - mean) / spread;
  return env;
}

// The lag (in envelope steps) where the camera's audio best matches the voice take: camera index = voice index + lag.
export function bestLag(voice: Float32Array, cam: Float32Array, maxLag = MAX_LAG_SECONDS * ENV_RATE): { lag: number; score: number } {
  let best = { lag: 0, score: -Infinity };
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let sum = 0;
    let n = 0;
    const from = Math.max(0, -lag);
    const to = Math.min(voice.length, cam.length - lag);
    for (let i = from; i < to; i++) {
      sum += voice[i]! * cam[i + lag]!;
      n++;
    }
    if (n > ENV_RATE * 2 && sum / n > best.score) best = { lag, score: sum / n };
  }
  return best;
}

// Converts the uploaded camera file to a constant 30 fps H.264 clip and syncs it to the voice take. Returns null if there's no usable video.
export async function finishCamera(raw: string, voiceWav: string, out: string): Promise<CamInfo | null> {
  if (!existsSync(raw)) return null;
  const tmp = mkdtempSync(path.join(tmpdir(), "studio-cam-"));
  try {
    const streams = JSON.parse(await probe(raw, "-show_entries stream=codec_type,start_time")) as { streams: { codec_type: string; start_time?: string }[] };
    const video = streams.streams.find((s) => s.codec_type === "video");
    if (!video) return null;
    const audio = streams.streams.find((s) => s.codec_type === "audio");
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-map", "0:v:0", "-vf", `fps=${FPS},scale=-2:'min(1080,ih)'`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
    const dims = JSON.parse(await probe(out, "-select_streams v:0 -show_entries stream=width,height")) as { streams: { width: number; height: number }[] };
    const { width, height } = dims.streams[0]!;
    if (!audio) return { offset: 0, width, height, synced: false };
    const syncWav = path.join(tmp, "sync.wav");
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-map", "0:a:0", "-ac", "1", "-ar", "8000", "-c:a", "pcm_s16le", syncWav]);
    const { lag, score } = bestLag(envelope(pcm16(voiceWav)), envelope(pcm16(syncWav)));
    // Each converted stream starts at its own zero, so the gap between the raw streams' start times is added back.
    const gap = Number(audio.start_time ?? 0) - Number(video.start_time ?? 0);
    const synced = score > 0.3;
    return { offset: synced ? lag / ENV_RATE + gap : gap, width, height, synced };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export type CamPiece = { cam: string; offset: number; start: number; end: number };

// Cuts each kept piece of voice from its take's camera clip and joins them. Piece lengths are whole frames chosen from the running total, so picture and voice never drift apart, however many cuts there are.
export async function exportFacecam(pieces: CamPiece[], out: string): Promise<void> {
  const tmp = mkdtempSync(path.join(tmpdir(), "studio-facecam-"));
  try {
    let t = 0;
    const list: string[] = [];
    for (const [k, p] of pieces.entries()) {
      const startFrame = Math.round(t * FPS);
      t += p.end - p.start;
      const frames = Math.round(t * FPS) - startFrame;
      if (frames <= 0) continue;
      const file = path.join(tmp, `p${String(k).padStart(4, "0")}.mp4`);
      const from = Math.max(0, p.start + p.offset);
      // tpad repeats the last frame if a piece runs past the end of the camera clip (the camera stopped a moment before the mic).
      await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-ss", from.toFixed(4), "-i", p.cam, "-vf", `fps=${FPS},tpad=stop_mode=clone:stop_duration=2`, "-frames:v", String(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-an", file]);
      list.push(`file '${file}'`);
    }
    if (list.length === 0) throw new Error("no face cam pieces to join");
    const listFile = path.join(tmp, "list.txt");
    writeFileSync(listFile, list.join("\n"));
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", out]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
