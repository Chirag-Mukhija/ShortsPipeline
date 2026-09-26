// One striking number that counts up with a burst when it lands, plus a label and an optional icon.
import type { StatCounterProps } from "@clipforge/schema";
import type { FC } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, colors } from "../brand";
import { ContentArea } from "../components/ContentArea";
import { Glyph } from "../components/Glyph";
import { fonts } from "../fonts";
import { CLAMP, SPRING_POP, cueFrames, fitFontSize, formatNumber, pulseAt, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

const COUNT_START = 6;
const COUNT_FRAMES = 34;
const RAYS = 12;

export const StatCounter: FC<TemplateProps<StatCounterProps>> = ({ props, cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [COUNT_START, COUNT_START + COUNT_FRAMES], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const decimals = props.decimals ?? (Number.isInteger(props.value) ? 0 : 1);
  const number = formatNumber(props.value * progress, decimals);
  const finalText = `${props.prefix ?? ""}${formatNumber(props.value, decimals)}${props.suffix ?? ""}`;
  const fontSize = fitFontSize(finalText.length, 940, 250, 120, 0.62);
  const landed = COUNT_START + COUNT_FRAMES;
  const burst = interpolate(frame, [landed - 2, landed + 18], [0, 1], CLAMP);
  const pulse = pulseAt(frame, [landed, ...cueFrames(cues, "pulse")], 12, 0.08);
  const iconIn = springAt(frame, fps, 0, SPRING_POP);
  const labelIn = springAt(frame, fps, landed - 6, SPRING_POP);
  return (
    <ContentArea style={{ gap: 26 }}>
      {props.icon ? (
        <div style={{ transform: `scale(${iconIn})` }}>
          <Glyph icon={props.icon} size={140} color={colors.accent} />
        </div>
      ) : null}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {burst > 0 && burst < 1
          ? Array.from({ length: RAYS }, (_, i) => {
              const angle = (i / RAYS) * Math.PI * 2;
              const radius = 260 + 140 * burst;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 90,
                    height: 10,
                    borderRadius: 5,
                    background: colors.accent,
                    opacity: 1 - burst,
                    transform: `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius * 0.6}px) rotate(${angle}rad)`,
                  }}
                />
              );
            })
          : null}
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize,
            letterSpacing: -4,
            lineHeight: 1,
            color: colors.accent,
            transform: `scale(${pulse})`,
            textShadow: `0 0 60px ${alpha(colors.accent, 0.35)}`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: fontSize * 0.6 }}>{props.prefix}</span>
          {number}
          <span style={{ fontSize: fontSize * 0.5, marginLeft: 8 }}>{props.suffix}</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 56,
          textAlign: "center",
          maxWidth: 900,
          color: colors.text,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 30}px)`,
        }}
      >
        {props.label}
      </div>
    </ContentArea>
  );
};
