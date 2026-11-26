// Frees disk space on a finished video: lists its rough files by group, refuses while anything could still need them, and permanently deletes only the groups the creator ticked.
import { createHash } from "node:crypto";
import { type Stats, existsSync, lstatSync, readFileSync, readdirSync, realpathSync, rmSync, rmdirSync, statSync } from "node:fs";
import path from "node:path";
import type { CleanupGroup, CleanupGroupId, CleanupPlan, CleanupResult } from "@clipforge/schema";
import { exec } from "../lib/exec";
import { StepError } from "../pipeline/errors";
import { renderRunning } from "./edit";
import { isRunning } from "./runner";
import { appendToSection, isDone, parseStatus, updateStatus, videoDir } from "./videos";

const bad = (message: string) => new StepError(message, false);

type Rule = Pick<CleanupGroup, "id" | "label" | "detail" | "permanent" | "selected"> & {
  // Folders whose whole contents go, and single files; all relative to the video's folder.
  dirs?: string[];
  files?: string[];
  // Loose files directly inside renders/ that match.
  renders?: RegExp;
};

// Decision: an allowlist. A file no rule names is kept, so a new kind of file is never deleted by accident.
// Takes go whole (audio, camera and their JSON together): the Record page reads every listed take's audio.
const RULES: Rule[] = [
  { id: "takes", label: "Raw voice and camera takes", detail: "Every recorded take, its cleaned copies and its camera file. To change any line afterwards you'd record the whole voice-over again.", permanent: true, selected: true, dirs: ["record/takes", "record/trash"] },
  { id: "clips", label: "Rendered pieces", detail: "The per-beat and per-segment clips.", permanent: false, selected: true, dirs: ["renders/beats", "renders/cut", "renders/.assemble", "renders/.cut"] },
  { id: "drafts", label: "Draft videos", detail: "Previews, storyboards and test renders. The final video isn't one of them.", permanent: false, selected: true, renders: /\.mp4$/i },
  { id: "stills", label: "Check stills", detail: "Frames rendered to check the graphics.", permanent: false, selected: true, dirs: ["edit/stills"] },
  { id: "logs", label: "Agent run logs", detail: "The Activity history and the showrunner's session for this video. Decisions stay in status.md.", permanent: true, selected: true, dirs: [".runs"] },
  { id: "footage", label: "Your uploaded footage", detail: "Screen recordings and clips in media/. Without them the video can't be rendered again.", permanent: true, selected: false, dirs: ["media"] },
  { id: "masters", label: "Finished voice and face cam", detail: "narration.wav and facecam.mp4. Without them the video can't be rendered again.", permanent: true, selected: false, files: ["record/narration.wav", "record/facecam.mp4"] },
];
// Kept whatever the rules say: the exports a creator uploads.
const FINALS = new Set(["renders/final.mp4", "renders/cut-final.mp4"]);
const BUSY_MS = 2 * 60_000;

type Found = { rel: string; stat: Stats };

// Decision: symlinks are never followed or removed, and a folder reached through one is skipped, so cleanup can't leave the video's folder.
function inside(dir: string, rel: string): boolean {
  const full = path.join(dir, rel);
  return existsSync(full) && realpathSync(full) === path.join(realpathSync(dir), rel);
}

function walk(dir: string, rel: string, out: Found[]): void {
  for (const entry of readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) walk(dir, child, out);
    else if (entry.isFile()) out.push({ rel: child, stat: lstatSync(path.join(dir, child)) });
  }
}

function filesOf(dir: string, rule: Rule, keep: Set<string>): Found[] {
  const out: Found[] = [];
  for (const rel of rule.dirs ?? []) if (inside(dir, rel) && lstatSync(path.join(dir, rel)).isDirectory()) walk(dir, rel, out);
  for (const rel of rule.files ?? []) if (inside(dir, rel) && lstatSync(path.join(dir, rel)).isFile()) out.push({ rel, stat: lstatSync(path.join(dir, rel)) });
  if (rule.renders && inside(dir, "renders")) {
    for (const entry of readdirSync(path.join(dir, "renders"), { withFileTypes: true })) {
      const rel = `renders/${entry.name}`;
      if (entry.isFile() && rule.renders.test(entry.name)) out.push({ rel, stat: lstatSync(path.join(dir, rel)) });
    }
  }
  return out.filter((f) => !keep.has(f.rel));
}

