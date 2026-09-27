// Code window whose syntax-colored lines type themselves out, then spotlight lines on cues.
import type { CodeToken, ResolvedCodeBlockProps } from "@clipforge/schema";
import type { FC } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../brand";
import { useTheme } from "../ThemeContext";
import { ContentArea } from "../components/ContentArea";
import { fonts } from "../fonts";
import { CLAMP, SPRING_POP, parseTarget, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

const DOTS = ["#FF5F57", "#FEBC2E", "#28C840"];

export const CodeBlock: FC<TemplateProps<ResolvedCodeBlockProps>> = ({ props, cues, durationInFrames }) => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines: CodeToken[][] =
    props.tokens && props.tokens.length > 0
      ? props.tokens
      : props.code.split("\n").map((line) => [{ text: line, color: palette.text }]);
  const lengths = lines.map((line) => line.reduce((sum, token) => sum + token.text.length, 0));
  const total = lengths.reduce((a, b) => a + b, 0);
  const longest = Math.max(10, ...lengths);
  const fontSize = Math.round(Math.min(40, Math.max(22, (36 * 32) / longest)));
  const typingStart = 8;
  const typingFrames = Math.min(Math.round(durationInFrames * 0.45), Math.max(14, Math.round(total / 2.5)));
  const typed = Math.floor(interpolate(frame, [typingStart, typingStart + typingFrames], [0, total], CLAMP));
  const typingDone = typed >= total;

  const lineCues = cues
    .filter((cue) => cue.action === "highlight")
    .map((cue) => ({ frame: cue.frame, target: parseTarget(cue.target) }))
    .filter((cue) => cue.target.kind === "line");
  const passed = lineCues.filter((cue) => frame >= cue.frame);
  const latest = passed[passed.length - 1];
  const focus: number[] = latest
    ? [Number(latest.target.id)]
    : lineCues.length === 0 && props.focusLines?.length && frame >= typingStart + typingFrames + 6
      ? props.focusLines
      : [];

  const windowIn = springAt(frame, fps, 0, SPRING_POP);
  let remaining = typed;
  let cursorPlaced = false;

  return (
    <ContentArea>
      <div
        style={{
          width: 960,
          borderRadius: 30,
          overflow: "hidden",
          background: props.background || palette.codeBg,
          border: `2px solid ${palette.line}`,
          boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
          transform: `translateY(${(1 - windowIn) * 60}px) scale(${0.92 + 0.08 * windowIn})`,
          opacity: windowIn,
        }}
      >
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 28px",
            background: alpha("#FFFFFF", 0.04),
            borderBottom: `2px solid ${palette.line}`,
          }}
        >
          {DOTS.map((dot) => (
            <div key={dot} style={{ width: 20, height: 20, borderRadius: 10, background: dot }} />
          ))}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              marginRight: 90,
              fontFamily: fonts.body,
              fontWeight: 600,
              fontSize: 28,
              color: palette.muted,
            }}
          >
            {props.filename ?? props.language}
          </div>
        </div>
        <div style={{ padding: "34px 36px 40px", fontFamily: fonts.mono, fontWeight: 500, fontSize, lineHeight: 1.55 }}>
          {lines.map((line, i) => {
            const lineNumber = i + 1;
            const focused = focus.includes(lineNumber);
            const dimmed = focus.length > 0 && !focused;
            const visible: CodeToken[] = [];
            for (const token of line) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, token.text.length);
              visible.push({ text: token.text.slice(0, take), color: token.color });
              remaining -= take;
            }
            const showCursor = !cursorPlaced && (remaining <= 0 || i === lines.length - 1) && (!typingDone || Math.floor(frame / 15) % 2 === 0);
            if (remaining <= 0 || i === lines.length - 1) cursorPlaced = true;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 26,
                  margin: "0 -36px",
                  padding: "0 36px",
                  whiteSpace: "pre",
                  opacity: dimmed ? 0.32 : 1,
                  background: focused ? alpha(palette.accent, 0.12) : "transparent",
                  boxShadow: focused ? `inset 8px 0 0 ${palette.accent}` : "none",
                }}
              >
                <span style={{ color: palette.dim, minWidth: "1.6ch", textAlign: "right" }}>{lineNumber}</span>
                <span>
                  {visible.map((token, j) => (
                    <span key={j} style={{ color: token.color }}>
                      {token.text}
                    </span>
                  ))}
                  {showCursor ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "0.6em",
                        height: "1.1em",
                        marginLeft: 2,
                        verticalAlign: "text-bottom",
                        background: palette.accent,
                      }}
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </ContentArea>
  );
};
