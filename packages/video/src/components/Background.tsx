// Animated brand backdrop: deep gradient, two drifting glows, a slow dot grid and a vignette.
import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, colors } from "../brand";

export const Background: FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const glowA = { x: 300 + 140 * Math.sin(t * 0.31), y: 560 + 90 * Math.cos(t * 0.23) };
  const glowB = { x: 800 + 120 * Math.cos(t * 0.27), y: 1320 + 110 * Math.sin(t * 0.19) };
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 560px at ${glowA.x}px ${glowA.y}px, ${alpha(colors.accent, 0.16)}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 640px at ${glowB.x}px ${glowB.y}px, ${alpha(colors.blue, 0.13)}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${alpha("#FFFFFF", 0.07)} 2px, transparent 2.6px)`,
          backgroundSize: "46px 46px",
          backgroundPosition: `0px ${-(t * 8) % 46}px`,
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
