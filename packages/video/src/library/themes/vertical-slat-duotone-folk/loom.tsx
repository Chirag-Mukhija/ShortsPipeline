// Slat primitives: the canvas renderer that turns any tone field (drawn art or a photo) into vertical duotone bars, the woven ground, the SVG stage and the tiny slat mark.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame } from "remotion";
import { W, H } from "../../core/video";
import { bayer, hash } from "./clock";
import { DUTY, GROUND, INK, PERIOD, SAND_LO, TAN, UMBER_HI, type Section } from "./theme";

// A tone field: lightness 0..1 at a point in the canvas's own pixels. 0 = bare ground, 1 = the fattest bar.
export type Tone = (x: number, y: number) => number;

// Per-column overrides, the hook every wipe, flip and growth is built on. top/bottom are fractions of the canvas height.
export type ColMod = { top?: number; bottom?: number; gain?: number; color?: string; ground?: string; skip?: boolean };

export type SlatCanvasProps = {
  tone: Tone;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  period?: number;
  // Vertical cell in px: the step size of every edge.
  cell?: number;
  duty?: number;
  section?: Section;
  // Flip lightness so the same artwork reads as a sand section (dark bars where it was light). Leave off for sprites on bare ground.
  invert?: boolean;
  ink?: string;
  // Fill each column's ground too (needed when the canvas sits over a photo it will wipe away).
  ground?: string | null;
  // Height noise in px on the ends of each run, re-rolled at 6 fps.
  shimmer?: number;
  col?: (i: number, cx: number) => ColMod | null | undefined;
  seed?: number;
  style?: CSSProperties;
};

export const SlatCanvas: FC<SlatCanvasProps> = ({
  tone, x = 0, y = 0, w = W, h = H, period = PERIOD, cell = 3, duty = DUTY, section = "dark", invert = false, ink, ground = null, shimmer = 1, col, seed = 0, style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const inkC = ink ?? INK[section];
    const cols = Math.ceil(w / period);
    const rows = Math.ceil(h / cell);
    const step = Math.floor(f / 5);
    const maxW = period * duty;
    for (let i = 0; i < cols; i++) {
      const x0 = i * period;
      const cx = x0 + period / 2;
      const m = col?.(i, cx);
      if (m?.skip) continue;
      const top = (m?.top ?? 0) * h;
      const bot = (m?.bottom ?? 1) * h;
      if (bot - top < 0.5) continue;
      const g = m?.ground ?? ground;
      if (g) {
        ctx.fillStyle = g;
        ctx.fillRect(x0, top, period, bot - top);
      }
      ctx.fillStyle = m?.color ?? inkC;
      const gain = m?.gain ?? 1;
      const draw = (s: number, e: number, bw: number, edgeS: boolean, edgeE: boolean) => {
        let y0 = s;
        let y1 = e;
        if (shimmer > 0) {
          if (edgeS) y0 += (Math.floor(hash(i, s, step * 31 + seed) * 3) - 1) * shimmer;
          if (edgeE) y1 += (Math.floor(hash(i, e, step * 17 + seed + 5) * 3) - 1) * shimmer;
        }
        y0 = Math.max(top, y0);
        y1 = Math.min(bot, y1);
        if (y1 > y0) ctx.fillRect(x0 + Math.floor((period - bw) / 2), y0, bw, y1 - y0);
      };
      const r0 = Math.max(0, Math.floor(top / cell));
      const r1 = Math.min(rows, Math.ceil(bot / cell));
      let cur = 0;
      let start = 0;
      let edge = true;
      for (let r = r0; r < r1; r++) {
        const yy = r * cell;
        let v = Math.min(1, Math.max(0, tone(cx, yy + cell / 2)));
        if (invert) v = 1 - v;
        const raw = v * maxW * gain;
        let bw = Math.floor(raw);
        if (raw - bw > bayer(i, r)) bw += 1;
        if (bw !== cur) {
          if (cur > 0) draw(start, yy, cur, edge, bw === 0);
          edge = cur === 0;
          start = yy;
          cur = bw;
        }
      }
      if (cur > 0) draw(start, r1 * cell, cur, edge, true);
    }
  });
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }} />;
};

// ---------- photos as slats ----------
type Lum = { w: number; h: number; d: Float32Array };
const lumCache = new Map<string, Lum>();

