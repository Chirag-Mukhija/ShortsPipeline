// Long-form assembly in Remotion: one silent composition per beat (full timeline length, only that beat's scene) for clip rendering, plus a "full" preview with narration for Remotion Studio.
import type { FC } from "react";
import { AbsoluteFill, Audio, Composition, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import type { EditSpec } from "@clipforge/schema";
import { Animatic } from "./animatic";

export type { EditSpec };
export type SceneMap = Record<string, FC>;

// Scenes use video time (seconds from the start of the whole video), so a beat composition spans the full timeline and is rendered only over its own frame range.
const BeatOnly: FC<{ Scene: FC }> = ({ Scene }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Scene />
  </AbsoluteFill>
);

// A beat the team hasn't built yet: a plain card so the cut still plays end to end with the narration.
const Placeholder: FC<{ label: string }> = ({ label }) => (
  <AbsoluteFill style={{ backgroundColor: "#141414", alignItems: "center", justifyContent: "center", fontFamily: "Inter, Arial, sans-serif" }}>
    <div style={{ color: "#6e6e6e", fontSize: 28, letterSpacing: 4, textTransform: "uppercase" }}>Not built yet</div>
    <div style={{ color: "#ededed", fontSize: 56, fontWeight: 700, marginTop: 16 }}>{label}</div>
  </AbsoluteFill>
);

const Full: FC<{ spec: EditSpec; scenes: SceneMap }> = ({ spec, scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beat = spec.beats.find((b) => t >= b.start && t < b.end) ?? spec.beats[spec.beats.length - 1];
  const Scene = beat ? scenes[beat.id] : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {Scene ? <Scene /> : beat ? <Placeholder label={beat.label ?? beat.id} /> : null}
      <Audio src={staticFile(spec.narration)} />
    </AbsoluteFill>
  );
};

export const LongRoot: FC<{ spec: EditSpec; scenes: SceneMap }> = ({ spec, scenes }) => {
  const total = Math.round(spec.duration * spec.fps);
  const common = { durationInFrames: total, fps: spec.fps, width: spec.width, height: spec.height };
  return (
    <>
      {spec.beats.map((b) => {
        const Scene = scenes[b.id] ?? (() => <Placeholder label={b.label ?? b.id} />);
        const Comp = () => <BeatOnly Scene={Scene} />;
        return <Composition key={b.id} id={b.id} component={Comp} {...common} />;
      })}
      {/* The storyboard animatic, one composition per beat like the real clips. */}
      {spec.beats.map((b) => (
        <Composition key={`a-${b.id}`} id={`animatic-${b.id}`} component={() => <Animatic spec={spec} beatId={b.id} />} {...common} />
      ))}
      <Composition id="full" component={() => <Full spec={spec} scenes={scenes} />} {...common} />
    </>
  );
};
