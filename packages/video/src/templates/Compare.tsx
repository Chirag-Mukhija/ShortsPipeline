// A-vs-B contrast: two stacked cards with icons and points, a VS badge, and a verdict that lands last.
import type { CompareProps, CompareSide } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../brand";
import { useTheme } from "../ThemeContext";
import { Glyph } from "../components/Glyph";
import { fonts } from "../fonts";
import { SPRING_POP, cueFrames, fitFontSize, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

const Card: FC<{ side: CompareSide; color: string; appear: number; top: number; height: number; fromLeft: boolean }> = ({
  side,
  color,
  appear,
  top,
  height,
  fromLeft,
}) => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < appear) return null;
  const s = springAt(frame, fps, appear, SPRING_POP);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 72,
        width: 936,
        height,
        borderRadius: 34,
        background: palette.surface,
        border: `3px solid ${alpha(color, 0.5)}`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.45), inset 12px 0 0 ${color}`,
        padding: "34px 40px 34px 56px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        opacity: Math.min(1, s * 1.5),
        transform: `translateX(${(1 - s) * (fromLeft ? -140 : 140)}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Glyph icon={side.icon} size={70} color={color} />
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: fitFontSize(side.title.length, 740, 64, 38, 0.55), letterSpacing: -1.5, whiteSpace: "nowrap" }}>
          {side.title}
        </div>
      </div>
      {side.points.slice(0, 3).map((point, i) => {
        const p = springAt(frame, fps, appear + 6 + i * 5, SPRING_POP);
        return (
          <div
            key={`${point}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 42,
              color: palette.text,
              opacity: p,
              transform: `translateY(${(1 - p) * 24}px)`,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 8, background: color, flexShrink: 0 }} />
            {point}
          </div>
        );
      })}
    </div>
  );
};

function cardHeight(side: CompareSide): number {
  return 148 + Math.min(3, side.points.length) * 66;
}

export const Compare: FC<TemplateProps<CompareProps>> = ({ props, cues, durationInFrames }) => {
  const { palette, layout } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leftHeight = cardHeight(props.left);
  const rightHeight = cardHeight(props.right);
  const gap = 120;
  const total = leftHeight + gap + rightHeight + (props.verdict ? 120 : 0);
  const top = layout.contentTop + Math.max(0, (layout.contentBottom - layout.contentTop - total) / 2);
  const vsCenter = top + leftHeight + gap / 2;
  const rightTop = top + leftHeight + gap;
  const verdictTop = rightTop + rightHeight + 36;
  const revealOf = (id: string) => cueFrames(cues, "reveal", (t) => t.id === id)[0];
  const leftAt = revealOf("left") ?? 2;
  const rightAt = revealOf("right") ?? Math.max(leftAt + 20, Math.round(durationInFrames * 0.4));
  const verdictAt = revealOf("verdict") ?? Math.round(durationInFrames * 0.74);
  const vs = springAt(frame, fps, rightAt, { damping: 10, stiffness: 200, mass: 0.7 });
  const verdict = springAt(frame, fps, verdictAt, SPRING_POP);
  return (
    <AbsoluteFill>
      <Card side={props.left} color={palette.blue} appear={leftAt} top={top} height={leftHeight} fromLeft />
      <Card side={props.right} color={palette.accent} appear={rightAt} top={rightTop} height={rightHeight} fromLeft={false} />
      {frame >= rightAt ? (
        <div
          style={{
            position: "absolute",
            left: 540 - 58,
            top: vsCenter - 58,
            width: 116,
            height: 116,
            borderRadius: 58,
            background: palette.bg,
            border: `4px solid ${palette.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 44,
            transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`,
          }}
        >
          VS
        </div>
      ) : null}
      {props.verdict && frame >= verdictAt ? (
        <div
          style={{
            position: "absolute",
            top: verdictTop,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: 40,
              color: palette.accentInk,
              background: palette.accent,
              padding: "12px 32px",
              borderRadius: 999,
              transform: `scale(${verdict})`,
              boxShadow: `0 12px 40px ${alpha(palette.accent, 0.4)}`,
            }}
          >
            {props.verdict}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
