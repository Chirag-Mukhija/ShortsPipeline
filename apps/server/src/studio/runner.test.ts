// Tests the studio runner against a fake `claude` that speaks stream-json: event parsing, chaining stages, sessions, and pausing at the usage limit.
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30_000 });

const root = mkdtempSync(path.join(tmpdir(), "studio-runner-"));
const videosDir = path.join(root, "videos");
const fakeClaude = path.join(root, "fake-claude.mjs");
const argsLog = path.join(root, "args.jsonl");
process.env.STUDIO_VIDEOS_DIR = videosDir;
process.env.CLAUDE_CLI_PATH = fakeClaude;
process.env.FAKE_ARGS_LOG = argsLog;

// Behaves like a studio run: marks the first unfinished stage done, unless FAKE_CLAUDE=limit, where it hits the Pro limit.
writeFileSync(
  fakeClaude,
  `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_ARGS_LOG, JSON.stringify(args) + "\\n");
const prompt = args[args.indexOf("-p") + 1];
if (prompt === "Reply with OK.") {
  process.stdout.write(JSON.stringify({ type: "rate_limit_event", rate_limit_info: { status: "allowed", unifiedWindows: { five_hour: { utilization: 0.67, resetsAt: 4102444800 }, seven_day: { utilization: 0.44 } } } }) + "\\n");
  process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "OK" }) + "\\n");
  process.exit(0);
}
const folder = /videos\\/(\\d{3}-[a-z0-9-]+)/.exec(prompt)[1];
const file = process.env.STUDIO_VIDEOS_DIR + "/" + folder + "/status.md";
const out = (e) => process.stdout.write(JSON.stringify(e) + "\\n");
out({ type: "system", subtype: "init", session_id: "sess-" + folder });
out({ type: "assistant", parent_tool_use_id: null, message: { content: [{ type: "text", text: "Working on it." }, { type: "tool_use", name: "Agent", input: { subagent_type: "researcher", description: "Research the idea" } }] } });
if (readFileSync(file, "utf8").includes("LIMIT")) {
  out({ type: "assistant", parent_tool_use_id: null, message: { content: [{ type: "tool_use", name: "TodoWrite", input: { todos: [{ content: "Build beat 3", status: "completed" }, { content: "Build beat 4", status: "in_progress" }] } }] } });
  out({ type: "assistant", parent_tool_use_id: null, message: { content: [{ type: "tool_use", name: "Write", input: { file_path: process.cwd() + "/videos/" + folder + "/edit/scenes/beat-03.tsx", content: "x" } }] } });
  out({ type: "rate_limit_event", rate_limit_info: { status: "rejected", resetsAt: 4102444800, unifiedWindows: { five_hour: { utilization: 1, resetsAt: 4102444800 } } } });
  out({ type: "result", subtype: "error_during_execution", is_error: true, result: "Claude AI usage limit reached" });
  process.exit(1);
}
const md = readFileSync(file, "utf8").split("\\n");
const i = md.findIndex((l) => l.startsWith("| ") && !l.startsWith("| Stage") && !l.includes("| done |"));
const cells = md[i].split("|"); cells[2] = " done "; md[i] = cells.join("|");
writeFileSync(file, md.join("\\n"));
out({ type: "rate_limit_event", rate_limit_info: { status: "allowed", unifiedWindows: { five_hour: { utilization: 0.31, resetsAt: 4102444800 }, seven_day: { utilization: 0.05 } } } });
out({ type: "result", subtype: "success", is_error: false, result: "Stage done.", total_cost_usd: 0.12 });
`,
);
chmodSync(fakeClaude, 0o755);

let videos: typeof import("./videos");
let runner: typeof import("./runner");
let events: typeof import("./runEvents");

beforeAll(async () => {
  videos = await import("./videos");
  runner = await import("./runner");
  events = await import("./runEvents");
  runner.startStudioRunner();
});

const settle = async (check: () => boolean, ms = 15_000) => {
  const until = Date.now() + ms;
  while (!check()) {
    if (Date.now() > until) throw new Error("timed out waiting for the runner");
    await new Promise((done) => setTimeout(done, 50));
  }
};

const statusOf = (id: string) => videos.parseStatus(readFileSync(path.join(videosDir, id, "status.md"), "utf8"));

