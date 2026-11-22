// Claymorphism tokens: warm cream studio sweep, four pastel clays with deep text shades, plum ink, Fredoka, and colour mixing for clay shading.
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";

export const ROUND = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;

export const CREAM = "#F4EFE9";
export const CREAM_DEEP = "#E8DED2";
export const PUTTY = "#FBF7F2";
export const SKY = "#E9F0FF";

export const PINK = "#FF9AA2";
export const BUTTER = "#FFD27F";
export const MINT = "#9ADBC5";
export const LILAC = "#A5B4FF";
// A neutral, unbaked clay for tracks, plinths and the "losing" side of a comparison.
export const STONE = "#D9CFC4";

// Deeper versions of each clay, for text that has to read on cream.
export const PINK_D = "#E0606F";
export const BUTTER_D = "#C98A1C";
export const MINT_D = "#2E9B78";
export const LILAC_D = "#5D6FE6";

export const INK = "#3A3341";
export const INK_SOFT = "#7A6E7C";
// The board's shadow colour; contact shadows and drop shadows both use it.
export const SHADOW = "#B7A99A";

export const CLAYS = [PINK, BUTTER, MINT, LILAC] as const;
export const DEEP: Record<string, string> = { [PINK]: PINK_D, [BUTTER]: BUTTER_D, [MINT]: MINT_D, [LILAC]: LILAC_D, [STONE]: INK_SOFT, [PUTTY]: INK_SOFT };

const hex = (c: string) => {
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
// Linear mix of two hex colours; a = 0 gives c1.
export const mix = (c1: string, c2: string, a: number) => {
  const p = hex(c1);
  const q = hex(c2);
  const v = p.map((x, i) => Math.round(x + (q[i]! - x) * a));
  return `#${v.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};
export const tint = (c: string, a: number) => mix(c, "#FFFFFF", a);
// Clay shades toward warm plum rather than black, so shadows stay soft and coloured.
export const shade = (c: string, a: number) => mix(c, "#5B3F55", a);
export const deep = (c: string) => DEEP[c] ?? shade(c, 0.45);
