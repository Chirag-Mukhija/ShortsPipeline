// Upload or remove a creator's own voice recording for one scene. Kept separate from routes/api.ts: this one
// reads a raw binary body instead of JSON, matching how assets/, media/ and tts/ are split by concern already.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { absFromData, paths, relFromData } from "../config";
import { deleteRecording, getProject, upsertRecording } from "../db/repo";
import { StepError } from "../pipeline/errors";
import { emit } from "../pipeline/events";
import { probeDurationMs } from "../media/ffmpeg";

// Decision: stored with a fixed extension rather than one derived from the browser's mime type — ffmpeg detects
// container and codec from the file's own bytes, not its name, so a recording from any source works the same way.
function recordedFile(projectId: string, sceneId: string): string {
  return path.join(paths.project(projectId), "audio", "recorded", `${sceneId}.upload`);
}

export const recordings = new Hono();

recordings.post("/projects/:id/scenes/:sceneId/recording", async (c) => {
  const id = c.req.param("id");
  const sceneId = c.req.param("sceneId");
  if (!getProject(id)) throw new StepError("Project not found", false);
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: "No audio data received" }, 400);
  const file = recordedFile(id, sceneId);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(body));
  let durationMs: number;
  try {
    durationMs = await probeDurationMs(file);
  } catch {
    rmSync(file, { force: true });
    return c.json({ error: "That didn't look like a valid audio file" }, 400);
  }
  const originalName = c.req.query("name") ?? null;
  upsertRecording({ projectId: id, sceneId, file: relFromData(file), originalName, durationMs });
  emit({ type: "project", projectId: id });
  return c.json({ ok: true, durationMs });
});

recordings.delete("/projects/:id/scenes/:sceneId/recording", (c) => {
  const id = c.req.param("id");
  const sceneId = c.req.param("sceneId");
  const removed = deleteRecording(id, sceneId);
  if (removed) rmSync(absFromData(removed.file), { force: true });
  emit({ type: "project", projectId: id });
  return c.json({ ok: true });
});
