// UI morph: one shape morphs through a product's UI states (button → loader → check → toggle → tabs → card → toast…) without a cut, a cursor driving each change and the camera zooming so every state fills the frame.
import type { CSSProperties, FC, ReactElement } from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const KINDS = ["button", "loader", "check", "toggle", "slider", "tabs", "card", "toast", "search"] as const;
type Kind = (typeof KINDS)[number];
const NEEDS_TEXT: Kind[] = ["button", "toast", "search", "card"];

const stateSchema = z.object({
  kind: z
    .enum(KINDS)
    .describe(
      "button: a solid pill with a label, the cursor clicks it; loader: a spinner (with text: spinner + 'Building…'); check: a success tick drawing itself (optional text); toggle: a labelled switch the cursor flips on; slider: a labelled track the cursor drags; tabs: a tab bar, the cursor clicks the second tab and the indicator stretches over; card: a panel with a title and rows (or a trend line); toast: a dark notification with a tick; search: a search field that types the text",
    ),
  text: z.string().max(24).optional().describe("The state's own words, sentence case: the button label, the loader/check line, the toggle or slider label, the card title, the toast message, the typed search query. Required for button, card, toast and search"),
  items: z
    .array(z.string().min(1).max(14))
    .min(2)
    .max(3)
    .optional()
    .describe("tabs: 2–3 tab labels, each ≤ 10 characters (the cursor clicks the second). card: up to 3 short rows that tick in; without rows the card draws a small trend line (no numbers)"),
  word: z.string().optional().describe("Spoken word this state lands on (the morph finishes just before it). Ignored for the first state, which is on screen from the start"),
});

const schema = z
  .object({
    states: z.array(stateSchema).min(3).max(8).describe("The UI states in order, 3–8. The same shape morphs from one to the next, so order them as one flow (click → wait → result)"),
    cursor: z.boolean().default(true).describe("Show a cursor that clicks buttons and cards, flips toggles, clicks tabs and drags sliders"),
  })
  .superRefine((p, ctx) => {
    p.states.forEach((s, i) => {
      if (NEEDS_TEXT.includes(s.kind) && !s.text?.trim()) ctx.addIssue({ code: "custom", message: `a ${s.kind} state needs text`, path: ["states", i, "text"] });
      if (s.kind === "tabs" && (!s.items || s.items.length < 2)) ctx.addIssue({ code: "custom", message: "tabs need 2–3 items (the tab labels)", path: ["states", i, "items"] });
      if (s.kind === "tabs" && s.items?.some((x) => x.length > 10)) ctx.addIssue({ code: "custom", message: "tab labels must be ≤ 10 characters so the bar fits a split panel", path: ["states", i, "items"] });
    });
  });

type Props = z.infer<typeof schema>;
type UIState = Props["states"][number];

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const onColor = (fill: string, s: Style) => (contrast(fill, s.bg) >= contrast(fill, s.ink) ? s.bg : s.ink);
const ease = Easing.inOut(Easing.cubic);

type Cfg = { damping: number; stiffness: number; mass: number; overshootClamping?: boolean };
// A closed-form step response starting at `at`: summing one per change keeps every value a pure function of the frame.
const sp = (frame: number, fps: number, at: number, config: Cfg) => {
  const f = frame - Math.round(at * fps);
  return f < 0 ? 0 : spring({ frame: f, fps, config });
};
// Damping ratio ~0.8 for snappy: a tiny overshoot at most. Calm never overshoots.
const shapeCfg = (s: Style): Cfg => (s.motion === "calm" ? { damping: 28, stiffness: 170, mass: 1, overshootClamping: true } : { damping: 22, stiffness: 190, mass: 1 });
const CAM: Cfg = { damping: 24, stiffness: 105, mass: 1, overshootClamping: true };
const LEAD: Cfg = { damping: 26, stiffness: 320, mass: 1, overshootClamping: true };
const TRAIL: Cfg = { damping: 22, stiffness: 120, mass: 1, overshootClamping: true };

// Layout of one state, in its own box coordinates (0..w, 0..h). Sizes are world px; the camera scales them up.
type Geo = {
  w: number;
  h: number;
  r: number;
  fill: string;
  on: string;
  cam: number;
  fs: number;
  text: string;
  titleFs: number;
  titleLines: number;
  trackX0: number;
  trackX1: number;
  tabX: number[];
  tabW: number[];
  click?: [number, number];
  drag?: [[number, number], [number, number]];
};

const TRACK_W = 168;
const KNOB = 76;
const SLIDE: [number, number] = [0.22, 0.82];

