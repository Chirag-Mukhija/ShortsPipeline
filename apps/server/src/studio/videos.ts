// Reads and updates the studio's video folders (videos/NNN-slug/): status.md stages and decisions, artifacts, creator questions and the inbox.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  VIDEO_MODES,
  type InboxItem,
  type StageRow,
  type StudioQuestions,
  type VideoMode,
  type VideoSummary,
} from "@clipforge/schema";
import { ROOT_DIR } from "../config";
import { StepError } from "../pipeline/errors";

// Decision: overridable so tests run against a temp folder and never touch the creator's real videos.
export const VIDEOS_DIR = process.env.STUDIO_VIDEOS_DIR ? path.resolve(process.env.STUDIO_VIDEOS_DIR) : path.join(ROOT_DIR, "videos");
export const VIDEO_FILES_PREFIX = "/videofiles";

// Decision: StepError is what the HTTP layer turns into a 400, so a bad request from the website reads as the creator's mistake, not a crash.
const bad = (message: string) => new StepError(message, false);

const FOLDER = /^(\d{3})-[a-z0-9-]+$/;
// Decision: the website may only rewrite these artifacts; everything else in a folder is written by agents or tools.
export const EDITABLE = ["idea.md", "brief.md", "plan.md", "script.md", "package.md", "factcheck.md"] as const;
const TEXT_EXT = new Set([".md", ".json", ".txt", ".srt"]);
const KIND: Record<string, InboxItem["kind"]> = {
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".heic": "image", ".webp": "image", ".gif": "image",
  ".mp4": "video", ".mov": "video", ".webm": "video", ".m4v": "video",
  ".m4a": "audio", ".mp3": "audio", ".wav": "audio", ".aac": "audio", ".ogg": "audio",
};

export function videoDir(id: string): string {
  if (!FOLDER.test(id)) throw bad(`Not a video folder name: ${id}`);
  const dir = path.join(VIDEOS_DIR, id);
  if (!existsSync(dir)) throw bad(`No such video: ${id}`);
  return dir;
}

const today = () => new Date().toISOString().slice(0, 10);

export function parseStatus(md: string): { mode: VideoMode; stages: StageRow[]; decisions: string[]; notes: string[] } {
  const modeMatch = /^Mode:\s*(\w+)/m.exec(md);
  const mode = (VIDEO_MODES as readonly string[]).includes(modeMatch?.[1] ?? "") ? (modeMatch?.[1] as VideoMode) : "chat";
  const stages: StageRow[] = [];
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 5 || !line.trim().startsWith("|")) continue;
    const [, name = "", state = "", output = ""] = cells;
    if (!name || name === "Stage" || /^-+$/.test(name)) continue;
    stages.push({ name, state: state.toLowerCase(), output, gate: /creator gate/i.test(output) });
  }
  const section = (title: string) => {
    const start = md.indexOf(`## ${title}`);
    if (start < 0) return [];
    const rest = md.slice(start + title.length + 3);
    const end = rest.indexOf("\n## ");
    return (end < 0 ? rest : rest.slice(0, end))
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2).trim());
  };
  return { mode, stages, decisions: section("Creator decisions"), notes: section("Notes for the next stage") };
}

export function isDone(stage: StageRow): boolean {
  return /^done\b/.test(stage.state);
}

export function currentStage(stages: StageRow[]): StageRow | null {
  return stages.find((stage) => !isDone(stage)) ?? null;
}

export function isBuilt(stage: StageRow): boolean {
  return !stage.state.startsWith("not built");
}

function readStatus(id: string): string {
  return readFileSync(path.join(videoDir(id), "status.md"), "utf8");
}

function writeStatus(id: string, md: string): void {
  writeFileSync(path.join(videoDir(id), "status.md"), md);
}

export function appendToSection(md: string, title: string, line: string): string {
  const header = `## ${title}`;
  const start = md.indexOf(header);
  if (start < 0) return `${md.trimEnd()}\n\n${header}\n- ${line}\n`;
  const after = start + header.length;
  const next = md.indexOf("\n## ", after);
  const end = next < 0 ? md.length : next;
  const body = md.slice(after, end).trimEnd();
  return `${md.slice(0, after)}${body}\n- ${line}\n${next < 0 ? "" : md.slice(end)}`;
}

