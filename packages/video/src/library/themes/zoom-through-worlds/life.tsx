// Zoom-through-worlds idle life and reaction bits: the marquee ticker, blinking eyes whose pupils snap to look points, and popping, twinkling star fields.
import type { FC } from "react";
import { useTime } from "../../core/time";
import { W } from "../../core/video";
import { BACK, DISPLAY, INK, SKIN, SUN, rng } from "./theme";
import { ease, starPath } from "./ink";

// Top-edge marquee: the phrase repeats and slides left at `speed` px per frame. Copies are added as it travels, so it never wraps or jumps.
export const TickerStrip: FC<{ text: string; speed?: number; bg?: string; color?: string; height?: number; y?: number }> = ({ text, speed = 2, bg = SUN, color = INK, height = 58, y = 0 }) => {
  const { f } = useTime();
  const phrase = `${text.trim()}  ★  `;
  // Rough Bangers advance per character at this size; only used to decide how many copies cover the strip.
  const approx = phrase.length * height * 0.36;
  const copies = Math.ceil((W + speed * f) / approx) + 2;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, height, background: bg, borderBottom: `5px solid ${INK}`, borderTop: y > 0 ? `5px solid ${INK}` : undefined, overflow: "hidden", zIndex: 5 }}>
      <div style={{ display: "flex", whiteSpace: "pre", transform: `translateX(${-speed * f}px)`, fontFamily: DISPLAY, fontSize: height * 0.6, lineHeight: `${height}px`, color, letterSpacing: 1.5 }}>
        {Array.from({ length: copies }, (_, i) => (
          <span key={i}>{phrase}</span>
        ))}
      </div>
    </div>
  );
};

// Blink amount 0..1 for a blink that starts at `b` seconds: eyelid squashes Y 1 → 0.1 → 1 over 6 frames.
const blinkAt = (t: number, b: number) => {
  const ph = (t - b) * 30;
  return ph >= 0 && ph < 6 ? Math.sin((ph / 6) * Math.PI) : 0;
};

export type Look = { at: number; x: number; y: number };

// Two cartoon eyes. Pupils jump to each look point in a hard cut (no tween); every look change also blinks, as the beat marker on a stressed word.
// Idle blinks come every `blinkEvery` s with seeded jitter. x/y of a look run -1..1.
export const BlinkEyes: FC<{ x: number; y: number; size?: number; gap?: number; lookAt?: Look[]; blinkEvery?: number; seed?: number; fill?: string; pupil?: number; lid?: number }> = ({
  x, y, size = 90, gap = 1.15, lookAt = [], blinkEvery = 3.5, seed = 4, fill = SKIN, pupil = 0.42, lid = 0,
}) => {
  const { t } = useTime();
  const g = rng(seed);
  const blinks: number[] = [];
  for (let b = 0.8 + g() * 1.5; b < t + 1; b += blinkEvery * (0.85 + g() * 0.3)) blinks.push(b);
  const cues = lookAt.filter((l) => l.at <= t);
  const look = cues[cues.length - 1] ?? { x: 0.1, y: 0.1 };
  const squash = Math.max(...blinks.map((b) => blinkAt(t, b)), ...lookAt.map((l) => blinkAt(t, l.at)), 0);
  const sy = 1 - 0.9 * squash;
  const eye = (cx: number, k: number) => (
    <g key={k} transform={`translate(${cx} 0) scale(1 ${sy})`}>
      <ellipse rx={size * 0.5} ry={size * 0.62} fill={fill} stroke={INK} strokeWidth={size * 0.07} />
      <circle cx={look.x * size * 0.2} cy={look.y * size * 0.26} r={size * pupil * 0.5} fill={INK} />
      <circle cx={look.x * size * 0.2 - size * 0.07} cy={look.y * size * 0.26 - size * 0.08} r={size * 0.06} fill={SKIN} />
      {lid > 0 && <path d={`M${-size * 0.5} ${-size * 0.62 + lid * size} Q0 ${-size * 0.9 + lid * size} ${size * 0.5} ${-size * 0.62 + lid * size}`} fill="none" stroke={INK} strokeWidth={size * 0.07} strokeLinecap="round" />}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`}>
      {eye(-size * gap * 0.5, 0)}
      {eye(size * gap * 0.5, 1)}
    </g>
  );
};

export type StarSpec = { x: number; y: number; r: number; seed: number; order: number };

// Seeded star positions inside a box, avoiding a central keep-out ellipse (where the hero object sits).
export const scatterStars = (n: number, seed: number, box: [number, number, number, number], keep?: [number, number, number, number], rMin = 12, rMax = 30) => {
  const g = rng(seed);
  const out: StarSpec[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const x = box[0] + g() * box[2];
    const y = box[1] + g() * box[3];
    if (keep && ((x - keep[0]) / keep[2]) ** 2 + ((y - keep[1]) / keep[3]) ** 2 < 1) continue;
    if (out.some((s) => Math.hypot(s.x - x, s.y - y) < 70)) continue;
    out.push({ x, y, r: rMin + g() * (rMax - rMin), seed: Math.floor(g() * 1000), order: g() });
  }
  return out;
};

// Stars pop 0 → 1 on back-out (8 f) in a seeded order 2 f apart from `at`, then twinkle 0.4–1 on per-star sine phases. Without `at` they are simply there.
export const StarField: FC<{ stars: StarSpec[]; at?: number; color?: string; outline?: boolean; twinkle?: boolean }> = ({ stars, at, color = SUN, outline = true, twinkle = true }) => {
  const { t } = useTime();
  const ranked = [...stars].sort((a, b) => a.order - b.order);
  return (
    <g>
      {ranked.map((s, i) => {
        const p = at === undefined ? 1 : ease(t, at + (i * 2) / 30, 8 / 30, BACK);
        const tw = twinkle ? 0.7 + 0.3 * Math.sin(t * 2.6 + s.seed) : 1;
        if (p <= 0) return null;
        return (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(${p}) rotate(${Math.sin(t * 0.8 + s.seed) * 8})`} opacity={tw}>
            <path d={starPath(0, 0, s.r, s.seed)} fill={color} stroke={outline ? INK : "none"} strokeWidth={Math.max(2, s.r * 0.14)} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};