const geoOf = (s: UIState, style: Style, W: number, H: number): Geo => {
  const hand = style.motion === "hand";
  const narrow = W < 1400;
  // Rough glyph width in em; Caveat runs narrow and small, so it is set 14% larger.
  const k = hand ? 0.47 : 0.56;
  const zf = hand ? 1.14 : 1;
  const tw = (str: string, fs: number) => str.length * fs * k;
  const pill = (h: number) => (style.radius >= 8 ? h / 2 : style.radius);
  const text = s.text?.trim() ?? "";
  const g: Geo = { w: 0, h: 0, r: 0, fill: style.surface, on: style.ink, cam: 1, fs: 48 * zf, text, titleFs: 56 * zf, titleLines: 1, trackX0: 0, trackX1: 0, tabX: [], tabW: [] };
  switch (s.kind) {
    case "button":
      g.fs = 56 * zf;
      g.h = 128;
      g.w = tw(text, g.fs) + 150;
      g.fill = style.ink;
      g.click = [g.w * 0.62, g.h * 0.64];
      break;
    case "loader":
    case "check":
      g.h = text ? 128 : 150;
      g.w = text ? g.h + tw(text, g.fs) + 56 : 150;
      g.fill = s.kind === "loader" ? style.surface : style.accent;
      break;
    case "toggle":
      g.h = 140;
      g.w = (text ? 52 + tw(text, g.fs) + 44 : 36) + TRACK_W + 36;
      g.trackX0 = g.w - 36 - TRACK_W;
      g.click = [g.trackX0 + 8 + KNOB / 2, g.h / 2];
      break;
    case "slider": {
      g.fs = 46 * zf;
      g.h = 140;
      const lab = text ? 52 + tw(text, g.fs) + 48 : 60;
      g.w = Math.max(narrow ? 740 : 900, lab + 300);
      g.trackX0 = lab;
      g.trackX1 = g.w - 60;
      const x = (v: number) => g.trackX0 + v * (g.trackX1 - g.trackX0);
      g.drag = [
        [x(SLIDE[0]), g.h / 2],
        [x(SLIDE[1]), g.h / 2],
      ];
      break;
    }
    case "tabs": {
      g.fs = 46 * zf;
      g.h = 124;
      let x = 12;
      for (const it of s.items ?? []) {
        const w = tw(it, g.fs) + 80;
        g.tabX.push(x);
        g.tabW.push(w);
        x += w;
      }
      g.w = x + 12;
      const t = Math.min(1, g.tabX.length - 1);
      g.click = [g.tabX[t]! + g.tabW[t]! * 0.55, g.h * 0.6];
      break;
    }
    case "card": {
      g.fs = 44 * zf;
      g.w = narrow ? 680 : 840;
      g.titleLines = Math.min(2, Math.max(1, Math.ceil(tw(text, g.titleFs) / (g.w - 112))));
      const body = s.items?.length ? s.items.length * 78 : 220;
      g.h = 52 + g.titleLines * g.titleFs * 1.12 + 34 + body + 48;
      g.click = [g.w * 0.64, g.h * 0.58];
      break;
    }
    case "toast":
      g.fs = 46 * zf;
      g.h = 120;
      g.w = 32 + 64 + 28 + tw(text, g.fs) + 52;
      g.fill = style.ink;
      break;
    case "search":
      g.fs = 52 * zf;
      g.h = 128;
      g.w = Math.min(1000, Math.max(narrow ? 600 : 760, 48 + 46 + 30 + tw(text, g.fs) + 70));
      break;
  }
  g.r = s.kind === "card" ? style.radius * 1.5 : pill(g.h);
  g.on = onColor(g.fill, style);
  g.cam = Math.min(2.1, Math.max(0.9, Math.min((W * 0.66) / g.w, (H * 0.56) / g.h)));
  return g;
};

