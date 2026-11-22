// Theme-free text in motion: the 8 entry doors and the fast exit for any line, one-per-video emphasis forms, slam, count-up and word-timed captions.
import { useMemo, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, random } from "remotion";
import { evolvePath } from "@remotion/paths";
import { clamp01, useTime, type Ease } from "./time";
import type { NarrationWord } from "./cues";

const lin = (t: number, a: number, d: number) => (d <= 0 ? (t >= a ? 1 : 0) : clamp01((t - a) / d));
const EXPO_OUT = Easing.out(Easing.exp);
const QUART_OUT = Easing.out(Easing.poly(4));

// Sentence case by default: only the first letter is raised, so acronyms and names inside the line survive.
export type TextCase = "sentence" | "as-is" | "upper";
export const applyCase = (s: string, c: TextCase = "sentence") => (c === "upper" ? s.toUpperCase() : c === "sentence" ? s.replace(/\p{L}/u, (m) => m.toUpperCase()) : s);

// Theme fonts plug in here: family, size, weight, tracking, line height.
export const DEFAULT_FONT: CSSProperties = { fontSize: 92, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.08 };

// ---------- Emphasis ----------

export type EmphasisKind = "highlight" | "pill" | "underline" | "colour" | "weight" | "circle" | "box" | "strike" | "none";
export type EmphasisSpec = { kind: EmphasisKind; at: number; color?: string; ink?: string; dur?: number; weight?: [number, number] };

// Hand-drawn loop around a word (a little over one turn, open at the end) in a 100×100 box; box is a plain rectangle.
const LOOP = "M 8 58 C 6 26 40 6 66 10 C 92 14 100 40 94 62 C 88 86 54 96 30 90 C 8 84 2 64 10 44 C 16 30 30 20 48 16";
const BOX = "M 2 2 L 98 2 L 98 98 L 2 98 Z";

