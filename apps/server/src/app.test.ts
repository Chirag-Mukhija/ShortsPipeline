// HTTP-level tests against a throwaway data folder: API behaviour, run guards and the media file allow-list.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ProjectSummary } from "@clipforge/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "clipforge-app-"));
process.env.DATA_DIR = dataDir;

type App = Awaited<typeof import("./app")>["createApp"] extends () => infer A ? A : never;
let app: App;

beforeAll(async () => {
  const { createApp } = await import("./app");
  app = createApp();
  mkdirSync(path.join(dataDir, "projects", "demo"), { recursive: true });
  writeFileSync(path.join(dataDir, "projects", "demo", "clip.txt"), "media");
  mkdirSync(path.join(dataDir, "secrets"), { recursive: true });
  writeFileSync(path.join(dataDir, "secrets", "youtube.json"), '{"refresh_token":"secret"}');
});

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

const post = (route: string, body?: unknown) =>
  app.request(route, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
