// Big animated phrase: words pop in one after another with accent highlights and an optional floating icon.
import type { KineticTextProps } from "@clipforge/schema";
import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../ThemeContext";
import { ContentArea } from "../components/ContentArea";
import { Glyph } from "../components/Glyph";
import { Words } from "../components/Words";
import { fonts } from "../fonts";
import { SPRING_POP, cueFrames, pulseAt, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

export const KineticText: FC<TemplateProps<KineticTextProps>> = ({ props, cues }) => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = props.text.length;
  const fontSize = chars <= 12 ? 150 : chars <= 22 ? 124 : chars <= 36 ? 102 : 86;
  const iconIn = springAt(frame, fps, 0, SPRING_POP);
  const pulse = pulseAt(frame, cueFrames(cues, "pulse"), 12, 0.1);
  return (
    <ContentArea style={{ gap: 44 }}>
      {props.icon ? (
        <div style={{ transform: `translateY(${Math.sin(frame / 12) * 10}px) scale(${iconIn})` }}>
          <Glyph icon={props.icon} size={170} color={palette.accent} />
        </div>
      ) : null}
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.04,
          letterSpacing: -2,
          textAlign: "center",
          maxWidth: 920,
          transform: `scale(${pulse})`,
          textShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}
      >
        <Words text={props.text} highlight={props.highlight} start={props.icon ? 5 : 2} stagger={3} animate />
      </div>
    </ContentArea>
  );
};
