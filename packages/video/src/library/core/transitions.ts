// Theme-free scene transitions as style objects: blur-fade exits and entrances that any theme can wrap a scene in.
import type { CSSProperties } from "react";

// e runs 0 → 1 over the transition; dx/dy are the drift in px at the end.
export const blurOut = (e: number, { blur = 10, dx = 0, dy = -40 }: { blur?: number; dx?: number; dy?: number } = {}): CSSProperties => ({
  opacity: 1 - e,
  filter: `blur(${e * blur}px)`,
  transform: `translate(${dx * e}px, ${dy * e}px)`,
});

export const blurIn = (e: number, opts: { blur?: number; dx?: number; dy?: number } = {}): CSSProperties => blurOut(1 - e, opts);
