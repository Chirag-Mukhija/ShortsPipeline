// Aligns a creator's recorded scene to its script narration using a local, offline Whisper model — no cloud call,
// no API key. The model and binary install once per machine and are cached, mirroring render/remotion.ts's bundle cache.
import { rmSync } from "node:fs";
import { downloadWhisperModel, installWhisperCpp, transcribe, type TranscriptionJson } from "@remotion/install-whisper-cpp";
import { splitWords, type TimedWord } from "@clipforge/schema";
import { env, paths } from "../config";
import { probeDurationMs, transcodeToMp3, transcodeToWav } from "../media/ffmpeg";
import { applyCuts, detectSilences, planCuts, remapWords } from "../media/tighten";
import { alignWords } from "./align";
import type { SpeechBoundary } from "./types";

// Decision: pinned to the exact whisper.cpp release Remotion's own docs use, independent of the npm package's
// own 4.0.529 version — the two follow different version schemes.
const WHISPER_CPP_VERSION = "1.5.5";
const SPECIAL_TOKEN = /^[[<].*[\]>]$/;

let ready: Promise<void> | null = null;

function ensureWhisper(): Promise<void> {
  // Decision: never pre-create `paths.whisper` — installWhisperCpp treats an already-existing target folder as
  // "already installed" and skips the real git-clone-and-build, which then fails with no binary present.
  ready ??= (async () => {
    await installWhisperCpp({ to: paths.whisper, version: WHISPER_CPP_VERSION });
    await downloadWhisperModel({ model: env.WHISPER_MODEL, folder: paths.whisper });
  })().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

// Decision: whisper.cpp's word tokens include leading-space and special/non-speech markers (e.g. "[_BEG_]");
// pulled out as a pure function so the filtering rules are unit-testable without invoking the real binary.
export function tokensToBoundaries(transcription: TranscriptionJson<true>["transcription"]): SpeechBoundary[] {
  const boundaries: SpeechBoundary[] = [];
  for (const segment of transcription) {
    for (const token of segment.tokens) {
      const text = token.text.trim();
      if (!text || SPECIAL_TOKEN.test(text)) continue;
      boundaries.push({ text, startMs: token.offsets.from, endMs: token.offsets.to });
    }
  }
  return boundaries;
}

async function transcribeTokens(wavFile: string): Promise<SpeechBoundary[]> {
  await ensureWhisper();
  const result = await transcribe({
    inputPath: wavFile,
    whisperPath: paths.whisper,
    whisperCppVersion: WHISPER_CPP_VERSION,
    model: env.WHISPER_MODEL,
    modelFolder: paths.whisper,
    tokenLevelTimestamps: true,
    language: "en",
  });
  return tokensToBoundaries(result.transcription);
}

// Decision: unlike toSpeech() (tts/lexicon.ts), a real recording is matched against the narration verbatim —
// pronunciation expansion ("macOS" -> "mac O S") is a TTS-only concept and would only hurt alignment here.
export function identitySpans(displayWords: string[]): { speech: string; spans: { start: number; end: number }[] } {
  let speech = "";
  const spans: { start: number; end: number }[] = [];
  displayWords.forEach((word, i) => {
    if (i > 0) speech += " ";
    spans.push({ start: speech.length, end: speech.length + word.length });
    speech += word;
  });
  return { speech, spans };
}

export type AlignedRecording = { durationMs: number; speechEndMs: number; words: TimedWord[] };

export async function alignRecordedScene(originalFile: string, outFile: string, narration: string): Promise<AlignedRecording> {
  await transcodeToMp3(originalFile, outFile);
  const wavForWhisper = `${outFile}.whisper.wav`;
  await transcodeToWav(originalFile, wavForWhisper);
  try {
    const boundaries = await transcribeTokens(wavForWhisper);
    const displayWords = splitWords(narration);
    const { speech, spans } = identitySpans(displayWords);
    const rawDurationMs = await probeDurationMs(outFile);
    let words = alignWords(displayWords, spans, speech, boundaries, rawDurationMs);
    const cuts = planCuts(await detectSilences(outFile), rawDurationMs / 1000, env.PAUSE_MAX_MS / 1000);
    if (cuts.length > 0) {
      await applyCuts(outFile, cuts);
      words = remapWords(words, cuts);
    }
    const durationMs = cuts.length > 0 ? await probeDurationMs(outFile) : rawDurationMs;
    const speechEndMs = Math.min(durationMs, words.reduce((max, word) => Math.max(max, word.endMs), 0));
    return { durationMs, speechEndMs, words };
  } finally {
    rmSync(wavForWhisper, { force: true });
  }
}
