// Tests for the recordings table: replace-on-re-record semantics, distinct from artifacts' append-only history.
// Uses a throwaway data folder (like app.test.ts) so this never touches the real project database.
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "clipforge-repo-"));
process.env.DATA_DIR = dataDir;

type Repo = typeof import("./repo");
let repo: Repo;

beforeAll(async () => {
  repo = await import("./repo");
});

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

describe("recordings", () => {
  it("replaces the row for a scene on re-record instead of keeping history", () => {
    const project = repo.createProject({ topic: "How does a search index work" });
    repo.upsertRecording({ projectId: project.id, sceneId: "s1", file: "projects/x/audio/recorded/s1.upload", originalName: "take1.wav", durationMs: 1200 });
    repo.upsertRecording({ projectId: project.id, sceneId: "s1", file: "projects/x/audio/recorded/s1.upload", originalName: "take2.wav", durationMs: 900 });
    const rows = repo.listRecordings(project.id).filter((r) => r.sceneId === "s1");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.originalName).toBe("take2.wav");
    expect(rows[0]!.durationMs).toBe(900);
  });

  it("returns and then removes a recording on delete", () => {
    const project = repo.createProject({ topic: "How does a firewall decide" });
    repo.upsertRecording({ projectId: project.id, sceneId: "s2", file: "projects/y/audio/recorded/s2.upload", originalName: null, durationMs: 2000 });
    expect(repo.getRecording(project.id, "s2")).toBeDefined();
    const removed = repo.deleteRecording(project.id, "s2");
    expect(removed?.durationMs).toBe(2000);
    expect(repo.getRecording(project.id, "s2")).toBeUndefined();
  });

  it("scopes recordings to their own project", () => {
    const a = repo.createProject({ topic: "How does DNS caching work" });
    const b = repo.createProject({ topic: "How does a CDN pick a server" });
    repo.upsertRecording({ projectId: a.id, sceneId: "s1", file: "f", originalName: null, durationMs: 100 });
    expect(repo.listRecordings(b.id)).toHaveLength(0);
    expect(repo.listRecordings(a.id)).toHaveLength(1);
  });
});
