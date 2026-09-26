// Pure timing utilities shared by server and video: word tokens, cue anchoring, caption paging and estimates.
import type { Cue } from "./storyboard";
import type { CaptionPage, TimedCue, TimedWord } from "./timeline";

export function normalizeToken(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");
}

export function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

function findAnchorIndex(words: TimedWord[], anchor: string, fromIndex: number): number {
  const target = splitWords(anchor).map(normalizeToken).filter(Boolean);
  const first = target[0];
  if (!first) return -1;
  const norm = words.map((word) => normalizeToken(word.text));
  for (let i = fromIndex; i + target.length <= norm.length; i++) {
    if (target.every((token, j) => norm[i + j] === token)) return i;
  }
  for (let i = fromIndex; i < norm.length; i++) {
    const token = norm[i] ?? "";
    if (token.length >= 3 && first.length >= 3 && (token.startsWith(first) || first.startsWith(token))) return i;
  }
  return -1;
}

export function resolveCues(
  cues: Cue[],
  words: TimedWord[],
  fps: number,
  durationInFrames: number,
  leadFrames = 3,
): { cues: TimedCue[]; unresolved: string[] } {
  const resolved: TimedCue[] = [];
  const pending: Cue[] = [];
  let cursor = 0;
  for (const cue of cues) {
    let index = findAnchorIndex(words, cue.word, cursor);
    if (index < 0) index = findAnchorIndex(words, cue.word, 0);
    const word = words[index];
    if (!word) {
      pending.push(cue);
      continue;
    }
    cursor = index + 1;
    const frame = Math.max(0, msToFrame(word.startMs, fps) - leadFrames);
    resolved.push({ frame: Math.min(frame, Math.max(0, durationInFrames - 1)), action: cue.action, target: cue.target });
  }
  pending.forEach((cue, i) => {
    const position = 0.2 + (0.6 * (i + 1)) / (pending.length + 1);
    resolved.push({ frame: Math.round(durationInFrames * position), action: cue.action, target: cue.target });
  });
  resolved.sort((a, b) => a.frame - b.frame);
  return { cues: resolved, unresolved: pending.map((cue) => cue.word) };
}

export function buildCaptionPages(
  words: TimedWord[],
  options: { maxWords?: number; maxChars?: number; gapMs?: number } = {},
): CaptionPage[] {
  const maxWords = options.maxWords ?? 3;
  const maxChars = options.maxChars ?? 18;
  const gapMs = options.gapMs ?? 280;
  const pages: CaptionPage[] = [];
  let current: TimedWord[] = [];
  const flush = () => {
    const first = current[0];
    const last = current[current.length - 1];
    if (first && last) pages.push({ startMs: first.startMs, endMs: last.endMs, words: current });
    current = [];
  };
  for (const word of words) {
    const previous = current[current.length - 1];
    const chars = current.reduce((sum, w) => sum + w.text.length + 1, 0) + word.text.length;
    const gap = previous ? word.startMs - previous.endMs : 0;
    if (current.length > 0 && (current.length >= maxWords || chars > maxChars || gap > gapMs)) flush();
    current.push(word);
    if (/[.!?]["')\]]*$/.test(word.text)) flush();
    else if (/[,;:—]$/.test(word.text) && current.length >= 2) flush();
  }
  flush();
  pages.forEach((page, i) => {
    const next = pages[i + 1];
    page.endMs = next ? Math.max(page.endMs, Math.min(next.startMs, page.endMs + 450)) : page.endMs + 350;
  });
  return pages;
}

export function estimateWordTimings(text: string, totalMs: number, leadMs = 60, tailMs = 140): TimedWord[] {
  const words = splitWords(text);
  const weights: number[] = words.map((word) => Math.max(2, normalizeToken(word).length) + 1.5);
  const pauses: number[] = words.map((word) => (/[.!?]$/.test(word) ? 5 : /[,;:—]$/.test(word) ? 2.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0) + pauses.reduce((a, b) => a + b, 0);
  const span = Math.max(1, totalMs - leadMs - tailMs);
  const timed: TimedWord[] = [];
  let cursor = leadMs;
  words.forEach((text, i) => {
    const duration = ((weights[i] ?? 0) / total) * span;
    timed.push({ text, startMs: Math.round(cursor), endMs: Math.round(cursor + duration) });
    cursor += duration + ((pauses[i] ?? 0) / total) * span;
  });
  return timed;
}
