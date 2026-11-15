// The creator's voice profile on the website: how fresh it is, a practice topic to talk about, and saving + transcribing practice recordings for the voice-profile skill.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { VoiceStatus } from "@clipforge/schema";
import { transcribeRecording } from "../tts/whisperAlign";

// Decision: overridable so tests never touch the creator's real ~/.claude/youtube.
export const voiceDir = () => (process.env.STUDIO_VOICE_DIR ? path.resolve(process.env.STUDIO_VOICE_DIR) : path.join(homedir(), ".claude", "youtube"));
const samplesDir = () => path.join(voiceDir(), "samples");

const STALE_DAYS = 14;

// Generic on purpose: the point is how the creator talks, not what about, so topics they can ramble on without preparing.
export const PRACTICE_TOPICS = [
  "The last thing you built, and the moment it broke",
  "A tool you use every day, and the one thing you'd change about it",
  "Explain to a friend how a message reaches their phone",
  "Something everyone online says about AI that you think is wrong",
  "Your college day yesterday, start to finish",
  "A video or creator you love, and exactly why it works on you",
  "The worst bug or mistake you've made, and what it taught you",
  "Explain what an AI agent is to your parents",
  "A product you bought that disappointed you",
  "What you'd build if you had one free month",
  "How you learn something new from zero",
  "Something you changed your mind about this year",
];

export function topicFor(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return PRACTICE_TOPICS[day % PRACTICE_TOPICS.length] ?? PRACTICE_TOPICS[0]!;
}

export function voiceStatus(now = new Date()): VoiceStatus {
  const profile = path.join(voiceDir(), "voice.md");
  const exists = existsSync(profile);
  const updatedAt = exists ? statSync(profile).mtime : null;
  const samples = existsSync(samplesDir())
    ? readdirSync(samplesDir())
        .filter((name) => name.endsWith(".txt"))
        .map((name) => statSync(path.join(samplesDir(), name)).mtime)
    : [];
  const newSamples = samples.filter((mtime) => !updatedAt || mtime > updatedAt).length;
  const ageDays = updatedAt ? Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000) : null;
  return {
    exists,
    updatedAt: updatedAt?.toISOString() ?? null,
    samples: samples.length,
    newSamples,
    due: !exists || newSamples > 0 || (ageDays !== null && ageDays >= STALE_DAYS),
    topic: topicFor(now),
  };
}

export async function saveSample(bytes: Buffer, originalName: string, topic: string): Promise<{ file: string; text: string }> {
  mkdirSync(samplesDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".webm";
  const audio = path.join(samplesDir(), `${stamp}${ext}`);
  writeFileSync(audio, bytes);
  const transcript = await transcribeRecording(audio);
  const text = `Topic: ${topic}\nRecorded: ${new Date().toISOString()}\n\n${transcript.text}\n`;
  writeFileSync(path.join(samplesDir(), `${stamp}.txt`), text);
  return { file: path.basename(audio), text: transcript.text };
}
