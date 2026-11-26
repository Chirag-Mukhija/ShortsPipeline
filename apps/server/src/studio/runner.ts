// Runs studio stages as headless Claude Code sessions, one at a time: queues, chains stages, streams a live feed, keeps a checkpoint of every run, and at the Pro usage limit pauses and later switches the same session back in.
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { nanoid } from "nanoid";
import type { FeedLine, RunCheckpoint, RunSummary, RunTodo, RunnerStatus, Usage, VideoMode } from "@clipforge/schema";
import { ROOT_DIR, env } from "../config";
import { exec } from "../lib/exec";
import { StepError } from "../pipeline/errors";
import { emit } from "../pipeline/events";
import { interpret, resumeTime, type StreamEvent } from "./runEvents";
import { CREATOR_STAGES, VIDEOS_DIR, currentStage, isBuilt, parseStatus, readQuestions, videoDir } from "./videos";

// Decision: an allowlist, not a denylist. A studio run may read and write the repo, research the web, use its skills and
// subagents, and run only the studio's own scripts; anything else (installs, git, deletes, arbitrary code) is refused.
export const ALLOWED_TOOLS = [
  "Read", "Edit", "Write", "Glob", "Grep", "WebSearch", "WebFetch", "Agent", "Task", "Skill", "TodoWrite",
  "Bash(python3 .claude/skills/studio/tools/niche.py:*)",
  "Bash(python3 .claude/skills/studio/tools/new_video.py:*)",
  "Bash(python3 .claude/skills/yt-script/hookscore.py:*)",
  "Bash(python3 .claude/skills/yt-package/title.py:*)",
  "Bash(python3 .claude/skills/yt-chapters/chapters.py:*)",
  "Bash(python3 .claude/skills/yt-edit/deadair.py:*)",
  "Bash(pnpm transcribe:*)",
  // Edit stage (approved by the creator, 2026-11-17): context packs, the designer's check stills, and assembly.
  "Bash(node scripts/beat-context.mjs:*)",
  "Bash(node scripts/render-stills.mjs:*)",
  "Bash(node scripts/assemble.mjs:*)",
  // Cut route and package stage (approved by the creator, 2026-11-25): check, render and measure. `pnpm upload` is never on this list.
  "Bash(pnpm cut:check:*)",
  "Bash(pnpm cut:render:*)",
  "Bash(pnpm music:beats:*)",
  "Bash(node scripts/motion-qa.mjs:*)",
  "Bash(pnpm thumb:render:*)",
  "Bash(pnpm package:check:*)",
];

// `resume`: this job continues a run the usage limit stopped. With a session id it switches that session back in; without one (the session couldn't be resumed) it starts fresh but is told what was already done.
type Resume = { sessionId: string | null; from: string; checkpoint: RunCheckpoint };
type Job = { id: string; videoId: string; kind: "next" | "message"; text?: string; queuedAt: string; resume?: Resume };
type Persisted = { queue: Job[]; pausedUntil: string | null; usage: Usage | null };

const STATE_FILE = path.join(VIDEOS_DIR, ".studio-runner.json");
const FEED_LIMIT = 400;

let state: Persisted = { queue: [], pausedUntil: null, usage: null };
let active: { job: Job; child: ChildProcess; summary: RunSummary } | null = null;
let wakeTimer: NodeJS.Timeout | null = null;

const now = () => new Date().toISOString();
const ceiling = () => env.STUDIO_USAGE_CEILING;

