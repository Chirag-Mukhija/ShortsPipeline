// Aligns a creator's recorded scene to its script narration using a local, offline Whisper model — no cloud call,
// no API key. The model and binary install once per machine and are cached, mirroring render/remotion.ts's bundle cache.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadWhisperModel, installWhisperCpp, transcribe, type TranscriptionJson } from "@remotion/install-whisper-cpp";
import { splitWords, type TimedWord } from "@clipforge/schema";
import { env, paths } from "../config";
import { probeDurationMs, transcodeToMp3, transcodeToWav } from "../media/ffmpeg";
import { applyCuts, detectSilences, planCuts, remapWords } from "../media/tighten";
import { execOrThrow } from "../lib/exec";
import { alignWords } from "./align";
import type { SpeechBoundary } from "./types";

// Decision: pinned to the exact whisper.cpp release Remotion's own docs use, independent of the npm package's
// own 4.0.529 version — the two follow different version schemes.
const WHISPER_CPP_VERSION = "1.5.5";
const SPECIAL_TOKEN = /^[[<].*[\]>]$/;

export type WhisperModel = typeof env.WHISPER_MODEL;

const installed = new Map<WhisperModel, Promise<void>>();
let binary: Promise<void> | null = null;

function ensureWhisper(model: WhisperModel): Promise<void> {
  // Decision: never pre-create `paths.whisper` — installWhisperCpp treats an already-existing target folder as
  // "already installed" and skips the real git-clone-and-build, which then fails with no binary present.
  binary ??= installWhisperCpp({ to: paths.whisper, version: WHISPER_CPP_VERSION }).then(() => undefined);
  const existing = installed.get(model);
  if (existing) return existing;
  const ready = binary
    .then(() => downloadWhisperModel({ model, folder: paths.whisper }))
    .then(() => undefined)
    .catch((error: unknown) => {
      installed.delete(model);
      binary = null;
      throw error;
    });
  installed.set(model, ready);
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

async function runWhisper(wavFile: string, model: WhisperModel = env.WHISPER_MODEL, prompt?: string): Promise<TranscriptionJson<true>> {
  await ensureWhisper(model);
  return transcribe({
    ...(prompt ? { additionalArgs: [["--prompt", prompt]] as [string, string][] } : {}),
    inputPath: wavFile,
    whisperPath: paths.whisper,
    whisperCppVersion: WHISPER_CPP_VERSION,
    model,
    modelFolder: paths.whisper,
    tokenLevelTimestamps: true,
    language: "en",
    printOutput: false,
  });
}

async function transcribeTokens(wavFile: string, model?: WhisperModel): Promise<SpeechBoundary[]> {
  return tokensToBoundaries((await runWhisper(wavFile, model)).transcription);
}

export type TranscriptSegment = { startMs: number; endMs: number; text: string };
export type Transcript = { text: string; segments: TranscriptSegment[]; words: SpeechBoundary[] };

const CAPTION_MAX_CHARS = 42;
const CAPTION_GAP_MS = 700;

// Decision: with token-level timestamps whisper.cpp returns one segment per token, so captions are rebuilt from the
// raw tokens (whose leading space marks a new word), breaking at sentence ends, pauses, or a readable line length.
export function toSegments(transcription: TranscriptionJson<true>["transcription"]): TranscriptSegment[] {
  const captions: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;
  for (const token of transcription.flatMap((segment) => segment.tokens)) {
    const text = token.text.trim();
    if (!text || SPECIAL_TOKEN.test(text)) continue;
    const startsWord = /^\s/.test(token.text);
    if (
      current &&
      startsWord &&
      (token.offsets.from - current.endMs > CAPTION_GAP_MS || current.text.length + 1 + text.length > CAPTION_MAX_CHARS || /[.!?]$/.test(current.text))
    ) {
      captions.push(current);
      current = null;
    }
    if (!current) current = { startMs: token.offsets.from, endMs: token.offsets.to, text };
    else {
      current.text += startsWord ? ` ${text}` : text;
      current.endMs = token.offsets.to;
    }
  }
  if (current) captions.push(current);
  return captions;
}

function srtTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(total % 1000, 3)}`;
}

export function toSrt(segments: TranscriptSegment[]): string {
  return segments.map((s, i) => `${i + 1}\n${srtTime(s.startMs)} --> ${srtTime(s.endMs)}\n${s.text}\n`).join("\n");
}

export async function transcribeRecording(input: string): Promise<Transcript> {
  const dir = mkdtempSync(path.join(tmpdir(), "clipforge-transcribe-"));
  const wav = path.join(dir, "audio.wav");
  try {
    await transcodeToWav(input, wav);
    const { transcription } = await runWhisper(wav);
    const segments = toSegments(transcription);
    return { text: segments.map((s) => s.text).join(" "), segments, words: tokensToBoundaries(transcription) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  return alignRecording(originalFile, outFile, narration, { pauseMaxMs: env.PAUSE_MAX_MS });
}

export type AlignOptions = { pauseMaxMs: number | null; model?: WhisperModel };
export type AlignedTake = AlignedRecording & { heard: string; anchored: number };

// Decision: one alignment path for every human recording. pauseMaxMs null keeps the take untouched (needed when the
// take has video, since cutting only the audio would put lips out of sync); otherwise long pauses are tightened.
export async function alignRecording(originalFile: string, outFile: string, narration: string, options: AlignOptions): Promise<AlignedTake> {
  await transcodeToMp3(originalFile, outFile);
  const wavForWhisper = `${outFile}.whisper.wav`;
  await transcodeToWav(originalFile, wavForWhisper);
  try {
    const boundaries = await transcribeTokens(wavForWhisper, options.model);
    const displayWords = splitWords(narration);
    const { speech, spans } = identitySpans(displayWords);
    const rawDurationMs = await probeDurationMs(outFile);
    let words = alignWords(displayWords, spans, speech, boundaries, rawDurationMs);
    const cuts = options.pauseMaxMs === null ? [] : planCuts(await detectSilences(outFile), rawDurationMs / 1000, options.pauseMaxMs / 1000);
    if (cuts.length > 0) {
      await applyCuts(outFile, cuts);
      words = remapWords(words, cuts);
    }
    const durationMs = cuts.length > 0 ? await probeDurationMs(outFile) : rawDurationMs;
    const speechEndMs = Math.min(durationMs, words.reduce((max, word) => Math.max(max, word.endMs), 0));
    const heard = boundaries.map((b) => b.text).join(" ").replace(/\s+([,.!?])/g, "$1");
    return { durationMs, speechEndMs, words, heard, anchored: anchoredShare(displayWords, boundaries) };
  } finally {
    rmSync(wavForWhisper, { force: true });
  }
}

const norm = (word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, "");

// Share of script words Whisper actually heard. A low share means timings are mostly interpolated between the words it did catch.
export function anchoredShare(displayWords: string[], boundaries: SpeechBoundary[]): number {
  const heard = new Set(boundaries.map((b) => norm(b.text)).filter(Boolean));
  const script = displayWords.map(norm).filter(Boolean);
  return script.length ? script.filter((word) => heard.has(word)).length / script.length : 0;
}

export type HeardWord = { text: string; start: number; end: number };

// Whisper's tokens regrouped into words (a leading space starts a new word), in seconds.
// Decision: timings come from the DTW timestamp (t_dtw), not the token offsets. Measured on a test take, the offsets
// drifted by up to a second, while t_dtw landed consistently ~0.12 s before each word's real end.
export function toWords(transcription: TranscriptionJson<true>["transcription"]): HeardWord[] {
  const LAG = 0.12;
  const words: HeardWord[] = [];
  let prev: { at: number; punct: boolean } | null = null;
  for (const token of transcription.flatMap((segment) => segment.tokens)) {
    const text = token.text.trim();
    if (!text || SPECIAL_TOKEN.test(text)) continue;
    const dtw = token.t_dtw >= 0 ? token.t_dtw / 100 : null;
    const punct = !/[a-z0-9]/i.test(text);
    const current = words.at(-1);
    if (!punct && (/^\s/.test(token.text) || !current)) {
      const end = dtw !== null ? dtw + LAG : token.offsets.to / 1000;
      const start = dtw === null ? token.offsets.from / 1000 : prev ? prev.at + (prev.punct ? 0 : LAG) : Math.max(0, dtw - 0.35);
      words.push({ text, start: Math.min(start, end - 0.06), end });
    } else if (current) {
      current.text += text;
      if (!punct) current.end = dtw !== null ? dtw + LAG : token.offsets.to / 1000;
    }
    if (dtw !== null) prev = { at: dtw, punct };
  }
  // Markers like [BLANK_AUDIO] arrive split over several tokens, so they're stripped from the joined words.
  return words
    .map((w, i) => ({ ...w, text: w.text.replace(/\[[^\]]*\]?/g, "").trim(), start: Math.max(0, i > 0 ? Math.max(w.start, words[i - 1]!.start + 0.02) : w.start) }))
    .filter((w) => /[a-z0-9]/i.test(w.text));
}

// Decision: no script prompt here. Measured on test takes, a prompt made small.en up to 5x slower (fallback decoding)
// and made it invent words; mis-heard names are matched to the script by sound instead (see similar()).
export async function transcribeWords(wav16k: string): Promise<HeardWord[]> {
  return toWords((await runWhisper(wav16k)).transcription);
}

// Fast plain-text pass for the live teleprompter: the small base.en model straight through the whisper.cpp binary,
// about 0.7 s for a few seconds of audio on an M2.
export async function quickText(wav16k: string, prompt: string): Promise<string> {
  await ensureWhisper("base.en");
  const { stdout } = await execOrThrow(path.join(paths.whisper, "main"), [
    "-m", path.join(paths.whisper, "ggml-base.en.bin"), "-f", wav16k, "-nt", "-np", "-l", "en", "--prompt", prompt.slice(0, 400),
  ]);
  return stdout.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}
