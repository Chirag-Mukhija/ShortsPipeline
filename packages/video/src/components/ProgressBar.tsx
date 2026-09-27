// Thin progress bar along the top edge that fills over the length of the short.
import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../brand";
import { useTheme } from "../ThemeContext";

export const ProgressBar: FC = () => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: alpha("#FFFFFF", 0.08) }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 10,
          width: `${progress * 100}%`,
          background: palette.accent,
          boxShadow: `0 0 18px ${alpha(palette.accent, 0.8)}`,
        }}
      />
    </AbsoluteFill>
  );
};
