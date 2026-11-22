// Code-explainer primitives: the editor-dark background with idle life, window chrome, the blinking caret, token rendering, chips and the typewriter clock.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { H, W } from "../../core/video";
import { clamp01, ramp, useTime } from "../../core/time";
import { BG, BORDER, CH, MONO, MUTED, ORANGE, PANEL, PANEL_HI, TEXT, caretOn, fr, rng, SNAP } from "./theme";
import type { Tok } from "./syntax";

// Characters typed by time t for a typewriter that starts at `at` (s) and runs at cps.
export const typed = (t: number, at: number, cps = 50) => Math.max(0, Math.floor((t - at) * cps));
// When a typewriter of `chars` characters finishes.
export const typedEnd = (at: number, chars: number, cps = 50) => at + chars / cps;

const LOG = [
  "[vite] hmr update /src/App.tsx",
  "GET /api/users 200 12ms",
  "ok compiled in 182ms",
  "[tsc] watching for file changes",
  "POST /api/chat 200 941ms",
  "warn  deprecated: punycode",
  "ok 42 modules transformed",
  "GET /favicon.ico 304 2ms",
  "[worker] job 7f3a done",
  "info  ready on :5173",
];

// The editor-dark ground: a soft centre glow, a vignette, 1 px scanlines with a slow shimmer band, and a dim server log scrolling at the far right edge.
export const EditorBg: FC = () => {
  const { f } = useTime();
  const band = ((f * 3) % (H + 400)) - 200;
  // The log scrolls one line every 12 frames, stepped like a real tail -f.
  const step = Math.floor(f / 12);
  const lines = Array.from({ length: 30 }, (_, i) => LOG[(i + step) % LOG.length]!);
  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 42%, #152033 0%, rgba(13,17,23,0) 70%)" }} />
      <div style={{ position: "absolute", right: 28, top: -10,width: 420, fontFamily: MONO, fontSize: 22, lineHeight: "38px", color: TEXT, opacity: 0.04, textAlign: "right", whiteSpace: "pre", maskImage: "linear-gradient(90deg, transparent 0%, #000 60%)" }}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: band, height: 200, background: "linear-gradient(180deg, transparent, rgba(88,166,255,0.035), transparent)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// Absolute box in canvas pixels.
export const Box: FC<{ x: number; y: number; w?: number; h?: number; style?: CSSProperties; children?: ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>
);

// The blinking block caret; solid while `typing`.
export const Caret: FC<{ size: number; typing?: boolean; color?: string; block?: boolean }> = ({ size, typing, color = ORANGE, block }) => {
  const { f } = useTime();
  const on = typing || caretOn(f);
  return (
    <span
      style={{
        display: "inline-block",
        width: block ? size * CH : Math.max(3, size * 0.09),
        height: size * 1.15,
        marginLeft: 2,
        verticalAlign: "-0.2em",
        backgroundColor: color,
        opacity: on ? 1 : 0,
        boxShadow: on ? `0 0 ${size * 0.4}px ${color}88` : undefined,
      }}
    />
  );
};

export const Toks: FC<{ toks: Tok[] }> = ({ toks }) => (
  <>
    {toks.map((tk, i) => (
      <span key={i} style={{ color: tk.c }}>
        {tk.s}
      </span>
    ))}
  </>
);

// macOS-style window chrome: three dots, a file tab and a dark body. `enter` slides it up 40 px with a snap; `exit` slides it out in 8 frames.
export const Win: FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  enter?: number;
  exit?: number;
  glow?: string;
  dim?: number;
  children?: ReactNode;
  bodyStyle?: CSSProperties;
}> = ({ x, y, w, h, title, enter, exit, glow, dim = 0, children, bodyStyle }) => {
  const { t } = useTime();
  const e = enter === undefined ? 1 : ramp(t, enter, fr(10), SNAP);
  const o = exit === undefined ? 0 : ramp(t, exit, fr(8), SNAP);
  if (e <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translate(${o * 120}px, ${(1 - e) * 40}px)`,
        opacity: clamp01(e * 2) * (1 - o),
        filter: dim > 0 ? `saturate(${1 - 0.7 * dim})` : undefined,
        borderRadius: 16,
        backgroundColor: PANEL,
        border: `1.5px solid ${glow ?? BORDER}`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.55)${glow ? `, 0 0 40px ${glow}55` : ""}`,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 58, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", backgroundColor: PANEL_HI, borderBottom: `1.5px solid ${BORDER}` }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: c }} />
        ))}
        {title && <div style={{ marginLeft: 18, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED }}>{title}</div>}
      </div>
      <div style={{ position: "relative", height: h - 58, overflow: "hidden", ...bodyStyle }}>{children}</div>
      {/* Dimming is a scrim, not transparency, so the background never shows through a panel. */}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, backgroundColor: BG, opacity: dim * 0.55 }} />}
    </div>
  );
};

