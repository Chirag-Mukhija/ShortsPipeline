// Bento primitives: the near-black canvas with idle life, hairline cards, mono captions, fade-up and blur-exit styles, pulse dots, caret, avatars and line icons.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { BG, EXIT, EXPO, HUE, MONO, MUTED, PANEL, PANEL2, RADIUS, TEXT, fr, hair, withAlpha } from "./theme";

// ---------- motion styles ----------
export type AppearOpts = { d?: number; y?: number; s?: number; blur?: number };

// The theme's one entrance: fade up from y px (default 12) over d frames (default 18), expo-out, optionally settling from a slight scale.
export const appear = (t: number, at: number, { d = 18, y = 12, s = 1, blur = 0 }: AppearOpts = {}) => {
  const p = ramp(t, at, fr(d), EXPO);
  return { p, style: { opacity: clamp01(p * 1.4), transform: `translateY(${(1 - p) * y}px) scale(${s + (1 - s) * p})`, filter: blur ? `blur(${(1 - p) * blur}px)` : undefined } as CSSProperties };
};

// The theme's one exit: opacity to 0 with an 8 px blur over 10 frames, no travel.
export const exitStyle = (t: number, out?: number): CSSProperties => {
  if (out === undefined) return {};
  const e = ramp(t, out, fr(10), EXIT);
  return e <= 0 ? {} : { opacity: 1 - e, filter: `blur(${e * 8}px)` };
};

export const Exit: FC<{ out?: number; children: ReactNode; style?: CSSProperties }> = ({ out, children, style }) => {
  const { t } = useTime();
  return <AbsoluteFill style={{ ...style, ...exitStyle(t, out) }}>{children}</AbsoluteFill>;
};

// ---------- canvas ----------
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='260' height='260' filter='url(#n)'/></svg>`,
)}")`;

// Near-black stage: a faint grid that dissolves toward the edges, a top spotlight, a gradient band sweeping about 0.2 px a frame, and fine grain so nothing bands.
export const Canvas: FC<{ hue?: string; grid?: boolean }> = ({ hue = HUE.indigo, grid = true }) => {
  const { f } = useTime();
  const sweep = Math.sin(f / 1500) * 300 + f * 0.2;
  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      {grid && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${hair(0.03)} 1px, transparent 1px), linear-gradient(90deg, ${hair(0.03)} 1px, transparent 1px)`,
            backgroundSize: "120px 120px",
            backgroundPosition: "0 0",
            maskImage: "radial-gradient(ellipse 65% 55% at 50% 38%, black 0%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 38%, black 0%, transparent 78%)",
          }}
        />
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 45% at 50% -8%, rgba(255,255,255,0.075), transparent 70%)" }} />
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -600 + sweep,
          width: 1400,
          height: 1500,
          transform: "rotate(18deg)",
          background: `linear-gradient(90deg, transparent, ${withAlpha(hue, 0.05)} 45%, rgba(255,255,255,0.025) 55%, transparent)`,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 72%, rgba(0,0,0,0.45) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.035 }} />
    </AbsoluteFill>
  );
};

// ---------- surfaces ----------
export type CardProps = {
  x?: number;
  y?: number;
  w?: number | string;
  h?: number | string;
  // 0 = resting hairline (8 % white), 1 = focused (30 % white) with a soft spotlight behind it.
  lit?: number;
  radius?: number;
  pad?: number;
  glow?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export const Card: FC<CardProps> = ({ x, y, w, h, lit = 0, radius = RADIUS, pad = 0, glow, style, children }) => (
  <div style={{ position: x === undefined ? "relative" : "absolute", left: x, top: y, width: w, height: h, ...style }}>
    {lit > 0 && (
      <div style={{ position: "absolute", inset: "-35%", background: `radial-gradient(closest-side, ${glow ? withAlpha(glow, 0.16 * lit) : hair(0.06 * lit)}, transparent)`, pointerEvents: "none" }} />
    )}
    <div
      style={{
        // Without a size the panel sits in flow, so it wraps its content (lower thirds, pills).
        position: w === undefined && h === undefined ? "relative" : "absolute",
        inset: w === undefined && h === undefined ? undefined : 0,
        height: "100%",
        borderRadius: radius,
        background: `linear-gradient(180deg, ${PANEL2} 0%, ${PANEL} 100%)`,
        border: `1px solid ${hair(0.08 + 0.22 * lit)}`,
        boxShadow: `inset 0 1px 0 ${hair(0.05 + 0.05 * lit)}, 0 24px 60px rgba(0,0,0,0.45)`,
        overflow: "hidden",
        padding: pad,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  </div>
);

// Fades a block's bottom (or right) edge into the canvas so screens dissolve instead of ending.
export const EdgeFade: FC<{ from?: number; dir?: "bottom" | "right"; children: ReactNode; style?: CSSProperties }> = ({ from = 55, dir = "bottom", children, style }) => {
  const mask = `linear-gradient(to ${dir}, black ${from}%, transparent 100%)`;
  return <div style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}>{children}</div>;
};

// ---------- type bits ----------
export const Mono: FC<{ children: ReactNode; size?: number; color?: string; style?: CSSProperties }> = ({ children, size = 28, color = MUTED, style }) => (
  <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color, ...style }}>{children}</span>
);

// A status dot that breathes: a ring expands from it every 45 frames.
export const PulseDot: FC<{ color?: string; size?: number; phase?: number }> = ({ color = HUE.green, size = 14, phase = 0 }) => {
  const { f } = useTime();
  const k = ((f + phase) % 45) / 45;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${color}`, transform: `scale(${1 + k * 1.6})`, opacity: (1 - k) * 0.55 }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, boxShadow: `0 0 ${size}px ${withAlpha(color, 0.6)}` }} />
    </span>
  );
};

