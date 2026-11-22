// The record stage on disk (videos/NNN/record/): takes streamed in from the browser, their transcripts matched to the script, mic glitches, cut edits, noise-cleaned copies, the live teleprompter listener and the exported narration.
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  alignHeard,
  buildTimeline,
  coverage,
  envelope,
  findClicks,
  glitchSpans,
  keptRange,
  markRedone,
  placeWords,
  normWord,
  parseRecordScript,
  refineSegments,
  splitSpoken,
  suggestCuts,
  takeGainDb,
  trackReader,
  type Cleanup,
  type CutReason,
  type RecordScript,
  type RecordState,
  type Take,
  type TakeWord,
  type UnfinishedTake,
} from "@clipforge/schema";
import { execOrThrow } from "../lib/exec";
import { StepError } from "../pipeline/errors";
import { quickText, toSrt, transcribeWords, type TranscriptSegment } from "../tts/whisperAlign";
import { cleanWav, cleanupEngine, type Level } from "./denoise";
import { exportFacecam, finishCamera } from "./facecam";
import { appendToSection, parseStatus, setStageState, updateStatus, videoDir } from "./videos";

const bad = (message: string) => new StepError(message, false);
const TAKE_ID = /^take-\d{8}T\d{6}(-\d+)?$/;
const today = () => new Date().toISOString().slice(0, 10);

const recordDir = (id: string) => path.join(videoDir(id), "record");
function takesDir(id: string): string {
  const dir = path.join(recordDir(id), "takes");
  mkdirSync(dir, { recursive: true });
  return dir;
}
function takeFile(id: string, take: string, ext: string): string {
  if (!TAKE_ID.test(take)) throw bad(`Not a take: ${take}`);
  return path.join(takesDir(id), `${take}${ext}`);
}

export function readScript(id: string): RecordScript {
  const file = path.join(videoDir(id), "script.md");
  if (parseStatus(readFileSync(path.join(videoDir(id), "status.md"), "utf8")).audio === "music") {
    throw bad("This video is music only, so there's no voice-over to record. Its cue sheet drives the edit instead.");
  }
  if (!existsSync(file)) throw bad("This video has no script yet");
  const script = parseRecordScript(readFileSync(file, "utf8"));
  if (script.words.length === 0) throw bad("script.md has no spoken lines under '## Beat n: …' headings");
  return script;
}

const scriptText = (script: RecordScript, from: number, count: number) =>
  script.words.slice(Math.max(0, from), Math.max(0, from) + count).map((w) => w.text).join(" ");

export function wavHeader(dataBytes: number, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(dataBytes, 40);
  return h;
}

// Our own takes are always 16-bit mono with a 44-byte header, written by wavHeader.
function readWav(file: string): { rate: number; samples: Int16Array } {
  const buf = readFileSync(file);
  const data = buf.buffer.slice(buf.byteOffset + 44, buf.byteOffset + buf.length - ((buf.length - 44) % 2));
  return { rate: buf.readUInt32LE(24), samples: new Int16Array(data) };
}

type Part = { rate: number; from: number; createdAt: string };

export function startTake(id: string, rate: number, from: number): string {
  if (!Number.isInteger(rate) || rate < 8000 || rate > 192000) throw bad("Unsupported sample rate");
  const script = readScript(id);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "");
  let take = `take-${stamp}`;
  for (let n = 2; existsSync(takeFile(id, take, ".part.json")) || existsSync(takeFile(id, take, ".json")); n++) take = `take-${stamp}-${n}`;
  const part: Part = { rate, from: Math.max(0, Math.min(Math.round(from), script.words.length - 1)), createdAt: new Date().toISOString() };
  writeFileSync(takeFile(id, take, ".part.json"), JSON.stringify(part));
  writeFileSync(takeFile(id, take, ".pcm"), Buffer.alloc(0));
  return take;
}

export function appendChunk(id: string, take: string, bytes: Buffer): void {
  const pcm = takeFile(id, take, ".pcm");
  if (!existsSync(pcm)) throw bad("That take isn't recording");
  appendFileSync(pcm, bytes.subarray(0, bytes.length - (bytes.length % 2)));
}

