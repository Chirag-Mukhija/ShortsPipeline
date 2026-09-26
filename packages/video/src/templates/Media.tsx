// Full-bleed stock footage or photo with a slow Ken Burns push and an overlay line; falls back to a styled icon card.
import type { ResolvedMediaProps } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, colors } from "../brand";
import { ContentArea } from "../components/ContentArea";
import { Glyph } from "../components/Glyph";
import { fonts } from "../fonts";
import { CLAMP, SPRING_POP, assetUrl, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

const Overlay: FC<{ text: string; appear: number }> = ({ text, appear }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = springAt(frame, fps, appear, SPRING_POP);
  return (
    <div style={{ position: "absolute", top: 300, left: 72, right: 72, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 86,
          lineHeight: 1.04,
          letterSpacing: -2,
          textAlign: "center",
          color: colors.text,
          background: alpha(colors.bg, 0.62),
          padding: "18px 34px",
          borderRadius: 28,
          transform: `scale(${0.7 + 0.3 * s})`,
          opacity: s,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Media: FC<TemplateProps<ResolvedMediaProps>> = ({ props, durationInFrames, assetBase }) => {
  const frame = useCurrentFrame();
  const kenBurns = interpolate(frame, [0, Math.max(1, durationInFrames)], [1.06, 1.16], CLAMP);
  const asset = props.asset;
  if (asset) {
    const src = assetUrl(assetBase, asset.src);
    const mediaStyle = {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      transform: `scale(${kenBurns})`,
    };
    return (
      <AbsoluteFill>
        {asset.type === "video" ? <OffthreadVideo src={src} muted style={mediaStyle} /> : <Img src={src} style={mediaStyle} />}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(9,11,16,0.6) 0%, rgba(9,11,16,0.05) 32%, rgba(9,11,16,0.2) 58%, rgba(9,11,16,0.88) 100%)",
          }}
        />
        {props.overlay ? <Overlay text={props.overlay} appear={4} /> : null}
      </AbsoluteFill>
    );
  }
  return (
    <ContentArea style={{ gap: 40 }}>
      <div
        style={{
          width: 420,
          height: 420,
          borderRadius: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, ${alpha(colors.accent, 0.22)}, ${alpha(colors.blue, 0.16)})`,
          border: `3px solid ${alpha(colors.accent, 0.4)}`,
          transform: `scale(${kenBurns}) rotate(${(kenBurns - 1.06) * 30}deg)`,
        }}
      >
        <Glyph icon={props.icon ?? "lucide:image"} size={230} color={colors.accent} strokeWidth={1.6} />
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 90,
          lineHeight: 1.04,
          letterSpacing: -2,
          textAlign: "center",
          maxWidth: 920,
        }}
      >
        {props.overlay ?? props.query}
      </div>
    </ContentArea>
  );
};
