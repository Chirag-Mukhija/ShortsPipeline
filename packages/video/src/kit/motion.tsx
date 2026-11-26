// Shared building blocks for kit templates: time in seconds, style-aware springs, cue lookup and a media fill that crops footage around its subject.
import type { CSSProperties, FC } from "react";
import { Easing, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Cue, Media, Style } from "./contract";

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// 0→1 starting at `at` seconds, shaped by the style's temperament. A pure function of the frame, so any frame renders on its own.
export const enter = (style: Style, frame: number, fps: number, at: number, seconds = 0.6) => {
  // A moment that never comes (an optional part left out) is Infinity; interpolate and spring only take finite times.
  if (!Number.isFinite(at)) return at > 0 ? 0 : 1;
  const start = at * fps;
  if (style.motion === "snappy") return spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 140, mass: 0.9 }, durationInFrames: Math.round(seconds * fps) });
  const easing = style.motion === "hand" ? Easing.out(Easing.back(1.6)) : Easing.inOut(Easing.cubic);
  return interpolate(frame, [start, start + seconds * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
};

// The time of the first spoken word matching `word` (case and punctuation ignored), else `fallback`.
export const cueAt = (cues: Cue[], word: string | undefined, fallback: number) => {
  if (!word) return fallback;
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const hit = cues.find((c) => norm(c.word) === norm(word));
  return hit ? hit.at : fallback;
};

const resolve = (src: string) => (/^https?:/.test(src) ? src : staticFile(src));

// Fills its parent with footage or an image, cropped around the subject's focus point; `zoom` pushes in around the same point.
export const MediaFill: FC<{ media: Media; zoom?: number; style?: CSSProperties }> = ({ media, zoom = 1, style }) => {
  const [fx, fy] = media.focus ?? [0.5, 0.5];
  const css: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${fx * 100}% ${fy * 100}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${fx * 100}% ${fy * 100}%`,
    ...style,
  };
  const { fps } = useVideoConfig();
  return media.kind === "video" ? (
    <OffthreadVideo src={resolve(media.src)} muted trimBefore={Math.round((media.from ?? 0) * fps)} style={css} />
  ) : (
    <Img src={resolve(media.src)} style={css} />
  );
};
