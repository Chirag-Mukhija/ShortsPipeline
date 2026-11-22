// The film's atmosphere: drifting section skies, seeded bokeh with parallax, rising dust, film grain, the waveform line, the slow lens and the drop flash.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { INOUT, OUT, ramp } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { smoothSamples, synthSpectrum, useSong, type Cue, type Sampler } from "./beat";
import { DAY, NIGHT, SKY, alpha, mix } from "./theme";

type Pair = [string, string];
export type SkyShift = { at: Cue; colors: Pair };

// The current sky pair: the first section's sky, easing into each later section's (or each explicit shift) over `span` bars.
const useSky = (colors?: Pair, shifts?: SkyShift[], span = 2): Pair => {
  const { t, clock } = useSong();
  const secs = clock.sections;
  let pair: Pair = colors ?? (secs[0] ? SKY[secs[0].name] : SKY.intro);
  const keys = shifts ?? secs.slice(1).map((s) => ({ at: s.start, colors: SKY[s.name] }));
  for (const k of keys) {
    const e = ramp(t, clock.cue(k.at), Math.max(1 / FPS, span * clock.spBar), INOUT);
    pair = [mix(pair[0], k.colors[0], e), mix(pair[1], k.colors[1], e)];
  }
  return pair;
};

export const GradientDrift: FC<{ colors?: Pair; shifts?: SkyShift[]; span?: number; day?: boolean }> = ({ colors, shifts, span, day }) => {
  const { t } = useSong();
  const [c0, c1] = useSky(day ? [DAY.bg0, DAY.bg1] : colors, day ? [] : shifts, span);
  const pal = day ? DAY : NIGHT;
  // Two coloured hazes breathe on slow, unrelated periods so the sky never loops visibly.
  const a = 0.5 + 0.5 * Math.sin(t * 0.21);
  const b = 0.5 + 0.5 * Math.sin(t * 0.17 + 2);
  return (
    <AbsoluteFill style={{ filter: day ? undefined : `hue-rotate(${(t / 30) * 10}deg)` }}>
      <AbsoluteFill style={{ background: `linear-gradient(165deg, ${c0} 0%, ${c0} 30%, ${c1} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(60% 55% at ${18 + a * 6}% ${88 - a * 4}%, ${alpha(pal.accent, day ? 0.1 : 0.16)} 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(50% 50% at ${84 - b * 5}% ${14 + b * 6}%, ${alpha(pal.second, day ? 0.08 : 0.1)} 0%, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

// Seeded out-of-focus orbs; nearer ones are bigger, blurrier, dimmer and drift faster. They swell a touch on the kick.
export const BokehField: FC<{ count?: number; speed?: number; palette?: string[]; seed?: number; day?: boolean; boost?: number }> = ({ count = 16, speed = 1, palette, seed = 7, day, boost = 1 }) => {
  const { f, pulse, energy } = useSong();
  const pal = day ? DAY : NIGHT;
  const cols = palette ?? [pal.accent, pal.second, pal.accent, pal.ink, pal.second, pal.accent];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: count }, (_, i) => {
        const z = 0.25 + 0.75 * random(`bz${seed}${i}`);
        const r = 30 + z * z * 210;
        const vx = (random(`bx${seed}${i}`) - 0.5) * 0.5 * speed * (0.3 + z);
        const vy = -(0.08 + 0.3 * random(`by${seed}${i}`)) * speed * (0.3 + z);
        const span = W + 2 * r;
        const spanY = H + 2 * r;
        const x = ((((random(`px${seed}${i}`) * span + vx * f) % span) + span) % span) - r;
        const y = ((((random(`py${seed}${i}`) * spanY + vy * f) % spanY) + spanY) % spanY) - r;
        const c = cols[i % cols.length]!;
        const o = (0.05 + 0.14 * (1 - z) + 0.06 * random(`bo${seed}${i}`)) * (0.85 + 0.5 * pulse * energy) * boost * (day ? 0.8 : 1);
        const s = 1 + 0.05 * pulse * energy;
        const style: CSSProperties = {
          position: "absolute",
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          opacity: o,
          transform: `scale(${s})`,
          // A soft disc with a faintly brighter rim reads as a real lens bokeh rather than a blurred dot.
          background: `radial-gradient(circle, ${alpha(c, 0.55)} 0%, ${alpha(c, 0.42)} 50%, ${alpha(c, 0.75)} 63%, ${alpha(c, 0)} 71%)`,
          filter: `blur(${1 + z * 7}px)`,
          // Screen blending makes overlapping orbs add light, like real out-of-focus highlights.
          mixBlendMode: day ? "multiply" : "screen",
        };
        return <div key={i} style={style} />;
      })}
    </AbsoluteFill>
  );
};

// Fine dust rising at 0.1–0.3 px/f with a little sway and twinkle.
export const Dust: FC<{ count?: number; seed?: number; color?: string; rise?: number }> = ({ count = 70, seed = 3, color = NIGHT.ink, rise = 1 }) => {
  const { f } = useSong();
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const v = (0.1 + 0.2 * random(`dv${seed}${i}`)) * rise;
        const y = ((((random(`dy${seed}${i}`) * (H + 40) - v * f) % (H + 40)) + H + 40) % (H + 40)) - 20;
        const x = random(`dx${seed}${i}`) * W + Math.sin(f / 70 + i) * 6;
        const tw = 0.5 + 0.5 * Math.sin(f / (18 + 20 * random(`dt${seed}${i}`)) + i);
        return <circle key={i} cx={x} cy={y} r={0.8 + 1.6 * random(`dr${seed}${i}`)} fill={color} opacity={(0.15 + 0.45 * tw) * (0.4 + 0.6 * random(`do${seed}${i}`))} />;
      })}
    </svg>
  );
};

// Film grain at ~4 %: fractal noise re-seeded every 2 frames (15 fps), so it dances without strobing.
export const Grain: FC<{ amount?: number; seed?: number }> = ({ amount = 0.045, seed = 0 }) => {
  const { f } = useSong();
  const id = `lv-grain-${seed}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: amount, pointerEvents: "none" }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(f / 2) + seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter={`url(#${id})`} />
    </svg>
  );
};

export const Vignette: FC<{ day?: boolean }> = ({ day }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, ${day ? "rgba(90,70,40,0.16)" : "rgba(4,3,12,0.6)"} 100%)` }} />
);

// A thin waveform line from samples (real audio via `samples`, else the synthetic beat spectrum). `draw` grows it outward from the centre.
export const WaveformLine: FC<{
  y?: number;
  x0?: number;
  x1?: number;
  amp?: number;
  bins?: number;
  samples?: Sampler;
  color?: string;
  opacity?: number;
  draw?: number;
  width?: number;
  seed?: number;
}> = ({ y = H / 2, x0 = 120, x1 = W - 120, amp = 46, bins = 72, samples, color = NIGHT.second, opacity = 0.8, draw = 1, width = 2.5, seed = 4 }) => {
  const { t, f, clock } = useSong();
  const v = samples ? smoothSamples(samples, f, bins) : synthSpectrum(clock, t, bins, seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < bins; i++) {
    const u = i / (bins - 1);
    if (Math.abs(u - 0.5) > draw / 2) continue;
    // Lows sit in the middle and highs at the ends, tapered by a sine window, so it reads as one breathing line.
    const k = Math.abs(u - 0.5) * 2;
    const val = v[Math.floor(k * (bins - 1))] ?? 0;
    const win = Math.sin(Math.PI * u);
    const dir = i % 2 ? 1 : -1;
    pts.push([x0 + u * (x1 - x0), y + dir * val * amp * win * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 3))]);
  }
  if (pts.length < 2) return null;
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]!;
    const [x, yy] = pts[i]!;
    d += ` Q ${px} ${py} ${(px + x) / 2} ${(py + yy) / 2}`;
  }
  const last = pts[pts.length - 1]!;
  d += ` L ${last[0]} ${last[1]}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity, filter: `drop-shadow(0 0 8px ${alpha(color, 0.7)})` }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// The full background: sky, bokeh, dust, optional waveform, grain and vignette.
