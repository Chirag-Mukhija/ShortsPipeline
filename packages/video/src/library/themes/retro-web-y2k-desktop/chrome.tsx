// The fake OS chrome: drifting starfield, desktops and taskbar, the bevelled window that snaps open and collapses, buttons, fields and the marquee.
import { useMemo, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { CREAM, CYAN, GREY, INK, PINK, PINK_HOT, PIXEL, SPACE, TEAL, TITLE_OFF, TITLE_ON, UI, WHITE, dither, pressed, raised, sunken } from "./theme";
import { G_CLOSE, G_MAX, G_MIN, Pix, STARMARK, type Sprite } from "./pixels";
import { blink, clamp, lerp, local, quant, rng } from "./motion";

export type Rect = { x: number; y: number; w: number; h: number };

// ---------- starfield ----------
type Star = { x: number; y: number; kind: number; per: number; ph: number; tint: string };

// Tiled star GIF energy: stars drift diagonally 1 px a frame, sparkles flip between two states, a shooting star every 4 s.
export const StarField: FC<{ seed?: number; count?: number; glow?: string }> = ({ seed = 7, count = 300, glow = "#2A1066" }) => {
  const { f } = useTime();
  const stars = useMemo<Star[]>(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => {
      const k = r();
      const c = r();
      return { x: r() * (W + 60), y: r() * (H + 60), kind: k, per: 6 + Math.floor(r() * 10), ph: Math.floor(r() * 16), tint: c < 0.08 ? CYAN : c < 0.14 ? PINK_HOT : WHITE };
    });
  }, [seed, count]);
  const shoot = Math.floor(f / 120);
  const sl = f % 120;
  const sr = rng(seed * 31 + shoot);
  const sx = 200 + sr() * 1200;
  const sy = 80 + sr() * 360;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 115%, ${glow} 0%, ${SPACE} 70%)`, overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => {
          const x = Math.round(((s.x + f) % (W + 60)) - 30);
          const y = Math.round(((s.y + f) % (H + 60)) - 30);
          const on = Math.floor((f + s.ph) / s.per) % 2 === 0;
          if (s.kind < 0.68) return <rect key={i} x={x} y={y} width={3} height={3} fill={s.tint} opacity={on ? 0.85 : 0.45} />;
          if (s.kind < 0.9) return <rect key={i} x={x} y={y} width={6} height={6} fill={s.tint} opacity={on ? 1 : 0.6} />;
          const arm = on ? 15 : 6;
          return (
            <g key={i} fill={s.tint}>
              <rect x={x - arm} y={y} width={arm * 2 + 6} height={3} />
              <rect x={x + 1.5} y={y - arm + 1.5} width={3} height={arm * 2 + 3} />
              <rect x={x - 1.5} y={y - 1.5} width={9} height={9} opacity={on ? 1 : 0} />
            </g>
          );
        })}
        {sl < 16 &&
          Array.from({ length: 7 }, (_, k) => {
            const p = quant(sl, 2) * 34 - k * 18;
            return <rect key={`s${k}`} x={sx + p} y={sy + p * 0.42} width={9 - k} height={9 - k} fill={WHITE} opacity={1 - k * 0.13} />;
          })}
      </svg>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 5px)" }} />
    </AbsoluteFill>
  );
};

// ---------- desktops ----------
const TONES = {
  teal: { bg: TEAL, dot: "rgba(0,0,0,0.10)" },
  pink: { bg: PINK, dot: "rgba(255,255,255,0.35)" },
  cream: { bg: CREAM, dot: "rgba(242,208,208,0.6)" },
} as const;

export const Desktop: FC<{ tone?: keyof typeof TONES; children?: ReactNode; style?: CSSProperties }> = ({ tone = "teal", children, style }) => (
  <AbsoluteFill style={{ backgroundColor: TONES[tone].bg, ...style }}>
    <AbsoluteFill style={{ ...dither(TONES[tone].dot, "transparent", 3), opacity: 0.9 }} />
    {children}
  </AbsoluteFill>
);

// Bottom bar with a GO button, task buttons and a clock tray; decorative chrome, so it may sit in the bottom margin.
export const Taskbar: FC<{ tasks?: string[]; active?: number; clock?: string }> = ({ tasks = [], active = -1, clock = "11:41 PM" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 76, background: GREY, ...raised(), display: "flex", alignItems: "center", gap: 10, padding: "0 12px", boxSizing: "border-box" }}>
    <div style={{ height: 56, padding: "0 18px", display: "flex", alignItems: "center", gap: 12, background: GREY, ...raised(), fontFamily: UI, fontWeight: 700, fontSize: 30, color: INK }}>
      <Pix sprite={STARMARK} px={4} recolor={{ y: PINK_HOT }} />
      GO!
    </div>
    {tasks.map((t, i) => (
      <div key={t} style={{ height: 56, minWidth: 220, padding: "0 16px", display: "flex", alignItems: "center", background: GREY, ...(i === active ? { ...pressed(), ...dither("#fff", GREY, 2) } : raised()), fontFamily: UI, fontSize: 28, color: INK }}>{t}</div>
    ))}
    <div style={{ flex: 1 }} />
    <div style={{ height: 56, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, background: GREY, ...sunken(2), fontFamily: UI, fontSize: 28, color: INK }}>{clock}</div>
  </div>
);

// ---------- buttons and fields ----------
export const Btn: FC<{ label?: ReactNode; w?: number; h?: number; down?: boolean; primary?: boolean; size?: number; style?: CSSProperties }> = ({ label, w, h = 60, down, primary, size = 30, style }) => (
  <div
    style={{
      width: w, height: h, background: GREY, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: "0 18px",
      fontFamily: UI, fontSize: size, color: INK, outline: primary ? `3px solid ${INK}` : undefined,
      ...(down ? pressed() : raised()), ...(down ? { paddingTop: 6, paddingLeft: 24 } : {}), ...style,
    }}
  >
    {label}
  </div>
);

export const Field: FC<{ children?: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ background: WHITE, ...sunken(), padding: "8px 14px", boxSizing: "border-box", ...style }}>{children}</div>
);

// ---------- the window ----------
export const TITLE_H = 54;
const OPEN_F = 6;

// Dotted outline rectangles: the era's "zoom rects" drawn while a window opens or closes.
const Wire: FC<{ rects: Rect[] }> = ({ rects }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} shapeRendering="crispEdges">
    {rects.map((r, i) => (
      <g key={i} fill="none" opacity={1 - i * 0.3}>
        <rect x={r.x} y={r.y} width={Math.max(2, r.w)} height={Math.max(2, r.h)} stroke={INK} strokeWidth={5} />
        <rect x={r.x} y={r.y} width={Math.max(2, r.w)} height={Math.max(2, r.h)} stroke={WHITE} strokeWidth={3} strokeDasharray="6 6" />
      </g>
    ))}
  </svg>
);
const mix = (a: Rect, b: Rect, k: number): Rect => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

export type WinProps = Rect & {
  title: string;
  icon?: Sprite;
  // Cue (s) the window snaps open; omit to show it already open.
  at?: number;
  // Cue (s) it collapses to its title bar and zooms to `closeTo` (an icon's centre) or its own centre.
  closeAt?: number;
  closeTo?: { x: number; y: number };
  // Open from this rect (an icon) with trailing zoom rects instead of from a one-line strip.
  from?: Rect;
  tone?: "chrome" | "pastel";
  active?: boolean;
  // 0..1: washes the window white and greys the title, "(FROZEN)".
  frozen?: number;
  menu?: string[];
  status?: ReactNode;
  body?: "white" | "grey" | "cream" | "black";
  pad?: number;
  children?: ReactNode;
};

const TitleBar: FC<{ title: string; icon?: Sprite; tone: "chrome" | "pastel"; on: boolean }> = ({ title, icon, tone, on }) => {
  if (tone === "pastel")
    return (
      <div style={{ height: TITLE_H, display: "flex", alignItems: "center", gap: 14, padding: "0 12px", borderBottom: `3px solid ${INK}`, backgroundColor: PINK, backgroundImage: `repeating-linear-gradient(180deg, ${PINK_HOT}55 0 3px, transparent 3px 8px)` }}>
        <div style={{ width: 34, height: 34, background: CREAM, border: `3px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pix sprite={G_CLOSE} px={3} />
        </div>
        <div style={{ background: CREAM, border: `3px solid ${INK}`, padding: "2px 14px", fontFamily: UI, fontWeight: 700, fontSize: 28, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>{title}</div>
        <div style={{ flex: 1 }} />
        {icon && <Pix sprite={icon} px={2.5} />}
      </div>
    );
  return (
    <div style={{ height: TITLE_H, display: "flex", alignItems: "center", gap: 12, padding: "0 8px 0 12px", background: on ? TITLE_ON : TITLE_OFF, position: "relative", overflow: "hidden" }}>
      <Pix sprite={icon ?? STARMARK} px={icon ? 2.25 : 3.5} />
      <div style={{ flex: 1, fontFamily: UI, fontWeight: 700, fontSize: 28, color: on ? WHITE : "#E4E4E4", whiteSpace: "nowrap", overflow: "hidden", letterSpacing: 1 }}>{title}</div>
      {/* Pixel stars dusted over the teal end of the bar: the one ornament that says "not a real OS". */}
      {on && [[0.62, 10], [0.7, 32], [0.78, 16], [0.84, 36]].map(([fx, fy], i) => <div key={i} style={{ position: "absolute", left: `${fx! * 100}%`, top: fy, width: 4, height: 4, background: WHITE, opacity: 0.7 }} />)}
      {[G_MIN, G_MAX, G_CLOSE].map((g, i) => (
        <div key={i} style={{ width: 42, height: 38, background: GREY, ...raised(), display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i === 2 ? 6 : 0, position: "relative" }}>
          <Pix sprite={g} px={3} />
        </div>
      ))}
    </div>
  );
};

