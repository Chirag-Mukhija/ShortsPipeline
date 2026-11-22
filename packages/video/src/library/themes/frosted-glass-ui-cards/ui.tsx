// Glass interface pieces: the scripted button (hover lift, press sink, glint), the elastic pill selector, the modal that pops from its trigger over a dimmed field, the toast stack and the mood switch that recolours the whole field.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { OUT, clamp01, ramp, steps, useTime } from "../../core/time";
import { CYAN, FIELDS, INK, MUTE, SANS, SERIF, SOFT, TEXT_SHADOW, fr, rgba, sp, type Field } from "./theme";
import { GlassCard, cursorAt, type CursorKey } from "./glass";
import { Icon, IconTile, Pointer, type IconName } from "./icons";
import { ColourField } from "./field";
import { SERIF_FILL, fillText } from "./type";

// ---------- button ----------
export type ButtonProps = { x: number; y: number; w: number; h?: number; label: string; icon?: IconName; at?: number; hoverAt?: number; pressAt?: number; out?: number; primary?: boolean };

// A press is a 4-frame sink and an 8-frame release; hover lifts and lights the rim.
export const pressCurve = (t: number, pressAt?: number) => (pressAt === undefined ? 0 : ramp(t, pressAt, fr(4)) * (1 - ramp(t, pressAt + fr(6), fr(8))));

export const GlassButton: FC<ButtonProps> = ({ x, y, w, h = 104, label, icon, at = 0, hoverAt, pressAt, out, primary = true }) => {
  const { t } = useTime();
  const hover = hoverAt === undefined ? 0 : ramp(t, hoverAt, 0.25);
  const press = pressCurve(t, pressAt);
  return (
    <GlassCard x={x} y={y} w={w} h={h} r={h / 2} at={at} out={out} enter="pop" tint={primary ? "cyan" : "clear"} lift={hover * 0.7 - press * 1.6} glow={hover * 0.6 + press * 0.4} glint={pressAt === undefined ? [] : [pressAt]} idleGlint={false} depth={10} float={false} contentStyle={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {icon && <Icon name={icon} size={40} color={INK} stroke={2.2} />}
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: INK }}>{label}</span>
    </GlassCard>
  );
};

// ---------- pill selector ----------
// Index position with a bouncy spring per hop; reads the keyed index at any time, so velocity is just a finite difference.
const hopAt = (t: number, keys: [number, number][]) => {
  let prev = keys[0]?.[1] ?? 0;
  let v = prev;
  for (const [k, idx] of keys.slice(1)) {
    v += (idx - prev) * sp(t, k, { damping: 11, stiffness: 210, mass: 0.8 });
    prev = idx;
  }
  return v;
};

