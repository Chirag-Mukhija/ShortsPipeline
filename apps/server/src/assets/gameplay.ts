// Picks a background gameplay clip from the user's local library folder, if they have added any of their own.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { VIDEO_DEFAULTS } from "@clipforge/schema";
import { paths, relFromData } from "../config";
import { probeDurationMs } from "../media/ffmpeg";

const VIDEO = /\.(mp4|mov|webm|mkv)$/i;

export async function pickGameplay(seed: string): Promise<{ src: string; durationInFrames: number } | null> {
  if (!existsSync(paths.gameplay)) mkdirSync(paths.gameplay, { recursive: true });
  const clips = readdirSync(paths.gameplay).filter((file) => VIDEO.test(file)).sort();
  if (clips.length === 0) return null;
  const hash = [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const clip = clips[hash % clips.length];
  if (!clip) return null;
  const file = path.join(paths.gameplay, clip);
  // Decision: the clip's own duration becomes one Loop cycle in the video package, so it repeats cleanly
  // instead of freezing on its last frame once a scene runs longer than the source clip.
  const durationMs = await probeDurationMs(file);
  return { src: relFromData(file), durationInFrames: Math.max(1, Math.round((durationMs / 1000) * VIDEO_DEFAULTS.fps)) };
}
