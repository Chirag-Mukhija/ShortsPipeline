// Scene-one hook: an icon drop, a kicker tag and giant lines that slam in with screen shake and highlighted words.
import type { HookSlamProps } from "@clipforge/schema";
import type { FC } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, colors } from "../brand";
import { ContentArea } from "../components/ContentArea";
import { Glyph } from "../components/Glyph";
import { Words } from "../components/Words";
import { fonts } from "../fonts";
import { SPRING_POP, SPRING_SLAM, fadeIn, fitFontSize, shakeAt, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

export const HookSlam: FC<TemplateProps<HookSlamProps>> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = props.lines.slice(0, 3);
  const longest = Math.max(4, ...lines.map((line) => line.length));
  const fontSize = fitFontSize(longest, 930, 180, 96, 0.52);
  const lineStart = (i: number) => (props.icon || props.kicker ? 8 : 2) + i * 8;
  const shake = shakeAt(
    frame,
    lines.map((_, i) => lineStart(i) + 4),
    9,
    18,
  );
  const iconIn = springAt(frame, fps, 0, { damping: 9, stiffness: 140, mass: 0.8 });
  const kickerIn = springAt(frame, fps, 3, SPRING_POP);
  return (
    <ContentArea style={{ gap: 28, transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      {props.icon ? (
        <div
          style={{
            transform: `translateY(${(1 - iconIn) * -280}px) rotate(${(1 - iconIn) * -18}deg)`,
            opacity: Math.min(1, iconIn * 2),
            filter: `drop-shadow(0 18px 40px ${alpha(colors.accent, 0.35)})`,
          }}
        >
          <Glyph icon={props.icon} size={200} color={colors.accent} strokeWidth={1.8} />
        </div>
      ) : null}
      {props.kicker ? (
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: colors.accentInk,
            background: colors.accent,
            padding: "10px 28px",
            borderRadius: 999,
            transform: `scale(${kickerIn}) rotate(-2deg)`,
          }}
        >
          {props.kicker}
        </div>
      ) : null}
      {lines.map((line, i) => {
        const start = lineStart(i);
        const slam = springAt(frame, fps, start, SPRING_SLAM);
        return (
          <div
            key={`${line}-${i}`}
            style={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize,
              lineHeight: 0.98,
              letterSpacing: -3,
              textAlign: "center",
              opacity: fadeIn(frame, start, 3),
              transform: `scale(${interpolate(slam, [0, 1], [2.6, 1])})`,
              textShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <Words text={line} highlight={props.highlight} start={start + 5} stagger={0} animate={false} />
          </div>
        );
      })}
    </ContentArea>
  );
};
