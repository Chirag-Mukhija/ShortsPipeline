// Word-by-word captions: shows the active page and paints the word being spoken in the accent color.
import type { CaptionPage } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, layout } from "../brand";
import { fonts } from "../fonts";

function displayText(text: string): string {
  return text.replace(/[.,;:]+$/, "");
}

export const Captions: FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const page = pages.find((p) => ms >= p.startMs && ms < p.endMs);
  if (!page) return null;
  const enter = spring({
    frame: frame - Math.round((page.startMs / 1000) * fps),
    fps,
    config: { damping: 18, stiffness: 280, mass: 0.6 },
  });
  let activeIndex = 0;
  page.words.forEach((word, i) => {
    if (ms >= word.startMs) activeIndex = i;
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: (layout.width - layout.captionMaxWidth) / 2,
          width: layout.captionMaxWidth,
          top: layout.captionCenterY,
          transform: `translateY(-50%) scale(${0.82 + 0.18 * enter})`,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          columnGap: 30,
          rowGap: 4,
        }}
      >
        {page.words.map((word, i) => {
          const active = i === activeIndex;
          return (
            <span
              key={`${page.startMs}-${i}`}
              style={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 86,
                lineHeight: 1.08,
                letterSpacing: -1,
                color: active ? colors.accent : colors.text,
                transform: `scale(${active ? 1.04 : 1})`,
                WebkitTextStroke: "12px #05070B",
                paintOrder: "stroke fill",
                textShadow: "0 8px 28px rgba(0,0,0,0.55)",
              }}
            >
              {displayText(word.text)}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