describe("interpret", () => {
  it("turns stream-json into feed lines, usage and outcome", () => {
    expect(events.interpret({ type: "system", subtype: "task_started", subagent_type: "researcher", description: "Research the idea" }).lines).toEqual([
      { kind: "agent", text: "researcher is working: Research the idea" },
    ]);
    expect(events.interpret({ type: "assistant", parent_tool_use_id: null, message: { content: [{ type: "tool_use", name: "WebSearch", input: { query: "claude code video" } }] } }).lines[0]?.text).toBe(
      "searching the web: claude code video",
    );
    expect(events.interpret({ type: "assistant", parent_tool_use_id: "toolu_1", message: { content: [{ type: "text", text: "inner" }] } }).lines).toEqual([]);
    const usage = events.interpret({ type: "rate_limit_event", rate_limit_info: { status: "allowed", unifiedWindows: { five_hour: { utilization: 0.42, resetsAt: 1794311400 }, seven_day: { utilization: 0.1 } } } });
    expect(usage.usage).toEqual({ fiveHour: 0.42, sevenDay: 0.1, resetsAt: new Date(1794311400 * 1000).toISOString() });
    expect(usage.limited).toBeUndefined();
    expect(events.interpret({ type: "result", subtype: "error_during_execution", is_error: true, result: "Claude AI usage limit reached" }).limited).toEqual({ resetsAt: null });
  });

  it("resumes a minute after a known reset, or re-checks in 30 minutes when the reset is unknown", () => {
    const now = Date.parse("2026-11-10T10:00:00Z");
    expect(events.resumeTime({ resetsAt: "2026-11-10T12:00:00.000Z" }, now)).toBe("2026-11-10T12:01:00.000Z");
    expect(events.resumeTime({ resetsAt: null }, now)).toBe("2026-11-10T10:30:00.000Z");
  });
});

describe("refreshUsage", () => {
  it("reads current Pro usage from the smallest possible request: Haiku, no tools", async () => {
    const status = await runner.refreshUsage();
    expect(status.usage).toMatchObject({ fiveHour: 0.67, sevenDay: 0.44 });
    const args = readFileSync(argsLog, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]).at(-1)!;
    expect(args).toEqual(expect.arrayContaining(["--model", "claude-haiku-5-5", "--tools", "", "--no-session-persistence"]));
  });
});

describe("runner", () => {
  it("runs an autonomous video stage after stage until it reaches the record stage, which is the creator's", async () => {
    const id = videos.createVideo("autonomous chain test", "autonomous");
    runner.enqueue(id, "next");
    await settle(() => statusOf(id).stages.find((s) => s.name === "script")?.state === "done" && !runner.isRunning(id));
    expect(statusOf(id).stages.map((s) => s.state).slice(0, 5)).toEqual(["done", "done", "done", "done", "not started"]);
    const runs = runner.listRuns(id);
    expect(runs).toHaveLength(4);
    expect(runs.every((run) => run.state === "done" && run.costUsd === 0.12)).toBe(true);
    expect(runs[0]?.feed.map((line) => line.kind)).toEqual(["start", "start", "text", "agent", "result"]);
    expect(runner.runnerStatus().usage?.fiveHour).toBe(0.31);
  });

  it("stops chaining in gated mode once a stage asks the creator something", async () => {
    const id = videos.createVideo("gated test", "gated");
    writeFileSync(path.join(videosDir, id, "questions.json"), JSON.stringify({ stage: "plan", questions: [{ id: "a", question: "Which?", options: [] }] }));
    runner.enqueue(id, "next");
    await settle(() => !runner.isRunning(id) && runner.listRuns(id)[0]?.state === "done");
    expect(runner.listRuns(id)).toHaveLength(1);
  });

  it("passes the studio's model, allowlist and mode, and resumes the video's session for messages", async () => {
    const id = videos.createVideo("message test", "chat");
    runner.enqueue(id, "next");
    await settle(() => !runner.isRunning(id));
    runner.enqueue(id, "message", "make the hook funnier");
    await settle(() => !runner.isRunning(id) && runner.listRuns(id).length === 2);
    const calls = readFileSync(argsLog, "utf8").trim().split("\n").map((line) => JSON.parse(line) as string[]);
    const [next, message] = calls.slice(-2);
    expect(next).toEqual(expect.arrayContaining(["--model", "claude-opus-5-5", "--setting-sources", "project", "--allowedTools"]));
    expect(next?.[next.indexOf("-p") + 1]).toBe(`[studio-run mode=gated] /studio next videos/${id}`);
    expect(next).not.toContain("--resume");
    expect(message?.[message.indexOf("-p") + 1]).toContain("make the hook funnier");
    expect(message?.slice(message.indexOf("--resume"), message.indexOf("--resume") + 2)).toEqual(["--resume", `sess-${id}`]);
    expect(next).not.toContain("Bash");
    expect(next?.some((arg) => arg.startsWith("Bash(rm") || arg === "Bash(*)")).toBe(false);
    // Uploading is the creator's own action: no run may ever do it, nor run any pnpm script it likes.
    expect(next?.some((arg) => /upload/.test(arg) || /^Bash\(pnpm(:\*| \*|\))/.test(arg))).toBe(false);
    expect(next).toContain("Bash(pnpm cut:render:*)");
  });

  it("pauses the whole queue at the usage limit and re-queues the interrupted stage", async () => {
    const id = videos.createVideo("limit test", "autonomous");
    const file = path.join(videosDir, id, "status.md");
    writeFileSync(file, `${readFileSync(file, "utf8")}\nLIMIT\n`);
    runner.enqueue(id, "next");
    await settle(() => runner.runnerStatus().pausedUntil !== null);
    const status = runner.runnerStatus();
    expect(status.pausedUntil).toBe(new Date(4102444800 * 1000 + 60_000).toISOString());
    expect(status.queued).toBe(1);
    expect(runner.listRuns(id)[0]?.state).toBe("paused");
    expect(runner.listRuns(id)[0]?.feed.at(-1)?.kind).toBe("pause");
    expect(existsSync(path.join(videosDir, ".studio-runner.json"))).toBe(true);
    // The paused run's checkpoint survived, and the re-queued job will switch the same session back in.
    const paused = runner.listRuns(id)[0]!;
    expect(paused.checkpoint?.todos.map((t) => t.status)).toEqual(["completed", "in_progress"]);
    expect(paused.checkpoint?.files.some((f) => f.endsWith("edit/scenes/beat-03.tsx"))).toBe(true);
    expect(paused.checkpoint?.resumeAt).toBe(status.pausedUntil);
    const queued = JSON.parse(readFileSync(path.join(videosDir, ".studio-runner.json"), "utf8")).queue[0];
    expect(queued.resume.sessionId).toBe(`sess-${id}`);
    expect(queued.resume.from).toBe(paused.id);
    runner.stop(id);
    expect(runner.runnerStatus().queued).toBe(0);
  });
});