// Face cam arrives as pieces of one MediaRecorder file while the take records; appended in order they form the whole file.
export function appendVideoChunk(id: string, take: string, bytes: Buffer): void {
  if (!existsSync(takeFile(id, take, ".part.json"))) throw bad("That take isn't recording");
  appendFileSync(takeFile(id, take, ".cam.raw"), bytes);
}

// Converts and syncs a take's face cam. A camera problem never costs the voice take: it's logged and the take stays voice-only.
async function attachCamera(id: string, take: string): Promise<void> {
  const raw = takeFile(id, take, ".cam.raw");
  if (!existsSync(raw)) return;
  try {
    const info = await finishCamera(raw, takeFile(id, take, ".wav"), takeFile(id, take, ".cam.mp4"));
    const file = takeFile(id, take, ".json");
    if (info && existsSync(file)) writeTake(id, { ...readTake(file), video: info });
    rmSync(raw, { force: true });
  } catch (error) {
    console.error(`face cam for ${take} couldn't be processed; the raw file is kept`, error);
  }
}

function readTake(file: string): Take {
  return JSON.parse(readFileSync(file, "utf8")) as Take;
}

function writeTake(id: string, take: Take): void {
  writeFileSync(takeFile(id, take.id, ".json"), JSON.stringify(take));
}

