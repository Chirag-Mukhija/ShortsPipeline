// Spotlight noir type: SVG text in the theme's three voices (Playfair titles, Bebas caps, Plex Mono evidence) and a width estimate so a beam can find a word.
import type { FC } from "react";
import { CAPS, LIT, MONO, SERIF } from "./theme";

export type Voice = "serif" | "italic" | "caps" | "mono";
const FAMILY: Record<Voice, string> = { serif: SERIF, italic: SERIF, caps: CAPS, mono: MONO };

// Advance widths in em, rough per family; good to a few percent, which is plenty for aiming a 200 px beam.
const CAPS_W: Record<string, number> = { I: 0.2, J: 0.29, M: 0.53, W: 0.57, " ": 0.18, ".": 0.17, ",": 0.17, "'": 0.15, "’": 0.15, "!": 0.2, "?": 0.36, "%": 0.6, "1": 0.27, "-": 0.27 };
const SERIF_W: Record<string, number> = { I: 0.4, J: 0.45, M: 0.95, W: 1.0, " ": 0.25, ".": 0.28, ",": 0.28, "'": 0.22, "’": 0.22, "?": 0.5, i: 0.3, l: 0.3, j: 0.3, f: 0.36, t: 0.37, r: 0.42, m: 0.84, w: 0.76 };

export const measure = (text: string, size: number, voice: Voice = "caps", track = 0) => {
  let em = 0;
  for (const ch of text) {
    if (voice === "mono") em += 0.6;
    else if (voice === "caps") em += CAPS_W[ch] ?? 0.4;
    else em += SERIF_W[ch] ?? (ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? 0.74 : /[0-9]/.test(ch) ? 0.62 : 0.53) * (voice === "italic" ? 0.94 : 1);
  }
  return (em + track * text.length) * size;
};

export type TxtProps = {
  x: number;
  y: number;
  text: string;
  size: number;
  voice?: Voice;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  // Tracking in em.
  track?: number;
  opacity?: number;
  weight?: number;
};

// One line of text; y is the vertical centre of capitals, so layouts can place lines by eye.
export const Txt: FC<TxtProps> = ({ x, y, text, size, voice = "caps", fill = LIT, anchor = "middle", track = 0, opacity = 1, weight }) => {
  if (opacity <= 0) return null;
  const capH = voice === "caps" ? 0.7 : voice === "mono" ? 0.7 : 0.71;
  return (
    <text
      x={x + (anchor === "middle" ? (track * size) / 2 : 0)}
      y={y + (capH * size) / 2}
      textAnchor={anchor}
      fontFamily={FAMILY[voice]}
      fontStyle={voice === "italic" ? "italic" : "normal"}
      fontWeight={weight ?? (voice === "serif" ? 800 : voice === "italic" ? 700 : voice === "mono" ? 600 : 400)}
      fontSize={size}
      letterSpacing={track * size}
      fill={fill}
      opacity={opacity}
    >
      {text}
    </text>
  );
};
