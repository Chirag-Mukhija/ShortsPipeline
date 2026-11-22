// Poster type: squash-popping heavy headlines with full stops, body copy, a two-line wordmark, word-timed claims, the violet pill and the white speech bubble.
import type { CSSProperties, FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import { BODY, DISPLAY, INK, SIZE, VIOLET, WHITE, YELLOW } from "./theme";
import { ease, EXPO_OUT, pop, squashPop, wiggle } from "./motion";

const abs = (x: number, y: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: x, top: y, ...extra });

// "The System." block: each line drops and squashes (0.8 → 1.05 → 1) from its baseline, 0.1 s apart.
export const Headline: FC<{ lines: string[]; at: number; x: number; y: number; size?: number; color?: string; out?: number; align?: "left" | "center"; width?: number; lead?: number }> = ({
  lines, at, x, y, size = SIZE.headline, color = INK, out, align = "left", width = 1200, lead = 0.92,
}) => {
  const { t } = useTime();
  // Exit: slides up and away in-cubic, the board's section exit.
  const ex = out === undefined ? 0 : ease(t, out, 0.4, (v) => v * v * v);
  return (
    <div style={abs(x, y, { width, textAlign: align, transform: `translateY(${-ex * 160}px)`, opacity: 1 - ex })}>
      {lines.map((l, i) => {
        const s = squashPop(t, at + i * 0.1);
        return (
          <div key={i} style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: lead, letterSpacing: "-0.035em", color, opacity: s.o, transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`, transformOrigin: align === "left" ? "0% 100%" : "50% 100%", whiteSpace: "nowrap" }}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

// Body copy in Inter 500; `strong` spans go bold like the board's "a very special black and white screen".
export const Body: FC<{ children: ReactNode; at: number; x: number; y: number; width?: number; size?: number; color?: string; out?: number }> = ({ children, at, x, y, width = 720, size = SIZE.body, color = INK, out }) => {
  const { t } = useTime();
  const e = ease(t, at, 0.5, EXPO_OUT);
  const ex = out === undefined ? 0 : ease(t, out, 0.4, (v) => v * v * v);
  return (
    <div style={abs(x, y, { width, fontFamily: BODY, fontWeight: 500, fontSize: size, lineHeight: 1.32, color, opacity: e * (1 - ex), transform: `translateY(${(1 - e) * 24 - ex * 160}px)` })}>
      {children}
    </div>
  );
};

export const B: FC<{ children: ReactNode }> = ({ children }) => <b style={{ fontWeight: 700 }}>{children}</b>;

// The hero wordmark: two stacked lowercase lines, very tight leading, dropping in with squash.
export const Wordmark: FC<{ lines: [string, string]; at: number; x: number; y: number; size?: number; color?: string }> = ({ lines, at, x, y, size = SIZE.wordmark, color = YELLOW }) => {
  const { t } = useTime();
  return (
    <div style={abs(x, y, { transform: "translateX(-50%)", textAlign: "center" })}>
      {lines.map((l, i) => {
        const s = squashPop(t, at + i * 0.12, 160);
        return (
          <div key={i} style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.8, letterSpacing: "-0.055em", color, opacity: s.o, transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`, transformOrigin: "50% 100%", whiteSpace: "nowrap" }}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

// A claim whose words land on their spoken times; `key` words turn violet and the full stop punches in last.
export type ClaimWord = { w: string; t: number; key?: boolean; br?: boolean };
export const Claim: FC<{ words: ClaimWord[]; x: number; y: number; size?: number; width?: number; align?: "left" | "center" }> = ({ words, x, y, size = SIZE.claim, width = 1700, align = "left" }) => {
  const { t } = useTime();
  return (
    <div style={abs(x, y, { width, display: "flex", flexWrap: "wrap", justifyContent: align === "left" ? "flex-start" : "center", columnGap: size * 0.24, rowGap: size * 0.02 })}>
      {words.map((wd, i) => {
        const s = squashPop(t, wd.t - 0.1, 70);
        const nodes = [
          <span key={i} style={{ display: "inline-block", fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.035em", color: wd.key ? VIOLET : INK, opacity: s.o, transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`, transformOrigin: "50% 100%" }}>
            {wd.w}
          </span>,
        ];
        if (wd.br) nodes.push(<span key={`br${i}`} style={{ flexBasis: "100%", height: 0 }} />);
        return nodes;
      })}
    </div>
  );
};

// The violet pill with "!!" energy: pops 6 frames after its cue with back-out(1.8) and pulses on each time in `pulses`.
export const Pill: FC<{ text: string; at: number; x: number; y: number; size?: number; pulses?: number[]; bang?: string }> = ({ text, at, x, y, size = 48, pulses = [], bang = "!!" }) => {
  const { t } = useTime();
  const p = pop(t, at + 0.2, 0.42);
  const pulse = pulses.reduce((m, c) => (t >= c ? Math.max(m, Math.exp(-(t - c) / 0.18) * Math.sin(Math.min(Math.PI, (t - c) * 12))) : m), 0);
  if (p <= 0) return null;
  return (
    <div style={abs(x, y, { transform: `translate(-50%, -50%) scale(${p * (1 + 0.07 * pulse)})` })}>
      <div style={{ background: VIOLET, color: WHITE, fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", padding: `${size * 0.22}px ${size * 0.62}px ${size * 0.28}px`, borderRadius: 999, boxShadow: `0 ${size * 0.25}px ${size * 0.6}px rgba(17,17,17,0.22), inset 0 ${size * 0.08}px 0 rgba(255,255,255,0.25), inset 0 ${-size * 0.1}px 0 rgba(0,0,0,0.18)`, whiteSpace: "nowrap" }}>
        {text}
        <span style={{ display: "inline-block", transform: "skewX(-12deg)", marginLeft: size * 0.06 }}>{bang}</span>
      </div>
    </div>
  );
};

// White speech bubble anchored at its tail tip (x, y): pops from the tip with back-out, then wiggles ±1.5°.
export const Bubble: FC<{ children: ReactNode; at: number; x: number; y: number; width?: number; size?: number; tail?: "left" | "right"; out?: number; weight?: 500 | 800 }> = ({
  children, at, x, y, width = 560, size = 40, tail = "left", out, weight = 800,
}) => {
  const { t } = useTime();
  const p = pop(t, at, 0.42);
  const ex = out === undefined ? 0 : ease(t, out, 0.25, (v) => v * v);
  if (p <= 0 || ex >= 1) return null;
  const s = p * (1 - ex);
  const r = wiggle(t, 1.5, 2.3, at);
  const left = tail === "left";
  return (
    <div style={abs(x, y, { transform: `rotate(${r}deg) scale(${s})`, transformOrigin: "0 0" })}>
      <div style={{ position: "absolute", bottom: 26, [left ? "left" : "right"]: -40, width, background: WHITE, borderRadius: size * 0.6, padding: `${size * 0.5}px ${size * 0.7}px ${size * 0.56}px`, boxShadow: "0 22px 50px rgba(17,17,17,0.16)", fontFamily: weight === 800 ? DISPLAY : "inherit", fontWeight: weight, fontSize: size, lineHeight: 1.12, letterSpacing: weight === 800 ? "-0.02em" : 0, color: INK }}>
        {children}
      </div>
      <svg width={80} height={60} viewBox="0 0 80 60" style={{ position: "absolute", left: left ? -2 : -78, top: -60, overflow: "visible" }}>
        <path d={left ? "M2 58 C 18 40 22 26 20 2 L 62 2 C 52 24 36 44 2 58 Z" : "M78 58 C 62 40 58 26 60 2 L 18 2 C 28 24 44 44 78 58 Z"} fill={WHITE} />
      </svg>
    </div>
  );
};
