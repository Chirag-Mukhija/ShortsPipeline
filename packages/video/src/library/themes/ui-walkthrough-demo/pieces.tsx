// Narration pieces in the walkthrough language: the app-launch title card, a widget-style big stat, step chapter cards, the creator lower third and the source chip.
import type { FC, ReactNode } from "react";
import { Easing, spring, useVideoConfig } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, BACK, GOOD, MONO, PILL_BG, SANS, UI, VIOLET, type Look } from "./theme";
import { AppIcon, Icon } from "./app";
import { PhoneFrame } from "./window";
import { Cursor } from "./cursor";

const rise = (t: number, at: number, d = 0.45) => {
  const p = ramp(t, at, d, Easing.bezier(0.22, 1, 0.36, 1));
  return { opacity: clamp01(p * 1.6), transform: `translateY(${(1 - p) * 28}px)` };
};

// [bracketed] words take the accent, as in the caption pill.
const Accent: FC<{ text: string; color?: string }> = ({ text, color = "#9DB8FF" }) => (
  <>{text.split(/(\[[^\]]+\])/).map((s, i) => (s.startsWith("[") ? <span key={i} style={{ color }}>{s.slice(1, -1)}</span> : <span key={i}>{s}</span>))}</>
);

export type TitleCardProps = { kicker: string; title: string[]; sub?: string; at: number; tag?: string; phone?: ReactNode; phoneSrc?: string };

