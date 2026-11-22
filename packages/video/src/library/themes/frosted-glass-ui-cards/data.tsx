// Glass data pieces: the stat card with count-up and sparkline, A-vs-B cards that lift and recede, a step list with a sliding selection, a frosted flow diagram, and the feature grid dealt from a stack.
import type { FC } from "react";
import { Easing, interpolate } from "remotion";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { CORAL, CYAN, INK, MINT, MUTE, SANS, SERIF, SOFT, TEXT_SHADOW, fr, rgba, sp } from "./theme";
import { Chip, GlassCard } from "./glass";
import { Icon, IconTile, type IconName } from "./icons";
import { Sphere } from "./field";
import { ACCENT_FILL, Words, fillText, say } from "./type";

const EXPO = Easing.out(Easing.exp);

// ---------- stat card ----------
export type StatProps = { label: string; value: number; prefix?: string; suffix?: string; decimals?: number; delta?: string; foot?: string; spark?: number[]; at?: number; out?: number; icon?: IconName; x?: number; y?: number };

export const StatCard: FC<StatProps> = ({ label, value, prefix = "", suffix = "", decimals = 0, delta, foot, spark = [3, 4, 3.6, 5, 4.6, 6.2, 5.8, 7.4, 8.8], at = 0, out, icon = "chart", x = 560, y = 210 }) => {
  const { t } = useTime();
  const count = ramp(t, at + 0.3, 1.3, EXPO);
  const landed = at + 1.6;
  // The 6-frame scale pop when the number lands.
  const pop = t > landed ? 1 + 0.07 * Math.exp(-(t - landed) * 9) * Math.cos((t - landed) * 22) : 1;
  // Expo-out never quite reaches 1, so snap the last tenth of a percent to the real value.
  const v = count > 0.998 ? value : value * count;
  const shown = v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const W0 = 800;
  const H0 = 640;
  const draw = ramp(t, at + 0.5, 1.4, INOUT);
  const lo = Math.min(...spark);
  const hi = Math.max(...spark);
  const pts = spark.map((s, i) => [20 + (i / (spark.length - 1)) * (W0 - 140), 150 - ((s - lo) / (hi - lo || 1)) * 120] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const seg = draw * (pts.length - 1);
  const k = Math.min(pts.length - 2, Math.floor(seg));
  const u = seg - k;
  const head = [pts[k]![0] + (pts[k + 1]![0] - pts[k]![0]) * u, pts[k]![1] + (pts[k + 1]![1] - pts[k]![1]) * u];
  return (
    <>
      <Sphere x={x + W0 - 30} y={y + 40} r={140} tone="coral" at={at} seed={11} />
      {/* The card behind: a second pane in the stack, so the stat reads as one of several. */}
      <GlassCard x={x - 130} y={y + 70} w={W0 - 60} h={H0 - 90} at={at + 0.15} out={out} r={36} tint="violet" depth={3} rz={-5} float={3} pad="34px 40px">
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: MUTE }}>Last 30 days</div>
      </GlassCard>
      <GlassCard x={x} y={y} w={W0} h={H0} at={at} out={out} r={40} enter="pop" glint={[landed]} glow={0.5 * ramp(t, landed, 0.3) * (1 - ramp(t, landed + 0.5, 1))} depth={10} pad="44px 54px">
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <IconTile name={icon} size={72} color={CYAN} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: SOFT }}>{label}</span>
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 800, fontSize: 200, lineHeight: 1, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", transform: `scale(${pop})`, transformOrigin: "left center", ...fillText(ACCENT_FILL) }}>
          {prefix}
          {shown}
          {suffix}
        </div>
        {delta && (
          <div style={{ marginTop: 18, opacity: ramp(t, landed, 0.3), transform: `scale(${0.8 + 0.2 * sp(t, landed)})`, transformOrigin: "left center" }}>
            <Chip tint="accent" accent={MINT} pad="8px 22px 8px 14px">
              <Icon name="arrow" size={30} color={MINT} stroke={2.4} />
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: INK }}>{delta}</span>
              {foot && <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: SOFT }}>{foot}</span>}
            </Chip>
          </div>
        )}
        <svg width={W0 - 100} height={170} style={{ position: "absolute", left: 50, bottom: 34, overflow: "visible" }}>
          <defs>
            <linearGradient id="fg-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={CYAN} stopOpacity={0.35} />
              <stop offset="1" stopColor={CYAN} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fg-spark-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
              <stop offset="1" stopColor={CYAN} />
            </linearGradient>
            <clipPath id="fg-spark-clip">
              <rect x={0} y={-20} width={head[0]} height={220} />
            </clipPath>
          </defs>
          <path d={`${d} L${pts[pts.length - 1]![0]} 170 L${pts[0]![0]} 170 Z`} fill="url(#fg-spark-fill)" clipPath="url(#fg-spark-clip)" />
          <path d={d} fill="none" stroke="url(#fg-spark-line)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          {draw > 0 && <circle cx={head[0]} cy={head[1]} r={11} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 10px ${CYAN})` }} />}
        </svg>
      </GlassCard>
    </>
  );
};

