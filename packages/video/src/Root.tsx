// Registers the Short composition for Remotion Studio and server-side rendering.
import type { FC } from "react";
import { Composition } from "remotion";
import { COMPOSITION_ID } from "./constants";
import { sampleTimeline } from "./sample";
import { ShortVideo, calculateShortMetadata } from "./ShortVideo";

export const RemotionRoot: FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={ShortVideo}
    defaultProps={{ timeline: sampleTimeline, assetBase: "" }}
    calculateMetadata={calculateShortMetadata}
    durationInFrames={sampleTimeline.durationInFrames}
    fps={sampleTimeline.fps}
    width={sampleTimeline.width}
    height={sampleTimeline.height}
  />
);
