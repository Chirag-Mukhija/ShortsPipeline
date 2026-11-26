// Tests freeing space on a finished video: what's listed, what's always kept, every refusal, and that only the ticked groups go.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const root = mkdtempSync(path.join(tmpdir(), "studio-cleanup-"));
process.env.DATA_DIR = path.join(root, "data");
process.env.STUDIO_VIDEOS_DIR = path.join(root, "videos");

let cleanup: typeof import("./cleanup");
const id = "001-done";
const dir = path.join(root, "videos", id);
const at = (rel: string) => path.join(dir, rel);
const sample = path.join(root, "sample.mp4");
const longAgo = new Date(Date.now() - 60 * 60_000);

function put(rel: string, content: string | Buffer = "x".repeat(5000)): void {
  mkdirSync(path.dirname(at(rel)), { recursive: true });
  writeFileSync(at(rel), content);
  utimesSync(at(rel), longAgo, longAgo);
}
const status = (state: string) => `# Status\n\n| Stage | State | Output |\n|---|---|---|\n| idea | done | idea.md |\n| record | skipped | - |\n| package + upload | ${state} | x |\n\n## Creator decisions\n\n## Notes for the next stage\n`;

const ROUGH = ["record/takes/a.wav", "record/takes/a.json", "record/takes/a.cam.mp4", "record/trash/b.wav", "renders/beats/final/b1.mp4", "renders/cut/preview/s1.mp4", "renders/preview.mp4", "renders/animatic.mp4", "edit/stills/b1/1.png", ".runs/r.json"];
const SOURCES = ["media/fs-01.mov", "record/narration.wav", "record/facecam.mp4"];
const KEPT = ["renders/cut-final.mp4", "renders/notes.txt", "renders/unknown/x.mp4", "package/upload.json", "package/face.png", "record/narration.json", "record/transcript.md", "edit/edit.json", "edit/scenes/b1.tsx", "edit/takes/b1/v1.tsx", "inbox/sketch.png", "script.md", "final-notes.mp4"];

beforeAll(async () => {
  mkdirSync(root, { recursive: true });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=30", "-f", "lavfi", "-i", "sine=frequency=300", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", sample]);
  cleanup = await import("./cleanup");
});

beforeEach(() => {
  rmSync(dir, { recursive: true, force: true });
  for (const f of [...ROUGH, ...SOURCES, ...KEPT]) put(f);
  put("status.md", status("done"));
  put("record/narration.json", JSON.stringify({ duration: 6 }));
  put("package/upload.json", JSON.stringify({ file: "renders/final.mp4" }));
  put("renders/final.mp4", readFileSync(sample));
});

const blocked = async () => (await cleanup.cleanupPlan(id)).blockers.join(" ");

