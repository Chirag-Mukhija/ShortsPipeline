// The Short composition: backdrop, timed scenes, captions, progress bar, voice, sound effects and music from a timeline.
import type { VideoProps } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, type CalculateMetadataFunction, Html5Audio, Sequence } from "remotion";
import { colors } from "./brand";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { ProgressBar } from "./components/ProgressBar";
import { SceneShell } from "./components/SceneShell";
import { fonts } from "./fonts";
import { assetUrl } from "./lib/anim";
import { SceneBody } from "./templates";

export const ShortVideo: FC<VideoProps> = ({ timeline, assetBase }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: fonts.body }}>
      <Background />
      {timeline.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.from}
          durationInFrames={scene.durationInFrames}
          name={`${scene.id} · ${scene.template}`}
        >
          <SceneShell cues={scene.cues} durationInFrames={scene.durationInFrames}>
            <SceneBody scene={scene} assetBase={assetBase} />
          </SceneShell>
          {scene.audio ? <Html5Audio src={assetUrl(assetBase, scene.audio.src)} /> : null}
        </Sequence>
      ))}
      <Captions pages={timeline.captions} />
      <ProgressBar />
      {timeline.sfx.map((effect, i) => (
        <Sequence key={`sfx-${i}`} from={effect.frame} durationInFrames={Math.round(timeline.fps * 1.5)} layout="none">
          <Html5Audio src={assetUrl(assetBase, `library/sfx/${effect.name}.wav`)} volume={effect.volume} />
        </Sequence>
      ))}
      {timeline.music ? (
        <Html5Audio src={assetUrl(assetBase, timeline.music.src)} volume={timeline.music.volume} loop />
      ) : null}
    </AbsoluteFill>
  );
};

export const calculateShortMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.timeline.durationInFrames),
  fps: props.timeline.fps,
  width: props.timeline.width,
  height: props.timeline.height,
});
