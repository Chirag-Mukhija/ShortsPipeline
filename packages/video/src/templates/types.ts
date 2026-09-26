// Common props every scene template receives from the composition.
import type { TimedCue } from "@clipforge/schema";

export type TemplateProps<P> = {
  props: P;
  cues: TimedCue[];
  durationInFrames: number;
  assetBase: string;
};