// A two-part pill like "TPS | On Fire": a dark key and a coloured value.
export const Chip: FC<{ k: string; v?: string; color?: string; size?: number }> = ({ k, v, color = ORANGE, size = 30 }) => (
  <span style={{ display: "inline-flex", fontFamily: MONO, fontWeight: 700, fontSize: size, lineHeight: 1, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${BORDER}` }}>
    <span style={{ padding: `${size * 0.32}px ${size * 0.45}px`, backgroundColor: PANEL_HI, color: TEXT }}>{k}</span>
    {v && <span style={{ padding: `${size * 0.32}px ${size * 0.45}px`, backgroundColor: color, color: BG }}>{v}</span>}
  </span>
);

// A drawn tool logo: a rounded square with a one- or two-letter monogram, since real logos aren't bundled.
export const Monogram: FC<{ text: string; color: string; size?: number }> = ({ text, color, size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      flex: "none",
      borderRadius: size * 0.24,
      background: `linear-gradient(145deg, ${color}, ${color}bb)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: size * (text.length > 1 ? 0.42 : 0.56),
      color: BG,
      boxShadow: `0 0 ${size * 0.35}px ${color}55`,
    }}
  >
    {text}
  </div>
);

// A seeded 2-frame shake, in px, for a hit at `at` lasting `frames`.
export const shake = (t: number, at: number, amp = 10, frames = 6, seed = 1): [number, number] => {
  const k = Math.floor((t - at) * 30);
  if (k < 0 || k >= frames) return [0, 0];
  const r = rng(seed * 97 + Math.floor(k / 2));
  const fall = 1 - k / frames;
  return [(r() - 0.5) * 2 * amp * fall, (r() - 0.5) * 2 * amp * fall];
};

// Full-canvas svg layer for lines and shapes.
export const Svg: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// Drawn glyphs (the Latin font subset has no ✓ ✗ ❯), each sized to sit on a text line.
export const Glyph: FC<{ kind: "check" | "cross" | "chevron" | "spin" | "dot"; size: number; color: string; p?: number }> = ({ kind, size, color, p = 1 }) => {
  const { f } = useTime();
  const s = size * 0.8;
  const common = { fill: "none", stroke: color, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "-0.1em", flex: "none", overflow: "visible" }}>
      {kind === "check" && <path d="M4 12.5l5 5L20 6.5" {...common} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />}
      {kind === "cross" && <path d="M6 6l12 12M18 6L6 18" {...common} />}
      {kind === "chevron" && <path d="M7 4l9 8-9 8" {...common} strokeWidth={3.6} />}
      {kind === "dot" && <circle cx={12} cy={12} r={5} fill={color} />}
      {kind === "spin" && (
        <g transform={`rotate(${Math.floor(f / 2) * 45} 12 12)`}>
          <circle cx={12} cy={12} r={8.5} {...common} opacity={0.25} />
          <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" {...common} />
        </g>
      )}
    </svg>
  );
};
