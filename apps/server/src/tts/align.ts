// Maps TTS word boundaries back onto the displayed narration words, interpolating any word the voice did not report.
import type { TimedWord } from "@clipforge/schema";
import type { SpeechBoundary } from "./types";

function locate(speech: string, boundaries: SpeechBoundary[]): (SpeechBoundary & { offset: number })[] {
  const lower = speech.toLowerCase();
  let cursor = 0;
  return boundaries.map((boundary) => {
    const needle = boundary.text.toLowerCase().trim();
    const index = needle ? lower.indexOf(needle, cursor) : -1;
    if (index >= 0) {
      cursor = index + needle.length;
      return { ...boundary, offset: index };
    }
    return { ...boundary, offset: -1 };
  });
}

export function alignWords(
  displayWords: string[],
  spans: { start: number; end: number }[],
  speech: string,
  boundaries: SpeechBoundary[],
  totalMs: number,
): TimedWord[] {
  const located = locate(speech, boundaries);
  const timed: (TimedWord | null)[] = displayWords.map((text, i) => {
    const span = spans[i];
    if (!span) return null;
    const hits = located.filter((b) => b.offset >= span.start && b.offset < span.end);
    if (hits.length === 0) return null;
    return {
      text,
      startMs: Math.min(...hits.map((b) => b.startMs)),
      endMs: Math.max(...hits.map((b) => b.endMs)),
    };
  });
  const result: TimedWord[] = [];
  for (let i = 0; i < displayWords.length; i++) {
    const known = timed[i];
    if (known) {
      result.push(known);
      continue;
    }
    let j = i;
    while (j < displayWords.length && !timed[j]) j++;
    const start = result[result.length - 1]?.endMs ?? 0;
    const end = timed[j]?.startMs ?? Math.max(start + 1, totalMs - 150);
    const gap = j - i;
    const step = Math.max(1, (end - start) / gap);
    for (let k = 0; k < gap; k++) {
      result.push({
        text: displayWords[i + k] ?? "",
        startMs: Math.round(start + k * step),
        endMs: Math.round(start + (k + 1) * step),
      });
    }
    i = j - 1;
  }
  return result;
}
