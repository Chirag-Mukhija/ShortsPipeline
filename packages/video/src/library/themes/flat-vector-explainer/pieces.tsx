// Flat vector pieces for the spoken line: words that pop on their word times, the hook title over a rising planet, the key claim with its glowing bar, steps, the orbiting stat, the quote bubble and the source lower third.
import type { FC } from "react";
import { interpolate } from "remotion";
import { W } from "../../core/video";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { AMBER, CORAL, EXPO, HEAD, INK, LABEL, MIST, PLATE, PLATE_HI, TEAL, VIOLET, shade, tint } from "./theme";
import { At, GlowOrb, Horizon, Pill, Stage, exitOut, popIn, wobble } from "./primitives";
import { FlatCharacter, ICONS, ShapeAssembler, type IconName } from "./figures";
import { rng } from "./geometry";

// ---------- words ----------
export type Word = { w: string; t: number; hero?: boolean };

// A little burst of dots, plus signs and diamonds that flies out of a hero word as it lands.
const Burst: FC<{ at: number; color: string; seed?: number }> = ({ at, color, seed = 3 }) => {
  const { t } = useTime();
  const d = t - at;
  if (d < 0 || d > 0.8) return null;
  const r = rng(seed);
  const e = OUT(clamp01(d / 0.6));
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + r() * 0.4;
        const kind = i % 3;
        const c = [color, AMBER, INK][i % 3]!;
        const sz = 14 + r() * 10;
        return (
          <svg
            key={i}
            width={sz}
            height={sz}
            viewBox="-10 -10 20 20"
            style={{ position: "absolute", left: `calc(${50 + Math.cos(a) * (52 + 18 * e)}% - ${sz / 2}px)`, top: `calc(${50 + Math.sin(a) * (70 + 50 * e)}% - ${sz / 2}px)`, opacity: 1 - clamp01((d - 0.35) / 0.4), transform: `scale(${0.4 + e * 0.8}) rotate(${e * 90}deg)` }}
          >
            {kind === 0 ? <circle r={8} fill={c} /> : kind === 1 ? <path d="M-2.5 -9H2.5V-2.5H9V2.5H2.5V9H-2.5V2.5H-9V-2.5H-2.5Z" fill={c} /> : <path d="M0 -10L10 0L0 10L-10 0Z" fill={c} />}
          </svg>
        );
      })}
    </>
  );
};