function save(): void {
  mkdirSync(VIDEOS_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function runnerStatus(): RunnerStatus {
  return {
    active: active ? { videoId: active.job.videoId, runId: active.job.id } : null,
    queued: state.queue.length,
    pausedUntil: state.pausedUntil,
    usage: state.usage,
    ceiling: ceiling(),
  };
}

function broadcast(videoId?: string): void {
  emit({ type: "runner", status: runnerStatus() });
  if (videoId) emit({ type: "studio", videoId });
}

function runsDir(videoId: string): string {
  const dir = path.join(videoDir(videoId), ".runs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeSummary(summary: RunSummary): void {
  writeFileSync(path.join(runsDir(summary.videoId), `${summary.id}.json`), JSON.stringify(summary, null, 2));
}

export function listRuns(videoId: string, limit = 10): RunSummary[] {
  const dir = path.join(videoDir(videoId), ".runs");
  if (!existsSync(dir)) return [];
  const runs = readdirSync(dir)
    .filter((name) => name.endsWith(".json") && name !== "session.json")
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as RunSummary)
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
  const live = active?.job.videoId === videoId ? active.summary : null;
  return (live ? [live, ...runs.filter((run) => run.id !== live.id)] : runs).slice(0, limit);
}

export function isRunning(videoId: string): boolean {
  return active?.job.videoId === videoId || state.queue.some((job) => job.videoId === videoId);
}

function sessionFile(videoId: string): string {
  return path.join(runsDir(videoId), "session.json");
}

function lastSession(videoId: string): string | null {
  const file = sessionFile(videoId);
  return existsSync(file) ? ((JSON.parse(readFileSync(file, "utf8")) as { sessionId?: string }).sessionId ?? null) : null;
}

function modeOf(videoId: string): VideoMode {
  return parseStatus(readFileSync(path.join(videoDir(videoId), "status.md"), "utf8")).mode;
}

function stageSnapshot(videoId: string): string {
  const { stages } = parseStatus(readFileSync(path.join(videoDir(videoId), "status.md"), "utf8"));
  return JSON.stringify(stages.map((stage) => [stage.name, stage.state]));
}

// What a resumed run is told: where it stopped, its own task list, and the files it had already written.
function resumeNote(r: Resume): string {
  const todos = r.checkpoint.todos.map((t) => `- [${t.status === "completed" ? "x" : t.status === "in_progress" ? "~" : " "}] ${t.content}`).join("\n");
  const files = r.checkpoint.files.slice(-20).map((f) => `- ${f}`).join("\n");
  return [
    `You were paused by the Pro usage limit${r.checkpoint.pausedAt ? ` at ${r.checkpoint.pausedAt}` : ""} and are being resumed. Continue exactly where you stopped. Don't redo finished work: check the files below first, then carry on with the first unfinished step.`,
    todos ? `Your task list when you stopped ([x] done, [~] in progress):\n${todos}` : "",
    files ? `Files you had written or edited:\n${files}` : "",
  ].filter(Boolean).join("\n\n");
}

export function buildArgs(job: Job, mode: VideoMode, resume: string | null): string[] {
  // Decision: a run from the website is never "chat" mode, since nobody can answer AskUserQuestion mid-run.
  const runMode = mode === "chat" ? "gated" : mode;
  const base =
    job.kind === "next"
      ? `[studio-run mode=${runMode}] /studio next videos/${job.videoId}`
      : `[studio-run mode=${runMode}] The creator sent this from the studio website about videos/${job.videoId}:\n"""\n${job.text ?? ""}\n"""\nAnswer them briefly. If it changes the video, update the files and log it in status.md. Don't start the next stage unless they ask.`;
  const prompt = job.resume ? (job.resume.sessionId ? `[studio-run mode=${runMode}] ${resumeNote(job.resume)}` : `${base}\n\n${resumeNote(job.resume)}`) : base;
  const args = [
    "-p", prompt,
    "--output-format", "stream-json", "--verbose",
    "--model", env.STUDIO_MODEL, "--effort", env.STUDIO_EFFORT,
    "--setting-sources", "project",
    "--permission-mode", "acceptEdits",
    "--add-dir", path.join(homedir(), ".claude", "youtube"),
    "--allowedTools", ...ALLOWED_TOOLS,
  ];
  if (job.resume?.sessionId) args.push("--resume", job.resume.sessionId);
  else if (resume && job.kind === "message") args.push("--resume", resume);
  return args;
}

// Updates the checkpoint from one stream event: the agent's task list (TodoWrite) and every file written or edited, its own or a subagent's. True when something changed.
export function recordCheckpoint(cp: RunCheckpoint, event: StreamEvent): boolean {
  const blocks = Array.isArray(event.message?.content) ? event.message.content : [];
  let changed = false;
  for (const block of blocks as { type?: string; name?: string; input?: Record<string, unknown> }[]) {
    if (block.type !== "tool_use" || !block.input) continue;
    if (block.name === "TodoWrite" && Array.isArray(block.input.todos) && !event.parent_tool_use_id) {
      cp.todos = (block.input.todos as RunTodo[]).map((t) => ({ content: String(t.content), status: t.status }));
      changed = true;
    }
    if ((block.name === "Write" || block.name === "Edit") && typeof block.input.file_path === "string") {
      const rel = path.relative(ROOT_DIR, block.input.file_path);
      if (!cp.files.includes(rel)) {
        cp.files.push(rel);
        changed = true;
      }
    }
  }
  return changed;
}

function feed(summary: RunSummary, line: Omit<FeedLine, "at">): void {
  const full: FeedLine = { at: now(), ...line };
  summary.feed.push(full);
  if (summary.feed.length > FEED_LIMIT) summary.feed.splice(0, summary.feed.length - FEED_LIMIT);
  emit({ type: "studio-feed", videoId: summary.videoId, runId: summary.id, line: full });
}

function pauseUntil(iso: string, summary?: RunSummary): void {
  state.pausedUntil = iso;
  save();
  if (summary) feed(summary, { kind: "pause", text: `paused: Pro usage limit reached, resuming at ${new Date(iso).toLocaleTimeString()}` });
  scheduleWake();
  broadcast(summary?.videoId);
}

function scheduleWake(): void {
  if (wakeTimer) clearTimeout(wakeTimer);
  if (!state.pausedUntil) return;
  const remaining = Date.parse(state.pausedUntil) - Date.now();
  // Decision: Node timers overflow past ~24.8 days and would fire at once, so long pauses wake early and re-check.
  const delay = Math.min(Math.max(1000, remaining), 2 ** 31 - 1);
  wakeTimer = setTimeout(() => {
    if (state.pausedUntil && Date.parse(state.pausedUntil) > Date.now() + 1000) return scheduleWake();
    state.pausedUntil = null;
    save();
    broadcast();
    pump();
  }, delay);
}

function shouldChain(videoId: string, before: string): boolean {
  if (readQuestions(videoId)) return false;
  const { mode, stages } = parseStatus(readFileSync(path.join(videoDir(videoId), "status.md"), "utf8"));
  if (mode === "chat") return false;
  const current = currentStage(stages);
  if (!current || !isBuilt(current) || CREATOR_STAGES.has(current.name)) return false;
  if (/waiting|needs changes/.test(current.state)) return false;
  return stageSnapshot(videoId) !== before;
}

function start(job: Job): void {
  const mode = modeOf(job.videoId);
  const checkpoint: RunCheckpoint = job.resume
    ? { ...job.resume.checkpoint, pausedAt: null, resumeAt: null, resumedFrom: job.resume.from }
    : { todos: [], files: [], pausedAt: null, resumeAt: null, resumedFrom: null };
  const summary: RunSummary = { id: job.id, videoId: job.videoId, kind: job.kind, state: "running", startedAt: now(), endedAt: null, costUsd: null, feed: [], sessionId: job.resume?.sessionId ?? null, checkpoint };
  const before = stageSnapshot(job.videoId);
  const rawLog = path.join(runsDir(job.videoId), `${job.id}.jsonl`);
  const child = spawn(env.CLAUDE_CLI_PATH, buildArgs(job, mode, lastSession(job.videoId)), {
    cwd: ROOT_DIR,
    // Decision: subagents must run in the foreground here. In a headless run, background subagents are killed the moment the showrunner writes its final answer, so it would "finish" with nothing built.
    env: { ...process.env, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  active = { job, child, summary };
  feed(summary, {
    kind: "start",
    text: job.resume ? `resuming where the usage limit stopped it${job.resume.sessionId ? "" : " (fresh session, with the saved checkpoint)"}` : job.kind === "next" ? `running the next stage (${mode} mode)` : `sending your message to the showrunner`,
  });
  writeSummary(summary);
  broadcast(job.videoId);

  let limited: { resetsAt: string | null } | null = null;
  let ok = false;
  let stderr = "";
  createInterface({ input: child.stdout! }).on("line", (line) => {
    if (!line.trim()) return;
    appendFileSync(rawLog, `${line}\n`);
    let event: StreamEvent;
    try {
      event = JSON.parse(line) as StreamEvent;
    } catch {
      return;
    }
    const read = interpret(event);
    if (read.sessionId) {
      writeFileSync(sessionFile(job.videoId), JSON.stringify({ sessionId: read.sessionId }));
      summary.sessionId = read.sessionId;
    }
    if (recordCheckpoint(checkpoint, event)) writeSummary(summary);
    if (read.usage) {
      state.usage = { ...read.usage, checkedAt: now() };
      save();
      emit({ type: "runner", status: runnerStatus() });
    }
    if (read.limited) limited = limited?.resetsAt ? limited : read.limited;
    if (read.result) {
      ok = read.result.ok;
      summary.costUsd = read.result.costUsd;
    }
    for (const entry of read.lines) feed(summary, entry);
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });
  child.on("error", (error) => {
    feed(summary, { kind: "error", text: `couldn't start Claude Code (${error.message}). Is \`claude\` installed and logged in?` });
  });
  child.on("close", (code) => {
    const stoppedByCreator = summary.state === "stopped";
    summary.endedAt = now();
    // A resumed session that no longer exists fails at once: run it again fresh, still carrying the checkpoint.
    const lostSession = job.resume?.sessionId && !ok && /no conversation found|session.*not found/i.test(`${stderr} ${summary.feed.slice(-3).map((l) => l.text).join(" ")}`);
    if (limited) {
      summary.state = "paused";
      const until = resumeTime(limited);
      checkpoint.pausedAt = now();
      checkpoint.resumeAt = until;
      state.queue.unshift({ ...job, id: nanoid(10), queuedAt: now(), resume: { sessionId: summary.sessionId ?? null, from: summary.id, checkpoint: { ...checkpoint } } });
      pauseUntil(until, summary);
    } else if (lostSession) {
      summary.state = "failed";
      feed(summary, { kind: "error", text: "the paused session couldn't be resumed; starting it again with the saved checkpoint" });
      state.queue.unshift({ ...job, id: nanoid(10), queuedAt: now(), resume: { sessionId: null, from: job.resume!.from, checkpoint: { ...checkpoint } } });
    } else if (!stoppedByCreator) {
      summary.state = ok && code === 0 ? "done" : "failed";
      if (summary.state === "failed" && stderr.trim()) feed(summary, { kind: "error", text: stderr.trim().split("\n").slice(-3).join(" ") });
    }
    writeSummary(summary);
    active = null;
    if (summary.state === "done" && job.kind === "next" && shouldChain(job.videoId, before)) {
      enqueue(job.videoId, "next");
    } else {
      save();
      broadcast(job.videoId);
    }
    pump();
  });
}

function pump(): void {
  if (active || state.queue.length === 0) return;
  if (state.pausedUntil && Date.parse(state.pausedUntil) > Date.now()) return scheduleWake();
  if (state.usage?.fiveHour != null && state.usage.fiveHour >= ceiling() && state.usage.resetsAt && Date.parse(state.usage.resetsAt) > Date.now()) {
    return pauseUntil(new Date(Date.parse(state.usage.resetsAt) + 60_000).toISOString());
  }
  const job = state.queue.shift()!;
  save();
  try {
    start(job);
  } catch (error) {
    active = null;
    console.error(`studio run for ${job.videoId} failed to start`, error);
    broadcast(job.videoId);
    pump();
  }
}

export function enqueue(videoId: string, kind: "next" | "message", text?: string): Job {
  videoDir(videoId);
  if (kind === "next") {
    const current = currentStage(parseStatus(readFileSync(path.join(videoDir(videoId), "status.md"), "utf8")).stages);
    if (current && CREATOR_STAGES.has(current.name)) throw new StepError(`The ${current.name} stage is yours: open the Record page`, false);
  }
  if (kind === "next" && (active?.job.videoId === videoId || state.queue.some((job) => job.videoId === videoId && job.kind === "next"))) {
    throw new Error("This video already has a stage running or queued");
  }
  const job: Job = { id: nanoid(10), videoId, kind, text, queuedAt: now() };
  state.queue.push(job);
  save();
  broadcast(videoId);
  pump();
  return job;
}

export function stop(videoId: string): void {
  state.queue = state.queue.filter((job) => job.videoId !== videoId);
  save();
  if (active?.job.videoId === videoId) {
    active.summary.state = "stopped";
    feed(active.summary, { kind: "error", text: "stopped by the creator" });
    active.child.kill("SIGTERM");
  }
  broadcast(videoId);
}

// Decision: Claude Code only reports Pro usage alongside a real request, so a refresh sends the smallest one possible:
// Haiku, no tools, a one-line system prompt, from an empty temp folder (measured: ~900 tokens, ~3 s). It also sees usage
// from the creator's own Claude Code sessions, which studio runs alone can't.
const PROBE_MODEL = "claude-haiku-5-5";
let probing: Promise<RunnerStatus> | null = null;

export function refreshUsage(): Promise<RunnerStatus> {
  probing ??= (async () => {
    try {
      const { stdout, stderr, code } = await exec(
        env.CLAUDE_CLI_PATH,
        ["-p", "Reply with OK.", "--model", PROBE_MODEL, "--output-format", "stream-json", "--verbose", "--tools", "", "--system-prompt", "Reply with OK.",
          "--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands", "--max-turns", "1"],
        { cwd: tmpdir(), timeoutMs: 45_000 },
      );
      let usage: Omit<Usage, "checkedAt"> | null = null;
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        try {
          usage = interpret(JSON.parse(line) as StreamEvent).usage ?? usage;
        } catch {
          // not a JSON event line
        }
      }
      if (!usage) throw new StepError(code === 0 ? "Claude Code didn't report usage this time. Try again in a minute." : `Couldn't reach Claude Code: ${(stderr || stdout).trim().slice(-200)}`, false);
      state.usage = { ...usage, checkedAt: now() };
      save();
      broadcast();
      return runnerStatus();
    } finally {
      probing = null;
    }
  })();
  return probing;
}

export function resumeNow(): void {
  state.pausedUntil = null;
  save();
  broadcast();
  pump();
}

export function startStudioRunner(): void {
  if (existsSync(STATE_FILE)) {
    try {
      state = { ...state, ...(JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<Persisted>) };
    } catch {
      state = { queue: [], pausedUntil: null, usage: null };
    }
  }
  scheduleWake();
  pump();
}
