// Kinetic type pieces for a narrated explainer: title card, word-by-word phrase, step stack, number slam, A-vs-B split, pull quote, type bars and source tag. Every cue is a spoken time in seconds.
import type { CSSProperties, FC } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors } from "remotion";
import { useTime } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { BLOCK, DIM, M, MONO, MUTED, RED, WHITE, fitSize, voice, type Bg, type Voice } from "./theme";
import { EXPO, SWAP, emph, exit, shake, snap, span } from "./motion";
import { MaskRise, Push, Spot, wght, type Align } from "./type";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// A word as narration.json has it.
export type Spoken = { text: string; start: number; end: number };

// ---------- TitleCard ----------

export type TitleCardProps = {
  title: string[];
  at: number;
  // Mono kicker above the title, e.g. "CHAPTER 02".
  kicker?: string;
  // Big outline numeral bleeding off the right edge.
  num?: string;
  sub?: string;
  subAt?: number;
  out?: number;
  size?: number;
  // Index of the title word (counting across lines) that turns accent.
  accentWord?: number;
};

// A chapter or hook card: words rise from a mask line, a rule cuts in, an outline numeral bleeds off the edge, and the whole card pushes in 3 %.
export const TitleCard: FC<TitleCardProps> = ({ title, at, kicker, num, sub, subAt, out, size = 180, accentWord }) => {
  const { t } = useTime();
  const rule = span(t, at - 0.1, 10, EXPO);
  const gone = out === undefined ? 0 : exit(t, out, 8);
  return (
    <Push from={at} to={(out ?? at + 4) + 0.3} amount={0.03} origin="0% 50%">
      {num && (
        <Spot x={W + 200 - span(t, at, 30, EXPO) * 120} y={600} align="right" style={{ ...voice("hit", 640), color: "transparent", WebkitTextStroke: `3px ${MUTED}`, opacity: 0.55 * (1 - gone) }}>
          {num}
        </Spot>
      )}
      <div style={{ position: "absolute", left: M, right: M, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34 }}>
        {kicker && (
          <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: 1 - gone }}>
            <div style={{ width: 150 * rule, height: 8, background: RED }} />
            <MaskRise lines={[kicker]} at={at - 0.05} by="chars" stagger={0.6} style={{ ...voice("tech", 34, 700), color: RED, letterSpacing: "0.18em" }} />
          </div>
        )}
        <MaskRise
          lines={title}
          at={at}
          by="words"
          out={out}
          style={{ ...voice("hit", size), color: WHITE, lineHeight: 0.92 }}
          unitStyle={(i) => (i === accentWord ? { color: RED } : undefined)}
        />
        {sub && <MaskRise lines={[sub]} at={subAt ?? at + 0.45} by="words" out={out} style={{ ...voice("emo", 76), color: "#C9C9D1" }} />}
      </div>
    </Push>
  );
};

// ---------- PhraseBuilder ----------

export type PhraseBuilderProps = {
  words: Spoken[];
  emphasisIdx?: number | number[];
  // build: words snap in one by one and stay; karaoke: whole line waits at 15 % and lights up; replace: one huge word at a time, cut on the next hit.
  mode?: "build" | "karaoke" | "replace";
  size?: number;
  align?: Align;
  maxWidth?: number;
  color?: string;
  accent?: string;
  // Voice for emphasised words: hit morphs weight 400 → 900; emo swaps to the serif italic.
  emphVoice?: Voice;
  out?: number;
  push?: number;
};