// Words pop (back-out, 3 frames ahead of the word); the hero word turns accent, glows, bursts and gets a growing bar; at dimAt the rest drop to 40%.
export const WordsPop: FC<{ lines: Word[][]; y: number; size: number; accent?: string; dimAt?: number; out?: number; weight?: number; lineGap?: number }> = ({ lines, y, size, accent = TEAL, dimAt, out, weight = 700, lineGap = 1.12 }) => {
  const { t } = useTime();
  const dim = dimAt !== undefined ? ramp(t, dimAt, 0.3) : 0;
  const ex = exitOut(t, out);
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, display: "flex", flexDirection: "column", alignItems: "center", gap: size * (lineGap - 1), opacity: ex.o, transform: `scale(${ex.s})` }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: size * 0.28, alignItems: "baseline", fontFamily: HEAD, fontWeight: weight, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.015em", color: INK }}>
          {line.map((wd, i) => {
            const k = popIn(t, wd.t - 0.1, 0.45);
            const bar = wd.hero ? ramp(t, wd.t + 0.05, 0.33, OUT) : 0;
            return (
              <span
                key={i}
                style={{
                  position: "relative",
                  display: "inline-block",
                  transform: `translateY(${(1 - Math.min(1, k)) * size * 0.3}px) scale(${k}) rotate(${wd.hero ? wobble(t, wd.t + 0.1, 3) : 0}deg)`,
                  transformOrigin: "50% 80%",
                  opacity: clamp01(k * 4) * (wd.hero ? 1 : 1 - 0.6 * dim),
                  color: wd.hero ? accent : INK,
                  textShadow: wd.hero ? `0 0 ${size * 0.4}px ${accent}66` : undefined,
                }}
              >
                {wd.w}
                {wd.hero && (
                  <>
                    <span style={{ position: "absolute", left: "2%", right: "2%", bottom: "-0.04em", height: "0.11em", borderRadius: 999, background: accent, transform: `scaleX(${bar})`, transformOrigin: "0% 50%", boxShadow: `0 0 ${size * 0.3}px ${accent}` }} />
                    <Burst at={wd.t + 0.05} color={accent} seed={li * 10 + i} />
                  </>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- hook title ----------
export type HookProps = { kicker?: string; lines: Word[][]; at: number; accent?: string; planet?: string; out?: number };

// The opening card: a planet horizon rises, a ringed moon glows top-right, a small character waves from the ridge and the headline pops word by word.
export const HookTitle: FC<HookProps> = ({ kicker, lines, at, accent = TEAL, planet = VIOLET, out }) => {
  const { t } = useTime();
  const rise = ramp(t, at, 1.0, INOUT);
  return (
    <>
      <Stage>
        <GlowOrb x={1590 - rise * 30} y={250 + (1 - rise) * 80} r={92} color={planet} ring p={popIn(t, at + 0.3, 0.6)} seed={4} />
        <GlowOrb x={330} y={190} r={30} color={AMBER} p={popIn(t, at + 0.55)} seed={8} crater />
        <Horizon p={rise} y={900} />
        <FlatCharacter x={1480} y={938 + (1 - rise) * 260} s={0.5} color={CORAL} at={at + 0.6} state="wave" stateAt={at + 1.1} facing={-1} seed={5} />
      </Stage>
      {kicker && <Pill x={W / 2} y={262} text={kicker} at={at + 0.15} color={accent} size={34} out={out} />}
      <WordsPop lines={lines} y={350} size={128} accent={accent} out={out} />
    </>
  );
};

// ---------- key claim ----------
// A single claim, word by word on the narration; the hero word lands with glow, burst and bar, then the rest dims so only it is read.
export const KeyClaim: FC<{ lines: Word[][]; y?: number; size?: number; accent?: string; dimAfter?: number; out?: number }> = ({ lines, y = 340, size = 132, accent = CORAL, dimAfter = 0.5, out }) => {
  const hero = lines.flat().find((w) => w.hero);
  return <WordsPop lines={lines} y={y} size={size} accent={accent} dimAt={hero ? hero.t + dimAfter : undefined} out={out} />;
};

// ---------- steps ----------
export type Step = { label: string; sub?: string; t: number; icon: IconName; color?: string };

// Vertical steps: each lands as an orb coin with an assembled icon, a connector draws down to it, and the current step is the only one at full strength.
export const StepStack: FC<{ steps: Step[]; x?: number; y?: number; gap?: number; out?: number }> = ({ steps, x = 520, y = 230, gap = 210, out }) => {
  const { t } = useTime();
  const colors = [TEAL, CORAL, AMBER, VIOLET];
  const ex = exitOut(t, out);
  const active = steps.reduce((a, s, i) => (t >= s.t ? i : a), -1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: ex.o }}>
      <Stage>
        {steps.slice(1).map((s, i) => {
          const p = ramp(t, s.t - 0.4, 0.35, OUT);
          const y0 = y + i * gap + 74;
          const y1 = y + (i + 1) * gap - 74;
          return p > 0 ? <line key={i} x1={x} y1={y0} x2={x} y2={y0 + (y1 - y0) * p} stroke={MIST} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 18" opacity={0.6} /> : null;
        })}
        {steps.map((s, i) => {
          const c = s.color ?? colors[i % colors.length]!;
          const on = i === active ? 1 : 0.6;
          return (
            <g key={i} opacity={on}>
              <GlowOrb x={x} y={y + i * gap} r={66} color={c} p={popIn(t, s.t - 0.1)} glow={i === active ? 1.2 : 0.4} emphAt={s.t} seed={i} />
              <At x={x} y={y + i * gap} s={0.32}>
                <ShapeAssembler parts={ICONS[s.icon](shade(c, 0.45))} at={s.t} stagger={0.04} />
              </At>
            </g>
          );
        })}
      </Stage>
      {steps.map((s, i) => {
        const k = ramp(t, s.t, 0.4, EXPO);
        return (
          <div key={i} style={{ position: "absolute", left: x + 120, top: y + i * gap, transform: `translate(${(1 - k) * -40}px, -50%)`, opacity: k * (i === active ? 1 : 0.6) }}>
            <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 64, color: INK, lineHeight: 1.05 }}>{s.label}</div>
            {s.sub && <div style={{ fontFamily: LABEL, fontWeight: 500, fontSize: 36, color: MIST, marginTop: 6 }}>{s.sub}</div>}
          </div>
        );
      })}
    </div>
  );
};

// ---------- stat ----------
export type StatProps = { value: number; from?: number; decimals?: number; prefix?: string; unit?: string; caption?: string; at: number; dur?: number; color?: string; y?: number; out?: number };

const fmt = (v: number, decimals: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Big number: counts up (out-expo) to land on the spoken word while a moon travels its orbit, punches 1.08, then the caption pill arrives 8 frames later.
export const StatOrbit: FC<StatProps> = ({ value, from = 0, decimals = 0, prefix = "", unit = "", caption, at, dur = 1.0, color = AMBER, y = 470, out }) => {
  const { t } = useTime();
  const start = at - dur;
  // Normalised expo-out so the count lands exactly on the value (Easing.exp stops at 99.9%).
  const p = (1 - 2 ** (-10 * ramp(t, start, dur, (x) => x))) / (1 - 2 ** -10);
  const v = from + (value - from) * p;
  const punch = interpolate(t, [at, at + 0.07, at + 0.2], [1, 1.08, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const appear = popIn(t, start - 0.25);
  const ex = exitOut(t, out);
  const ring = ramp(t, start - 0.25, 0.7, OUT);
  const ang = -Math.PI * 0.85 + p * Math.PI * 1.7 + (t - at > 0 ? (t - at) * 0.25 : 0);
  const rx = 700;
  const ry = 210;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: ex.o, transform: `scale(${ex.s})` }}>
      <Stage>
        <defs>
          <radialGradient id="fve-stat-glow">
            <stop offset="0" stopColor={color} stopOpacity={0.2 * (1 + ramp(t, at, 0.1) - ramp(t, at + 0.2, 0.4))} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={960} cy={y} rx={760} ry={330} fill="url(#fve-stat-glow)" />
        <g transform={`rotate(-8 960 ${y})`}>
          <ellipse cx={960} cy={y} rx={rx} ry={ry} fill="none" stroke={MIST} strokeWidth={4} strokeDasharray="3 16" strokeLinecap="round" opacity={0.5 * ring} />
          <GlowOrb x={960 + Math.cos(ang) * rx} y={y + Math.sin(ang) * ry} r={34} color={TEAL} p={popIn(t, start)} seed={2} shadow={false} />
          <GlowOrb x={960 + Math.cos(ang + 2.6) * rx} y={y + Math.sin(ang + 2.6) * ry} r={18} color={CORAL} p={popIn(t, start + 0.1)} seed={6} shadow={false} />
        </g>
      </Stage>
      <div style={{ position: "absolute", left: 96, right: 96, top: y, transform: `translate(0, -56%) scale(${appear * punch})`, display: "flex", justifyContent: "center", alignItems: "baseline", fontFamily: HEAD, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums", textShadow: `0 0 60px ${color}55` }}>
        {prefix && <span style={{ fontSize: 150, color }}>{prefix}</span>}
        <span style={{ fontSize: 250, lineHeight: 1, letterSpacing: "-0.03em" }}>{fmt(v, decimals)}</span>
        {unit && <span style={{ fontSize: 120, color, marginLeft: 18 }}>{unit}</span>}
      </div>
      {caption && <Pill x={W / 2} y={y + 230} text={caption} at={at + 0.27} color={color} size={40} />}
    </div>
  );
};

// ---------- quote ----------
export type QuoteProps = { quote: string; who: string; role?: string; at: number; color?: string; talkFor?: number; out?: number };

// A character speaks a quote: the bubble grows out of its tail, a flat quote mark pops on the corner, the attribution follows.
export const QuoteBubble: FC<QuoteProps> = ({ quote, who, role, at, color = VIOLET, talkFor = 2.4, out }) => {
  const { t } = useTime();
  const k = popIn(t, at + 0.2, 0.55);
  const ex = exitOut(t, out);
  const talking = t < at + 0.4 + talkFor;
  const qm = popIn(t, at + 0.5);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: ex.o }}>
      <Stage>
        <Horizon y={930} color="#24326B" />
        <FlatCharacter x={330} y={930} s={1.1} color={color} at={at} state={talking ? "talk" : "idle"} stateAt={at + 0.4} seed={11} />
      </Stage>
      <div
        style={{
          position: "absolute",
          left: 560,
          bottom: 520,
          width: 1220,
          padding: "70px 80px 60px 90px",
          borderRadius: 64,
          background: `linear-gradient(140deg, ${PLATE_HI}, ${PLATE})`,
          boxShadow: `0 0 90px ${color}30, 26px 26px 0 rgba(8,11,32,0.35)`,
          transform: `scale(${k * ex.s})`,
          transformOrigin: "0% 100%",
          opacity: clamp01(k * 3),
        }}
      >
        <svg width={200} height={90} viewBox="0 0 200 90" style={{ position: "absolute", left: 0, top: "calc(100% - 2px)", overflow: "visible" }}>
          <path d="M70 0 L200 0 Q90 30 -100 92 Q50 30 70 0Z" fill="#2C3A75" />
        </svg>
        <svg width={130} height={100} viewBox="0 0 130 100" style={{ position: "absolute", left: 50, top: -56, transform: `scale(${qm}) rotate(${wobble(t, at + 0.6, 6)}deg)`, overflow: "visible" }}>
          {[0, 66].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <circle cx={30} cy={62} r={30} fill={color} />
              <path d="M2 58 Q4 10 50 0 L54 12 Q26 24 28 48Z" fill={color} />
            </g>
          ))}
        </svg>
        <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 58, lineHeight: 1.22, color: INK, letterSpacing: "-0.01em" }}>{quote}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 34, opacity: ramp(t, at + 0.9, 0.3), transform: `translateY(${(1 - ramp(t, at + 0.9, 0.4, OUT)) * 16}px)` }}>
          <div style={{ width: 54, height: 8, borderRadius: 4, background: color }} />
          <div style={{ fontFamily: LABEL, fontWeight: 600, fontSize: 38, color: INK }}>{who}</div>
          {role && <div style={{ fontFamily: LABEL, fontWeight: 500, fontSize: 34, color: MIST }}>· {role}</div>}
        </div>
      </div>
    </div>
  );
};

