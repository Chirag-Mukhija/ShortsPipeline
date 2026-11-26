// Music for the Cut scripts: looks up a library track, finds its beats (cached beside the library), and renders a fade-shaped bed to a WAV.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { detectBeats, type BeatGrid } from "../../packages/schema/src/beats";
import { musicGainAt } from "../../packages/schema/src/mix";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const dir = path.join(root, "data/library/music");
export type Track = { id: string; title: string; artist: string; attribution: string; mood?: string[]; bpm?: number | null; duration?: number; file?: string; license?: string };

export function tracks(): Track[] {
  const file = path.join(dir, "tracks.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Track[]) : [];
}

export function trackFile(id: string): string | null {
  const t = tracks().find((x) => x.id === id);
  const file = t?.file ? path.join(dir, t.file) : null;
  return file && existsSync(file) ? file : null;
}

const pcm = (file: string, rate: number, channels: number, from = 0, seconds?: number, loop = false) =>
  execFileSync("ffmpeg", ["-v", "error", ...(loop ? ["-stream_loop", "-1"] : []), "-ss", String(from), "-i", file, ...(seconds ? ["-t", String(seconds)] : []), "-f", "s16le", "-ac", String(channels), "-ar", String(rate), "pipe:1"], { maxBuffer: 1 << 30 });

// Beats of the whole track, in track time. Analysed once; redone when the audio file changes.
export function beatsOf(id: string): BeatGrid | null {
  const file = trackFile(id);
  if (!file) return null;
  const cache = path.join(dir, "beats", `${id}.json`);
  const stamp = `${statSync(file).size}:3`;
  if (existsSync(cache)) {
    const saved = JSON.parse(readFileSync(cache, "utf8")) as BeatGrid & { stamp: string };
    if (saved.stamp === stamp) return saved;
  }
  const rate = 11025;
  const raw = pcm(file, rate, 1);
  const ints = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
  const samples = new Float32Array(ints.length);
  for (let i = 0; i < ints.length; i++) samples[i] = ints[i]! / 32768;
  const grid = detectBeats(samples, rate, tracks().find((t) => t.id === id)?.bpm);
  mkdirSync(path.dirname(cache), { recursive: true });
  writeFileSync(cache, JSON.stringify({ ...grid, stamp }));
  return grid;
}

// The track's beats as the video hears them: shifted by where in the track the video starts.
export function beatsInVideo(id: string, musicStart: number, duration: number): { beats: number[]; downbeats: number[]; bpm: number; confidence: number } | null {
  const grid = beatsOf(id);
  if (!grid) return null;
  const shift = (xs: number[]) => xs.map((b) => +(b - musicStart).toFixed(3)).filter((b) => b >= 0 && b <= duration);
  return { beats: shift(grid.beats), downbeats: shift(grid.downbeats), bpm: grid.bpm, confidence: grid.confidence };
}

export type Bed = { musicDb: number; musicStart: number; fadeIn: number; fadeOut: number };

// The whole soundtrack of a music-only video: the track from its start point, looped to length, with the volume and fades of the shared curve.
export function renderBed(id: string, duration: number, bed: Bed, out: string): void {
  const file = trackFile(id);
  if (!file) throw new Error(`Music track "${id}" isn't in the music library (add its file on the Library page).`);
  const rate = 48000;
  const raw = pcm(file, rate, 2, bed.musicStart, duration, true);
  const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
  const mix = { voiceDb: 0, duckDb: 0, musicOn: true, ...bed };
  const block = rate / 100;
  for (let i = 0; i < samples.length / 2; i += block) {
    const g = musicGainAt(i / rate, duration, mix, []);
    for (let j = i * 2; j < Math.min((i + block) * 2, samples.length); j++) samples[j] = Math.max(-32768, Math.min(32767, Math.round(samples[j]! * g)));
  }
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ar", String(rate), "-ac", "2", "-i", "pipe:0", out], { input: Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), maxBuffer: 1 << 30 });
}

// The gain that brings a file to YouTube's usual loudness. Library tracks are levelled to sit under a voice; alone they'd play quiet.
export function gainToLufs(file: string, target = -14): number {
  const { stderr } = spawnSync("ffmpeg", ["-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { maxBuffer: 1 << 28 });
  const all = [...String(stderr).matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  const lufs = Number(all.at(-1)?.[1]);
  return Number.isFinite(lufs) && lufs > -60 ? Math.max(-12, Math.min(16, target - lufs)) : 0;
}