// The one emphasis form of a video, drawn AFTER the words have landed (`at` = land time + 0.4–0.6 s).
export const Emphasis: FC<EmphasisSpec & { children: ReactNode }> = ({ kind, at, color = "#FFD84D", ink = "#111111", dur = 0.45, weight = [500, 800], children }) => {
  const { t } = useTime();
  const e = Easing.inOut(Easing.cubic)(lin(t, at, dur));
  const wrap: CSSProperties = { position: "relative", display: "inline-block", isolation: "isolate" };
  const block = (s: CSSProperties): CSSProperties => ({ position: "absolute", zIndex: -1, transformOrigin: "0% 50%", transform: `scaleX(${e})`, ...s });
  const draw = (d: string, inset: string, sw: number) => {
    const ev = evolvePath(e, d);
    return (
      <span style={{ position: "absolute", inset, pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
          <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={e > 0 ? 1 : 0} />
        </svg>
      </span>
    );
  };
  switch (kind) {
    case "highlight":
      return <span style={wrap}>{children}<span style={block({ left: "-0.08em", right: "-0.08em", top: "0.22em", bottom: "0.02em", background: color, opacity: 0.85, borderRadius: "0.08em", rotate: "-1.2deg" })} /></span>;
    case "pill":
      return <span style={{ ...wrap, color: e > 0.55 ? ink : undefined }}><span style={block({ left: "-0.09em", right: "-0.09em", top: "0.06em", bottom: "-0.04em", background: color, borderRadius: "0.16em" })} />{children}</span>;
    case "underline":
      return <span style={wrap}>{children}<span style={block({ left: 0, right: 0, bottom: "0.02em", height: "0.09em", background: color, borderRadius: "0.05em", zIndex: 0 })} /></span>;
    case "strike":
      return <span style={{ ...wrap, opacity: 1 - 0.35 * e }}>{children}<span style={block({ left: "-0.04em", right: "-0.04em", top: "0.56em", height: "0.08em", background: color, zIndex: 0 })} /></span>;
    case "colour":
      return <span style={{ ...wrap, color: `color-mix(in srgb, ${color} ${e * 100}%, currentColor)` }}>{children}</span>;
    case "weight":
      return <span style={{ ...wrap, fontWeight: weight[0] + (weight[1] - weight[0]) * e }}>{children}</span>;
    case "circle":
      return <span style={wrap}>{children}{draw(LOOP, "-0.32em -0.3em -0.22em -0.3em", 7)}</span>;
    case "box":
      return <span style={wrap}>{children}{draw(BOX, "-0.06em -0.14em -0.02em -0.14em", 5)}</span>;
    case "none":
      return <span style={wrap}>{children}</span>;
  }
};

// ---------- Doors ----------

// rise: chars up with a vertical stretch · mask: words slot up from under their baseline · words: per-word stagger · depth: chars from scale 2.4, centre first
// typed: index tween with cursor · blur: the line racks into focus · slide: words from an axis (`from`) · split: top and bottom halves slide in from opposite sides.
export type Door = "rise" | "mask" | "words" | "depth" | "typed" | "blur" | "slide" | "split";
export type Axis = "left" | "right" | "up" | "down";

// Default length (s) and per-unit stagger (s) per door, from the direction draft (5.3).
export const DOORS: Record<Door, { dur: number; stagger: number; unit: "char" | "word" | "line" }> = {
  rise: { dur: 0.8, stagger: 0.024, unit: "char" },
  mask: { dur: 0.55, stagger: 0.07, unit: "word" },
  words: { dur: 0.6, stagger: 0.09, unit: "word" },
  depth: { dur: 0.9, stagger: 0.025, unit: "char" },
  typed: { dur: 0, stagger: 1 / 26, unit: "char" },
  blur: { dur: 1.0, stagger: 0, unit: "line" },
  slide: { dur: 0.75, stagger: 0.04, unit: "word" },
  split: { dur: 0.8, stagger: 0, unit: "line" },
};

export type LineProps = {
  text: string;
  at: number;
  door?: Door;
  // slide only: the side the words come from.
  from?: Axis;
  font?: CSSProperties;
  color?: string;
  align?: "left" | "center" | "right";
  case?: TextCase;
  dur?: number;
  stagger?: number;
  // Exit start (s): fast, up, blurred, 0.4 s; exits are always quicker than entries.
  out?: number;
  outDur?: number;
  // Words wrapped in *asterisks* get this emphasis.
  emphasis?: EmphasisSpec;
  cursor?: boolean;
  style?: CSSProperties;
};

type Tok = { w: string; em: boolean };
const tokens = (s: string): Tok[] => s.split("*").flatMap((part, i) => part.split(/\s+/).filter(Boolean).map((w) => ({ w, em: i % 2 === 1 })));

const AXIS: Record<Axis, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

// Style of one unit (char or word, index i of n) for an entering door at local time u.
const enter = (door: Door, u: number, i: number, n: number, dur: number, st: number, from: Axis): CSSProperties => {
  switch (door) {
    case "rise": {
      const r = lin(u, i * st, dur);
      const e = QUART_OUT(r);
      return { opacity: lin(r, 0, 0.35), transform: `translateY(${0.6 * (1 - e)}em) scaleY(${1 + 0.45 * (1 - e)})`, transformOrigin: "50% 100%", filter: e < 0.99 ? `blur(${10 * (1 - e)}px)` : undefined };
    }
    case "mask": {
      const e = EXPO_OUT(lin(u, i * st, dur));
      return { transform: `translateY(${115 * (1 - e)}%)` };
    }
    case "words": {
      const r = lin(u, i * st, dur);
      const e = QUART_OUT(r);
      return { opacity: lin(r, 0, 0.4), transform: `translateY(${0.55 * (1 - e)}em) scaleY(${1 + 0.3 * (1 - e)})`, transformOrigin: "50% 100%", filter: e < 0.99 ? `blur(${8 * (1 - e)}px)` : undefined };
    }
    case "depth": {
      const r = lin(u, Math.abs(i - (n - 1) / 2) * st, dur);
      const e = EXPO_OUT(r);
      return { opacity: lin(r, 0, 0.3), transform: `scale(${2.4 - 1.4 * e})`, filter: e < 0.99 ? `blur(${14 * (1 - e)}px)` : undefined };
    }
    case "slide": {
      const r = lin(u, i * st, dur);
      const e = QUART_OUT(r);
      const [dx, dy] = AXIS[from];
      return { opacity: lin(r, 0, 0.4), transform: `translate(${dx * 2.4 * (1 - e)}em, ${dy * 1.2 * (1 - e)}em)`, filter: e < 0.99 ? `blur(${14 * (1 - e)}px)` : undefined };
    }
    case "typed":
      return { visibility: u >= i * st ? "visible" : "hidden" };
    default:
      return {};
  }
};

const exitStyle = (u: number, i: number, dur: number): CSSProperties => {
  if (u < 0) return {};
  const e = Easing.in(Easing.quad)(lin(u, i * 0.012, dur));
  return { opacity: 1 - e, transform: `translateY(${-0.7 * e}em)`, filter: e > 0.01 ? `blur(${16 * e}px)` : undefined };
};

const join = (a: CSSProperties, b: CSSProperties): CSSProperties => ({
  ...a,
  ...b,
  opacity: (a.opacity === undefined ? 1 : Number(a.opacity)) * (b.opacity === undefined ? 1 : Number(b.opacity)),
  transform: [a.transform, b.transform].filter(Boolean).join(" ") || undefined,
  filter: [a.filter, b.filter].filter(Boolean).join(" ") || undefined,
});

// One sentence with an entry door, an optional *emphasis*, and an exit. Words wrap normally; each word stays unbroken.
export const Line: FC<LineProps> = ({ text, at, door = "rise", from = "left", font, color, align = "left", case: tc = "sentence", dur, stagger, out, outDur = 0.4, emphasis, cursor = true, style }) => {
  const { t } = useTime();
  const spec = DOORS[door];
  const d = dur ?? spec.dur;
  const st = stagger ?? spec.stagger;
  const toks = useMemo(() => {
    const tk = tokens(text);
    if (tk[0]) tk[0] = { ...tk[0], w: applyCase(tk[0].w, tc) };
    return tc === "upper" ? tk.map((x) => ({ ...x, w: x.w.toUpperCase() })) : tk;
  }, [text, tc]);
  const u = t - at;
  const uo = out === undefined ? -1 : t - out;
  const nChars = toks.reduce((s, x) => s + [...x.w].length, 0);
  const typedCount = door === "typed" ? Math.floor(Math.max(0, u) / st) : 0;
  const box: CSSProperties = { ...DEFAULT_FONT, ...font, color, textAlign: align, position: "relative", margin: 0, ...style };

  const words = (variant: "main" | "copy"): ReactNode[] => {
    let ci = 0;
    const nodes: ReactNode[] = [];
    let group: ReactNode[] = [];
    const flush = (key: string) => {
      if (!group.length) return;
      nodes.push(emphasis ? <Emphasis key={key} {...emphasis}>{group}</Emphasis> : <span key={key}>{group}</span>);
      group = [];
    };
    toks.forEach((tk, wi) => {
      const chars = [...tk.w];
      let inner: ReactNode;
      if (spec.unit === "char") {
        inner = chars.map((c, k) => {
          const gi = ci + k;
          const s = join(enter(door, u, gi, nChars, d, st, from), exitStyle(uo, gi, outDur));
          const isCursor = door === "typed" && cursor && gi === Math.min(typedCount, nChars) - 1;
          return (
            <span key={k} style={{ display: "inline-block", whiteSpace: "pre", ...s }}>
              {c}
              {isCursor ? <Cursor t={t} typing={typedCount < nChars} /> : null}
            </span>
          );
        });
      } else if (spec.unit === "word") {
        const s = join(enter(door, u, wi, toks.length, d, st, from), exitStyle(uo, wi, outDur));
        inner = door === "mask" ? (
          <span style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.14em", marginBottom: "-0.14em", verticalAlign: "top" }}>
            <span style={{ display: "inline-block", ...s }}>{tk.w}</span>
          </span>
        ) : (
          <span style={{ display: "inline-block", ...s }}>{tk.w}</span>
        );
      } else {
        inner = tk.w;
      }
      ci += chars.length;
      const word = <span key={`w${wi}`} style={{ display: "inline-block", whiteSpace: "nowrap" }}>{inner}</span>;
      const next = toks[wi + 1];
      if (tk.em) {
        group.push(word);
        if (next?.em) {
          group.push(" ");
          return;
        }
        flush(`e${wi}${variant}`);
      } else nodes.push(word);
      if (next) nodes.push(" ");
    });
    flush("end");
    return nodes;
  };

  if (door === "blur") {
    const r = lin(u, 0, d);
    const e = Easing.out(Easing.cubic)(r);
    const s = join({ opacity: lin(r, 0, 0.5), transform: `scale(${1.06 - 0.06 * e})`, filter: e < 0.99 ? `blur(${26 * (1 - e)}px)` : undefined, letterSpacing: `calc(${String(font?.letterSpacing ?? DEFAULT_FONT.letterSpacing)} + ${0.08 * (1 - e)}em)` }, exitStyle(uo, 0, outDur));
    return <div style={{ ...box, ...s }}>{words("main")}</div>;
  }
  if (door === "split") {
    const r = lin(u, 0, d);
    const e = EXPO_OUT(r);
    const ex = exitStyle(uo, 0, outDur);
    const half = (top: boolean): CSSProperties =>
      join({ clipPath: top ? "inset(-20% -5% 50% -5%)" : "inset(50% -5% -20% -5%)", opacity: lin(r, 0, 0.25), transform: `translateX(${(top ? -1 : 1) * 1.6 * (1 - e)}em)`, filter: e < 0.98 ? `blur(${6 * (1 - e)}px)` : undefined }, ex);
    return (
      <div style={box}>
        <div style={half(true)}>{words("main")}</div>
        <div style={{ position: "absolute", inset: 0, ...half(false) }}>{words("copy")}</div>
      </div>
    );
  }
  return <div style={box}>{words("main")}</div>;
};

// Typing cursor: solid while typing, 2 Hz blink after. Zero-width so it never shifts the layout.
const Cursor: FC<{ t: number; typing: boolean }> = ({ t, typing }) => (
  <span style={{ display: "inline-block", width: 0, position: "relative" }}>
    <span style={{ position: "absolute", left: "0.06em", top: "0.12em", width: "0.07em", height: "0.9em", background: "currentColor", opacity: typing || Math.floor(t * 4) % 2 === 0 ? 1 : 0 }} />
  </span>
);

// ---------- Slam ----------

// Impact word: scale from `from` (1.7) to 1 on an under-damped spring (~8 % undershoot, settles in ~0.35 s), a seeded shake and an expanding shock ring.
export const Slam: FC<{ text: string; at: number; font?: CSSProperties; color?: string; ring?: string | false; shake?: number; from?: number; tilt?: number; case?: TextCase; seed?: number; style?: CSSProperties }> = ({
  text, at, font, color, ring = false, shake = 14, from = 1.7, tilt = 0, case: tc = "sentence", seed = 3, style,
}) => {
  const { t } = useTime();
  const u = t - at;
  if (u < 0) return <div style={{ ...DEFAULT_FONT, ...font, ...style, visibility: "hidden" }}>{applyCase(text, tc)}</div>;
  const s = 1 + (from - 1) * Math.exp(-10 * u) * Math.cos(2 * Math.PI * 2.2 * u);
  const k = Math.exp(-u / 0.09);
  const ph = random(`slam-${seed}`) * 6.28;
  const jx = shake * k * Math.sin(u * 90 + ph);
  const jy = shake * k * Math.cos(u * 77 + ph * 2);
  const rp = EXPO_OUT(lin(u, 0, 0.55));
  return (
    <div style={{ ...DEFAULT_FONT, ...font, color, position: "relative", display: "inline-block", ...style }}>
      {ring ? <span style={{ position: "absolute", left: "50%", top: "50%", width: "1.6em", height: "1.6em", marginLeft: "-0.8em", marginTop: "-0.8em", borderRadius: "50%", border: `${0.06 * (1 - rp)}em solid ${ring}`, transform: `scale(${0.6 + 2.6 * rp})`, opacity: 1 - rp, zIndex: -1 }} /> : null}
      <span style={{ display: "inline-block", opacity: lin(u, 0, 0.06), transform: `translate(${jx}px, ${jy}px) rotate(${tilt}deg) scale(${s})` }}>{applyCase(text, tc)}</span>
    </div>
  );
};

// Full-frame flash for a slam or a hard hit: peaks at `at`, gone in ~0.15 s. Put it above the scene.
export const SlamFlash: FC<{ at: number; color?: string; strength?: number }> = ({ at, color = "#ffffff", strength = 0.45 }) => {
  const { t } = useTime();
  const u = t - at;
  if (u < 0 || u > 0.3) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: strength * Math.exp(-u / 0.05), pointerEvents: "none" }} />;
};