export const PillSelector: FC<{ options: string[]; keys: [number, number][]; w: number; h?: number; accent?: string }> = ({ options, keys, w, h = 100, accent = CYAN }) => {
  const { t } = useTime();
  const n = options.length;
  const pad = 8;
  const ow = (w - pad * 2) / n;
  const idx = hopAt(t, keys);
  const vel = Math.abs(idx - hopAt(t - 1 / 30, keys));
  const stretch = Math.min(1, vel * 3);
  const thumbW = ow + stretch * ow * 0.55;
  const cx = pad + ow * (idx + 0.5);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: h / 2, background: "linear-gradient(170deg, rgba(10,6,40,0.28), rgba(10,6,40,0.14))", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 2px 6px rgba(10,5,40,0.35)" }}>
      <div style={{ position: "absolute", left: cx - thumbW / 2, top: pad, width: thumbW, height: h - pad * 2, borderRadius: h, transform: `scaleY(${1 - stretch * 0.16})`, background: `linear-gradient(170deg, rgba(255,255,255,0.42), rgba(255,255,255,0.16))`, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 1.5px 0 rgba(255,255,255,0.8), 0 12px 28px -10px rgba(10,5,40,0.6), 0 0 30px ${rgba(accent, 0.35)}` }} />
      {options.map((o, i) => {
        const near = clamp01(1 - Math.abs(idx - i));
        return (
          <div key={o} style={{ position: "absolute", left: pad + i * ow, top: 0, width: ow, height: h, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 34, color: interpolateColors(near, [0, 1], ["rgba(255,255,255,0.6)", "#FFFFFF"]) }}>
            {o}
          </div>
        );
      })}
    </div>
  );
};

// ---------- modal from its trigger ----------
// The dim is a frosted veil over the whole field, so whatever was on screen goes soft behind the modal.
export const DimVeil: FC<{ at: number; out?: number; amount?: number }> = ({ at, out, amount = 1 }) => {
  const { t } = useTime();
  const e = ramp(t, at, fr(12), OUT) * (out === undefined ? 1 : 1 - ramp(t, out, fr(10)));
  if (e <= 0) return null;
  return <AbsoluteFill style={{ background: `rgba(14,8,40,${0.38 * amount * e})`, backdropFilter: `blur(${8 * e}px)`, WebkitBackdropFilter: `blur(${8 * e}px)` }} />;
};

export const GlassModal: FC<{ x: number; y: number; w: number; h: number; from: { x: number; y: number }; at: number; out?: number; children: ReactNode }> = ({ x, y, w, h, from, at, out, children }) => (
  <GlassCard x={x} y={y} w={w} h={h} r={44} at={at} out={out} enter="pop" popCfg={{ damping: 14, stiffness: 150, mass: 0.9 }} origin={{ x: from.x - x, y: from.y - y }} tint="milk" glint={[at + 0.45]} depth={14} pad="52px 60px">
    {children}
  </GlassCard>
);

// ---------- toast stack ----------
export type Toast = { title: string; body: string; icon: IconName; t: number; color?: string; time?: string };

export const ToastStack: FC<{ toasts: Toast[]; x?: number; y?: number; w?: number; h?: number; gap?: number; life?: number; out?: number }> = ({ toasts, x = 500, y = 150, w = 920, h = 164, gap = 24, life = 3.2, out }) => {
  const { t } = useTime();
  return (
    <>
      {toasts.map((ts, i) => {
        // k = how many newer toasts have arrived (springy), which sets this one's slot.
        let k = 0;
        for (const nw of toasts.slice(i + 1)) k += sp(t, nw.t, { damping: 17, stiffness: 150 });
        const deep = Math.max(0, k - 2);
        const slotY = y + Math.min(k, 2) * (h + gap) + deep * 26;
        const slide = sp(t, ts.t, { damping: 14, stiffness: 160 });
        const col = ts.color ?? CYAN;
        const bar = ramp(t, ts.t + 0.2, life, (x0) => x0);
        // A folded toast shows only its glass edge; its text would muddle the one in front.
        const ink = clamp01(1 - deep * 2.5);
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: clamp01(1 - deep * 0.55), transform: `translateY(${(1 - slide) * -90}px)` }}>
            <GlassCard x={x + deep * 30} y={slotY} w={w - deep * 60} h={h} r={36} at={ts.t} out={out} enter="pop" dim={clamp01(deep)} tint={k < 0.5 ? "milk" : "clear"} glint={[ts.t + 0.3]} depth={12 - Math.min(k, 3) * 3} float={i} pad="0 40px 0 30px" contentStyle={{ justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: ink }}>
                <IconTile name={ts.icon} size={92} color={col} />
                <div style={{ flex: 1, minWidth: 0, fontFamily: SANS }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 800, fontSize: 40, color: INK, letterSpacing: "-0.01em" }}>{ts.title}</span>
                    <span style={{ fontWeight: 600, fontSize: 28, color: MUTE }}>{ts.time ?? "now"}</span>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 32, color: SOFT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ts.body}</div>
                </div>
              </div>
              <div style={{ position: "absolute", left: 36, right: 36, bottom: 14, height: 6, borderRadius: 3, opacity: ink, background: "rgba(255,255,255,0.14)" }}>
                <div style={{ width: `${bar * 100}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${rgba(col, 0.6)}, ${col})`, boxShadow: `0 0 12px ${rgba(col, 0.7)}` }} />
              </div>
            </GlassCard>
          </div>
        );
      })}
    </>
  );
};

// ---------- mood switch: the pill hops and the whole colour field recolours behind the glass ----------
export type Mood = { name: string; word: string; field: Field; accent: string };

export const MOODS: Mood[] = [
  { name: "Calm", word: "breathe.", field: FIELDS.lagoon!, accent: CYAN },
  { name: "Focus", word: "think.", field: FIELDS.dusk!, accent: "#B26BFF" },
  { name: "Energy", word: "ship it.", field: FIELDS.ember!, accent: "#FF7A59" },
];

export const MoodSwitch: FC<{ moods?: Mood[]; keys: [number, number][]; at?: number; out?: number; label?: string }> = ({ moods = MOODS, keys, at = 0, out, label = "Mode" }) => {
  const { t } = useTime();
  const mix = steps(t, keys.map(([k, i]) => [k, i] as [number, number]), 0.7);
  const accent = interpolateColors(mix, moods.map((_, i) => i), moods.map((m) => m.accent));
  const ring = ramp(t, at + 0.3, 0.8, OUT);
  return (
    <>
      <ColourField fields={moods.map((m) => m.field)} mix={mix} seed={2} />
      {/* Spheres take the current accent, so the colour change is seen through the glass. */}
      <MoodSphere x={1450} y={250} r={150} color={accent} />
      <MoodSphere x={500} y={830} r={120} color={interpolateColors(mix, moods.map((_, i) => i), moods.map((m) => m.field.blobs[2]!))} />
      <GlassCard x={420} y={210} w={1080} h={640} r={48} at={at} out={out} pad="56px 64px" glint={keys.slice(1).map(([k]) => k + 0.15)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", textTransform: "uppercase", color: SOFT }}>{label}</span>
          <PillSelector options={moods.map((m) => m.name)} keys={keys} w={640} accent={accent} />
        </div>
        <div style={{ position: "relative", flex: 1, marginTop: 30 }}>
          {moods.map((m, i) => {
            const d = i - mix;
            const o = clamp01(1 - Math.abs(d) * 1.6);
            if (o <= 0) return null;
            return (
              <div key={m.name} style={{ position: "absolute", left: 0, top: 70, fontFamily: SERIF, fontSize: 230, lineHeight: 1, opacity: o, transform: `translateY(${d * 70}px)`, filter: Math.abs(d) > 0.02 ? `blur(${Math.abs(d) * 10}px)` : undefined, ...fillText(SERIF_FILL) }}>
                {m.word}
              </div>
            );
          })}
          <svg width={220} height={220} viewBox="-110 -110 220 220" style={{ position: "absolute", right: 0, top: 60, overflow: "visible" }}>
            <circle r={92} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={10} />
            <circle r={92} fill="none" stroke={accent} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${0.28 * ring} 1`} transform={`rotate(${-90 + mix * 120})`} style={{ filter: `drop-shadow(0 0 10px ${accent})` }} />
            {Array.from({ length: 24 }, (_, i) => (
              <line key={i} x1={0} y1={-66} x2={0} y2={i % 6 ? -60 : -54} stroke="rgba(255,255,255,0.45)" strokeWidth={3} strokeLinecap="round" transform={`rotate(${i * 15 + mix * 40})`} />
            ))}
            <text y={16} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={46} fill={INK}>{Math.round(mix + 1)}/{moods.length}</text>
          </svg>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: SOFT, textShadow: TEXT_SHADOW, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: accent, boxShadow: `0 0 16px ${accent}` }} />
          The whole room changes colour behind the glass.
        </div>
      </GlassCard>
    </>
  );
};

const MoodSphere: FC<{ x: number; y: number; r: number; color: string }> = ({ x, y, r, color }) => {
  const { f } = useTime();
  const dx = Math.sin(f / 80) * 20;
  return <div style={{ position: "absolute", left: x - r + dx, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle at 32% 28%, #FFFFFF 0%, ${color} 45%, rgba(20,10,60,0.9) 120%)`, boxShadow: `0 0 ${r * 0.7}px ${color}` }} />;
};

// ---------- scripted pointer ----------
// A pointer that glides between keyed screen points and squashes on each press time.
export const ScriptedPointer: FC<{ path: CursorKey[]; presses?: number[]; at?: number; out?: number }> = ({ path, presses = [], at = 0, out }) => {
  const { t } = useTime();
  const o = ramp(t, at, 0.3) * (out === undefined ? 1 : 1 - ramp(t, out, 0.3));
  if (o <= 0) return null;
  const p = cursorAt(t, path, 0.7);
  const press = presses.reduce((m, pt) => Math.max(m, pressCurve(t, pt)), 0);
  return <Pointer x={p.x} y={p.y} press={press} opacity={o} />;
};

