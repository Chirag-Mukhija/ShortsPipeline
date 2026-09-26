// Tests for pause planning and remapping word timings onto jump-cut audio.
import { describe, expect, it } from "vitest";
import { planCuts, remapMs, remapWords } from "./tighten";

describe("planCuts", () => {
  it("keeps edge silences and shortens only long interior pauses", () => {
    const cuts = planCuts(
      [
        { start: 0, end: 0.1 },
        { start: 2, end: 2.8 },
        { start: 4, end: 4.2 },
        { start: 6.2, end: 7 },
      ],
      7,
      0.3,
    );
    expect(cuts).toEqual([{ start: 2.15, end: 2.65 }]);
  });
});

describe("remapMs", () => {
  const cuts = [
    { start: 2.15, end: 2.65 },
    { start: 5, end: 5.4 },
  ];

  it("shifts times after each cut and snaps times inside a cut to its start", () => {
    expect(remapMs(1000, cuts)).toBe(1000);
    expect(remapMs(2400, cuts)).toBe(2150);
    expect(remapMs(3000, cuts)).toBe(2500);
    expect(remapMs(6000, cuts)).toBe(5100);
  });

  it("keeps word order intact", () => {
    const words = remapWords(
      [
        { text: "one.", startMs: 1500, endMs: 2100 },
        { text: "two", startMs: 2800, endMs: 3100 },
      ],
      cuts,
    );
    expect(words[1]!.startMs).toBeGreaterThanOrEqual(words[0]!.endMs);
    expect(words[1]!.startMs).toBe(2300);
  });
});
