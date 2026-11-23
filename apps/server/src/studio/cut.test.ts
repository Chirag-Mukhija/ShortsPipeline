// Tests the Cut plan checker: coverage, visuals and props, media, variety and the visual mix, on small hand-made plans.
import { checkCut, cutMix, type CutContext, type CutTemplateInfo } from "@clipforge/schema";
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
});
