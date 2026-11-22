// Spectrum forms: mirrored bar spectrum with peak caps, a radial dot-matrix spectrum, the waveform ring and the energy envelope.
import { useId, type FC } from "react";
import { useSong, type Sampler, type Section } from "../../core/beat";
import { clamp01, ramp, OUT } from "../../core/time";
import { W, H, FPS } from "../../core/video";
import { DIM, M, meta, MUTED, NEON, sweep, withAlpha, mix, type Palette } from "./theme";
import { bassOf, peakHold, smoothCurve, spectrumAt } from "./signal";
import { expoIn } from "./primitives";

const blurId = (raw: string) => `b${raw.replace(/[^a-zA-Z0-9]/g, "")}`;

// Bars grow from the baseline over 20 f, staggered by bin from the centre out; on `out` they shrink and desaturate over 24 f.
export const SpectrumBars: FC<{
  x0?: number; x1?: number; y?: number; height?: number; bins?: number; mirror?: boolean; symmetric?: boolean;
  palette?: Palette; at?: number; out?: number; samples?: Sampler; seed?: number; caps?: boolean; gap?: number;
}> = ({ x0 = M + 24, x1 = W - M - 24, y = H / 2, height = 300, bins = 64, mirror = true, symmetric = true, palette = NEON, at = 0, out, samples, seed = 1, caps = true, gap = 0.42 }) => {
  const { t, clock } = useSong();
  const id = blurId(useId());
  const half = symmetric ? Math.ceil(bins / 2) : bins;
  const spec = spectrumAt(clock, t, half, samples, seed);
  const peaks = caps ? peakHold(clock, t, half, samples, seed) : spec;
  const pitch = (x1 - x0) / bins;
  const bw = pitch * (1 - gap);
  const exit = out === undefined ? 0 : ramp(t, out, 24 / FPS, OUT);
  const binOf = (i: number) => (symmetric ? Math.min(half - 1, Math.floor(Math.abs(i + 0.5 - bins / 2))) : i);
  const bars = Array.from({ length: bins }, (_, i) => {
    const b = binOf(i);
    const grow = ramp(t, at + (b * 0.6) / FPS, 20 / FPS, OUT) * (1 - exit);
    const v = spec[b]!;
    const h = (0.03 + 0.97 * v) * height * grow;
    const ph = (0.03 + 0.97 * peaks[b]!) * height * grow;
    const col = mix(sweep(palette, b / Math.max(1, half - 1)), "#55556A", exit);
    return { x: x0 + i * pitch + (pitch - bw) / 2, h, ph, col, grow };
  });
  const body = (glow: boolean) =>
    bars.map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={y - b.h} width={bw} height={b.h} rx={bw / 2} fill={b.col} opacity={glow ? 0.9 : 1} />
        {mirror ? <rect x={b.x} y={y} width={bw} height={b.h} rx={bw / 2} fill={b.col} opacity={glow ? 0.5 : 0.55} /> : null}
        {caps && !glow && b.grow > 0.05 ? <rect x={b.x} y={y - b.ph - 10} width={bw} height={4} rx={2} fill={palette.hi} opacity={0.85 * b.grow} /> : null}
        {caps && !glow && mirror && b.grow > 0.05 ? <rect x={b.x} y={y + b.ph + 6} width={bw} height={4} rx={2} fill={palette.hi} opacity={0.4 * b.grow} /> : null}
      </g>
    ));
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation={12} />
        </filter>
      </defs>
      <g filter={`url(#${id})`} style={{ mixBlendMode: "screen" }}>{body(true)}</g>
      <g style={{ mixBlendMode: "screen" }}>{body(false)}</g>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={withAlpha(palette.hi, 0.35 * (1 - exit))} strokeWidth={1.5} />
    </svg>
  );
};

