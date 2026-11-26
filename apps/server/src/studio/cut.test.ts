// Tests the Cut plan checker (coverage, visuals and props, media, variety, the visual mix) and the resolver that turns a plan into frames and cues, on small hand-made plans.
import { checkCut, cutMix, CutSchema, resolveCut, type CutContext, type CutTemplateInfo } from "@clipforge/schema";
import { describe, expect, it } from "vitest";

const ctx: CutContext = {
  templates: new Map<string, CutTemplateInfo>([
    ["stat-punch", { mode: "graphic", layouts: ["full", "split"], seconds: { min: 3, max: 7 }, mediaSlots: 0, validate: (p) => (typeof (p as { value?: unknown }).value === "number" ? [] : ["value must be a number"]) }],
    ["footage-reveal", { mode: "screen", layouts: ["full"], seconds: { min: 3, max: 12 }, mediaSlots: 1, validate: () => [] }],
    ["title-card", { mode: "text", layouts: ["full"], seconds: { min: 2, max: 6 }, mediaSlots: 0, validate: () => [] }],
  ]),
  sceneExists: (file) => file === "scenes/intro.tsx",
};

// A healthy 30 s plan: about 45% face, 35% graphics, 20% footage, nothing repeated.
const good = {
  version: 2,
  duration: 30,
  faceCam: true,
  style: "studio",
  segments: [
    { id: "a", start: 0, end: 4, layout: "full", visual: { kind: "scene", file: "scenes/intro.tsx", basedOn: ["title-card"], mode: "text" } },
    { id: "b", start: 4, end: 13, layout: "face", move: "punch-in" },
    { id: "c", start: 13, end: 19, layout: "full", visual: { kind: "template", template: "footage-reveal", props: {} }, media: [{ kind: "video", src: "media/screen.mp4" }] },
    { id: "d", start: 19, end: 25, layout: "split", visual: { kind: "template", template: "stat-punch", props: { value: 88 } } },
    { id: "e", start: 25, end: 30, layout: "face", move: "hold" },
  ],
};

