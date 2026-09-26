// Tests for cue anchoring, caption paging, diagram cleanup and frame-accurate timeline assembly.
import { buildCaptionPages, resolveCues, type AssetsArtifact, type Script, type Storyboard, type VoiceArtifact } from "@clipforge/schema";
import { describe, expect, it } from "vitest";
import { buildTimeline, sanitizeDiagram } from "./timeline";

const words = [
  { text: "Zip", startMs: 0, endMs: 200 },
  { text: "finds", startMs: 200, endMs: 450 },
  { text: "repeated", startMs: 450, endMs: 800 },
  { text: "chunks.", startMs: 800, endMs: 1100 },
  { text: "Then", startMs: 1500, endMs: 1700 },
  { text: "pointers", startMs: 1700, endMs: 2100 },
  { text: "win.", startMs: 2100, endMs: 2400 },
];

describe("resolveCues", () => {
  it("anchors cues to spoken words, matches word stems and spreads unknown words", () => {
    const { cues, unresolved } = resolveCues(
      [
        { word: "repeated", action: "reveal", target: "node:a" },
        { word: "pointer", action: "highlight", target: "node:b" },
        { word: "banana", action: "pulse" },
      ],
      words,
      30,
      90,
    );
    expect(cues.find((c) => c.target === "node:a")?.frame).toBe(Math.round(0.45 * 30) - 3);
    expect(cues.find((c) => c.target === "node:b")?.frame).toBe(Math.round(1.7 * 30) - 3);
    expect(unresolved).toEqual(["banana"]);
    expect(cues.find((c) => c.action === "pulse")?.frame).toBe(45);
  });
});

describe("buildCaptionPages", () => {
  it("breaks pages at sentence ends, pauses and the word limit", () => {
    const pages = buildCaptionPages(words);
    expect(pages.map((p) => p.words.map((w) => w.text).join(" "))).toEqual(["Zip finds repeated", "chunks.", "Then pointers win."]);
    expect(pages[0]!.endMs).toBeGreaterThanOrEqual(800);
  });
});

describe("sanitizeDiagram", () => {
  it("drops duplicate ids, moves colliding nodes and removes dangling edges", () => {
    const result = sanitizeDiagram({
      nodes: [
        { id: "CPU", label: "CPU", col: 1, row: 1 },
        { id: "cpu", label: "Dup", col: 0, row: 0 },
        { id: "ram", label: "RAM", col: 1, row: 1 },
      ],
      edges: [
        { from: "cpu", to: "RAM" },
        { from: "cpu", to: "gpu" },
      ],
    });
    expect(result.nodes.map((n) => n.id)).toEqual(["cpu", "ram"]);
    expect(result.nodes[1]).toMatchObject({ col: 0, row: 1 });
    expect(result.edges).toEqual([{ from: "cpu", to: "ram" }]);
  });
});

describe("buildTimeline", () => {
  const script: Script = {
    title: "Test",
    scenes: [
      { id: "s1", narration: "Zip finds repeated chunks.", visual: "hook" },
      { id: "s2", narration: "Then pointers win.", visual: "text" },
    ],
  };
  const storyboard: Storyboard = {
    scenes: [
      { id: "s1", template: "HookSlam", props: { lines: ["Zip!"], highlight: [] }, cues: [] },
      { id: "s2", template: "KineticText", props: { text: "Pointers win", highlight: ["win"] }, cues: [{ word: "pointers", action: "pulse" }] },
    ],
  };
  const voice: VoiceArtifact = {
    provider: "test",
    voice: "test",
    totalMs: 2000,
    scenes: [
      { id: "s1", file: "projects/x/audio/s1.mp3", durationMs: 1600, speechEndMs: 1100, words: words.slice(0, 4) },
      { id: "s2", file: "projects/x/audio/s2.mp3", durationMs: 1400, speechEndMs: 900, words: words.slice(4).map((w) => ({ ...w, startMs: w.startMs - 1500, endMs: w.endMs - 1500 })) },
    ],
  };
  const assets: AssetsArtifact = { media: {}, code: {}, music: null };

  it("chains scenes back to back, trims trailing silence and holds the last scene", () => {
    const timeline = buildTimeline({ script, storyboard, voice, assets, sfxVolume: 0.5 });
    const [first, second] = timeline.scenes;
    expect(first!.from).toBe(0);
    expect(first!.durationInFrames).toBe(Math.ceil(((1100 + 260) / 1000) * 30));
    expect(second!.from).toBe(first!.durationInFrames);
    expect(second!.durationInFrames).toBe(Math.ceil(((Math.max(1200, 900 + 260) + 700) / 1000) * 30));
    expect(timeline.durationInFrames).toBe(first!.durationInFrames + second!.durationInFrames);
    expect(timeline.captions[0]!.startMs).toBe(0);
    expect(timeline.captions.at(-1)!.words.at(-1)!.text).toBe("win.");
    expect(timeline.sfx.some((s) => s.name === "slam")).toBe(true);
    expect(timeline.sfx.some((s) => s.name === "whoosh" && s.frame === second!.from)).toBe(true);
  });
});