// What a file really takes on disk; a hard-linked one frees nothing until its other copy goes.
const onDisk = (s: Stats) => (s.nlink > 1 ? 0 : s.blocks * 512);

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// The video that goes to YouTube: the one upload.json names, directly inside renders/.
function finalPath(dir: string): string {
  const named = readJson(path.join(dir, "package/upload.json"))?.file;
  return typeof named === "string" && /^renders\/[^/]+\.mp4$/i.test(named) ? named : "renders/final.mp4";
}

async function probeFinal(dir: string, rel: string): Promise<{ seconds: number; problem: string | null }> {
  const file = path.join(dir, rel);
  const probe = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", file], { timeoutMs: 30_000 }).catch(() => null);
  const info = (probe?.code === 0 ? JSON.parse(probe.stdout) : {}) as { format?: { duration?: string }; streams?: { codec_type: string }[] };
  const seconds = Number(info.format?.duration ?? 0);
  const has = (type: string) => info.streams?.some((s) => s.codec_type === type);
  if (!seconds || !has("video") || !has("audio")) return { seconds, problem: `${rel} isn't a playable video with sound` };
  const narration = Number(readJson(path.join(dir, "record/narration.json"))?.duration ?? 0);
  if (narration && seconds < narration - 1) return { seconds, problem: `${rel} is ${Math.round(seconds)} s but the voice-over is ${Math.round(narration)} s, so it isn't the whole video` };
  // Decoding the last moments catches a file that was cut off mid-write, which its header alone wouldn't show.
  const tail = await exec("ffmpeg", ["-v", "error", "-xerror", "-sseof", "-3", "-i", file, "-f", "null", "-"], { timeoutMs: 60_000 }).catch(() => null);
  return { seconds, problem: tail?.code === 0 && !tail.stderr.trim() ? null : `${rel} doesn't play to its end` };
}

async function survey(id: string): Promise<{ plan: CleanupPlan; found: Map<CleanupGroupId, Found[]> }> {
  const dir = videoDir(id);
  const final = finalPath(dir);
  const keep = new Set([...FINALS, final]);
  const found = new Map(RULES.map((rule) => [rule.id, filesOf(dir, rule, keep)]));
  const blockers: string[] = [];
  const warnings: string[] = [];

  const { stages } = parseStatus(readFileSync(path.join(dir, "status.md"), "utf8"));
  const open = stages.filter((s) => !isDone(s));
  if (stages.length === 0 || open.length > 0) blockers.push(`The video isn't finished yet${open[0] ? `: "${open[0].name}" is still ${open[0].state}` : ""}.`);
  if (isRunning(id)) blockers.push("The team is working on this video.");
  if (renderRunning(id)) blockers.push("A render is running.");
  const now = Date.now();
  if (existsSync(path.join(dir, "record/.narration.filter"))) blockers.push("The voice-over is being exported.");
  // Renders started from a terminal, and takes still being saved or cleaned, aren't tracked anywhere: a fresh file is the sign.
  for (const rel of ["record/takes", "renders"]) {
    const fresh = [...found.values()].flat().some((f) => f.rel.startsWith(`${rel}/`) && now - f.stat.mtimeMs < BUSY_MS);
    if (fresh) blockers.push(`Something in ${rel}/ changed in the last two minutes. Wait for it to finish.`);
  }

  let finalInfo: CleanupPlan["final"] = null;
  if (!inside(dir, final) || !lstatSync(path.join(dir, final)).isFile()) blockers.push(`There's no final video (${final}).`);
  else {
    const stat = statSync(path.join(dir, final));
    const { seconds, problem } = await probeFinal(dir, final);
    finalInfo = { path: final, bytes: stat.size, seconds };
    if (problem) blockers.push(`${problem}.`);
    if (now - stat.mtimeMs < BUSY_MS) blockers.push("The final video is only just written. Wait two minutes.");
    const sources: Found[] = [];
    for (const rel of ["edit/edit.json", "edit/cut.json", "record/narration.wav", "record/facecam.mp4"]) if (existsSync(path.join(dir, rel))) sources.push({ rel, stat: statSync(path.join(dir, rel)) });
    if (inside(dir, "edit/scenes")) walk(dir, "edit/scenes", sources);
    const newer = sources.filter((s) => s.stat.mtimeMs > stat.mtimeMs).map((s) => s.rel);
    if (newer.length) warnings.push(`Changed after the final video was made, so it may not show the latest edit: ${newer.slice(0, 3).join(", ")}${newer.length > 3 ? ` and ${newer.length - 3} more` : ""}.`);
  }

  const groups = RULES.map(({ id: group, label, detail, permanent, selected }): CleanupGroup => {
    const files = found.get(group)!;
    const biggest = [...files].sort((a, b) => b.stat.size - a.stat.size);
    return { id: group, label, detail, permanent, selected, files: files.length, bytes: files.reduce((n, f) => n + onDisk(f.stat), 0), examples: biggest.slice(0, 4).map((f) => f.rel) };
  }).filter((g) => g.files > 0);
  const hash = createHash("sha256");
  for (const [group, files] of found) for (const f of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) hash.update(`${group}\0${f.rel}\0${f.stat.size}\0${f.stat.mtimeMs}\n`);
  hash.update(`${final}\0${finalInfo?.bytes ?? 0}`);
  return { plan: { final: finalInfo, groups, blockers, warnings, signature: hash.digest("hex") }, found };
}

