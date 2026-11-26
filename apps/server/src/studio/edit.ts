// The edit stage on the server: reads and updates edit.json (mix, music, beats, footage), keeps beat takes and rough-cut notes, runs render jobs (preview, final, stills) and serves what the Edit page shows.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_MIX, type EditBeatInfo, type EditFootage, type EditNote, type EditShot, type EditSpec, type EditState, type RenderJob, type RenderKind } from "@clipforge/schema";
import { DATA_DIR, FILES_PREFIX, ROOT_DIR } from "../config";
import { execOrThrow } from "../lib/exec";
import { StepError } from "../pipeline/errors";
import { emit } from "../pipeline/events";
import { VIDEO_FILES_PREFIX, appendToSection, setStageState, updateStatus, videoDir } from "./videos";

const today = () => new Date().toISOString().slice(0, 10);
const editDir = (id: string) => path.join(videoDir(id), "edit");
const specPath = (id: string) => path.join(editDir(id), "edit.json");
const fileUrl = (id: string, rel: string) => `${VIDEO_FILES_PREFIX}/${id}/${rel.split("/").map(encodeURIComponent).join("/")}`;
const readJson = <T>(file: string, fallback: T): T => {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function readSpec(id: string): EditSpec | null {
  const spec = readJson<EditSpec | null>(specPath(id), null);
  return spec ? { ...spec, mix: { ...DEFAULT_MIX, ...spec.mix }, footage: spec.footage ?? [] } : null;
}

function writeSpec(id: string, spec: EditSpec): void {
  writeFileSync(specPath(id), `${JSON.stringify(spec, null, 2)}\n`);
  emit({ type: "studio", videoId: id });
}

type MusicLibraryTrack = { id: string; title: string; artist: string; license: string; attribution: string; mood: string[]; file?: string };
const musicTracks = (): MusicLibraryTrack[] => readJson<MusicLibraryTrack[]>(path.join(DATA_DIR, "library", "music", "tracks.json"), []);

// ~10 peaks a second from the narration, cached beside edit.json and rebuilt when the narration is newer.
async function waveform(id: string, spec: EditSpec): Promise<number[]> {
  const wav = path.join(videoDir(id), spec.narration);
  const cache = path.join(editDir(id), ".waveform.json");
  if (!existsSync(wav)) return [];
  if (existsSync(cache) && statSync(cache).mtimeMs > statSync(wav).mtimeMs) return readJson<number[]>(cache, []);
  const raw = path.join(editDir(id), ".waveform.raw");
  await execOrThrow("ffmpeg", ["-v", "error", "-y", "-i", wav, "-ac", "1", "-ar", "1000", "-f", "u8", raw]);
  const bytes = readFileSync(raw);
  const peaks: number[] = [];
  for (let i = 0; i < bytes.length; i += 100) {
    let peak = 0;
    for (let j = i; j < Math.min(i + 100, bytes.length); j++) peak = Math.max(peak, Math.abs((bytes[j] ?? 128) - 128) / 128);
    peaks.push(Number(peak.toFixed(3)));
  }
  writeFileSync(cache, JSON.stringify(peaks));
  return peaks;
}

// One thumbnail per beat from the latest preview, refreshed when the preview is newer.
async function thumb(id: string, beatId: string, at: number): Promise<string> {
  const preview = path.join(videoDir(id), "renders", "preview.mp4");
  if (!existsSync(preview)) return "";
  const file = path.join(editDir(id), ".thumbs", `${beatId}.jpg`);
  if (!existsSync(file) || statSync(file).mtimeMs < statSync(preview).mtimeMs) {
    mkdirSync(path.dirname(file), { recursive: true });
    await execOrThrow("ffmpeg", ["-v", "error", "-y", "-ss", at.toFixed(2), "-i", preview, "-frames:v", "1", "-vf", "scale=320:-2", file]);
  }
  return `${fileUrl(id, `edit/.thumbs/${beatId}.jpg`)}?v=${Math.round(statSync(file).mtimeMs)}`;
}

const jobs = new Map<string, RenderJob>();

export async function editState(id: string): Promise<EditState> {
  const spec = readSpec(id);
  const narration = spec ? readJson<{ words: { text: string; start: number; end: number; beat: number }[] }>(path.join(videoDir(id), spec.narration.replace(/\.wav$/, ".json")), { words: [] }) : { words: [] };
  const beats: EditBeatInfo[] = [];
  for (const b of spec?.beats ?? []) {
    const takesDir = path.join(editDir(id), "takes", b.id);
    const stillsDir = path.join(editDir(id), "stills", b.id);
    beats.push({
      ...b,
      takes: existsSync(takesDir) ? readdirSync(takesDir).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")).sort() : [],
      stills: existsSync(stillsDir) ? readdirSync(stillsDir).filter((f) => f.endsWith(".png")).sort().map((f) => fileUrl(id, `edit/stills/${b.id}/${f}`)) : [],
      thumb: await thumb(id, b.id, (b.start + b.end) / 2).catch(() => ""),
    });
  }
  const render = (name: string) => {
    const file = path.join(videoDir(id), "renders", `${name}.mp4`);
    return existsSync(file) ? { url: `${fileUrl(id, `renders/${name}.mp4`)}?v=${Math.round(statSync(file).mtimeMs)}`, updatedAt: statSync(file).mtime.toISOString() } : undefined;
  };
  return {
    spec,
    beats,
    notes: readJson<EditNote[]>(path.join(editDir(id), "notes.json"), []),
    job: jobs.get(id) ?? null,
    renders: { preview: render("preview"), final: render("final"), animatic: render("animatic") },
    waveform: spec ? (await waveform(id, spec).catch(() => [])).slice(0, Math.ceil(spec.duration * 10)) : [],
    words: narration.words.filter((w) => !spec || w.start < spec.duration).map((w) => ({ text: w.text, start: w.start, end: w.end, beat: w.beat })),
    tracks: musicTracks().filter((t) => t.file).map((t) => ({ id: t.id, title: t.title, artist: t.artist, mood: t.mood ?? [], url: `${FILES_PREFIX}/library/music/${encodeURIComponent(t.file!)}` })),
  };
}

export type EditPatch = Partial<Pick<EditSpec, "mix" | "duration" | "theme">> & {
  music?: { trackId: string } | null;
  beats?: { id: string; start?: number; end?: number; label?: string; status?: EditSpec["beats"][number]["status"] }[];
  footage?: ({ id: string } & Partial<Pick<EditFootage, "in" | "out" | "speed" | "crop" | "blur">>)[];
  // Replaces one beat's planned shots (the Storyboard panel saves a beat at a time).
  shots?: { beat: string; list: EditShot[] };
};

// Beat boundaries stay contiguous: moving one beat's end moves the next beat's start with it.
export function patchSpec(id: string, patch: EditPatch): EditSpec {
  const spec = readSpec(id);
  if (!spec) throw new StepError("This video has no edit plan yet. Run the edit stage first.", false);
  if (patch.mix) spec.mix = { ...spec.mix, ...patch.mix };
  if (patch.duration) spec.duration = Math.max(1, patch.duration);
  if (patch.theme) spec.theme = patch.theme;
  if (patch.music !== undefined) {
    if (patch.music === null) spec.music = null;
    else {
      const t = musicTracks().find((x) => x.id === patch.music?.trackId && x.file);
      if (!t) throw new StepError("That track isn't in the music library yet. Add its file on the Library page.", false);
      spec.music = { trackId: t.id, title: `${t.title} · ${t.artist}`, credit: t.attribution };
    }
  }
  for (const b of patch.beats ?? []) {
    const i = spec.beats.findIndex((x) => x.id === b.id);
    const beat = spec.beats[i];
    if (!beat) continue;
    if (b.label !== undefined) beat.label = b.label;
    if (b.status) beat.status = b.status;
    if (b.end !== undefined && spec.beats[i + 1]) {
      const next = spec.beats[i + 1]!;
      const end = Math.min(Math.max(b.end, beat.start + 0.5), next.end - 0.5);
      beat.end = Number(end.toFixed(2));
      next.start = beat.end;
    }
  }
  for (const f of patch.footage ?? []) {
    const slot = spec.footage?.find((x) => x.id === f.id);
    if (slot) Object.assign(slot, f);
  }
  if (patch.shots) {
    const { beat, list } = patch.shots;
    if (!spec.beats.some((b) => b.id === beat)) throw new StepError(`No ${beat} in this edit`, false);
    spec.shots = [...(spec.shots ?? []).filter((x) => x.beat !== beat), ...list.map((x) => ({ ...x, beat }))].sort((a, b) => a.at - b.at);
    // Changing the plan reopens the storyboard for approval.
    spec.storyboard = "draft";
  }
  writeSpec(id, spec);
  return spec;
}

// The creator approves the animatic; only then do designers build beats.
export function approveStoryboard(id: string): void {
  const spec = readSpec(id);
  if (!spec) throw new StepError("No edit plan yet", false);
  spec.storyboard = "approved";
  writeSpec(id, spec);
  updateStatus(id, (md) => appendToSection(md, "Creator decisions", `${today()} edit: storyboard APPROVED by the creator (${(spec.shots ?? []).length} shots)`));
}

// Takes: before a beat is regenerated, its current scene is kept as v1, v2…; restoring copies a take back.
export function snapshotBeat(id: string, beatId: string): string | null {
  const spec = readSpec(id);
  const beat = spec?.beats.find((b) => b.id === beatId);
  if (!beat) throw new StepError(`No ${beatId} in this edit`, false);
  const scene = path.join(editDir(id), beat.scene);
  if (!existsSync(scene)) return null;
  const dir = path.join(editDir(id), "takes", beatId);
  mkdirSync(dir, { recursive: true });
  const n = readdirSync(dir).filter((f) => f.endsWith(".tsx")).length + 1;
  copyFileSync(scene, path.join(dir, `v${n}.tsx`));
  return `v${n}`;
}

export function restoreTake(id: string, beatId: string, take: string): void {
  const spec = readSpec(id);
  const beat = spec?.beats.find((b) => b.id === beatId);
  const file = path.join(editDir(id), "takes", beatId, `${take.replace(/[^\w-]/g, "")}.tsx`);
  if (!beat || !existsSync(file)) throw new StepError("That take doesn't exist", false);
  snapshotBeat(id, beatId);
  copyFileSync(file, path.join(editDir(id), beat.scene));
  emit({ type: "studio", videoId: id });
}

export function setNotes(id: string, notes: EditNote[]): EditNote[] {
  writeFileSync(path.join(editDir(id), "notes.json"), `${JSON.stringify(notes, null, 2)}\n`);
  emit({ type: "studio", videoId: id });
  return notes;
}

export const renderRunning = (id: string): boolean => jobs.get(id)?.status === "running";

// Render jobs run the repo scripts in the background, one per video; the page polls while one runs.
export function startJob(id: string, kind: RenderKind, beat?: string): RenderJob {
  const running = jobs.get(id);
  if (running?.status === "running") throw new StepError("A render is already running for this video", false);
  const args =
    kind === "stills" ? ["scripts/render-stills.mjs", id, beat ?? ""] : ["scripts/assemble.mjs", id, ...(kind === "final" ? ["--final"] : kind === "animatic" ? ["--animatic"] : []), ...(beat ? ["--beats", beat] : [])];
  const job: RenderJob = { id: `${Date.now()}`, kind, beat, status: "running", startedAt: new Date().toISOString(), log: [] };
  jobs.set(id, job);
  emit({ type: "studio", videoId: id });
  const child = spawn("node", args, { cwd: ROOT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  const add = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n").map((l) => l.trim()).filter(Boolean)) job.log.push(line.slice(0, 400));
    job.log = job.log.slice(-60);
  };
  child.stdout.on("data", add);
  child.stderr.on("data", add);
  child.on("close", (code) => {
    job.status = code === 0 ? "done" : "failed";
    job.finishedAt = new Date().toISOString();
    emit({ type: "studio", videoId: id });
  });
  return job;
}

// Footage the beats asked for: saved under media/ (never committed) and linked to its slot.
export function saveFootage(id: string, slotId: string, original: string, bytes: Buffer): void {
  const spec = readSpec(id);
  const slot = spec?.footage?.find((f) => f.id === slotId);
  if (!spec || !slot) throw new StepError("No such footage slot", false);
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  mkdirSync(path.join(videoDir(id), "media"), { recursive: true });
  const rel = `media/${slotId.replace(/[^\w-]/g, "")}${ext}`;
  writeFileSync(path.join(videoDir(id), rel), bytes);
  slot.file = rel;
  writeSpec(id, spec);
}

// The rough-cut gate: approving marks edit + graphics and rough cut done and logs it as the creator's decision.
export function approveRoughCut(id: string): void {
  updateStatus(id, (md) =>
    appendToSection(setStageState(setStageState(md, "edit + graphics", "done"), "rough cut", "done"), "Creator decisions", `${today()} rough cut: APPROVED by the creator`),
  );
}
