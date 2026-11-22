// Scatter and assemble type tokens: sage and ink grounds, one clay mark, Anton for the resolved word, Instrument Sans for the letters, Fragment Mono for counters, and a hook that waits for the fonts so letter layout is measured once they exist.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadSans } from "@remotion/google-fonts/InstrumentSans";
import { loadFont as loadMono } from "@remotion/google-fonts/FragmentMono";

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const sans = loadSans("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400"], subsets: ["latin"] });
export const DISPLAY = anton.fontFamily;
export const SANS = sans.fontFamily;
export const MONO = mono.fontFamily;

// Board palette, plus MOSS (a darker sage-grey that keeps 4.5:1 for labels on sage) and one clay mark used at most once per scene.
export const SAGE = "#C3CCBC";
export const SAGE_HI = "#CCD4C5";
export const INK = "#1A1F1A";
export const GREY = "#8A9482";
export const MOSS = "#4A5444";
export const NIGHT = "#101310";
export const BONE = "#EDEFE8";
export const CLAY = "#B0542C";

export type Tone = "sage" | "night";
export type Tokens = { bg: string; hi: string; ink: string; sub: string; dim: string; mark: string };
export const TONE: Record<Tone, Tokens> = {
  sage: { bg: SAGE, hi: SAGE_HI, ink: INK, sub: MOSS, dim: GREY, mark: CLAY },
  night: { bg: NIGHT, hi: "#181D18", ink: BONE, sub: "#8E9989", dim: "#4F584B", mark: "#C9693D" },
};

// The library's 96 px floor; the board's layouts sit further in, so most pieces use M2.
export const M = 96;
export const M2 = 160;

// Board: letters far from their rest place drop opacity; dimmed letters sit at 35 %.
export const DIM_OPACITY = 0.35;

// Canvas measureText only knows a webfont once it has loaded, so layout waits for all three faces.
let fontsReady = false;
const READY = Promise.all([anton.waitUntilDone(), sans.waitUntilDone(), mono.waitUntilDone()]).then(() => {
  fontsReady = true;
});
export const areFontsReady = () => fontsReady;
export const useFontsReady = () => {
  const [ok, setOk] = useState(fontsReady);
  const [handle] = useState(() => (fontsReady ? null : delayRender("scatter-assemble-type fonts")));
  useEffect(() => {
    if (handle === null) return;
    READY.then(() => {
      setOk(true);
      continueRender(handle);
    });
  }, [handle]);
  return ok;
};