export const Night: FC<{ day?: boolean; colors?: Pair; shifts?: SkyShift[]; span?: number; bokeh?: number; dust?: boolean; wave?: boolean; grain?: boolean; boost?: number }> = ({
  day,
  colors,
  shifts,
  span,
  bokeh = 16,
  dust = true,
  wave = false,
  grain = true,
  boost,
}) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <GradientDrift day={day} colors={colors} shifts={shifts} span={span} />
    {bokeh > 0 && <BokehField count={bokeh} day={day} boost={boost} />}
    {dust && <Dust color={day ? DAY.muted : NIGHT.ink} />}
    {wave && <WaveformLine y={H - 150} amp={34} opacity={0.35} color={day ? DAY.second : NIGHT.second} />}
    <Vignette day={day} />
    {grain && <Grain amount={day ? 0.06 : 0.045} />}
  </AbsoluteFill>
);

// The slow camera: zoom 1.00 → 1.06 across a section, a 0.5° sway scaled by energy, and a blur-in on the section start.
export const Lens: FC<{ from?: Cue; to?: Cue; zoom?: [number, number]; sway?: number; blurIn?: Cue; children: ReactNode }> = ({ from = 0, to = 8, zoom = [1, 1.06], sway = 0.5, blurIn, children }) => {
  const { t, clock, energy } = useSong();
  const a = clock.cue(from);
  const z = zoom[0] + (zoom[1] - zoom[0]) * ramp(t, a, Math.max(0.1, clock.cue(to) - a), INOUT);
  const r = sway * Math.sin(t * 0.45) * (0.4 + 0.6 * energy);
  const b = blurIn === undefined ? 0 : 12 * (1 - ramp(t, clock.cue(blurIn), 0.7, OUT));
  return <AbsoluteFill style={{ transform: `scale(${z}) rotate(${r}deg)`, filter: b > 0.05 ? `blur(${b}px)` : undefined }}>{children}</AbsoluteFill>;
};

// The 2 f white flash on a drop's downbeat, with a 4 f tail so it doesn't read as a dropped frame.
export const FlashCut: FC<{ at: Cue; frames?: number; color?: string }> = ({ at, frames = 2, color = "#FFFFFF" }) => {
  const { t, clock } = useSong();
  const u = (t - clock.cue(at)) * FPS;
  if (u < -0.01 || u > frames + 4) return null;
  const o = u < frames ? 1 : 0.4 * (1 - (u - frames) / 4);
  return <AbsoluteFill style={{ backgroundColor: color, opacity: o, pointerEvents: "none" }} />;
};
