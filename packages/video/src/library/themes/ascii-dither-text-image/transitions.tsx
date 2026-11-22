// In-theme transitions and camera: Bayer develop/wipe between two pictures, the scan-bar swap, density morph through a chain of shapes, and the push into the glyphs until they are the texture.
import type { FC } from "react";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { W, H } from "../../core/video";
import { mix, type Field } from "./field";
import { develop, scan } from "./fx";
import { GlyphCanvas, type Fx, type GlyphProps } from "./grid";
import { ScanLine } from "./primitives";

type Look = Omit<GlyphProps, "field" | "fx">;

// A → B by ordered dither: each cell flips once its Bayer threshold falls under the sweep (40 f), so the new picture "develops" in a stable pattern.
// bias > 0 leans the sweep left-to-right into a dithered wipe.
export const DitherSwap: FC<Look & { a: Field; b: Field; at: number; dur?: number; bias?: number; fx?: Fx[] }> = ({ a, b, at, dur = 40 / 30, bias = 0, fx = [], w = W, ...look }) => {
  const { t } = useTime();
  const p = clamp01((t - at) / dur);
  return <GlyphCanvas field={p >= 1 ? b : a} w={w} fx={p >= 1 ? fx : [develop(b, p, { bias, w }), ...fx]} {...look} />;
};

// A is erased by a 2 px red bar sweeping across (20 f) while B exists only behind it; the two columns at the bar churn.
export const ScanSwap: FC<Look & { a: Field; b: Field; at: number; dur?: number; dir?: 1 | -1 }> = ({ a, b, at, dur = 20 / 30, dir = 1, x = 0, y = 0, w = W, h = H, ...look }) => {
  const { t } = useTime();
  return (
    <>
      <GlyphCanvas field={a} x={x} y={y} w={w} h={h} fx={scan(t, at, w, { dur, dir })} {...look} />
      <GlyphCanvas field={b} x={x} y={y} w={w} h={h} fx={scan(t, at, w, { dur, dir, reveal: true })} {...look} seed={(look.seed ?? 0) + 41} />
      <ScanLine at={at} x={x} y={y} w={w} h={h} dur={dur} dir={dir} />
    </>
  );
};

// Density morph through a chain of pictures: at each key time the cells lerp brightness to the next shape over 12 f (linear) and re-pick their glyph.
export const GlyphMorph: FC<Look & { keys: { field: Field; t: number }[]; dur?: number; fx?: Fx[] }> = ({ keys, dur = 12 / 30, fx = [], ...look }) => {
  const { t } = useTime();
  let k = 0;
  keys.forEach((key, i) => {
    if (t >= key.t) k = i;
  });
  const e = k > 0 ? clamp01((t - keys[k]!.t) / dur) : 1;
  const field = k > 0 ? mix(keys[k - 1]!.field, keys[k]!.field, e) : keys[0]!.field;
  return <GlyphCanvas field={field} fx={fx} {...look} />;
};

// Camera: push in about `focus` until single glyphs fill the frame. The lattice scales with the zoom and each cell keeps its sample point, so a glyph grows instead of changing.
export const GlyphZoom: FC<Look & { field: Field; at: number; dur?: number; to?: number; focus?: [number, number]; fx?: Fx[] }> = ({ field, at, dur = 2, to = 8, focus = [W / 2, H / 2], fx, cell = 12, ...look }) => {
  const { t } = useTime();
  // Exponential in scale so the push feels constant-speed to the eye.
  const s = Math.pow(to, ramp(t, at, dur, INOUT));
  const [fx0, fy0] = focus;
  const zoomed: Field = (x, y) => field(fx0 + (x - fx0) / s, fy0 + (y - fy0) / s);
  return <GlyphCanvas field={zoomed} cell={cell * s} anchor={focus} fx={fx} {...look} />;
};
