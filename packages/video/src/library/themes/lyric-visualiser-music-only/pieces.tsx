// Lyric visualiser pieces: title card, beat-counted stat, then/now, quote, section title, source label, progress tick, glowing curve chart and the constellation flow.
import type { FC } from "react";
import { INOUT, OUT, ramp } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { ENERGY, useSong, type Cue, type Section } from "./beat";
import { WaveformLine } from "./atmosphere";
import { LEAD, LyricLine, lineOut, wordIn } from "./type";
import { DAY, M, NIGHT, SERIF, alpha, glow, label, mix, voice, type Palette } from "./theme";

const fadeOut = (t: number, out: number | undefined) => (out === undefined ? 1 : 1 - ramp(t, out, 10 / FPS, OUT));

// Opening card: a wide-tracked kicker settles in, the title lands one word per beat, the waveform line grows out from under it.
export const TitleCard: FC<{ title: string; at: Cue; kicker?: string; sub?: string; stress?: number[]; size?: number; out?: Cue; wave?: boolean }> = ({
  title,
  at,
  kicker,
  sub,
  stress = [],
  size = 190,
  out,
  wave = true,
}) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const n = title.split(/\s+/).length;
  const done = a + n * clock.spb;
  const o = out === undefined ? undefined : clock.cue(out);
  const k = ramp(t, a - clock.spb, 0.9, OUT);
  return (
    <div style={{ position: "absolute", inset: 0, ...lineOut(t, o, "blur") }}>
      {kicker && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - size * 0.95, textAlign: "center", ...voice("cool", 34), textTransform: "uppercase", letterSpacing: `${0.6 - 0.28 * k}em`, color: alpha(NIGHT.ink, 0.72), opacity: k }}>
          {kicker}
        </div>
      )}
      <LyricLine words={title} at={a} stagger="beat" v="emo" size={size} stress={stress} y={H / 2 + 10} />
      {wave && <WaveformLine y={H / 2 + size * 0.78} x0={W / 2 - 520} x1={W / 2 + 520} amp={30} bins={64} draw={ramp(t, done - clock.spb / 2, clock.spBar, INOUT)} opacity={0.85} />}
      {sub && (
        <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 + size * 0.78 + 64, textAlign: "center", ...voice("cool", 38), color: alpha(NIGHT.ink, 0.8), ...wordIn(t, done, "cool") }}>{sub}</div>
      )}
    </div>
  );
};

// A number that counts on the beat: one step per beat for `beats` beats, landing with an accent bloom; the label arrives 8 f after.
export const StatGlow: FC<{ value: number; at: Cue; from?: number; beats?: number; decimals?: number; prefix?: string; suffix?: string; label?: string; size?: number; y?: number; out?: Cue }> = ({
  value,
  at,
  from = 0,
  beats = 4,
  decimals = 0,
  prefix = "",
  suffix = "",
  label: lab,
  size = 300,
  y = H / 2 - 40,
  out,
}) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const land = a + (beats - 1) * clock.spb;
  const step = Math.max(0, Math.min(beats - 1, Math.floor((t - a) / clock.spb + 1e-6)));
  const p = beats <= 1 ? 1 : step / (beats - 1);
  const shown = t < a ? from : from + (value - from) * (1 - Math.pow(1 - p, 2));
  const beatHit = t >= a ? Math.exp(-(((t - a) % clock.spb) / 0.12)) : 0;
  const landed = t >= land ? Math.exp(-(t - land) / 0.5) : 0;
  const settled = ramp(t, land, 0.3, OUT);
  const e = ramp(t, a - clock.spb, 0.5, OUT);
  const fmt = shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const tick = 40;
  const o = out === undefined ? undefined : clock.cue(out);
  return (
    <div style={{ position: "absolute", inset: 0, ...lineOut(t, o, "blur") }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: `translateY(-50%) scale(${1 + 0.025 * beatHit + 0.05 * landed})`, textAlign: "center", opacity: e }}>
        <span style={{ fontFamily: SERIF, fontStyle: "normal", fontWeight: 300, fontSize: size, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums lining-nums", color: mix(NIGHT.ink, NIGHT.accent, 0.6 * landed), textShadow: glow(NIGHT.accent, 1 + 1.2 * settled + 2.5 * landed) }}>
          {prefix}
          {fmt}
        </span>
        {suffix && <span style={{ ...voice("emo", size * 0.42), color: NIGHT.accent, marginLeft: 12, textShadow: glow(NIGHT.accent, 1.6), opacity: settled }}>{suffix}</span>}
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: beats }, (_, i) => {
          const x = W / 2 - ((beats - 1) * (tick + 18)) / 2 + i * (tick + 18);
          const lit = t >= a + i * clock.spb ? 1 : 0;
          const col = i === beats - 1 ? NIGHT.accent : NIGHT.ink;
          return <line key={i} x1={x - tick / 2} x2={x + tick / 2} y1={y + size * 0.62} y2={y + size * 0.62} stroke={lit ? col : alpha(NIGHT.muted, 0.6)} strokeWidth={4} strokeLinecap="round" style={{ filter: lit ? `drop-shadow(0 0 6px ${alpha(col, 0.8)})` : undefined }} />;
        })}
      </svg>
      {lab && (
        <div style={{ position: "absolute", left: M, right: M, top: y + size * 0.62 + 56, textAlign: "center", ...voice("cool", 40), textTransform: "uppercase", letterSpacing: "0.2em", color: alpha(NIGHT.ink, 0.86), ...wordIn(t, land + 8 / FPS, "cool") }}>{lab}</div>
      )}
    </div>
  );
};

