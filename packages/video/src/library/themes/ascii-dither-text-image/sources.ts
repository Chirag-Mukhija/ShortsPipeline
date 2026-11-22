// Raster sources for the density engine: webfont readiness, text masks rasterised once and cached, and photos (`src`) sampled to luminance via an offscreen canvas.
import { useEffect, useLayoutEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { clamp01, type Field } from "./field";
import { MONO, SERIF } from "./theme";

// Canvas text needs the webfonts loaded before the first draw; this holds the frame until they are.
const SPECS = [`400 20px "${MONO}"`, `700 20px "${MONO}"`, `800 100px "${SERIF}"`];
const fontsOk = () => typeof document === "undefined" || SPECS.every((s) => document.fonts.check(s));
export const useFonts = () => {
  const [ok, setOk] = useState(fontsOk);
  const [handle] = useState(() => (ok ? null : delayRender("ascii-dither fonts")));
  useLayoutEffect(() => {
    if (ok || handle === null) return;
    Promise.all(SPECS.map((s) => document.fonts.load(s))).then(
      () => {
        setOk(true);
        continueRender(handle);
      },
      () => continueRender(handle),
    );
  }, [ok, handle]);
  return ok;
};

type Raster = { w: number; h: number; d: Float32Array };
const sample = (r: Raster, sx: number, sy: number): Field => (x, y) => {
  const u = x * sx - 0.5;
  const v = y * sy - 0.5;
  const i = Math.floor(u);
  const j = Math.floor(v);
  if (i < -1 || j < -1 || i >= r.w || j >= r.h) return 0;
  const fu = u - i;
  const fv = v - j;
  const at = (a: number, b: number) => (a < 0 || b < 0 || a >= r.w || b >= r.h ? 0 : r.d[b * r.w + a]!);
  return (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fv) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fv;
};

// ---------- text masks ----------
export type TextMaskOpts = { font?: string; weight?: number; italic?: boolean; fill?: number; lineGap?: number; align?: "left" | "center" };
const masks = new Map<string, Raster>();
const RES = 0.25;

// Coverage of `text` ("\n" for lines) fitted into a w×h px box: 1 inside the letterforms, 0 outside. Rasterised at quarter size once, then bilinear.
export const textMask = (text: string, w: number, h: number, o: TextMaskOpts = {}): Field => {
  const font = o.font ?? SERIF;
  const weight = o.weight ?? 800;
  const key = `${text}|${w}|${h}|${font}|${weight}|${o.italic}|${o.fill}|${o.align}`;
  let r = masks.get(key);
  if (!r && typeof document !== "undefined") {
    const cw = Math.max(1, Math.round(w * RES));
    const ch = Math.max(1, Math.round(h * RES));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext("2d")!;
    const lines = text.split("\n");
    const gap = o.lineGap ?? 0.92;
    const spec = (px: number) => `${o.italic ? "italic " : ""}${weight} ${px}px "${font}"`;
    ctx.font = spec(100);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const fit = o.fill ?? 0.94;
    // Cap height is ~0.75 em, so a block of n lines stands 0.75 + (n - 1) * gap em tall.
    const px = Math.min((100 * cw * fit) / Math.max(1, widest), (ch * fit) / (0.8 + (lines.length - 1) * gap));
    ctx.font = spec(px);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = o.align === "left" ? "left" : "center";
    const m = ctx.measureText("Hg");
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    const lh = px * gap;
    const blockH = asc + desc * 0.4 + (lines.length - 1) * lh;
    const top = (ch - blockH) / 2 + asc;
    lines.forEach((l, k) => ctx.fillText(l, o.align === "left" ? 0 : cw / 2, top + k * lh));
    const px4 = ctx.getImageData(0, 0, cw, ch).data;
    const d = new Float32Array(cw * ch);
    for (let k = 0; k < cw * ch; k++) d[k] = px4[k * 4 + 3]! / 255;
    r = { w: cw, h: ch, d };
    // Only cache once the real font is in: a fallback-font mask must never stick.
    if (fontsOk()) masks.set(key, r);
  }
  return r ? sample(r, RES, RES) : () => 0;
};

// ---------- photos ----------
const photos = new Map<string, Raster>();

// Loads a photo once (staticFile path), samples its luminance at 400 px wide and caches it, so every frame after is pure maths.
export const usePhoto = (src?: string) => {
  const [r, setR] = useState<Raster | null>(() => (src ? photos.get(src) ?? null : null));
  const [handle] = useState(() => (src && !photos.has(src) ? delayRender(`ascii photo ${src}`) : null));
  useEffect(() => {
    if (!src || r) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = 400;
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
      photos.set(src, out);
      setR(out);
      if (handle !== null) continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`ascii-dither could not load ${src}`));
    img.src = src;
  }, [src, r, handle]);
  return r;
};

// A sampled photo cover-fitted into a w×h box as ink density. `dark` = true reads bright pixels as ink (phosphor on black); contrast pushes mid-tones apart.
export const photoField = (r: Raster, w: number, h: number, dark = false, contrast = 1.2): Field => {
  const s = Math.max(w / r.w, h / r.h);
  const ox = (w - r.w * s) / 2;
  const oy = (h - r.h * s) / 2;
  const f = sample(r, 1 / s, 1 / s);
  return (x, y) => {
    const l = f(x - ox, y - oy);
    return clamp01(0.5 + ((dark ? l : 1 - l) - 0.5) * contrast);
  };
};