describe("checkCut", () => {
  it("passes a healthy plan", () => {
    const report = checkCut(good, ctx);
    expect(report.issues.filter((i) => i.level === "red")).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("finds gaps, overlaps and a short ending", () => {
    const plan = structuredClone(good);
    plan.segments[1]!.start = 4.5;
    plan.segments[3]!.start = 18;
    plan.segments[4]!.end = 28;
    const rules = checkCut(plan, ctx).issues.filter((i) => i.rule === "coverage").map((i) => i.message);
    expect(rules.some((m) => m.startsWith("gap of 0.50 s"))).toBe(true);
    expect(rules.some((m) => m.includes("overlaps"))).toBe(true);
    expect(rules.some((m) => m.includes("narration runs to"))).toBe(true);
  });

  it("checks templates, props, layouts, media and scene files", () => {
    const plan = structuredClone(good) as typeof good;
    (plan.segments[2] as { media: unknown[] }).media = [];
    (plan.segments[3]!.visual as { props: unknown }).props = { value: "lots" };
    (plan.segments[0]!.visual as { file: string }).file = "scenes/missing.tsx";
    const messages = checkCut(plan, ctx).issues.map((i) => `${i.rule}: ${i.message}`);
    expect(messages).toContain('media: "footage-reveal" needs 1 media slot; 0 given');
    expect(messages).toContain("props: stat-punch: value must be a number");
    expect(messages).toContain("visual: scene file scenes/missing.tsx doesn't exist yet");
    const split = structuredClone(good) as typeof good;
    split.segments[2]!.layout = "split";
    expect(checkCut(split, ctx).issues.map((i) => i.message)).toContain('"footage-reveal" isn\'t made for split (it fits full)');
  });

  it("refuses face layouts without face cam", () => {
    const plan = { ...structuredClone(good), faceCam: false };
    expect(checkCut(plan, ctx).issues.filter((i) => i.rule === "face")).toHaveLength(3);
  });

  it("flags repetition: the same base twice, the same move twice, one layout too long", () => {
    const plan = structuredClone(good) as typeof good;
    plan.segments[0] = { id: "a", start: 0, end: 4, layout: "split", visual: { kind: "template", template: "stat-punch", props: { value: 1 } } } as never;
    plan.segments[1] = { id: "b", start: 4, end: 13, layout: "split", visual: { kind: "template", template: "stat-punch", props: { value: 2 } }, move: "push" } as never;
    plan.segments[2] = { ...plan.segments[2]!, layout: "full", move: "push" } as never;
    plan.segments[3]!.start = 19;
    const variety = checkCut(plan, ctx).issues.filter((i) => i.rule === "variety").map((i) => i.message);
    expect(variety).toContain('"stat-punch" twice in a row');
    expect(variety).toContain('the same move ("push") twice in a row');
    const longFace = { ...structuredClone(good), segments: [{ id: "x", start: 0, end: 30, layout: "face" }] };
    expect(checkCut(longFace, ctx).issues.some((i) => i.message.includes('layout "face" for 30 s straight'))).toBe(true);
  });

  it("measures the mix, counting a split as half face", () => {
    const report = checkCut(good, ctx);
    expect(report.mix.face).toBeCloseTo((9 + 3 + 5) / 30, 3);
    expect(report.mix.footage).toBeCloseTo(6 / 30, 3);
    expect(cutMix({ ...good, segments: [{ ...good.segments[1]!, start: 0, end: 30 }] } as never, ctx).face).toBe(1);
    expect(checkCut({ ...structuredClone(good), segments: [{ id: "x", start: 0, end: 30, layout: "face" }] }, ctx).issues.some((i) => i.rule === "mix")).toBe(true);
  });

  it("reports a malformed plan instead of throwing", () => {
    const report = checkCut({ version: 1, segments: [] }, ctx);
    expect(report.ok).toBe(false);
    expect(report.issues[0]!.rule).toBe("shape");
  });

  it("doesn't flag one long layout on a video without face cam", () => {
    const plan = { ...structuredClone(good), faceCam: false, segments: good.segments.map((seg) => ({ ...seg, layout: "full", visual: seg.visual ?? { kind: "template", template: "title-card", props: {} } })) };
    expect(checkCut(plan, ctx).issues.some((i) => i.message.includes("straight"))).toBe(false);
  });
});

describe("resolveCut", () => {
  const words = [
    { text: "Hello", start: 0.2, end: 0.5 },
    { text: "there.", start: 3.98, end: 4.3 },
    { text: "Numbers", start: 13.4, end: 13.9 },
  ];

  it("gives neighbours a shared boundary frame and covers every frame once", () => {
    const plan = resolveCut(CutSchema.parse({ ...good, segments: good.segments.map((seg, i) => (i === 2 ? { ...seg, start: 13.017 } : seg)) }), words, 30);
    expect(plan.frames).toBe(900);
    expect(plan.segments[0]!.from).toBe(0);
    plan.segments.forEach((seg, i) => {
      const next = plan.segments[i + 1];
      if (next) expect(next.from).toBe(seg.to);
    });
    expect(plan.segments.at(-1)!.to).toBe(900);
    expect(plan.segments[2]!.from).toBe(391);
  });

  it("fills each segment's cues in seconds from its own first frame", () => {
    const plan = resolveCut(CutSchema.parse(good), words, 30);
    // A word spoken a hair before its segment's boundary frame still belongs to the segment it starts.
    expect(plan.segments[1]!.cues.map((c) => c.word)).toEqual(["there."]);
    expect(plan.segments[1]!.cues[0]!.at).toBeCloseTo(-0.02, 3);
    expect(plan.segments[2]!.cues[0]).toEqual({ at: 0.4, end: 0.9, word: "Numbers" });
    expect(plan.segments[0]!.cues.map((c) => c.word)).toEqual(["Hello"]);
  });
});

describe("music-only plans", () => {
  const music = {
    version: 2,
    duration: 17,
    audio: "music",
    faceCam: false,
    style: "night",
    music: { trackId: "t1", title: "T", credit: "T by X (CC BY 4.0)" },
    segments: [
      { id: "a", start: 0, end: 5, layout: "full", visual: { kind: "template", template: "stat-punch", props: { value: 1, label: "of codes", landWord: "land" } }, cues: [{ at: 1, word: "land" }] },
      { id: "b", start: 5, end: 10, layout: "full", visual: { kind: "template", template: "title-card", props: { lines: ["One", "two"] } }, cues: [{ at: 0.5, word: "One" }] },
      { id: "c", start: 10, end: 17, layout: "full", visual: { kind: "template", template: "stat-punch", props: { value: 2 } } },
    ],
  };
  const on: CutContext = { ...ctx, beats: [0, 5, 10, 15], styles: { night: { bg: "#0c0d10", surface: "#16181d", ink: "#f2f2f0", muted: "#8a8f98", accent: "#7cf29c" } }, creditOf: (t) => (t === "t1" ? "T by X\n(CC BY 4.0)" : null) };
  const found = (plan: unknown) => checkCut(plan, on).issues.map((i) => `${i.level} ${i.rule}`);

  it("accepts all-drawn graphics and needs no footage", () => {
    expect(checkCut(music, on).issues).toEqual([]);
  });

  it("needs a track and a style that exist, and no face", () => {
    expect(found({ ...music, music: undefined })).toContain("red music");
    expect(found({ ...music, music: { ...music.music, trackId: "nope" } })).toContain("red music");
    expect(found({ ...music, music: { ...music.music, credit: "CC BY 4.0" } })).toContain("red music");
    expect(found({ ...music, faceCam: true })).toContain("red music");
    expect(found({ ...music, style: "nope" })).toContain("red style");
    expect(found({ ...music, look: { ink: "#222222" } })).toContain("red style");
    expect(found({ ...music, look: { ink: "white" } })).toContain("red shape");
    expect(found({ ...music, look: { bg: "#101820", accent: "#ffb000" } })).toEqual([]);
  });

  it("flags cuts off the beat, cues that don't exist, rushed text and a slideshow", () => {
    const off = structuredClone(music);
    off.segments[0]!.end = 5.2;
    off.segments[1]!.start = 5.2;
    expect(found(off)).toContain("yellow beat");
    const lost = structuredClone(music);
    (lost.segments[0]!.visual.props as { landWord: string }).landWord = "elsewhere";
    expect(found(lost)).toContain("yellow cue");
    const late = structuredClone(music);
    late.segments[0]!.cues![0]!.at = 9;
    expect(found(late)).toContain("red cue");
    const wordy = structuredClone(music);
    (wordy.segments[0]!.visual.props as { label: string }).label = "a very long label that nobody could possibly read in the time it stays on the screen here";
    expect(found(wordy)).toContain("yellow reading");
    const slides = structuredClone(music);
    slides.segments[2]!.visual = { kind: "template", template: "title-card", props: { lines: ["x"] } } as never;
    expect(checkCut(slides, on).issues.some((i) => /slideshow/.test(i.message))).toBe(true);
  });

  it("uses the plan's own cues instead of narration", () => {
    const plan = resolveCut(CutSchema.parse(music), [{ text: "spoken", start: 1, end: 2 }], 30);
    expect(plan.segments[0]!.cues).toEqual([{ at: 1, end: 1.3, word: "land" }]);
  });

  it("checks a voice plan's words too, once they're known", () => {
    const voice = { ...music, audio: "voice", music: undefined, segments: music.segments.map(({ cues: _cues, ...seg }) => seg) };
    expect(checkCut(voice, { ...on, words: [{ text: "land,", start: 1, end: 1.4 }] }).issues.some((i) => i.rule === "cue")).toBe(false);
    expect(checkCut(voice, { ...on, words: [{ text: "other", start: 1, end: 1.4 }] }).issues.some((i) => i.rule === "cue")).toBe(true);
  });
});