const BODY_BG = { white: WHITE, grey: GREY, cream: CREAM, black: INK } as const;

export const OsWindow: FC<WinProps> = ({ x, y, w, h, title, icon, at, closeAt, closeTo, from, tone = "chrome", active = true, frozen = 0, menu, status, body = "white", pad = 24, children }) => {
  const { f } = useTime();
  const lo = at === undefined ? 999 : local(f, at);
  const lc = closeAt === undefined ? -1 : local(f, closeAt);
  const full: Rect = { x, y, w, h };
  if (lo < 0) return null;
  if (lo < OPEN_F) {
    const start = from ?? { x: x + w * 0.08, y: y + h / 2 - 3, w: w * 0.84, h: 6 };
    const k = (lo + 1) / OPEN_F;
    const trail = from ? [k, k - 1 / OPEN_F, k - 2 / OPEN_F].filter((v) => v > 0) : [k];
    return <Wire rects={trail.map((v) => mix(start, full, v))} />;
  }
  if (lc >= 8) return null;
  if (lc >= 3) {
    const bar: Rect = { x, y, w, h: TITLE_H + 12 };
    const to = closeTo ? { x: closeTo.x - 40, y: closeTo.y - 30, w: 80, h: 60 } : { x: x + w / 2 - 40, y: y + 20, w: 80, h: 30 };
    const k = (lc - 2) / 5;
    return <Wire rects={[k, k - 0.2].filter((v) => v > 0).map((v) => mix(bar, to, v))} />;
  }
  const hh = lc >= 0 ? lerp(h, TITLE_H + 12, (lc + 1) / 3) : h;
  const on = active && frozen < 0.5;
  const pastel = tone === "pastel";
  const shell: CSSProperties = pastel
    ? { background: CREAM, border: `3px solid ${INK}`, boxShadow: `12px 12px 0 rgba(10,10,10,0.25)` }
    : { background: GREY, boxShadow: `${raised().boxShadow}, 12px 12px 0 rgba(0,0,0,0.35)` };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: hh, boxSizing: "border-box", padding: pastel ? 0 : 6, overflow: "hidden", display: "flex", flexDirection: "column", ...shell }}>
      <TitleBar title={frozen >= 0.5 ? `${title} (FROZEN)` : title} icon={icon} tone={tone} on={on} />
      {menu && (
        <div style={{ height: 46, display: "flex", alignItems: "center", gap: 30, padding: "0 14px", fontFamily: UI, fontSize: 28, color: INK }}>
          {menu.map((m) => (
            <span key={m}>
              <span style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>{m[0]}</span>
              {m.slice(1)}
            </span>
          ))}
        </div>
      )}
      <div style={{ flex: 1, position: "relative", marginTop: pastel ? 0 : 6, background: BODY_BG[body], ...(body === "white" && !pastel ? sunken() : {}), padding: pad, boxSizing: "border-box", overflow: "hidden" }}>
        {children}
        {frozen > 0 && <div style={{ position: "absolute", inset: 0, background: WHITE, opacity: clamp(frozen) * 0.6 }} />}
      </div>
      {status !== undefined && (
        <div style={{ height: 46, marginTop: 6, display: "flex", alignItems: "center", padding: "0 14px", ...sunken(2), fontFamily: PIXEL, fontSize: 34, color: INK }}>{status}</div>
      )}
    </div>
  );
};

