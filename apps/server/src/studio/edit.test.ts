// Tests the edit stage's server logic against a temp video: contiguous beat boundaries, mix defaults, takes, notes, music guards and the rough-cut approval.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const videosDir = mkdtempSync(path.join(tmpdir(), "studio-edit-"));
process.env.STUDIO_VIDEOS_DIR = videosDir;
const id = "001-test-edit";
const dir = path.join(videosDir, id);
let e: typeof import("./edit");

beforeAll(async () => {
  mkdirSync(path.join(dir, "edit", "scenes"), { recursive: true });
  writeFileSync(
    path.join(dir, "status.md"),
    "# Status\n\nMode: gated\n\n| Stage | State | Output |\n|---|---|---|\n| record | done | |\n| edit + graphics | running | |\n| rough cut | not started | (**creator gate**) |\n\n## Creator decisions\n\n## Notes for the next stage\n",
  );
  writeFileSync(
    path.join(dir, "edit", "edit.json"),
    JSON.stringify({
      fps: 30, width: 1920, height: 1080, duration: 30, narration: "record/narration.wav", theme: "hand-drawn",
      beats: [
        { id: "beat-01", scene: "scenes/beat-01.tsx", start: 0, end: 10, status: "ready" },
        { id: "beat-02", scene: "scenes/beat-02.tsx", start: 10, end: 20, status: "ready" },
        { id: "beat-03", scene: "scenes/beat-03.tsx", start: 20, end: 30, status: "planned" },
      ],
      music: null,
    }),
  );
  writeFileSync(path.join(dir, "edit", "scenes", "beat-01.tsx"), "// version one\n");
  e = await import("./edit");
});

describe("edit.json", () => {
  it("fills mix defaults and keeps beats contiguous when a boundary moves", () => {
    expect(e.readSpec(id)?.mix.duckDb).toBe(8);
    const spec = e.patchSpec(id, { beats: [{ id: "beat-01", end: 12.5 }] });
    expect(spec.beats[0]!.end).toBe(12.5);
    expect(spec.beats[1]!.start).toBe(12.5);
  });

  it("never lets a boundary swallow the next beat", () => {
    const spec = e.patchSpec(id, { beats: [{ id: "beat-02", end: 99 }] });
    expect(spec.beats[1]!.end).toBe(29.5);
    expect(spec.beats[2]!.start).toBe(29.5);
  });

  it("merges mix changes and refuses music that isn't in the library", () => {
    expect(e.patchSpec(id, { mix: { voiceDb: -3 } as never }).mix).toMatchObject({ voiceDb: -3, musicDb: -6 });
    expect(() => e.patchSpec(id, { music: { trackId: "nope" } })).toThrow(/music library/);
  });
});

describe("takes", () => {
  it("keeps the current scene as a take and restores an older one", () => {
    expect(e.snapshotBeat(id, "beat-01")).toBe("v1");
    writeFileSync(path.join(dir, "edit", "scenes", "beat-01.tsx"), "// version two\n");
    e.restoreTake(id, "beat-01", "v1");
    expect(readFileSync(path.join(dir, "edit", "scenes", "beat-01.tsx"), "utf8")).toBe("// version one\n");
    // Restoring keeps what was there as a new take, so nothing is ever lost.
    expect(readFileSync(path.join(dir, "edit", "takes", "beat-01", "v2.tsx"), "utf8")).toBe("// version two\n");
  });

  it("has nothing to snapshot for a beat not built yet", () => {
    expect(e.snapshotBeat(id, "beat-03")).toBeNull();
  });
});

describe("rough cut", () => {
  it("saves notes and approval marks both stages done", () => {
    e.setNotes(id, [{ id: "n1", at: 4.2, text: "slower here", status: "open", createdAt: "2026-11-16" }]);
    expect(existsSync(path.join(dir, "edit", "notes.json"))).toBe(true);
    e.approveRoughCut(id);
    const md = readFileSync(path.join(dir, "status.md"), "utf8");
    expect(md).toMatch(/\| edit \+ graphics \| done \|/);
    expect(md).toMatch(/\| rough cut \| done \|/);
    expect(md).toMatch(/rough cut: APPROVED by the creator/);
  });
});