// A rounded rectangle as points along its perimeter, so the hand style can boil the outline (lines only, never the frame).
const roundRectPath = (w: number, h: number, r0: number, t: number, amp: number) => {
  const r = Math.max(0, Math.min(r0, w / 2, h / 2));
  const segs: Array<{ len: number; at: (u: number) => [number, number] }> = [];
  const line = (a: [number, number], b: [number, number]) => segs.push({ len: Math.hypot(b[0] - a[0], b[1] - a[1]), at: (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u] });
  const arc = (cx: number, cy: number, a0: number) => segs.push({ len: (Math.PI / 2) * r, at: (u) => [cx + r * Math.cos(a0 + (u * Math.PI) / 2), cy + r * Math.sin(a0 + (u * Math.PI) / 2)] });
  line([r, 0], [w - r, 0]);
  arc(w - r, r, -Math.PI / 2);
  line([w, r], [w, h - r]);
  arc(w - r, h - r, 0);
  line([w - r, h], [r, h]);
  arc(r, h - r, Math.PI / 2);
  line([0, h - r], [0, r]);
  arc(r, r, Math.PI);
  const total = segs.reduce((a, s) => a + s.len, 0);
  const N = 64;
  const tick = Math.floor(t * 8);
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    let d = (i / N) * total;
    let j = 0;
    while (j < segs.length - 1 && d > segs[j]!.len) d -= segs[j++]!.len;
    const [x, y] = segs[j]!.at(segs[j]!.len > 0 ? d / segs[j]!.len : 0);
    pts.push(`${(x + (hash(i * 7.1 + tick * 13.7) - 0.5) * amp).toFixed(1)},${(y + (hash(i * 3.3 + tick * 5.9 + 50) - 0.5) * amp).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

const Check: FC<{ size: number; color: string; p: number; width: number }> = ({ size, color, p, width }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: "visible", flexShrink: 0 }}>
    <path d="M10 25 L20 34 L38 14" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </svg>
);

type Ctx = { style: Style; ui: string; frame: number; fps: number; t: number; E: number; hold: number; A: number; G: number; R: number; seed: number };

// The inside of one state, laid out in its own box; it never reflows while the shape around it morphs.
const Inside = ({ s, g, c }: { s: UIState; g: Geo; c: Ctx }): ReactElement => {
  const { style, ui, frame, fps, t, E } = c;
  const lt = t - E;
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const textCss: CSSProperties = { fontFamily: ui, fontWeight: 600, fontSize: g.fs, lineHeight: 1, color: g.on, whiteSpace: "nowrap", letterSpacing: hand ? 0 : "-0.012em" };
  // Longhands only: mixing `inset` with a `left` override lets React clear the left edge when a node is reused for the next state.
  const row: CSSProperties = { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center" };

  switch (s.kind) {
    case "button":
      return (
        <div style={{ ...row, justifyContent: "center" }}>
          <span style={{ ...textCss, fontSize: g.fs, fontWeight: 650 }}>{g.text}</span>
        </div>
      );
    case "loader": {
      const d = g.text ? 64 : 76;
      const rot = t * 420;
      return (
        <div style={{ ...row, justifyContent: "center", gap: 26 }}>
          <svg width={d} height={d} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
            <circle cx={32} cy={32} r={26} fill="none" stroke={mix(g.on, 13)} strokeWidth={7} />
            <circle cx={32} cy={32} r={26} fill="none" stroke={style.accent} strokeWidth={7} strokeLinecap={style.radius >= 8 ? "round" : "butt"} pathLength={1} strokeDasharray="0.3 1" transform={`rotate(${rot} 32 32)`} />
          </svg>
          {g.text ? <span style={textCss}>{g.text}</span> : null}
        </div>
      );
    }
    case "check": {
      const p = interpolate(lt, [0.14, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return (
        <div style={{ ...row, justifyContent: "center", gap: 22 }}>
          <Check size={g.text ? 64 : 84} color={g.on} p={p} width={g.text ? 6 : 6.5} />
          {g.text ? <span style={textCss}>{g.text}</span> : null}
        </div>
      );
    }
    case "toggle": {
      const lead = sp(frame, fps, c.A, LEAD);
      const trail = sp(frame, fps, c.A, TRAIL);
      const x0 = g.trackX0;
      const offL = x0 + 8;
      const onL = x0 + TRACK_W - 8 - KNOB;
      // The knob's two edges ride different springs, so its leading edge stretches ahead and the tail catches up.
      const L = offL + (onL - offL) * trail;
      const R = offL + KNOB + (onL - offL) * lead;
      const th = KNOB + 16;
      const tr = style.radius >= 8 ? th / 2 : style.radius;
      return (
        <>
          {g.text ? (
            <div style={{ ...row, left: 52 }}>
              <span style={textCss}>{g.text}</span>
            </div>
          ) : null}
          <div style={{ position: "absolute", left: x0, top: (g.h - th) / 2, width: TRACK_W, height: th, borderRadius: tr, background: mix(style.accent, lead * 100, mix(style.ink, 16)) }} />
          <div style={{ position: "absolute", left: L, top: (g.h - KNOB) / 2, width: R - L, height: KNOB, borderRadius: style.radius >= 8 ? KNOB / 2 : Math.max(2, style.radius - 2), background: style.surface, boxShadow: "0 4px 12px rgba(0,0,0,0.22)" }} />
        </>
      );
    }
    case "slider": {
      const u = c.R > c.G ? ease(clamp01((t - c.G) / (c.R - c.G))) : 0;
      const v = SLIDE[0] + (SLIDE[1] - SLIDE[0]) * u;
      const held = t >= c.G - 0.04 && t <= c.R + 0.06;
      const kx = g.trackX0 + v * (g.trackX1 - g.trackX0);
      const grow = 1 + 0.14 * (held ? clamp01((t - c.G + 0.04) / 0.1) : clamp01(1 - (t - c.R - 0.06) / 0.15) * (t > c.R ? 1 : 0));
      const th = 14;
      const kd = 56 * grow;
      return (
        <>
          {g.text ? (
            <div style={{ ...row, left: 52 }}>
              <span style={{ ...textCss, fontSize: g.fs }}>{g.text}</span>
            </div>
          ) : null}
          <div style={{ position: "absolute", left: g.trackX0, top: g.h / 2 - th / 2, width: g.trackX1 - g.trackX0, height: th, borderRadius: th / 2, background: mix(style.ink, 14) }} />
          <div style={{ position: "absolute", left: g.trackX0, top: g.h / 2 - th / 2, width: kx - g.trackX0, height: th, borderRadius: th / 2, background: style.accent }} />
          <div style={{ position: "absolute", left: kx - kd / 2, top: g.h / 2 - kd / 2, width: kd, height: kd, borderRadius: style.radius >= 8 ? "50%" : style.radius, background: style.ink, border: `6px solid ${style.surface}`, boxSizing: "border-box", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }} />
        </>
      );
    }
    case "tabs": {
      const to = Math.min(1, g.tabX.length - 1);
      const lead = sp(frame, fps, c.A, LEAD);
      const trail = sp(frame, fps, c.A, TRAIL);
      // Moving right, so the right edge leads and the left edge trails: the indicator stretches like liquid, then settles.
      const L = g.tabX[0]! + (g.tabX[to]! - g.tabX[0]!) * trail;
      const R = g.tabX[0]! + g.tabW[0]! + (g.tabX[to]! + g.tabW[to]! - g.tabX[0]! - g.tabW[0]!) * lead;
      const ih = g.h - 24;
      const ind = style.ink;
      const onInd = onColor(ind, style);
      return (
        <>
          <div style={{ position: "absolute", left: L, top: 12, width: R - L, height: ih, borderRadius: style.radius >= 8 ? ih / 2 : style.radius, background: ind }} />
          {(s.items ?? []).map((it, k) => {
            const cx = g.tabX[k]! + g.tabW[k]! / 2;
            const cover = clamp01((Math.min(R, cx + 24) - Math.max(L, cx - 24)) / 48);
            return (
              <div key={k} style={{ position: "absolute", left: g.tabX[k], top: 0, width: g.tabW[k], height: g.h, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ ...textCss, color: mix(onInd, cover * 100, style.muted) }}>{it}</span>
              </div>
            );
          })}
        </>
      );
    }
    case "card": {
      const pad = 56;
      const titleH = g.titleLines * g.titleFs * 1.12;
      const bodyTop = 52 + titleH + 34;
      const items = s.items ?? [];
      const ti = enter(style, frame, fps, E + 0.12, 0.5);
      let body: ReactElement;
      if (items.length) {
        body = (
          <>
            {items.map((it, k) => {
              const a = enter(style, frame, fps, E + 0.32 + k * 0.16, 0.5);
              const tick = interpolate(t, [E + 0.42 + k * 0.16, E + 0.72 + k * 0.16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
              const on = onColor(style.accent, style);
              return (
                <div key={k} style={{ position: "absolute", left: pad, top: bodyTop + k * 78, height: 62, display: "flex", alignItems: "center", gap: 22, opacity: clamp01(a), transform: `translateX(${(1 - a) * -24}px)` }}>
                  <div style={{ width: 46, height: 46, borderRadius: style.radius >= 8 ? 23 : style.radius, background: style.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={34} color={on} p={tick} width={7} />
                  </div>
                  <span style={{ ...textCss, fontSize: g.fs, fontWeight: 500, color: style.ink }}>{it}</span>
                </div>
              );
            })}
          </>
        );
      } else {
        // A trend line with no numbers: shape only, so it never states a figure the research doesn't have.
        const cw = g.w - pad * 2;
        const ch = 200;
        const pts = Array.from({ length: 8 }, (_, i) => {
          const rise = i / 7;
          const y = 0.82 - 0.62 * rise + (hash(c.seed + i * 3.7) - 0.5) * 0.26;
          return [(cw * i) / 7, ch * Math.min(0.92, Math.max(0.06, y))] as [number, number];
        });
        const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        const draw = interpolate(t, [E + 0.3, E + 1.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
        const last = pts[pts.length - 1]!;
        const dot = enter(style, frame, fps, E + 1.2, 0.4);
        return (
          <>
            <div style={{ position: "absolute", left: pad, top: 52, width: g.w - pad * 2, opacity: clamp01(ti), transform: `translateY(${(1 - ti) * 16}px)` }}>
              <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: g.titleFs, lineHeight: 1.12, color: style.ink, textWrap: "balance", letterSpacing: hand ? 0 : "-0.02em" }}>{g.text}</div>
            </div>
            <svg width={cw} height={ch} style={{ position: "absolute", left: pad, top: bodyTop, overflow: "visible" }}>
              {[0.25, 0.5, 0.75, 1].map((y) => (
                <line key={y} x1={0} x2={cw} y1={ch * y} y2={ch * y} stroke={mix(style.ink, y === 1 ? 22 : 9)} strokeWidth={2} />
              ))}
              <path d={`${d} L${cw},${ch} L0,${ch} Z`} fill={mix(style.accent, 12)} opacity={draw} />
              <path d={d} fill="none" stroke={style.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
              <circle cx={last[0]} cy={last[1]} r={13 * dot} fill={style.surface} stroke={style.accent} strokeWidth={6} />
            </svg>
          </>
        );
      }
      return (
        <>
          <div style={{ position: "absolute", left: pad, top: 52, width: g.w - pad * 2, opacity: clamp01(ti), transform: `translateY(${(1 - ti) * 16}px)` }}>
            <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: g.titleFs, lineHeight: 1.12, color: style.ink, textWrap: "balance", letterSpacing: hand ? 0 : "-0.02em" }}>{g.text}</div>
          </div>
          {body}
        </>
      );
    }
    case "toast": {
      const pop = enter(style, frame, fps, E + 0.12, 0.45);
      const tick = interpolate(lt, [0.3, 0.62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return (
        <div style={{ ...row, left: 32, gap: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: style.radius >= 8 ? 32 : style.radius, background: style.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.4 + 0.6 * pop})`, flexShrink: 0 }}>
            <Check size={44} color={onColor(style.accent, style)} p={tick} width={7} />
          </div>
          <span style={textCss}>{g.text}</span>
        </div>
      );
    }
    case "search": {
      const start = E + 0.32;
      const avail = Math.max(0.35, c.hold - 0.85);
      const cps = Math.max(14, g.text.length / avail);
      const n = Math.max(0, Math.min(g.text.length, Math.floor((t - start) * cps)));
      const typing = n > 0 && n < g.text.length;
      const blink = typing || t < start ? 1 : Math.floor((t - start) * 2.2) % 2 === 0 ? 1 : 0.15;
      return (
        <div style={{ ...row, left: 48, gap: 30 }}>
          <svg width={46} height={46} viewBox="0 0 46 46" style={{ flexShrink: 0 }}>
            <circle cx={19} cy={19} r={14} fill="none" stroke={style.muted} strokeWidth={5} />
            <line x1={30} y1={30} x2={41} y2={41} stroke={style.muted} strokeWidth={5} strokeLinecap="round" />
          </svg>
          <span style={{ ...textCss, fontWeight: 500, display: "flex", alignItems: "center" }}>
            {g.text.slice(0, n)}
            <span style={{ display: "inline-block", width: 4, height: g.fs * 1.05, marginLeft: 4, background: style.accent, opacity: blink, borderRadius: 2 }} />
          </span>
        </div>
      );
    }
  }
};

