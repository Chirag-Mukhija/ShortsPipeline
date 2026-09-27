// Numbered or icon list whose items land one by one, keeping the newest item in focus.
import type { ListRevealProps } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../brand";
import { useTheme } from "../ThemeContext";
import { Glyph } from "../components/Glyph";
import { fonts } from "../fonts";
import { SPRING_POP, cueFrames, fitFontSize, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

export const ListReveal: FC<TemplateProps<ListRevealProps>> = ({ props, cues, durationInFrames }) => {
  const { palette, layout } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = props.items.slice(0, 5);
  const spread = Math.max(10, durationInFrames * 0.85 - 10);
  const appearAt = items.map(
    (_, i) =>
      cueFrames(cues, "reveal", (t) => (t.kind === "item" || t.kind === "other") && t.id === String(i + 1))[0] ??
      Math.round(10 + (i * spread) / items.length),
  );
  const visible = appearAt.filter((at) => frame >= at).length;
  const latest = appearAt.reduce((best, at, i) => (frame >= at && at >= (appearAt[best] ?? -1) ? i : best), -1);
  // Decision: rows anchor 160px below the content top (room for the title) and budget the rest of the content
  // zone minus a 40px bottom buffer, so this scales down cleanly in the shorter gameplay-split content band.
  const rowsTop = layout.contentTop + 160;
  const rowGap = Math.min(170, (layout.contentBottom - rowsTop - 40) / items.length);
  const titleIn = springAt(frame, fps, 0, SPRING_POP);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: layout.contentTop + 26,
          left: 72,
          right: 72,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: fitFontSize(props.title.length, 936, 72, 42, 0.55),
          whiteSpace: "nowrap",
          letterSpacing: -1.5,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * -30}px)`,
        }}
      >
        {props.title}
      </div>
      {items.map((item, i) => {
        const at = appearAt[i] ?? 0;
        if (frame < at) return null;
        const s = springAt(frame, fps, at, SPRING_POP);
        const isLatest = i === latest && visible > 0;
        return (
          <div
            key={`${item.text}-${i}`}
            style={{
              position: "absolute",
              left: 72,
              width: 936,
              top: rowsTop + i * rowGap,
              height: rowGap - 22,
              display: "flex",
              alignItems: "center",
              gap: 28,
              padding: "0 30px",
              borderRadius: 28,
              background: isLatest ? alpha(palette.accent, 0.12) : palette.surface,
              border: `3px solid ${isLatest ? palette.accent : palette.line}`,
              opacity: Math.min(1, s * 1.5) * (isLatest ? 1 : 0.72),
              transform: `translateX(${(1 - s) * 120}px) scale(${isLatest ? 1.02 : 1})`,
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: props.numbered ? palette.accent : palette.surfaceHigh,
                color: palette.accentInk,
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: 48,
              }}
            >
              {props.numbered ? i + 1 : <Glyph icon={item.icon ?? "lucide:sparkles"} size={52} color={palette.accent} />}
            </div>
            <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 46, lineHeight: 1.15, color: palette.text }}>
              {item.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
