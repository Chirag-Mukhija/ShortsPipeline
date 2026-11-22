// Compare split: two sides (A vs B) slide in from opposite edges, each point is dealt onto its side with a stamped mark, and an optional verdict reshapes the frame: the winner grows and opens a verdict band, the loser shrinks back and dims.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const pointSchema = z.object({
  text: z.string().min(1).max(30).describe("One short point, sentence case, ≤ 30 characters, e.g. 'One deploy for everything'"),
  word: z.string().optional().describe("Spoken word this point lands on"),
});

const sideSchema = z.object({
  title: z.string().min(1).max(18).describe("The side's name, ≤ 18 characters, e.g. 'Monolith' or 'Before'"),
  points: z.array(pointSchema).min(1).max(3).describe("1–3 short points for this side"),
  tone: z.enum(["neutral", "good", "bad"]).default("neutral").describe("good: ticks in the accent; bad: crosses in a muted tone; neutral: plain dots"),
  word: z.string().optional().describe("Spoken word this side slides in on"),
});

const schema = z
  .object({
    left: sideSchema.describe("Side A, arrives from the left"),
    right: sideSchema.describe("Side B, arrives from the right"),
    verdict: z.string().max(32).optional().describe("The conclusion, ≤ 32 characters, e.g. 'Start with the monolith'. Opens as a band on the winning side (or under both if no verdictSide)"),
    verdictSide: z.enum(["left", "right"]).optional().describe("The winning side: it grows, the other shrinks back and dims. Can be set without verdict text"),
    verdictWord: z.string().optional().describe("Spoken word the verdict lands on"),
  })
  .superRefine((p, ctx) => {
    if (p.verdictWord && !p.verdict && !p.verdictSide) ctx.addIssue({ code: "custom", message: "verdictWord needs a verdict or a verdictSide", path: ["verdictWord"] });
  });

type Props = z.infer<typeof schema>;
type Side = Props["left"];

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// WCAG luminance of a #rrggbb token (null if it isn't one), so text on a filled colour picks whichever of bg/ink reads best in any preset.
const lumOf = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
};
const onFill = (fill: string, a: string, b: string) => {
  const f = lumOf(fill);
  const la = lumOf(a);
  const lb = lumOf(b);
  if (f === null || la === null || lb === null) return b;
  const cr = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  return cr(f, la) >= cr(f, lb) ? a : b;
};

// Picture lands this long before its word, so it is settling as the word is said.
const LEAD = 0.1;

