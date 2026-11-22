// Bento type pieces: the two-tone headline that lights up, a claim whose key word lands on the spoken word, a big counted stat, a quote and a source lower third.
import type { CSSProperties, FC, ReactNode } from "react";
import { interpolate } from "remotion";
import { ramp, useTime } from "../../core/time";
import { H } from "../../core/video";
import { EXIT, EXPO, HUE, MONO, MUTED, SANS, TEXT, TRACK, fr, hair, litCol, withAlpha } from "./theme";
import { Avatar, Card, IconTile, Mono, PulseDot, appear, exitStyle, type IconName } from "./primitives";

const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);

export type TwoToneProps = {
  lead: string;
  tail?: string;
  // Entrance start (s): words fade up 2 frames apart.
  at: number;
  // When the grey tail lights to white, left to right over 24 frames.
  litAt?: number;
  out?: number;
  eyebrow?: string;
  size?: number;
  x?: number;
  y?: number;
  width?: number;
  align?: "left" | "center";
  weight?: number;
  style?: CSSProperties;
};

// White lead clause + grey tail, the Linear sentence; the tail can "light up" on a cue.
export const TwoToneHeadline: FC<TwoToneProps> = ({ lead, tail, at, litAt, out, eyebrow, size = 84, x = 96, y = 160, width = 1500, align = "left", weight = 500, style }) => {
  const { t } = useTime();
  const L = words(lead);
  const T = words(tail);
  const eb = appear(t, at - fr(4));
  return (
    <div style={{ position: "absolute", left: x, top: y, width, textAlign: align, ...style, ...exitStyle(t, out) }}>
      {eyebrow && (
        <div style={{ ...eb.style, marginBottom: size * 0.42 }}>
          <Mono>{eyebrow}</Mono>
        </div>
      )}
      <div style={{ fontFamily: SANS, fontWeight: weight, fontSize: size, lineHeight: 1.08, letterSpacing: TRACK }}>
        {[...L, ...T].map((w, i) => {
          const a = appear(t, at + fr(2 * i), { y: Math.max(12, size * 0.14) });
          const j = i - L.length;
          const lit = j < 0 ? 1 : litAt === undefined ? 0 : ramp(t, litAt + fr(24) * (j / Math.max(1, T.length)), fr(8));
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.24em", color: litCol(lit), ...a.style }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export type LitWord = { w: string; t: number; key?: boolean };

// A claim said word by word: each word fades up 3 frames before it's spoken in grey; key words land white with a hue hairline drawing under them.
export const LitLine: FC<{ words: LitWord[]; y?: number; size?: number; hue?: string; out?: number; width?: number }> = ({ words: ws, y = 540, size = 104, hue = HUE.indigo, out, width = 1600 }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: (1920 - width) / 2, width, top: y - size * 0.6, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: size, lineHeight: 1.15, letterSpacing: TRACK, ...exitStyle(t, out) }}>
      {ws.map((wd, i) => {
        const a = appear(t, wd.t - fr(3), { y: 14 });
        const lit = wd.key ? ramp(t, wd.t, fr(10), EXPO) : 0;
        const line = wd.key ? ramp(t, wd.t + fr(3), fr(14), EXPO) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", marginRight: "0.24em", color: wd.key ? litCol(0.4 + 0.6 * lit) : MUTED, textShadow: wd.key ? `0 0 ${40 * lit}px ${withAlpha(hue, 0.55 * lit)}` : undefined, ...a.style }}>
            {wd.w}
            {wd.key && (
              <span style={{ position: "absolute", left: 0, right: 0, bottom: "0.02em", height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${withAlpha(hue, 0.2)}, ${hue}, ${withAlpha(hue, 0.2)})`, transform: `scaleX(${line})`, transformOrigin: "0 50%", boxShadow: `0 0 18px ${withAlpha(hue, 0.8)}` }} />
            )}
          </span>
        );
      })}
    </div>
  );
};

export type BigStatProps = {
  value: number;
  // Count starts here (s) and runs d seconds, expo-out; time it to finish on the spoken number.
  at: number;
  d?: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  eyebrow?: string;
  lead?: string;
  tail?: string;
  // Optional series drawn as an edge-faded hairline area behind the number.
  series?: number[];
  hue?: string;
  out?: number;
};

const fmt = (v: number, decimals: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// A huge tabular number counting up, a 6-frame punch when it lands, then its two-tone caption.
export const BigStat: FC<BigStatProps> = ({ value, at, d = 1.2, from = 0, decimals = 0, prefix = "", suffix = "", eyebrow, lead, tail, series, hue = HUE.indigo, out }) => {
  const { t } = useTime();
  const c = ramp(t, at, d, EXPO);
  const v = from + (value - from) * c;
  const punch = interpolate(t, [at + d * 0.55, at + d * 0.55 + fr(3), at + d * 0.55 + fr(8)], [1, 1.035, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const box = appear(t, at - fr(8), { y: 20 });
  const cap = at + d * 0.55 + fr(8);
  return (
    <div style={{ position: "absolute", inset: 0, ...exitStyle(t, out) }}>
      {series && <StatArea series={series} at={at} d={d} hue={hue} />}
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center" }}>
        {eyebrow && (
          <div style={appear(t, at - fr(12)).style}>
            <Mono>{eyebrow}</Mono>
          </div>
        )}
        <div style={{ ...box.style, marginTop: 20, fontFamily: SANS, fontWeight: 600, fontSize: 300, lineHeight: 1, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ display: "inline-block", transform: `scale(${punch})`, background: `linear-gradient(180deg, ${TEXT} 30%, #9EA3AB 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {prefix}
            {fmt(v, decimals)}
            <span style={{ fontSize: "0.5em", color: MUTED, WebkitTextFillColor: MUTED, marginLeft: "0.06em" }}>{suffix}</span>
          </span>
        </div>
        {lead && (
          <div style={{ ...appear(t, cap).style, marginTop: 34, fontFamily: SANS, fontWeight: 500, fontSize: 52, letterSpacing: TRACK, color: TEXT }}>
            {lead} <span style={{ color: MUTED }}>{tail}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// The series behind a stat: hairline area that draws left to right with the count and fades at its edges.
const StatArea: FC<{ series: number[]; at: number; d: number; hue: string }> = ({ series, at, d, hue }) => {
  const { t, f } = useTime();
  const x0 = 96;
  const x1 = 1824;
  const top = 560;
  const base = 1000;
  const max = Math.max(...series);
  const pts = series.map((s, i) => [x0 + ((x1 - x0) * i) / (series.length - 1), base - ((base - top) * s) / max] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${line} L${x1} ${base} L${x0} ${base} Z`;
  const p = ramp(t, at - fr(6), d + 0.3, EXPO);
  const last = pts[pts.length - 1]!;
  const k = (f % 45) / 45;
  const mask = "linear-gradient(90deg, transparent 0%, black 25%, black 100%)";
  return (
    <svg width={1920} height={H} style={{ position: "absolute", inset: 0, maskImage: mask, WebkitMaskImage: mask }}>
      <defs>
        <linearGradient id="bento-stat-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hue} stopOpacity={0.22} />
          <stop offset="1" stopColor={hue} stopOpacity={0} />
        </linearGradient>
        <clipPath id="bento-stat-clip">
          <rect x={0} y={0} width={x0 + (x1 - x0) * p + 4} height={H} />
        </clipPath>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={x0} x2={x1} y1={top + ((base - top) * i) / 3} y2={top + ((base - top) * i) / 3} stroke={hair(0.05)} strokeDasharray="4 8" />
      ))}
      <g clipPath="url(#bento-stat-clip)">
        <path d={area} fill="url(#bento-stat-fill)" />
        <path d={line} fill="none" stroke={hue} strokeWidth={3} strokeLinejoin="round" />
      </g>
      {p > 0.98 && (
        <>
          <circle cx={last[0]} cy={last[1]} r={8 + 22 * k} fill="none" stroke={hue} strokeOpacity={(1 - k) * 0.6} strokeWidth={2} />
          <circle cx={last[0]} cy={last[1]} r={8} fill={TEXT} />
        </>
      )}
    </svg>
  );
};

// A pull quote: two-tone text that lights up as it's read, then the person, then (optionally) whatever sits under it.
export const QuoteBlock: FC<{ lead: string; tail?: string; who: string; role: string; at: number; litAt?: number; hue?: string; out?: number; y?: number; children?: ReactNode }> = ({ lead, tail, who, role, at, litAt, hue = HUE.indigo, out, y = 170, children }) => {
  const { t } = useTime();
  const n = words(lead).length + words(tail).length;
  const by = appear(t, at + fr(2 * n + 10));
  const mark = appear(t, at - fr(6), { y: 0, s: 0.9 });
  return (
    <div style={{ position: "absolute", inset: 0, ...exitStyle(t, out) }}>
      <div style={{ position: "absolute", left: 200, top: y - 30, fontFamily: SANS, fontWeight: 600, fontSize: 200, lineHeight: 1, color: withAlpha(hue, 0.6), ...mark.style }}>“</div>
      <TwoToneHeadline lead={lead} tail={tail} at={at} litAt={litAt} size={72} x={310} y={y + 40} width={1340} />
      <div style={{ position: "absolute", left: 310, top: y + 400, display: "flex", alignItems: "center", gap: 24, ...by.style }}>
        <Avatar name={who} hue={hue} size={72} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 38, color: TEXT, letterSpacing: "-0.01em" }}>{who}</div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 32, color: MUTED }}>{role}</div>
        </div>
      </div>
      {children}
    </div>
  );
};

// Lower third for a source, a tool or a speaker: a hairline toast bottom-left with a mono kicker and a breathing status dot.
export const SourceLabel: FC<{ kicker?: string; title: string; meta?: string; icon?: IconName; at: number; out?: number; hue?: string; x?: number; y?: number }> = ({ kicker = "Source", title, meta, icon = "globe", at, out, hue = HUE.indigo, x = 96, y = H - 96 - 150 }) => {
  const { t } = useTime();
  const a = appear(t, at, { d: 12, y: 16 });
  const lit = ramp(t, at + fr(4), fr(14)) * (1 - 0.6 * ramp(t, at + fr(30), fr(20)));
  const text = appear(t, at + fr(3), { d: 12, y: 8 });
  const e = out === undefined ? 0 : ramp(t, out, fr(8), EXIT);
  return (
    <div style={{ position: "absolute", left: x, top: y, ...a.style, opacity: (a.style.opacity as number) * (1 - e), filter: e ? `blur(${8 * e}px)` : undefined }}>
      <Card lit={lit} glow={hue} radius={18} style={{ height: 150 }}>
        <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 28, padding: "0 40px 0 30px", ...text.style }}>
          <IconTile name={icon} hue={hue} size={78} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Mono>{kicker}</Mono>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, color: TEXT, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
              {title}
              {meta && <span style={{ color: MUTED, fontFamily: MONO, fontSize: 30, marginLeft: 20, letterSpacing: 0 }}>{meta}</span>}
            </div>
          </div>
          <span style={{ marginLeft: 24 }}>
            <PulseDot color={HUE.green} size={14} />
          </span>
        </div>
      </Card>
    </div>
  );
};

// A short two-tone line in body size: captions under stages and cards.
export const TwoToneLine: FC<{ lead: string; tail?: string; size?: number; style?: CSSProperties }> = ({ lead, tail, size = 40, style }) => (
  <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: size, letterSpacing: "-0.015em", lineHeight: 1.25, color: TEXT, ...style }}>
    {lead} {tail && <span style={{ color: MUTED }}>{tail}</span>}
  </div>
);