// ---------- compare ----------
export type Side = { title: string; tag: string; icon: IconName; points: string[]; color?: string };

export const CompareCards: FC<{ a: Side; b: Side; at?: number; pick?: number; winner?: 0 | 1; out?: number }> = ({ a, b, at = 0, pick, winner = 1, out }) => {
  const { t } = useTime();
  const sides = [a, b];
  const pk = pick === undefined ? 0 : ramp(t, pick, 0.5, OUT);
  const vs = sp(t, at + 0.35);
  return (
    <>
      <Sphere x={960} y={540} r={120} tone="violet" at={at} seed={12} drift={0.4} />
      {sides.map((s, i) => {
        const win = i === winner;
        const x = i === 0 ? 170 : 1070;
        const col = s.color ?? (i === 0 ? CORAL : CYAN);
        return (
          <GlassCard key={i} x={x} y={190} w={680} h={680} at={at + i * 0.15} out={out} r={40} tint={win && pk > 0 ? "milk" : "clear"} lift={win ? pk : 0} dim={win ? 0 : pk} glow={win ? pk * 0.8 : 0} glowColor={col} glint={win && pick !== undefined ? [pick + 0.2] : []} depth={i === 0 ? 8 : 12} float={i * 3} pad="50px 56px">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <IconTile name={s.icon} size={96} color={col} />
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 28, letterSpacing: "0.12em", textTransform: "uppercase", color: col }}>{s.tag}</span>
            </div>
            <div style={{ marginTop: 34, fontFamily: SANS, fontWeight: 800, fontSize: 72, letterSpacing: "-0.03em", color: INK, textShadow: TEXT_SHADOW }}>{s.title}</div>
            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 22 }}>
              {s.points.map((p, j) => {
                const e = ramp(t, at + 0.5 + i * 0.15 + j * 0.12, 0.45);
                return (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 18, opacity: e, transform: `translateY(${(1 - e) * 12}px)` }}>
                    <span style={{ width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", background: rgba(col, 0.25), boxShadow: `inset 0 0 0 1.5px ${rgba(col, 0.6)}` }}>
                      <Icon name="check" size={28} color={INK} stroke={2.6} />
                    </span>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 38, color: SOFT }}>{p}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}
      {/* The "vs" is a glass bead between the cards, frosting the sphere behind it. */}
      <GlassCard x={960 - 80} y={540 - 80} w={160} h={160} r={80} at={at + 0.35} out={out} enter="pop" tint="milk" depth={20} float={5} idleGlint={0.4} contentStyle={{ alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1, color: INK, transform: `rotate(${(1 - vs) * -30}deg)`, marginTop: -8 }}>vs</span>
      </GlassCard>
    </>
  );
};

// ---------- step list with a sliding glass selection ----------
export type Step = { text: string; t: number };

export const StepList: FC<{ title: string; steps: Step[]; at?: number; out?: number; doneAt?: number }> = ({ title, steps, at = 0, out, doneAt }) => {
  const { t } = useTime();
  const rowH = 118;
  const top = 196;
  // Selection index follows the spoken steps; a spring on each hop, so it overshoots a touch like a real pill.
  let sel = 0;
  steps.forEach((s, i) => {
    if (i > 0) sel += sp(t, s.t, { damping: 15, stiffness: 190 }) * 1;
  });
  const selShown = steps.length ? ramp(t, steps[0]!.t - 0.1, 0.3) * (doneAt === undefined ? 1 : 1 - ramp(t, doneAt, 0.4)) : 0;
  const vel = Math.abs(sel - stepsAt(t - 1 / 30, steps));
  return (
    <>
      <Sphere x={1500} y={790} r={150} tone="coral" at={at} seed={14} />
      <GlassCard x={410} y={150} w={1100} h={top + steps.length * rowH + 40} at={at} out={out} r={44} pad="48px 56px">
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 60, letterSpacing: "-0.03em", color: INK }}>
          <Words words={say(title, at + 0.2, 0.12)} size={60} weight={800} />
        </div>
        {/* Selection pill: brighter glass that slides between rows and stretches with its speed. */}
        <div style={{ position: "absolute", left: 32, right: 32, top: top - 12 + sel * rowH, height: rowH - 14, opacity: selShown, transform: `scaleY(${1 + vel * 0.6}) scaleX(${1 - vel * 0.05})`, borderRadius: 30, background: "linear-gradient(170deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))", boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.6), 0 20px 40px -18px rgba(10,5,40,0.6), 0 0 40px ${rgba(CYAN, 0.18)}` }} />
        {steps.map((s, i) => {
          const e = ramp(t, at + 0.35 + i * 0.12, fr(18), OUT);
          const done = steps[i + 1] ? ramp(t, steps[i + 1]!.t, 0.25) : doneAt !== undefined ? ramp(t, doneAt, 0.25) : 0;
          const tick = steps[i + 1] ? sp(t, steps[i + 1]!.t) : doneAt !== undefined ? sp(t, doneAt) : 0;
          const active = ramp(t, s.t - 0.1, 0.25) * (1 - done);
          return (
            <div key={i} style={{ position: "absolute", left: 60, right: 60, top: top + i * rowH, height: rowH - 38, display: "flex", alignItems: "center", gap: 30, opacity: e, transform: `translateY(${(1 - e) * 24}px)` }}>
              <span style={{ width: 64, height: 64, borderRadius: 20, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 32, color: INK, background: active > 0.5 ? `linear-gradient(150deg, ${rgba(CYAN, 0.6)}, ${rgba(CYAN, 0.2)})` : "rgba(255,255,255,0.1)", boxShadow: `inset 0 0 0 1.5px ${active > 0.5 ? rgba(CYAN, 0.7) : "rgba(255,255,255,0.25)"}` }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: SANS, fontWeight: active > 0.5 ? 700 : 500, fontSize: 42, color: done > 0.5 ? SOFT : INK, textShadow: TEXT_SHADOW }}>{s.text}</span>
              <span style={{ width: 58, height: 58, borderRadius: 29, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tick > 0.01 ? `linear-gradient(150deg, ${MINT}, #2FBF8F)` : "transparent", boxShadow: tick > 0.01 ? `0 0 24px ${rgba(MINT, 0.5)}` : "inset 0 0 0 2px rgba(255,255,255,0.3)", transform: `scale(${tick > 0.01 ? 0.6 + 0.4 * tick : 1})` }}>
                {tick > 0.01 && <Icon name="check" size={34} color="#0E2B3A" stroke={3} p={clamp01(tick * 1.4)} />}
              </span>
            </div>
          );
        })}
      </GlassCard>
    </>
  );
};
const stepsAt = (t: number, steps: Step[]) => steps.reduce((acc, s, i) => (i > 0 ? acc + sp(t, s.t, { damping: 15, stiffness: 190 }) : acc), 0);

