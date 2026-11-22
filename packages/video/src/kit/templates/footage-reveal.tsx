// Footage reveal: a clip rises in as a card, then grows to fill the frame (or opens through an iris) with a slow push, a caption that lands on a spoken word, and an optional spotlight on one region.
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { defineTemplate } from "../contract";
import { clamp01, cueAt, enter, MediaFill, useT } from "../motion";

const schema = z.object({
  kicker: z.string().max(24).optional().describe("Small label above the caption, e.g. 'MY NOTES'"),
  label: z.string().max(42).optional().describe("The caption, a few words"),
  labelWord: z.string().optional().describe("Spoken word the caption lands on"),
  reveal: z.enum(["grow", "iris"]).default("grow").describe("grow: card expands to full bleed; iris: a circle opens from the focus point"),
  revealWord: z.string().optional().describe("Spoken word the reveal lands on"),
  spotlight: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.05).max(1), h: z.number().min(0.05).max(1), word: z.string().optional() })
    .optional()
    .describe("Dim everything but this region of the frame (0–1 of the full frame) after the reveal"),
});

export default defineTemplate({
  id: "footage-reveal",
  title: "Footage reveal",
  mode: "screen",
  layouts: ["full"],
  useFor: "Bringing in a screen recording, stock clip or photo as part of the story: it arrives as a card and takes over the frame on the word that introduces it. Slot 0: the clip. Spotlight a region to point at one detail.",
  avoid: "Twice in a row, or for clips under 3 s (use a straight cut). Don't spotlight text smaller than 3% of the frame height.",
  schema,
  example: { kicker: "MY PRACTICE", label: "Every day, one problem", labelWord: "problem", reveal: "grow", revealWord: "practice", spotlight: { x: 0.08, y: 0.18, w: 0.45, h: 0.3 } },
  exampleMedia: [{ src: "media/screen.mp4", kind: "video", focus: [0.35, 0.4] }],
  exampleCues: [
    { at: 0.9, end: 1.4, word: "practice" },
    { at: 2.1, end: 2.6, word: "problem" },
  ],
  seconds: { min: 3, max: 12, demo: 6 },
  mediaSlots: 1,
  status: "draft",
  Component: ({ props, style, width: W, height: H, duration, media, cues }) => {
    const { t, frame, fps } = useT();
    const clip = media[0];
    const revealAt = cueAt(cues, props.revealWord, Math.min(1.2, duration * 0.25));
    const labelAt = cueAt(cues, props.labelWord, revealAt + 0.5);
    const rise = enter(style, frame, fps, 0.05, 0.55);
    const g = enter({ ...style, motion: "calm" }, frame, fps, revealAt, 0.9);
    const push = 1 + 0.06 * clamp01(t / Math.max(duration, 1));
    const [fx, fy] = clip?.focus ?? [0.5, 0.5];

    // grow: a centred card at 57% of the frame eases out to full bleed, corners squaring off as it lands.
    const w = W * 0.57 + W * 0.43 * (props.reveal === "grow" ? g : 1);
    const h = H * 0.574 + H * 0.426 * (props.reveal === "grow" ? g : 1);
    const radius = props.reveal === "grow" ? style.radius * 1.6 * (1 - g) : 0;
    const iris = props.reveal === "iris" ? `circle(${40 + 2200 * g}px at ${fx * 100}% ${fy * 100}%)` : undefined;

    const spot = props.spotlight;
    const spotAt = spot ? cueAt(cues, spot.word, revealAt + 1.4) : 0;
    const s = spot ? enter(style, frame, fps, spotAt, 0.5) : 0;
    const lab = enter(style, frame, fps, labelAt, 0.55);

    return (
      <AbsoluteFill style={{ background: style.bg }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: w,
              height: h,
              borderRadius: radius,
              overflow: "hidden",
              clipPath: iris,
              transform: `translateY(${(1 - rise) * 60}px)`,
              opacity: props.reveal === "iris" ? 1 : rise,
              boxShadow: props.reveal === "grow" ? `0 ${30 * (1 - g)}px ${80 * (1 - g)}px rgba(0,0,0,${0.25 * (1 - g)})` : undefined,
              background: style.surface,
            }}
          >
            {clip ? <MediaFill media={clip} zoom={push} /> : null}
          </div>
        </AbsoluteFill>

        {spot ? (
          <AbsoluteFill>
            <svg width={W} height={H} style={{ position: "absolute" }}>
              <defs>
                <mask id="kit-spot">
                  <rect width={W} height={H} fill="white" />
                  <rect x={spot.x * W} y={spot.y * H} width={spot.w * W} height={spot.h * H} rx={style.radius} fill="black" />
                </mask>
              </defs>
              <rect width={W} height={H} fill="black" opacity={0.55 * s} mask="url(#kit-spot)" />
              <rect
                x={spot.x * W - 6}
                y={spot.y * H - 6}
                width={spot.w * W + 12}
                height={spot.h * H + 12}
                rx={style.radius + 6}
                fill="none"
                stroke={style.accent}
                strokeWidth={6}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - s}
              />
            </svg>
          </AbsoluteFill>
        ) : null}

        {props.label ? (
          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 110px 96px" }}>
            <div style={{ position: "absolute", inset: "auto 0 0 0", height: 380, background: `linear-gradient(to top, rgba(0,0,0,${0.55 * lab}), transparent)` }} />
            {props.kicker ? (
              <div style={{ fontFamily: style.body, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: style.accent, opacity: lab, transform: `translateY(${(1 - lab) * 24}px)` }}>{props.kicker}</div>
            ) : null}
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: 76, lineHeight: 1.1, color: "#fff", transform: `translateY(${(1 - lab) * 110}%)` }}>{props.label}</div>
            </div>
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    );
  },
});
