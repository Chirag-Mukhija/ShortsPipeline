// Slat scenes: the wordmark title card, the walking-sheep loader with its two-corner footer, the parallax landscape that breathes on the beat, the kilim that weaves a band per cue, and the floating window photo.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { W, H } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { hash, useLoom } from "./clock";
import { SlatCanvas, Mark, Stage, type Tone } from "./loom";
import { emblem, landscape, ridgeNear, sheep, PhotoStandIn } from "./art";
import { Caps, SlatType } from "./type";
import { INK, M, TAN, type Section } from "./theme";

const EXPO_OUT = Easing.out(Easing.exp);

// ---------- title card ----------
export type TitleCardProps = { title: string; kicker?: string[]; corner?: string[]; at?: number; out?: number; emblem?: boolean; hop?: number };

// The board's opening: a huge slat wordmark across the bottom rising slice by slice, the ridge emblem above, small wide caps in the corners.
export const TitleCard: FC<TitleCardProps> = ({ title, kicker = [], corner = [], at = 0.2, out, emblem: showEmblem = true, hop = 0.35 }) => {
  const { t } = useLoom();
  const fit = W - M * 2;
  const size = Math.min(300, fit / (title.length * 0.8));
  const grow = ramp(t, at + 0.6, 1.2, INOUT) * (out === undefined ? 1 : 1 - ramp(t, out, 0.5));
  return (
    <AbsoluteFill>
      {showEmblem && (
        <SlatCanvas
          x={960 - 200}
          y={170}
          w={400}
          h={400}
          tone={emblem({ x: 200, y: 200, r: 196, t })}
          col={(i) => ({ top: 1 - Math.min(1, grow * 1.6 - (i / 66) * 0.6) })}
        />
      )}
      <Stage>
        <Mark x={M} y={150} p={ramp(t, at, 0.8)} />
        <Caps lines={kicker} x={M} y={215} at={at + 0.3} />
        <Caps lines={corner} x={W - M} y={H - M - (title.length > 0 ? size * 0.74 + 70 : 0)} anchor="end" at={at + 0.5} />
        <SlatType text={title} x={M} y={H - M} size={size} fit={fit} at={at} spread={0.9} out={out} hop={hop} />
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- sheep loader ----------
export type SheepLoaderProps = { at?: number; load?: number; topLeft?: string[]; bottomLeft?: string[]; bottomRight?: string[] };

// Loader: a slat sheep walks in place on a 4-pose cycle at 8 fps over tufts that scroll in steps, with captions in the corners and a percent counter on a slat thread.
export const SheepLoader: FC<SheepLoaderProps> = ({ at = 0, load = 3, topLeft = [], bottomLeft = [], bottomRight = [] }) => {
  const { t } = useLoom();
  const step = Math.floor(t * 8);
  const feet = 350;
  const s = 1.1;
  const body = sheep({ x: 380, y: feet - 168 * s, s, pose: step });
  // Tufts in clusters that step left with the walk (9 px per pose), over a dashed ground row.
  const tufts: Tone = (x, y) => {
    if (y < feet - 22 || y > feet + 6) return 0;
    if (y > feet) return Math.floor((x + step * 9) / 15) % 3 === 0 ? 0 : 0.4;
    const xs = x + step * 9;
    const c = Math.floor(xs / 40);
    if (hash(c, 1) > 0.55) return 0;
    const hgt = 6 + hash(Math.floor(xs / 5), 2) * 16 * (1 - Math.abs(((xs % 40) - 20) / 20));
    return y > feet - hgt ? 0.5 : 0;
  };
  const appear = ramp(t, at, 0.8, INOUT);
  const pct = Math.round(interpolate(t, [at + 0.3, at + 0.3 + load], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }));
  const bars = 64;
  return (
    <AbsoluteFill>
      <SlatCanvas x={560} y={190} w={800} h={370} period={5} cell={2} duty={0.74} tone={(x, y) => Math.max(body(x, y), tufts(x, y))} col={(i) => ({ gain: Math.min(1, appear * 2.2 - (i / 160) * 1.2) })} />
      <Stage>
        <Mark x={M} y={150} p={ramp(t, at, 0.8)} />
        <Caps lines={topLeft} x={M} y={215} at={at + 0.2} />
        <Caps lines={bottomLeft} x={M} y={H - M - 44} at={at + 0.3} />
        <Caps lines={bottomRight} x={W - M} y={H - M - 44} anchor="end" at={at + 0.4} />
        <SlatType text={`${pct}%`} x={W - M} y={H - M - 110} size={84} anchor="end" at={at + 0.2} em={0.9} />
        {Array.from({ length: bars }, (_, i) => {
          const on = i / bars < pct / 100;
          const hgt = on ? 26 + hash(i, 4) * 8 : 8;
          return <rect key={i} x={620 + i * 11} y={H - M - 44 - hgt} width={on ? 5 : 3} height={hgt} fill={TAN} opacity={appear} />;
        })}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- landscape ----------
export type SlatLandscapeProps = {
  // [t0, t1, from, to]: vertical scroll (px) eased between two times, for the 3-layer parallax.
  scroll?: [number, number, number, number];
  section?: Section;
  sheep?: boolean;
  // Seconds a beat wave takes to cross the frame; 0 turns the beat response off.
  wave?: number;
  at?: number;
};

// The theme's world: layered hills, firs and sky in slats with shimmer, drifting clouds and a grazing sheep. Inside <Woven> the sun rings pulse and a wave of taller bars crosses on every beat.
export const SlatLandscape: FC<SlatLandscapeProps> = ({ scroll = [0, 1, 0, 0], section = "dark", sheep: withSheep = true, wave = 0.5, at }) => {
  const { t, pulse, energy, beatAt } = useLoom();
  const s = interpolate(t, [scroll[0], scroll[1]], [scroll[2], scroll[3]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: INOUT });
  const land = landscape({ scroll: s, t, pulse: pulse * energy });
  const sx = 560;
  const graze = Math.floor(t * 3) % 7 < 4 ? 1 : 0.4;
  const lamb = withSheep ? sheep({ x: sx, y: ridgeNear(sx) - s + 70 - 168 * 0.6, s: 0.6, pose: 1, graze }) : null;
  // An 8 px umber halo cuts the sheep out of the busy hills, like the reference's animals on bare ground.
  const tone: Tone = lamb
    ? (x, y) => lamb(x, y) || (lamb(x - 8, y) || lamb(x + 8, y) || lamb(x, y - 8) || lamb(x, y + 8) ? 0 : land(x, y))
    : land;
  const n = W / 6;
  return (
    <SlatCanvas
      tone={tone}
      section={section}
      invert={section === "sand"}
      col={(i) => {
        const g = wave > 0 ? 1 + 0.4 * beatAt((i / n) * wave) * (0.4 + 0.6 * energy) : 1;
        const e = at === undefined ? 1 : Math.min(1, Math.max(0, ramp(t, at, 1.2, INOUT) * 1.5 - (i / n) * 0.5));
        return { gain: g * e };
      }}
    />
  );
};

// ---------- kilim ----------
// A folk kilim woven from slats: bands of lozenges, chevrons and crosses. `woven(k)` is band k's progress (0..1); the weft front crosses left to right.
export const kilim = ({ w, band, woven }: { w: number; band: number; woven: (k: number) => number }): Tone => (x, y) => {
  const k = Math.floor(y / band);
  const qy = Math.floor(y / 6) * 6;
  const yy = qy - k * band;
  const front = woven(k) * 1.12 - 0.06 + (hash(Math.floor(x / 6), k, 5) - 0.5) * 0.05;
  if (x / w > front) return 0.08;
  if (x < 18 || x > w - 18) return 0.92;
  if (yy < 6) return 0.68;
  const c = band / 2;
  const m = k % 3;
  if (m === 0) {
    const cx = (((x % 160) + 160) % 160) - 80;
    const d = Math.abs(cx) + Math.abs(yy - c) * 1.25;
    if (d < 16) return 1;
    if (d > 30 && d < 46) return 0.9;
    if (d > 58 && d < 66) return 0.55;
    return 0.16;
  }
  if (m === 1) {
    const zx = Math.abs(((x % 96) + 96) % 96 - 48);
    const z = yy - c - (zx - 24) * 1.3;
    if (Math.abs(z) < 12) return 0.95;
    if (Math.abs(Math.abs(z) - 34) < 5) return 0.5;
    return 0.16;
  }
  const cx = ((((x + 60) % 120) + 120) % 120) - 60;
  const cy = yy - c;
  if ((Math.abs(cx) < 9 && Math.abs(cy) < band * 0.3) || (Math.abs(cy) < 9 && Math.abs(cx) < band * 0.3)) return 1;
  if (Math.abs(cx) > 44 && Math.abs(cy) < 5) return 0.6;
  return 0.16;
};

export type KilimWeaveProps = { x?: number; y?: number; w?: number; bands?: number; band?: number; at?: number[]; every?: number; startBeat?: number; section?: Section; fringe?: boolean };

// A hanging kilim that weaves one band per cue: pass `at` times (narration), or inside <Woven> it weaves a band every `every` beats and breathes on the kick.
export const KilimWeave: FC<KilimWeaveProps> = ({ x = 330, y = 150, w = 1260, bands = 6, band = 124, at, every = 2, startBeat = 1, section = "dark", fringe = true }) => {
  const { t, music, clock, pulse, energy } = useLoom();
  const start = (k: number) => at?.[k] ?? (music ? clock.beatSec(startBeat + k * every) - 0.1 : 0.3 + k * 0.8);
  const woven = (k: number) => (k >= bands ? 0 : ramp(t, start(k), music ? clock.spb * every * 0.8 : 0.7, INOUT));
  const h = bands * band;
  const ink = INK[section];
  const shown = ramp(t, start(0) - 0.4, 0.4);
  return (
    <AbsoluteFill>
      <SlatCanvas x={x} y={y} w={w} h={h} section={section} tone={kilim({ w, band, woven })} col={() => ({ gain: 1 + pulse * energy * 0.3 })} />
      {fringe && (
        <Stage>
          {Array.from({ length: Math.floor(w / 12) }, (_, i) => {
            const l = 18 + hash(i, 8) * 14;
            const lb = l * Math.min(1, woven(bands - 1) * 1.4);
            return (
              <g key={i} fill={ink}>
                <rect x={x + i * 12 + 4} y={y - l * shown} width={3} height={l * shown} />
                <rect x={x + i * 12 + 4} y={y + h} width={3} height={lb} />
              </g>
            );
          })}
        </Stage>
      )}
    </AbsoluteFill>
  );
};

// ---------- window photo ----------
export type WindowPhotoProps = { x: number; y: number; w: number; h: number; at: number; src?: string; caption?: string[]; strip?: number };

// A small full-colour photo floating over slat art: it opens as vertical strips growing from its centre line, framed by a comb of short bars.
export const WindowPhoto: FC<WindowPhotoProps> = ({ x, y, w, h, at, src, caption = [], strip = 16 }) => {
  const { t } = useLoom();
  const n = Math.ceil(w / strip);
  const fy = Math.sin(t * 0.9) * 4;
  const e = (i: number) => ramp(t, at + (i / n) * 0.45 + hash(i, 61) * 0.08, 0.5, EXPO_OUT);
  const id = `w${Math.round(x)}x${Math.round(y)}`;
  const comb = Math.floor(w / 8);
  return (
    <Stage>
      <g transform={`translate(0 ${fy})`}>
        <defs>
          <clipPath id={id}>
            {Array.from({ length: n }, (_, i) => {
              const k = e(i);
              return <rect key={i} x={x + i * strip} y={y + (h / 2) * (1 - k)} width={strip} height={h * k} />;
            })}
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          {src ? <image href={src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" /> : <PhotoStandIn x={x} y={y} w={w} h={h} t={t} />}
        </g>
        {Array.from({ length: comb }, (_, i) => {
          const k = e(Math.floor((i * 8) / strip));
          const l = 10 + (i % 3 === 0 ? 8 : 0);
          return (
            <g key={i} fill={TAN} opacity={k}>
              <rect x={x + i * 8 + 2} y={y - 10 - l} width={3} height={l} />
              <rect x={x + i * 8 + 2} y={y + h + 10} width={3} height={l} />
            </g>
          );
        })}
        <Caps lines={caption} x={x} y={y + h + 76} at={at + 0.6} />
      </g>
    </Stage>
  );
};
