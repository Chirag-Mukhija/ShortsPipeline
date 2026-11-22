// Quote card: a cited or spoken quote rises in phrase by phrase on its cues, a drawn quotation mark lands first and nods with each phrase, the key phrase gets a marker sweep, and the attribution slides in last.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
// Straight or curly quotes the planner may have wrapped the quote in; the template draws its own.
const unquote = (s: string) => s.trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
const wordsOf = (s: string) => unquote(s).split(/\s+/).filter(Boolean);

// Where the emphasis phrase sits in the quote's words, as [first, last] word index, or undefined.
const findPhrase = (words: string[], phrase: string | undefined): [number, number] | undefined => {
  if (!phrase) return undefined;
  const target = wordsOf(phrase).map(norm).filter(Boolean);
  if (!target.length) return undefined;
  const ws = words.map(norm);
  for (let i = 0; i + target.length <= ws.length; i++) if (target.every((w, k) => ws[i + k] === w)) return [i, i + target.length - 1];
  return undefined;
};

const schema = z
  .object({
    quote: z.string().min(8).max(120).describe("The quote itself, exactly as said or written, without surrounding quotation marks (the template draws them), e.g. 'Premature optimization is the root of all evil'"),
    emphasis: z.string().max(40).optional().describe("The key phrase, copied word for word from the quote (2–5 words); it gets the accent marker sweep. Leave out for none"),
    by: z.string().min(1).max(36).describe("Who said or wrote it: a person, a study or 'Me, 2 years ago' for the creator's own line"),
    detail: z.string().max(40).optional().describe("Where and when, shown small under the name, e.g. 'Stanford alumni data, 2002' or 'ACM Computing Surveys, 1974'"),
    wordCues: z.boolean().default(true).describe("When true, each phrase rises on the moment its first word is spoken if the narration reads the quote; otherwise phrases are paced over the segment"),
    startWord: z.string().optional().describe("Spoken word the quote starts arriving on, when the narration doesn't read the quote itself"),
    markWord: z.string().optional().describe("Spoken word the emphasis marker sweeps on (default: just after the key phrase lands)"),
    byWord: z.string().optional().describe("Spoken word the attribution slides in on, e.g. the speaker's surname (default: after the last phrase)"),
  })
  .superRefine((p, ctx) => {
    if (p.emphasis && !findPhrase(wordsOf(p.quote), p.emphasis)) ctx.addIssue({ code: "custom", message: `emphasis '${p.emphasis}' is not a run of words in the quote`, path: ["emphasis"] });
  });

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Phrases start this far before their first word is spoken, so the words are settling as they are heard.
const LEAD = 0.12;
const ENT = 0.55;
const STAGGER = 0.06;
const MARK_DUR = 0.5;
const BY_DUR = 0.6;
const MAX_PHRASE = 5;

// Phrases: break after punctuation and around the emphasis phrase (so it arrives as one unit), then split long runs evenly into ≤ 5 words.
const phrasesOf = (words: string[], emph: [number, number] | undefined) => {
  const runs: number[][] = [];
  let cur: number[] = [];
  words.forEach((w, i) => {
    if (emph && i === emph[0] && cur.length) {
      runs.push(cur);
      cur = [];
    }
    cur.push(i);
    if (/[,;:.!?—–)]$/.test(w) || (emph && i === emph[1])) {
      runs.push(cur);
      cur = [];
    }
  });
  if (cur.length) runs.push(cur);
  return runs.flatMap((run) => {
    const parts = Math.ceil(run.length / MAX_PHRASE);
    const size = Math.ceil(run.length / parts);
    return Array.from({ length: parts }, (_, k) => run.slice(k * size, (k + 1) * size)).filter((r) => r.length);
  });
};

// Each word in order is matched to the next spoken cue with the same text, so repeated words land on their own occurrence.
const matchWords = (words: string[], cues: Cue[]) => {
  let from = 0;
  return words.map((w) => {
    const i = cues.findIndex((c, k) => k >= from && norm(c.word) === norm(w));
    if (i < 0) return undefined;
    from = i + 1;
    return cues[i]!.at;
  });
};