// Loads a photo once, samples its luminance at 480 px wide and caches it, so every frame after the first is pure maths.
export const useImageLum = (src?: string) => {
  const [lum, setLum] = useState<Lum | null>(() => (src ? lumCache.get(src) ?? null : null));
  const [handle] = useState(() => (src && !lumCache.has(src) ? delayRender(`slat image ${src}`) : null));
  useEffect(() => {
    if (!src || lum) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = 480;
      const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const px = ctx.getImageData(0, 0, w, h).data;
      const d = new Float32Array(w * h);
      for (let k = 0; k < w * h; k++) d[k] = (0.2126 * px[k * 4]! + 0.7152 * px[k * 4 + 1]! + 0.0722 * px[k * 4 + 2]!) / 255;
      const out = { w, h, d };
      lumCache.set(src, out);
      setLum(out);
      if (handle !== null) continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`SlatImage could not load ${src}`));
    img.src = src;
  }, [src, lum, handle]);
  return lum;
};

// Cover-fits a sampled photo into a w×h box; threshold drops the darkest tones to bare ground, contrast > 1 pushes mid-tones apart.
export const lumTone = (lum: Lum, w: number, h: number, threshold = 0.12, contrast = 1.25): Tone => {
  const s = Math.max(w / lum.w, h / lum.h);
  const ox = (w - lum.w * s) / 2;
  const oy = (h - lum.h * s) / 2;
  return (x, y) => {
    const u = Math.min(lum.w - 1, Math.max(0, Math.floor((x - ox) / s)));
    const v = Math.min(lum.h - 1, Math.max(0, Math.floor((y - oy) / s)));
    const l = (lum.d[v * lum.w + u]! - threshold) / (1 - threshold);
    return l <= 0 ? 0 : Math.min(1, 0.5 + (l - 0.5) * contrast);
  };
};

export type SlatImageProps = Omit<SlatCanvasProps, "tone"> & { src?: string; tone?: Tone; threshold?: number; contrast?: number };

// Any image as vertical duotone bars: pass a photo `src` (staticFile) or a drawn `tone` field as the stand-in.
export const SlatImage: FC<SlatImageProps> = ({ src, tone, threshold, contrast, w = W, h = H, ...rest }) => {
  const lum = useImageLum(src);
  const field: Tone = lum ? lumTone(lum, w, h, threshold, contrast) : tone ?? (() => 0);
  return <SlatCanvas tone={field} w={w} h={h} {...rest} />;
};

// ---------- ground and stage ----------
// The woven ground: faint warp threads and a rug fringe along the bottom whose ends shimmer at 6 fps.
export const Ground: FC<{ section?: Section }> = ({ section = "dark" }) => {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const f = useCurrentFrame();
  const step = Math.floor(f / 5);
  const thread = section === "dark" ? UMBER_HI : SAND_LO;
  const fringe = Array.from({ length: Math.ceil(W / 12) }, (_, i) => 10 + Math.floor(hash(i, 3) * 4) * 4 + (Math.floor(hash(i, step, 9) * 3) - 1));
  return (
    <AbsoluteFill style={{ background: GROUND[section] }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width={12} height={H}>
            <rect x={0} width={2} height={H} fill={thread} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${id})`} />
        {fringe.map((l, i) => (
          <rect key={i} x={i * 12 + 4} y={H - l} width={3} height={l} fill={section === "dark" ? TAN : "#2B2622"} opacity={0.22} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const Stage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {children}
    </svg>
  </AbsoluteFill>
);

// The tiny slat mark (a stepped ridge of bars on a rule), the theme's corner logo. p grows it bar by bar.
const MARK = [6, 11, 17, 24, 19, 30, 36, 27, 21, 14, 9, 5];
export const Mark: FC<{ x: number; y: number; s?: number; p?: number; color?: string }> = ({ x, y, s = 1, p = 1, color = TAN }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {MARK.map((hgt, i) => {
      const k = Math.min(1, Math.max(0, p * MARK.length * 0.6 - i * 0.5));
      return <rect key={i} x={i * 6} y={-hgt * k} width={3} height={hgt * k} fill={color} />;
    })}
    <rect x={0} y={2} width={MARK.length * 6 - 3} height={2} fill={color} opacity={p > 0 ? 1 : 0} />
  </g>
);
