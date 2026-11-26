// Builds kit templates unattended, one headless Claude Code run per brief in order: waits out the 5-hour limit and resumes, checks each result itself (typecheck + preview + motion check) and retries a failure once.
// Usage: pnpm kit:build [--max 5] [--weekly 70]   builds queued templates, staying awake; stops after --max, or past --weekly % of the week's usage
//        pnpm kit:stop     stops after the template being built        Ctrl+C stops now and undoes the half-built one
//        pnpm kit:status   what's done, queued and failed
//        tsx scripts/kit-queue.ts add <id>…
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
const flag = (name: string): number | null => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const n = Number(process.argv[i + 1]);
  if (!(n > 0)) {
    console.error(`--${name} needs a number, like --${name} ${name === "max" ? 5 : 70}`);
    process.exit(2);
  }
  return n;
};
const WEEKLY = flag("weekly");
const WEEKLY_CEILING = WEEKLY ? WEEKLY / 100 : Number(process.env.KIT_WEEKLY_CEILING ?? 0.7);
const MAX_BUILDS = flag("max") ?? Infinity;
const MAX_ATTEMPTS = 2;
const DROPS = 3;
const RETRY_MS = Number(process.env.KIT_RETRY_MS ?? 5 * 60_000);

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
  const aside = path.join(KIT, "failed", job.id);
  const saved = existsSync(aside) && !retry ? `\n\nAn earlier attempt was cut off. Its files are in data/library/kit/failed/${job.id}/: read them first and finish that work instead of starting over.` : "";
  return `Build the kit template "${job.id}". Follow .claude/skills/studio/kit-builder.md exactly; your brief is data/library/kit/briefs/${job.id}.md. Work alone: don't dispatch subagents.${retry}${saved}`;
}

// The kit as it was before a job, so a build that fails or is stopped halfway can't leave a broken template registered: that would break every later build and every video render.
const SRC = path.join(ROOT, "packages/video/src/kit");
const SNAP = path.join(KIT, ".before");
let current: ChildProcess | null = null;

function snapshot(): void {
  rmSync(SNAP, { recursive: true, force: true });
  mkdirSync(SNAP, { recursive: true });
  cpSync(path.join(SRC, "templates"), path.join(SNAP, "templates"), { recursive: true });
  cpSync(path.join(SRC, "index.ts"), path.join(SNAP, "index.ts"));
}

// Puts the kit back. What the job had written is kept in data/library/kit/failed/<job>/, never lost.
function undo(jobId: string): void {
  if (!existsSync(path.join(SNAP, "index.ts"))) return;
  const before = new Set(readdirSync(path.join(SNAP, "templates")));
  const aside = path.join(KIT, "failed", jobId);
  const put: string[] = [];
  for (const name of readdirSync(path.join(SRC, "templates"))) {
    const file = path.join(SRC, "templates", name);
    const same = before.has(name) && readFileSync(file, "utf8") === readFileSync(path.join(SNAP, "templates", name), "utf8");
    if (same) continue;
    put.push(name);
    mkdirSync(aside, { recursive: true });
    if (before.has(name)) {
      cpSync(file, path.join(aside, name));
      cpSync(path.join(SNAP, "templates", name), file);
    } else renameSync(file, path.join(aside, name));
  }
  cpSync(path.join(SNAP, "index.ts"), path.join(SRC, "index.ts"));
  rmSync(SNAP, { recursive: true, force: true });
  if (put.length) log(`put the kit back as it was before ${jobId}; its files are in data/library/kit/failed/${jobId}/ (${put.join(", ")})`);
}

