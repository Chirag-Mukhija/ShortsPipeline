// Guide overlays over a recording: the caption pill, keycap shortcut HUD, spotlight callout, typed-text timing with caret, and the magnified typed-input highlight.
import type { FC, ReactNode } from "react";
import { random } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, BACK, CAPTION_Y, MONO, PILL_BG, SANS, UI, type Look } from "./theme";
import type { Pt, Rect } from "./motion";

// Text inside [brackets] is the key phrase and lights up in the accent.
const Marked: FC<{ text: string; accent: string; p?: number }> = ({ text, accent, p = 1 }) => (
  <>
    {text.split(/(\[[^\]]+\])/).map((s, i) =>
      s.startsWith("[") ? (
        <span key={i} style={{ color: accent, position: "relative" }}>
          {s.slice(1, -1)}
          <span style={{ position: "absolute", left: 0, bottom: -4, height: 3, borderRadius: 2, width: `${p * 100}%`, background: accent, opacity: 0.7 }} />
        </span>
      ) : (
        <span key={i}>{s}</span>
      ),
    )}
  </>
);

const StepRing: FC<{ i: number; n: number; p: number }> = ({ i, n, p }) => {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 22, marginRight: 22, borderRight: "1.5px solid rgba(255,255,255,0.16)" }}>
      <svg width={44} height={44} viewBox="-22 -22 44 44">
        <circle r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} />
        <circle r={r} fill="none" stroke={ACCENT} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${c * ((i - 1 + p) / n)} ${c}`} transform="rotate(-90)" />
      </svg>
      <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: "#FFFFFF" }}>
        {i}
        <span style={{ opacity: 0.5 }}>/{n}</span>
      </span>
    </div>
  );
};

export type CaptionProps = { text: string; at: number; out?: number; step?: [number, number]; y?: number; x?: number; icon?: ReactNode };

// One instruction line in a glass pill under the window; [key words] in the accent, optional step ring.
export const CaptionPill: FC<CaptionProps> = ({ text, at, out, step, y = CAPTION_Y, x = 960, icon }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.36, BACK(1.3));
  const o = out === undefined ? 0 : ramp(t, out, 0.27);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - p) * 18 + o * 10}px) scale(${0.96 + 0.04 * p})`, opacity: clamp01(p * 1.5) * (1 - o) }}>
      <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", padding: step ? "12px 34px 12px 16px" : "14px 36px", borderRadius: 999, background: PILL_BG, backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 18px 40px -14px rgba(0,0,0,0.55)", fontFamily: SANS, fontWeight: 500, fontSize: 38, color: "#FFFFFF", letterSpacing: -0.2 }}>
        {step && <StepRing i={step[0]} n={step[1]} p={ramp(t, at + 0.2, 0.6)} />}
        {icon && <span style={{ marginRight: 14, display: "flex" }}>{icon}</span>}
        <span>
          <Marked text={text} accent="#9DB8FF" p={ramp(t, at + 0.25, 0.4)} />
        </span>
      </div>
    </div>
  );
};

const Cap: FC<{ k: string; p: number; press: number; size: number }> = ({ k, p, press, size }) => {
  const wide = k.length > 1 && !/^[⌘⌥⇧⌃↵⌫⎋→←↑↓]$/.test(k);
  const bevel = 7 - press * 5;
  return (
    <div
      style={{
        minWidth: size * 1.7,
        height: size * 1.7,
        padding: wide ? `0 ${size * 0.45}px` : 0,
        boxSizing: "border-box",
        borderRadius: size * 0.32,
        background: "linear-gradient(180deg, #FFFFFF 0%, #EEF1F8 100%)",
        boxShadow: `0 ${bevel}px 0 #B9C0D3, 0 ${bevel + 8}px 18px -6px rgba(0,0,0,0.45), inset 0 -2px 0 rgba(0,0,0,0.04)`,
        transform: `translateY(${press * 5 + (1 - p) * 26}px) scale(${0.6 + 0.4 * p})`,
        opacity: clamp01(p * 2),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: wide ? size * 0.8 : size,
        color: "#1A1D2E",
      }}
    >
      {k}
    </div>
  );
};

