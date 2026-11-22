// 1-bit dithered screen content: procedural scenes ordered-dithered to two LCD tones at a low flipbook fps, plus the 3×3 thumbnail grid that flips in.
import { useMemo, type FC } from "react";
import { INK } from "./theme";
import { pop, rnd, tick } from "./motion";

export const LCD_LIGHT = "#D9D7CC";
export const LCD_DARK = "#191917";

// A scene maps a pixel (u, v in 0..1, aspect = w/h) at flipbook frame k to brightness 0 (dark) .. 1 (light).
export type Scene = (u: number, v: number, k: number, aspect: number, seed: number) => number;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((b) => (b + 0.5) / 16);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const SCENES = {
  // A shaded planet with a ring and an orbiting moon on a starry sky.
  orbit: (u, v, k, a, seed) => {
    const x = (u - 0.5) * a;
    const y = v - 0.5;
    const ma = k * 0.22 + seed;
    const mx = Math.cos(ma) * 0.38 * a * 0.62;
    const my = Math.sin(ma) * 0.12;
    const dm = Math.hypot(x - mx, y - my);
    const behind = Math.sin(ma) < 0;
    const ringR = Math.hypot(x / 1, y / 0.28);
    const ring = Math.abs(ringR - 0.36) < 0.03;
    const d = Math.hypot(x, y);
    const planet = d < 0.24;
    if (dm < 0.05 && (behind ? !planet : true)) return 0.85;
    if (planet && !(ring && y > 0)) {
      const z = Math.sqrt(Math.max(0, 0.0576 - d * d)) / 0.24;
      const lx = -0.6;
      const ly = -0.5;
      const shade = Math.max(0, (x / 0.24) * lx + (y / 0.24) * ly + z * 0.6);
      const band = Math.sin(y * 40 + k * 0.1) > 0.6 ? -0.15 : 0;
      return Math.min(1, shade * 0.9 + band);
    }
    if (ring) return y > 0 || d > 0.24 ? 0.7 : 0;
    const star = rnd(`${Math.floor(u * 90)}-${Math.floor(v * 60)}-${seed}`);
    return star > 0.985 ? (Math.sin(k + star * 40) > -0.3 ? 1 : 0.3) : 0.05;
  },
  // Audio meter: mirrored bars that bounce per flipbook frame.
  wave: (u, v, k, _a, seed) => {
    const col = Math.floor(u * 28);
    const amp = 0.08 + 0.34 * Math.abs(Math.sin(col * 0.7 + k * 0.9 + seed) * Math.cos(col * 0.23 - k * 0.4));
    const inBar = u * 28 - col < 0.7;
    if (inBar && Math.abs(v - 0.5) < amp) return 0.02;
    return 0.92 - 0.25 * smooth(0, 1, Math.abs(v - 0.5) * 2);
  },
  // Rolling hills, a sun and a drifting cloud, with dithered sky gradient.
  hills: (u, v, k, a, seed) => {
    const x = u * a;
    const sun = Math.hypot(x - a * 0.72, v - 0.3) < 0.12;
    const cx = ((k * 0.012 + seed * 0.3) % 1.4) - 0.2;
    const cloud = Math.hypot((u - cx) * a * 0.6, (v - 0.22) * 1.6) < 0.08 || Math.hypot((u - cx - 0.06) * a * 0.6, (v - 0.19) * 1.6) < 0.08;
    const h1 = 0.62 + Math.sin(x * 4 + seed) * 0.06;
    const h2 = 0.74 + Math.sin(x * 6.5 + 2 + seed) * 0.05;
    if (v > h2) return 0.15 + 0.15 * Math.sin(x * 40);
    if (v > h1) return 0.45;
    if (cloud) return 1;
    if (sun) return 0.98;
    return 0.95 - v * 0.7;
  },
  // A tunnel of rings sliding toward the viewer.
  tunnel: (u, v, k, a) => {
    const d = Math.hypot((u - 0.5) * a, v - 0.5);
    const ring = Math.sin(1 / Math.max(0.02, d) * 1.4 - k * 0.8);
    return ring > 0 ? smooth(0, 0.5, d) : 0.04;
  },
  // A smiley that bobs and blinks.
  face: (u, v, k, a) => {
    const by = Math.sin(k * 0.8) * 0.04;
    const x = (u - 0.5) * a;
    const y = v - 0.5 - by;
    const d = Math.hypot(x, y);
    if (d > 0.34) return 0.9 - 0.4 * smooth(0.34, 0.9, d);
    const blink = k % 14 === 0;
    const eye = (ex: number) => (blink ? Math.abs(y + 0.09) < 0.015 && Math.abs(x - ex) < 0.05 : Math.hypot(x - ex, (y + 0.09) * 0.7) < 0.045);
    if (eye(-0.12) || eye(0.12)) return 0;
    const mouth = Math.abs(Math.hypot(x, y + 0.02) - 0.19) < 0.025 && y > 0.04;
    if (mouth) return 0;
    return 0.75 - 0.5 * smooth(0.1, 0.34, Math.hypot(x + 0.1, y + 0.1));
  },
  // Bar chart growing in steps.
  bars: (u, v, k, _a, seed) => {
    const col = Math.floor(u * 7);
    const grow = Math.min(1, (k - col * 2) / 6);
    const hgt = (0.2 + 0.6 * rnd(`b${col}-${seed}`)) * Math.max(0, grow);
    const inCol = u * 7 - col > 0.22 && u * 7 - col < 0.82;
    if (inCol && v > 0.9 - hgt && v < 0.9) return col === 4 ? 0 : 0.35;
    if (Math.abs(v - 0.9) < 0.01) return 0;
    return 0.95;
  },
} satisfies Record<string, Scene>;
export type SceneName = keyof typeof SCENES;

