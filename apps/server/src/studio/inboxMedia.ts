// Makes video and audio the creator attaches readable for agents: a frame sheet (<file>.frames.jpg) and a local-Whisper transcript (<file>.transcript.txt) beside the original.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { execOrThrow } from "../lib/exec";
import { transcribeRecording } from "../tts/whisperAlign";

const VIDEO = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const AUDIO = new Set([".m4a", ".mp3", ".wav", ".aac", ".ogg"]);

// Runs in the background after an upload; agents look for the derived files, so a failure only means they are missing.
export async function deriveInboxMedia(inboxDir: string, file: string): Promise<void> {
  const ext = path.extname(file).toLowerCase();
  if (!VIDEO.has(ext) && !AUDIO.has(ext)) return;
  const source = path.join(inboxDir, file);
  if (VIDEO.has(ext)) {
    const probe = await execOrThrow("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source]);
    const seconds = Math.max(1, Number(probe.stdout.trim()) || 1);
    // 16 evenly spaced frames in a 4×4 sheet: enough to follow a reel or a screen recording at a glance.
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-vf", `fps=16/${seconds.toFixed(2)},scale=360:-2,tile=4x4:padding=4:color=black`, "-frames:v", "1", "-q:v", "4", `${source}.frames.jpg`]);
  }
  const transcript = await transcribeRecording(source);
  if (transcript.text.trim()) writeFileSync(`${source}.transcript.txt`, `${transcript.text.trim()}\n`);
}
