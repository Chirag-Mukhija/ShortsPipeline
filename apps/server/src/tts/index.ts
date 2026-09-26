// Builds the voice provider chain (Edge, then Azure, then macOS say) and turns one scene's narration into a timed audio file.
import { writeFileSync } from "node:fs";
import { splitWords, type TimedWord } from "@clipforge/schema";
import { env } from "../config";
import { probeDurationMs } from "../media/ffmpeg";
import { applyCuts, detectSilences, planCuts, remapWords } from "../media/tighten";
import { alignWords } from "./align";
import { AzureTts } from "./azure";
import { EdgeTts } from "./edge";
import { toSpeech } from "./lexicon";
import { SayTts } from "./say";
import type { TtsProvider } from "./types";

export function ttsChain(): TtsProvider[] {
  const edge = new EdgeTts(env.TTS_VOICE, env.TTS_RATE);
  const azure = env.AZURE_SPEECH_KEY
    ? new AzureTts(env.AZURE_SPEECH_KEY, env.AZURE_SPEECH_REGION, env.TTS_VOICE, env.TTS_RATE)
    : null;
  const say = process.platform === "darwin" ? new SayTts(env.SAY_VOICE, env.TTS_RATE) : null;
  const order: (TtsProvider | null)[] =
    env.TTS_PROVIDER === "azure" ? [azure, edge, say] : env.TTS_PROVIDER === "say" ? [say] : [edge, azure, say];
  return order.filter((provider): provider is TtsProvider => provider !== null);
}

export type SpokenScene = { durationMs: number; speechEndMs: number; words: TimedWord[] };

export async function speakScene(provider: TtsProvider, narration: string, outFile: string): Promise<SpokenScene> {
  const displayWords = splitWords(narration);
  const { speech, spans } = toSpeech(displayWords);
  const result = await provider.synthesize(speech);
  writeFileSync(outFile, result.audio);
  const rawDurationMs = await probeDurationMs(outFile);
  let words = alignWords(displayWords, spans, speech, result.boundaries, rawDurationMs);
  const cuts = planCuts(await detectSilences(outFile), rawDurationMs / 1000, env.PAUSE_MAX_MS / 1000);
  if (cuts.length > 0) {
    await applyCuts(outFile, cuts);
    words = remapWords(words, cuts);
  }
  const durationMs = cuts.length > 0 ? await probeDurationMs(outFile) : rawDurationMs;
  const lastEnd = words.reduce((max, word) => Math.max(max, word.endMs), 0);
  return { durationMs, speechEndMs: Math.min(durationMs, lastEnd), words };
}
