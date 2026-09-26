// Motion helpers shared by templates: springs, cue lookups, target parsing, text matching and sizing.
import { interpolate, random, spring } from "remotion";
import type { CueAction, TimedCue } from "@clipforge/schema";

export const SPRING_POP = { damping: 14, stiffness: 180, mass: 0.7 };
export const SPRING_SOFT = { damping: 20, stiffness: 120, mass: 0.9 };
export const SPRING_SLAM = { damping: 11, stiffness: 260, mass: 0.8 };
export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function springAt(frame: number, fps: number, start: number, config = SPRING_POP): number {
  if (frame < start) return 0;
  return spring({ frame: frame - start, fps, config });
}

export type ParsedTarget = { kind: "node" | "edge" | "line" | "item" | "side" | "other"; id: string };

export function parseTarget(target: string | undefined): ParsedTarget {
  const raw = (target ?? "").trim().toLowerCase();
  const [prefix, ...rest] = raw.split(":");
  const id = rest.join(":");
  if (rest.length > 0 && (prefix === "node" || prefix === "edge" || prefix === "line" || prefix === "item")) {
    return { kind: prefix, id };
  }
  if (raw === "left" || raw === "right" || raw === "verdict") return { kind: "side", id: raw };
  return { kind: "other", id: raw };
}

export function cueFrames(cues: TimedCue[], action: CueAction, match?: (target: ParsedTarget) => boolean): number[] {
  return cues
    .filter((cue) => cue.action === action && (!match || match(parseTarget(cue.target))))
    .map((cue) => cue.frame)
    .sort((a, b) => a - b);
}

export function pulseAt(frame: number, frames: number[], length = 12, amount = 0.12): number {
  let scale = 1;
  for (const start of frames) {
    const t = frame - start;
    if (t >= 0 && t < length) scale += amount * Math.sin((t / length) * Math.PI);
  }
  return scale;
}

export function shakeAt(frame: number, frames: number[], length = 10, amplitude = 14): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const start of frames) {
    const t = frame - start;
    if (t >= 0 && t < length) {
      const decay = 1 - t / length;
      x += (random(`sx-${start}-${t}`) - 0.5) * 2 * amplitude * decay;
      y += (random(`sy-${start}-${t}`) - 0.5) * 2 * amplitude * decay;
    }
  }
  return { x, y };
}

export function fadeIn(frame: number, start: number, length = 6): number {
  return interpolate(frame, [start, start + length], [0, 1], CLAMP);
}

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isHighlighted(word: string, highlights: string[]): boolean {
  const token = normalizeWord(word);
  if (!token) return false;
  return highlights.some((phrase) => phrase.split(/\s+/).map(normalizeWord).includes(token));
}

export function fitFontSize(chars: number, maxWidth: number, max: number, min: number, charWidth = 0.56): number {
  return Math.round(Math.max(min, Math.min(max, maxWidth / (Math.max(1, chars) * charWidth))));
}

export function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function assetUrl(base: string, src: string): string {
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  return `${base.replace(/\/+$/, "")}/${src.replace(/^\/+/, "")}`;
}
