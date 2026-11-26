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
  // Spoken words (in this segment) the face cam punches in on: each one toggles a quick zoom in or back out. Only for layouts that show the face.
  punch: z.array(z.string()).default([]),
  // Moments this segment's visual lands on, in seconds from its start. On a voice video leave it out: the narration's words fill it. On a music-only video the plan times them itself, on the track's beats.
  cues: z.array(z.object({ at: z.number().min(0), end: z.number().optional(), word: z.string().min(1) })).optional(),
  transitionIn: z.enum(["cut", "push", "whip", "mask", "fade"]).default("cut"),
  note: z.string().optional(),
});

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "use a 6-digit hex colour like #0b1020");
// This video's own colours and feel, laid over the style preset it starts from (whose fonts it keeps).
export const CutLookSchema = z.object({ bg: hex, surface: hex, ink: hex, muted: hex, accent: hex, accent2: hex, radius: z.number().min(0).max(40), motion: z.enum(["calm", "snappy", "hand"]) }).partial();

export const CutSchema = z.object({
  version: z.literal(2),
  duration: z.number().positive(),
  faceCam: z.boolean(),
  // "music": no voice, so the track is the whole soundtrack and the plan sets its own duration and cues.
  audio: z.enum(["voice", "music"]).default("voice"),
  music: z.object({ trackId: z.string(), title: z.string(), credit: z.string() }).optional(),
  mix: z.object({ musicDb: z.number().default(0), musicStart: z.number().min(0).default(0), fadeIn: z.number().min(0).default(0.4), fadeOut: z.number().min(0).default(3) }).optional(),
  style: z.string(),
  look: CutLookSchema.optional(),
  segments: z.array(CutSegmentSchema).min(1),
});

export type CutSegment = z.infer<typeof CutSegmentSchema>;
export type Cut = z.infer<typeof CutSchema>;

// What the checker needs to know about each kit template; the caller builds this from the kit (props validation included).
export type CutTemplateInfo = { mode: (typeof CUT_MODES)[number]; layouts: string[]; seconds: { min: number; max: number }; mediaSlots: number; validate: (props: unknown) => string[] };
export type CutContext = {
  templates: Map<string, CutTemplateInfo>;
  sceneExists?: (file: string) => boolean;
  // The narration's words (voice), and the track's beats in video time (music), when known: they turn on the timing checks.
  words?: NarrationWord[];
  beats?: number[];
  styles?: Record<string, { bg: string; surface: string; ink: string; muted: string; accent: string }>;
  // A library track's required attribution, or null when the track isn't there.
  creditOf?: (trackId: string) => string | null;
};

export type CutIssue = { level: "red" | "yellow"; rule: string; segment?: string; at?: number; message: string };
export type MixShare = { face: number; graphic: number; footage: number };
export type CutReport = { ok: boolean; red: number; yellow: number; issues: CutIssue[]; mix: MixShare };

// The visual-mix targets the creator chose (2026-11-22): with face cam, face 40–50%, graphics 30–40%, footage 20–30%; without, graphics about half.
// A music-only video with nothing filmed is all drawn, so only its graphics have a floor.
export const MIX_TARGETS: Record<"withFace" | "noFace" | "musicOnly", Record<keyof MixShare, [number, number]>> = {
  musicOnly: { face: [0, 0], graphic: [0.4, 1], footage: [0, 0.6] },
  withFace: { face: [0.4, 0.5], graphic: [0.3, 0.4], footage: [0.2, 0.3] },
  noFace: { face: [0, 0], graphic: [0.4, 0.6], footage: [0.25, 0.6] },
};

const GAP = 0.04; // seconds of slack between segments (about one frame)
const MIN_SEGMENT = 0.8; // shorter than this can't be read
const SAME_LAYOUT_MAX = 15; // seconds before one layout feels static
const OVERUSE = 0.25; // one template in more than a quarter of the segments looks forced
const MIX_SLACK = 0.05;
const ON_BEAT = 0.07; // seconds a music-only cut may sit off its beat (about two frames)
const TEXT_SHARE = 0.4; // more than this much of a music-only video as text cards is a slideshow

