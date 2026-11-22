// Signature moments only a lyric visualiser does: the drop (riser, flash, slam, shockwave), the spectrum halo, the on-beat crossfade and a line dissolving into dust.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, random } from "remotion";
import { INOUT, OUT, ramp } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { smoothSamples, synthSpectrum, useSong, type Cue, type Sampler } from "./beat";
import { FlashCut } from "./atmosphere";
import { BeatDots, LEAD, lineOut, wordIn, type Exit } from "./type";
import { M, NIGHT, SKY, alpha, glow, mix, voice, type Voice } from "./theme";

const IN = Easing.in(Easing.cubic);

// The drop: a riser line widens its tracking over the last bar while four dots count in; on the downbeat a 2 f flash,
// a hard cut to the peak sky, the words slam in on the 8ths (6 f from 130 %), a shockwave ring and a camera kick.
export const DropHit: FC<{ at: Cue; words: string; riser?: string; size?: number; y?: number; sky?: boolean }> = ({ at, words, riser, size = 300, y = H / 2 - 10, sky = true }) => {
  const { t, clock, pulse } = useSong();
  const a = clock.cue(at);
  const pre = a - clock.spBar;
  const ws = words.split(/\s+/).filter(Boolean);
  const after = t >= a;
  const kick = after ? Math.exp(-(t - a) / 0.16) : 0;
  const u = ramp(t, a, 0.75, OUT);
  const build = ramp(t, pre, clock.spBar, Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      {sky && after && (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(80% 80% at 50% 55%, ${SKY.peak[1]} 0%, ${SKY.peak[0]} 75%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(45% 45% at 50% 50%, ${alpha(NIGHT.accent, 0.18 + 0.4 * kick + 0.06 * pulse)} 0%, transparent 70%)` }} />
        </AbsoluteFill>
      )}
      {!after && riser && (
        <>
          <div style={{ position: "absolute", left: M, right: M, top: H / 2 - 30, transform: "translateY(-50%)", textAlign: "center", ...voice("cool", 54), textTransform: "uppercase", letterSpacing: `${0.12 + 0.5 * build}em`, color: mix(NIGHT.muted, NIGHT.ink, build), textShadow: glow(NIGHT.second, 1 + build), opacity: ramp(t, pre - clock.spb, 0.4, OUT) }}>
            {riser}
          </div>
          <BeatDots from={pre} y={H / 2 + 90} />
        </>
      )}
      {after && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[0, 0.12].map((d, i) => {
            const q = ramp(t, a + d, 0.8, OUT);
            return <circle key={i} cx={W / 2} cy={y} r={160 + 1050 * q} fill="none" stroke={i ? NIGHT.second : NIGHT.accent} strokeWidth={Math.max(0, 10 * (1 - q))} opacity={(1 - q) * 0.9} />;
          })}
        </svg>
      )}
      <AbsoluteFill style={{ transform: `scale(${1 + 0.06 * kick + 0.012 * pulse * (after ? 1 : 0)})` }}>
        <div style={{ position: "absolute", left: M, right: M, top: y, transform: "translateY(-50%)", textAlign: "center", ...voice("drop", size), color: NIGHT.ink }}>
          {ws.map((w, i) => {
            const c = a + i * (clock.spb / 2);
            const k = t >= c ? Math.exp(-(t - c) / 0.3) : 0;
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...wordIn(t, c, "drop") }}>
                <span style={{ display: "inline-block", color: mix(NIGHT.ink, NIGHT.accent, i === ws.length - 1 ? 0.85 : 0.6 * k), textShadow: glow(NIGHT.accent, 1.8 + 3 * k) }}>{w}</span>
                {i < ws.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: y + size * 0.52, display: "flex", justifyContent: "center", opacity: after ? u : 0 }}>
        <div style={{ width: 640 * u, height: 3, background: `linear-gradient(90deg, transparent, ${NIGHT.accent}, ${NIGHT.second}, transparent)`, boxShadow: `0 0 18px ${alpha(NIGHT.accent, 0.8)}` }} />
      </div>
      <FlashCut at={a} />
    </AbsoluteFill>
  );
};

// A ring of spectrum bars around one word, mirrored left/right, bass at the top; driven by the beat clock (or real audio via `samples`).
export const SpectrumHalo: FC<{ at: Cue; word?: string; v?: Voice; size?: number; r?: number; bars?: number; len?: number; samples?: Sampler; y?: number }> = ({
  at,
  word,
  v = "drop",
  size = 170,
  r = 250,
  bars = 88,
  len = 170,
  samples,
  y = H / 2,
}) => {
  const { t, f, clock, pulse } = useSong();
  const a = clock.cue(at);
  const half = Math.ceil(bars / 2);
  const spec = samples ? smoothSamples(samples, f, half) : synthSpectrum(clock, t, half, 9);
  const grow = ramp(t, a - LEAD, clock.spBar / 2, OUT);
  const rot = t * 4;
  const cx = W / 2;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <radialGradient id="lv-halo-core">
            <stop offset="0" stopColor={NIGHT.accent} stopOpacity={0.28} />
            <stop offset="1" stopColor={NIGHT.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={y} r={r * 1.5} fill="url(#lv-halo-core)" opacity={grow * (0.7 + 0.5 * pulse)} />
        <g transform={`rotate(${rot} ${cx} ${y})`} style={{ filter: `drop-shadow(0 0 8px ${alpha(NIGHT.accent, 0.6)})` }}>
          {Array.from({ length: bars }, (_, j) => {
            const bin = j < half ? j : bars - 1 - j;
            const val = spec[bin] ?? 0;
            const ang = (-90 + (j * 360) / bars) * (Math.PI / 180);
            const l = (10 + val * len) * grow;
            const u = bin / Math.max(1, half - 1);
            const col = mix(NIGHT.accent, NIGHT.second, u);
            const r0 = r + 4 * pulse;
            return (
              <line key={j} x1={cx + Math.cos(ang) * r0} y1={y + Math.sin(ang) * r0} x2={cx + Math.cos(ang) * (r0 + l)} y2={y + Math.sin(ang) * (r0 + l)} stroke={col} strokeWidth={7} strokeLinecap="round" opacity={0.55 + 0.45 * val} />
            );
          })}
        </g>
        <circle cx={cx} cy={y} r={(r - 26) * (0.9 + 0.1 * grow)} fill="none" stroke={alpha(NIGHT.ink, 0.35 + 0.4 * pulse)} strokeWidth={2} opacity={grow} />
        <circle cx={cx} cy={y} r={r + len + 46} fill="none" stroke={alpha(NIGHT.muted, 0.5)} strokeWidth={2} strokeDasharray="2 14" strokeLinecap="round" opacity={grow} transform={`rotate(${-rot * 1.5} ${cx} ${y})`} />
      </svg>
      {word && (
        <div style={{ position: "absolute", left: 0, right: 0, top: y, transform: `translateY(-50%) scale(${1 + 0.04 * pulse})`, textAlign: "center", ...voice(v, size), color: NIGHT.ink, textShadow: glow(NIGHT.accent, 1.8 + 1.5 * pulse), ...wordIn(t, a + clock.spb, v) }}>
          {word}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Crossfade on the beat: the outgoing line drifts or blurs out just before the cue, the incoming fades in on it. Pair with a 2-bar sky shift on <Night shifts>.
export const BeatCrossfade: FC<{ at: Cue; a: ReactNode; b: ReactNode; exit?: Exit }> = ({ at, a, b, exit = "blur" }) => {
  const { t, clock } = useSong();
  const c = clock.cue(at);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ ...lineOut(t, c - 6 / FPS, exit), translate: `0 ${-40 * ramp(t, c - 6 / FPS, 12 / FPS, IN)}px` }}>{a}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: ramp(t, c - LEAD, 12 / FPS, INOUT) }}>{b}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// The outro: a line breaks into dust letter by letter, left to right across `spread` seconds, and the dust rises and fades.
export const DustDissolve: FC<{ text: string; at: Cue; inAt?: Cue; spread?: number; v?: Voice; size?: number; y?: number; color?: string; particles?: number }> = ({
  text,
  at,
  inAt,
  spread,
  v = "emo",
  size = 150,
  y = H / 2,
  color = NIGHT.ink,
  particles = 9,
}) => {
  const { t, clock } = useSong();
  const a = clock.cue(at);
  const sp = spread ?? clock.spBar;
  const chars = Array.from(text);
  const n = chars.length;
  const enter = inAt === undefined ? 1 : ramp(t, clock.cue(inAt) - LEAD, 18 / FPS, OUT);
  return (
    <div style={{ position: "absolute", left: M, right: M, top: y, transform: `translateY(${-50 + (1 - enter) * 4}%)`, textAlign: "center", opacity: enter }}>
      <div style={{ ...voice(v, size), color, whiteSpace: "pre" }}>
        {chars.map((ch, k) => {
          const s = a + (k / Math.max(1, n - 1)) * sp;
          const go = ramp(t, s, 0.55, IN);
          const lift = ramp(t, s, 1.2, OUT);
          return (
            <span key={k} style={{ display: "inline-block", position: "relative" }}>
              <span style={{ display: "inline-block", opacity: 1 - go, filter: go > 0.01 ? `blur(${7 * go}px)` : undefined, transform: `translateY(${-34 * lift}px)`, textShadow: glow(NIGHT.accent, 1.2) }}>{ch}</span>
              {ch !== " " &&
                Array.from({ length: particles }, (_, j) => {
                  const key = `${k}-${j}`;
                  const delay = random(`dd${key}`) * 0.35;
                  const dur = 1.6 + random(`du${key}`) * 1.1;
                  const q = Math.max(0, Math.min(1, (t - s - delay) / dur));
                  if (q <= 0 || q >= 1) return null;
                  const ox = random(`ox${key}`) * 0.55;
                  const oy = 0.15 + random(`oy${key}`) * 0.75;
                  const dx = (random(`vx${key}`) - 0.35) * 160 * q + Math.sin(q * 6 + j) * 10;
                  const dy = -(120 + 300 * random(`vy${key}`)) * Easing.out(Easing.quad)(q);
                  const o = Math.min(1, q * 10) * (1 - q);
                  const r = 2.5 + random(`r${key}`) * 4;
                  const hot = random(`h${key}`) > 0.72;
                  const col = hot ? NIGHT.accent : mix(color, NIGHT.second, random(`c${key}`) * 0.4);
                  return (
                    <span
                      key={j}
                      style={{ position: "absolute", left: `${ox}em`, top: `${oy}em`, width: r * 2, height: r * 2, borderRadius: "50%", background: col, opacity: o, transform: `translate(${dx}px, ${dy}px)`, boxShadow: `0 0 ${6 + r * 2}px ${alpha(col, 0.9)}` }}
                    />
                  );
                })}
            </span>
          );
        })}
      </div>
    </div>
  );
};