// ---------- source lower third ----------
export type SourceProps = { title: string; detail?: string; at: number; out?: number; color?: string; icon?: IconName; kicker?: string };

// Source lower third: a plate slides in on a spring from the left, the icon coin assembles on it, the text follows 4 frames behind.
export const SourceLabel: FC<SourceProps> = ({ title, detail, at, out, color = CORAL, icon = "book", kicker = "SOURCE" }) => {
  const { t } = useTime();
  const k = popIn(t, at, 0.55);
  const ex = exitOut(t, out);
  const txt = ramp(t, at + 0.13, 0.35, OUT);
  if (k <= 0 || ex.o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        bottom: 96,
        display: "flex",
        alignItems: "center",
        gap: 30,
        padding: "22px 52px 22px 22px",
        borderRadius: 999,
        background: `linear-gradient(135deg, ${PLATE_HI}, ${PLATE})`,
        boxShadow: `0 0 60px ${color}26, 18px 18px 0 rgba(8,11,32,0.35)`,
        transform: `translateX(${(1 - Math.min(1, k)) * -260}px) scale(${ex.s})`,
        transformOrigin: "0% 50%",
        opacity: ex.o * clamp01(k * 3),
      }}
    >
      <svg width={124} height={124} viewBox="-62 -62 124 124" style={{ overflow: "visible" }}>
        <GlowOrb x={0} y={0} r={58} color={color} p={popIn(t, at + 0.08)} shadow={false} glow={0.6} />
        <g transform="scale(0.36)">
          <ShapeAssembler parts={ICONS[icon]("#F4F6FF")} at={at + 0.15} stagger={0.04} />
        </g>
      </svg>
      <div style={{ opacity: txt, transform: `translateX(${(1 - txt) * -20}px)`, fontFamily: LABEL }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "0.14em", color: tint(color, 0.3) }}>{kicker}</div>
        <div style={{ fontSize: 44, fontWeight: 600, color: INK, lineHeight: 1.15 }}>{title}</div>
        {detail && <div style={{ fontSize: 32, fontWeight: 500, color: MIST }}>{detail}</div>}
      </div>
    </div>
  );
};

// A tiny stand-in so scenes can drop one icon in without the assembler cue boilerplate.
export const Icon: FC<{ name: IconName; x: number; y: number; s?: number; at: number; color?: string }> = ({ name, x, y, s = 1, at, color }) => (
  <At x={x} y={y} s={s}>
    <ShapeAssembler parts={ICONS[name](color)} at={at} />
  </At>
);
