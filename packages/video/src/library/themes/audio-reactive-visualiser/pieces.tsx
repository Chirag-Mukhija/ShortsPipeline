// Visualiser pieces with words in them (text stays secondary): title reveal, kick word, step sequencer, meter stat, split scope, signal-gap quote, track ID, preset switch.
import { Children, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { useSong, type Cue, type Sampler } from "../../core/beat";
import { clamp01, ramp, OUT } from "../../core/time";
import { W, H, FPS } from "../../core/video";
import { DIM, DISPLAY, M, meta, mix, MUTED, neon, NEON, sweep, title, VOID, WARM, withAlpha, type Palette } from "./theme";
import { bassOf, highsOf, rnd, spectrumAt } from "./signal";
import { ChromaticPeak, Flash, flash, punch } from "./primitives";
import { RadialSpectrum, WaveRing } from "./spectrum";

const blurIn = (t: number, at: number, d = 0.5, px = 18) => {
  const p = ramp(t, at, d, OUT);
  return { opacity: p, filter: p < 1 ? `blur(${(1 - p) * px}px)` : undefined };
};

// TitleReveal: on the first downbeat a ring wipes out from the centre and the title blurs in inside it, tracking in from wide.
// A WaveRing holds the title like a logo; kicker and metadata are tiny mono, because the music is the headline.
export const TitleReveal: FC<{ text: string; at: number; kicker?: string; info?: string; size?: number; ring?: number; palette?: Palette; samples?: Sampler }> = ({ text, at, kicker, info, size = 112, ring = 380, palette = NEON, samples }) => {
  const { t } = useSong();
  const wipe = interpolate(t, [at, at + 0.7], [0, 1150], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const p = ramp(t, at, 0.8, Easing.out(Easing.exp));
  const wipeA = 1 - ramp(t, at + 0.15, 0.55);
  const band = size / 2 + 112;
  return (
    <AbsoluteFill>
      {/* The ring breaks where the type sits, so title and ring lock up like a logo instead of crossing. */}
      <AbsoluteFill style={{ WebkitMaskImage: `linear-gradient(to bottom, #000 ${H / 2 - band - 30}px, transparent ${H / 2 - band}px, transparent ${H / 2 + band}px, #000 ${H / 2 + band + 30}px)`, maskImage: `linear-gradient(to bottom, #000 ${H / 2 - band - 30}px, transparent ${H / 2 - band}px, transparent ${H / 2 + band}px, #000 ${H / 2 + band + 30}px)` }}>
        <WaveRing r={ring} amplitude={40} at={at - 0.25} palette={palette} samples={samples} width={2.5} />
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={W / 2} cy={H / 2} r={wipe} fill="none" stroke={palette.hi} strokeWidth={2 + 8 * wipeA} opacity={wipeA} />
      </svg>
      <AbsoluteFill style={{ clipPath: `circle(${wipe}px at 50% 50%)`, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ ...title(size, 0.28 + 0.5 * (1 - p)), opacity: p, filter: p < 1 ? `blur(${(1 - p) * 26}px)` : undefined, textShadow: neon(palette.a, 0.6), paddingLeft: "0.28em", whiteSpace: "nowrap" }}>{text}</div>
      </AbsoluteFill>
      {kicker ? <div style={{ ...meta(30, palette.a), position: "absolute", width: W, top: H / 2 - size / 2 - 92, textAlign: "center", ...blurIn(t, at + 0.35) }}>{kicker}</div> : null}
      {info ? <div style={{ ...meta(28), position: "absolute", width: W, top: H / 2 + size / 2 + 60, textAlign: "center", ...blurIn(t, at + 0.55) }}>{info}</div> : null}
    </AbsoluteFill>
  );
};

// KickWord: one word lands on a kick. Zoom punch 1.2 → 1 in 12 f, a 2 f flash, a chromatic split that decays in ~4 f and
// re-fires small on every later kick, and speed lines shooting out of both sides.
export const KickWord: FC<{ word: string; at: number; sub?: string; size?: number; palette?: Palette; flashFrame?: boolean }> = ({ word, at, sub, size = 210, palette = NEON, flashFrame = true }) => {
  const { t, clock } = useSong();
  if (t < at - 0.001) return null;
  const age = t - at;
  const split = 26 * Math.exp(-age / 0.13) + 6 * clock.pulse(t, 0.08);
  const s = punch(t, at, 0.2);
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = H / 2 + (i - 4) * (size * 0.11);
    const len = (380 + ((i * 137) % 5) * 90) * Easing.out(Easing.exp)(clamp01(age / 0.35));
    const a = Math.max(0, 1 - age / 0.7) * (i % 2 ? 0.6 : 1);
    return { y, len, a, c: i % 2 ? palette.b : palette.a };
  });
  const half = word.length * size * 0.36 + 60;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        {lines.map((l, i) => (
          <g key={i} opacity={l.a}>
            <line x1={W / 2 - half} x2={W / 2 - half - l.len} y1={l.y} y2={l.y} stroke={l.c} strokeWidth={3} strokeLinecap="round" />
            <line x1={W / 2 + half} x2={W / 2 + half + l.len} y1={l.y} y2={l.y} stroke={l.c} strokeWidth={3} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <ChromaticPeak amount={split} palette={palette}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${s})` }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, letterSpacing: "0.04em", textTransform: "uppercase", color: WARM, lineHeight: 1, textShadow: neon(palette.a, 0.5 + clock.pulse(t)) }}>{word}</div>
        </AbsoluteFill>
      </ChromaticPeak>
      {sub ? <div style={{ ...meta(30, palette.a), position: "absolute", width: W, top: H / 2 - size / 2 - 70, textAlign: "center", opacity: ramp(t, at + 0.1, 0.3) }}>{sub}</div> : null}
      {flashFrame ? <Flash v={flash(t, at)} color={palette.hi} max={0.4} /> : null}
    </AbsoluteFill>
  );
};

// A step pattern: always the downbeat, then seeded hits that thicken with the row index.
const pattern = (row: number, steps: number) => Array.from({ length: steps }, (_, i) => i % 4 === 0 || ((i * 7 + row * 5) % 11) < 3 + row);

// Sequencer: a list as a 16-step grid. Each item arms on its cue (label in, cells draw on), the playhead sweeps 16ths and lit
// cells flash as it crosses; the newest row is bright and earlier rows dim, so the list reads as "now on step n".
export const Sequencer: FC<{ items: { label: string; at: number }[]; steps?: number; palette?: Palette; top?: number; rowH?: number; heading?: string }> = ({ items, steps = 16, palette = NEON, top, rowH = 118, heading }) => {
  const { t, clock } = useSong();
  const y0 = top ?? H / 2 - (items.length * rowH) / 2 + 30;
  const gx0 = 760;
  const gx1 = W - M;
  const pitch = (gx1 - gx0) / steps;
  const cell = pitch - 14;
  const stepDur = clock.spb / 4;
  const stepF = (t - clock.off) / stepDur;
  const cur = ((Math.floor(stepF) % steps) + steps) % steps;
  const latest = items.reduce((m, it, i) => (t >= it.at ? i : m), -1);
  const anyOn = latest >= 0;
  return (
    <AbsoluteFill>
      {heading ? <div style={{ ...meta(30, palette.a), position: "absolute", left: M, top: y0 - 90, opacity: ramp(t, (items[0]?.at ?? 0) - 0.4, 0.4) }}>{heading}</div> : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {anyOn ? <rect x={gx0 + cur * pitch - 4} y={y0 - 14} width={pitch - 6} height={items.length * rowH + 2} rx={10} fill={withAlpha(palette.hi, 0.07)} /> : null}
        {items.map((it, r) => {
          const on = ramp(t, it.at, 0.35);
          const dim = r === latest ? 1 : r < latest ? 0.42 : 1;
          const col = sweep(palette, items.length > 1 ? r / (items.length - 1) : 0);
          const pat = pattern(r, steps);
          const y = y0 + r * rowH;
          return (
            <g key={r} opacity={dim}>
              {pat.map((hit, i) => {
                const draw = ramp(t, it.at + i / FPS, 0.25, OUT);
                const x = gx0 + i * pitch;
                const sinceHit = stepF - (Math.floor(stepF / steps) * steps + i);
                const fl = t >= it.at && hit ? (sinceHit >= 0 && sinceHit < 1.6 ? 1 - sinceHit / 1.6 : 0) : 0;
                return (
                  <g key={i} opacity={draw}>
                    <rect x={x} y={y} width={cell} height={cell} rx={9} fill={hit ? withAlpha(col, 0.3 + 0.7 * fl) : "none"} stroke={hit ? col : "#4A4A68"} strokeWidth={2} />
                    {fl > 0.2 ? <rect x={x - 6} y={y - 6} width={cell + 12} height={cell + 12} rx={14} fill="none" stroke={withAlpha(col, 0.5 * fl)} strokeWidth={6} style={{ filter: "blur(6px)" }} /> : null}
                  </g>
                );
              })}
              <g opacity={on}>
                <foreignObject x={M - 40 * (1 - on)} y={y + cell / 2 - 32} width={gx0 - M - 40} height={64}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
                    <span style={{ ...meta(28, col) }}>{String(r + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 48, color: WARM, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{it.label}</span>
                  </div>
                </foreignObject>
              </g>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// A stereo LED meter: `level` lights segments from the bottom; the top lit one is hot white.
const LedMeter: FC<{ x: number; y: number; level: number; segs?: number; w?: number; seg?: number; palette: Palette; label: string; on: number }> = ({ x, y, level, segs = 22, w = 46, seg = 15, palette, label, on }) => {
  const n = Math.round(level * segs * on);
  return (
    <g>
      {Array.from({ length: segs }, (_, i) => {
        const lit = i < n;
        const c = i === n - 1 ? palette.hi : sweep(palette, i / (segs - 1));
        return <rect key={i} x={x} y={y - i * (seg + 6)} width={w} height={seg} rx={3} fill={lit ? c : MUTED} opacity={lit ? 1 : 0.8} />;
      })}
      <foreignObject x={x - 30} y={y + 30} width={w + 60} height={40}>
        <div style={{ ...meta(28), textAlign: "center" }}>{label}</div>
      </foreignObject>
    </g>
  );
};

// MeterStat: a big number counting up in scanline type (the bars of the spectrum run through the digits), flanked by L/R meters.
export const MeterStat: FC<{ value: number; from?: number; at: number; dur?: number; label: string; prefix?: string; suffix?: string; size?: number; palette?: Palette; samples?: Sampler }> = ({ value, from = 0, at, dur = 1.4, label, prefix = "", suffix = "", size = 270, palette = NEON, samples }) => {
  const { t, clock } = useSong();
  const spec = spectrumAt(clock, t, 32, samples, 17);
  const p = interpolate(t, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const v = Math.round(from + (value - from) * (p > 0.995 ? 1 : p));
  const on = ramp(t, at - 0.2, 0.4);
  const land = clamp01(1 - (t - at - dur * 0.6) / 0.4) * (t > at + dur * 0.6 ? 1 : 0);
  const cy = H / 2 - 30;
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <LedMeter x={M + 110} y={cy + 190} level={0.25 + 0.75 * bassOf(spec)} palette={palette} label="L" on={on} />
        <LedMeter x={W - M - 156} y={cy + 190} level={0.2 + 0.8 * Math.min(1, highsOf(spec) * 1.6 + 0.2 * clock.pulse(t))} palette={palette} label="R" on={on} />
      </svg>
      <div style={{ position: "absolute", width: W, top: cy - size * 0.55, textAlign: "center", opacity: on, transform: `scale(${1 + 0.06 * land})`, filter: `drop-shadow(0 0 18px ${withAlpha(palette.a, 0.55)}) drop-shadow(0 0 60px ${withAlpha(palette.c, 0.35)})` }}>
        <span
          style={{
            fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.1, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
            backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0 9px, ${VOID} 9px 13px), linear-gradient(to bottom, ${palette.hi} 15%, ${palette.a} 60%, ${palette.c} 100%)`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}
        >
          {prefix}{v.toLocaleString("en-US")}{suffix}
        </span>
      </div>
      <div style={{ ...meta(34, WARM), letterSpacing: "0.32em", position: "absolute", width: W, top: cy + size * 0.62, textAlign: "center", ...{ opacity: ramp(t, at + dur * 0.5, 0.4) } }}>{label}</div>
    </AbsoluteFill>
  );
};