// Then / now: a cool, muted left line; a bar later the emotive right line lands with a glow and the left one recedes. A pulsing waveform stands between them.
export const ThenNow: FC<{ a: { tag: string; text: string }; b: { tag: string; text: string; stress?: number[] }; at: Cue; bAt?: Cue }> = ({ a, b, at, bAt }) => {
  const { t, clock } = useSong();
  const ta = clock.cue(at);
  const tb = bAt === undefined ? ta + clock.spBar : clock.cue(bAt);
  const recede = ramp(t, tb, 0.5, INOUT);
  const colW = W / 2 - 90 - M;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: M, width: colW, top: H / 2, transform: "translateY(-50%)" }}>
        <div style={{ ...label(30), color: NIGHT.muted, marginBottom: 30, ...wordIn(t, ta, "cool") }}>{a.tag}</div>
        <div style={{ opacity: 1 - 0.45 * recede, filter: recede > 0.01 ? `blur(${1.4 * recede}px)` : undefined }}>
          <LyricLine words={a.text} at={ta + 4 / FPS} v="cool" size={68} align="left" inline color="#CFC8EA" />
        </div>
      </div>
      <div style={{ position: "absolute", left: W / 2 + 90, width: colW, top: H / 2, transform: "translateY(-50%)" }}>
        <div style={{ ...label(30), color: NIGHT.accent, marginBottom: 30, ...wordIn(t, tb, "cool") }}>{b.tag}</div>
        <LyricLine words={b.text} at={tb + 4 / FPS} v="emo" size={124} align="left" inline stress={b.stress} />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: "rotate(90deg)", opacity: ramp(t, ta, 0.6, OUT) }}>
        <WaveformLine y={H / 2} x0={W / 2 - 320} x1={W / 2 + 320} amp={30} bins={40} color={mix(NIGHT.muted, NIGHT.second, recede)} opacity={0.75 + 0.25 * recede} width={2.5} />
      </div>
    </div>
  );
};

