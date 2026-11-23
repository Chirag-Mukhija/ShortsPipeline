// The Cut plan (edit.json version 2): what is on screen second by second, and the automatic checks that catch a bad plan before anything renders. Pure data and arithmetic; templates are passed in, so this file has no video-engine imports.
import { z } from "zod";

export const CUT_LAYOUTS = ["face", "full", "split", "overlay"] as const;
export const CUT_MODES = ["face", "graphic", "text", "stock", "screen"] as const;

const media = z.object({
  kind: z.enum(["video", "image"]),
  // A file in the video's media folder, or nothing yet: then `need` says what to shoot or find ("stock: server racks at night").
  src: z.string().optional(),
  need: z.string().optional(),
  from: z.number().min(0).optional(),
});

// Decision: a segment's visual is either a kit template used as is, or a scene written for this video (usually adapted from templates, named in `basedOn`). Templates are a base to start from, never a menu to fill.
const visual = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("template"), template: z.string(), props: z.record(z.string(), z.unknown()).default({}) }),
  z.object({ kind: z.literal("scene"), file: z.string(), basedOn: z.array(z.string()).default([]), mode: z.enum(CUT_MODES).default("graphic") }),
]);

export const CutSegmentSchema = z.object({
  id: z.string(),
  start: z.number().min(0),
  end: z.number().positive(),
  layout: z.enum(CUT_LAYOUTS),
  visual: visual.optional(),
  media: z.array(media).default([]),
  // How the camera or the face frame moves in this segment, e.g. "punch-in", "push", "whip", "hold".
  move: z.string().optional(),
  transitionIn: z.enum(["cut", "push", "whip", "mask", "fade"]).default("cut"),
  note: z.string().optional(),
});

export const CutSchema = z.object({
  version: z.literal(2),
  duration: z.number().positive(),
  faceCam: z.boolean(),
  style: z.string(),
  segments: z.array(CutSegmentSchema).min(1),
});

export type CutSegment = z.infer<typeof CutSegmentSchema>;
export type Cut = z.infer<typeof CutSchema>;

// What the checker needs to know about each kit template; the caller builds this from the kit (props validation included).
export type CutTemplateInfo = { mode: (typeof CUT_MODES)[number]; layouts: string[]; seconds: { min: number; max: number }; mediaSlots: number; validate: (props: unknown) => string[] };
export type CutContext = { templates: Map<string, CutTemplateInfo>; sceneExists?: (file: string) => boolean };

export type CutIssue = { level: "red" | "yellow"; rule: string; segment?: string; at?: number; message: string };
export type MixShare = { face: number; graphic: number; footage: number };
export type CutReport = { ok: boolean; red: number; yellow: number; issues: CutIssue[]; mix: MixShare };

// The visual-mix targets the creator chose (2026-11-22): with face cam, face 40–50%, graphics 30–40%, footage 20–30%; without, graphics about half.
export const MIX_TARGETS: Record<"withFace" | "noFace", Record<keyof MixShare, [number, number]>> = {
  withFace: { face: [0.4, 0.5], graphic: [0.3, 0.4], footage: [0.2, 0.3] },
  noFace: { face: [0, 0], graphic: [0.4, 0.6], footage: [0.25, 0.6] },
};

const GAP = 0.04; // seconds of slack between segments (about one frame)
const MIN_SEGMENT = 0.8; // shorter than this can't be read
const SAME_LAYOUT_MAX = 15; // seconds before one layout feels static
const OVERUSE = 0.25; // one template in more than a quarter of the segments looks forced
const MIX_SLACK = 0.05;

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

function modeOf(seg: CutSegment, ctx: CutContext): (typeof CUT_MODES)[number] {
  if (seg.layout === "face") return "face";
  if (seg.visual?.kind === "template") return ctx.templates.get(seg.visual.template)?.mode ?? "graphic";
  if (seg.visual?.kind === "scene") return seg.visual.mode;
  return "graphic";
}

