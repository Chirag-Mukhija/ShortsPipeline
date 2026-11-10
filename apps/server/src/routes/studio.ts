// HTTP API for the studio website: videos and their artifacts, creator decisions, agent runs, the inbox, and voice-note ideas.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import { INBOX_INTENTS, VIDEO_MODES, type VideoDetail } from "@clipforge/schema";
import { StepError } from "../pipeline/errors";
import { enqueue, isRunning, listRuns, resumeNow, runnerStatus, stop } from "../studio/runner";
import {
  addInboxItem,
  addNotes,
  answerQuestions,
  approveStage,
  createVideo,
  listFiles,
  listInbox,
  listVideoIds,
  parseStatus,
  readQuestions,
  readTextFile,
  setMode,
  summarize,
  videoDir,
  writeArtifact,
} from "../studio/videos";
import { transcribeRecording } from "../tts/whisperAlign";

export const studio = new Hono();

const body = async <T extends z.ZodType>(c: { req: { json: () => Promise<unknown> } }, schema: T): Promise<z.infer<T>> => {
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw new StepError(parsed.error.issues.map((issue) => issue.message).join("; "), false);
  return parsed.data;
};

function detail(id: string): VideoDetail {
  const { stages, decisions, notes } = parseStatus(readFileSync(path.join(videoDir(id), "status.md"), "utf8"));
  return {
    ...summarize(id, isRunning(id)),
    stages,
    decisions,
    notes,
    files: listFiles(id),
    questions: readQuestions(id),
    inbox: listInbox(id),
    runs: listRuns(id),
  };
}

// Decision: a creator action that unblocks a video (answering, approving, giving notes) starts its next run right away,
// unless something is already running or queued for it.
function continueVideo(id: string): void {
  if (!isRunning(id)) enqueue(id, "next");
}

studio.get("/studio/videos", (c) =>
  c.json(
    listVideoIds()
      .map((id) => summarize(id, isRunning(id)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  ),
);

studio.post("/studio/videos", async (c) => {
  const input = await body(c, z.object({ idea: z.string().trim().min(3, "Describe the idea in a few words"), mode: z.enum(VIDEO_MODES).default("gated"), start: z.boolean().default(true) }));
  const id = createVideo(input.idea, input.mode);
  if (input.start) enqueue(id, "next");
  return c.json(detail(id), 201);
});

studio.get("/studio/videos/:id", (c) => c.json(detail(c.req.param("id"))));

studio.get("/studio/videos/:id/file", (c) => c.text(readTextFile(c.req.param("id"), c.req.query("path") ?? "")));

studio.put("/studio/videos/:id/file", async (c) => {
  const input = await body(c, z.object({ path: z.string(), content: z.string() }));
  writeArtifact(c.req.param("id"), input.path, input.content);
  return c.json(detail(c.req.param("id")));
});

studio.post("/studio/videos/:id/mode", async (c) => {
  const input = await body(c, z.object({ mode: z.enum(VIDEO_MODES) }));
  setMode(c.req.param("id"), input.mode);
  return c.json(detail(c.req.param("id")));
});

studio.post("/studio/videos/:id/answers", async (c) => {
  const id = c.req.param("id");
  const input = await body(c, z.object({ answers: z.record(z.string(), z.string()) }));
  answerQuestions(id, input.answers);
  continueVideo(id);
  return c.json(detail(id));
});

studio.post("/studio/videos/:id/approve", async (c) => {
  const id = c.req.param("id");
  const input = await body(c, z.object({ stage: z.string(), note: z.string().optional() }));
  approveStage(id, input.stage, input.note);
  continueVideo(id);
  return c.json(detail(id));
});

studio.post("/studio/videos/:id/notes", async (c) => {
  const id = c.req.param("id");
  const input = await body(c, z.object({ stage: z.string(), notes: z.string().trim().min(2, "Write a note first") }));
  addNotes(id, input.stage, input.notes);
  continueVideo(id);
  return c.json(detail(id));
});

studio.post("/studio/videos/:id/run", (c) => {
  enqueue(c.req.param("id"), "next");
  return c.json(detail(c.req.param("id")));
});

studio.post("/studio/videos/:id/stop", (c) => {
  stop(c.req.param("id"));
  return c.json(detail(c.req.param("id")));
});

studio.post("/studio/videos/:id/message", async (c) => {
  const input = await body(c, z.object({ text: z.string().trim().min(2, "Write a message first") }));
  enqueue(c.req.param("id"), "message", input.text);
  return c.json(detail(c.req.param("id")));
});

studio.post("/studio/videos/:id/inbox", async (c) => {
  const id = c.req.param("id");
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new StepError("Attach a file", false);
  const intent = String(form.intent ?? "reference");
  addInboxItem(id, file.name, Buffer.from(await file.arrayBuffer()), String(form.note ?? ""), (INBOX_INTENTS as readonly string[]).includes(intent) ? intent : "other");
  return c.json(detail(id));
});

studio.post("/studio/transcribe", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new StepError("Attach a recording", false);
  const dir = mkdtempSync(path.join(tmpdir(), "studio-voice-"));
  try {
    const input = path.join(dir, `note${path.extname(file.name) || ".webm"}`);
    writeFileSync(input, Buffer.from(await file.arrayBuffer()));
    const transcript = await transcribeRecording(input);
    return c.json({ text: transcript.text });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

studio.get("/studio/runner", (c) => c.json(runnerStatus()));

studio.post("/studio/runner/resume", (c) => {
  resumeNow();
  return c.json(runnerStatus());
});

