// Tests for the pure parts of whisper alignment: filtering whisper.cpp's special tokens and building the
// identity (no pronunciation-expansion) span map used to match a real recording against its narration.
import type { TranscriptionJson } from "@remotion/install-whisper-cpp";
import { describe, expect, it } from "vitest";
import { identitySpans, tokensToBoundaries } from "./whisperAlign";

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
