// Picks a background track from the user's local music folder, if they have added any royalty-free files.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { env, paths, relFromData } from "../config";

const AUDIO = /\.(mp3|m4a|wav|aac|ogg)$/i;

export function pickMusic(seed: string): { src: string; volume: number } | null {
  if (!existsSync(paths.music)) mkdirSync(paths.music, { recursive: true });
  const tracks = readdirSync(paths.music).filter((file) => AUDIO.test(file)).sort();
  if (tracks.length === 0 || env.MUSIC_VOLUME === 0) return null;
  const hash = [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const track = tracks[hash % tracks.length];
  return track ? { src: relFromData(path.join(paths.music, track)), volume: env.MUSIC_VOLUME } : null;
}