// The builder's report names what it did on its first line; briefs written for one template default to that template.
function outcome(jobId: string): { kind: "template" | "extended" | "skipped"; id: string } | null {
  const report = path.join(KIT, "reports", `${jobId}.md`);
  if (!existsSync(report)) return jobId.startsWith("pm-") ? null : { kind: "template", id: jobId };
  const first = readFileSync(report, "utf8").split("\n").find((l) => l.trim()) ?? "";
  const m = /^\s*(template|extended|skipped)\s*:\s*(.+?)\s*$/i.exec(first);
  if (!m) return jobId.startsWith("pm-") ? null : { kind: "template", id: jobId };
  return { kind: m[1]!.toLowerCase() as "template" | "extended" | "skipped", id: m[2]!.replace(/[`*]/g, "") };
}

// What the queue checks itself after a run, so a run that says "done" but left a broken or missing template is caught.
function verify(jobId: string): string | null {
  const result = outcome(jobId);
  if (!result) return "no report with a first line of template:/extended:/skipped:";
  if (result.kind === "skipped") return null;
  const id = result.id;
  if (!/^[a-z0-9-]+$/.test(id)) return `the report names an invalid template id "${id}"`;
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
    current = child;
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
  if (cmd === "stop") {
    writeFileSync(path.join(KIT, "queue.stop"), "");
    console.log("It stops after the template it's building now (about 10 minutes at most). Ctrl+C in its window stops it at once.");
    return;
  }
  if (cmd === "status") {
    const q = read();
    const n = (status: Job["status"]) => q.jobs.filter((j) => j.status === status);
    console.log(`${n("done").length} built, ${n("queued").length} queued, ${n("failed").length} failed${n("running").length ? `, building ${n("running")[0]!.id}` : ""}${q.pausedUntil ? `, waiting until ${new Date(q.pausedUntil).toLocaleString()}` : ""}${q.stoppedBecause ? `, last stopped: ${q.stoppedBecause}` : ""}`);
    for (const j of n("failed")) console.log(`  failed: ${j.id}: ${j.note ?? ""}`);
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
  // A job left "running" was cut off (reboot, crash): put the kit back as it was and run it again.
  for (const j of q0.jobs)
    if (j.status === "running") {
      undo(j.id);
      j.status = "queued";
    }
  q0.stoppedBecause = null;
  rmSync(path.join(KIT, "queue.stop"), { force: true });
  save(q0);
  log(`queue started (pid ${process.pid}), ${q0.jobs.filter((j) => j.status === "queued").length} queued; briefs on disk: ${readdirSync(path.join(KIT, "briefs")).length}`);

  let building: string | null = null;
  let built = 0;
  let dropped = 0;
  const quit = () => {
    current?.kill("SIGTERM");
    const q = read();
    if (building) {
      undo(building);
      const j = q.jobs.find((x) => x.id === building);
      if (j) j.status = "queued";
      save(q);
      log(`stopped by the creator during ${building}; it's back in the queue and the kit is as it was before it`);
    } else log("stopped by the creator");
    writeFileSync(lock, "");
    process.exit(0);
  };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);
  process.on("SIGHUP", quit);

  for (;;) {
    if (built >= MAX_BUILDS) {
      log(`stopping: built ${built}, as asked`);
      break;
    }
    if (existsSync(path.join(KIT, "queue.stop"))) {
      log("stopping: queue.stop is there");
      break;
    }
    const q = read();
    if (q.pausedUntil && Date.parse(q.pausedUntil) > Date.now()) {
      await sleep(Math.min(Date.parse(q.pausedUntil) - Date.now(), 60_000));
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
    // A retry starts from the failed attempt's files, so the snapshot stays the one from before the first attempt.
    if (job.attempts === 0 || !existsSync(SNAP)) snapshot();
    building = job.id;
    const result = await run(job);
    current = null;
    const q2 = read();
    const j = q2.jobs.find((x) => x.id === job.id)!;
    j.endedAt = now();
    j.costUsd = (j.costUsd ?? 0) + (result.cost ?? 0);
    if (result.limited) {
      // Cut off by the usage limit: not the template's fault, so the attempt doesn't count.
      j.status = "queued";
      undo(job.id);
      building = null;
      q2.pausedUntil = resumeTime(result.limited);
      save(q2);
      log(`usage limit reached during ${job.id}; waiting until ${q2.pausedUntil}`);
      continue;
    }
    // The run never finished (no internet, not logged in, a crash): not the template's fault either. Without this, a dropped connection would fail the whole queue in minutes.
    if (!result.ok) {
      j.status = "queued";
      undo(job.id);
      building = null;
      dropped++;
      if (dropped >= DROPS) {
        q2.stoppedBecause = `${DROPS} builds in a row didn't finish: check the internet connection and that "claude" is logged in`;
        save(q2);
        log(`stopping: ${q2.stoppedBecause}`);
        break;
      }
      save(q2);
      log(`${job.id} didn't finish (connection or login?); trying again in ${Math.round(RETRY_MS / 60_000)} min`);
      for (let waited = 0; waited < RETRY_MS && !existsSync(path.join(KIT, "queue.stop")); waited += 2000) await sleep(Math.min(2000, RETRY_MS));
      continue;
    }
    dropped = 0;
    j.attempts += 1;
    const problem = verify(job.id);
    if (!problem) {
      j.status = "done";
      built++;
      rmSync(SNAP, { recursive: true, force: true });
      // The planner only knows the templates on the menu card.
      try {
        execFileSync("pnpm", ["-s", "kit:catalog"], { cwd: ROOT, stdio: "pipe" });
      } catch {
        log("couldn't refresh the menu card; run pnpm kit:catalog");
      }
      const made = outcome(job.id);
      j.note = made && made.id !== job.id ? `${made.kind}: ${made.id}` : undefined;
      log(`${job.id} done${j.note ? ` (${j.note})` : ""} ($${(result.cost ?? 0).toFixed(2)} list price${result.weekly != null ? `, weekly usage ${Math.round(result.weekly * 100)}%` : ""})`);
    } else {
      j.note = problem;
      j.status = j.attempts >= MAX_ATTEMPTS ? "failed" : "queued";
      if (j.status === "failed") undo(job.id);
      log(`${job.id}: ${problem}${j.status === "failed" ? "; giving up on it" : "; retrying once"}`);
    }
    building = null;
    save(q2);
    if (result.weekly != null && result.weekly >= WEEKLY_CEILING) {
      q2.stoppedBecause = `weekly usage at ${Math.round(result.weekly * 100)}% (ceiling ${Math.round(WEEKLY_CEILING * 100)}%)`;
      save(q2);
      log(`stopping: ${q2.stoppedBecause}`);
      break;
    }
  }
  // A failed attempt waiting for its retry must not stay registered while nothing is running.
  const waiting = read().jobs.find((j) => j.status === "queued" && j.attempts > 0);
  if (waiting) undo(waiting.id);
  writeFileSync(lock, "");
}

void main();