const CompareSplit: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const settle = (at: number, dur: number) => enter(style, frame, fps, at, dur);
  const smooth = (at: number, dur: number) => enter(calm, frame, fps, at, dur);
  const { left, right, verdict, verdictSide } = props;
  const sides: Side[] = [left, right];
  const hasVerdict = Boolean(verdict || verdictSide);
  const end = duration - 0.6;

  // Timing: sides on their words, points interleaved (A1, B1, A2, B2…) or on their own words, then the verdict.
  const leftAt = Math.max(0, cueAt(cues, left.word, 0.1 + LEAD) - LEAD);
  const rightAt = Math.max(leftAt + 0.3, cueAt(cues, right.word, leftAt + Math.min(0.7, duration * 0.1) + LEAD) - LEAD);
  const vLatest = end - 1.1;
  const vAt = hasVerdict ? Math.min(Math.max(cueAt(cues, props.verdictWord, end - 1.4 + LEAD) - LEAD, rightAt + 1), vLatest) : Infinity;
  const ptStart = rightAt + 0.75;
  const ptEnd = hasVerdict ? vAt - 0.55 : end - 0.55;
  const order: [number, number][] = [];
  for (let i = 0; i < 3; i++) for (let s = 0; s < 2; s++) if (sides[s]!.points[i]) order.push([s, i]);
  const N = order.length;
  const pointAt: number[][] = [[], []];
  order.forEach(([s, i], j) => {
    const fb = N === 1 ? ptStart : lerp(ptStart, ptEnd, j / (N - 1));
    const at = cueAt(cues, sides[s]!.points[i]!.word, fb + LEAD) - LEAD;
    pointAt[s]![i] = Math.min(Math.max(at, (s ? rightAt : leftAt) + 0.5), ptEnd);
  });

  // Layout in unscaled panel space; both panels share one height so the pair reads as a designed spread.
  const margin = 96;
  const gap = 72;
  const pw = (W - margin * 2 - gap) / 2;
  const padX = 46;
  const innerW = pw - padX * 2;
  const charT = hand ? 0.44 : 0.56;
  const charP = hand ? 0.42 : 0.5;
  const titleFs = Math.min(hand ? 112 : 96, Math.min(...sides.map((s) => innerW / (s.title.length * charT))));
  const fs = hand ? 56 : 48;
  const markR = 24;
  const textW = innerW - markR * 2 - 24;
  const lines = (s: string) => Math.min(2, Math.max(1, Math.ceil((s.length * fs * charP) / textW)));
  const lineH = fs * 1.22;
  const rowGap = 40;
  const rowsH = (s: Side) => s.points.reduce((a, p) => a + lines(p.text) * lineH + rowGap, 0);
  const strip = 16;
  const headH = strip + 48 + titleFs * 1.1 + 44;
  const ph = headH + Math.max(...sides.map(rowsH)) + 34;
  const vFs = verdict ? Math.max(40, Math.min(hand ? 62 : 52, (pw - 88) / (verdict.length * (hand ? 0.44 : 0.55)))) : 0;
  const vH = verdict ? Math.round(vFs * 1.25 + 64) : 0;

  // Verdict reshape: winner grows and opens its band, loser shrinks back and dims; with no side, a band opens under both.
  const v = hasVerdict ? clamp01(smooth(vAt - 0.35, 0.95)) : 0;
  const win = verdictSide === "left" ? 0 : verdictSide === "right" ? 1 : -1;
  const scaleOf = (s: number) => (win < 0 ? 1 : lerp(1, s === win ? 1.06 : 0.85, v));
  const bandOn = verdict ? v : 0;
  const hOf = (s: number) => ph + (win === s ? vH * bandOn : 0);
  const visW = [0, 1].map((s) => pw * scaleOf(s));
  const totalW = visW[0]! + gap + visW[1]!;
  const x0 = (W - totalW) / 2;
  const cxs = [x0 + visW[0]! / 2, x0 + visW[0]! + gap + visW[1]! / 2];
  const sharedBand = win < 0 && verdict ? vH * bandOn + 28 * bandOn : 0;
  const cy = H / 2 - sharedBand / 2;
  const seamX = x0 + visW[0]! + gap / 2;

  const sideIn = [settle(leftAt, 0.85), settle(rightAt, 0.85)];
  const kick = (s: number) => sides[s]!.points.reduce((a, _, i) => a + bump(t - pointAt[s]![i]!, 0.32), 0);
  const seamDraw = smooth(Math.max(0, leftAt - 0.05), 0.7);
  const vsIn = settle(rightAt + 0.25, 0.5);
  const boil = (k: number) => (hand ? (hash(k * 17 + Math.floor(t * 8)) - 0.5) * 6 : 0);

  const toneColour = (tone: Side["tone"]) => (tone === "good" ? style.accent : tone === "bad" ? mix(style.ink, 45, style.surface) : style.accent2);
  const radius = Math.min(style.radius, 28);

  const Mark = ({ tone, p, colour }: { tone: Side["tone"]; p: number; colour: string }) => {
    const glyph = onFill(tone === "bad" ? style.muted : tone === "good" ? style.accent : style.accent2, style.bg, style.ink);
    const r = markR;
    const sc = 1 + 0.55 * (1 - clamp01(p));
    return (
      <svg width={r * 2 + 4} height={r * 2 + 4} viewBox={`${-r - 2} ${-r - 2} ${r * 2 + 4} ${r * 2 + 4}`} style={{ flex: "none", overflow: "visible", opacity: clamp01(p * 2), transform: `scale(${sc})` }}>
        <circle r={r} fill={colour} />
        {tone === "good" ? (
          <path d={`M${-r * 0.4} ${r * 0.02} L${-r * 0.1} ${r * 0.32} L${r * 0.42} ${-r * 0.3}`} stroke={glyph} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
        ) : tone === "bad" ? (
          <path d={`M${-r * 0.32} ${-r * 0.32} L${r * 0.32} ${r * 0.32} M${r * 0.32} ${-r * 0.32} L${-r * 0.32} ${r * 0.32}`} stroke={glyph} strokeWidth={5} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
        ) : (
          <circle r={r * 0.28 * clamp01(p)} fill={glyph} />
        )}
      </svg>
    );
  };

  const Panel = ({ s }: { s: number }) => {
    const side = sides[s]!;
    const dir = s === 0 ? -1 : 1;
    const p = sideIn[s]!;
    const sc = scaleOf(s);
    const lose = win >= 0 && win !== s ? v : 0;
    const winning = win === s ? v : 0;
    const h = hOf(s);
    const tc = toneColour(side.tone);
    const titleIn = settle((s ? rightAt : leftAt) + 0.2, 0.6);
    const ink = mix(style.ink, 100 - 45 * lose, style.muted);
    const k = kick(s);
    const border = smooth(vAt + 0.15, 0.7) * (win === s ? 1 : 0);
    // Rows lay out top-down; each point slides in from the seam side, its slot line dissolving as it lands.
    let y = headH;
    const rows = side.points.map((pt, i) => {
      const at = pointAt[s]![i]!;
      const rIn = settle(at - 0.22, 0.5);
      const mIn = settle(at - 0.02, 0.4);
      const rh = lines(pt.text) * lineH;
      const top = y;
      y += rh + rowGap;
      return (
        <div key={i} style={{ position: "absolute", left: padX, top, width: innerW, height: rh }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -rowGap / 2, height: 0, borderTop: `3px dashed ${mix(style.ink, 14)}`, opacity: (1 - clamp01(rIn)) * clamp01(p) }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, opacity: clamp01(rIn * 1.4), transform: `translateX(${-dir * 90 * (1 - rIn)}px)` }}>
            <div style={{ height: lineH, display: "flex", alignItems: "center" }}>
              <Mark tone={side.tone} p={mIn} colour={lose > 0 ? mix(tc, 100 - 60 * lose, style.muted) : side.tone === "bad" ? style.muted : tc} />
            </div>
            <div style={{ width: textW, fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: fs, lineHeight: `${lineH}px`, letterSpacing: hand ? 0 : "-0.01em", color: ink }}>{pt.text}</div>
          </div>
        </div>
      );
    });
    const bandText = onFill(style.accent, style.bg, style.ink);
    const vText = smooth(vAt + 0.3, 0.6);
    return (
      <div
        style={{
          position: "absolute",
          left: cxs[s]! - pw / 2 + dir * (1 - p) * (W * 0.62) + dir * 7 * k,
          top: cy - h / 2,
          width: pw,
          height: h,
          transform: `scale(${sc}) rotate(${dir * 3.5 * (1 - p)}deg)`,
          transformOrigin: "50% 50%",
          opacity: clamp01(p * 1.6) * (1 - 0.4 * lose),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background: style.surface,
            border: hand ? `3px solid ${mix(style.ink, 100 - 50 * lose)}` : `1.5px solid ${mix(style.ink, 10)}`,
            boxSizing: "border-box",
            boxShadow: `0 ${30 + 20 * winning}px ${70 + 30 * winning}px ${mix(style.ink, 12 + 6 * winning - 6 * lose)}, 0 2px 6px ${mix(style.ink, 6)}`,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: strip, background: lose > 0 ? mix(tc, 100 - 60 * lose, style.muted) : tc }} />
          <div style={{ position: "absolute", left: padX, top: strip + 48, width: innerW, overflow: "hidden", paddingBottom: 8 }}>
            <div style={{ fontFamily: style.display, fontWeight: hand ? 700 : 700, fontSize: titleFs, lineHeight: 1.1, letterSpacing: hand ? 0 : "-0.025em", color: ink, whiteSpace: "nowrap", transform: `translateY(${(1 - titleIn) * 110}%)` }}>{side.title}</div>
          </div>
          <div style={{ position: "absolute", left: padX, top: headH - 24, height: 3, width: innerW * clamp01(titleIn), background: mix(style.ink, 12) }} />
          {rows}
          {win === s && verdict ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: vH * bandOn, background: style.accent, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 44, right: 44, top: 32, height: vFs * 1.25, overflow: "hidden" }}>
                <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: vFs, lineHeight: 1.25, letterSpacing: hand ? 0 : "-0.02em", color: bandText, whiteSpace: "nowrap", transform: `translateY(${(1 - vText) * 110}%)` }}>{verdict}</div>
              </div>
            </div>
          ) : null}
        </div>
        {border > 0.001 ? (
          <svg width={pw + 16} height={h + 16} style={{ position: "absolute", left: -8, top: -8, overflow: "visible" }}>
            <rect x={2} y={2} width={pw + 12} height={h + 12} rx={radius + 6} fill="none" stroke={style.accent} strokeWidth={hand ? 5 : 4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
          </svg>
        ) : null}
      </div>
    );
  };

  const vsSize = 92;
  const sharedText = smooth(vAt + 0.3, 0.6);
  const seamTop = cy - ph / 2 - 40;
  const seamBot = cy + ph / 2 + 40;
  const seamMid = cy;

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: base light, plus two drifting glows that tint each side (the life layer; the drift also keeps every frame repainting). */}
      <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 50% 0%, ${style.surface} 0%, transparent 70%)`, opacity: 0.75 }} />
      {[0, 1].map((s) => (
        <div
          key={s}
          style={{
            position: "absolute",
            width: H * 1.15,
            height: H * 1.15,
            left: cxs[s]! - H * 0.575 + (s ? 1 : -1) * 60 + 50 * Math.sin((2 * Math.PI * (t + s * 4)) / 14),
            top: H * 0.5 - H * 0.575 + 40 * Math.cos((2 * Math.PI * (t + s * 3)) / 17),
            borderRadius: "50%",
            background: `radial-gradient(circle, ${s ? style.accent2 : style.accent} 0%, transparent 62%)`,
            opacity: 0.07 * clamp01(sideIn[s]!) * (win >= 0 && win !== s ? 1 - 0.7 * v : 1 + 0.4 * (win === s ? v : 0)),
          }}
        />
      ))}

      {/* Seam between the sides: draws from the middle, carries the 'vs' disc. */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <path
          d={`M${seamX} ${lerp(seamMid, seamTop, seamDraw)} Q${seamX + boil(1)} ${seamMid} ${seamX} ${lerp(seamMid, seamBot, seamDraw)}`}
          stroke={mix(style.ink, 16)}
          strokeWidth={hand ? 4 : 3}
          strokeLinecap="round"
          strokeDasharray={hand ? undefined : "2 14"}
          fill="none"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: seamX - vsSize / 2,
          top: seamMid - vsSize / 2,
          width: vsSize,
          height: vsSize,
          borderRadius: "50%",
          background: style.ink,
          color: style.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: hand ? style.display : style.mono,
          fontWeight: 700,
          fontSize: hand ? 44 : 34,
          letterSpacing: hand ? 0 : "-0.02em",
          opacity: clamp01(vsIn * 1.5) * (1 - 0.6 * (win >= 0 ? v : 0)),
          transform: `scale(${(0.4 + 0.6 * vsIn) * (1 - 0.25 * (win >= 0 ? v : 0))}) rotate(${hand ? -6 : 0}deg)`,
          zIndex: 2,
        }}
      >
        vs
      </div>

      <Panel s={0} />
      <Panel s={1} />

      {win < 0 && verdict && bandOn > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: x0 + (totalW * (1 - bandOn)) / 2,
            width: totalW * bandOn,
            top: cy + ph / 2 + 28,
            height: vH,
            borderRadius: radius,
            background: style.accent,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ height: vFs * 1.25, overflow: "hidden" }}>
            <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: vFs, lineHeight: 1.25, letterSpacing: hand ? 0 : "-0.02em", color: onFill(style.accent, style.bg, style.ink), whiteSpace: "nowrap", transform: `translateY(${(1 - sharedText) * 110}%)` }}>{verdict}</div>
          </div>
        </div>
      ) : null}

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "compare-split",
  title: "Compare split",
  mode: "graphic",
  layouts: ["full"],
  useFor:
    "A head-to-head contrast: monolith vs microservices, before vs after, 'just do it' vs 'understand why'. Side A slides in from the left and side B from the right, each with a title and 1–3 short points that are dealt onto their side one by one (interleaved A1, B1, A2… unless each point names its own word). Tone marks each side's points: good = ticks, bad = crosses, neutral = dots. An optional verdict reshapes the frame on its word: the winning side grows and opens a verdict band, the losing side shrinks back and dims (verdictSide without verdict text just picks the winner; verdict without a side opens a band under both). No media.",
  avoid:
    "More than three points a side or points longer than one short line (use list-tick), comparing three or more options, segments under ~5 s with six points (each point needs ~0.5 s), and comparisons that are really a number (use stat-punch).",
  schema,
  example: {
    left: {
      title: "Monolith",
      tone: "good",
      word: "monolith",
      points: [
        { text: "One deploy for everything", word: "deploy" },
        { text: "Debug in a single process", word: "debug" },
        { text: "Fast for a small team" },
      ],
    },
    right: {
      title: "Microservices",
      tone: "bad",
      word: "microservices",
      points: [
        { text: "Twelve pipelines to babysit", word: "pipelines" },
        { text: "Bugs hide between services", word: "between" },
        { text: "Pays off at huge scale" },
      ],
    },
    verdict: "Start with the monolith",
    verdictSide: "left",
    verdictWord: "start",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.7, word: "monolith" },
    { at: 0.9, end: 1.6, word: "microservices" },
    { at: 2.0, end: 2.3, word: "deploy" },
    { at: 2.7, end: 3.2, word: "pipelines" },
    { at: 3.5, end: 3.8, word: "debug" },
    { at: 4.2, end: 4.6, word: "between" },
    { at: 6.5, end: 6.8, word: "start" },
  ],
  seconds: { min: 4, max: 10, demo: 8.5 },
  mediaSlots: 0,
  credit: { name: "The creator's reference reel (before/after demo cards) and 'Launch video remake comparison' (prompt-motion.com)", url: "https://prompt-motion.com" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <CompareSplit props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
