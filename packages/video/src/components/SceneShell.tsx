// Wraps every scene with the shared entrance motion, slow camera drift and cue-driven shake and zoom punches.
import type { TimedCue } from "@clipforge/schema";
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, SPRING_POP, cueFrames, shakeAt, springAt } from "../lib/anim";

export const SceneShell: FC<{ cues: TimedCue[]; durationInFrames: number; children: ReactNode }> = ({
  cues,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = springAt(frame, fps, 0, { damping: 16, stiffness: 190, mass: 0.7 });
  const drift = interpolate(frame, [0, Math.max(1, durationInFrames)], [1, 1.03], CLAMP);
  const zoom = cueFrames(cues, "zoom").reduce((sum, start) => sum + 0.1 * springAt(frame, fps, start, SPRING_POP), 0);
  const shake = shakeAt(frame, cueFrames(cues, "shake"), 10, 16);
  const scale = interpolate(enter, [0, 1], [0.94, 1]) * (drift + zoom);
  const lift = interpolate(enter, [0, 1], [56, 0]);
  const opacity = interpolate(frame, [0, 4], [0, 1], CLAMP);
  return (
    <AbsoluteFill
      style={{ opacity, transform: `translate(${shake.x}px, ${lift + shake.y}px) scale(${scale})` }}
    >
      {children}
    </AbsoluteFill>
  );
};