export function setStageState(md: string, stage: string, state: string): string {
  return md
    .split("\n")
    .map((line) => {
      const cells = line.split("|");
      if (cells.length < 5 || cells[1]?.trim() !== stage) return line;
      cells[2] = ` ${state} `;
      return cells.join("|");
    })
    .join("\n");
}

function titleOf(dir: string, id: string): string {
  const declared = /^Title:(.*)$/m.exec(readFileSync(path.join(dir, "status.md"), "utf8"))?.[1]?.replace(/<!--.*?-->/g, "").trim();
  if (declared) return declared;
  for (const file of ["package.md", "plan.md", "brief.md"]) {
    const full = path.join(dir, file);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, "utf8");
    const patterns = [/^Recommended title:\s*\**[“"]?([^”"*\n]+)/im, /^#{1,4}\s*Title:\s*\**[“"]?([^”"*\n]+)/im, /\*\*(?:Recommended|Title)[^*]*\*\*:?\s*[“"]?([^”"*\n]+)/i];
    const found = patterns.map((pattern) => pattern.exec(text)?.[1]?.trim()).find(Boolean);
    if (found) return found;
  }
  const idea = path.join(dir, "idea.md");
  if (existsSync(idea)) {
    const words = /## In the creator's words\s+([^\n]+)/.exec(readFileSync(idea, "utf8"))?.[1];
    if (words) return words.length > 80 ? `${words.slice(0, 77)}…` : words;
  }
  return id.replace(/^\d{3}-/, "").replace(/-/g, " ");
}

