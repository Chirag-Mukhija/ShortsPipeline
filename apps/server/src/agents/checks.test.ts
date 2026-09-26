// Tests for the semantic checks that send LLM output back for repair.
import type { Script, Storyboard } from "@clipforge/schema";
import { describe, expect, it } from "vitest";
import { checkScript, checkStoryboard } from "./checks";

const script: Script = {
  title: "RAM",
  scenes: [
    { id: "s1", narration: "Your Mac is lying about RAM.", visual: "hook" },
    { id: "s2", narration: "It compresses memory instead of wasting it.", visual: "diagram" },
  ],
};

describe("checkScript", () => {
  it("flags short scripts, unit symbols and out-of-order ids", () => {
    const problems = checkScript({
      title: "x",
      scenes: [
        { id: "s1", narration: "Macs use 8GB.", visual: "" },
        { id: "s3", narration: "Short.", visual: "" },
      ],
    });
    expect(problems.some((p) => p.includes("words"))).toBe(true);
    expect(problems.some((p) => p.includes("unit symbols"))).toBe(true);
    expect(problems.some((p) => p.includes('"s3"'))).toBe(true);
  });
});

describe("checkStoryboard", () => {
  it("accepts a valid board", () => {
    const board: Storyboard = {
      scenes: [
        { id: "s1", template: "HookSlam", props: { lines: ["Mac lies"], highlight: [] }, cues: [{ word: "lying", action: "shake" }] },
        {
          id: "s2",
          template: "Diagram",
          props: {
            nodes: [
              { id: "ram", label: "RAM", col: 0, row: 0, icon: "lucide:memory-stick" },
              { id: "zip", label: "Compressed", col: 2, row: 0 },
            ],
            edges: [{ from: "ram", to: "zip" }],
          },
          cues: [{ word: "compresses", action: "packet", target: "edge:ram-zip" }],
        },
      ],
    };
    expect(checkStoryboard(board, script, false)).toEqual([]);
  });

  it("catches wrong hook template, Media without stock, missing nodes and unspoken cue words", () => {
    const board: Storyboard = {
      scenes: [
        { id: "s1", template: "KineticText", props: { text: "Mac lies", highlight: [] }, cues: [{ word: "banana", action: "pulse" }] },
        { id: "s2", template: "Media", props: { query: "ram chip", kind: "video", icon: "lucide:not-real" }, cues: [] },
      ],
    };
    const problems = checkStoryboard(board, script, false);
    expect(problems).toEqual(
      expect.arrayContaining([
        "Scene s1 must use HookSlam.",
        "Scene s2 uses Media but stock footage is unavailable.",
        'Scene s1 cue word "banana" is not in its narration.',
      ]),
    );
    expect(problems.some((p) => p.includes("lucide:not-real"))).toBe(true);
  });
});
