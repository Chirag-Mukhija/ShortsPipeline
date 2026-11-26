// The Cut renderer: draws a resolved Cut plan frame by frame — the face cam as the base layer with punch-ins, each segment's template or scene placed by its layout in the video's style, and the library's transitions between segments.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { ResolvedCut, ResolvedSegment } from "@clipforge/schema";
import type { Media, SceneProps, Style } from "../kit/contract";
import { KIT } from "../kit/index";
import { STYLES, type StyleName } from "../kit/styles";
import { blurIn, blurOut } from "../library/core/transitions";
import { MaskGrow, PushThrough, Whip, type Dir } from "../library/core/transition-pack";

export const W = 1920;
export const H = 1080;
// A split puts the creator on the left and a 1000×1080 panel on the right (the size kit templates are previewed at).
export const PANEL_W = 1000;
const FACE_W = W - PANEL_W;

// Transition lengths in seconds; never more than half the incoming segment.
const TRANSITION_SECONDS = { cut: 0, whip: 0.3, push: 0.7, mask: 0.7, fade: 0.5 } as const;

export type SceneMap = Record<string, FC<SceneProps<Record<string, unknown>>>>;
export type CutVideoProps = { plan: ResolvedCut; scenes: SceneMap; face?: { src: string; focus?: [number, number] } };

const templates = new Map(KIT.map((t) => [t.id, t]));
const styleOf = (plan: Pick<ResolvedCut, "style" | "look">): Style => ({ ...(STYLES[plan.style as StyleName] ?? STYLES.studio), ...plan.look });
const mediaOf = (seg: ResolvedSegment): Media[] => seg.media.filter((m) => m.src).map((m) => ({ kind: m.kind, src: m.src!.startsWith("media/") ? m.src! : `media/${m.src}`, from: m.from }));

// The face cam's zoom over one segment, in local seconds: "push" creeps in, "punch-in" toggles a quick zoom on each punch word, "drift" sways a little.
const faceZoom = (seg: ResolvedSegment, t: number, len: number): { scale: number; x: number } => {
  const move = seg.move ?? "hold";
  let scale = 1;
  let x = 0;
  if (move === "push") scale = interpolate(t, [0, len], [1, 1.07], { extrapolateRight: "clamp" });
  if (move === "drift") x = 18 * Math.sin((t / Math.max(len, 1)) * Math.PI);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const wanted = seg.punch.map(norm);
  const hits = seg.cues.filter((c) => wanted.includes(norm(c.word))).map((c) => c.at);
  // A segment that asks for punch-in but names no word punches on its first word after a third of the way through.
  if (move === "punch-in" && hits.length === 0) {
    const fallback = seg.cues.find((c) => c.at > len / 3);
    if (fallback) hits.push(fallback.at);
  }
  hits.forEach((at, i) => {
    const target = i % 2 === 0 ? 1.16 : 1 / 1.16;
    const e = interpolate(t, [at - 0.04, at + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    scale *= 1 + (target - 1) * e;
  });
  return { scale, x };
};

const Face: FC<{ src: string; focus: [number, number]; width: number; zoom: { scale: number; x: number } }> = ({ src, focus, width, zoom }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width, height: H, overflow: "hidden" }}>
    <OffthreadVideo
      src={staticFile(src)}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `translateX(${zoom.x}px) scale(${zoom.scale})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` }}
    />
  </div>
);

// The segment's visual (kit template as is, or this video's own scene) at a given canvas size, with its local clock starting at the segment's first frame.
const Visual: FC<{ seg: ResolvedSegment; plan: ResolvedCut; scenes: SceneMap; width: number; overlay: boolean }> = ({ seg, plan, scenes, width, overlay }) => {
  if (!seg.visual) return null;
  const base = styleOf(plan);
  // On an overlay the face shows through, so the visual draws on a transparent canvas.
  const style = overlay ? { ...base, bg: "transparent" } : base;
  const common = { style, width, height: H, duration: (seg.to - seg.from) / plan.fps, media: mediaOf(seg), cues: seg.cues };
  let node: ReactNode;
  if (seg.visual.kind === "template") {
    const tpl = templates.get(seg.visual.template);
    if (!tpl) throw new Error(`segment ${seg.id}: no kit template "${seg.visual.template}"`);
    node = <tpl.Component props={tpl.schema.parse(seg.visual.props)} {...common} />;
  } else {
    const Scene = scenes[seg.visual.file];
    if (!Scene) throw new Error(`segment ${seg.id}: scene ${seg.visual.file} isn't registered`);
    node = <Scene props={{}} {...common} />;
  }
  return (
    <Sequence from={seg.from} layout="none">
      <div style={{ position: "absolute", right: 0, top: 0, width, height: H, overflow: "hidden" }}>{node}</div>
    </Sequence>
  );
};

// One segment, full frame: what the viewer sees while it plays (and while it hands over to the next one).
const SegmentFrame: FC<CutVideoProps & { seg: ResolvedSegment }> = ({ seg, plan, scenes, face }) => {
  const frame = useCurrentFrame();
  const t = (frame - seg.from) / plan.fps;
  const len = (seg.to - seg.from) / plan.fps;
  const bg = styleOf(plan).bg;
  const showFace = plan.faceCam && face && seg.layout !== "full";
  const zoom = faceZoom(seg, t, len);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      {showFace ? <Face src={face.src} focus={face.focus ?? [0.5, 0.4]} width={seg.layout === "split" ? FACE_W : W} zoom={zoom} /> : null}
      {seg.layout === "face" ? null : <Visual seg={seg} plan={plan} scenes={scenes} width={seg.layout === "split" ? PANEL_W : W} overlay={seg.layout === "overlay"} />}
    </AbsoluteFill>
  );
};

export const CutVideo: FC<CutVideoProps> = (props) => {
  const { plan } = props;
  const frame = useCurrentFrame();
  const i = Math.max(0, plan.segments.findIndex((s) => frame >= s.from && frame < s.to));
  const seg = plan.segments[i]!;
  const prev = plan.segments[i - 1];
  const len = (seg.to - seg.from) / plan.fps;
  const dur = Math.min(TRANSITION_SECONDS[seg.transitionIn], len / 2);
  const p = dur > 0 ? (frame - seg.from) / (dur * plan.fps) : 1;
  const b = <SegmentFrame {...props} seg={seg} />;
  if (!prev || p >= 1) return b;
  const a = <SegmentFrame {...props} seg={prev} />;
  switch (seg.transitionIn) {
    case "whip": {
      // Alternate the whip's direction so consecutive whips don't all travel the same way.
      const dir: Dir = i % 2 === 0 ? "left" : "right";
      return <Whip p={p} a={a} b={b} dir={dir} />;
    }
    case "push":
      // The paper colour covers the swap; without it the incoming scene starts near-transparent over black for a frame.
      return <PushThrough p={p} a={a} b={b} depth={6} fill={styleOf(plan).bg} />;
    case "mask":
      return <MaskGrow p={p} a={a} b={b} />;
    case "fade": {
      const e = Easing.inOut(Easing.cubic)(p);
      return (
        <AbsoluteFill>
          <AbsoluteFill style={blurOut(e, { dy: 0 })}>{a}</AbsoluteFill>
          <AbsoluteFill style={blurIn(e, { dy: 0 })}>{b}</AbsoluteFill>
        </AbsoluteFill>
      );
    }
    default:
      return b;
  }
};