// ---------- text helpers ----------
// Frame-driven marquee: the text tiles horizontally and slides left in 2-frame steps.
export const Marquee: FC<{ text: string; width: number; size?: number; speed?: number; color?: string; font?: string; style?: CSSProperties }> = ({ text, width, size = 40, speed = 6, color = INK, font = PIXEL, style }) => {
  const { f } = useTime();
  const unit = text.length * size * 0.52 + size * 2;
  const off = (quant(f, 2) * speed) % unit;
  return (
    <div style={{ width, overflow: "hidden", whiteSpace: "nowrap", position: "relative", height: size * 1.15, ...style }}>
      <div style={{ position: "absolute", left: -off, top: 0, fontFamily: font, fontSize: size, color, lineHeight: 1.1 }}>
        {Array.from({ length: Math.ceil(width / unit) + 2 }, (_, i) => (
          <span key={i} style={{ display: "inline-block", width: unit }}>{text}</span>
        ))}
      </div>
    </div>
  );
};

// Blinks at 4 Hz once `at` has passed (forever, or for `times` blinks), the era's favourite emphasis.
export const Blink: FC<{ at?: number; times?: number; children: ReactNode }> = ({ at = 0, times, children }) => {
  const { f } = useTime();
  const l = local(f, at);
  if (l < 0) return null;
  const done = times !== undefined && l > (times * 30) / 4;
  return <span style={{ visibility: done || blink(l) ? "visible" : "hidden" }}>{children}</span>;
};

// A stepped type-on for one line: characters appear `cps` per second in 2-frame chunks with a block caret.
export const TypeOn: FC<{ text: string; at: number; cps?: number; caret?: boolean; caretColor?: string }> = ({ text, at, cps = 28, caret = true, caretColor = INK }) => {
  const { f } = useTime();
  const l = local(f, at);
  if (l < 0) return null;
  const n = Math.min(text.length, Math.floor((quant(l, 2) / 30) * cps));
  const typing = n < text.length;
  return (
    <>
      {text.slice(0, n)}
      {caret && (typing || blink(l, 2)) && <span style={{ display: "inline-block", width: "0.5em", height: "0.9em", background: caretColor, verticalAlign: "-0.1em", marginLeft: 2 }} />}
    </>
  );
};
