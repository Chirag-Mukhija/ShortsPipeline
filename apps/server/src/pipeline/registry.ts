// Maps every pipeline step to its handler and to the job lane it runs in.
import type { Step } from "@clipforge/schema";
import type { JobLane } from "../db/schema";
import type { ArtifactMap, StepContext } from "./context";
import { assetsStep, voiceStep } from "./steps/media";
import { metadataStep, publishStep, renderStep, timelineStep } from "./steps/output";
import { angleStep, reviewStep, scriptStep, storyboardStep } from "./steps/writing";

export const handlers: { [S in Step]: (ctx: StepContext) => Promise<ArtifactMap[S]> } = {
  angle: angleStep,
  script: scriptStep,
  review: reviewStep,
  storyboard: storyboardStep,
  voice: voiceStep,
  assets: assetsStep,
  timeline: timelineStep,
  render: renderStep,
  metadata: metadataStep,
  publish: publishStep,
};

// Decision: rendering gets its own lane so a long render never blocks the next video's writing steps.
export function laneFor(step: Step): JobLane {
  return step === "render" ? "render" : "default";
}
