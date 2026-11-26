// HTTP API for the studio website: videos and their artifacts, creator decisions, agent runs, the inbox, voice practice, the record page and freeing space on a finished video.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import { CLEANUP_GROUPS, INBOX_INTENTS, VIDEO_AUDIO, VIDEO_MODES, type VideoDetail } from "@clipforge/schema";
import { StepError } from "../pipeline/errors";
import { emit } from "../pipeline/events";
import { cleanupPlan, runCleanup } from "../studio/cleanup";
import { enqueue, isRunning, listRuns, refreshUsage, resumeNow, runnerStatus, stop } from "../studio/runner";
import { appendChunk, appendVideoChunk, deleteTake, exportNarration, finishTake, listen, recordState, retranscribe, saveCuts, setCleanup, startTake } from "../studio/record";
import {
  CREATOR_STAGES,
  addInboxItem,
  addNotes,
  answerQuestions,
  approveStage,
  createVideo,
  currentStage,
  listFiles,
  listInbox,
  listVideoIds,
  parseStatus,
  readQuestions,
  readTextFile,
  setAudio,
  setMode,
  summarize,
  videoDir,
  writeArtifact,
} from "../studio/videos";
import { transcribeRecording } from "../tts/whisperAlign";
import { readKit } from "../studio/kit";
import { readLibrary } from "../studio/library";
import { deriveInboxMedia } from "../studio/inboxMedia";
import { saveSample, voiceStatus } from "../studio/voice";

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
  const current = currentStage(parseStatus(readFileSync(path.join(videoDir(id), "status.md"), "utf8")).stages);
  if (current && CREATOR_STAGES.has(current.name)) return;
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
  const input = await body(
    c,
    z.object({
      idea: z.string().trim().min(3, "Describe the idea in a few words"),
      mode: z.enum(VIDEO_MODES).default("gated"),
      audio: z.enum(VIDEO_AUDIO).default("voice"),
      look: z.string().trim().max(120).default(""),
      music: z.string().trim().max(200).default(""),
      start: z.boolean().default(true),
    }),
  );
  const id = createVideo(input.idea, input.mode, input.audio, { look: input.look, music: input.music });
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

studio.post("/studio/videos/:id/audio", async (c) => {
  const input = await body(c, z.object({ audio: z.enum(VIDEO_AUDIO) }));
  setAudio(c.req.param("id"), input.audio);
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
  const saved = addInboxItem(id, file.name, Buffer.from(await file.arrayBuffer()), String(form.note ?? ""), (INBOX_INTENTS as readonly string[]).includes(intent) ? intent : "other");
  void deriveInboxMedia(path.join(videoDir(id), "inbox"), saved).catch((error: Error) => console.warn(`inbox media for ${saved}: ${error.message}`));
  return c.json(detail(id));
});

studio.get("/studio/videos/:id/cleanup", async (c) => c.json(await cleanupPlan(c.req.param("id"))));

// Deletes for good: the groups ticked, the signature of the list the creator saw, and their word that the final is safe.
studio.post("/studio/videos/:id/cleanup", async (c) => {
  const input = await body(c, z.object({ groups: z.array(z.enum(CLEANUP_GROUPS)).min(1, "Nothing is ticked"), signature: z.string().min(1), finalIsSafe: z.literal(true, "Confirm the final video is safe first") }));
  const id = c.req.param("id");
  const result = await runCleanup(id, input.groups, input.signature);
  emit({ type: "studio", videoId: id });
  return c.json(result);
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

studio.get("/studio/library", (c) => c.json(readLibrary()));
studio.get("/studio/library/kit", (c) => c.json(readKit()));

studio.get("/studio/runner", (c) => c.json(runnerStatus()));

studio.post("/studio/runner/usage", async (c) => c.json(await refreshUsage()));

studio.post("/studio/runner/resume", (c) => {
  resumeNow();
  return c.json(runnerStatus());
});

studio.get("/studio/voice", (c) => c.json(voiceStatus()));

studio.post("/studio/voice/sample", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new StepError("Attach a recording", false);
  const saved = await saveSample(Buffer.from(await file.arrayBuffer()), file.name || "sample.webm", String(form.topic ?? voiceStatus().topic));
  return c.json({ ...saved, status: voiceStatus() });
});

const CUT_REASONS = ["retake", "filler", "redone", "outside", "you"] as const;
const raw = async (c: { req: { arrayBuffer: () => Promise<ArrayBuffer> } }) => Buffer.from(await c.req.arrayBuffer());

studio.get("/studio/videos/:id/record", (c) => c.json(recordState(c.req.param("id"))));

studio.post("/studio/videos/:id/record/takes", async (c) => {
  const input = await body(c, z.object({ rate: z.number().int(), from: z.number().int().min(0) }));
  return c.json({ take: startTake(c.req.param("id"), input.rate, input.from) });
});

studio.post("/studio/videos/:id/record/takes/:take/chunk", async (c) => {
  appendChunk(c.req.param("id"), c.req.param("take"), await raw(c));
  return c.json({ ok: true });
});

studio.post("/studio/videos/:id/record/takes/:take/video", async (c) => {
  appendVideoChunk(c.req.param("id"), c.req.param("take"), await raw(c));
  return c.json({ ok: true });
});

studio.post("/studio/videos/:id/record/takes/:take/finish", async (c) => c.json(await finishTake(c.req.param("id"), c.req.param("take"))));

studio.post("/studio/videos/:id/record/takes/:take/retranscribe", async (c) => c.json(await retranscribe(c.req.param("id"), c.req.param("take"))));

studio.put("/studio/videos/:id/record/cleanup", async (c) => {
  const input = await body(c, z.object({ cleanup: z.enum(["off", "gentle", "strong"]) }));
  return c.json(setCleanup(c.req.param("id"), input.cleanup));
});

studio.put("/studio/videos/:id/record/takes/:take/cuts", async (c) => {
  const input = await body(c, z.object({ cuts: z.array(z.enum(CUT_REASONS).nullable()) }));
  saveCuts(c.req.param("id"), c.req.param("take"), input.cuts);
  return c.json({ ok: true });
});

studio.delete("/studio/videos/:id/record/takes/:take", (c) => {
  deleteTake(c.req.param("id"), c.req.param("take"));
  return c.json(recordState(c.req.param("id")));
});

studio.post("/studio/videos/:id/record/listen", async (c) => {
  const from = Number(c.req.query("from") ?? 0);
  return c.json(await listen(c.req.param("id"), Number.isFinite(from) ? Math.max(0, Math.round(from)) : 0, await raw(c)));
});

studio.post("/studio/videos/:id/record/export", async (c) => {
  const input = await body(c, z.object({ finish: z.boolean().default(false) }));
  const id = c.req.param("id");
  const state = await exportNarration(id, input.finish);
  emit({ type: "studio", videoId: id });
  return c.json(state);
});