// ---------- flow diagram ----------
export type FlowNode = { label: string; sub: string; icon: IconName; color?: string };

export const GlassFlow: FC<{ nodes: FlowNode[]; at?: number; gap?: number; out?: number; title?: string }> = ({ nodes, at = 0, gap = 0.75, out, title }) => {
  const { t } = useTime();
  const n = nodes.length;
  const w = 330;
  const h = 300;
  const span = 1920 - 2 * 140;
  const step = (span - w) / (n - 1);
  const y = 400;
  const xs = nodes.map((_, i) => 140 + i * step);
  const arrive = (i: number) => at + 0.3 + i * gap;
  return (
    <>
      {title && <div style={{ position: "absolute", left: 140, top: 150 }}><Words words={say(title, at, 0.12)} size={64} weight={800} /></div>}
      <Sphere x={xs[1]! + w + 40} y={y + 30} r={90} tone="coral" at={at} seed={21} />
      <Sphere x={xs[n - 2]! + w + 30} y={y + h - 20} r={80} tone="cyan" at={at} seed={22} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
        </defs>
        {nodes.slice(1).map((_, i) => {
          const x0 = xs[i]! + w;
          const x1 = xs[i + 1]!;
          const cy = y + h / 2;
          const p = ramp(t, arrive(i) + 0.15, gap - 0.2, INOUT);
          const px = x0 + (x1 - x0) * p;
          return (
            <g key={i}>
              <line x1={x0} y1={cy} x2={x1} y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
              {/* userSpaceOnUse: a bounding-box gradient on a zero-height line renders nothing. */}
              <linearGradient id={`fg-flow-${i}`} gradientUnits="userSpaceOnUse" x1={x0} y1={cy} x2={x1} y2={cy}>
                <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
                <stop offset="1" stopColor={CYAN} />
              </linearGradient>
              {p > 0 && <line x1={x0} y1={cy} x2={px} y2={cy} stroke={`url(#fg-flow-${i})`} strokeWidth={5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${rgba(CYAN, 0.8)})` }} />}
              {p > 0 && p < 1 && <circle cx={px} cy={cy} r={12} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 12px ${CYAN}) drop-shadow(0 0 24px ${CYAN})` }} />}
            </g>
          );
        })}
      </svg>
      {nodes.map((nd, i) => {
        const hit = ramp(t, arrive(i), 0.2) * (1 - ramp(t, arrive(i) + 0.5, 0.8));
        const col = nd.color ?? CYAN;
        return (
          <GlassCard key={i} x={xs[i]!} y={y} w={w} h={h} at={arrive(i) - 0.25} out={out} enter="pop" r={36} glint={[arrive(i)]} glow={0.25 + 0.75 * hit} glowColor={col} depth={6 + i * 3} float={i * 2} pad="38px 34px" contentStyle={{ gap: 22 }}>
            <IconTile name={nd.icon} size={84} color={col} scale={1 + 0.12 * hit} />
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", color: INK }}>{nd.label}</div>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: SOFT, marginTop: -10 }}>{nd.sub}</div>
          </GlassCard>
        );
      })}
    </>
  );
};