// A text caret blinking once a second.
export const Caret: FC<{ h?: number; color?: string }> = ({ h = 40, color = TEXT }) => {
  const { f } = useTime();
  const on = clamp01(Math.cos((f / 30) * Math.PI * 2) * 3 + 1);
  return <span style={{ display: "inline-block", width: 3, height: h, marginLeft: 4, background: color, opacity: on, verticalAlign: "middle", borderRadius: 2 }} />;
};

export const Avatar: FC<{ name: string; hue?: string; size?: number }> = ({ name, hue = HUE.indigo, size = 52 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: "50%",
      flexShrink: 0,
      background: `linear-gradient(135deg, ${withAlpha(hue, 0.9)}, ${withAlpha(hue, 0.45)})`,
      boxShadow: `inset 0 0 0 1px ${hair(0.18)}`,
      color: TEXT,
      fontFamily: MONO,
      fontWeight: 500,
      fontSize: size * 0.44,
    }}
  >
    {name.slice(0, 1).toUpperCase()}
  </span>
);

// ---------- line icons (thunks: JSX at module scope breaks the bundle's classic JSX runtime) (24-unit grid, 1.75 stroke, like the product UIs the theme imitates) ----------
const ICONS = {
  search: () => <><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5 21 21" /></>,
  inbox: () => <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5.5 5h13L21 13v6H3v-6z" /></>,
  layers: () => <><path d="M12 3 2 8l10 5 10-5z" /><path d="m2 12.5 10 5 10-5" /><path d="m2 17 10 5 10-5" /></>,
  bolt: () => <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  chat: () => <path d="M4 5h16v11H9l-5 4z" />,
  sparkle: () => <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 15 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
  code: () => <><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m14 4-4 16" /></>,
  git: () => <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 7v10" /><path d="M18 10v1a4 4 0 0 1-4 4H6" /></>,
  user: () => <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  folder: () => <path d="M3 6h6l2 2h10v11H3z" />,
  chart: () => <><path d="M3 21h18" /><path d="M6 18v-6" /><path d="M11 18V6" /><path d="M16 18v-9" /></>,
  shield: () => <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  clock: () => <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: () => <path d="m5 12.5 4.5 4.5L19 7" />,
  x: () => <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  cube: () => <><path d="m12 2 9 5v10l-9 5-9-5V7z" /><path d="m3 7 9 5 9-5" /><path d="M12 12v10" /></>,
  globe: () => <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  db: () => <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  cpu: () => <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  clipboard: () => <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /></>,
  smile: () => <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" /><path d="M9 9.5h.01M15 9.5h.01" /></>,
  terminal: () => <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m6 9 3 3-3 3" /><path d="M12 15h6" /></>,
  arrow: () => <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  calc: () => <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
} as const;
export type IconName = keyof typeof ICONS;

export const Icon: FC<{ name: IconName; size?: number; color?: string; sw?: number; style?: CSSProperties }> = ({ name, size = 32, color = MUTED, sw = 1.75, style }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {ICONS[name]()}
  </svg>
);

// An icon in a small raised tile, tinted by its hue.
export const IconTile: FC<{ name: IconName; hue?: string; size?: number; lit?: number }> = ({ name, hue, size = 64, lit = 0 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: size * 0.25,
      flexShrink: 0,
      background: hue ? `linear-gradient(180deg, ${withAlpha(hue, 0.28 + 0.2 * lit)}, ${withAlpha(hue, 0.1)})` : `linear-gradient(180deg, ${hair(0.08)}, ${hair(0.03)})`,
      boxShadow: `inset 0 0 0 1px ${hue ? withAlpha(hue, 0.35 + 0.3 * lit) : hair(0.1 + 0.2 * lit)}`,
    }}
  >
    <Icon name={name} size={size * 0.5} color={hue ? TEXT : lit > 0.5 ? TEXT : MUTED} />
  </span>
);