// A line assembled word by word from narration.json timings, auto-wrapping, with the stressed word(s) punching, morphing weight and turning accent.
export const PhraseBuilder: FC<PhraseBuilderProps> = ({ words, emphasisIdx, mode = "build", size = 150, align = "left", maxWidth = W - 2 * M, color = WHITE, accent = RED, emphVoice = "hit", out, push = 0.04 }) => {
  const { t } = useTime();
  const em = new Set(emphasisIdx === undefined ? [] : Array.isArray(emphasisIdx) ? emphasisIdx : [emphasisIdx]);
  const first = words[0]?.start ?? 0;
  const last = words[words.length - 1]?.end ?? first;

  if (mode === "replace") {
    const k = words.reduce((acc, w, i) => (t >= w.start - 3 / FPS ? i : acc), -1);
    const w = words[k];
    if (!w || (out !== undefined && t >= out)) return null;
    const isEm = em.has(k);
    const big = fitSize(w.text, W - 2 * M, size * 1.9);
    const sn = snap(t, w.start);
    return (
      <Spot x={W / 2} y={H / 2} transform={`translateY(${sn.y * big}px) scale(${sn.s * (isEm ? emph(t, w.start) : 1)})`} style={{ ...voice(isEm ? emphVoice : "hit", isEm && emphVoice === "emo" ? big * 1.15 : big), color: isEm ? accent : color, opacity: sn.o }}>
        {w.text}
      </Spot>
    );
  }

  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const left = align === "center" ? (W - maxWidth) / 2 : align === "left" ? M : W - M - maxWidth;
  return (
    <Push from={first} to={last + 0.6} amount={push}>
      <div style={{ position: "absolute", left, width: maxWidth, top: 0, bottom: 0, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: justify, columnGap: size * 0.26, rowGap: size * 0.08 }}>
        {words.map((w, i) => {
          const isEm = em.has(i);
          const off = out === undefined ? 0 : exit(t, out + i / FPS);
          let o: number;
          let s = 1;
          let y = 0;
          if (mode === "karaoke") {
            o = interpolate(t, [first - 0.4, first - 0.2], [0, 0.15], CLAMP) + 0.85 * span(t, w.start, 6, Easing.linear, 0);
          } else {
            const sn = snap(t, w.start);
            o = sn.o;
            s = sn.s;
            y = sn.y * size;
          }
          if (isEm) s *= emph(t, w.start);
          const ev = isEm ? emphVoice : "hit";
          const style: CSSProperties = {
            ...voice(ev, ev === "emo" ? size * 1.12 : size),
            ...(isEm && ev === "hit" ? wght(interpolate(t, [w.start, w.start + 8 / FPS], [400, 900], { ...CLAMP, easing: Easing.inOut(Easing.cubic) })) : ev === "hit" ? wght(820) : {}),
            color: isEm && t >= w.start ? accent : color,
            opacity: o,
            display: "inline-block",
            transform: `translate(${-off * (W + 200)}px, ${y}px) scale(${s})`,
            transformOrigin: "50% 62%",
            whiteSpace: "nowrap",
          };
          return (
            <span key={i} style={style}>
              {w.text}
            </span>
          );
        })}
      </div>
    </Push>
  );
};

// ---------- StepStack ----------

export type Step = { text: string; at: number };

// A list where each step lands huge in red, then files up into its numbered row as the next one arrives; `end` files the last one too.
export const StepStack: FC<{ steps: Step[]; end?: number; size?: number; top?: number; row?: number; heroY?: number; label?: string }> = ({ steps, end, size = 92, top = 250, row = 128, heroY = 830, label }) => {
  const { t } = useTime();
  const textX = M + 120;
  return (
    <>
      {label && (
        <Spot x={M} y={top - 110} align="left" style={{ ...voice("tech", 32, 700), color: MUTED, letterSpacing: "0.18em", opacity: span(t, steps[0]!.at - 0.3, 10) }}>
          {label}
        </Spot>
      )}
      {steps.map((st, i) => {
        const next = steps[i + 1]?.at ?? end;
        const file = next === undefined ? 0 : interpolate(t, [next - 0.12, next + 0.28], [0, 1], { ...CLAMP, easing: SWAP });
        const sn = snap(t, st.at);
        if (sn.o <= 0) return null;
        const heroSize = fitSize(st.text, W - 2 * M, 236);
        const heroS = heroSize / size;
        const slotY = top + i * row;
        const x = textX + (M - textX) * (1 - file);
        const y = slotY + (heroY - slotY) * (1 - file);
        const sc = heroS + (1 - heroS) * file;
        const col = interpolateColors(file, [0, 1], [RED, WHITE]);
        const num = span(t, (next ?? 1e9) + 0.1, 12);
        return (
          <div key={i}>
            <Spot x={M} y={slotY + 4} align="left" style={{ ...voice("tech", 38, 700), color: i === steps.length - 1 && !end ? MUTED : RED, opacity: num }}>
              {String(i + 1).padStart(2, "0")}
            </Spot>
            <Spot x={x} y={y + sn.y * size * sc} align="left" transform={`scale(${sc * (file > 0 ? 1 : sn.s)})`} style={{ ...voice("hit", size), color: col, opacity: sn.o }}>
              {st.text}
            </Spot>
          </div>
        );
      })}
    </>
  );
};

// ---------- NumberSlam ----------

