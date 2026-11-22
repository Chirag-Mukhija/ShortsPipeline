// Video 001's shared style: the one place for its colours, fonts and pacing, so beats built on different days still look like one video. Every beat imports from here; a whole-video note changes this file once and every beat re-renders with it.
import { ACCENT, DOT, HAND, INK, PAPER, PENCIL, SANS } from "@library/themes/hand-drawn";

export const STYLE = {
  theme: "hand-drawn",
  // Colours: paper page, graphite ink, pencil grey for asides, one coral accent for the one thing that matters most in a shot.
  paper: PAPER,
  dot: DOT,
  ink: INK,
  pencil: PENCIL,
  accent: ACCENT,
  // Fonts: handwriting for words, Inter for numbers.
  hand: HAND,
  sans: SANS,
  // Pacing, as Beats 1–2 set it (the creator scored them top): a new idea on screen every 3–6 s, visuals landing 3–6 frames before their word.
  pacing: { shotMin: 3, shotMax: 6, leadFrames: 4, holdAfterLast: 0.6 },
  // Sizes at 1080p.
  text: { body: 44, label: 38, title: 72 },
} as const;
