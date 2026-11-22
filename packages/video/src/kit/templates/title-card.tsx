// Title card: a kinetic one- or two-line headline for hooks and chapter openers; words arrive on their spoken cues through a chosen entrance, one word gets an accent mark, over a calm drifting background.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const wordsOf = (line: string) => line.split(/\s+/).filter(Boolean);

const schema = z
  .object({
    lines: z.array(z.string().min(1).max(26)).min(1).max(2).describe("The headline as 1–2 lines, each ≤ 26 characters, ≤ 8 words in total, sentence case, no full stop, e.g. ['One loop made', 'my code slow']"),
    emphasis: z.string().max(26).optional().describe("One word from the lines that gets the accent mark, e.g. 'slow'. Leave out for no emphasis"),
    mark: z.enum(["underline", "fill", "punch"]).default("underline").describe("How the emphasis word is marked: underline (an accent bar draws under it), fill (accent colour sweeps through it), punch (it pops and turns accent). Keep one form per video"),
    entrance: z.enum(["rise", "scale", "stagger"]).default("rise").describe("How words arrive: rise (each word slides up out of a mask), scale (each word settles from large and soft), stagger (letters tumble in one by one). Don't use the same entrance on two title cards in a row"),
    align: z.enum(["left", "center"]).default("left").describe("left for hooks and most titles; center for a chapter opener or a single short line"),
    eyebrow: z.string().max(20).optional().describe("Small label above the headline, e.g. 'Chapter 02' or 'Part 3 · Graphs'"),
    wordCues: z.boolean().default(true).describe("When true, each word lands on the moment it is spoken if the narration says it; unspoken words fill in between"),
    startWord: z.string().optional().describe("Spoken word the headline starts arriving on, when the narration doesn't say the headline's own words"),
  })
  .superRefine((p, ctx) => {
    const words = p.lines.flatMap(wordsOf);
    if (words.length > 8) ctx.addIssue({ code: "custom", message: `${words.length} words; a title card holds at most 8`, path: ["lines"] });
    if (p.emphasis && !words.some((w) => norm(w) === norm(p.emphasis!))) ctx.addIssue({ code: "custom", message: `emphasis '${p.emphasis}' is not a word in the lines`, path: ["emphasis"] });
  });

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Words start this far before they are spoken, so the picture is settling as the word is heard.
const LEAD = 0.12;
const MARK_DUR = 0.45;

// Each word in order is matched to the next spoken cue with the same text, so a repeated word ("the … the") lands on its own occurrence.
const matchWords = (words: string[], cues: Cue[]) => {
  let from = 0;
  return words.map((w) => {
    const i = cues.findIndex((c, k) => k >= from && norm(c.word) === norm(w));
    if (i < 0) return undefined;
    from = i + 1;
    return cues[i]!.at;
  });
};