export type NumberSlamProps = {
  value: number;
  // The spoken number: the count finishes here and the hit lands.
  at: number;
  from?: number;
  // Seconds of count-up before `at`; 0 slams the final value in from 170 %.
  count?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  size?: number;
  color?: string;
  accent?: string;
};

// A number scaled to fill the frame: counts up in tabular figures, then hits on the spoken word with a 6 f sine shake, an accent flip and outline shockwaves; the label rises 8 f later.
export const NumberSlam: FC<NumberSlamProps> = ({ value, at, from = 0, count = 0.8, decimals = 0, prefix = "", suffix = "", label, size = 540, color = WHITE, accent = RED }) => {
  const { t } = useTime();
  const counting = count > 0;
  const v = counting ? interpolate(t, [at - count, at], [from, value], { ...CLAMP, easing: EXPO }) : value;
  const txt = v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const enter = counting ? snap(t, at - count) : snap(t, at);
  const sl = counting ? { o: enter.o, s: 0.9 + 0.1 * enter.p } : { o: enter.o, s: 1.7 - 0.7 * enter.p };
  const u = (t - at) * FPS;
  const punch = counting ? (u < 0 ? 1 : u < 3 ? 1 + 0.08 * (u / 3) : interpolate(u, [3, 9], [1.08, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) })) : 1;
  const sh = shake(t, at, 30);
  const hit = t >= at;
  const body = (style: CSSProperties, extra = "") => (
    <Spot x={W / 2 + sh.x} y={470 + sh.y} transform={`scale(${sl.s * punch}) ${extra}`} style={{ ...voice("hit", size), fontVariantNumeric: "tabular-nums", letterSpacing: "-0.06em", ...style }}>
      {prefix && <span style={{ fontSize: "0.5em", verticalAlign: "0.62em", marginRight: "0.04em" }}>{prefix}</span>}
      {txt}
      {suffix && <span style={{ fontSize: "0.5em", verticalAlign: "0.62em", marginLeft: "0.04em" }}>{suffix}</span>}
    </Spot>
  );
  const waves = [0, 1].map((k) => {
    const p = interpolate(u, [k * 2, k * 2 + 14], [0, 1], { ...CLAMP, easing: EXPO });
    return p > 0 && p < 1 ? <div key={k}>{body({ color: "transparent", WebkitTextStroke: `3px ${accent}`, opacity: 0.6 * (1 - p) }, `scale(${1 + 0.32 * p})`)}</div> : null;
  });
  return (
    <>
      {waves}
      {body({ color: hit ? accent : color, opacity: sl.o })}
      {label && (
        <div style={{ position: "absolute", left: M, right: M, top: 820, textAlign: "center" }}>
          <MaskRise lines={[label]} at={at + 8 / FPS} by="words" style={{ ...voice("support", 58), color: WHITE }} />
        </div>
      )}
    </>
  );
};

// ---------- VersusSplit ----------

export type VersusSplitProps = {
  a: string;
  b: string;
  // Blocks arrive; words land on their spoken times.
  at: number;
  aAt: number;
  bAt: number;
  vsAt?: number;
  aSub?: string;
  bSub?: string;
  winner?: "a" | "b";
  winAt?: number;
  aBg?: Bg;
  bBg?: Bg;
};