// Hook / title: an app-launch card. The icon drops in, the title lines rise, and the app itself arrives on a phone.
export const TitleCard: FC<TitleCardProps> = ({ kicker, title, sub, at, tag, phone, phoneSrc }) => {
  const { t, f } = useTime();
  const { fps } = useVideoConfig();
  const ic = spring({ frame: f - Math.round(at * fps), fps, config: { damping: 12, stiffness: 160 } });
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 200, width: 1000, fontFamily: SANS, color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <AppIcon size={128} style={{ transform: `scale(${0.4 + 0.6 * ic}) rotate(${(1 - ic) * -14}deg)`, opacity: clamp01(ic * 2) }} />
          <div style={{ ...rise(t, at + 0.2), fontFamily: MONO, fontSize: 28, fontWeight: 700, letterSpacing: 2, padding: "10px 20px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>{kicker}</div>
        </div>
        <div style={{ marginTop: 46 }}>
          {title.map((l, i) => (
            <div key={i} style={{ ...rise(t, at + 0.35 + i * 0.14), fontSize: 100, fontWeight: 700, letterSpacing: -3.5, lineHeight: 1.06 }}>
              <Accent text={l} />
            </div>
          ))}
        </div>
        {sub && <div style={{ ...rise(t, at + 0.75), marginTop: 30, fontSize: 40, fontWeight: 500, color: "rgba(255,255,255,0.72)", maxWidth: 880 }}>{sub}</div>}
        {tag && (
          <div style={{ ...rise(t, at + 0.9), marginTop: 44, display: "flex", gap: 16 }}>
            <div style={{ padding: "14px 40px", borderRadius: 999, background: ACCENT, fontSize: 34, fontWeight: 700, boxShadow: `0 14px 30px -10px ${ACCENT}` }}>{tag}</div>
            <div style={{ padding: "14px 30px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.3)", fontSize: 34, fontWeight: 600, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: MONO }}>⌘</span> Open
            </div>
          </div>
        )}
      </div>
      <PhoneFrame x={1470} y={548} h={860} at={at + 0.5} tilt={-4} src={phoneSrc}>
        {phone}
      </PhoneFrame>
    </>
  );
};

export type StatWidgetProps = { value: number; at: number; label: string; prefix?: string; suffix?: string; decimals?: number; delta?: string; foot?: string; dur?: number; look?: Look; spark?: number[] };

// Big number as a desktop widget: the card springs up, the value counts in out-expo with tabular digits, punches 1.0 → 1.06 on landing, a sparkline draws and the pointer reads the last point.
export const StatWidget: FC<StatWidgetProps> = ({ value, at, label, prefix = "", suffix = "", decimals = 0, delta, foot, dur = 1.2, look = "light", spark = [8, 12, 10, 15, 14, 19, 18, 24, 23, 30, 34, 41] }) => {
  const { t, f } = useTime();
  const { fps } = useVideoConfig();
  const u = UI[look];
  const card = spring({ frame: f - Math.round(at * fps), fps, config: { damping: 18, stiffness: 150 } });
  const c = ramp(t, at + 0.15, dur, Easing.out(Easing.exp));
  const land = at + 0.15 + dur;
  const punch = 1 + 0.06 * Math.sin(Math.PI * clamp01((t - land + 0.05) / 0.18));
  const sp = ramp(t, at + 0.4, 1.0, Easing.inOut(Easing.cubic));
  const W0 = 980;
  const H0 = 560;
  const mx = Math.max(...spark);
  const pts = spark.map((v, i) => [40 + (i / (spark.length - 1)) * (W0 - 140), 150 - (v / mx) * 130] as const);
  const n = Math.max(1, Math.floor(sp * (pts.length - 1)));
  const shown = [...pts.slice(0, n), pts[Math.min(pts.length - 1, n)]!].map((p) => p.join(",")).join(" ");
  const last = pts[pts.length - 1]!;
  const lx = 470 + last[0];
  const ly = 540 - H0 / 2 + 330 + last[1];
  return (
    <>
      <div style={{ position: "absolute", left: 960 - W0 / 2, top: 540 - H0 / 2, width: W0, height: H0, borderRadius: 44, background: u.win, boxShadow: "0 40px 90px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.3)", opacity: clamp01(card * 2), transform: `translateY(${(1 - card) * 30}px) scale(${0.92 + 0.08 * card})`, fontFamily: SANS, color: u.text, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 56, top: 50, display: "flex", alignItems: "center", gap: 18 }}>
          <AppIcon size={52} />
          <span style={{ fontSize: 38, fontWeight: 600, color: u.soft }}>{label}</span>
        </div>
        {delta && (
          <div style={{ position: "absolute", right: 56, top: 52, padding: "8px 20px", borderRadius: 999, background: `${GOOD}22`, color: GOOD, fontSize: 32, fontWeight: 700, opacity: ramp(t, land + 0.2, 0.3) }}>{delta}</div>
        )}
        <div style={{ position: "absolute", left: 52, top: 112, fontSize: 210, fontWeight: 700, letterSpacing: -9, fontVariantNumeric: "tabular-nums", transform: `scale(${punch})`, transformOrigin: "0 60%" }}>
          {prefix}
          {(value * c).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          <span style={{ color: ACCENT }}>{suffix}</span>
        </div>
        <svg width={W0} height={200} style={{ position: "absolute", left: 0, top: 330 }}>
          <defs>
            <linearGradient id="sw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ACCENT} stopOpacity={0.28} />
              <stop offset="1" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={`${pts[0]![0]},170 ${shown} ${pts[Math.min(pts.length - 1, n)]![0]},170`} fill="url(#sw-fill)" />
          <polyline points={shown} fill="none" stroke={ACCENT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          {sp >= 1 && <circle cx={last[0]} cy={last[1]} r={11} fill={ACCENT} stroke={u.win} strokeWidth={4} />}
        </svg>
        {foot && <div style={{ position: "absolute", left: 56, bottom: 30, fontSize: 30, color: u.faint, fontWeight: 500 }}>{foot}</div>}
      </div>
      {sp >= 1 && (
        <div style={{ position: "absolute", left: lx - 120, top: ly - 104, padding: "10px 22px", borderRadius: 14, background: "#14161F", color: "#FFFFFF", fontFamily: SANS, fontSize: 30, fontWeight: 600, opacity: ramp(t, at + 1.5, 0.25), whiteSpace: "nowrap" }}>
          Today · <span style={{ color: "#9DB8FF" }}>{spark[spark.length - 1]}</span>
        </div>
      )}
      <Cursor p={{ x: lx + 6 + (1 - ramp(t, at + 0.9, 0.6, BACK(1))) * 200, y: ly + 10 + (1 - ramp(t, at + 0.9, 0.6, BACK(1))) * 160 }} at={at + 0.9} size={44} />
    </>
  );
};

export type ChapterCardProps = { n: number; total: number; title: string; sub?: string; steps: string[]; at: number; out?: number };

// Step chapter: "STEP 02 / 04" and the title on the left, the whole checklist on the right with done steps ticked, this one lit, the rest waiting.
export const ChapterCard: FC<ChapterCardProps> = ({ n, total, title, sub, steps, at, out }) => {
  const { t } = useTime();
  const o = out === undefined ? 0 : ramp(t, out, 0.3);
  const card = ramp(t, at + 0.2, 0.5, BACK(1.2));
  const pulse = 0.5 + 0.5 * Math.sin((t - at) * 4);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o, fontFamily: SANS, color: "#FFFFFF" }}>
      <div style={{ position: "absolute", left: 150, top: 300, width: 760 }}>
        <div style={{ ...rise(t, at), fontFamily: MONO, fontSize: 32, fontWeight: 700, letterSpacing: 3, color: "#9DB8FF" }}>
          STEP {String(n).padStart(2, "0")} <span style={{ opacity: 0.5 }}>/ {String(total).padStart(2, "0")}</span>
        </div>
        <div style={{ ...rise(t, at + 0.12), marginTop: 22, fontSize: 104, fontWeight: 700, letterSpacing: -3.5, lineHeight: 1.05 }}>{title}</div>
        {sub && <div style={{ ...rise(t, at + 0.3), marginTop: 26, fontSize: 40, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{sub}</div>}
        <div style={{ ...rise(t, at + 0.4), marginTop: 46, display: "flex", gap: 10 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{ width: 120, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(i < n - 1 ? 1 : i === n - 1 ? ramp(t, at + 0.5, 0.8) : 0) * 100}%`, background: ACCENT, borderRadius: 5 }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1040, top: 540, width: 740, transform: `translateY(-50%) translateY(${(1 - card) * 40}px) scale(${0.94 + 0.06 * card})`, opacity: clamp01(card * 1.5), borderRadius: 34, background: "rgba(255,255,255,0.96)", boxShadow: "0 40px 90px -20px rgba(0,0,0,0.5)", padding: "22px 30px", boxSizing: "border-box", color: "#14161F" }}>
        {steps.map((s, i) => {
          const done = i < n - 1;
          const now = i === n - 1;
          const p = ramp(t, at + 0.35 + i * 0.08, 0.35);
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 22, height: 104, borderBottom: i < steps.length - 1 ? "1px solid #E4E6EE" : "none", opacity: p, transform: `translateX(${(1 - p) * 20}px)` }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? GOOD : now ? ACCENT : "transparent", border: done || now ? "none" : "3px solid #D3D7E2", boxShadow: now ? `0 0 0 ${6 + pulse * 6}px ${ACCENT}33` : "none", color: "#FFFFFF", fontFamily: MONO, fontWeight: 700, fontSize: 26 }}>
                {done ? <Icon name="check" size={28} w={3.2} color="#FFFFFF" /> : now ? n : null}
              </div>
              <div style={{ fontSize: 38, fontWeight: now ? 700 : 500, color: done ? "#9AA0B2" : now ? "#14161F" : "#5D6375", textDecoration: done ? "line-through" : "none", textDecorationThickness: 2 }}>{s}</div>
              {now && <div style={{ marginLeft: "auto", fontSize: 28, fontWeight: 600, color: ACCENT, padding: "6px 16px", borderRadius: 999, background: `${ACCENT}18` }}>now</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type LowerThirdProps = { name: string; role: string; at: number; out?: number; avatar?: ReactNode; x?: number; y?: number };

// Lower third: a glass card that slides in 12 f from the left with an accent spine; text trails the plate by 3 f.
export const LowerThird: FC<LowerThirdProps> = ({ name, role, at, out, avatar, x = 96, y = 984 }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.4, Easing.bezier(0.22, 1, 0.36, 1));
  const tx = ramp(t, at + 0.1, 0.4, Easing.bezier(0.22, 1, 0.36, 1));
  const o = out === undefined ? 0 : ramp(t, out, 0.27);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(-100%) translateX(${(1 - p) * -60}px)`, opacity: clamp01(p * 2) * (1 - o), display: "flex", alignItems: "center", gap: 22, padding: "20px 40px 20px 20px", borderRadius: 26, background: PILL_BG, backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 24px 50px -16px rgba(0,0,0,0.6)", fontFamily: SANS, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: `linear-gradient(${ACCENT}, ${VIOLET})` }} />
      {avatar ?? <AppIcon size={76} />}
      <div style={{ opacity: tx, transform: `translateX(${(1 - tx) * 14}px)` }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: "#FFFFFF", letterSpacing: -0.5 }}>{name}</div>
        <div style={{ fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{role}</div>
      </div>
    </div>
  );
};

// Source chip: where a fact or a screen comes from, quiet in the bottom-right corner.
export const SourceChip: FC<{ text: string; label?: string; at: number; out?: number; x?: number; y?: number }> = ({ text, label = "Source", at, out, x = 1824, y = 984 }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.35, BACK(1.2));
  const o = out === undefined ? 0 : ramp(t, out, 0.27);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-100%, -100%) translateY(${(1 - p) * 16}px)`, opacity: clamp01(p * 1.5) * (1 - o), display: "flex", alignItems: "center", gap: 14, padding: "12px 24px 12px 14px", borderRadius: 999, background: "rgba(255,255,255,0.94)", boxShadow: "0 16px 36px -14px rgba(0,0,0,0.5)", fontFamily: SANS, whiteSpace: "nowrap" }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: `${ACCENT}22`, color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="link" size={24} w={2.4} />
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, color: "#5D6375", textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 500, color: "#14161F" }}>{text}</span>
    </div>
  );
};