// A quote in Fraunces italic, word by word, line by line every half bar; a soft giant quote mark behind and the attribution a beat after. Night or day.
export const QuoteCard: FC<{ lines: string[]; at: Cue; by?: string; accentWords?: string[]; day?: boolean; size?: number }> = ({ lines, at, by, accentWords = [], day, size = 92 }) => {
  const { t, clock } = useSong();
  const pal: Palette = day ? DAY : NIGHT;
  const a = clock.cue(at);
  const lineAt = (i: number) => a + i * clock.spb * 2;
  const byAt = lineAt(lines.length - 1) + clock.spb * 2;
  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  return (
    <div style={{ position: "absolute", left: M + 150, right: M + 60, top: H / 2, transform: "translateY(-50%)" }}>
      <div style={{ position: "absolute", left: -150, top: -170, fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: 380, lineHeight: 1, color: pal.accent, opacity: 0.32 * ramp(t, a - clock.spb, 0.8, OUT) }}>“</div>
      {lines.map((ln, li) => (
        <div key={li} style={{ ...voice("emo", size), color: pal.ink, marginBottom: 6 }}>
          {ln.split(" ").map((w, wi) => {
            const hot = accentWords.includes(clean(w));
            return (
              <span key={wi} style={{ display: "inline-block", whiteSpace: "pre", ...wordIn(t, lineAt(li) + wi * (3 / FPS), "emo") }}>
                <span style={{ color: hot ? pal.accent : pal.ink, textShadow: day ? undefined : glow(hot ? pal.accent : pal.ink, hot ? 1.8 : 1) }}>{w}</span>{" "}
              </span>
            );
          })}
        </div>
      ))}
      {by && (
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 44, ...wordIn(t, byAt, "cool") }}>
          <div style={{ width: 70 * ramp(t, byAt, 0.5, OUT), height: 2, background: pal.accent }} />
          <div style={{ ...label(30), color: pal.muted }}>{by}</div>
        </div>
      )}
    </div>
  );
};

// "02 / Build": a tiny label that fades in at a section start, top-left, after a short line draws.
export const SectionTitle: FC<{ n: number; text: string; at: Cue; out?: Cue; x?: number; y?: number }> = ({ n, text, at, out, x = M, y = M - 10 }) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const line = ramp(t, a - LEAD, 10 / FPS, OUT);
  const e = ramp(t, a + 4 / FPS, 12 / FPS, OUT);
  const o = fadeOut(t, out === undefined ? undefined : clock.cue(out));
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 20, opacity: o }}>
      <div style={{ width: 56 * line, height: 2, background: NIGHT.accent, boxShadow: `0 0 10px ${alpha(NIGHT.accent, 0.7)}` }} />
      <div style={{ ...label(30), opacity: e, transform: `translateX(${(1 - e) * -12}px)`, whiteSpace: "nowrap" }}>
        <span style={{ color: NIGHT.accent }}>{String(n).padStart(2, "0")}</span>
        <span style={{ color: NIGHT.muted }}> / </span>
        <span style={{ color: NIGHT.ink }}>{text}</span>
      </div>
    </div>
  );
};

// Source label for a fact card: a thin cyan rule wipes in, then "[n]  where it's from" in Inter Light, lower-left.
export const SourceLabel: FC<{ n?: number; text: string; at: Cue; out?: Cue; x?: number; y?: number }> = ({ n, text, at, out, x = M, y = H - M - 40 }) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const w = ramp(t, a, 12 / FPS, OUT);
  const e = ramp(t, a + 3 / FPS, 12 / FPS, OUT);
  const o = fadeOut(t, out === undefined ? undefined : clock.cue(out));
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <div style={{ width: 120 * w, height: 2, background: NIGHT.second, boxShadow: `0 0 10px ${alpha(NIGHT.second, 0.7)}`, marginBottom: 18 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, clipPath: `inset(-20px ${(1 - e) * 100}% -20px -20px)`, whiteSpace: "nowrap" }}>
        {n !== undefined && <span style={{ ...label(30), color: NIGHT.second, letterSpacing: "0.1em" }}>[{n}]</span>}
        <span style={{ ...voice("cool", 34), color: alpha(NIGHT.ink, 0.86), letterSpacing: "0.04em" }}>{text}</span>
      </div>
    </div>
  );
};