export async function cleanupPlan(id: string): Promise<CleanupPlan> {
  return (await survey(id)).plan;
}

const size = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`);

// Deletes for good. Nothing awaits between the survey's checks and the deletions, so nothing can start on this video in between.
export async function runCleanup(id: string, groups: CleanupGroupId[], signature: string): Promise<CleanupResult> {
  const { plan, found } = await survey(id);
  // The survey waits on ffprobe, so what can start meanwhile is checked again.
  if (isRunning(id) || renderRunning(id)) throw bad("Something started on this video. Try again when it's finished.");
  if (plan.blockers.length) throw bad(plan.blockers.join(" "));
  if (plan.signature !== signature) throw bad("The files changed since you opened the list. Look it over again.");
  const chosen = plan.groups.filter((g) => groups.includes(g.id));
  if (chosen.length === 0) throw bad("Nothing is ticked");
  const dir = videoDir(id);
  let freed = 0;
  let deleted = 0;
  const failed: string[] = [];
  for (const group of chosen) {
    for (const f of found.get(group.id)!) {
      const full = path.join(dir, f.rel);
      try {
        if (!lstatSync(full).isFile()) throw new Error("not a plain file");
        rmSync(full);
        freed += onDisk(f.stat);
        deleted++;
      } catch {
        failed.push(f.rel);
      }
    }
    for (const rel of RULES.find((r) => r.id === group.id)?.dirs ?? []) if (inside(dir, rel)) pruneEmpty(path.join(dir, rel));
  }
  const day = new Date().toISOString().slice(0, 10);
  updateStatus(id, (md) =>
    appendToSection(md, "Creator decisions", `${day} cleanup: the creator deleted rough files for good (${size(freed)}): ${chosen.map((g) => g.label.toLowerCase()).join(", ")}. Kept: ${plan.final!.path}, package/, the documents and the scenes.${failed.length ? ` ${failed.length} file(s) couldn't be deleted.` : ""}`),
  );
  return { freed, deleted, failed, plan: await cleanupPlan(id) };
}

// Removes folders that ended up empty; one that still holds anything (a symlink, a file that failed) stays.
function pruneEmpty(full: string): void {
  for (const entry of readdirSync(full, { withFileTypes: true })) if (entry.isDirectory()) pruneEmpty(path.join(full, entry.name));
  if (readdirSync(full).length === 0) rmdirSync(full);
}