// A vs B as two colour blocks split down the middle; on the verdict the winner's block shoves the split over, the winner punches into accent and the loser is struck through.
export const VersusSplit: FC<VersusSplitProps> = ({ a, b, at, aAt, bAt, vsAt, aSub, bSub, winner, winAt, aBg = "paper", bBg = "void" }) => {
  const { t } = useTime();
  const A = BLOCK[aBg];
  const B = BLOCK[bBg];
  const win = winner && winAt !== undefined ? interpolate(t, [winAt - 0.05, winAt + 0.35], [0, 1], { ...CLAMP, easing: SWAP }) : 0;
  const split = W / 2 + (winner === "a" ? 1 : -1) * 230 * win;
  const dropA = 1 - span(t, at, 10, EXPO, 0);
  const riseB = 1 - span(t, at + 2 / FPS, 10, EXPO, 0);
  const side = (word: string, sub: string | undefined, wAt: number, cx: number, width: number, ink: string, accent: string, muted: string, isWin: boolean, isLose: boolean) => {
    const sz = Math.min(230, (width - 2 * M + 40) / Math.max(1, word.length * 0.64));
    const sn = snap(t, wAt);
    const punch = isWin ? emph(t, winAt!, 1.18, 1.06) : 1;
    const lose = isLose ? win : 0;
    const strike = isLose && winAt !== undefined ? span(t, winAt + 0.2, 8, EXPO, 0) : 0;
    return (
      <>
        <Spot x={cx} y={500 + sn.y * sz} transform={`scale(${sn.s * punch * (1 - 0.18 * lose)})`} style={{ ...voice("hit", sz), color: isWin && win > 0 ? accent : interpolateColors(lose, [0, 1], [ink, muted]), opacity: sn.o }}>
          <span style={{ position: "relative" }}>
            {word}
            <span style={{ position: "absolute", left: "-4%", top: "50%", height: "0.1em", width: `${108 * strike}%`, background: accent, transform: "translateY(-50%)" }} />
          </span>
        </Spot>
        {sub && (
          <Spot x={cx} y={700} style={{ ...voice("support", 50), color: muted, opacity: span(t, wAt + 0.25, 10) }}>
            {sub}
          </Spot>
        )}
      </>
    );
  };
  const vs = vsAt === undefined ? 0 : snap(t, vsAt).s * (vsAt - 3 / FPS <= t ? 1 : 0);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: split, height: H, background: A.bg, transform: `translateY(${-dropA * H}px)` }} />
      <div style={{ position: "absolute", left: split, top: 0, right: 0, height: H, background: B.bg, transform: `translateY(${riseB * H}px)` }} />
      {side(a, aSub, aAt, split / 2, split, A.ink, A.accent, A.muted, winner === "a", winner === "b")}
      {side(b, bSub, bAt, split + (W - split) / 2, W - split, B.ink, B.accent, B.muted, winner === "b", winner === "a")}
      {vs > 0 && (
        <Spot x={split} y={530} transform={`scale(${vs})`} style={{ ...voice("emo", 170), color: RED }}>
          vs.
        </Spot>
      )}
    </AbsoluteFill>
  );
};

// ---------- PullQuote ----------

export type PullQuoteProps = {
  words: Spoken[];
  who?: string;
  source?: string;
  emphasis?: number[];
  size?: number;
  out?: number;
};