function listTakes(id: string): Take[] {
  return readdirSync(takesDir(id))
    .filter((name) => name.endsWith(".json") && !name.endsWith(".part.json"))
    .map((name) => readTake(path.join(takesDir(id), name)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Decision: if the creator edits script.md after recording, takes are re-matched to the new script; their cuts are kept.
function realign(take: Take, script: RecordScript): Take {
  if (take.scriptHash === script.hash) return take;
  const norms = script.words.map((w) => w.norm);
  const map = alignHeard(take.words.map((w) => w.norm), norms, Math.min(take.from, norms.length - 1));
  const words = take.words.map((w, i) => ({ ...w, idx: map[i] ?? null, text: map[i] != null ? script.words[map[i]!]!.text : w.text }));
  return { ...take, from: Math.min(take.from, norms.length - 1), scriptHash: script.hash, words };
}

export async function finishTake(id: string, take: string): Promise<RecordState> {
  const partFile = takeFile(id, take, ".part.json");
  const pcmFile = takeFile(id, take, ".pcm");
  if (!existsSync(partFile) || !existsSync(pcmFile)) throw bad("That take isn't recording");
  const part = JSON.parse(readFileSync(partFile, "utf8")) as Part;
  const pcm = readFileSync(pcmFile);
  if (pcm.length / 2 / part.rate < 0.5) {
    rmSync(pcmFile, { force: true });
    rmSync(partFile, { force: true });
    throw bad("That take was too short to keep");
  }
  writeFileSync(takeFile(id, take, ".wav"), Buffer.concat([wavHeader(pcm.length, part.rate), pcm]));
  // If transcription fails, the .pcm and .part.json stay, so the take shows up as unfinished and can be tried again.
  await transcribeTake(id, take, part);
  await attachCamera(id, take);
  rmSync(pcmFile, { force: true });
  rmSync(partFile, { force: true });
  return recordState(id);
}

// Runs the saved take through Whisper again and re-matches it to the script. Its hand cuts are replaced by fresh suggestions.
export async function retranscribe(id: string, take: string): Promise<RecordState> {
  const file = takeFile(id, take, ".json");
  if (!existsSync(file) || !existsSync(takeFile(id, take, ".wav"))) throw bad("No such take");
  const current = readTake(file);
  await transcribeTake(id, take, { from: current.from, createdAt: current.createdAt });
  return recordState(id);
}

async function transcribeTake(id: string, take: string, meta: { from: number; createdAt: string }): Promise<void> {
  const wav = takeFile(id, take, ".wav");
  const { rate, samples } = readWav(wav);
  const duration = samples.length / rate;
  const script = readScript(id);
  const norms = script.words.map((w) => w.norm);
  const from = Math.min(meta.from, norms.length - 1);
  const tmp = mkdtempSync(path.join(tmpdir(), "studio-take-"));
  let heard: { text: string; start: number; end: number }[];
  try {
    const small = path.join(tmp, "take.wav");
    // Decision: Whisper drops the last words of audio that stops right after them, so its copy gets a second of silence on the end.
    await execOrThrow("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-af", "apad=pad_dur=1.5", "-c:a", "pcm_s16le", small]);
    heard = await transcribeWords(small);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  // Whisper may write "one-to-one" as one word; split it so each part can match the script, sharing its time evenly.
  const pieces = heard.flatMap((w) => {
    const parts = splitSpoken(w.text);
    const step = (w.end - w.start) / Math.max(1, parts.length);
    return parts.map((text, k) => ({ text, norm: normWord(text), start: w.start + k * step, end: w.start + (k + 1) * step }));
  });
  const map = alignHeard(pieces.map((p) => p.norm), norms, from);
  const reasons = suggestCuts(pieces.map((p, i) => ({ norm: p.norm, idx: map[i] ?? null })));
  const words: TakeWord[] = pieces.map((p, i) => {
    const idx = map[i] ?? null;
    const reason = reasons[i];
    return {
      text: idx !== null ? script.words[idx]!.text : p.text,
      norm: p.norm,
      start: Math.max(0, p.start),
      end: Math.min(duration, Math.max(p.start + 0.02, p.end)),
      idx,
      cut: reason !== null,
      ...(reason ? { reason } : {}),
    };
  });
  const result: Take = {
    id: take,
    createdAt: meta.createdAt,
    from,
    duration,
    gainDb: takeGainDb(envelope(samples, rate, 32768)),
    scriptHash: script.hash,
    words,
    glitches: glitchSpans(findClicks(samples, rate, 32768), duration),
  };
  const before = takeFile(id, take, ".json");
  if (existsSync(before)) {
    const video = readTake(before).video;
    if (video) result.video = video;
  }
  const range = keptRange(words);
  if (range) {
    for (const older of listTakes(id)) if (older.id !== take && older.createdAt < meta.createdAt) writeTake(id, { ...older, words: markRedone(older.words, range) });
  }
  writeTake(id, result);
  if (readSettings(id).cleanup !== "off") void ensureClean(id);
}

// Settings for the whole recording, kept next to the takes.
type Settings = { cleanup: Cleanup };
const settingsFile = (id: string) => path.join(recordDir(id), "settings.json");
function readSettings(id: string): Settings {
  try {
    const saved = JSON.parse(readFileSync(settingsFile(id), "utf8")) as Partial<Settings>;
    return { cleanup: saved.cleanup === "gentle" || saved.cleanup === "strong" ? saved.cleanup : "off" };
  } catch {
    return { cleanup: "off" };
  }
}

const cleanExt = (level: Level) => `.clean-${cleanupEngine()}-${level}.wav`;
const cleaning = new Map<string, Promise<void>>();
const cleanAgain = new Set<string>();
// Takes whose cleanup failed for the current engine and level; cleared when the creator changes the setting.
const cleanFailed = new Map<string, Map<string, string>>();

function needsClean(id: string): Take[] {
  const { cleanup } = readSettings(id);
  if (cleanup === "off") return [];
  const failed = cleanFailed.get(id);
  return listTakes(id).filter((t) => !existsSync(takeFile(id, t.id, cleanExt(cleanup))) && !failed?.has(`${t.id}${cleanExt(cleanup)}`));
}

// Makes the missing cleaned copies one at a time in the background; a take saved meanwhile is picked up before it stops.
function ensureClean(id: string): Promise<void> {
  const running = cleaning.get(id);
  if (running) {
    cleanAgain.add(id);
    return running;
  }
  const job = (async () => {
    do {
      cleanAgain.delete(id);
      for (const take of needsClean(id)) {
        const { cleanup } = readSettings(id);
        if (cleanup === "off") break;
        const ext = cleanExt(cleanup);
        try {
          const { rate } = wavInfo(takeFile(id, take.id, ".wav"));
          await cleanWav(takeFile(id, take.id, ".wav"), takeFile(id, take.id, ext), cleanup, cleanupEngine(), rate, take.duration);
        } catch (error) {
          const failed = cleanFailed.get(id) ?? new Map<string, string>();
          failed.set(`${take.id}${ext}`, error instanceof Error ? error.message : String(error));
          cleanFailed.set(id, failed);
        }
      }
    } while (cleanAgain.has(id));
  })()
    // Nothing here may crash the server; export checks for the cleaned files itself.
    .catch(() => undefined)
    .finally(() => cleaning.delete(id));
  cleaning.set(id, job);
  return job;
}

function wavInfo(file: string): { rate: number } {
  const buf = readFileSync(file).subarray(0, 44);
  return { rate: buf.readUInt32LE(24) };
}

export function setCleanup(id: string, cleanup: Cleanup): RecordState {
  mkdirSync(recordDir(id), { recursive: true });
  writeFileSync(settingsFile(id), JSON.stringify({ ...readSettings(id), cleanup }));
  cleanFailed.delete(id);
  if (cleanup !== "off") void ensureClean(id);
  return recordState(id);
}

// Takes recorded before glitch detection existed get scanned once. The file's time is kept so an export doesn't look out of date.
function withGlitches(id: string, take: Take): Take {
  if (take.glitches) return take;
  const file = takeFile(id, take.id, ".json");
  const wav = takeFile(id, take.id, ".wav");
  if (!existsSync(wav)) return take;
  const { rate, samples } = readWav(wav);
  const fresh = { ...take, glitches: glitchSpans(findClicks(samples, rate, 32768), take.duration) };
  const { atime, mtime } = statSync(file);
  writeTake(id, fresh);
  utimesSync(file, atime, mtime);
  return fresh;
}

export function recordState(id: string): RecordState {
  const script = readScript(id);
  const takes = listTakes(id).map((take) => {
    const fresh = realign(take, script);
    if (fresh !== take) writeTake(id, fresh);
    return withGlitches(id, fresh);
  });
  const unfinished: UnfinishedTake[] = readdirSync(takesDir(id))
    .filter((name) => name.endsWith(".part.json"))
    .flatMap((name) => {
      const take = name.replace(".part.json", "");
      const pcm = takeFile(id, take, ".pcm");
      if (!existsSync(pcm)) return [];
      const part = JSON.parse(readFileSync(path.join(takesDir(id), name), "utf8")) as Part;
      return [{ id: take, createdAt: part.createdAt, seconds: statSync(pcm).size / 2 / part.rate }];
    });
  const { cleanup } = readSettings(id);
  const narration = path.join(recordDir(id), "narration.json");
  let exported: RecordState["exported"] = null;
  if (existsSync(narration)) {
    const saved = JSON.parse(readFileSync(narration, "utf8")) as { duration: number; cleanup?: Cleanup };
    exported = {
      at: statSync(narration).mtime.toISOString(),
      duration: saved.duration,
      cleanup: saved.cleanup ?? "off",
      facecam: existsSync(path.join(recordDir(id), "facecam.mp4")),
      // Any take saved or re-cut after the export, or a different noise setting, means the exported file no longer matches the edit.
      stale:
        (saved.cleanup ?? "off") !== cleanup ||
        readdirSync(takesDir(id)).some((name) => name.endsWith(".json") && !name.endsWith(".part.json") && statSync(path.join(takesDir(id), name)).mtimeMs > statSync(narration).mtimeMs),
    };
  }
  const failed = cleanFailed.get(id);
  const errors = cleanup === "off" ? [] : [...(failed?.entries() ?? [])].filter(([key]) => key.endsWith(cleanExt(cleanup))).map(([, message]) => message);
  const cleanupState = {
    level: cleanup,
    engine: cleanupEngine(),
    ready: cleanup === "off" ? [] : takes.filter((t) => existsSync(takeFile(id, t.id, cleanExt(cleanup)))).map((t) => t.id),
    pending: needsClean(id).length,
    error: errors[0] ?? null,
  };
  // After a server restart nothing is cleaning yet, so asking for the state starts whatever is missing.
  if (cleanupState.pending > 0) void ensureClean(id);
  const { stages } = parseStatus(readFileSync(path.join(videoDir(id), "status.md"), "utf8"));
  return { script, takes, unfinished, exported, cleanup: cleanupState, stageState: stages.find((s) => s.name === "record")?.state ?? "not started" };
}

export function saveCuts(id: string, take: string, cuts: (CutReason | null)[]): void {
  const file = takeFile(id, take, ".json");
  if (!existsSync(file)) throw bad("No such take");
  const current = readTake(file);
  if (cuts.length !== current.words.length) throw bad("Those cuts don't fit this take; reload the page");
  const words = current.words.map((w, i) => {
    const reason = cuts[i] ?? null;
    const { reason: _old, ...rest } = w;
    return reason ? { ...rest, cut: true, reason } : { ...rest, cut: false };
  });
  writeTake(id, { ...current, words });
}

// Deleted takes go to record/trash/, never straight off the disk.
export function deleteTake(id: string, take: string): void {
  const trash = path.join(recordDir(id), "trash");
  mkdirSync(trash, { recursive: true });
  for (const ext of [".json", ".wav", ".pcm", ".part.json", ".cam.mp4", ".cam.raw"]) {
    const file = takeFile(id, take, ext);
    if (existsSync(file)) renameSync(file, path.join(trash, path.basename(file)));
  }
  // Cleaned copies can always be made again, so they're just removed.
  if (TAKE_ID.test(take)) for (const name of readdirSync(takesDir(id))) if (name.startsWith(`${take}.clean-`)) rmSync(path.join(takesDir(id), name), { force: true });
}

let listening = false;

// Live teleprompter: a few seconds of 16 kHz audio in, where the reader is in the script out.
export async function listen(id: string, from: number, pcm16k: Buffer): Promise<{ cursor: number; heard: string; busy?: true }> {
  if (listening) return { cursor: from, heard: "", busy: true };
  listening = true;
  const tmp = mkdtempSync(path.join(tmpdir(), "studio-listen-"));
  try {
    const script = readScript(id);
    const body = pcm16k.subarray(0, pcm16k.length - (pcm16k.length % 2));
    const wav = path.join(tmp, "window.wav");
    writeFileSync(wav, Buffer.concat([wavHeader(body.length, 16000), body]));
    const heard = await quickText(wav, scriptText(script, from - 15, 60));
    const cursor = trackReader(splitSpoken(heard).map(normWord), script.words.map((w) => w.norm), from);
    return { cursor, heard };
  } finally {
    listening = false;
    rmSync(tmp, { recursive: true, force: true });
  }
}

const CAPTION_CHARS = 42;

export async function exportNarration(id: string, finish: boolean): Promise<RecordState> {
  const state = recordState(id);
  const takes = new Map(state.takes.map((t) => [t.id, t]));
  const raw = buildTimeline(state.takes);
  if (raw.length === 0) throw bad("Nothing is recorded yet");
  const envelopes = new Map<string, Float32Array>();
  for (const takeId of new Set(raw.map((s) => s.take))) {
    const { rate, samples } = readWav(takeFile(id, takeId, ".wav"));
    envelopes.set(takeId, envelope(samples, rate, 32768));
  }
  const segments = refineSegments(raw, takes, envelopes);

  const inputs = [...new Set(segments.map((s) => s.take))];
  const { cleanup } = readSettings(id);
  let source = (take: string) => takeFile(id, take, ".wav");
  if (cleanup !== "off") {
    await ensureClean(id);
    const missingClean = inputs.find((take) => !existsSync(takeFile(id, take, cleanExt(cleanup))));
    if (missingClean) {
      const reason = cleanFailed.get(id)?.get(`${missingClean}${cleanExt(cleanup)}`);
      throw bad(`Noise cleanup didn't work${reason ? `: ${reason}` : ""}. Set it to Off to export without it.`);
    }
    source = (take: string) => takeFile(id, take, cleanExt(cleanup));
  }
  const FADE = 0.006;
  const filters = segments.map((s, k) => {
    const dur = s.end - s.start;
    const gain = takes.get(s.take)!.gainDb;
    return `[${inputs.indexOf(s.take)}:a]atrim=start=${s.start.toFixed(4)}:end=${s.end.toFixed(4)},asetpts=PTS-STARTPTS,volume=${gain}dB,afade=t=in:d=${FADE},afade=t=out:st=${Math.max(0, dur - FADE).toFixed(4)}:d=${FADE}[s${k}]`;
  });
  // Decision: a gentle high-pass removes desk and fan rumble, and loudnorm brings the voice to YouTube's usual -16 LUFS.
  filters.push(`${segments.map((_, k) => `[s${k}]`).join("")}concat=n=${segments.length}:v=0:a=1,highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`);
  const dir = recordDir(id);
  const filterFile = path.join(dir, ".narration.filter");
  writeFileSync(filterFile, filters.join(";\n"));
  try {
    await execOrThrow("ffmpeg", [
      "-y", "-loglevel", "error",
      ...inputs.flatMap((take) => ["-i", source(take)]),
      "-/filter_complex", filterFile, "-map", "[out]", "-ac", "1", "-c:a", "pcm_s16le", path.join(dir, "narration.wav"),
    ]);
  } finally {
    rmSync(filterFile, { force: true });
  }

  // Face cam: cut with exactly the voice's segments. Only when every take used has camera; a stale file never lingers.
  const facecam = path.join(dir, "facecam.mp4");
  rmSync(facecam, { force: true });
  const withCam = segments.every((seg) => takes.get(seg.take)?.video && existsSync(takeFile(id, seg.take, ".cam.mp4")));
  if (withCam) {
    await exportFacecam(
      segments.map((seg) => ({ cam: takeFile(id, seg.take, ".cam.mp4"), offset: takes.get(seg.take)!.video!.offset, start: seg.start, end: seg.end })),
      facecam,
    );
  }

  const placed = placeWords(segments, takes);
  let beat = state.script.words[0]?.beat ?? 1;
  const words = placed.words.map((p) => {
    const w = takes.get(p.take)!.words[p.at]!;
    if (w.idx !== null) beat = state.script.words[w.idx]!.beat;
    return { text: w.text, start: round(p.start), end: round(p.end), idx: w.idx, beat };
  });
  const duration = round(placed.duration);
  writeFileSync(path.join(dir, "narration.json"), JSON.stringify({ duration, cleanup, words }, null, 1));
  writeFileSync(path.join(dir, "narration.srt"), toSrt(captions(words)));
  writeFileSync(path.join(dir, "transcript.md"), transcript(state.script, words));

  if (finish && !/^done\b/.test(state.stageState)) {
    const missing = coverage(state.script, state.takes).filter((c) => c === "missing").length;
    updateStatus(id, (md) =>
      appendToSection(
        setStageState(md, "record", "done"),
        "Creator decisions",
        `${today()} record: the creator finished recording (${clock(duration)}, ${state.takes.length} take${state.takes.length === 1 ? "" : "s"}${missing ? `, ${missing} script words left unrecorded on purpose` : ""}). What was actually said is in record/transcript.md and record/narration.json; it wins over script.md wherever they differ.`,
      ),
    );
  }
  return recordState(id);
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function captions(words: { text: string; start: number; end: number }[]): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;
  for (const w of words) {
    if (current && (w.start * 1000 - current.endMs > 700 || current.text.length + 1 + w.text.length > CAPTION_CHARS || /[.!?]$/.test(current.text))) {
      out.push(current);
      current = null;
    }
    if (!current) current = { startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000), text: w.text };
    else {
      current.text += ` ${w.text}`;
      current.endMs = Math.round(w.end * 1000);
    }
  }
  if (current) out.push(current);
  return out;
}

function transcript(script: RecordScript, words: { text: string; beat: number }[]): string {
  const lines = ["# What was recorded", "", "Generated from the edited takes. Where this differs from script.md, this is what the viewer hears.", ""];
  for (const beat of script.beats) {
    const text = words.filter((w) => w.beat === beat.n).map((w) => w.text).join(" ");
    lines.push(`## Beat ${beat.n}: ${beat.name}`, "", text || "_(not recorded)_", "");
  }
  return lines.join("\n");
}