const TitleCard: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const lines = props.lines.map(wordsOf);
  const flat = lines.flat();
  const n = flat.length;
  const emphIdx = props.emphasis ? flat.findIndex((w) => norm(w) === norm(props.emphasis!)) : -1;

  // Timing: entrance length scales with the segment; everything (words, then the mark) must be done 0.6 s before the end.
  const ent = Math.min(0.75, Math.max(0.4, duration * 0.17));
  const markGap = duration < 3 ? 0.15 : 0.35;
  const latestStart = Math.max(0.05, duration - 0.6 - (emphIdx >= 0 ? MARK_DUR + markGap : 0) - ent);
  const base = Math.max(0.1, cueAt(cues, props.startWord, 0.25) - LEAD);
  const step = n > 1 ? Math.min(0.3, Math.max(0.08, (Math.min(duration * 0.42, latestStart) - base) / (n - 1))) : 0;
  const spoken = props.wordCues ? matchWords(flat, cues) : flat.map(() => undefined);
  const starts: number[] = [];
  flat.forEach((_, i) => {
    const at = spoken[i] !== undefined ? spoken[i]! - LEAD : base + i * step;
    starts.push(Math.max(at, i ? starts[i - 1]! + 0.06 : 0));
  });
  // If cues run late, squeeze the arrivals between the first word and the latest allowed start, keeping their rhythm.
  const s0 = starts[0]!;
  const sN = starts[n - 1]!;
  const first = Math.min(s0, latestStart);
  const S = starts.map((s) => (sN > latestStart ? (sN === s0 ? first : first + ((s - s0) / (sN - s0)) * (latestStart - first)) : s));
  const lastLand = S[n - 1]! + ent;
  const markAt = emphIdx >= 0 ? Math.min(Math.max(lastLand + markGap, S[emphIdx]! + ent + 0.1), duration - 0.6 - MARK_DUR) : Infinity;

  // Size: the longest line fits the measure; display fonts vary in width, so the estimate is generous.
  const margin = Math.max(96, W * 0.09);
  const measure = W - margin * 2;
  const longest = Math.max(...props.lines.map((l) => l.length));
  const charW = hand ? 0.43 : 0.56;
  const size = Math.round(Math.min(hand ? 190 : 168,Math.max(hand ? 104 : 92, measure / (longest * charW))) * (lines.length === 1 && longest < 14 ? 1.12 : 1));
  const center = props.align === "center";

  const eyebrowAt = Math.max(0, S[0]! - 0.4);
  const ebRule = enter(calm, frame, fps, eyebrowAt, 0.5);
  const ebText = enter(style, frame, fps, eyebrowAt + 0.15, 0.55);

  // Base drift: the headline block pushes in 2% over the segment, so holds stay alive without moving the frame.
  const push = 1 + 0.02 * clamp01(t / duration);
  const boil = (k: number) => (hand ? hash(k * 17 + Math.floor(t * 8)) - 0.5 : 0);

  const textStyle: CSSProperties = {
    fontFamily: style.display,
    fontWeight: 700,
    fontSynthesis: "none",
    fontSize: size,
    lineHeight: 1.08,
    letterSpacing: hand ? 0 : "-0.025em",
    whiteSpace: "nowrap",
  };
  const emphColour = mix(style.accent, 88, style.ink);

  // One word's entrance: returns the moving content for a given colour, so the fill mode can stack an identical accent copy on top.
  const renderWord = (word: string, i: number, colour: string): ReactNode => {
    const at = S[i]!;
    if (props.entrance === "stagger") {
      const chars = [...word];
      const gap = Math.min(0.04, (ent * 0.5) / Math.max(1, chars.length));
      return chars.map((ch, k) => {
        const p = enter(style, frame, fps, at + k * gap, ent * 0.7);
        const sway = (hash(i * 31 + k) - 0.5) * 18;
        return (
          <span key={k} style={{ display: "inline-block", color: colour, opacity: clamp01(p * 1.6), transform: `translateY(${(1 - p) * 0.55}em) rotate(${(1 - p) * sway}deg)`, transformOrigin: "50% 100%" }}>
            {ch}
          </span>
        );
      });
    }
    if (props.entrance === "scale") {
      const p = enter(calm, frame, fps, at, ent);
      const q = interpolate(frame, [at * fps, (at + ent) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
      const blur = 10 * (1 - q);
      // Grows from the word's left edge: words to its left have already landed, so it never covers them.
      return (
        <span style={{ display: "inline-block", color: colour, opacity: clamp01(q * 1.4), transform: `scale(${1 + 0.3 * (1 - p)})`, transformOrigin: "0% 60%", filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
          {word}
        </span>
      );
    }
    const p = enter(style, frame, fps, at, ent);
    return <span style={{ display: "inline-block", color: colour, transform: `translateY(${(1 - p) * 112}%) rotate(${(1 - clamp01(p)) * 4}deg)`, transformOrigin: "0 100%" }}>{word}</span>;
  };

  let idx = 0;
  const rows = lines.map((ws, li) => (
    <div key={li} style={{ ...textStyle, display: "flex", justifyContent: center ? "center" : "flex-start", gap: "0 0.26em" }}>
      {ws.map((w) => {
        const i = idx++;
        const isEmph = i === emphIdx;
        const m = isEmph ? clamp01(enter(calm, frame, fps, markAt, MARK_DUR)) : 0;
        const pop = isEmph && props.mark === "punch" ? bump(t - markAt, 0.34) : 0;
        const colour = isEmph && props.mark === "punch" ? mix(emphColour, m * 100, style.ink) : style.ink;
        // Rise masks each word; the mask pads out for descenders and the entry tilt.
        const masked = props.entrance === "rise";
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", transform: pop ? `scale(${1 + 0.13 * pop})` : undefined, transformOrigin: "50% 70%" }}>
            <span style={{ position: "relative", display: "inline-block", overflow: masked ? "hidden" : "visible", padding: "0.06em 0.08em 0.18em", margin: "-0.06em -0.08em -0.18em" }}>
              {renderWord(w, i, colour)}
              {isEmph && props.mark === "fill" ? (
                <span style={{ position: "absolute", inset: 0, padding: "0.06em 0.08em 0.18em", clipPath: `inset(-0.2em ${(1 - m) * 100}% -0.2em -0.2em)` }}>{renderWord(w, i, emphColour)}</span>
              ) : null}
            </span>
            {isEmph && props.mark === "underline" && m > 0.001 ? (
              <span
                style={{
                  position: "absolute",
                  left: "-0.03em",
                  right: "-0.03em",
                  top: "1.0em",
                  height: "0.075em",
                  borderRadius: "0.04em",
                  background: style.accent,
                  transform: `scaleX(${m}) rotate(${hand ? -1.2 + boil(i) * 0.8 : 0}deg)`,
                  transformOrigin: "0 50%",
                }}
              />
            ) : null}
            {isEmph && props.mark === "punch" ? <Sparks t={t - markAt - 0.04} colour={style.accent} jitter={boil(i + 3)} /> : null}
          </span>
        );
      })}
    </div>
  ));

  // Background life: three soft colour fields drifting slowly on long sine periods; a still dot grid gives texture; a pocket of background colour keeps the text clean.
  const blob = (x: number, y: number, r: number, colour: string, alpha: number, px: number, py: number, k: number): ReactNode => (
    <div
      key={k}
      style={{
        position: "absolute",
        width: r * 2,
        height: r * 2,
        left: x - r + 60 * Math.sin((2 * Math.PI * t) / px + k),
        top: y - r + 45 * Math.cos((2 * Math.PI * t) / py + k * 0.7),
        borderRadius: "50%",
        background: `radial-gradient(circle, ${colour} 0%, transparent 68%)`,
        opacity: alpha,
      }}
    />
  );
  const dot = Math.round(W / 40);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(110% 90% at ${center ? 50 : 30}% 40%, ${style.surface} 0%, transparent 75%)`, opacity: 0.85 }} />
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <pattern id="kit-title-dots" width={dot} height={dot} patternUnits="userSpaceOnUse">
            <circle cx={dot / 2} cy={dot / 2} r={2.2} fill={style.muted} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#kit-title-dots)" opacity={0.3} />
      </svg>
      {blob(W * 0.84, H * 0.2, H * 0.62, style.accent, 0.17, 11, 14, 0)}
      {blob(W * 0.12, H * 0.92, H * 0.55, style.accent2, 0.1, 13, 10, 1)}
      {blob(W * 0.55, H * 1.05, H * 0.45, style.accent, 0.07, 15, 12, 2)}
      <AbsoluteFill style={{ background: `radial-gradient(${center ? "62% 46%" : "58% 50%"} at ${center ? 50 : 34}% 48%, ${style.bg} 0%, ${mix(style.bg, 70)} 45%, transparent 100%)` }} />

      <AbsoluteFill style={{ padding: `0 ${margin}px`, justifyContent: "center", alignItems: center ? "center" : "flex-start" }}>
        <div style={{ transform: `scale(${push})`, transformOrigin: center ? "50% 50%" : "0% 50%", display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", marginTop: -H * 0.03 }}>
          {props.eyebrow ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: size * 0.28 }}>
              <div style={{ width: 64, height: 5, borderRadius: 3, background: style.accent, transform: `scaleX(${ebRule})`, transformOrigin: "0 50%" }} />
              <div style={{ overflow: "hidden", padding: "4px 0" }}>
                <div style={{ fontFamily: style.mono, fontWeight: 600, fontSize: 34, letterSpacing: "0.12em", textTransform: "uppercase", color: mix(style.ink, 72, style.bg), transform: `translateX(${(1 - ebText) * -40}px)`, opacity: clamp01(ebText * 1.5) }}>
                  {props.eyebrow}
                </div>
              </div>
            </div>
          ) : null}
          {rows}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.13) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// Three short strokes flick out sideways from the punched word's right edge and retract: a one-off accent, then gone. Sideways so they never reach the line above.
const Sparks: FC<{ t: number; colour: string; jitter: number }> = ({ t, colour, jitter }) => {
  if (t < 0 || t > 0.5) return null;
  const grow = Easing.out(Easing.cubic)(clamp01(t / 0.22));
  const tail = Easing.in(Easing.cubic)(clamp01((t - 0.18) / 0.32));
  return (
    <svg width="0.7em" height="1em" viewBox="0 0 70 100" style={{ position: "absolute", right: "-0.72em", top: "0.08em", overflow: "visible" }}>
      {[-32, 0, 32].map((deg, k) => {
        const a = ((deg + jitter * 6) * Math.PI) / 180;
        const r0 = 14 + 44 * tail;
        const r1 = 14 + 48 * grow;
        return <line key={k} x1={r0 * Math.cos(a)} y1={50 + r0 * Math.sin(a)} x2={r1 * Math.cos(a)} y2={50 + r1 * Math.sin(a)} stroke={colour} strokeWidth={9} strokeLinecap="round" opacity={r1 > r0 ? 1 : 0} />;
      })}
    </svg>
  );
};

export default defineTemplate({
  id: "title-card",
  title: "Title card",
  mode: "text",
  layouts: ["full"],
  useFor:
    "The hook line in the first seconds, or a chapter title: 1–2 short lines (≤ 8 words) that build word by word as they are spoken, one word marked in the accent, an optional eyebrow such as 'Chapter 02'. Rotate entrance between title cards (rise, scale, stagger) and keep one mark form per video. No media.",
  avoid:
    "Anything longer than 8 words or that needs a second text level (use a graphic), stats or numbers that belong on an object, back-to-back title cards, and more than one per minute of explainer: a title card is a punctuation mark, not the picture.",
  schema,
  example: { lines: ["One loop made", "my code slow"], emphasis: "slow", mark: "punch", entrance: "scale", align: "left", eyebrow: "Chapter 02", wordCues: true },
  exampleMedia: [],
  exampleCues: [
    { at: 0.45, end: 0.7, word: "One" },
    { at: 0.7, end: 1.0, word: "loop" },
    { at: 1.0, end: 1.25, word: "made" },
    { at: 1.4, end: 1.55, word: "my" },
    { at: 1.55, end: 1.85, word: "code" },
    { at: 1.95, end: 2.4, word: "slow" },
  ],
  seconds: { min: 2, max: 6, demo: 4 },
  mediaSlots: 0,
  credit: { name: "prompt-motion kinetic type showreels ('Speech built as architecture', 'Overthinking motion study')", url: "https://prompt-motion.com" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <TitleCard props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