// ---------- CountUp ----------

const formatNum = (v: number, decimals: number, group: boolean) => {
  const [i, f] = Math.abs(v).toFixed(decimals).split(".");
  const int = group ? i!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : i!;
  return `${v < 0 ? "-" : ""}${int}${f ? `.${f}` : ""}`;
};

// A number that counts and lands EXACTLY on `to` at `land` (the spoken word); digits sit in fixed 1ch cells so nothing jitters, the box is sized to the final value.
export const CountUp: FC<{ to: number; land: number; from?: number; dur?: number; decimals?: number; group?: boolean; prefix?: string; suffix?: string; font?: CSSProperties; color?: string; ease?: Ease; pop?: boolean; affixStyle?: CSSProperties; style?: CSSProperties }> = ({
  to, land, from = 0, dur = 1.2, decimals = 0, group = true, prefix = "", suffix = "", font, color, ease = Easing.out(Easing.poly(3)), pop = true, affixStyle, style,
}) => {
  const { t } = useTime();
  const r = lin(t, land - dur, dur);
  const v = r >= 1 ? to : from + (to - from) * ease(r);
  const s = formatNum(v, decimals, group);
  const finalLen = formatNum(to, decimals, group).length;
  const k = pop ? Math.exp(-Math.max(0, t - land) / 0.08) * (t >= land ? 1 : 0) : 0;
  return (
    <div style={{ ...DEFAULT_FONT, ...font, color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", display: "inline-block", transform: `scale(${1 + 0.06 * k})`, ...style }}>
      {prefix ? <span style={affixStyle}>{prefix}</span> : null}
      <span style={{ display: "inline-block", minWidth: `${finalLen}ch`, textAlign: "right" }}>
        {[...s].map((c, i) => (
          <span key={i} style={/\d/.test(c) ? { display: "inline-block", width: "1ch", textAlign: "center" } : undefined}>{c}</span>
        ))}
      </span>
      {suffix ? <span style={affixStyle}>{suffix}</span> : null}
    </div>
  );
};

// ---------- Caption ----------

// 2–6 word chunks: break after sentence punctuation, after a comma once the chunk has `min` words, at a pause longer than `gap`, or at `max`.
export const chunkWords = (words: NarrationWord[], { min = 2, max = 6, gap = 0.35 }: { min?: number; max?: number; gap?: number } = {}) => {
  const chunks: NarrationWord[][] = [];
  let cur: NarrationWord[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const endSentence = /[.?!]["')]*$/.test(w.text);
    const soft = /[,;:—–-]["')]*$/.test(w.text) && cur.length >= min;
    const pause = next ? next.start - w.end > gap && cur.length >= min : false;
    if (!next || endSentence || soft || pause || cur.length >= max) {
      chunks.push(cur);
      cur = [];
    }
  });
  // A lone word that isn't its own sentence joins the chunk before it.
  return chunks.reduce<NarrationWord[][]>((acc, c) => {
    const prev = acc[acc.length - 1];
    if (c.length === 1 && prev && prev.length < max && !/[.?!]$/.test(prev[prev.length - 1]!.text)) prev.push(c[0]!);
    else acc.push(c);
    return acc;
  }, []);
};

// Word-timed caption pill: the current chunk, spoken words full ink, the word being said in the accent with a small lift, upcoming words faint.
// `y` is the pill's vertical centre in px (default 85 % of a 1080 frame).
export const Caption: FC<{ words: NarrationWord[]; font?: CSSProperties; y?: number; min?: number; max?: number; pill?: string; ink?: string; accent?: string; upcoming?: number; linger?: number; style?: CSSProperties }> = ({
  words, font, y = 918, min = 2, max = 6, pill = "#ffffff", ink = "#111111", accent = "#E8553A", upcoming = 0.32, linger = 0.5, style,
}) => {
  const { t } = useTime();
  const chunks = useMemo(() => chunkWords(words, { min, max }), [words, min, max]);
  // Picture early: each chunk shows 2 frames before its first word.
  const lead = 0.07;
  let ci = -1;
  for (let i = 0; i < chunks.length; i++) if (t >= chunks[i]![0]!.start - lead) ci = i;
  const chunk = chunks[ci];
  if (!chunk) return null;
  const last = chunk[chunk.length - 1]!;
  const nextStart = chunks[ci + 1]?.[0]?.start ?? Infinity;
  if (t > Math.min(last.end + linger, nextStart)) return null;
  const u = t - (chunk[0]!.start - lead);
  const e = Easing.out(Easing.back(1.6))(lin(u, 0, 0.2));
  const fadeOut = 1 - lin(t, last.end + linger - 0.15, 0.15);
  let cur = -1;
  chunk.forEach((w, i) => { if (t >= w.start - 0.03) cur = i; });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <div style={{ ...DEFAULT_FONT, fontSize: 54, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.15, ...font, background: pill, color: ink, padding: "0.32em 0.62em 0.36em", borderRadius: "0.5em", boxShadow: "0 14px 40px rgba(0,0,0,0.28)", opacity: lin(u, 0, 0.1) * fadeOut, transform: `translateY(${14 * (1 - e)}px) scale(${0.94 + 0.06 * e})`, maxWidth: 1500, textAlign: "center", ...style }}>
        {chunk.map((w, i) => {
          const isCur = i === cur;
          const lift = isCur ? Easing.out(Easing.cubic)(lin(t, w.start - 0.03, 0.12)) : 0;
          return (
            <span key={i}>
              <span style={{ display: "inline-block", color: isCur ? accent : undefined, opacity: i <= cur ? 1 : upcoming, transform: `translateY(${-4 * lift}px) scale(${1 + 0.05 * lift})` }}>{w.text}</span>
              {i < chunk.length - 1 ? " " : null}
            </span>
          );
        })}
      </div>
    </div>
  );
};