// One oscilloscope trace as an SVG path: fn(u, x) returns −1..1.
const trace = (x0: number, x1: number, y: number, amp: number, fn: (u: number) => number, n = 220, draw = 1) =>
  `M${Array.from({ length: Math.max(2, Math.round(n * draw)) }, (_, i) => {
    const u = (i / (n - 1)) * 1;
    return `${(x0 + u * (x1 - x0)).toFixed(1)},${(y - fn(u) * amp).toFixed(1)}`;
  }).join("L")}`;

const Graticule: FC<{ x: number; y: number; w: number; h: number; o: number }> = ({ x, y, w, h, o }) => (
  <g stroke="#34344C" fill="none" opacity={o}>
    <rect x={x} y={y} width={w} height={h} rx={6} strokeWidth={1.5} />
    {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={x + ((i + 1) * w) / 10} x2={x + ((i + 1) * w) / 10} y1={y} y2={y + h} strokeWidth={1} opacity={i === 4 ? 1 : 0.45} />)}
    {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} y1={y + ((i + 1) * h) / 6} y2={y + ((i + 1) * h) / 6} x1={x} x2={x + w} strokeWidth={1} opacity={i === 2 ? 1 : 0.45} />)}
  </g>
);

// SplitScope: A vs B as two oscilloscope panels. The calm side is a clean sine; the busy side is built from the live spectrum.
export const SplitScope: FC<{ a: { tag: string; title: string; note?: string; at: number }; b: { tag: string; title: string; note?: string; at: number }; palette?: Palette; samples?: Sampler }> = ({ a, b, palette = NEON, samples }) => {
  const { t, clock } = useSong();
  const spec = spectrumAt(clock, t, 16, samples, 21);
  const bw = 720;
  const bh = 380;
  const by = 380;
  const ax = M + 24;
  const bx = W - M - 24 - bw;
  const side = (s: typeof a, x: number, col: string, fn: (u: number) => number, amp: number) => {
    const on = ramp(t, s.at, 0.4);
    const draw = ramp(t, s.at + 0.1, 0.7, OUT);
    const d = trace(x + 10, x + bw - 10, by + bh / 2, amp, fn, 260, draw);
    return (
      <g>
        <Graticule x={x} y={by} w={bw} h={bh} o={on} />
        <path d={d} fill="none" stroke={col} strokeWidth={10} opacity={0.35 * on} style={{ filter: "blur(8px)" }} />
        <path d={d} fill="none" stroke={col} strokeWidth={3} opacity={on} />
        <foreignObject x={x} y={by - 128} width={bw} height={120} opacity={on}>
          <div style={{ ...meta(28, col) }}>{s.tag}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 56, color: WARM, marginTop: 10, whiteSpace: "nowrap" }}>{s.title}</div>
        </foreignObject>
        {s.note ? (
          <foreignObject x={x} y={by + bh + 22} width={bw} height={44} opacity={ramp(t, s.at + 0.5, 0.4)}>
            <div style={{ ...meta(28) }}>{s.note}</div>
          </foreignObject>
        ) : null}
      </g>
    );
  };
  const calm = (u: number) => Math.sin(u * Math.PI * 2 * 3 + t * 3) * (0.55 + 0.1 * clock.pulse(t));
  const busy = (u: number) => {
    let v = 0;
    for (let k = 0; k < spec.length; k++) v += spec[k]! * Math.sin(u * Math.PI * 2 * (2 + k * 1.7) + t * (2 + k) + k) * (k < 3 ? 1 : 0.6);
    return Math.max(-1, Math.min(1, v / 2.2));
  };
  const vs = ramp(t, Math.min(a.at, b.at) + 0.3, 0.4);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g style={{ mixBlendMode: "screen" }}>
        {side(a, ax, palette.a, calm, bh * 0.34)}
        {side(b, bx, palette.b, busy, bh * 0.44)}
      </g>
      <g opacity={vs} transform={`translate(${W / 2} ${by + bh / 2})`}>
        <line y1={-bh / 2} y2={-46} stroke="#4A4A66" strokeWidth={1.5} />
        <line y1={46} y2={bh / 2} stroke="#4A4A66" strokeWidth={1.5} />
        <circle r={38} fill={VOID} stroke={palette.hi} strokeWidth={1.5} />
        <foreignObject x={-38} y={-19} width={76} height={40}>
          <div style={{ ...meta(28, WARM), textAlign: "center", letterSpacing: "0.06em" }}>VS</div>
        </foreignObject>
      </g>
    </svg>
  );
};

