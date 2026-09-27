// Renders a phrase word by word with optional staggered pop-in and accent, marker-underlined highlights.
import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../brand";
import { useTheme } from "../ThemeContext";
import { SPRING_POP, SPRING_SOFT, isHighlighted, springAt } from "../lib/anim";

export const Words: FC<{
  text: string;
  highlight: string[];
  start: number;
  stagger: number;
  animate: boolean;
}> = ({ text, highlight, start, stagger, animate }) => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => {
        const appear = start + i * stagger;
        const s = animate ? springAt(frame, fps, appear, SPRING_POP) : 1;
        const highlighted = isHighlighted(word, highlight);
        const underline = highlighted ? springAt(frame, fps, appear + 6, SPRING_SOFT) : 0;
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              position: "relative",
              isolation: "isolate",
              marginRight: i === words.length - 1 ? 0 : "0.24em",
              color: highlighted ? palette.accent : palette.text,
              opacity: Math.min(1, s * 1.4),
              transform: `translateY(${(1 - s) * 44}px) scale(${0.6 + 0.4 * s})`,
            }}
          >
            {word}
            {highlighted ? (
              <span
                style={{
                  position: "absolute",
                  left: "-0.08em",
                  right: "-0.08em",
                  bottom: "0.04em",
                  height: "0.2em",
                  borderRadius: 10,
                  background: alpha(palette.accent, 0.32),
                  transform: `scaleX(${underline})`,
                  transformOrigin: "left center",
                  zIndex: -1,
                }}
              />
            ) : null}
          </span>
        );
      })}
    </>
  );
};