const Cursor: FC<{ x: number; y: number; press: number; opacity: number; style: Style }> = ({ x, y, press, opacity, style }) => {
  const s = 2.6 * (1 - 0.14 * press);
  return (
    <svg width={60} height={70} style={{ position: "absolute", left: x - 3, top: y - 3, overflow: "visible", opacity, transform: `scale(${s / 2.6})`, transformOrigin: "3px 3px" }}>
      <g transform="translate(3 3) scale(2.6)">
        <path d="M0 0 L0 17.5 L4.4 13.4 L7.4 20.2 L10.6 18.8 L7.7 12.2 L13.4 12.2 Z" fill={style.ink} stroke={style.surface} strokeWidth={1.3} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

const UIMorph: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const ui = hand ? style.display : style.body;
  const states = props.states;
  const n = states.length;
  const geos = states.map((s) => geoOf(s, style, W, H));
  const seed = [...(states.find((s) => s.kind === "card")?.text ?? "x")].reduce((a, ch) => a + ch.charCodeAt(0), 0);

  // Timing: state 0 is on screen at once; each later state lands just before its word (fallbacks spread evenly); the last one has settled 0.6 s before the end.
  const PRE = 0.1;
  const lastAt = Math.max(0.6 * (n - 1), duration - 1.4);
  const E: number[] = [0];
  for (let i = 1; i < n; i++) {
    const fb = 0.3 + (i * (lastAt - 0.3)) / (n - 1);
    const want = cueAt(cues, states[i]!.word, fb + PRE) - PRE;
    const lo = E[i - 1]! + 0.6;
    E.push(Math.min(Math.max(want, lo), Math.max(lo, lastAt - (n - 1 - i) * 0.6)));
  }
  const endOf = (i: number) => (i < n - 1 ? E[i + 1]! : duration - 0.6);
  const plan = states.map((s, i) => {
    const hold = endOf(i) - E[i]!;
    const A = E[i]! + Math.min(Math.max(hold * 0.45, Math.min(0.5, hold * 0.5)), Math.max(hold - 0.5, hold * 0.5));
    const G = E[i]! + Math.min(Math.max(0.5, hold * 0.25), hold * 0.35);
    const R = E[i]! + Math.max(hold - Math.max(0.35, hold * 0.2), hold * 0.65);
    return { hold, A, G, R, kind: s.kind };
  });

  // The one shape: every geometric value is the first state's plus one spring per change.
  const cfg = shapeCfg(style);
  const ps = E.map((e, i) => (i === 0 ? 0 : sp(frame, fps, e, cfg)));
  const cs = E.map((e, i) => (i === 0 ? 0 : sp(frame, fps, e, CAM)));
  const morph = (vals: number[], p: number[]) => vals.reduce((a, v, i) => (i === 0 ? v : a + (v - vals[i - 1]!) * p[i]!), 0);
  const w = morph(geos.map((g) => g.w), ps);
  const h = morph(geos.map((g) => g.h), ps);
  const r = morph(geos.map((g) => g.r), ps);
  const cam = morph(geos.map((g) => g.cam), cs);
  let cur = 0;
  for (let i = 1; i < n; i++) if (t >= E[i]!) cur = i;
  const pc = cur === 0 ? 1 : clamp01(ps[cur]!);
  const fill = cur === 0 ? geos[0]!.fill : mix(geos[cur]!.fill, pc * 100, geos[cur - 1]!.fill);

  // Cursor path in screen space: keyframes eased in-out, one press per click, the drag riding the slider's own easing.
  const scr = (i: number, p: [number, number]): [number, number] => [W / 2 + (p[0] - geos[i]!.w / 2) * geos[i]!.cam, H / 2 + (p[1] - geos[i]!.h / 2) * geos[i]!.cam];
  const rest = (i: number): [number, number] => {
    const g = geos[i]!;
    return [Math.min(W - 120, W / 2 + (g.w / 2) * g.cam + 40), Math.min(H - 130, H / 2 + (g.h / 2) * g.cam + 30)];
  };
  const keys: Array<{ t: number; x: number; y: number }> = [];
  const tEnd = duration - 0.6;
  const put = (tt: number, p: [number, number]) => {
    const prev = keys.length ? keys[keys.length - 1]!.t : -1;
    keys.push({ t: Math.min(Math.max(tt, prev + 0.02), tEnd), x: p[0], y: p[1] });
  };
  const moveTo = (p: [number, number], t0: number, t1: number) => {
    const k = keys[keys.length - 1]!;
    put(t0, [k.x, k.y]);
    put(t1, p);
  };
  const presses: Array<[number, number]> = [];
  const ripples: Array<{ t: number; x: number; y: number }> = [];
  put(0, rest(0));
  states.forEach((s, i) => {
    const g = geos[i]!;
    const pl = plan[i]!;
    const inState = s.kind === "toggle" || s.kind === "tabs" || s.kind === "slider";
    // A state with its own action sends the cursor straight to it instead of parking first.
    if (i > 0 && !inState) moveTo(rest(i), E[i]! + 0.12, E[i]! + 0.7);
    if ((s.kind === "button" || s.kind === "card") && i < n - 1 && g.click) {
      const at = E[i + 1]!;
      const p = scr(i, g.click);
      moveTo(p, at - 0.55, at - 0.08);
      presses.push([at - 0.08, at + 0.04]);
      ripples.push({ t: at, x: p[0], y: p[1] });
    } else if ((s.kind === "toggle" || s.kind === "tabs") && g.click) {
      const p = scr(i, g.click);
      moveTo(p, Math.max(E[i]! + 0.12, pl.A - 0.55), pl.A - 0.08);
      presses.push([pl.A - 0.08, pl.A + 0.04]);
      ripples.push({ t: pl.A, x: p[0], y: p[1] });
    } else if (s.kind === "slider" && g.drag) {
      const a = scr(i, g.drag[0]);
      const b = scr(i, g.drag[1]);
      moveTo(a, Math.max(E[i]! + 0.12, pl.G - 0.5), pl.G);
      const g0 = keys[keys.length - 1]!.t;
      put(pl.R, b);
      // The knob reads the drag's actual keyframe times, so it stays under the cursor even if a short hold compressed them.
      pl.G = g0;
      pl.R = keys[keys.length - 1]!.t;
      presses.push([pl.G - 0.04, pl.R]);
    }
  });
  let cx = keys[0]!.x;
  let cy = keys[0]!.y;
  for (let j = 0; j < keys.length; j++) {
    const k = keys[j]!;
    const nx = keys[j + 1];
    if (t < k.t) break;
    if (!nx || t < nx.t) {
      const u = nx ? ease(clamp01((t - k.t) / Math.max(1e-3, nx.t - k.t))) : 0;
      cx = k.x + ((nx?.x ?? k.x) - k.x) * u;
      cy = k.y + ((nx?.y ?? k.y) - k.y) * u;
      break;
    }
  }
  const press = presses.reduce((a, [p0, p1]) => Math.max(a, clamp01((t - p0) / 0.06) * (1 - clamp01((t - p1) / 0.1))), 0);
  const cursorIn = props.cursor ? enter({ ...style, motion: "calm" }, frame, fps, 0.25, 0.4) : 0;

  // Born from a smaller shape; a click squishes it a little.
  const born = enter(style, frame, fps, 0, 0.55);
  const scale = (0.72 + 0.28 * born) * (1 - 0.035 * press);
  const ctxOf = (i: number): Ctx => ({ style, ui, frame, fps, t, E: E[i]!, hold: plan[i]!.hold, A: plan[i]!.A, G: plan[i]!.G, R: plan[i]!.R, seed });

  // Content swap: the old inside blurs out fast, the new one blurs in just after, each on its own timing so they never overlap as text.
  const since = t - E[cur]!;
  const qOut = clamp01(since / 0.14);
  const qIn = cur === 0 ? clamp01(born * 1.4) : Easing.out(Easing.cubic)(clamp01((since - 0.08) / 0.26));
  const box = (i: number, q: number, out: boolean): CSSProperties => {
    const g = geos[i]!;
    const blur = out ? q * 10 : (1 - q) * 10;
    return {
      position: "relative",
      flexShrink: 0,
      width: g.w,
      height: g.h,
      opacity: out ? 1 - q : q,
      filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      transform: `scale(${out ? 1 - 0.05 * q : 0.94 + 0.06 * q})`,
    };
  };

  const centre: CSSProperties = { position: "absolute", left: 0, top: 0, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" };
  const shadowA =lum(style.bg) > 0.5 ? 0.13 : 0.45;
  const dot = 46 * cam;

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: base light, a world dot grid that zooms with the camera (so every zoom reads), and a soft accent glow that grows with the shape. */}
      <AbsoluteFill style={{ background: `radial-gradient(90% 80% at 50% 42%, ${style.surface} 0%, transparent 72%)`, opacity: 0.7 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${mix(style.ink, 15)} ${(1.5 * cam).toFixed(2)}px, transparent ${(1.5 * cam + 0.8).toFixed(2)}px)`,
          backgroundSize: `${dot}px ${dot}px`,
          backgroundPosition: `${W / 2 - dot / 2}px ${H / 2 - dot / 2}px`,
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W / 2 - Math.max(w, h) * cam * 1.1,
          top: H / 2 - Math.max(w, h) * cam * 1.1,
          width: Math.max(w, h) * cam * 2.2,
          height: Math.max(w, h) * cam * 2.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${mix(style.accent, 100)} 0%, transparent 60%)`,
          opacity: 0.07,
        }}
      />

      {/* The camera rig: the world scales around the shape so each state fills the frame. */}
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${W / 2}px ${H / 2}px` }}>
        <div
          style={{
            position: "absolute",
            left: W / 2 - w / 2,
            top: H / 2 - h / 2,
            width: w,
            height: h,
            borderRadius: r,
            background: fill,
            overflow: "hidden",
            opacity: clamp01(born * 2),
            transform: `scale(${scale})`,
            boxShadow: hand ? undefined : `0 ${18 / cam}px ${48 / cam}px rgba(0,0,0,${shadowA}), 0 0 0 ${1.5 / cam}px ${mix(style.ink, lum(style.bg) > 0.5 ? 9 : 16)}`,
          }}
        >
          {/* Each state's box is centred by flex in the morphing shape, so it never drifts while the shape resizes. */}
          {cur > 0 && qOut < 1 ? (
            <div key={`s${cur - 1}`} style={centre}>
              <div style={box(cur - 1, qOut, true)}>{Inside({ s: states[cur - 1]!, g: geos[cur - 1]!, c: ctxOf(cur - 1) })}</div>
            </div>
          ) : null}
          <div key={`s${cur}`} style={centre}>
            <div style={box(cur, qIn, false)}>{Inside({ s: states[cur]!, g: geos[cur]!, c: ctxOf(cur) })}</div>
          </div>
        </div>
        {hand ? (
          <svg width={w} height={h} style={{ position: "absolute", left: W / 2 - w / 2, top: H / 2 - h / 2, overflow: "visible", transform: `scale(${scale})`, opacity: clamp01(born * 2) }}>
            <path d={roundRectPath(w, h, r, t, 4 / cam)} fill="none" stroke={style.ink} strokeWidth={3.5 / cam} strokeLinejoin="round" />
          </svg>
        ) : null}
      </AbsoluteFill>

      {/* Clicks ripple and the cursor live outside the camera, so they stay hand-sized at any zoom. */}
      {ripples.map((rp, k) => {
        const u = (t - rp.t) / 0.45;
        if (u < 0 || u > 1 || !props.cursor) return null;
        const e = Easing.out(Easing.cubic)(u);
        return <div key={k} style={{ position: "absolute", left: rp.x - (18 + 56 * e), top: rp.y - (18 + 56 * e), width: (18 + 56 * e) * 2, height: (18 + 56 * e) * 2, borderRadius: "50%", border: `${(4 * (1 - u) + 1).toFixed(2)}px solid ${style.accent}`, opacity: 0.85 * (1 - u), boxSizing: "border-box" }} />;
      })}
      {props.cursor ? <Cursor x={cx} y={cy} press={press} opacity={cursorIn} style={style} /> : null}

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${lum(style.bg) > 0.5 ? 0.12 : 0.35}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "ui-morph",
  title: "UI morph",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Showing an app or product flow as one continuous element: a button is clicked, becomes a loader, a tick, a toggle that flips, a slider that's dragged, tabs, a card, a toast… Each state lands on its spoken word, a cursor drives the changes and the camera zooms so every state fills the frame. Good for tool explainers, 'what happens when you click deploy', app walkthroughs and music-only UI montages. Order the states as one flow. No media.",
  avoid:
    "Real product screens or anything that should look like a specific brand (use a screen recording instead), more than one idea per state, states under ~0.8 s each (fewer states or a longer segment), and ending on a loader (it never settles: end on a check, card or toast).",
  schema,
  example: {
    states: [
      { kind: "search", text: "rate limiter" },
      { kind: "toggle", text: "Rate limiting", word: "flip" },
      { kind: "slider", text: "Requests", word: "requests" },
      { kind: "button", text: "Deploy", word: "deploy" },
      { kind: "loader", text: "Building…", word: "builds" },
      { kind: "check", text: "Tests passed", word: "tests" },
      { kind: "toast", text: "Live on production", word: "live" },
      { kind: "card", text: "Traffic this week", word: "traffic" },
    ],
    cursor: true,
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.5, word: "You" },
    { at: 0.5, end: 0.9, word: "search" },
    { at: 1.1, end: 1.6, word: "limiter" },
    { at: 2.0, end: 2.3, word: "flip" },
    { at: 2.3, end: 2.6, word: "it" },
    { at: 3.4, end: 4.0, word: "requests" },
    { at: 4.9, end: 5.4, word: "deploy" },
    { at: 6.1, end: 6.6, word: "builds" },
    { at: 7.3, end: 7.7, word: "tests" },
    { at: 8.6, end: 8.9, word: "live" },
    { at: 9.9, end: 10.4, word: "traffic" },
  ],
  seconds: { min: 4, max: 12, demo: 12 },
  mediaSlots: 0,
  credit: { name: "'Shape morphing through UI states' by @twoclipping (prompt-motion.com)", url: "https://prompt-motion.com/twoclipping-5cba86" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <UIMorph props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