// Seconds of face / graphics / footage: a split shows both the face and its panel, so it counts half to each.
export function cutMix(cut: Cut, ctx: CutContext): MixShare {
  const total = { face: 0, graphic: 0, footage: 0 };
  for (const seg of cut.segments) {
    const d = Math.max(0, seg.end - seg.start);
    const mode = modeOf(seg, ctx);
    const bucket = mode === "face" ? "face" : mode === "stock" || mode === "screen" ? "footage" : "graphic";
    if (seg.layout === "split") {
      total.face += d / 2;
      total[bucket] += d / 2;
    } else if (seg.layout === "overlay") {
      total.face += d / 2;
      total[bucket === "face" ? "graphic" : bucket] += d / 2;
    } else total[bucket] += d;
  }
  const sum = total.face + total.graphic + total.footage || 1;
  return { face: total.face / sum, graphic: total.graphic / sum, footage: total.footage / sum };
}

export function checkCut(input: unknown, ctx: CutContext): CutReport {
  const issues: CutIssue[] = [];
  const parsed = CutSchema.safeParse(input);
  if (!parsed.success) {
    for (const e of parsed.error.issues.slice(0, 20)) issues.push({ level: "red", rule: "shape", message: `${e.path.join(".") || "plan"}: ${e.message}` });
    return { ok: false, red: issues.length, yellow: 0, issues, mix: { face: 0, graphic: 0, footage: 0 } };
  }
  const cut = parsed.data;
  const segs = [...cut.segments].sort((a, b) => a.start - b.start);
  const red = (rule: string, seg: CutSegment | undefined, message: string) => issues.push({ level: "red", rule, segment: seg?.id, at: seg?.start, message });
  const yellow = (rule: string, seg: CutSegment | undefined, message: string) => issues.push({ level: "yellow", rule, segment: seg?.id, at: seg?.start, message });

  // Coverage: every second of the narration has exactly one segment.
  if (segs[0]!.start > GAP) red("coverage", segs[0], `nothing on screen from 0:00.0 to ${fmt(segs[0]!.start)}`);
  segs.forEach((seg, i) => {
    if (seg.end <= seg.start) red("coverage", seg, `ends before it starts (${fmt(seg.start)}–${fmt(seg.end)})`);
    const next = segs[i + 1];
    if (next && next.start - seg.end > GAP) red("coverage", next, `gap of ${(next.start - seg.end).toFixed(2)} s before it (${fmt(seg.end)}–${fmt(next.start)})`);
    if (next && seg.end - next.start > GAP) red("coverage", next, `overlaps "${seg.id}" by ${(seg.end - next.start).toFixed(2)} s`);
  });
  const last = segs[segs.length - 1]!;
  if (Math.abs(last.end - cut.duration) > 0.1) red("coverage", last, `the plan ends at ${fmt(last.end)} but the narration runs to ${fmt(cut.duration)}`);
  const ids = new Set<string>();
  for (const seg of segs) {
    if (ids.has(seg.id)) red("shape", seg, `segment id "${seg.id}" is used twice`);
    ids.add(seg.id);
  }

  // Each segment on its own: readable length, a visual that exists and fits, its media.
  for (const seg of segs) {
    const d = seg.end - seg.start;
    if (d < MIN_SEGMENT) red("length", seg, `only ${d.toFixed(2)} s: too short to read`);
    if (seg.layout === "face" || seg.layout === "split" || seg.layout === "overlay") {
      if (!cut.faceCam) red("face", seg, `layout "${seg.layout}" needs face cam, and this video has none`);
    }
    if (seg.layout !== "face" && !seg.visual) red("visual", seg, `layout "${seg.layout}" but no visual`);
    if (seg.layout === "face" && seg.visual) yellow("visual", seg, `layout "face" ignores its visual; use "overlay" or "split" to show it`);
    if (seg.visual?.kind === "template") {
      const t = ctx.templates.get(seg.visual.template);
      if (!t) red("visual", seg, `no kit template called "${seg.visual.template}"`);
      else {
        const wanted = seg.layout === "split" ? "split" : seg.layout === "overlay" ? "overlay" : "full";
        if (seg.layout !== "face" && !t.layouts.includes(wanted)) red("visual", seg, `"${seg.visual.template}" isn't made for ${wanted} (it fits ${t.layouts.join(", ")})`);
        for (const problem of t.validate(seg.visual.props)) red("props", seg, `${seg.visual.template}: ${problem}`);
        if (d < t.seconds.min - 0.05 || d > t.seconds.max + 0.05) yellow("length", seg, `${d.toFixed(1)} s, outside what "${seg.visual.template}" is designed for (${t.seconds.min}–${t.seconds.max} s)`);
        const have = seg.media.filter((m) => m.src).length;
        const asked = seg.media.filter((m) => !m.src && m.need).length;
        if (have + asked < t.mediaSlots) red("media", seg, `"${seg.visual.template}" needs ${t.mediaSlots} media slot${t.mediaSlots > 1 ? "s" : ""}; ${have + asked} given`);
      }
    }
    if (seg.visual?.kind === "scene" && ctx.sceneExists && !ctx.sceneExists(seg.visual.file)) red("visual", seg, `scene file ${seg.visual.file} doesn't exist yet`);
    for (const m of seg.media) if (!m.src && m.need) yellow("media", seg, `footage still needed: ${m.need}`);
  }

  // Variety: the repetition that made video 001 boring after two minutes.
  const baseOf = (seg: CutSegment) => (seg.visual?.kind === "template" ? seg.visual.template : seg.visual?.kind === "scene" ? (seg.visual.basedOn[0] ?? seg.visual.file) : null);
  segs.forEach((seg, i) => {
    const prev = segs[i - 1];
    if (!prev) return;
    const a = baseOf(prev);
    if (a && a === baseOf(seg)) yellow("variety", seg, `"${a}" twice in a row`);
    if (seg.move && seg.move === prev.move && seg.move !== "hold") yellow("variety", seg, `the same move ("${seg.move}") twice in a row`);
  });
  let runStart = 0;
  segs.forEach((seg, i) => {
    const next = segs[i + 1];
    if (next && next.layout === seg.layout) return;
    const from = segs[runStart]!;
    if (seg.end - from.start > SAME_LAYOUT_MAX) yellow("variety", from, `layout "${seg.layout}" for ${(seg.end - from.start).toFixed(0)} s straight (${fmt(from.start)}–${fmt(seg.end)}): change the shot`);
    runStart = i + 1;
  });
  const uses = new Map<string, number>();
  for (const seg of segs) {
    const b = baseOf(seg);
    if (b) uses.set(b, (uses.get(b) ?? 0) + 1);
  }
  const withVisual = segs.filter((s) => s.visual).length;
  for (const [b, n] of uses) if (withVisual >= 6 && n / withVisual > OVERUSE) yellow("variety", undefined, `"${b}" is in ${n} of ${withVisual} visual segments: it's being forced in`);

  // The visual mix against the creator's targets.
  const mix = cutMix(cut, ctx);
  const targets = MIX_TARGETS[cut.faceCam ? "withFace" : "noFace"];
  for (const key of ["face", "graphic", "footage"] as const) {
    const [lo, hi] = targets[key];
    if (!cut.faceCam && key === "face") continue;
    if (mix[key] < lo - MIX_SLACK || mix[key] > hi + MIX_SLACK) yellow("mix", undefined, `${key} is ${Math.round(mix[key] * 100)}% of the video; the target is ${Math.round(lo * 100)}–${Math.round(hi * 100)}%`);
  }

  const reds = issues.filter((i) => i.level === "red").length;
  return { ok: reds === 0, red: reds, yellow: issues.length - reds, issues: issues.sort((a, b) => (a.at ?? -1) - (b.at ?? -1)), mix };
}
