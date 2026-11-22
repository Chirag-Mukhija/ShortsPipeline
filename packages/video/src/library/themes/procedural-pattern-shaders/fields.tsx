// The board's named fields: thin wrappers over PatternCanvas with each pattern's home palette, plus PulsingBorder sized around a box.
import type { FC } from "react";
import { PatternCanvas, type PatternProps } from "./canvas";
import type { Rect } from "./engine";
import type { PatternName } from "./shaders";
import { PALETTES } from "./theme";

export type FieldProps = Omit<PatternProps, "pattern" | "colors"> & { colors?: string[] };

const field = (pattern: PatternName, home: string[]): FC<FieldProps> => {
  const F: FC<FieldProps> = ({ colors = home, ...rest }) => <PatternCanvas pattern={pattern} colors={colors} {...rest} />;
  return F;
};

// params: [arms, rings per unit, duty]
export const SpiralField = field("spiral", PALETTES.pool);
// params: [palette repeats per turn, twist, wobble]
export const SwirlField = field("swirl", PALETTES.blush);
// params: [rows, zigzags per unit, amplitude, line duty]
export const WaveField = field("waves", PALETTES.mustard);
// params: [cells per unit, seed drift, outline width]
export const VoronoiField = field("voronoi", PALETTES.amber);
// params: [frequency, contour bands (0 = two-tone), warp, threshold]
export const PerlinBlobs = field("perlin", PALETTES.lilac);
// params: [cells per unit, dot radius, orbit radius, mode 0 orbit | 1 halftone wedge | 2 noise halftone]
export const DotGridOrbit = field("dots", PALETTES.sunset);
// params: [radius scale, spread, pulse, ball count]
export const MetaballsField = field("metaballs", PALETTES.ember);
// params: [source x, source y, ray density, intensity]
export const GodRays = field("rays", PALETTES.indigo);
// params: [angle rad, stripes per unit, wobble, wobble frequency]
export const StripeField = field("stripes", PALETTES.poster);

// Glowing rounded outline around `box` (frame px). The canvas extends `glow` px past the box so the halo has room; its ground is transparent.
export const PulsingBorder: FC<{ box: Rect; radius?: number; thickness?: number; glow?: number; pulse?: number; colors?: string[]; speed?: number; time?: number }> = ({ box, radius = 36, thickness = 5, glow = 120, pulse = 0, colors = PALETTES.glow, speed, time }) => {
  const rect = { x: box.x - glow, y: box.y - glow, w: box.w + glow * 2, h: box.h + glow * 2 };
  const u = rect.h;
  return (
    <PatternCanvas
      pattern="border"
      colors={colors}
      rect={rect}
      anchor="self"
      speed={speed}
      time={time}
      params={[box.w / 2 / u, box.h / 2 / u, radius / u, thickness / u]}
      q={[pulse, 1, 0, 0]}
    />
  );
};