describe("checkpoints", () => {
  it("records the task list and written files, but not a subagent's own task list", () => {
    const cp = { todos: [], files: [], pausedAt: null, resumeAt: null, resumedFrom: null };
    const todo = (parent: string | null) => ({ type: "assistant", parent_tool_use_id: parent, message: { content: [{ type: "tool_use", name: "TodoWrite", input: { todos: [{ content: parent ? "sub step" : "main step", status: "pending" }] } }] } });
    expect(runner.recordCheckpoint(cp, todo(null))).toBe(true);
    expect(runner.recordCheckpoint(cp, todo("toolu_sub"))).toBe(false);
    expect(cp.todos).toEqual([{ content: "main step", status: "pending" }]);
    runner.recordCheckpoint(cp, { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/x/notes.md" } }] } });
    expect(cp.files).toHaveLength(1);
    expect(runner.recordCheckpoint(cp, { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/x/notes.md" } }] } })).toBe(false);
  });

  it("switches a paused session back in with its checkpoint, or starts fresh with it when there's no session", () => {
    const checkpoint = { todos: [{ content: "Build beat 4", status: "in_progress" as const }], files: ["videos/001/edit/scenes/beat-03.tsx"], pausedAt: "2026-11-23T10:00:00Z", resumeAt: null, resumedFrom: null };
    const job = { id: "j1", videoId: "001-test", kind: "next" as const, queuedAt: "", resume: { sessionId: "sess-1", from: "r0", checkpoint } };
    const resumed = runner.buildArgs(job, "gated", null);
    expect(resumed.slice(resumed.indexOf("--resume"), resumed.indexOf("--resume") + 2)).toEqual(["--resume", "sess-1"]);
    const prompt = resumed[resumed.indexOf("-p") + 1]!;
    expect(prompt).toContain("Continue exactly where you stopped");
    expect(prompt).toContain("[~] Build beat 4");
    expect(prompt).toContain("beat-03.tsx");
    const fresh = runner.buildArgs({ ...job, resume: { ...job.resume, sessionId: null } }, "gated", null);
    expect(fresh).not.toContain("--resume");
    expect(fresh[fresh.indexOf("-p") + 1]).toMatch(/^\[studio-run mode=gated\] \/studio next videos\/001-test\n\nYou were paused/);
  });
});