// A dotted timeline along the bottom: one dot per bar, section names above their starts, the current bar pulsing in accent.
export const ProgressTick: FC<{ duration: number; y?: number; x0?: number; x1?: number; labels?: boolean }> = ({ duration, y = H - 104, x0 = M, x1 = W - M, labels = true }) => {
  const { t, clock, pulse } = useSong();
  const bars = Math.max(1, Math.ceil((duration - clock.off) / clock.spBar));
  const every = bars > 96 ? Math.ceil(bars / 96) : 1;
  const xAt = (s: number) => x0 + ((s - clock.off) / Math.max(0.001, duration - clock.off)) * (x1 - x0);
  const now = Math.min(duration, Math.max(clock.off, t));
  const cur = clock.sectionAt(t);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={x0} x2={xAt(now)} y1={y} y2={y} stroke={alpha(NIGHT.ink, 0.5)} strokeWidth={2} />
      {Array.from({ length: Math.ceil(bars / every) }, (_, i) => {
        const s = clock.barSec(i * every + 1);
        const past = s <= now;
        const isCur = past && clock.barSec((i + 1) * every + 1) > now;
        return <circle key={i} cx={xAt(s)} cy={y} r={isCur ? 5 + 3 * pulse : 3} fill={isCur ? NIGHT.accent : past ? NIGHT.ink : alpha(NIGHT.muted, 0.7)} style={isCur ? { filter: `drop-shadow(0 0 8px ${NIGHT.accent})` } : undefined} />;
      })}
      {labels &&
        clock.sections.map((s, i) => (
          <g key={i}>
            <line x1={xAt(s.start)} x2={xAt(s.start)} y1={y - 16} y2={y + 16} stroke={s === cur ? NIGHT.accent : alpha(NIGHT.muted, 0.8)} strokeWidth={2} />
            <text x={xAt(s.start) + 12} y={y - 26} fontFamily={label().fontFamily} fontSize={28} letterSpacing="0.2em" fill={s === cur ? NIGHT.ink : NIGHT.muted}>
              {(s.label ?? s.name).toUpperCase()}
            </text>
          </g>
        ))}
    </svg>
  );
};

type Pt = { label: string; value: number; x?: number };
// Cosine interpolation keeps the curve smooth and lets any x be evaluated exactly, so dots and playheads sit on the line.
const curveY = (xs: number[], ys: number[], x: number) => {
  if (x <= xs[0]!) return ys[0]!;
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]!) {
      const u = (x - xs[i - 1]!) / Math.max(1e-6, xs[i]! - xs[i - 1]!);
      return ys[i - 1]! + (ys[i]! - ys[i - 1]!) * (1 - Math.cos(Math.PI * u)) / 2;
    }
  }
  return ys[ys.length - 1]!;
};