export type KeyChipsProps = { keys: string[]; at: number; hold?: number; x?: number; y?: number; size?: number; label?: string };

// A shortcut as physical keycaps: each cap pops in with back-out(1.5) over 10 f, sinks on the press, the group holds 24 f and leaves.
export const KeyChips: FC<KeyChipsProps> = ({ keys, at, hold = 0.8, x = 960, y = 820, size = 46, label }) => {
  const { t } = useTime();
  const gone = ramp(t, at + hold + keys.length * 0.1, 0.27);
  if (t < at - 0.05 || gone >= 1) return null;
  const hud = ramp(t, at - 0.05, 0.2);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${gone * 12}px)`, opacity: hud * (1 - gone) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px 26px", borderRadius: 28, background: "rgba(14,16,34,0.84)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)" }}>
        {keys.map((k, i) => {
          const a = at + i * 0.1;
          const p = ramp(t, a, 0.33, BACK(1.5));
          const press = Math.min(ramp(t, a + 0.12, 0.06), 1 - ramp(t, a + 0.3, 0.12));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {i > 0 && <span style={{ fontFamily: SANS, fontSize: 36, fontWeight: 600, color: "rgba(255,255,255,0.6)", opacity: p }}>+</span>}
              <Cap k={k} p={p} press={press} size={size} />
            </div>
          );
        })}
        {label && <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 500, color: "#FFFFFF", marginLeft: 10, opacity: ramp(t, at + keys.length * 0.1, 0.3) }}>{label}</span>}
      </div>
    </div>
  );
};

export type SpotlightProps = { rect: Rect; at: number; out?: number; label?: string; side?: "top" | "bottom" | "left" | "right"; dim?: number; radius?: number };

// Callout: the surround dims, the hole irises in from 60 px wider onto the region, an accent outline glows, and a label tag hangs off one side.
export const Spotlight: FC<SpotlightProps> = ({ rect, at, out, label, side = "bottom", dim = 0.58, radius = 18 }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.5);
  const o = out === undefined ? 0 : ramp(t, out, 0.4);
  const v = p * (1 - o);
  if (v <= 0) return null;
  const g = 60 * (1 - ramp(t, at, 0.55, BACK(1.2)));
  const r = { x: rect.x - 10 - g, y: rect.y - 10 - g, w: rect.w + 20 + g * 2, h: rect.h + 20 + g * 2 };
  const B = 3000;
  const hole = `M ${r.x + radius} ${r.y} H ${r.x + r.w - radius} A ${radius} ${radius} 0 0 1 ${r.x + r.w} ${r.y + radius} V ${r.y + r.h - radius} A ${radius} ${radius} 0 0 1 ${r.x + r.w - radius} ${r.y + r.h} H ${r.x + radius} A ${radius} ${radius} 0 0 1 ${r.x} ${r.y + r.h - radius} V ${r.y + radius} A ${radius} ${radius} 0 0 1 ${r.x + radius} ${r.y} Z`;
  const lp = ramp(t, at + 0.3, 0.4, BACK(1.4));
  const anchor: Pt =
    side === "bottom" ? { x: r.x + r.w / 2, y: r.y + r.h + 26 } : side === "top" ? { x: r.x + r.w / 2, y: r.y - 26 } : side === "left" ? { x: r.x - 26, y: r.y + r.h / 2 } : { x: r.x + r.w + 26, y: r.y + r.h / 2 };
  const tf = side === "bottom" ? "translate(-50%, 0)" : side === "top" ? "translate(-50%, -100%)" : side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)";
  return (
    <>
      <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: v }}>
        <path d={`M ${-B} ${-B} H ${B} V ${B} H ${-B} Z ${hole}`} fillRule="evenodd" fill={`rgba(8,10,30,${dim})`} />
        <path d={hole} fill="none" stroke={ACCENT} strokeWidth={3.5} style={{ filter: `drop-shadow(0 0 12px ${ACCENT})` }} />
      </svg>
      {label && (
        <div style={{ position: "absolute", left: anchor.x, top: anchor.y, transform: `${tf} scale(${0.8 + 0.2 * lp})`, opacity: clamp01(lp) * (1 - o), whiteSpace: "nowrap", padding: "12px 26px", borderRadius: 16, background: ACCENT, color: "#FFFFFF", fontFamily: SANS, fontWeight: 600, fontSize: 34, boxShadow: `0 16px 36px -10px ${ACCENT}` }}>
          {label}
        </div>
      )}
    </>
  );
};

// Typed text at human timing: seeded per-key jitter, a longer beat after spaces. Returns what is on screen at t.
export const typeOut = (t: number, text: string, at: number, cps = 14, seed = 7) => {
  let clock = at;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const gap = (1 / cps) * (0.55 + 0.9 * random(`type-${seed}-${i}`)) * (text[i - 1] === " " ? 1.5 : 1);
    clock += gap;
    if (t >= clock) n = i + 1;
  }
  return { text: text.slice(0, n), typing: t >= at && n < text.length, done: n === text.length, end: clock };
};

// Caret: solid while typing, blinking 0.5 s on / 0.5 s off at rest.
export const caretOn = (t: number, typing: boolean) => typing || Math.floor(t * 2) % 2 === 0;

export type TypingOverlayProps = { text: string; at: number; cps?: number; x: number; y: number; w?: number; from?: Pt; label?: string; look?: Look; out?: number; mono?: boolean };

// Typed-input highlight: the field the creator is typing into, lifted out and magnified beside the UI, with a tether back to the real field.
export const TypingOverlay: FC<TypingOverlayProps> = ({ text, at, cps = 14, x, y, w = 760, from, label, look = "light", out, mono }) => {
  const { t } = useTime();
  const p = ramp(t, at - 0.35, 0.35, BACK(1.3));
  const o = out === undefined ? 0 : ramp(t, out, 0.3);
  if (p <= 0 || o >= 1) return null;
  const typed = typeOut(t, text, at, cps);
  const u = UI[look];
  return (
    <>
      {from && (
        <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: p * (1 - o) }}>
          <path d={`M ${from.x} ${from.y} Q ${(from.x + x) / 2} ${from.y} ${x} ${y}`} fill="none" stroke={ACCENT} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
          <circle cx={from.x} cy={from.y} r={8} fill={ACCENT} />
          <circle cx={from.x} cy={from.y} r={16} fill="none" stroke={ACCENT} strokeOpacity={0.4} strokeWidth={3} />
        </svg>
      )}
      <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * p})`, opacity: clamp01(p * 1.4) * (1 - o) }}>
        {label && <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12, marginLeft: 8 }}>{label}</div>}
        <div style={{ height: 104, borderRadius: 22, background: u.win, border: `3px solid ${ACCENT}`, boxShadow: `0 0 0 8px ${ACCENT}33, 0 30px 60px -18px rgba(0,0,0,0.5)`, display: "flex", alignItems: "center", padding: "0 32px", boxSizing: "border-box", fontFamily: mono ? MONO : SANS, fontSize: 48, fontWeight: 500, color: u.text, overflow: "hidden" }}>
          <span style={{ whiteSpace: "pre" }}>{typed.text}</span>
          {caretOn(t, typed.typing) && <span style={{ width: 4, height: 54, background: ACCENT, marginLeft: 3, borderRadius: 2 }} />}
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 28, color: u.faint }}>{typed.text.length}</span>
        </div>
      </div>
    </>
  );
};
