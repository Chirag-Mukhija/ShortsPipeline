// Builds kit templates unattended, one headless Claude Code run per brief in order: waits out the 5-hour limit and resumes, checks each result itself (typecheck + preview + motion check) and retries a failure once.
// Usage: apps/server/node_modules/.bin/tsx scripts/kit-queue.ts [add <id>…]   (run under `caffeinate -i` so the Mac stays awake)
import { spawn, execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { interpret, resumeTime, type StreamEvent } from "../apps/server/src/studio/runEvents";

const ROOT = path.resolve(import.meta.dirname, "..");
const KIT = path.join(ROOT, "data/library/kit");
const QUEUE = path.join(KIT, "queue.json");
const LOGS = path.join(KIT, "logs");
const CLAUDE = process.env.CLAUDE_CLI_PATH ?? "claude";
const MODEL = "claude-opus-5-5";
// Stop for good once the weekly window passes this share, so the creator comes back to some room.
const WEEKLY_CEILING = Number(process.env.KIT_WEEKLY_CEILING ?? 0.95);
const MAX_ATTEMPTS = 2;

type Job = { id: string; status: "queued" | "running" | "done" | "failed"; attempts: number; startedAt?: string; endedAt?: string; costUsd?: number; note?: string };
type Queue = { jobs: Job[]; pausedUntil?: string | null; stoppedBecause?: string | null };

const now = () => new Date().toISOString();
const log = (line: string) => {
  const text = `${now()}  ${line}`;
  console.log(text);
  appendFileSync(path.join(LOGS, "queue.log"), `${text}\n`);
};
const read = (): Queue => (existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, "utf8")) : { jobs: [] });
const save = (q: Queue) => writeFileSync(QUEUE, `${JSON.stringify(q, null, 2)}\n`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ALLOWED = [
  "Read", "Write", "Edit", "Glob", "Grep",
  "Bash(pnpm --filter @clipforge/video typecheck)",
  "Bash(node scripts/kit-preview.mjs:*)",
  "Bash(node scripts/motion-qa.mjs:*)",
  "Bash(ls:*)",
];

function prompt(job: Job): string {
  const retry = job.note && job.attempts > 0 ? `\n\nThis is a retry. The previous attempt ended with: ${job.note}\nStart from what is already in the file if it exists; fix that.` : "";
  return `Build the kit template "${job.id}". Follow .claude/skills/studio/kit-builder.md exactly; your brief is data/library/kit/briefs/${job.id}.md. Work alone: don't dispatch subagents.${retry}`;
}

// What the queue checks itself after a run, so a run that says "done" but left a broken or missing template is caught.
function verify(id: string): string | null {
  const file = path.join(ROOT, "packages/video/src/kit/templates", `${id}.tsx`);
  if (!existsSync(file)) return "the template file was not written";
  if (!readFileSync(path.join(ROOT, "packages/video/src/kit/index.ts"), "utf8").includes(`./templates/${id}"`)) return "the template is not registered in kit/index.ts";
  try {
    execFileSync("pnpm", ["--filter", "@clipforge/video", "typecheck"], { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    return `typecheck fails: ${String((e as { stdout?: Buffer }).stdout ?? "").split("\n").filter((l) => l.includes("error")).slice(0, 3).join(" | ")}`;
  }
  try {
    execFileSync("node", ["scripts/kit-preview.mjs", id], { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    const out = String((e as { stdout?: Buffer }).stdout ?? "");
    return out.includes("red") ? `motion check has red flags: ${out.split("\n").filter((l) => l.includes("RED")).slice(0, 3).join(" | ")}` : `preview failed: ${out.slice(-300)}`;
  }
  return null;
}

function run(job: Job): Promise<{ limited: { resetsAt: string | null } | null; ok: boolean; cost: number | null; weekly: number | null }> {
  return new Promise((resolve) => {
    const args = ["-p", prompt(job), "--output-format", "stream-json", "--verbose", "--model", MODEL, "--setting-sources", "project", "--permission-mode", "acceptEdits", "--allowedTools", ...ALLOWED];
    const child = spawn(CLAUDE, args, { cwd: ROOT, env: { ...process.env, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    const raw = path.join(LOGS, `${job.id}.jsonl`);
    let limited: { resetsAt: string | null } | null = null;
    let ok = false;
    let cost: number | null = null;
    let weekly: number | null = null;
    createInterface({ input: child.stdout! }).on("line", (line) => {
      if (!line.trim()) return;
      appendFileSync(raw, `${line}\n`);
      let event: StreamEvent;
      try {
        event = JSON.parse(line) as StreamEvent;
      } catch {
        return;
      }
      const r = interpret(event);
      if (r.usage?.sevenDay != null) weekly = r.usage.sevenDay;
      if (r.limited) limited = limited?.resetsAt ? limited : r.limited;
      if (r.result) {
        ok = r.result.ok;
        cost = r.result.costUsd;
      }
    });
    child.stderr!.on("data", (chunk: Buffer) => appendFileSync(raw, `# stderr ${chunk.toString()}`));
    child.on("error", (error) => {
      log(`couldn't start claude: ${error.message}`);
      resolve({ limited: null, ok: false, cost: null, weekly });
    });
    child.on("close", () => resolve({ limited, ok, cost, weekly }));
  });
}

async function main() {
  mkdirSync(LOGS, { recursive: true });
  const [cmd, ...ids] = process.argv.slice(2);
  if (cmd === "add") {
    const q = read();
    for (const id of ids) if (!q.jobs.some((j) => j.id === id)) q.jobs.push({ id, status: "queued", attempts: 0 });
    save(q);
    log(`queued: ${ids.join(", ")}`);
    return;
  }
  const lock = path.join(KIT, "queue.pid");
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8"));
    // An empty or stale lock (a finished, crashed or rebooted run) doesn't block; pid 0 would signal our own process group.
    let alive = false;
    if (pid > 0) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive) {
      console.error(`The queue is already running (pid ${pid}).`);
      process.exit(1);
    }
  }
  writeFileSync(lock, String(process.pid));
  const q0 = read();
  // A job left "running" was cut off (reboot, crash): run it again.
  for (const j of q0.jobs) if (j.status === "running") j.status = "queued";
  q0.stoppedBecause = null;
  save(q0);
  log(`queue started (pid ${process.pid}), ${q0.jobs.filter((j) => j.status === "queued").length} queued; briefs on disk: ${readdirSync(path.join(KIT, "briefs")).length}`);

  for (;;) {
    const q = read();
    if (q.pausedUntil && Date.parse(q.pausedUntil) > Date.now()) {
      await sleep(Math.min(Date.parse(q.pausedUntil) - Date.now(), 10 * 60_000));
      continue;
    }
    const job = q.jobs.find((j) => j.status === "queued");
    if (!job) {
      log("nothing left to build; the queue stops");
      break;
    }
    job.status = "running";
    job.startedAt = now();
    q.pausedUntil = null;
    save(q);
    log(`building ${job.id} (attempt ${job.attempts + 1})`);
    const result = await run(job);
    const q2 = read();
    const j = q2.jobs.find((x) => x.id === job.id)!;
    j.endedAt = now();
    j.costUsd = (j.costUsd ?? 0) + (result.cost ?? 0);
    if (result.limited) {
      // Cut off by the usage limit: not the template's fault, so the attempt doesn't count.
      j.status = "queued";
      q2.pausedUntil = resumeTime(result.limited);
      save(q2);
      log(`usage limit reached during ${job.id}; waiting until ${q2.pausedUntil}`);
      continue;
    }
    j.attempts += 1;
    const problem = verify(job.id);
    if (!problem) {
      j.status = "done";
      j.note = undefined;
      log(`${job.id} done ($${(result.cost ?? 0).toFixed(2)} list price)`);
    } else {
      j.note = problem;
      j.status = j.attempts >= MAX_ATTEMPTS ? "failed" : "queued";
      log(`${job.id}: ${problem}${j.status === "failed" ? "; giving up on it" : "; retrying once"}`);
    }
    save(q2);
    if (result.weekly != null && result.weekly >= WEEKLY_CEILING) {
      q2.stoppedBecause = `weekly usage at ${Math.round(result.weekly * 100)}% (ceiling ${Math.round(WEEKLY_CEILING * 100)}%)`;
      save(q2);
      log(`stopping: ${q2.stoppedBecause}`);
      break;
    }
  }
  writeFileSync(lock, "");
}

void main();
