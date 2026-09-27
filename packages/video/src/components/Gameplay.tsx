// Muted, looping gameplay footage filling the bottom strip in split layout, for shorts that want a retention hook.
import type { FC } from "react";
import { AbsoluteFill, Loop, OffthreadVideo } from "remotion";
import { useTheme } from "../ThemeContext";
import { assetUrl } from "../lib/anim";

export const Gameplay: FC<{ src: string; durationInFrames: number; assetBase: string }> = ({
  src,
  durationInFrames,
  assetBase,
}) => {
  const { layout } = useTheme();
  if (layout.gameplayTop === null) return null;
  return (
    <AbsoluteFill style={{ top: layout.gameplayTop, bottom: 0, height: "auto" }}>
      <Loop durationInFrames={durationInFrames}>
        <OffthreadVideo
          src={assetUrl(assetBase, src)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Loop>
    </AbsoluteFill>
  );
};