// One curly opening quote ("6" shape: ball below, tail rising to the right) in a 40×60 box.
const COMMA_TAIL = "M5,41 C4,22 13,8 33,1 L36,8 C24,14 18,22 17,28 Z";

const QuoteMark: FC<{ size: number; style: Style; t: number; at: number; nod: number; boil: (k: number) => number }> = ({ size, style, t, at, nod, boil }) => {
  const { frame, fps } = useT();
  const hand = style.motion === "hand";
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 90 60" style={{ overflow: "visible", display: "block" }}>
      {[0, 1].map((k) => {
        const p = enter(style, frame, fps, at + k * 0.09, 0.6);
        const fall = interpolate(t, [at + k * 0.09, at + k * 0.09 + 0.45], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const x = k * 48;
        const wob = hand ? boil(k) * 1.6 : 0;
        return (
          <g key={k} transform={`translate(${x + 20} ${42 - 26 * fall}) rotate(${-24 * (1 - p) + nod * (k ? 1.3 : 1) + wob}) scale(${Math.max(0, p)}) translate(-20 -42)`} opacity={clamp01(p * 2)}>
            <circle cx={20} cy={42} r={16} fill={style.accent} />
            <path d={COMMA_TAIL} fill={style.accent} />
            {hand ? <circle cx={20 + boil(k + 4) * 1.5} cy={42 + boil(k + 7) * 1.5} r={17} fill="none" stroke={style.ink} strokeWidth={2.2} opacity={0.85} /> : null}
          </g>
        );
      })}
    </svg>
  );
};