// Radial dot-matrix: each spoke is a column of LED dots lit outward by its bin, mirrored left/right with the bass at the top.
// The ring opens from radius 0 in 30 f out-expo and turns 0.1° per frame; the core ring scales up to 12 % on the bass.
export const RadialSpectrum: FC<{
  cx?: number; cy?: number; radius?: number; bins?: number; rows?: number; step?: number; dot?: number; rotation?: number;
  palette?: Palette; at?: number; samples?: Sampler; seed?: number; core?: boolean;
}> = ({ cx = W / 2, cy = H / 2, radius = 200, bins = 36, rows = 11, step = 19, dot = 4.6, rotation = 0.1, palette = NEON, at = 0, samples, seed = 2, core = true }) => {
  const { t, f, clock } = useSong();
  const id = blurId(useId());
  const spec = spectrumAt(clock, t, bins, samples, seed);
  const bass = bassOf(spec);
  const open = expoIn(t, at, 30);
  const spokes = bins * 2;
  const lit: { x: number; y: number; c: string; r: number }[] = [];
  const off: { x: number; y: number }[] = [];
  for (let k = 0; k < spokes; k++) {
    const b = k < bins ? k : spokes - 1 - k;
    const a = (k / spokes) * Math.PI * 2 - Math.PI / 2 + Math.PI / spokes;
    const n = spec[b]! * rows * clamp01((open - 0.4) / 0.6 + 0.0001);
    for (let j = 0; j < rows; j++) {
      const r = (radius + j * step) * open;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (j < n) lit.push({ x, y, c: j + 1 >= n ? palette.hi : sweep(palette, j / (rows - 1)), r: dot * (j + 1 >= n ? 1.15 : 1) });
      else off.push({ x, y });
    }
  }
  const coreR = (radius - 34) * open * (1 + 0.12 * bass);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={7} />
        </filter>
      </defs>
      <g transform={`rotate(${f * rotation} ${cx} ${cy})`}>
        {off.map((p, i) => <circle key={`o${i}`} cx={p.x} cy={p.y} r={dot * 0.55} fill={MUTED} opacity={0.9} />)}
        <g filter={`url(#${id})`} style={{ mixBlendMode: "screen" }}>
          {lit.map((p, i) => <circle key={`g${i}`} cx={p.x} cy={p.y} r={p.r * 1.6} fill={p.c} opacity={0.8} />)}
        </g>
        {lit.map((p, i) => <circle key={`l${i}`} cx={p.x} cy={p.y} r={p.r} fill={p.c} />)}
      </g>
      {core ? (
        <g transform={`translate(${cx} ${cy})`} fill="none" style={{ mixBlendMode: "screen" }}>
          <circle r={coreR} stroke={withAlpha(palette.a, 0.9)} strokeWidth={2.5} />
          <circle r={coreR} stroke={withAlpha(palette.a, 0.35)} strokeWidth={12} filter={`url(#${id})`} />
          <polygon
            transform={`rotate(${-f * 0.6})`}
            points={Array.from({ length: 6 }, (_, i) => `${Math.cos((i / 6) * Math.PI * 2) * coreR * 0.72},${Math.sin((i / 6) * Math.PI * 2) * coreR * 0.72}`).join(" ")}
            stroke={withAlpha(palette.b, 0.7)}
            strokeWidth={1.5}
          />
        </g>
      ) : null}
    </svg>
  );
};

// Ring displacement from the spectrum: each bin is the amplitude of one cosine harmonic measured from the top, so the ring
// stays mirror-symmetric; time only breathes each harmonic's amplitude.
export const ringPath = (cx: number, cy: number, r: number, amp: number, spec: number[], t: number, points = 240) => {
  const pts: string[] = [];
  for (let i = 0; i <= points; i++) {
    const th = (i / points) * Math.PI * 2;
    let d = 0;
    for (let k = 0; k < spec.length; k++) d += spec[k]! * Math.cos((2 * k + 8) * th) * (0.5 + 0.5 * Math.sin(t * (1.7 + k * 0.53) + k * 1.9)) * (1.2 - k / spec.length);
    const rr = Math.max(0, r + amp * d * 0.55);
    pts.push(`${(cx + Math.sin(th) * rr).toFixed(1)},${(cy - Math.cos(th) * rr).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};

// WaveRing: three rings in a, c, b read the spectrum 0, 2 and 4 frames apart and add on screen, so peaks separate into colour.
export const WaveRing: FC<{ cx?: number; cy?: number; r?: number; amplitude?: number; harmonics?: number; samples?: Sampler; palette?: Palette; at?: number; width?: number; seed?: number }> = ({ cx = W / 2, cy = H / 2, r = 300, amplitude = 46, harmonics = 18, samples, palette = NEON, at = 0, width = 3, seed = 5 }) => {
  const { t, clock } = useSong();
  const id = blurId(useId());
  const open = expoIn(t, at, 30);
  const layers = [
    { c: palette.b, lag: 6 },
    { c: palette.c, lag: 3 },
    { c: palette.a, lag: 0 },
  ];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      {layers.map((l, i) => {
        const tt = t - l.lag / FPS;
        const spec = spectrumAt(clock, tt, harmonics, samples, seed);
        const d = ringPath(cx, cy, r * open * (1 + 0.06 * bassOf(spec)), amplitude * open, spec, tt);
        return (
          <g key={i} fill="none" style={{ mixBlendMode: "screen" }}>
            <path d={d} stroke={l.c} strokeWidth={width * 3} opacity={0.5} filter={`url(#${id})`} />
            <path d={d} stroke={l.c} strokeWidth={width} opacity={0.95} />
          </g>
        );
      })}
    </svg>
  );
};

