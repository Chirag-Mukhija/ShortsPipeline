// ASCII/dither primitives: the glyph-field ground with idle life, decode-on text (mono noise settling into letters), the serif headline, mono labels, the tiny OS window and the scan bar.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { hash, noiseField, type Field } from "./field";
import { GlyphCanvas } from "./grid";
import { scanX } from "./fx";
import { GROUND, MONO, NOISE, RED, SERIF, type Ground } from "./theme";

// The ground: flat paper (or black) under a barely-there drift of "." and ":" so a hold never freezes.
export const GlyphGround: FC<{ ground?: Ground; amount?: number }> = ({ ground = "paper", amount = 1 }) => {
  const { t } = useTime();
  const g = GROUND[ground];
  const base = noiseField(260, 3, -0.25, 0.42);
  const field: Field = (x, y) => base(x + t * 14, y - t * 6) * amount;
  return (
    <AbsoluteFill style={{ background: g.bg }}>
      <GlyphCanvas field={field} ink={g.faint} flicker={0.03} shimmer={0} seed={77} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${ground === "paper" ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.5)"} 100%)` }} />
    </AbsoluteFill>
  );
};

// ---------- decode text ----------
// Each letter shows mono noise from `at + k·stagger·0.4` and locks to its real form at `at + k·stagger + lock`; the real letter holds the width, so nothing jitters.
export const Decode: FC<{ text: string; at: number; stagger?: number; lock?: number; color?: string; noiseColor?: string; seed?: number; style?: CSSProperties }> = ({
  text, at, stagger = 0.03, lock = 0.2, color, noiseColor, seed = 0, style,
}) => {
  const { t, f } = useTime();
  const step = Math.floor(f / 2.5);
  return (
    <span style={{ whiteSpace: "pre", color, ...style }}>
      {[...text].map((ch, k) => {
        const show = at + k * stagger * 0.4;
        const done = at + k * stagger + lock;
        if (ch === " " || t >= done) return <span key={k}>{ch}</span>;
        const n = NOISE[Math.floor(hash(k, step, seed + 5) * NOISE.length)];
        return (
          <span key={k} style={{ position: "relative", color: "transparent" }}>
            {ch}
            {t >= show && <span style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: MONO, fontWeight: 400, color: noiseColor ?? color, opacity: 0.85 }}>{n}</span>}
          </span>
        );
      })}
    </span>
  );
};

export type Word = { w: string; t: number; accent?: boolean };

// The human headline over the glyph picture: big Newsreader, each word decoding on its spoken time; one accent word at most.
export const Headline: FC<{ words: Word[]; x?: number; y?: number; size?: number; maxWidth?: number; ground?: Ground; align?: "left" | "center"; weight?: number; style?: CSSProperties }> = ({
  words, x = 96, y = 760, size = 112, maxWidth = 1500, ground = "paper", align = "left", weight = 400, style,
}) => {
  const g = GROUND[ground];
  return (
    <div style={{ position: "absolute", left: align === "center" ? 0 : x, right: align === "center" ? 0 : undefined, top: y, width: align === "center" ? undefined : maxWidth, textAlign: align, fontFamily: SERIF, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.015, color: g.ink, ...style }}>
      {words.map((wd, k) => (
        <span key={k}>
          <Decode text={wd.w} at={wd.t} stagger={0.025} lock={0.15} color={wd.accent ? RED : g.ink} noiseColor={wd.accent ? RED : g.soft} seed={k * 13} style={wd.accent ? { fontStyle: "italic" } : undefined} />
          {k < words.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

// Small mono caption (file names, dimensions, counters); never under 28 px.
export const Mono: FC<{ children: ReactNode; size?: number; color?: string; style?: CSSProperties }> = ({ children, size = 30, color, style }) => (
  <span style={{ fontFamily: MONO, fontSize: Math.max(28, size), letterSpacing: 0.5, color, whiteSpace: "pre", ...style }}>{children}</span>
);

// A tiny OS window around a glyph picture: hairline frame, title bar with the file name and the grid size; opens by drawing its frame from the centre.
export const MonoWindow: FC<{ x: number; y: number; w: number; h: number; title: string; meta?: string; at?: number; ground?: Ground; children?: ReactNode }> = ({
  x, y, w, h, title, meta, at = 0, ground = "paper", children,
}) => {
  const { t } = useTime();
  const g = GROUND[ground];
  // Opens in stepped 2-frame increments: a 12 fps snap, like an old window manager.
  const k = Math.min(1, Math.floor(Math.max(0, t - at) * 15) / 6);
  if (k <= 0) return null;
  const ww = w * (0.2 + 0.8 * k);
  const hh = h * k;
  const bar = 52;
  return (
    <div style={{ position: "absolute", left: x + (w - ww) / 2, top: y + (h - hh) / 2, width: ww, height: hh, border: `2px solid ${g.ink}`, background: g.bg, overflow: "hidden", boxShadow: ground === "paper" ? `8px 8px 0 ${g.faint}` : "none" }}>
      <div style={{ height: bar, borderBottom: `2px solid ${g.ink}`, display: "flex", alignItems: "center", gap: 14, padding: "0 18px", background: g.bg }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, border: `2px solid ${g.ink}`, background: i === 0 ? g.ink : "transparent" }} />)}
        <Mono color={g.ink} style={{ marginLeft: 10, opacity: k >= 1 ? 1 : 0 }}>{title}</Mono>
        <div style={{ flex: 1 }} />
        {meta && <Mono color={g.soft} style={{ opacity: k >= 1 ? 1 : 0 }}>{meta}</Mono>}
      </div>
      {k >= 1 && <div style={{ position: "absolute", left: 0, top: bar + 2, right: 0, bottom: 0 }}>{children}</div>}
    </div>
  );
};

// The 2 px accent bar that sweeps across with scan(): put it over the same box.
export const ScanLine: FC<{ at: number; x?: number; y?: number; w?: number; h?: number; dur?: number; color?: string; dir?: 1 | -1 }> = ({ at, x = 0, y = 0, w = W, h = H, dur, color = RED, dir = 1 }) => {
  const { t } = useTime();
  const raw = scanX(t, at, w, dur);
  if (raw <= -12 || raw >= w + 12) return null;
  const bx = dir === -1 ? w - raw : raw;
  return <div style={{ position: "absolute", left: x + bx - 1, top: y, width: 2, height: h, background: color, boxShadow: `0 0 18px ${color}` }} />;
};
