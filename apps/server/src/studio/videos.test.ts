// Tests the video-folder layer against a temp videos/ dir: status.md parsing and edits, questions, approvals, notes and the inbox.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const videosDir = mkdtempSync(path.join(tmpdir(), "studio-videos-"));
process.env.STUDIO_VIDEOS_DIR = videosDir;
let v: typeof import("./videos");

beforeAll(async () => {
  v = await import("./videos");
});

describe("status.md", () => {
  const md = `# Status\n\nStarted 2026-11-10.\nMode: autonomous   <!-- c -->\n\n| Stage | State | Output |\n|---|---|---|\n| idea | done | idea.md |\n| research | running | brief.md |\n| plan | not started | plan.md (**creator gate**) |\n| record | not built yet | |\n\n## Creator decisions\n- 2026-11-10 idea: one\n\n## Notes for the next stage\n- check X\n`;

  it("parses mode, stages, gates, decisions and notes", () => {
    const parsed = v.parseStatus(md);
    expect(parsed.mode).toBe("autonomous");
    expect(parsed.stages.map((s) => [s.name, s.state, s.gate])).toEqual([
      ["idea", "done", false],
      ["research", "running", false],
      ["plan", "not started", true],
      ["record", "not built yet", false],
    ]);
    expect(v.currentStage(parsed.stages)?.name).toBe("research");
    expect(v.currentStage(v.parseStatus(v.setStageState(md, "research", "done, approved by showrunner")).stages)?.name).toBe("plan");
    expect(parsed.decisions).toEqual(["2026-11-10 idea: one"]);
    expect(parsed.notes).toEqual(["check X"]);
  });

  it("appends to a section without disturbing the next one, and sets a stage's state", () => {
    const next = v.appendToSection(md, "Creator decisions", "2026-11-11 plan: two");
    expect(v.parseStatus(next).decisions).toEqual(["2026-11-10 idea: one", "2026-11-11 plan: two"]);
    expect(v.parseStatus(next).notes).toEqual(["check X"]);
    expect(v.parseStatus(v.setStageState(md, "research", "done")).stages[1]?.state).toBe("done");
    expect(v.parseStatus(v.appendToSection("# Status\n", "Notes for the next stage", "new")).notes).toEqual(["new"]);
  });
});

describe("video folders", () => {
  it("creates numbered videos from the studio templates in the chosen mode", () => {
    const first = v.createVideo("How I built a video studio with Claude", "gated");
    const second = v.createVideo("Second idea!", "chat");
    expect(first).toBe("001-built-video-studio-claude");
    expect(second).toBe("002-second-idea");
    const summary = v.summarize(first, false);
    expect(summary).toMatchObject({ number: 1, mode: "gated", currentStage: "idea", waitingForCreator: false });
    expect(summary.title).toBe("How I built a video studio with Claude");
    expect(v.listVideoIds()).toEqual([first, second]);
    writeFileSync(path.join(videosDir, first, "package.md"), '# Package\n\n### Title: **"I Replaced Myself With 4 Claude Agents"**\n');
    expect(v.summarize(first, false).title).toBe("I Replaced Myself With 4 Claude Agents");
    writeFileSync(path.join(videosDir, first, "package.md"), "Recommended title: The Studio Ships\n\n# Package\n");
    expect(v.summarize(first, false).title).toBe("The Studio Ships");
    const statusFile = path.join(videosDir, first, "status.md");
    writeFileSync(statusFile, readFileSync(statusFile, "utf8").replace(/^Mode:.*$/m, (line) => `${line}\nTitle: The Showrunner's Pick`));
    expect(v.summarize(first, false).title).toBe("The Showrunner's Pick");
    writeFileSync(statusFile, readFileSync(statusFile, "utf8").replace(/^Title:.*$/m, "Title:"));
    rmSync(path.join(videosDir, first, "package.md"));
  });

  it("turns answered questions into logged decisions and clears them", () => {
    const id = v.listVideoIds()[0] ?? "";
    writeFileSync(
      path.join(videosDir, id, "questions.json"),
      JSON.stringify({ stage: "plan", questions: [{ id: "angle", question: "Which angle?", options: [{ label: "A" }, { label: "B" }] }] }),
    );
    expect(v.summarize(id, false).waitingForCreator).toBe(true);
    expect(() => v.answerQuestions(id, {})).toThrow(/Which angle/);
    v.answerQuestions(id, { angle: "B, but funnier" });
    expect(v.readQuestions(id)).toBeNull();
    expect(readFileSync(path.join(videosDir, id, "status.md"), "utf8")).toContain('plan: Which angle? → "B, but funnier"');
  });

  it("records approvals and change requests on the stage", () => {
    const id = v.listVideoIds()[1] ?? "";
    v.approveStage(id, "idea", "looks right");
    v.addNotes(id, "research", "dig into Hinglish channels");
    const parsed = v.parseStatus(readFileSync(path.join(videosDir, id, "status.md"), "utf8"));
    expect(parsed.stages.find((s) => s.name === "idea")?.state).toBe("done");
    expect(parsed.stages.find((s) => s.name === "research")?.state).toBe("needs changes");
    expect(parsed.decisions.some((d) => d.includes('APPROVED by the creator: "looks right"'))).toBe(true);
    expect(parsed.notes.some((n) => n.includes("redo research"))).toBe(true);
  });

  it("saves inbox uploads with their intent and tells the next stage about them", () => {
    const id = v.listVideoIds()[0] ?? "";
    const file = v.addInboxItem(id, "My Sketch (1).PNG", Buffer.from("png"), "use for the pipeline diagram", "use as visual");
    expect(file).toMatch(/^\d{8}T\d{6}-my-sketch-1\.png$/);
    expect(existsSync(path.join(videosDir, id, "inbox", file))).toBe(true);
    const [item] = v.listInbox(id);
    expect(item).toMatchObject({ file, kind: "image", intent: "use as visual", note: "use for the pipeline diagram" });
    expect(item?.url).toBe(`/videofiles/${id}/inbox/${encodeURIComponent(file)}`);
    expect(v.parseStatus(readFileSync(path.join(videosDir, id, "status.md"), "utf8")).notes.at(-1)).toContain(`inbox/${file} (use as visual)`);
  });

  it("only lets the studio edit artifacts and only read inside the folder", () => {
    const id = v.listVideoIds()[0] ?? "";
    v.writeArtifact(id, "plan.md", "# Plan\n");
    expect(v.readTextFile(id, "plan.md")).toBe("# Plan\n");
    expect(() => v.writeArtifact(id, "status.md", "x")).toThrow(/isn't editable/);
    expect(() => v.readTextFile(id, "../../etc/passwd")).toThrow();
    expect(() => v.videoDir("../evil")).toThrow();
  });
});