const QuoteCard: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const words = wordsOf(props.quote);
  const n = words.length;
  const emph = findPhrase(words, props.emphasis);
  const phrases = phrasesOf(words, emph);
  const phraseOf = new Map<number, number>();
  phrases.forEach((ph, pi) => ph.forEach((i) => phraseOf.set(i, pi)));
  const boil = (k: number) => (hand ? hash(k * 17.3 + Math.floor(t * 8) * 3.1) - 0.5 : 0);

  // Timing. The mark lands first, phrases rise on their first spoken word (or are paced by word count), the marker sweeps, the attribution slides in; all settled 0.6 s before the end.
  const markIn = 0.05;
  const lastLen = (pi: number) => ENT + STAGGER * (phrases[pi]!.length - 1);
  const latestBy = Math.max(0.6, duration - 0.6 - BY_DUR);
  const latestLastStart = Math.max(0.3, latestBy - 0.25 - lastLen(phrases.length - 1));
  const base = Math.max(0.3, cueAt(cues, props.startWord, 0.35) - LEAD);
  const spoken = props.wordCues ? matchWords(words, cues) : words.map(() => undefined);
  const paceEnd = Math.min(Math.max(base + 0.3, duration * 0.62), latestLastStart);
  const raw: number[] = [];
  phrases.forEach((ph, pi) => {
    const hit = ph.map((i) => spoken[i]).find((x) => x !== undefined);
    const paced = base + (n > 1 ? (ph[0]! / Math.max(1, phrases[phrases.length - 1]![0]!)) * (paceEnd - base) : 0);
    const at = hit !== undefined ? hit - LEAD : paced;
    raw.push(Math.max(at, pi ? raw[pi - 1]! + 0.18 : markIn + 0.2));
  });
  // Cues running late: squeeze the phrase starts between the first and the latest allowed, keeping their rhythm.
  const r0 = raw[0]!;
  const rN = raw[raw.length - 1]!;
  const first = Math.min(r0, latestLastStart);
  const S = raw.map((s) => (rN > latestLastStart ? (rN === r0 ? first : first + ((s - r0) / (rN - r0)) * (latestLastStart - first)) : s));
  const landOf = (pi: number) => S[pi]! + lastLen(pi);
  const lastLand = landOf(phrases.length - 1);
  const emphPhrase = emph ? phraseOf.get(emph[0])! : -1;
  const markLatest = duration - 0.6 - MARK_DUR;
  const markAt = emph ? Math.min(Math.max(cueAt(cues, props.markWord, landOf(emphPhrase) + 0.4 + LEAD) - LEAD, landOf(emphPhrase) + 0.25), markLatest) : Infinity;
  const byAt = Math.min(Math.max(cueAt(cues, props.byWord, lastLand + 0.35 + LEAD) - LEAD, lastLand + 0.2), latestBy);

  // Size: the biggest step on the ladder whose estimated wrap fits the line and height budget.
  const margin = narrow ? 76 : Math.max(110, W * 0.08);
  const charW = hand ? 0.42 : 0.5;
  const ladder = hand ?[128, 118, 108, 98, 88, 78, 68] : narrow ? [92, 84, 76, 68, 60, 54] : [112, 104, 96, 88, 80, 72, 64, 58];
  const markScale = narrow ? 1.25 : 1.55;
  const fit = (fs: number) => {
    const markW = fs * markScale * 1.5;
    const measure = narrow ? W - margin * 2 : W - margin * 2 - markW - 48;
    const lines = Math.ceil((props.quote.length * fs * charW) / (measure * 0.92));
    const budget = (narrow ? H * 0.6 - fs * markScale : H * 0.68) - (props.detail ? 130 : 90);
    return { measure, lines, ok: lines <= (narrow ? 6 : 5) && lines * fs * 1.2 <= budget };
  };
  const fs = ladder.find((s) => fit(s).ok) ?? ladder[ladder.length - 1]!;
  const { measure } = fit(fs);
  const markSize = fs * markScale;

  // The mark nods with each phrase as it lands (follow-through), alternating direction, decaying fast.
  const nod = phrases.reduce((a, _, pi) => a + (pi % 2 ? -1 : 1) * 3.2 * bump(t - S[pi]! - 0.12, 0.42), 0) - 2.5 * bump(t - byAt, 0.5);

  // Camera: born slightly close, settles back as the mark lands, then a slow 2% push keeps the hold alive.
  const arrive = enter(calm, frame, fps, 0, 0.9);
  const cam = (1.04 - 0.04 * arrive) * (1 + 0.02 * clamp01((t - 0.9) / Math.max(1, duration - 0.9)));

  const m = emph ? clamp01(enter(calm, frame, fps, markAt, MARK_DUR)) : 0;

  const wordEls: ReactNode[] = [];
  const emphEls: ReactNode[] = [];
  words.forEach((w, i) => {
    const pi = phraseOf.get(i)!;
    const k = phrases[pi]!.indexOf(i);
    const p = enter(style, frame, fps, S[pi]! + k * STAGGER, ENT);
    const inEmph = !!emph && i >= emph[0] && i <= emph[1];
    const lastEmph = inEmph && i === emph![1];
    const isLast = i === n - 1;
    const closeP = isLast ? enter(style, frame, fps, landOf(pi) - 0.1, 0.5) : 0;
    (inEmph ? emphEls : wordEls).push(
      <span key={i} style={{ position: "relative", display: "inline-block" }}>
        <span style={{ position: "relative", display: "inline-block", overflow: "hidden", padding: "0.06em 0.08em 0.2em", margin: "-0.06em -0.08em -0.2em", verticalAlign: "top" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 115}%) rotate(${(1 - clamp01(p)) * 3}deg)`, transformOrigin: "0 100%" }}>{w}</span>
        </span>
        {isLast ? (
          <span style={{ display: "inline-block", width: "0.55em", height: "0.5em", marginLeft: "0.08em", verticalAlign: "0.38em", transform: `scale(${Math.max(0, closeP)}) rotate(${180 - 30 * (1 - closeP)}deg)`, opacity: clamp01(closeP * 2) }}>
            <svg width="100%" height="100%" viewBox="0 0 90 60" style={{ overflow: "visible", display: "block" }}>
              {[0, 48].map((x) => (
                <g key={x} transform={`translate(${x} 0)`}>
                  <circle cx={20} cy={42} r={16} fill={style.accent} />
                  <path d={COMMA_TAIL} fill={style.accent} />
                </g>
              ))}
            </svg>
          </span>
        ) : null}
      </span>,
    );
    // The key phrase never breaks across lines, so one marker band sweeps under it in a single stroke (stopping short of the closing mark).
    if (lastEmph) {
      wordEls.push(
        <span key={`e${i}`} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
          {m > 0.001 ? (
            <span
              style={{
                position: "absolute",
                left: "-0.08em",
                right: isLast ? "0.58em" : "-0.08em",
                top: "0.2em",
                height: "0.92em",
                background: mix(style.accent, hand ? 42 : 34),
                borderRadius: hand ? "0.12em 0.3em 0.18em 0.28em" : Math.min(style.radius * 0.3, 8),
                transform: `scaleX(${m}) rotate(${hand ? -1.2 + boil(i) * 0.5 : 0}deg) skewX(${hand ? -6 : 0}deg)`,
                transformOrigin: "0 50%",
              }}
            />
          ) : null}
          {emphEls.splice(0)}
        </span>,
      );
    }
    if (!isLast) (inEmph && !lastEmph ? emphEls : wordEls).push(" ");
  });

  const byP = enter(style, frame, fps, byAt, BY_DUR);
  const ruleP = enter(calm, frame, fps, byAt - 0.08, 0.45);
  const detP = enter(calm, frame, fps, byAt + 0.18, 0.5);
  const byFs = narrow ? 46 : 54;

  const quoteText = (
    <div
      style={{
        width: measure,
        fontFamily: style.display,
        fontWeight: 600,
        fontSynthesis: "none",
        fontSize: fs,
        lineHeight: 1.2,
        letterSpacing: hand ? 0 : "-0.018em",
        color: style.ink,
        textWrap: "pretty",
      }}
    >
      {wordEls}
    </div>
  );

  const attribution = (
    <div style={{ marginTop: fs * 0.5, display: "flex", alignItems: "flex-start", gap: 22 }}>
      <div style={{ width: 60, height: 4, marginTop: byFs * 0.62, borderRadius: 2, background: style.accent, transform: `scaleX(${ruleP})`, transformOrigin: "0 50%" }} />
      <div>
        <div style={{ overflow: "hidden", padding: "2px 0 6px" }}>
          <div style={{ fontFamily: style.body, fontWeight: 600, fontSize: byFs, lineHeight: 1.2, color: style.ink, whiteSpace: "nowrap", transform: `translateX(${(1 - byP) * -105}%)` }}>{props.by}</div>
        </div>
        {props.detail ? (
          <div style={{ fontFamily: style.body, fontWeight: 500, fontSize: narrow ? 32 : 36, lineHeight: 1.2, color: style.muted, whiteSpace: "nowrap", marginTop: 4, opacity: detP, transform: `translateY(${(1 - detP) * 14}px)` }}>{props.detail}</div>
        ) : null}
      </div>
    </div>
  );

  // Background life: a huge ghost quotation mark turns very slowly behind everything; faint ruled lines give the page a surface; a pocket keeps the text clean.
  // It is a closing mark, bottom right and partly off the frame, answering the opening mark top left.
  const ghost = H * (narrow ? 0.62 : 0.82);
  const ghostRot = 172 + 6 * Math.sin((2 * Math.PI * t) / 24);
  const ghostX = W - ghost * 1.5 * 0.78 + 30 * Math.sin((2 * Math.PI * t) / 17);
  const ghostY = H - ghost * 0.88 + 20 * Math.cos((2 * Math.PI * t) / 19);
  const rule = Math.round(fs * 1.2);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(100% 85% at ${narrow ? 50 : 32}% 38%, ${style.surface} 0%, transparent 72%)`, opacity: 0.85 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${mix(style.ink, 5)} 1.5px, transparent 1.5px)`,
          backgroundSize: `100% ${rule}px`,
          maskImage: "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
          opacity: 0.9,
        }}
      />
      <div style={{ position: "absolute", left: ghostX, top: ghostY, width: ghost * 1.5, height: ghost, transform: `rotate(${ghostRot}deg)`, transformOrigin: "50% 50%", opacity: hand ? 0.08 : 0.07 }}>
        <svg width="100%" height="100%" viewBox="0 0 90 60" style={{ display: "block" }}>
          {[0, 48].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <circle cx={20} cy={42} r={16} fill={style.accent2} />
              <path d={COMMA_TAIL} fill={style.accent2} />
            </g>
          ))}
        </svg>
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(${narrow ? "75% 50%" : "62% 52%"} at ${narrow ? 50 : 42}% 50%, ${style.bg} 0%, ${mix(style.bg, 65)} 50%, transparent 100%)` }} />

      <AbsoluteFill style={{ padding: `0 ${margin}px`, justifyContent: "center", alignItems: "flex-start" }}>
        <div
          style={{
            display: "flex",
            flexDirection: narrow ? "column" : "row",
            alignItems: "flex-start",
            gap: narrow ? fs * 0.25 : 48,
            transform: `scale(${cam})`,
            transformOrigin: narrow ? "50% 40%" : "30% 50%",
            marginTop: -H * 0.02,
          }}
        >
          <div style={{ marginTop: narrow ? 0 : fs * 0.12 }}>
            <QuoteMark size={markSize} style={style} t={t} at={markIn} nod={nod} boil={boil} />
          </div>
          <div>
            {quoteText}
            {attribution}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "quote-card",
  title: "Quote card",
  mode: "text",
  layouts: ["full", "split"],
  useFor:
    "Quoting a person, a study or the creator's own earlier line: the quote (≤ 120 characters) rises in phrase by phrase as it is read, a drawn quotation mark lands first and nods with each phrase, the key phrase gets an accent marker sweep, and the attribution (name, plus optional source and year) slides in last. As a split panel it sits beside face cam. No media.",
  avoid:
    "Quotes that aren't in research/sources.md or the creator's own words, paraphrases dressed as quotes, more than ~20 words (cut to the line that matters), segments shorter than ~1.5 s + 0.3 s per word (the viewer must read it), back-to-back quote cards, and ending a video on one (end on an action).",
  schema,
  example: {
    quote: "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil.",
    emphasis: "the root of all evil",
    by: "Donald Knuth",
    detail: "ACM Computing Surveys, 1974",
    wordCues: true,
    markWord: "evil",
    byWord: "Knuth",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.4, end: 0.55, word: "We" },
    { at: 0.55, end: 0.75, word: "should" },
    { at: 0.75, end: 1.0, word: "forget" },
    { at: 1.0, end: 1.2, word: "about" },
    { at: 1.2, end: 1.45, word: "small" },
    { at: 1.45, end: 2.0, word: "efficiencies" },
    { at: 2.2, end: 2.4, word: "say" },
    { at: 2.4, end: 2.6, word: "about" },
    { at: 2.6, end: 3.1, word: "97%" },
    { at: 3.1, end: 3.2, word: "of" },
    { at: 3.2, end: 3.3, word: "the" },
    { at: 3.3, end: 3.6, word: "time" },
    { at: 3.8, end: 4.2, word: "premature" },
    { at: 4.2, end: 4.7, word: "optimization" },
    { at: 4.7, end: 4.85, word: "is" },
    { at: 4.85, end: 4.95, word: "the" },
    { at: 4.95, end: 5.15, word: "root" },
    { at: 5.15, end: 5.25, word: "of" },
    { at: 5.25, end: 5.4, word: "all" },
    { at: 5.4, end: 5.75, word: "evil" },
    { at: 6.0, end: 6.25, word: "Donald" },
    { at: 6.25, end: 6.6, word: "Knuth" },
  ],
  seconds: { min: 3, max: 8, demo: 8 },
  mediaSlots: 0,
  credit: { name: "'Prompting mistakes video tutorial' by @henkvaness (prompt-motion.com)", url: "https://prompt-motion.com/henkvaness-0e06af" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <QuoteCard props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