// A glowing curve that draws point to point on successive beats, with a soft area beneath; one point can be the accent.
export const PulseChart: FC<{
  points: Pt[];
  at: Cue;
  perBeats?: number;
  highlight?: number;
  title?: string;
  values?: (v: number) => string;
  box?: { x0: number; x1: number; y0: number; y1: number };
  max?: number;
  playhead?: number;
  marks?: { x: number; label: string }[];
}> = ({ points, at, perBeats = 1, highlight, title, values, box = { x0: M + 60, x1: W - M - 60, y0: 300, y1: 760 }, max, playhead, marks }) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const n = points.length;
  const top = max ?? Math.max(...points.map((p) => p.value));
  const xs = points.map((p, i) => box.x0 + (p.x ?? i / Math.max(1, n - 1)) * (box.x1 - box.x0));
  const ys = points.map((p) => box.y1 - (p.value / top) * (box.y1 - box.y0));
  const cues = points.map((_, i) => a + i * perBeats * clock.spb);
  const reach = xs[0]! + cues.slice(1).reduce((s, c, i) => s + (xs[i + 1]! - xs[i]!) * ramp(t, cues[i]!, c - cues[i]!, INOUT), 0);
  const samples = 160;
  const path = Array.from({ length: samples + 1 }, (_, i) => {
    const x = box.x0 + (i / samples) * (box.x1 - box.x0);
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${curveY(xs, ys, x).toFixed(1)}`;
  }).join(" ");
  const area = `${path} L ${box.x1} ${box.y1} L ${box.x0} ${box.y1} Z`;
  const show = ramp(t, a - clock.spb, 0.4, OUT);
  const id = "lv-chart";
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: show }}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={NIGHT.accent} stopOpacity={0.32} />
          <stop offset="1" stopColor={NIGHT.accent} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={NIGHT.second} />
          <stop offset="1" stopColor={NIGHT.accent} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={0} y={0} width={reach} height={H} />
        </clipPath>
      </defs>
      {title && (
        <text x={box.x0} y={box.y0 - 90} fontFamily={label().fontFamily} fontSize={30} letterSpacing="0.24em" fill={NIGHT.muted}>
          {title.toUpperCase()}
        </text>
      )}
      <line x1={box.x0} x2={box.x1} y1={box.y1} y2={box.y1} stroke={alpha(NIGHT.muted, 0.6)} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" />
      <g clipPath={`url(#${id}-clip)`}>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={path} fill="none" stroke={`url(#${id}-line)`} strokeWidth={5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${alpha(NIGHT.accent, 0.6)})` }} />
      </g>
      {marks?.map((m, i) => (
        <line key={i} x1={box.x0 + m.x * (box.x1 - box.x0)} x2={box.x0 + m.x * (box.x1 - box.x0)} y1={box.y0 - 20} y2={box.y1} stroke={alpha(NIGHT.muted, 0.35)} strokeWidth={1.5} strokeDasharray="4 8" />
      ))}
      {points.map((p, i) => {
        const pop = ramp(t, cues[i]!, 8 / FPS, OUT);
        const hot = i === highlight;
        const col = hot ? NIGHT.accent : NIGHT.ink;
        return (
          <g key={i} opacity={pop}>
            <circle cx={xs[i]} cy={ys[i]} r={(hot ? 13 : 8) * (0.6 + 0.4 * pop)} fill={col} style={{ filter: `drop-shadow(0 0 ${hot ? 16 : 8}px ${alpha(col, 0.9)})` }} />
            <text x={xs[i]} y={box.y1 + 58} textAnchor="middle" fontFamily={label().fontFamily} fontSize={28} letterSpacing="0.18em" fill={hot ? NIGHT.accent : NIGHT.muted}>
              {p.label.toUpperCase()}
            </text>
            {values && (
              <text x={xs[i]} y={ys[i]! - 30} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={hot ? 52 : 40} fill={col} style={{ filter: `drop-shadow(0 0 8px ${alpha(col, 0.5)})` }}>
                {values(p.value)}
              </text>
            )}
          </g>
        );
      })}
      {playhead !== undefined && playhead >= 0 && playhead <= 1 && reach >= box.x0 + playhead * (box.x1 - box.x0) && (
        <g>
          <line x1={box.x0 + playhead * (box.x1 - box.x0)} x2={box.x0 + playhead * (box.x1 - box.x0)} y1={box.y0 - 30} y2={box.y1} stroke={alpha(NIGHT.ink, 0.5)} strokeWidth={2} />
          <circle cx={box.x0 + playhead * (box.x1 - box.x0)} cy={curveY(xs, ys, box.x0 + playhead * (box.x1 - box.x0))} r={11} fill={NIGHT.ink} style={{ filter: `drop-shadow(0 0 14px ${NIGHT.ink})` }} />
        </g>
      )}
    </svg>
  );
};

// The song's energy arc as a curve: one point per section at its midpoint, revealed a beat apart, with a playhead at song time `now`.
export const EnergyArc: FC<{ sections: Section[]; at: Cue; now?: number; title?: string; box?: { x0: number; x1: number; y0: number; y1: number } }> = ({ sections, at, now, title = "The energy arc", box }) => {
  const s0 = sections[0]?.start ?? 0;
  const s1 = sections[sections.length - 1]?.end ?? 1;
  const fx = (s: number) => (s - s0) / Math.max(0.001, s1 - s0);
  const pts: Pt[] = sections.map((s) => ({ label: s.label ?? s.name, value: s.energy ?? ENERGY[s.name], x: fx((s.start + s.end) / 2) }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  const full: Pt[] = first && last ? [{ ...first, label: "", x: 0 }, ...pts, { ...last, label: "", x: 1 }] : pts;
  const peak = pts.reduce((m, p, i) => (p.value > (pts[m]?.value ?? 0) ? i : m), 0) + 1;
  return (
    <PulseChart
      points={full}
      at={at}
      highlight={peak}
      title={title}
      max={1.1}
      box={box}
      marks={sections.slice(1).map((s) => ({ x: fx(s.start), label: s.name }))}
      playhead={now === undefined ? undefined : fx(now)}
    />
  );
};

// A flow as a constellation: each step is a glowing orb that lights on its beat; a thread draws to it from the last one with a spark at its head.
export const Constellation: FC<{ nodes: { label: string; at: Cue }[]; highlight?: number; y?: number; rise?: number }> = ({ nodes, highlight, y = H / 2 - 30, rise = 80 }) => {
  const { t, clock, pos } = useSong();
  const n = nodes.length;
  const cues = nodes.map((nd) => clock.cue(nd.at));
  const x0 = M + 150;
  const x1 = W - M - 150;
  const pts = nodes.map((_, i) => [x0 + (i / Math.max(1, n - 1)) * (x1 - x0), y + Math.sin(i * 1.9 + 0.6) * rise] as const);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <radialGradient id="lv-orb">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor={NIGHT.ink} />
          <stop offset="1" stopColor={NIGHT.ink} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lv-orb-hot">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.3" stopColor={NIGHT.accent} />
          <stop offset="1" stopColor={NIGHT.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      {pts.slice(1).map(([x, yy], j) => {
        const i = j + 1;
        const [px, py] = pts[j]!;
        const p = ramp(t, cues[j]! + 3 / FPS, Math.max(0.1, cues[i]! - cues[j]! - 3 / FPS), INOUT);
        if (p <= 0) return null;
        const hx = px + (x - px) * p;
        const hy = py + (yy - py) * p;
        return (
          <g key={i}>
            <line x1={px} y1={py} x2={hx} y2={hy} stroke={alpha(NIGHT.ink, 0.55)} strokeWidth={2} />
            {p < 1 && <circle cx={hx} cy={hy} r={6} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 10px ${NIGHT.second})` }} />}
          </g>
        );
      })}
      {pts.map(([x, yy], i) => {
        const c = cues[i]!;
        const lit = ramp(t, c - 1 / FPS, 8 / FPS, OUT);
        const bloom = t >= c ? Math.exp(-(t - c) / 0.25) : 0;
        const hot = i === highlight;
        const ring = t >= c ? pos.beatPhase : 0;
        const r = hot ? 64 : 46;
        const col = hot ? NIGHT.accent : NIGHT.ink;
        return (
          <g key={i}>
            <circle cx={x} cy={yy} r={10} fill="none" stroke={alpha(NIGHT.muted, 0.7)} strokeWidth={2} opacity={1 - lit} />
            {lit > 0 && (
              <>
                <circle cx={x} cy={yy} r={r * 2.4 * (1 + 0.4 * bloom)} fill={alpha(col, 0.07 + 0.12 * bloom)} />
                <circle cx={x} cy={yy} r={r + 30 * ring} fill="none" stroke={alpha(col, 0.35 * (1 - ring))} strokeWidth={2} />
                <circle cx={x} cy={yy} r={r * lit * (1 + 0.25 * bloom)} fill={`url(#${hot ? "lv-orb-hot" : "lv-orb"})`} />
              </>
            )}
            <text
              x={x}
              y={yy + (hot ? 140 : 118)}
              textAnchor="middle"
              fontFamily={hot ? SERIF : label().fontFamily}
              fontStyle={hot ? "italic" : "normal"}
              fontWeight={hot ? 400 : 300}
              fontSize={hot ? 58 : 36}
              letterSpacing={hot ? "0" : "0.08em"}
              fill={hot ? NIGHT.accent : NIGHT.ink}
              opacity={lit}
              style={{ filter: `drop-shadow(0 0 10px ${alpha(col, 0.45)})` }}
            >
              {nodes[i]!.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
