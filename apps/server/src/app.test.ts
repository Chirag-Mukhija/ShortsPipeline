// HTTP-level tests against a throwaway data folder: API behaviour, run guards and the media file allow-list.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ProjectDetail, ProjectSummary, Review } from "@clipforge/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "clipforge-app-"));
process.env.DATA_DIR = dataDir;

type App = Awaited<typeof import("./app")>["createApp"] extends () => infer A ? A : never;
type Repo = typeof import("./db/repo");
let app: App;
let repo: Repo;

let sampleAudio: Buffer;

beforeAll(async () => {
  const { createApp } = await import("./app");
  repo = await import("./db/repo");
  app = createApp();
  mkdirSync(path.join(dataDir, "projects", "demo"), { recursive: true });
  writeFileSync(path.join(dataDir, "projects", "demo", "clip.txt"), "media");
  mkdirSync(path.join(dataDir, "secrets"), { recursive: true });
  writeFileSync(path.join(dataDir, "secrets", "youtube.json"), '{"refresh_token":"secret"}');
  const sample = path.join(dataDir, "sample.wav");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5", sample]);
  sampleAudio = readFileSync(sample);
});

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

const send = (method: string, route: string, body?: unknown) =>
  app.request(route, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const post = (route: string, body?: unknown) => send("POST", route, body);

describe("media file server", () => {
  it("serves files from media folders", async () => {
    const response = await app.request("/files/projects/demo/clip.txt");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("media");
  });

  it("never serves the database, secrets or traversal paths", async () => {
    for (const route of [
      "/files/clipforge.db",
      "/files/secrets/youtube.json",
      "/files/projects/%2e%2e/secrets/youtube.json",
      "/files/projects/..%2fclipforge.db",
    ]) {
      const response = await app.request(route);
      expect(response.status, route).toBe(404);
    }
  });

  it("returns 404 for missing media instead of the studio page", async () => {
    const response = await app.request("/files/projects/demo/missing.mp3");
    expect(response.status).toBe(404);
  });
});

describe("api", () => {
  it("reports health and unknown routes as JSON 404", async () => {
    expect((await app.request("/api/health")).status).toBe(200);
    const missing = await app.request("/api/nope");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Not found" });
  });

  it("validates new projects and adds ideas without starting them", async () => {
    expect((await post("/api/projects", { topic: "x" })).status).toBe(400);
    const created = await post("/api/projects", { topic: "How DNS finds a website", start: false });
    expect(created.status).toBe(201);
    const project = (await created.json()) as ProjectSummary;
    expect(project.status).toBe("idea");
    const list = (await (await app.request("/api/projects")).json()) as ProjectSummary[];
    expect(list.some((p) => p.id === project.id)).toBe(true);
  });

  it("queues a started project and refuses approval when nothing is paused", async () => {
    const project = (await (await post("/api/projects", { topic: "How Wi-Fi passwords work", start: true })).json()) as ProjectSummary;
    expect(project.status).toBe("queued");
    expect(project.currentStep).toBe("angle");
    const approve = await post(`/api/projects/${project.id}/approve`);
    expect(approve.status).toBe(400);
    expect(((await approve.json()) as { error: string }).error).toContain("not waiting");
  });

  it("defaults new projects to pausing for review", async () => {
    const project = (await (await post("/api/projects", { topic: "How Bluetooth pairs two devices", start: false })).json()) as ProjectSummary;
    expect(project.mode).toBe("assisted");
  });

  it("turns controls on unknown projects into 400s", async () => {
    const response = await post("/api/projects/does-not-exist/start", {});
    expect(response.status).toBe(400);
  });

  it("deletes a project and its files", async () => {
    const project = (await (await post("/api/projects", { topic: "How QR codes store data", start: false })).json()) as ProjectSummary;
    mkdirSync(path.join(dataDir, "projects", project.id), { recursive: true });
    expect((await app.request(`/api/projects/${project.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await app.request(`/api/projects/${project.id}`)).status).toBe(404);
  });
});

describe("review checkpoint", () => {
  const review: Review = {
    scores: { hook: 7, clarity: 7, accuracy: 7, pacing: 7, wit: 7 },
    issues: ["a starter issue"],
    script: {
      title: "Draft title",
      scenes: [
        { id: "s1", narration: "Original line one.", visual: "hook" },
        { id: "s2", narration: "Original line two.", visual: "diagram" },
        { id: "s3", narration: "Original line three.", visual: "code" },
        { id: "s4", narration: "Original line four.", visual: "list" },
      ],
    },
  };

  async function pausedProject(topic: string) {
    const project = (await (await post("/api/projects", { topic, start: false })).json()) as ProjectSummary;
    repo.saveArtifact(project.id, "review", review);
    repo.updateProject(project.id, { status: "paused", currentStep: "review" });
    return project.id;
  }

  it("refuses to edit or regenerate a script that isn't paused for review", async () => {
    const project = (await (await post("/api/projects", { topic: "How torrents find peers", start: false })).json()) as ProjectSummary;
    const edit = await send("PUT", `/api/projects/${project.id}/review/script`, { script: review.script });
    expect(edit.status).toBe(400);
    const regenerate = await post(`/api/projects/${project.id}/review/regenerate`, { note: "punch up the hook" });
    expect(regenerate.status).toBe(400);
  });

  it("saves an edited scene as the new latest review artifact, keeping scores and issues", async () => {
    const id = await pausedProject("How ad blockers work");
    const editedScript = {
      ...review.script,
      scenes: review.script.scenes.map((scene, i) => (i === 0 ? { ...scene, narration: "A creator-edited line." } : scene)),
    };
    const response = await send("PUT", `/api/projects/${id}/review/script`, { script: editedScript });
    expect(response.status).toBe(200);
    const detail = await (await app.request(`/api/projects/${id}`)).json();
    const savedReview = detail.artifacts.review as Review;
    expect(savedReview.script.scenes[0]!.narration).toBe("A creator-edited line.");
    expect(savedReview.scores).toEqual(review.scores);
    expect(savedReview.issues).toEqual(review.issues);
    expect(detail.title).toBe("Draft title");
  });

  it("rejects a script edit that fails validation", async () => {
    const id = await pausedProject("How VPNs tunnel traffic");
    const response = await send("PUT", `/api/projects/${id}/review/script`, { script: { title: "x", scenes: [] } });
    expect(response.status).toBe(400);
  });

  it("queues a regenerate-with-note run from the review step", async () => {
    const id = await pausedProject("How captchas tell humans from bots");
    const response = await post(`/api/projects/${id}/review/regenerate`, { note: "make the hook punchier" });
    expect(response.status).toBe(200);
    const detail = await (await app.request(`/api/projects/${id}`)).json();
    expect(detail.status).toBe("queued");
    expect(detail.currentStep).toBe("review");
  });
});

describe("recordings", () => {
  it("rejects an empty body and non-audio bytes", async () => {
    const project = (await (await post("/api/projects", { topic: "How does a spam filter learn", start: false })).json()) as ProjectSummary;
    const empty = await app.request(`/api/projects/${project.id}/scenes/s1/recording`, { method: "POST", body: new Uint8Array(0) });
    expect(empty.status).toBe(400);
    const garbage = await app.request(`/api/projects/${project.id}/scenes/s1/recording`, {
      method: "POST",
      body: new Uint8Array([1, 2, 3, 4, 5]),
    });
    expect(garbage.status).toBe(400);
  });

  it("refuses an upload for a project that doesn't exist", async () => {
    const response = await app.request("/api/projects/does-not-exist/scenes/s1/recording", { method: "POST", body: new Uint8Array(sampleAudio) });
    expect(response.status).toBe(400);
  });

  it("accepts a real recording, surfaces it on the project, then removes it on delete", async () => {
    const project = (await (await post("/api/projects", { topic: "How does a load balancer choose", start: false })).json()) as ProjectSummary;
    const upload = await app.request(`/api/projects/${project.id}/scenes/s1/recording?name=take1.webm`, {
      method: "POST",
      body: new Uint8Array(sampleAudio),
    });
    expect(upload.status).toBe(200);
    const uploadBody = (await upload.json()) as { durationMs: number };
    expect(uploadBody.durationMs).toBeGreaterThan(0);

    const afterUpload = (await (await app.request(`/api/projects/${project.id}`)).json()) as ProjectDetail;
    expect(afterUpload.recordings).toEqual([{ sceneId: "s1", durationMs: uploadBody.durationMs, createdAt: expect.any(String) }]);

    const del = await app.request(`/api/projects/${project.id}/scenes/s1/recording`, { method: "DELETE" });
    expect(del.status).toBe(200);
    const afterDelete = (await (await app.request(`/api/projects/${project.id}`)).json()) as ProjectDetail;
    expect(afterDelete.recordings).toEqual([]);
  });

  it("replaces rather than duplicates when the same scene is re-recorded", async () => {
    const project = (await (await post("/api/projects", { topic: "How does autocomplete guess your word", start: false })).json()) as ProjectSummary;
    await app.request(`/api/projects/${project.id}/scenes/s1/recording`, { method: "POST", body: new Uint8Array(sampleAudio) });
    await app.request(`/api/projects/${project.id}/scenes/s1/recording`, { method: "POST", body: new Uint8Array(sampleAudio) });
    expect(repo.listRecordings(project.id)).toHaveLength(1);
  });
});
