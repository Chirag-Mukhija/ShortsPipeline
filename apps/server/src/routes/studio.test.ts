// HTTP tests for the studio website API behind its passcode: login, videos, artifacts, questions, inbox uploads and file serving.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Hono } from "hono";
import { beforeAll, describe, expect, it } from "vitest";

const root = mkdtempSync(path.join(tmpdir(), "studio-http-"));
process.env.DATA_DIR = path.join(root, "data");
process.env.STUDIO_VIDEOS_DIR = path.join(root, "videos");
process.env.STUDIO_PASSCODE = "open-sesame";
process.env.CLAUDE_CLI_PATH = "/usr/bin/true";

let app: Hono;
let cookie = "";
let assertSafeHost: typeof import("../studio/auth").assertSafeHost;

beforeAll(async () => {
  app = (await import("../app")).createApp();
  assertSafeHost = (await import("../studio/auth")).assertSafeHost;
});

const call = (url: string, init: RequestInit = {}) =>
  app.request(url, { ...init, headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) } });
const json = (method: string, url: string, data: unknown) =>
  call(url, { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });

describe("the passcode gate", () => {
  it("locks the API until the right passcode is entered", async () => {
    expect((await call("/api/studio/videos")).status).toBe(401);
    expect(await (await call("/api/auth")).json()).toEqual({ required: true, ok: false });
    expect((await json("POST", "/api/auth", { passcode: "nope" })).status).toBe(401);
    const ok = await json("POST", "/api/auth", { passcode: "open-sesame" });
    expect(ok.status).toBe(200);
    cookie = (ok.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    expect(cookie).toMatch(/^clipforge_studio=/);
    expect((await call("/api/studio/videos")).status).toBe(200);
  });

  it("refuses to listen on the network without a passcode", () => {
    expect(() => assertSafeHost("0.0.0.0", undefined)).toThrow(/STUDIO_PASSCODE/);
    expect(() => assertSafeHost("0.0.0.0", "x")).not.toThrow();
    expect(() => assertSafeHost("127.0.0.1", undefined)).not.toThrow();
  });
});

describe("videos", () => {
  let id = "";

  it("creates a video and lists it", async () => {
    const created = await json("POST", "/api/studio/videos", { idea: "How I built my studio", mode: "gated", start: false });
    expect(created.status).toBe(201);
    const video = (await created.json()) as { id: string; mode: string; currentStage: string; files: string[] };
    id = video.id;
    expect(video).toMatchObject({ id: "001-built-studio", mode: "gated", currentStage: "idea" });
    expect(video.files).toEqual(["idea.md", "status.md"]);
    const list = (await (await call("/api/studio/videos")).json()) as { id: string }[];
    expect(list.map((v) => v.id)).toEqual([id]);
    expect((await json("POST", "/api/studio/videos", { idea: "x" })).status).toBe(400);
  });

  it("edits artifacts but never status.md", async () => {
    expect((await json("PUT", `/api/studio/videos/${id}/file`, { path: "plan.md", content: "# Plan\n" })).status).toBe(200);
    expect(await (await call(`/api/studio/videos/${id}/file?path=plan.md`)).text()).toBe("# Plan\n");
    expect((await json("PUT", `/api/studio/videos/${id}/file`, { path: "status.md", content: "x" })).status).toBe(400);
  });

  it("shows open questions and records the answers", async () => {
    writeFileSync(
      path.join(root, "videos", id, "questions.json"),
      JSON.stringify({ stage: "plan", questions: [{ id: "angle", question: "Which angle?", options: [{ label: "A" }] }] }),
    );
    const before = (await (await call(`/api/studio/videos/${id}`)).json()) as { waitingForCreator: boolean; questions: unknown };
    expect(before.waitingForCreator).toBe(true);
    const after = await json("POST", `/api/studio/videos/${id}/answers`, { answers: { angle: "A" } });
    expect(after.status).toBe(200);
    const video = (await after.json()) as { questions: unknown; decisions: string[] };
    expect(video.questions).toBeNull();
    expect(video.decisions.at(-1)).toContain('Which angle? → "A"');
  });

  it("accepts an iPad sketch into the inbox and serves only inbox files", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([137, 80, 78, 71])], "sketch.png", { type: "image/png" }));
    form.append("note", "the pipeline as boxes");
    form.append("intent", "use as visual");
    const res = await call(`/api/studio/videos/${id}/inbox`, { method: "POST", body: form });
    expect(res.status).toBe(200);
    const video = (await res.json()) as { inbox: { url: string; intent: string }[] };
    expect(video.inbox[0]?.intent).toBe("use as visual");
    const image = await call(video.inbox[0]?.url ?? "");
    expect(image.status).toBe(200);
    expect(new Uint8Array(await image.arrayBuffer())[1]).toBe(80);
    expect((await call(`/videofiles/${id}/status.md`)).status).toBe(404);
    expect((await call(`/videofiles/${id}/inbox/../status.md`)).status).toBe(404);
  });
});