// ---------- feature grid dealt from a stack ----------
export type Feature = { title: string; sub: string; icon: IconName; color?: string };

// Each card starts in a fanned deck at the centre and springs to its grid cell, centre-out (a FLIP between two precomputed rects).
export const FeatureGrid: FC<{ heading?: string; features: Feature[]; at?: number; out?: number; each?: number }> = ({ heading, features, at = 0, out, each = 0.18 }) => {
  const { t, f } = useTime();
  const cols = 3;
  const cw = 500;
  const ch = 290;
  const gx = 32;
  const gy = 32;
  const left = (1920 - (cols * cw + (cols - 1) * gx)) / 2;
  const topY = heading ? 300 : 230;
  const deckX = 960 - cw / 2;
  const deckY = 560 - ch / 2;
  const order = features.map((_, i) => i).sort((p, q) => Math.abs((p % cols) - 1) + Math.floor(p / cols) * 0.5 - (Math.abs((q % cols) - 1) + Math.floor(q / cols) * 0.5));
  return (
    <>
      {heading && <div style={{ position: "absolute", left, top: 150 }}><Words words={say(heading, at, 0.1)} size={68} weight={800} /></div>}
      <Sphere x={left + cw + gx / 2} y={topY + ch + gy / 2} r={110} tone="coral" at={at} seed={31} drift={0.5} />
      <Sphere x={left + 2 * (cw + gx) + cw - 10} y={topY + 2 * ch + gy - 10} r={95} tone="rose" at={at} seed={32} />
      {features.map((ft, i) => {
        const rank = order.indexOf(i);
        const deal = at + 0.9 + rank * each;
        const m = sp(t, deal, { damping: 16, stiffness: 140, mass: 0.9 });
        const tx = left + (i % cols) * (cw + gx);
        const ty = topY + Math.floor(i / cols) * (ch + gy);
        const fan = (rank - (features.length - 1) / 2) * 3;
        const x = interpolate(m, [0, 1], [deckX + rank * 4, tx]);
        const y = interpolate(m, [0, 1], [deckY - rank * 6, ty]);
        const col = ft.color ?? [CYAN, CORAL, MINT, "#B26BFF", "#FF5FA2", CYAN][i % 6]!;
        const loop = Math.sin((f + i * 23) / 22);
        return (
          <GlassCard key={i} x={x} y={y} w={cw} h={ch} at={at + 0.05 * rank} out={out} enter="pop" r={32} rz={fan * (1 - m)} glint={[deal + 0.35]} depth={6 + (i % 3) * 3} float={i} pad="34px 38px" contentStyle={{ justifyContent: "space-between" }}>
            <IconTile name={ft.icon} size={84} color={col} rotate={ft.icon === "sparkle" || ft.icon === "cpu" ? loop * 10 : 0} scale={1 + 0.04 * loop} />
            <div>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, letterSpacing: "-0.02em", color: INK }}>{ft.title}</div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: SOFT }}>{ft.sub}</div>
            </div>
          </GlassCard>
        );
      })}
    </>
  );
};