// A quote in the serif italic that lights up word by word as it's read, under a giant outline quote mark, with a mono attribution after the last word.
export const PullQuote: FC<PullQuoteProps> = ({ words, who, source, emphasis = [], size = 108, out }) => {
  const { t } = useTime();
  const first = words[0]?.start ?? 0;
  const last = words[words.length - 1]?.end ?? first;
  const gone = out === undefined ? 0 : exit(t, out, 8);
  const mark = span(t, first - 0.5, 18, EXPO, 0);
  return (
    <AbsoluteFill style={{ opacity: 1 - gone, transform: `translateY(${-gone * 60}px)` }}>
      <div style={{ position: "absolute", left: M - 40, top: -40, width: 760, overflow: "hidden", height: 520 }}>
        <div style={{ ...voice("emo", 1000), lineHeight: 1, color: "transparent", WebkitTextStroke: `3px ${RED}`, transform: `translateY(${(1 - mark) * 110}%)` }}>“</div>
      </div>
      <div style={{ position: "absolute", left: M + 150, right: M + 40, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 50 }}>
        <div style={{ ...voice("emo", size), lineHeight: 1.12, display: "flex", flexWrap: "wrap", columnGap: size * 0.24 }}>
          {words.map((w, i) => {
            const lit = interpolate(t, [first - 0.4, first - 0.2], [0, 0.15], CLAMP) + 0.85 * span(t, w.start, 6, Easing.linear, 0);
            return (
              <span key={i} style={{ opacity: lit, color: emphasis.includes(i) && t >= w.start ? RED : WHITE }}>
                {w.text}
              </span>
            );
          })}
        </div>
        {(who || source) && (
          <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: span(t, last + 0.25, 10) }}>
            <div style={{ width: 70 * span(t, last + 0.2, 10), height: 5, background: RED }} />
            <MaskRise lines={[[who, source].filter(Boolean).join("  ·  ")]} at={last + 0.25} by="chars" stagger={0.4} style={{ ...voice("tech", 32, 500), color: "#B4B4BE", letterSpacing: "0.06em" }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------- TypeBars ----------

export type TypeBar = { label: string; value: number; display?: string };

// A bar chart where each bar is a slab the height of a word: bars grow on their cue, the value rides the bar end, then the one that matters turns red and the rest dim.
export const TypeBars: FC<{ rows: TypeBar[]; at: number; highlight?: number; highlightAt?: number; max?: number; title?: string }> = ({ rows, at, highlight, highlightAt, max, title }) => {
  const { t } = useTime();
  const top = Math.max(...rows.map((r) => r.value), max ?? 0);
  const rowH = Math.min(150, 640 / rows.length);
  const y0 = H / 2 - ((rows.length - 1) * rowH) / 2 + (title ? 50 : 0);
  const barX = 640;
  const barMax = W - M - barX - 260;
  const dim = highlightAt === undefined ? 0 : span(t, highlightAt, 10, EXPO, 0);
  return (
    <>
      {title && (
        <Spot x={M} y={y0 - rowH / 2 - 70} align="left" style={{ ...voice("tech", 32, 700), color: MUTED, letterSpacing: "0.18em", opacity: span(t, at - 0.4, 10) }}>
          {title}
        </Spot>
      )}
      {rows.map((r, i) => {
        const y = y0 + i * rowH;
        const start = at + (i * 4) / FPS;
        const g = interpolate(t, [start, start + 24 / FPS], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
        const len = (r.value / top) * barMax * g;
        const isHi = i === highlight;
        const barCol = isHi ? interpolateColors(dim, [0, 1], [WHITE, RED]) : interpolateColors(dim, [0, 1], [WHITE, DIM]);
        const labCol = isHi ? WHITE : interpolateColors(dim, [0, 1], [WHITE, MUTED]);
        const sn = snap(t, start + 20 / FPS);
        const pop = isHi && highlightAt !== undefined ? emph(t, highlightAt, 1.25, 1.1) : 1;
        return (
          <div key={i}>
            <Spot x={barX - 40} y={y} align="right" style={{ ...voice("hit", 64, 800), color: labCol, opacity: span(t, start - 0.2, 8) }}>
              {r.label}
            </Spot>
            <div style={{ position: "absolute", left: barX, top: y - rowH * 0.3, width: len, height: rowH * 0.6, background: barCol }} />
            <Spot x={barX + len + 34} y={y + sn.y * 40} align="left" transform={`scale(${sn.s * pop})`} style={{ ...voice("hit", 76), color: isHi ? barCol : labCol, opacity: sn.o }}>
              {r.display ?? r.value.toLocaleString("en-US")}
            </Spot>
          </div>
        );
      })}
    </>
  );
};

// ---------- SourceTag ----------

// One line revealed by a block that sweeps across and retracts (8 f each way), leaving the text behind.
const BlockLine: FC<{ at: number; block: string; style: CSSProperties; text: string; out?: number }> = ({ at, block, style, text, out }) => {
  const { t } = useTime();
  const p1 = span(t, at, 8, Easing.inOut(Easing.cubic), 0);
  const p2 = span(t, at + 8 / FPS, 8, Easing.inOut(Easing.cubic), 0);
  const e = out === undefined ? 0 : exit(t, out, 8);
  if (p1 <= 0) return null;
  return (
    <div style={{ position: "relative", display: "inline-block", alignSelf: "flex-start", clipPath: `inset(-20% ${e * 100}% -20% -2%)`, ...style }}>
      <span style={{ opacity: p1 >= 1 ? 1 : 0 }}>{text}</span>
      <div style={{ position: "absolute", left: "-0.2em", right: "-0.2em", top: "-0.08em", bottom: "-0.08em", background: block, transformOrigin: p2 > 0 ? "100% 50%" : "0% 50%", transform: `scaleX(${p2 > 0 ? 1 - p2 : p1})` }} />
    </div>
  );
};

// A lower third or source label: a red square, the name or claim in heavy type and the source in mono, each wiped on by a block.
export const SourceTag: FC<{ title: string; source?: string; at: number; out?: number; x?: number; y?: number }> = ({ title, source, at, out, x = M, y = H - M - 120 }) => {
  const { t } = useTime();
  const sq = span(t, at - 0.1, 8, EXPO, 0) * (out === undefined ? 1 : 1 - exit(t, out + 0.1, 6));
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 26 }}>
      <div style={{ width: 22, height: 22, marginTop: 18, background: RED, transform: `scale(${sq})` }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BlockLine at={at} block={WHITE} text={title} out={out} style={{ ...voice("hit", 56, 800), letterSpacing: "-0.02em", color: WHITE }} />
        {source && <BlockLine at={at + 3 / FPS} block={RED} text={source} out={out} style={{ ...voice("tech", 30, 500), color: "#B4B4BE", fontFamily: MONO }} />}
      </div>
    </div>
  );
};