// EnergyEnvelope: a loudness curve (RMS per frame from an offline pass, or synthEnergyCurve) as mirrored bars across the song,
// sections bracketed underneath, lit up to a playhead. `now` is song seconds; `length` is how many seconds the curve spans.
export const EnergyEnvelope: FC<{
  curve: number[]; length: number; smoothing?: number; sections?: Section[]; now: number; at?: number;
  x0?: number; x1?: number; y?: number; height?: number; bars?: number; palette?: Palette;
}> = ({ curve, length, smoothing = 2, sections = [], now, at = 0, x0 = M + 64, x1 = W - M - 64, y = 470, height = 210, bars = 132, palette = NEON }) => {
  const { t } = useSong();
  const id = blurId(useId());
  const sm = smoothCurve(curve, smoothing);
  const pitch = (x1 - x0) / bars;
  const vals = Array.from({ length: bars }, (_, i) => {
    const a = Math.floor((i / bars) * sm.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * sm.length));
    let m = 0;
    for (let j = a; j < b; j++) m = Math.max(m, sm[j] ?? 0);
    return m;
  });
  const px = x0 + clamp01(now / length) * (x1 - x0);
  const sx = (s: number) => x0 + (s / length) * (x1 - x0);
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const peak = sections.reduce<Section | undefined>((m, s) => (!m || (s.energy ?? (s.name === "peak" ? 1 : 0)) > (m.energy ?? (m.name === "peak" ? 1 : 0)) ? s : m), undefined);
  const barsEl = (glow: boolean) =>
    vals.map((v, i) => {
      const x = x0 + i * pitch;
      const g = ramp(t, at + i * 0.008, 0.35, OUT);
      const h = (0.04 + 0.96 * v) * height * g;
      const on = x + pitch / 2 <= px;
      if (glow && !on) return null;
      const c = on ? sweep(palette, v) : "#3A3A50";
      return <rect key={i} x={x + pitch * 0.2} y={y - h} width={pitch * 0.6} height={h * 2} rx={pitch * 0.3} fill={c} opacity={on ? 1 : 0.9} />;
    });
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation={9} />
        </filter>
      </defs>
      <g filter={`url(#${id})`} opacity={0.75} style={{ mixBlendMode: "screen" }}>{barsEl(true)}</g>
      <g style={{ mixBlendMode: "screen" }}>{barsEl(false)}</g>
      {sections.map((s, i) => {
        const a = ramp(t, at + 0.5 + i * 0.12, 0.4);
        const isPeak = s === peak;
        const col = isPeak ? palette.b : DIM;
        return (
          <g key={i} opacity={a}>
            <path d={`M${sx(s.start) + 6},${y + height + 46} v14 H${sx(s.end) - 6} v-14`} fill="none" stroke={isPeak ? palette.b : "#4A4A62"} strokeWidth={2} />
            <foreignObject x={sx(s.start)} y={y + height + 72} width={sx(s.end) - sx(s.start)} height={44}>
              <div style={{ ...meta(28, col), textAlign: "center" }}>{s.label ?? s.name}</div>
            </foreignObject>
          </g>
        );
      })}
      <g opacity={ramp(t, at + 0.2, 0.3)}>
        <line x1={px} x2={px} y1={y - height - 40} y2={y + height + 20} stroke={palette.hi} strokeWidth={2.5} />
        <line x1={px} x2={px} y1={y - height - 40} y2={y + height + 20} stroke={palette.hi} strokeWidth={10} opacity={0.35} filter={`url(#${id})`} />
        <foreignObject x={px - 90} y={y - height - 96} width={180} height={44}>
          <div style={{ ...meta(28, palette.hi), textAlign: "center" }}>{mm(now)}</div>
        </foreignObject>
      </g>
    </svg>
  );
};