// WCAG contrast of two hex colours, 1–21.
function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const normWord = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
// Every prop that names a moment to land on ("word", "titleWord", "cue"…), wherever it's nested.
function cueWords(value: unknown, key = "", out: string[] = []): string[] {
  if (typeof value === "string") {
    if (/^(word|cue)$|Word$/.test(key)) out.push(value);
  } else if (Array.isArray(value)) value.forEach((v) => cueWords(v, key, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) cueWords(v, k, out);
  return out;
}
// The words a viewer has to read in a template's props: its text-like fields only, not enums or ids.
const TEXT_KEY = /^(text|title|label|lines|quote|caption|note|name|verdict|kicker|detail|by|problem|solution|signoff|source|lead|tagline|eyebrow|ability|points|say)$/;
function readWords(value: unknown, key = ""): number {
  if (typeof value === "string") return TEXT_KEY.test(key) ? value.split(/\s+/).filter(Boolean).length : 0;
  if (Array.isArray(value)) return value.reduce((n: number, v) => n + readWords(v, key), 0);
  if (value && typeof value === "object") return Object.entries(value).reduce((n, [k, v]) => n + readWords(v, k), 0);
  return 0;
}

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

  // The soundtrack: a music-only plan must carry its own track and can't lean on a face or a voice.
  if (cut.audio === "music") {
    if (!cut.music) red("music", undefined, "a music-only plan needs its track (music: trackId, title, credit)");
    else if (ctx.creditOf) {
      const credit = ctx.creditOf(cut.music.trackId);
      const flat = (t: string) => t.replace(/\s+/g, " ").trim();
      if (credit === null) red("music", undefined, `track "${cut.music.trackId}" isn't in the music library`);
      else if (flat(credit) !== flat(cut.music.credit)) red("music", undefined, `music.credit must be the track's attribution, word for word: "${flat(credit)}"`);
    }
    if (cut.faceCam) red("music", undefined, "music-only and face cam can't go together here");
    const textTime = segs.reduce((n, seg) => n + (seg.layout !== "face" && modeOf(seg, ctx) === "text" ? seg.end - seg.start : 0), 0);
    if (textTime / cut.duration > TEXT_SHARE) yellow("variety", undefined, `${Math.round((textTime / cut.duration) * 100)}% of the video is text cards: it reads like a slideshow`);
  }
  if (ctx.styles) {
    const base = ctx.styles[cut.style];
    if (!base) red("style", undefined, `no style called "${cut.style}" (there are ${Object.keys(ctx.styles).join(", ")})`);
    else {
      const look = { ...base, ...cut.look };
      for (const on of ["bg", "surface"] as const) {
        const ratio = contrast(look.ink, look[on]);
        if (ratio < 4.5) red("style", undefined, `ink on ${on} has contrast ${ratio.toFixed(1)}; text needs 4.5`);
        if (contrast(look.muted, look[on]) < 3) yellow("style", undefined, `muted on ${on} has contrast ${contrast(look.muted, look[on]).toFixed(1)}; small text needs 3`);
      }
      if (contrast(look.accent, look.bg) < 2) yellow("style", undefined, "the accent barely stands out from the background");
    }
  }

  // Timing: visuals land on moments that exist, text stays up long enough to read, and music-only cuts sit on the beat.
  segs.forEach((seg, i) => {
    const d = seg.end - seg.start;
    const spoken = seg.cues ?? ctx.words?.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end - 0.05).map((w) => ({ at: w.start - seg.start, word: w.text }));
    for (const c of seg.cues ?? []) if (c.at > d) red("cue", seg, `cue "${c.word}" is at ${c.at.toFixed(1)} s but the segment is ${d.toFixed(1)} s long`);
    if (seg.visual?.kind === "template" && spoken && (cut.audio === "music" || ctx.words)) {
      const have = new Set(spoken.map((c) => normWord(c.word)));
      for (const w of cueWords(seg.visual.props)) if (!have.has(normWord(w))) yellow("cue", seg, `lands on "${w}", which isn't ${cut.audio === "music" ? "one of this segment's cues" : "spoken in this segment"}, so it falls back to default timing`);
    }
    if (cut.audio === "music") {
      if (seg.visual?.kind === "template" && !seg.cues?.length && cueWords(seg.visual.props).length) yellow("cue", seg, "no cues, so nothing in it lands on the music");
      if (seg.visual?.kind === "template") {
        const n = readWords(seg.visual.props);
        const need = 1.5 + 0.3 * n;
        if (n > 0 && d < need - 0.25) yellow("reading", seg, `${n} words need about ${need.toFixed(1)} s to read; it's up for ${d.toFixed(1)} s`);
      }
      if (i > 0 && ctx.beats?.length) {
        const off = Math.min(...ctx.beats.map((b) => Math.abs(b - seg.start)));
        if (off > ON_BEAT) yellow("beat", seg, `cuts ${off.toFixed(2)} s off the nearest beat`);
      }
    }
  });

  // Variety: the repetition that made video 001 boring after two minutes.
  const baseOf = (seg: CutSegment) => (seg.visual?.kind === "template" ? seg.visual.template : seg.visual?.kind === "scene" ? (seg.visual.basedOn[0] ?? seg.visual.file) : null);
  segs.forEach((seg, i) => {
    const prev = segs[i - 1];
    if (!prev) return;
    const a = baseOf(prev);
    if (a && a === baseOf(seg)) yellow("variety", seg, `"${a}" twice in a row`);
    if (seg.move && seg.move === prev.move && seg.move !== "hold") yellow("variety", seg, `the same move ("${seg.move}") twice in a row`);
  });
  // Without face cam every segment is "full", so a long run of one layout says nothing; the template checks above carry variety there.
  let runStart = 0;
  if (cut.faceCam) segs.forEach((seg, i) => {
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
  const targets = MIX_TARGETS[cut.faceCam ? "withFace" : cut.audio === "music" ? "musicOnly" : "noFace"];
  for (const key of ["face", "graphic", "footage"] as const) {
    const [lo, hi] = targets[key];
    if (!cut.faceCam && key === "face") continue;
    if (mix[key] < lo - MIX_SLACK || mix[key] > hi + MIX_SLACK) yellow("mix", undefined, `${key} is ${Math.round(mix[key] * 100)}% of the video; the target is ${Math.round(lo * 100)}–${Math.round(hi * 100)}%`);
  }

  const reds = issues.filter((i) => i.level === "red").length;
  return { ok: reds === 0, red: reds, yellow: issues.length - reds, issues: issues.sort((a, b) => (a.at ?? -1) - (b.at ?? -1)), mix };
}

// A segment ready to render: whole-frame bounds on the narration's timeline and its spoken words, in seconds from its own first frame.
export type CutCue = { at: number; end: number; word: string };
export type ResolvedSegment = Omit<CutSegment, "cues"> & { from: number; to: number; cues: CutCue[] };
export type ResolvedCut = Omit<Cut, "segments"> & { fps: number; frames: number; segments: ResolvedSegment[] };
export type NarrationWord = { text: string; start: number; end: number };

// Frame bounds come from the sorted starts, so neighbours share a boundary frame and nothing is dropped or doubled by rounding.
export function resolveCut(cut: Cut, words: NarrationWord[], fps: number): ResolvedCut {
  const segs = [...cut.segments].sort((a, b) => a.start - b.start);
  const frames = Math.round(cut.duration * fps);
  const bounds = segs.map((s, i) => (i === 0 ? 0 : Math.min(frames, Math.round(s.start * fps))));
  const segments = segs.map((s, i) => {
    const from = bounds[i]!;
    const to = i + 1 < segs.length ? bounds[i + 1]! : frames;
    const zero = from / fps;
    const end = to / fps;
    // Windows are shifted 50 ms early so a word starting a hair before its segment's boundary frame belongs to that segment, and to no other.
    const last = i + 1 === segs.length;
    const own = s.cues?.map((c) => ({ at: c.at, end: c.end ?? c.at + 0.3, word: c.word }));
    const cues = own ?? words.filter((w) => w.start >= zero - 0.05 && (last || w.start < end - 0.05)).map((w) => ({ at: +(w.start - zero).toFixed(3), end: +(w.end - zero).toFixed(3), word: w.text }));
    return { ...s, from, to, cues };
  });
  return { ...cut, fps, frames, segments };
}