// SignalQuote: a waveform runs across the frame; on cue it parts into two traces and the quote fades in, word by word, in the
// calm gap between them. The traces go quiet where the words sit and stay loud at the edges.
export const SignalQuote: FC<{ text: string; by?: string; at: number; palette?: Palette; samples?: Sampler; size?: number; gap?: number }> = ({ text, by, at, palette = NEON, samples, size = 62, gap = 320 }) => {
  const { t, clock } = useSong();
  const spec = spectrumAt(clock, t, 16, samples, 23);
  const open = interpolate(t, [at, at + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const cy = H / 2;
  const words = text.split(" ");
  const wave = (ph: number) => (u: number) => {
    const quiet = 1 - open * 0.92 * Math.exp(-Math.pow((u - 0.5) / 0.24, 4));
    let v = 0;
    for (let k = 0; k < spec.length; k++) v += spec[k]! * (1.3 - k / spec.length) * Math.sin(u * Math.PI * 2 * (6 + k * 5.3 + rnd("sq", k) * 4) + t * (5 + k * 1.3) * (k % 2 ? -1 : 1) + ph + rnd("sqp", k) * 6.3);
    return (v / 2.2) * quiet * Math.pow(Math.sin(Math.PI * u), 0.6);
  };
  const top = trace(M, W - M, cy - (gap / 2) * open, 90, wave(0), 300);
  const bot = trace(M, W - M, cy + (gap / 2) * open, 90, wave(2.1), 300);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        {[[top, palette.a], [bot, palette.b]].map(([d, c], i) => (
          <g key={i} fill="none">
            <path d={d} stroke={c} strokeWidth={10} opacity={0.3} style={{ filter: "blur(9px)" }} />
            <path d={d} stroke={c} strokeWidth={2.5} />
          </g>
        ))}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 1500, textAlign: "center", fontFamily: DISPLAY, fontWeight: 500, fontSize: size, lineHeight: 1.22, color: WARM, letterSpacing: "0.005em" }}>
          {words.map((w, i) => (
            <span key={i} style={{ display: "inline-block", marginRight: "0.28em", ...blurIn(t, at + 0.35 + i * 0.07, 0.45, 14) }}>{w}</span>
          ))}
        </div>
      </AbsoluteFill>
      {by ? <div style={{ ...meta(28, palette.a), position: "absolute", width: W, top: cy + gap / 2 + 70, textAlign: "center", opacity: ramp(t, at + 0.5 + words.length * 0.07, 0.4) }}>— {by}</div> : null}
    </AbsoluteFill>
  );
};

