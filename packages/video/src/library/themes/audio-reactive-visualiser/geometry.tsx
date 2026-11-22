// Geometry and particle signatures: nested polygon loop, the Lissajous vector scope with trails, beat-table particle bursts, the beat tunnel.
import { useId, type FC } from "react";
import { AbsoluteFill } from "remotion";
import { useSong, type Sampler } from "../../core/beat";
import { clamp01 } from "../../core/time";
import { W, H, FPS } from "../../core/video";
import { meta, NEON, sweep, withAlpha, type Palette } from "./theme";
import { bassOf, highsOf, rnd, spectrumAt } from "./signal";
import { Canvas2D, expoIn, glowDot, glowLine, trail } from "./primitives";

const polyPts = (sides: number, r: number, rot: number) =>
  Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });

// GeometryLoop: nested polygons, layer i turning at (i+1) × the base angle (alternating direction), so the set falls in and out
// of alignment; each layer reads one spectrum bin (inner = bass) for its scale (≤ 12 %) and brightness. Lattice lines tie
// each vertex to the next layer's.
export const GeometryLoop: FC<{ cx?: number; cy?: number; sides?: number; layers?: number; r0?: number; r1?: number; base?: number; palette?: Palette; at?: number; samples?: Sampler; seed?: number; lattice?: boolean }> = ({ cx = W / 2, cy = H / 2, sides = 6, layers = 9, r0 = 56, r1 = 430, base = 5, palette = NEON, at = 0, samples, seed = 7, lattice = true }) => {
  const { t, clock } = useSong();
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spec = spectrumAt(clock, t, layers, samples, seed);
  const kick = clock.pulse(t, 0.1);
  const L = Array.from({ length: layers }, (_, i) => {
    const grow = expoIn(t, at + (i * 2) / FPS, 24);
    const r = r0 * Math.pow(r1 / r0, i / Math.max(1, layers - 1)) * (1 + 0.12 * spec[i]!) * grow;
    const rot = (((i % 2 ? -1 : 1) * base * (i + 1) * Math.max(0, t - at)) * Math.PI) / 180;
    return { pts: polyPts(sides, r, rot), c: sweep(palette, i / Math.max(1, layers - 1)), v: spec[i]!, grow };
  });
  const d = (pts: [number, number][]) => `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}Z`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={8} />
        </filter>
      </defs>
      <g transform={`translate(${cx} ${cy})`} fill="none" style={{ mixBlendMode: "screen" }}>
        {lattice
          ? L.slice(0, -1).map((l, i) =>
              l.pts.map((p, k) => {
                const q = L[i + 1]!.pts[k]!;
                return <line key={`${i}-${k}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={withAlpha(l.c, 0.18 * l.grow)} strokeWidth={1} />;
              }),
            )
          : null}
        {L.map((l, i) => (
          <g key={i} opacity={l.grow}>
            <path d={d(l.pts)} stroke={l.c} strokeWidth={6} opacity={0.3 + 0.5 * l.v} filter={`url(#${id})`} />
            <path d={d(l.pts)} stroke={l.c} strokeWidth={2 + 1.5 * l.v + (i === 0 ? 2 * kick : 0)} opacity={0.55 + 0.45 * l.v} />
            {l.pts.map((p, k) => <circle key={k} cx={p[0]} cy={p[1]} r={2.5 + 2.5 * l.v} fill={palette.hi} opacity={0.5 + 0.5 * l.v} />)}
          </g>
        ))}
        <circle r={10 + 16 * kick} fill={palette.hi} opacity={0.25 + 0.5 * kick} filter={`url(#${id})`} />
      </g>
    </svg>
  );
};

// Lissajous ratios the scope steps through, one per song section, so the figure changes with the music's structure.
const RATIOS: [number, number][] = [[3, 2], [5, 4], [3, 4], [5, 6], [2, 3]];

// VectorScope: an XY oscilloscope figure. The phase drifts so the figure turns in 3D, the bass swells it, the highs fizz its
// edge, and the last `length` frames trail behind it from palette.b to palette.a. Behind: a scope graticule.
export const VectorScope: FC<{ cx?: number; cy?: number; size?: number; ratio?: [number, number]; length?: number; fade?: number; palette?: Palette; samples?: Sampler; at?: number; graticule?: boolean; readout?: boolean }> = ({ cx = W / 2, cy = H / 2, size = 340, ratio, length = 9, fade = 0.7, palette = NEON, samples, at = 0, graticule = true, readout = true }) => {
  const { t, clock } = useSong();
  const [a, b] = ratio ?? RATIOS[clock.sectionIndex(t) % RATIOS.length]!;
  const open = expoIn(t, at, 30);
  const figure = (tt: number) => {
    const spec = spectrumAt(clock, tt, 24, samples, 11);
    const bass = bassOf(spec);
    const hi = highsOf(spec);
    const amp = size * open * (0.8 + 0.22 * bass);
    const ph = tt * 0.55;
    const n = 420;
    return Array.from({ length: n + 1 }, (_, i) => {
      const s = (i / n) * Math.PI * 2;
      const fizz = 1 + 0.035 * hi * Math.sin(s * 60 + tt * 30);
      return [cx + Math.sin(a * s + ph) * amp * fizz, cy + Math.sin(b * s) * amp * fizz] as [number, number];
    });
  };
  const g = size + 60;
  return (
    <AbsoluteFill>
      {graticule ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: open }}>
          <g transform={`translate(${cx} ${cy})`} stroke="#3A3A52" fill="none">
            <rect x={-g} y={-g} width={g * 2} height={g * 2} strokeWidth={1.5} />
            {Array.from({ length: 9 }, (_, i) => (i + 1) / 10).map((u) => (
              <g key={u}>
                <line x1={-g + u * 2 * g} x2={-g + u * 2 * g} y1={-g} y2={g} strokeWidth={1} opacity={u === 0.5 ? 1 : 0.4} />
                <line y1={-g + u * 2 * g} y2={-g + u * 2 * g} x1={-g} x2={g} strokeWidth={1} opacity={u === 0.5 ? 1 : 0.4} />
              </g>
            ))}
            {Array.from({ length: 41 }, (_, i) => -g + (i / 40) * 2 * g).map((v, i) => (
              <g key={`t${i}`}>
                <line x1={v} x2={v} y1={-6} y2={6} strokeWidth={1} />
                <line y1={v} y2={v} x1={-6} x2={6} strokeWidth={1} />
              </g>
            ))}
          </g>
        </svg>
      ) : null}
      <Canvas2D
        draw={(ctx) => {
          trail(length, fade, (k, alpha) => {
            const col = k === 0 ? palette.a : sweep({ ...palette, a: palette.c }, clamp01(k / length));
            glowLine(ctx, figure(t - k / FPS), col, k === 0 ? 2.4 : 1.6, alpha * (k === 0 ? 1 : 0.7));
          });
          glowLine(ctx, figure(t), palette.hi, 1, 0.55);
        }}
      />
      {readout ? (
        <>
          <div style={{ ...meta(28, palette.a), position: "absolute", left: cx - g, top: cy - g - 56, opacity: open }}>X·Y {a}:{b}</div>
          <div style={{ ...meta(28), position: "absolute", left: cx + g - 300, width: 300, textAlign: "right", top: cy - g - 56, opacity: open }}>{clock.bpm} BPM</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ParticleBurst: on every beat from `at`, `count` particles leave the centre with seeded angle and speed (downbeats 1.6× bigger);
// position is closed-form drag, p = v·(1 − e^(−k·age))/k, so any frame is computed directly. Streaks are the TrailBuffer idea:
// each particle is drawn from where it was 2 f ago. `drop` fires a ring of 220 at once; hats scatter sparkles across the frame.
export const ParticleBurst: FC<{ cx?: number; cy?: number; count?: number; palette?: Palette; at?: number; drop?: number; speed?: number; life?: number; sparkles?: boolean; core?: boolean }> = ({ cx = W / 2, cy = H / 2, count = 34, palette = NEON, at = 0, drop, speed = 1700, life = 1.7, sparkles = true, core = true }) => {
  const { t, clock } = useSong();
  const k = 2.4;
  const reach = (age: number) => (1 - Math.exp(-k * age)) / k;
  const cols = [palette.a, palette.c, palette.b, palette.hi];
  return (
    <Canvas2D
      draw={(ctx) => {
        ctx.lineCap = "round";
        const first = Math.max(Math.ceil((at - clock.off) / clock.spb - 1e-6), Math.floor((t - life - clock.off) / clock.spb));
        const last = Math.floor((t - clock.off) / clock.spb);
        for (let bi = first; bi <= last; bi++) {
          const te = clock.beatSec(bi);
          const age = t - te;
          if (age < 0 || age > life) continue;
          const down = clock.pos(te + 0.001).beatInBar === 1;
          const n = Math.round(count * (down ? 1.6 : 1) * (0.5 + clock.energy(te)));
          const fadeA = Math.pow(1 - age / life, 1.4);
          for (let j = 0; j < n; j++) {
            const ang = rnd(`pb${bi}`, j) * Math.PI * 2;
            const v = speed * (down ? 1.3 : 1) * (0.25 + 0.75 * Math.pow(rnd(`pv${bi}`, j), 0.7));
            const col = cols[Math.floor(rnd(`pc${bi}`, j) * cols.length)]!;
            const size = 1.4 + 2.4 * rnd(`ps${bi}`, j);
            const d1 = v * reach(age);
            const d0 = v * reach(Math.max(0, age - 4 / FPS));
            const x1 = cx + Math.cos(ang) * d1;
            const y1 = cy + Math.sin(ang) * d1;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * d0, cy + Math.sin(ang) * d0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = withAlpha(col, 0.55 * fadeA);
            ctx.lineWidth = size;
            ctx.stroke();
            glowDot(ctx, col, x1, y1, size, 0.9 * fadeA);
          }
        }
        if (drop !== undefined && t >= drop && t - drop < 2.2) {
          const age = t - drop;
          const fadeA = Math.pow(1 - age / 2.2, 1.2);
          const R = 1500 * reach(age) * 1.6;
          [{ c: palette.a, lag: 0 }, { c: palette.b, lag: 18 }].forEach(({ c, lag }) => {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, R - lag), 0, Math.PI * 2);
            ctx.strokeStyle = withAlpha(c, 0.55 * fadeA);
            ctx.lineWidth = 2 + 10 * fadeA;
            ctx.stroke();
          });
          for (let j = 0; j < 220; j++) {
            const ang = (j / 220) * Math.PI * 2 + rnd("dr", j) * 0.03;
            const d = R * (0.82 + 0.3 * rnd("dd", j));
            glowDot(ctx, j % 3 ? palette.a : palette.b, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 2.2, fadeA);
          }
        }
        if (sparkles) {
          const e8 = Math.floor(((t - clock.off) / clock.spb) * 2);
          for (let back = 0; back < 2; back++) {
            const idx = e8 - back;
            const age = t - (clock.off + (idx * clock.spb) / 2);
            const a = Math.exp(-age / 0.09) * clock.energy(t);
            for (let j = 0; j < 14; j++) glowDot(ctx, palette.hi, 120 + rnd(`sx${idx}`, j) * (W - 240), 90 + rnd(`sy${idx}`, j) * (H - 180), 1.3, a * 0.9);
          }
        }
        if (core) {
          const p = clock.pulse(t, 0.12);
          glowDot(ctx, palette.hi, cx, cy, 10 + 14 * p, 0.6 + 0.4 * p);
          glowDot(ctx, palette.a, cx, cy, 26 + 20 * p, 0.25 + 0.3 * p);
        }
      }}
    />
  );
};

// BeatTunnel: a polygon is born at the vanishing point on every beat and flies at the camera over `life` beats (radius grows
// 30× on an exponential, the way perspective does). Downbeat frames are doubled; colour steps through the palette by bar.
export const BeatTunnel: FC<{ cx?: number; cy?: number; sides?: number; life?: number; palette?: Palette; at?: number; spin?: number; rails?: boolean; samples?: Sampler }> = ({ cx = W / 2, cy = H / 2, sides = 4, life = 6, palette = NEON, at = 0, spin = 6, rails = true, samples }) => {
  const { t, clock } = useSong();
  const id = `bt${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const spec = spectrumAt(clock, t, 16, samples, 13);
  const bass = bassOf(spec);
  const cols = [palette.a, palette.c, palette.b];
  const last = Math.floor((t - clock.off) / clock.spb);
  const first = Math.max(Math.ceil((at - clock.off) / clock.spb - 1e-6) - life, last - life);
  const rings: { r: number; o: number; rot: number; c: string; down: boolean; w: number }[] = [];
  for (let bi = first; bi <= last; bi++) {
    const u = (t - clock.beatSec(bi)) / (life * clock.spb);
    if (u < 0 || u > 1) continue;
    const pos = clock.pos(clock.beatSec(bi) + 0.001);
    rings.push({
      r: 34 * Math.pow(32, u) * (1 + 0.08 * bass),
      o: clamp01(u * 5) * clamp01((1 - u) * 3) * expoIn(t, at, 12),
      rot: bi * 7.5 + t * spin,
      c: cols[(pos.bar - 1 + 300) % cols.length]!,
      down: pos.beatInBar === 1,
      w: 1.5 + 6 * u,
    });
  }
  const poly = (r: number, rot: number) =>
    sides < 3 ? null : polyPts(sides, r, (rot * Math.PI) / 180).map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={9} />
        </filter>
      </defs>
      <g transform={`translate(${cx} ${cy})`} fill="none" style={{ mixBlendMode: "screen" }}>
        {rails
          ? Array.from({ length: sides * 2 }, (_, i) => {
              const a = ((t * spin + (i * 180) / sides) * Math.PI) / 180 - Math.PI / 2;
              return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 1500} y2={Math.sin(a) * 1500} stroke={withAlpha(palette.c, 0.14)} strokeWidth={1.5} />;
            })
          : null}
        {rings.map((g, i) => (
          <g key={i} opacity={g.o}>
            {sides < 3 ? <circle r={g.r} stroke={g.c} strokeWidth={g.w * 2.5} opacity={0.4} filter={`url(#${id})`} /> : <polygon points={poly(g.r, g.rot)!} stroke={g.c} strokeWidth={g.w * 2.5} opacity={0.4} filter={`url(#${id})`} />}
            {sides < 3 ? <circle r={g.r} stroke={g.c} strokeWidth={g.w} /> : <polygon points={poly(g.r, g.rot)!} stroke={g.c} strokeWidth={g.w} />}
            {g.down ? (sides < 3 ? <circle r={g.r * 0.94} stroke={palette.hi} strokeWidth={g.w * 0.4} /> : <polygon points={poly(g.r * 0.94, g.rot)!} stroke={palette.hi} strokeWidth={g.w * 0.4} />) : null}
          </g>
        ))}
        <circle r={6 + 10 * clock.pulse(t)} fill={palette.hi} filter={`url(#${id})`} />
      </g>
    </svg>
  );
};