function newestMtime(dir: string): number {
  let newest = statSync(dir).mtimeMs;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

export function readQuestions(id: string): StudioQuestions | null {
  const file = path.join(videoDir(id), "questions.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as StudioQuestions;
    return Array.isArray(parsed.questions) ? parsed : null;
  } catch {
    return null;
  }
}

export function summarize(id: string, running: boolean): VideoSummary {
  const dir = videoDir(id);
  const { mode, stages } = parseStatus(readStatus(id));
  const current = currentStage(stages);
  const questions = readQuestions(id);
  return {
    id,
    number: Number(FOLDER.exec(id)?.[1] ?? 0),
    title: titleOf(dir, id),
    mode,
    currentStage: current?.name ?? null,
    currentState: current?.state ?? null,
    waitingForCreator: questions !== null || /waiting/.test(current?.state ?? ""),
    running,
    updatedAt: new Date(newestMtime(dir)).toISOString(),
  };
}

export function listVideoIds(): string[] {
  if (!existsSync(VIDEOS_DIR)) return [];
  return readdirSync(VIDEOS_DIR)
    .filter((name) => FOLDER.test(name) && existsSync(path.join(VIDEOS_DIR, name, "status.md")))
    .sort();
}

export function listFiles(id: string): string[] {
  const dir = videoDir(id);
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const entry of readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk("");
  return out.sort();
}

export function readTextFile(id: string, rel: string): string {
  const dir = videoDir(id);
  const full = path.resolve(dir, rel);
  if (!full.startsWith(dir + path.sep) || !TEXT_EXT.has(path.extname(full)) || !existsSync(full)) {
    throw bad(`Can't read ${rel}`);
  }
  return readFileSync(full, "utf8");
}

export function writeArtifact(id: string, file: string, content: string): void {
  if (!(EDITABLE as readonly string[]).includes(file)) throw bad(`${file} isn't editable from the studio`);
  writeFileSync(path.join(videoDir(id), file), content);
  writeStatus(id, appendToSection(readStatus(id), "Creator decisions", `${today()} ${file.replace(".md", "")}: the creator edited ${file} directly in the studio`));
}

export function setMode(id: string, mode: VideoMode): void {
  const md = readStatus(id);
  const next = /^Mode:.*$/m.test(md) ? md.replace(/^Mode:.*$/m, `Mode: ${mode}`) : md.replace(/^(# Status\n)/, `$1\nMode: ${mode}\n`);
  writeStatus(id, appendToSection(next, "Creator decisions", `${today()} mode: the creator switched this video to ${mode} mode`));
}

export function answerQuestions(id: string, answers: Record<string, string>): void {
  const questions = readQuestions(id);
  if (!questions) throw bad("There are no open questions on this video");
  let md = readStatus(id);
  for (const q of questions.questions) {
    const answer = answers[q.id]?.trim();
    if (!answer) throw bad(`Please answer: ${q.question}`);
    md = appendToSection(md, "Creator decisions", `${today()} ${questions.stage}: ${q.question} → "${answer}"`);
  }
  writeStatus(id, md);
  rmSync(path.join(videoDir(id), "questions.json"));
}

export function approveStage(id: string, stage: string, note?: string): void {
  let md = setStageState(readStatus(id), stage, "done");
  md = appendToSection(md, "Creator decisions", `${today()} ${stage}: APPROVED by the creator${note ? `: "${note}"` : ""}`);
  writeStatus(id, md);
}

export function addNotes(id: string, stage: string, notes: string): void {
  let md = setStageState(readStatus(id), stage, "needs changes");
  md = appendToSection(md, "Creator decisions", `${today()} ${stage}: the creator asked for changes: "${notes.trim()}"`);
  md = appendToSection(md, "Notes for the next stage", `${today()} redo ${stage} with the creator's notes above`);
  writeStatus(id, md);
}

export function addInboxItem(id: string, original: string, bytes: Buffer, note: string, intent: string): string {
  const inbox = path.join(videoDir(id), "inbox");
  mkdirSync(inbox, { recursive: true });
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const base = path.basename(original, path.extname(original)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "upload";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const file = `${stamp}-${base}${ext}`;
  writeFileSync(path.join(inbox, file), bytes);
  const meta = path.join(inbox, "index.json");
  const items = existsSync(meta) ? (JSON.parse(readFileSync(meta, "utf8")) as Omit<InboxItem, "url">[]) : [];
  items.push({ file, kind: KIND[ext] ?? "other", addedAt: new Date().toISOString(), note: note.trim(), intent });
  writeFileSync(meta, JSON.stringify(items, null, 2));
  writeStatus(
    id,
    appendToSection(readStatus(id), "Notes for the next stage", `${today()} inbox: the creator added inbox/${file} (${intent})${note.trim() ? `: "${note.trim()}"` : ""}`),
  );
  return file;
}

export function listInbox(id: string): InboxItem[] {
  const meta = path.join(videoDir(id), "inbox", "index.json");
  if (!existsSync(meta)) return [];
  const items = JSON.parse(readFileSync(meta, "utf8")) as Omit<InboxItem, "url">[];
  return items.map((item) => ({ ...item, url: `${VIDEO_FILES_PREFIX}/${id}/inbox/${encodeURIComponent(item.file)}` })).reverse();
}

export function createVideo(idea: string, mode: VideoMode): string {
  const templates = path.join(ROOT_DIR, ".claude", "skills", "studio", "templates");
  const numbers = listVideoIds().map((name) => Number(name.slice(0, 3)));
  const number = (numbers.length ? Math.max(...numbers) : 0) + 1;
  const stop = new Set(["a", "an", "the", "of", "to", "and", "how", "i", "my", "with", "for", "in", "on", "is", "it", "this"]);
  const words = idea.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const slug = (words.filter((w) => !stop.has(w)).slice(0, 5).join("-") || "video").slice(0, 48).replace(/-$/, "");
  const id = `${String(number).padStart(3, "0")}-${slug}`;
  const dir = path.join(VIDEOS_DIR, id);
  mkdirSync(path.join(dir, "research"), { recursive: true });
  for (const name of readdirSync(templates)) {
    const text = readFileSync(path.join(templates, name), "utf8").replaceAll("{{IDEA}}", idea.trim()).replaceAll("{{DATE}}", today());
    writeFileSync(path.join(dir, name), name === "status.md" ? text.replace(/^Mode:.*$/m, `Mode: ${mode}`) : text);
  }
  return id;
}