// TrackId: the now-playing lower third with the licence on it (the studio records every track's licence). A spinning
// mini radial spectrum is its badge; it wipes in behind a bright scan edge and wipes back out on `out`.
export const TrackId: FC<{ title: string; artist: string; license: string; at: number; out?: number; palette?: Palette; samples?: Sampler }> = ({ title: name, artist, license, at, out, palette = NEON, samples }) => {
  const { t } = useSong();
  const inP = interpolate(t, [at, at + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const outP = out === undefined ? 0 : ramp(t, out, 0.4, Easing.in(Easing.cubic));
  const reveal = inP * (1 - outP);
  const bx = M;
  const by = H - M - 150;
  const width = 1000;
  const edge = bx + reveal * width;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${W - edge}px 0 0)` }}>
        <div style={{ position: "absolute", left: bx, top: by, width: 150, height: 150 }}>
          <AbsoluteFill style={{ transform: `translate(${-W / 2 + 75}px, ${-H / 2 + 75}px)` }}>
            <RadialSpectrum radius={34} rows={4} step={9} dot={3} bins={14} rotation={0.6} at={at} palette={palette} samples={samples} core />
          </AbsoluteFill>
        </div>
        <div style={{ position: "absolute", left: bx + 182, top: by + 4 }}>
          <div style={{ ...meta(28, palette.a) }}>Now playing</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 52, color: WARM, marginTop: 6, whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ ...meta(28), marginTop: 8, whiteSpace: "nowrap" }}>{artist} · {license}</div>
        </div>
      </AbsoluteFill>
      {reveal > 0 && reveal < 0.995 ? <div style={{ position: "absolute", left: edge - 2, top: by - 10, width: 3, height: 170, background: palette.hi, boxShadow: `0 0 18px ${palette.a}, 0 0 40px ${palette.a}` }} /> : null}
    </AbsoluteFill>
  );
};

// PresetSwitch: scenes change on bar lines with a 6 f dissolve. Cues listed in `drops` also zoom-punch 1 → 1.2 → 1 and flash.
// `labels` show which preset is up (e.g. "02 / PEAK · SUNRISE") in the top-left corner.
export const PresetSwitch: FC<{ at: Cue[]; drops?: Cue[]; labels?: string[]; dissolve?: number; palette?: Palette; children: ReactNode }> = ({ at, drops = [], labels, dissolve = 6, palette = NEON, children }) => {
  const { t, clock } = useSong();
  const cues = at.map((c) => clock.cue(c));
  const dropT = drops.map((c) => clock.cue(c));
  const scenes = Children.toArray(children);
  const d = dissolve / FPS;
  const vis = (i: number) => {
    const a = i === 0 ? 1 : ramp(t, cues[i - 1]! - d / 2, d, (x) => x);
    const b = i >= cues.length ? 0 : ramp(t, cues[i]! - d / 2, d, (x) => x);
    return a * (1 - b);
  };
  const s = dropT.reduce((m, c) => m * punch(t, c, 0.2), 1);
  const fl = dropT.reduce((m, c) => Math.max(m, flash(t, c)), 0);
  const idx = cues.filter((c) => t >= c).length;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>
        {scenes.map((sc, i) => {
          const o = vis(i);
          return o > 0.001 ? <AbsoluteFill key={i} style={{ opacity: o }}>{sc}</AbsoluteFill> : null;
        })}
      </AbsoluteFill>
      {labels?.[idx] ? (
        <div style={{ ...meta(28, WARM), position: "absolute", left: M, top: M - 20, display: "flex", gap: 18, alignItems: "center" }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: palette.b, boxShadow: `0 0 14px ${palette.b}` }} />
          {labels[idx]}
        </div>
      ) : null}
      <Flash v={fl} color={WARM} max={0.22} />
      <div style={{ ...meta(28, DIM), position: "absolute", right: M, top: M - 20 }}>BAR {clock.pos(t).bar}</div>
    </AbsoluteFill>
  );
};

// A colour preset dissolve helper for pieces that want to blend palettes themselves.
export const presetMix = (t: number, at: number, a: Palette, b: Palette): Palette => {
  const k = ramp(t, at - 3 / FPS, 6 / FPS, (x) => x);
  const m = (x: string, y: string) => mix(x, y, k);
  return { name: k < 0.5 ? a.name : b.name, a: m(a.a, b.a), b: m(a.b, b.b), c: m(a.c, b.c), hi: m(a.hi, b.hi) };
};
