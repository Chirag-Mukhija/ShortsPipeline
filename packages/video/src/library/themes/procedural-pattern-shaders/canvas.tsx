// PatternCanvas: the React face of the engine. Feeds frame-derived uniforms, upscales the low-res shader output, and cuts or clips it with crisp full-res shapes.
import { useLayoutEffect, useRef, useState, type CSSProperties, type FC } from "react";
import { continueRender, delayRender } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { fallbackPattern, renderPattern, type Rect, type Vec4 } from "./engine";
import { DEFAULT_P, type PatternName } from "./shaders";

export type Shape = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export type PatternProps = {
  pattern: PatternName;
  colors: string[];
  // Pattern seconds per real second. Ignored when `time` is given (e.g. from rampClock for a speed ramp).
  speed?: number;
  time?: number;
  // Pattern frequency multiplier: 1 = the pattern's default density, above 1 tightens it.
  scale?: number;
  // Per-pattern parameters (see shaders.ts); undefined slots keep the defaults.
  params?: Partial<Vec4> | (number | undefined)[];
  q?: Vec4;
  // Camera over the infinite pattern: zoom, rotation in degrees, pan in pattern units.
  cam?: { zoom?: number; rot?: number; x?: number; y?: number };
  // Where this canvas sits in the 1920×1080 frame. Default: the whole frame.
  rect?: Rect;
  // "frame": windows into one continuous pattern. "self": the pattern is sized to this rect, so it grows when the rect grows (a camera zoom).
  anchor?: "frame" | "self";
  // Shader resolution as a fraction of the rect's size. 0.5 renders a full frame at 960×540.
  res?: number;
  // 0 = off. Pixels whose field value is below it go transparent (the luminance-mask transition).
  threshold?: number;
  // Drawn at full resolution after the pattern: `clip` keeps only the shape, `cut` punches it out.
  clip?: Shape;
  cut?: Shape;
  seed?: number;
  style?: CSSProperties;
};

const DEG = Math.PI / 180;

// Shapes are drawn into one scratch mask, then composited in a single drawImage: destination-in applied per fill() call
// would keep only the intersection of the shapes (several bars, several text lines) instead of their union.
let mask: HTMLCanvasElement | null = null;
const applyShape = (ctx: CanvasRenderingContext2D, shape: Shape, op: GlobalCompositeOperation, w: number, h: number) => {
  mask ??= document.createElement("canvas");
  if (mask.width !== w || mask.height !== h) {
    mask.width = w;
    mask.height = h;
  }
  const m = mask.getContext("2d");
  if (!m) return;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = "source-over";
  m.clearRect(0, 0, w, h);
  m.fillStyle = "#000";
  shape(m, w, h);
  ctx.globalCompositeOperation = op;
  ctx.drawImage(mask, 0, 0);
};

export const PatternCanvas: FC<PatternProps> = ({ pattern, colors, speed = 1, time, scale = 1, params, q = [0, 0, 0, 0], cam, rect = { x: 0, y: 0, w: W, h: H }, anchor = "frame", res = 0.5, threshold = 0, clip, cut, seed = 0, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { t } = useTime();
  // With no shapes to keep crisp, the output canvas stays at shader resolution and CSS does the upscale for free.
  const crisp = Boolean(clip || cut);
  const iw = Math.max(2, Math.round(rect.w * res));
  const ih = Math.max(2, Math.round(rect.h * res));
  const ow = crisp ? Math.round(rect.w) : iw;
  const oh = crisp ? Math.round(rect.h) : ih;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const d = DEFAULT_P[pattern];
    const p: Vec4 = [params?.[0] ?? d[0], params?.[1] ?? d[1], params?.[2] ?? d[2], params?.[3] ?? d[3]];
    const origin: [number, number, number] = anchor === "frame" ? [W / 2, H / 2, H] : [rect.x + rect.w / 2, rect.y + rect.h / 2, rect.h];
    const pt = time ?? t * speed;
    ctx.globalCompositeOperation = "copy";
    const out = renderPattern({
      pattern, colors, time: pt, w: iw, h: ih, rect, origin, scale, p, q, threshold, seed,
      cam: [cam?.x ?? 0, cam?.y ?? 0, cam?.zoom ?? 1, (cam?.rot ?? 0) * DEG],
    });
    if (out) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(out.src, out.sx, out.sy, out.sw, out.sh, 0, 0, ow, oh);
    } else {
      ctx.globalCompositeOperation = "source-over";
      fallbackPattern(ctx, colors, pt, ow, oh);
    }
    if (clip) applyShape(ctx, clip, "destination-in", ow, oh);
    if (cut) applyShape(ctx, cut, "destination-out", ow, oh);
    ctx.globalCompositeOperation = "source-over";
  });
  return <canvas ref={ref} width={ow} height={oh} style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, ...style }} />;
};

// Canvas text needs the webfont loaded before the first draw; this holds the render until it is.
export const useFontReady = (font: string) => {
  const [ready, setReady] = useState(() => typeof document === "undefined" || document.fonts.check(font));
  const [handle] = useState(() => (ready ? null : delayRender(`pattern font ${font}`)));
  useLayoutEffect(() => {
    if (ready || handle === null) return;
    document.fonts.load(font).then(
      () => { setReady(true); continueRender(handle); },
      () => continueRender(handle),
    );
  }, [font, ready, handle]);
  return ready;
};

export type TextShape = { text: string; x: number; y: number; font: string; size: number; maxWidth?: number; tracking?: number; align?: CanvasTextAlign; lineGap?: number };

// Fits a (possibly multi-line, "\n") word block into maxWidth by shrinking, then fills it: the letterforms a pattern is clipped to or cut by.
export const textShape = (spec: TextShape, xform?: { scale?: number; dy?: number }): Shape => (ctx) => {
  const lines = spec.text.split("\n");
  let size = spec.size;
  const setFont = () => {
    ctx.font = spec.font.replace(/\d+(\.\d+)?px/, `${size}px`);
    ctx.letterSpacing = `${(spec.tracking ?? 0) * size}px`;
  };
  setFont();
  if (spec.maxWidth) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > spec.maxWidth) { size = Math.floor((size * spec.maxWidth) / widest); setFont(); }
  }
  const s = xform?.scale ?? 1;
  ctx.save();
  ctx.translate(spec.x, spec.y + (xform?.dy ?? 0));
  ctx.scale(s, s);
  ctx.textAlign = spec.align ?? "center";
  ctx.textBaseline = "middle";
  const lh = size * (spec.lineGap ?? 0.92);
  lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * lh + size * 0.04));
  ctx.restore();
};

export const roundRect = (x: number, y: number, w: number, h: number, r: number | number[]): Shape => (ctx) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
};
