// Tests for pronunciation spans and mapping TTS boundaries back onto displayed words.
import { describe, expect, it } from "vitest";
import { alignWords } from "./align";
import { toSpeech } from "./lexicon";

describe("toSpeech", () => {
  it("expands tech terms and units while tracking each word's span", () => {
    const words = ["Your", "macOS", "has", "16GB,", "right?"];
    const { speech, spans } = toSpeech(words);
    expect(speech).toBe("Your mac O S has 16 gigabytes, right?");
    expect(speech.slice(spans[1]!.start, spans[1]!.end)).toBe("mac O S");
    expect(speech.slice(spans[3]!.start, spans[3]!.end)).toBe("16 gigabytes,");
  });
});

describe("alignWords", () => {
  it("merges multi-token pronunciations into one displayed word", () => {
    const words = ["Why", "macOS", "wins"];
    const { speech, spans } = toSpeech(words);
    const boundaries = [
      { text: "Why", startMs: 100, endMs: 300 },
      { text: "mac", startMs: 320, endMs: 500 },
      { text: "O", startMs: 500, endMs: 600 },
      { text: "S", startMs: 600, endMs: 700 },
      { text: "wins", startMs: 720, endMs: 1000 },
    ];
    const timed = alignWords(words, spans, speech, boundaries, 1200);
    expect(timed.map((w) => [w.text, w.startMs, w.endMs])).toEqual([
      ["Why", 100, 300],
      ["macOS", 320, 700],
      ["wins", 720, 1000],
    ]);
  });

  it("interpolates words the voice never reported", () => {
    const words = ["one", "two", "three", "four"];
    const { speech, spans } = toSpeech(words);
    const boundaries = [
      { text: "one", startMs: 0, endMs: 200 },
      { text: "four", startMs: 800, endMs: 1000 },
    ];
    const timed = alignWords(words, spans, speech, boundaries, 1100);
    expect(timed).toHaveLength(4);
    expect(timed[1]!.startMs).toBe(200);
    expect(timed[2]!.endMs).toBe(800);
    expect(timed.every((w, i) => i === 0 || w.startMs >= timed[i - 1]!.startMs)).toBe(true);
  });
});