// Builds the dark pixels as one path of horizontal runs, so a full screen stays a single SVG element.
const ditherPath = (scene: Scene, cols: number, rows: number, px: number, k: number, aspect: number, seed: number) => {
  let d = "";
  for (let r = 0; r < rows; r++) {
    let run = -1;
    for (let c = 0; c <= cols; c++) {
      const dark = c < cols && scene((c + 0.5) / cols, (r + 0.5) / rows, k, aspect, seed) < BAYER[(r % 4) * 4 + (c % 4)]!;
      if (dark && run < 0) run = c;
      if (!dark && run >= 0) {
        d += `M${run * px} ${r * px}h${(c - run) * px}v${px}h${-(c - run) * px}z`;
        run = -1;
      }
    }
  }
  return d;
};

export const OneBitScreen: FC<{ w: number; h: number; t: number; scene?: SceneName | Scene; px?: number; fps?: number; seed?: number; on?: number }> = ({ w, h, t, scene = "orbit", px = 5, fps = 8, seed = 1, on = 1 }) => {
  const k = tick(t, fps);
  const fn = typeof scene === "string" ? SCENES[scene] : scene;
  const cols = Math.ceil(w / px);
  const rows = Math.ceil(h / px);
  const d = useMemo(() => ditherPath(fn, cols, rows, px, k, w / h, seed), [fn, cols, rows, px, k, w, h, seed]);
  return (
    <g>
      <rect width={w} height={h} fill={LCD_LIGHT} />
      <path d={d} fill={LCD_DARK} shapeRendering="crispEdges" opacity={on} />
      {on < 1 && <rect width={w} height={h} fill={LCD_DARK} opacity={1 - on} />}
    </g>
  );
};

// 3×3 thumbnails that flip in one by one (scale-x through zero with back-out), each running its own 1-bit loop.
export const ThumbGrid: FC<{ x: number; y: number; t: number; at: number; cell?: [number, number]; gap?: number; stagger?: number }> = ({ x, y, t, at, cell = [300, 176], gap = 22, stagger = 0.09 }) => {
  const names: SceneName[] = ["face", "hills", "orbit", "bars", "tunnel", "wave", "orbit", "hills", "face"];
  const [cw, ch] = cell;
  return (
    <g transform={`translate(${x} ${y})`}>
      {names.map((n, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const order = col + row;
        const p = pop(t, at + order * stagger * 2 + col * stagger, 0.45);
        if (p <= 0) return null;
        const cx = col * (cw + gap) + cw / 2;
        const cy = row * (ch + gap) + ch / 2;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${p} 1) translate(${-cw / 2} ${-ch / 2})`}>
            <rect x={6} y={10} width={cw} height={ch} rx={12} fill={INK} opacity={0.18} />
            <rect x={-6} y={-6} width={cw + 12} height={ch + 12} rx={14} fill={INK} />
            <OneBitScreen w={cw} h={ch} t={t + i * 0.37} scene={n} px={5} seed={i * 1.7} />
          </g>
        );
      })}
    </g>
  );
};