describe("the plan", () => {
  it("lists rough files, ticks only what the final no longer needs, and nothing it wasn't told about", async () => {
    const plan = await cleanup.cleanupPlan(id);
    expect(plan.blockers).toEqual([]);
    expect(plan.warnings).toEqual([]);
    expect(plan.groups.map((g) => [g.id, g.files, g.selected])).toEqual([["takes", 4, true], ["clips", 2, true], ["drafts", 2, true], ["stills", 1, true], ["logs", 1, true], ["footage", 1, false], ["masters", 2, false]]);
    expect(plan.groups.every((g) => g.bytes > 0)).toBe(true);
  });

  it("refuses on an unfinished video, or one with no, a short, a silent or a cut-off final", async () => {
    put("status.md", status("waiting for creator"));
    expect(await blocked()).toMatch(/isn't finished/);
    put("status.md", "# Status\n");
    expect(await blocked()).toMatch(/isn't finished/);
    put("status.md", status("done"));
    put("record/narration.json", JSON.stringify({ duration: 60 }));
    expect(await blocked()).toMatch(/isn't the whole video/);
    put("record/narration.json", JSON.stringify({ duration: 6 }));
    truncateSync(at("renders/final.mp4"), Math.round(readFileSync(sample).length * 0.6));
    utimesSync(at("renders/final.mp4"), longAgo, longAgo);
    expect(await blocked()).toMatch(/doesn't play to its end|isn't a playable/);
    rmSync(at("renders/final.mp4"));
    expect(await blocked()).toMatch(/no final video/);
  });

  it("refuses while takes or renders are still changing, and warns when sources are newer than the final", async () => {
    utimesSync(at("renders/cut/preview/s1.mp4"), new Date(), new Date());
    expect(await blocked()).toMatch(/last two minutes/);
    utimesSync(at("renders/cut/preview/s1.mp4"), longAgo, longAgo);
    utimesSync(at("edit/scenes/b1.tsx"), new Date(), new Date());
    expect((await cleanup.cleanupPlan(id)).warnings.join()).toMatch(/edit\/scenes\/b1.tsx/);
  });

  it("keeps whichever final upload.json names, and ignores a name outside renders/", async () => {
    put("renders/my-cut.mp4", readFileSync(sample));
    put("package/upload.json", JSON.stringify({ file: "renders/my-cut.mp4" }));
    const plan = await cleanup.cleanupPlan(id);
    expect(plan.final?.path).toBe("renders/my-cut.mp4");
    expect(plan.groups.find((g) => g.id === "drafts")!.files).toBe(2);
    put("package/upload.json", JSON.stringify({ file: "../../etc/x.mp4" }));
    expect((await cleanup.cleanupPlan(id)).final?.path).toBe("renders/final.mp4");
  });
});

describe("deleting", () => {
  it("deletes the ticked groups only and logs it as the creator's decision", async () => {
    const { signature } = await cleanup.cleanupPlan(id);
    const result = await cleanup.runCleanup(id, ["takes", "clips", "drafts", "stills", "logs"], signature);
    expect(result.failed).toEqual([]);
    expect(result.deleted).toBe(ROUGH.length);
    for (const f of ROUGH) expect(existsSync(at(f)), f).toBe(false);
    for (const f of [...SOURCES, ...KEPT, "renders/final.mp4", "status.md"]) expect(existsSync(at(f)), f).toBe(true);
    expect(existsSync(at("record/takes"))).toBe(false);
    expect(readFileSync(at("status.md"), "utf8")).toMatch(/cleanup: the creator deleted rough files/);
    expect(result.plan.groups.map((g) => g.id)).toEqual(["footage", "masters"]);
  });

  it("refuses a stale list, a blocked video and an empty choice, deleting nothing", async () => {
    const { signature } = await cleanup.cleanupPlan(id);
    put("record/takes/new.wav");
    await expect(cleanup.runCleanup(id, ["takes"], signature)).rejects.toThrow(/changed since/);
    const fresh = (await cleanup.cleanupPlan(id)).signature;
    await expect(cleanup.runCleanup(id, [], fresh)).rejects.toThrow(/Nothing is ticked/);
    put("status.md", status("not started"));
    await expect(cleanup.runCleanup(id, ["takes"], fresh)).rejects.toThrow(/isn't finished/);
    for (const f of [...ROUGH, "record/takes/new.wav"]) expect(existsSync(at(f)), f).toBe(true);
  });

  it("never follows a symlink out of the video's folder", async () => {
    const outside = path.join(root, "outside");
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "precious.mov"), "keep me");
    rmSync(at("media"), { recursive: true });
    symlinkSync(outside, at("media"));
    symlinkSync(outside, at("record/takes/linked"));
    symlinkSync(path.join(outside, "precious.mov"), at("renders/link.mp4"));
    const plan = await cleanup.cleanupPlan(id);
    expect(plan.groups.some((g) => g.id === "footage")).toBe(false);
    await cleanup.runCleanup(id, ["takes", "drafts", "clips", "masters"], plan.signature);
    expect(readFileSync(path.join(outside, "precious.mov"), "utf8")).toBe("keep me");
    expect(existsSync(at("record/takes/linked"))).toBe(true);
  });
});
