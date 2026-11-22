// Font metrics for the typesetter: holds the render until the board's fonts are loaded, then measures glyph advances with a canvas.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { MATH, SANS } from "./theme";

let READY = false;
let pending: Promise<void> | null = null;

const SAMPLE = "AaxyzO0123456789()=+αβθλπσΣΔΩîĵ";
const SPECS = [`400 100px "${MATH}"`, `italic 400 100px "${MATH}"`, `600 100px "${MATH}"`, `400 100px "${SANS}"`, `500 100px "${SANS}"`];

const loadAll = () =>
  (pending ??= Promise.all(SPECS.map((s) => document.fonts.load(s, SAMPLE)))
    .then(() => document.fonts.ready)
    .then(() => {
      READY = true;
    })
    .catch(() => {
      READY = true;
    }));

// Widths measured before the fonts arrive would be wrong forever, so nothing typeset renders until this is true.
export const useFontsReady = () => {
  const [ready, setReady] = useState(READY);
  const [handle] = useState(() => (READY ? null : delayRender("math-board fonts")));
  useEffect(() => {
    if (ready) {
      if (handle !== null) continueRender(handle);
      return;
    }
    loadAll().then(() => setReady(true));
  }, [ready, handle]);
  return ready;
};

export type FontKind = "it" | "rm" | "bf" | "sf" | "sfm";
export const fontCss = (k: FontKind) =>
  k === "it" ? { fontFamily: MATH, fontStyle: "italic", fontWeight: 400 } : k === "rm" ? { fontFamily: MATH, fontStyle: "normal", fontWeight: 400 } : k === "bf" ? { fontFamily: MATH, fontStyle: "normal", fontWeight: 600 } : k === "sf" ? { fontFamily: SANS, fontStyle: "normal", fontWeight: 400 } : { fontFamily: SANS, fontStyle: "normal", fontWeight: 500 };

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

// Advance width in em (font size 1).
export const advance = (k: FontKind, s: string) => {
  const key = `${k}|${s}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  ctx ??= document.createElement("canvas").getContext("2d");
  const f = fontCss(k);
  ctx!.font = `${f.fontStyle} ${f.fontWeight} 100px "${f.fontFamily}"`;
  const w = ctx!.measureText(s).width / 100;
  if (READY) cache.set(key, w);
  return w;
};

// Width in px of a run of prose, for placing marks around words.
export const textWidth = (s: string, size: number, k: FontKind = "sf") => advance(k, s) * size;
