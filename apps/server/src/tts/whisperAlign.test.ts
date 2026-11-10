// Tests for the pure parts of whisper alignment: filtering whisper.cpp's special tokens and building the
// identity (no pronunciation-expansion) span map used to match a real recording against its narration, and caption grouping.
import type { TranscriptionJson } from "@remotion/install-whisper-cpp";
import { describe, expect, it } from "vitest";
import { identitySpans, toSegments, toSrt, tokensToBoundaries } from "./whisperAlign";

function token(text: string, fromMs: number, toMs: number) {
  return { text, offsets: { from: fromMs, to: toMs }, timestamps: { from: "", to: "" }, t_dtw: -1, id: 0, p: 1 };
}

function segment(tokens: ReturnType<typeof token>[]): TranscriptionJson<true>["transcription"][number] {
  return { text: tokens.map((t) => t.text).join(""), offsets: { from: 0, to: 0 }, timestamps: { from: "", to: "" }, tokens };
}

describe("tokensToBoundaries", () => {
  it("maps whisper's ms offsets straight through with no unit conversion", () => {
    const boundaries = tokensToBoundaries([segment([token(" Hello", 100, 400), token(" world", 400, 900)])]);
    expect(boundaries).toEqual([
      { text: "Hello", startMs: 100, endMs: 400 },
      { text: "world", startMs: 400, endMs: 900 },
    ]);
  });

  it("drops empty and bracketed special tokens", () => {
    const boundaries = tokensToBoundaries([
      segment([token("[_BEG_]", 0, 0), token(" Hi", 100, 300), token("", 300, 300), token("<|en|>", 300, 300)]),
    ]);
    expect(boundaries).toEqual([{ text: "Hi", startMs: 100, endMs: 300 }]);
  });

  it("flattens multiple segments in order", () => {
    const boundaries = tokensToBoundaries([segment([token(" One", 0, 100)]), segment([token(" Two", 100, 200)])]);
    expect(boundaries.map((b) => b.text)).toEqual(["One", "Two"]);
  });
});

describe("identitySpans", () => {
  it("joins words with single spaces and keeps pronunciation untouched, unlike toSpeech()", () => {
    const { speech, spans } = identitySpans(["Your", "macOS", "runs", "16GB."]);
    expect(speech).toBe("Your macOS runs 16GB.");
    expect(speech.slice(spans[1]!.start, spans[1]!.end)).toBe("macOS");
    expect(speech.slice(spans[3]!.start, spans[3]!.end)).toBe("16GB.");
  });
});

describe("toSegments", () => {
  it("joins tokens into caption lines, breaking at sentence ends and long pauses, never splitting a word", () => {
    const captions = toSegments([
      segment([token(" Hi", 0, 200), token(",", 200, 210), token(" I", 300, 400), token("'m", 400, 450), token(" here", 450, 800), token(".", 800, 810)]),
      segment([token(" Next", 900, 1200), token(" line", 1200, 1500)]),
      segment([token(" after", 2500, 2800), token(" pause", 2800, 3100)]),
    ]);
    expect(captions).toEqual([
      { startMs: 0, endMs: 810, text: "Hi, I'm here." },
      { startMs: 900, endMs: 1500, text: "Next line" },
      { startMs: 2500, endMs: 3100, text: "after pause" },
    ]);
  });

  it("breaks before the word that would overflow a readable line", () => {
    const words = "This studio turns an idea into a finished YouTube video".split(" ");
    const captions = toSegments([segment(words.map((w, i) => token(` ${w}`, i * 100, i * 100 + 90)))]);
    expect(captions.map((c) => c.text)).toEqual(["This studio turns an idea into a finished", "YouTube video"]);
    expect(captions.every((c) => c.text.length <= 42)).toBe(true);
  });
});

describe("toSrt", () => {
  it("writes numbered cues with hh:mm:ss,mmm times", () => {
    expect(toSrt([{ startMs: 70, endMs: 3_725_004, text: "Hi" }])).toBe("1\n00:00:00,070 --> 01:02:05,004\nHi\n");
  });
});
